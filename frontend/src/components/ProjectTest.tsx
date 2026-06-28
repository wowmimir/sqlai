import React, { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';

const ProjectTest: React.FC = () => {
  const { getToken } = useAuth();
  const [projectName, setProjectName] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');

  // 1. Create project
  const createProject = async () => {
    try {
      const token = await getToken();
      const response = await axios.post(
        'http://localhost:8000/api/v1/projects',
        { display_name: projectName, description: 'Test project' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProjectId(response.data.id);
      setMessage(`✅ Project created: ${response.data.display_name} (ID: ${response.data.id})`);
    } catch (err: any) {
      setMessage(`❌ Error: ${err.response?.data?.detail || err.message}`);
    }
  };

  // 2. Upload file to the created project
  const uploadDataset = async () => {
    if (!projectId || !uploadFile) return;
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', uploadFile);
      const response = await axios.post(
        `http://localhost:8000/api/v1/projects/${projectId}/datasets/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setMessage(`✅ Dataset uploaded: ${response.data.display_name} (rows: ${response.data.row_count})`);
    } catch (err: any) {
      setMessage(`❌ Upload error: ${err.response?.data?.detail || err.message}`);
    }
  };

  return (
    <div className="p-8 max-w-xl mx-auto space-y-4">
      <h2 className="text-xl font-bold">Test Project & Upload Flow</h2>

      <div className="space-y-2">
        <input
          type="text"
          placeholder="Project name"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="border p-2 w-full"
        />
        <button onClick={createProject} className="bg-blue-500 text-white px-4 py-2 rounded">
          Create Project
        </button>
      </div>

      {projectId && (
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm text-gray-600">Current Project ID: {projectId}</p>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            className="block"
          />
          <button onClick={uploadDataset} className="bg-green-500 text-white px-4 py-2 rounded">
            Upload CSV
          </button>
        </div>
      )}

      {message && <div className="p-3 bg-gray-100 rounded">{message}</div>}
    </div>
  );
};

export default ProjectTest;