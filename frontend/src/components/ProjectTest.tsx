import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Types (unchanged)
interface Dataset {
  id: string;
  display_name: string;
  row_count: number;
  created_at: string;
  schema_metadata: Record<string, string>;
}

interface Project {
  id: string;
  display_name: string;
  description?: string;
  created_at: string;
}

const ProjectTest: React.FC = () => {
  const { getToken } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Effects (unchanged)
  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadDatasets(selectedProjectId);
    } else {
      setDatasets([]);
    }
  }, [selectedProjectId]);

  // API functions (unchanged)
  const loadProjects = async () => {
    try {
      const token = await getToken();
      const response = await axios.get('http://localhost:8000/api/v1/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects(response.data || []);
      if (response.data && response.data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(response.data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load projects:', err);
      setMessage({ type: 'error', text: 'Failed to load projects' });
    }
  };

  const loadDatasets = async (projectId: string) => {
    try {
      const token = await getToken();
      const response = await axios.get(
        `http://localhost:8000/api/v1/projects/${projectId}/datasets`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDatasets(response.data || []);
    } catch (err: any) {
      console.error('Failed to load datasets:', err);
      setMessage({ type: 'error', text: 'Failed to load datasets' });
    }
  };

  const createProject = async () => {
    if (!projectName.trim()) {
      setMessage({ type: 'error', text: 'Please enter a project name' });
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      const response = await axios.post(
        'http://localhost:8000/api/v1/projects',
        { display_name: projectName, description: 'Test project' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const newProject = response.data;
      setProjects([...projects, newProject]);
      setSelectedProjectId(newProject.id);
      setProjectName('');
      setShowCreateForm(false);
      setMessage({ type: 'success', text: `Project created: ${newProject.display_name}` });
      await loadDatasets(newProject.id);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || err.message });
    } finally {
      setLoading(false);
    }
  };

  const uploadDataset = async () => {
    if (!selectedProjectId || !uploadFile) {
      setMessage({ type: 'error', text: 'Please select a file and ensure a project is selected' });
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', uploadFile);
      if (datasetName.trim()) formData.append('display_name', datasetName.trim());

      const response = await axios.post(
        `http://localhost:8000/api/v1/projects/${selectedProjectId}/datasets/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setMessage({
        type: 'success',
        text: `Dataset uploaded: ${response.data.display_name} (${response.data.row_count.toLocaleString()} rows)`,
      });
      await loadDatasets(selectedProjectId);
      setUploadFile(null);
      setDatasetName('');
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setDatasets([]);
    setMessage(null);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">📁 Project & Dataset Manager</h2>

      {/* Project selection / creation */}
      <Card>
        <CardHeader>
          <CardTitle>1. Select or Create Project</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {projects.map((proj) => (
              <Button
                key={proj.id}
                variant={selectedProjectId === proj.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleProjectChange(proj.id)}
              >
                {proj.display_name}
                {datasets.some((d) => d.id === proj.id) && ` (${datasets.length})`}
              </Button>
            ))}
            <Button variant="secondary" size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
              + New Project
            </Button>
          </div>

          {showCreateForm && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                disabled={loading}
                className="flex-1"
              />
              <Button onClick={createProject} disabled={loading}>
                {loading ? 'Creating...' : 'Create'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload section */}
      {selectedProjectId && (
        <Card>
          <CardHeader>
            <CardTitle>
              2. Upload Dataset to &quot;{projects.find((p) => p.id === selectedProjectId)?.display_name ||
                selectedProjectId}
              &quot;
            </CardTitle>
            <CardDescription>CSV files only</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="dataset-name">Dataset Name (optional)</Label>
                <Input
                  id="dataset-name"
                  placeholder="e.g., sales_2024"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="file-upload">CSV File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  disabled={loading}
                />
              </div>
            </div>

            {uploadFile && (
              <div className="text-sm bg-gray-50 p-2 rounded border">
                📄 Selected: <strong>{uploadFile.name}</strong> ({(uploadFile.size / 1024).toFixed(1)} KB)
              </div>
            )}

            <Button onClick={uploadDataset} disabled={loading || !uploadFile} variant="default">
              {loading ? 'Uploading...' : '📤 Upload Dataset'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Datasets list */}
      {selectedProjectId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>📊 Datasets in Project</span>
              <Badge variant="secondary">{datasets.length} total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {datasets.length > 0 ? (
              <ScrollArea className="h-80">
                <div className="space-y-3 pr-4">
                  {datasets.map((ds) => (
                    <div key={ds.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{ds.display_name}</div>
                          <div className="text-xs text-gray-500">
                            ID: <span className="font-mono">{ds.id}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-blue-600">
                            {ds.row_count.toLocaleString()} rows
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(ds.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {ds.schema_metadata && Object.keys(ds.schema_metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                            Schema ({Object.keys(ds.schema_metadata).length} columns)
                          </summary>
                          <div className="mt-1 p-2 bg-gray-50 rounded overflow-x-auto">
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(ds.schema_metadata).map(([col, type]) => (
                                <Badge key={col} variant="outline" className="text-xs font-mono">
                                  {col} <span className="text-gray-400">: {type}</span>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p className="text-sm">No datasets uploaded yet</p>
                <p className="text-xs mt-1">Upload a CSV file above to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      {message && (
        <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ProjectTest;