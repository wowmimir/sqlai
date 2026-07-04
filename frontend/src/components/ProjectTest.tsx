import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';

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
  const [message, setMessage] = useState('');
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Load all projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Load datasets when project changes
  useEffect(() => {
    if (selectedProjectId) {
      loadDatasets(selectedProjectId);
    } else {
      setDatasets([]);
    }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    try {
      const token = await getToken();
      const response = await axios.get(
        'http://localhost:8000/api/v1/projects',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProjects(response.data || []);
      
      // Auto-select first project if available
      if (response.data && response.data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(response.data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load projects:', err);
      setMessage('❌ Failed to load projects');
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
      setMessage('❌ Failed to load datasets');
    }
  };

  // 1. Create new project
  const createProject = async () => {
    if (!projectName.trim()) {
      setMessage('❌ Please enter a project name');
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
      setMessage(`✅ Project created: ${newProject.display_name}`);
      await loadDatasets(newProject.id);
    } catch (err: any) {
      setMessage(`❌ Error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 2. Upload dataset to selected project
  const uploadDataset = async () => {
    if (!selectedProjectId || !uploadFile) {
      setMessage('❌ Please select a file and ensure a project is selected');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', uploadFile);
      
      // Optional: Add custom display name for the dataset
      if (datasetName.trim()) {
        formData.append('display_name', datasetName.trim());
      }

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
      setMessage(`✅ Dataset uploaded: ${response.data.display_name} (${response.data.row_count.toLocaleString()} rows)`);
      
      // Refresh dataset list
      await loadDatasets(selectedProjectId);
      
      // Clear file input
      setUploadFile(null);
      setDatasetName('');
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (err: any) {
      setMessage(`❌ Upload error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setDatasets([]);
    setMessage('');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-4">
      <h2 className="text-xl font-bold">📁 Project & Dataset Manager</h2>

      {/* Project Selection / Creation */}
      <div className="border rounded p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-sm">1. Select or Create Project</h3>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="text-sm text-blue-500 hover:text-blue-700"
          >
            {showCreateForm ? 'Cancel' : '+ New Project'}
          </button>
        </div>

        {/* Project List */}
        {projects.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {projects.map((proj) => (
              <button
                key={proj.id}
                onClick={() => handleProjectChange(proj.id)}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  selectedProjectId === proj.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {proj.display_name}
                {datasets.some(d => d.id === proj.id) && ` (${datasets.length})`}
              </button>
            ))}
          </div>
        )}

        {/* Create Project Form */}
        {showCreateForm && (
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              placeholder="Project name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="border p-2 flex-1 rounded"
              disabled={loading}
            />
            <button 
              onClick={createProject} 
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        )}
      </div>

      {/* Upload Section - Only show if project selected */}
      {selectedProjectId && (
        <div className="border rounded p-4 space-y-3">
          <h3 className="font-semibold text-sm">
            2. Upload Dataset to &quot;{projects.find(p => p.id === selectedProjectId)?.display_name || selectedProjectId}&quot;
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Dataset Name (optional)</label>
              <input
                type="text"
                placeholder="e.g., sales_2024"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                className="border p-2 w-full rounded text-sm"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">CSV File</label>
              <input
                id="file-upload"
                type="file"
                accept=".csv"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="block w-full text-sm"
                disabled={loading}
              />
            </div>
          </div>

          {uploadFile && (
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              📄 Selected: <strong>{uploadFile.name}</strong> ({(uploadFile.size / 1024).toFixed(1)} KB)
            </div>
          )}

          <button 
            onClick={uploadDataset} 
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 w-full md:w-auto"
            disabled={loading || !uploadFile}
          >
            {loading ? 'Uploading...' : '📤 Upload Dataset'}
          </button>
        </div>
      )}

      {/* Datasets List */}
      {selectedProjectId && (
        <div className={`border rounded p-4 ${datasets.length > 0 ? 'bg-white' : 'bg-gray-50'}`}>
          <h3 className="font-semibold text-sm mb-3 flex justify-between items-center">
            <span>📊 Datasets in Project</span>
            <span className="text-xs text-gray-500">{datasets.length} total</span>
          </h3>
          
          {datasets.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {datasets.map((ds) => (
                <div key={ds.id} className="border rounded p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-sm">{ds.display_name}</div>
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
                  
                  {/* Schema preview (collapsed) */}
                  {ds.schema_metadata && Object.keys(ds.schema_metadata).length > 0 && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                        Schema ({Object.keys(ds.schema_metadata).length} columns)
                      </summary>
                      <div className="mt-1 p-2 bg-gray-50 rounded overflow-x-auto">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(ds.schema_metadata).map(([col, type]) => (
                            <span key={col} className="inline-flex items-center gap-1 px-2 py-1 bg-white border rounded">
                              <span className="font-mono">{col}</span>
                              <span className="text-xs text-gray-400">: {type}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">No datasets uploaded yet</p>
              <p className="text-xs mt-1">Upload a CSV file above to get started</p>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      {message && (
        <div className={`p-3 rounded border ${
          message.includes('✅') 
            ? 'bg-green-50 text-green-800 border-green-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default ProjectTest;