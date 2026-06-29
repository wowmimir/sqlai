import React, { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';

const QueryTest: React.FC = () => {
  const { getToken } = useAuth();
  const [projectId, setProjectId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [sqlResult, setSqlResult] = useState<string>('');
  const [schemasResult, setSchemasResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const executeQuery = async () => {
    setError('');
    setSqlResult('');
    setSchemasResult(null);

    if (!projectId || !prompt) {
      setError('Project ID and prompt are both required.');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const response = await axios.post(
        'http://localhost:8000/api/v1/query/execute',
        { project_id: projectId, prompt },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSqlResult(response.data.sql);
      setSchemasResult(response.data.schemas);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-4 border-t mt-8">
      <h2 className="text-xl font-bold">Test Query Pipeline</h2>

      <div className="space-y-2">
        <input
          type="text"
          placeholder="Project UUID"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="border p-2 w-full font-mono text-sm"
        />
        <textarea
          placeholder="Ask a question about your data..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="border p-2 w-full"
          rows={3}
        />
        <button
          onClick={executeQuery}
          disabled={loading}
          className="bg-purple-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Querying...' : 'Execute Query'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-800 rounded">{error}</div>
      )}

      {sqlResult && (
        <div className="space-y-2">
          <h3 className="font-semibold">Generated SQL:</h3>
          <pre className="p-3 bg-slate-900 text-green-400 rounded text-xs overflow-auto">
            {sqlResult}
          </pre>
        </div>
      )}

      {schemasResult && (
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-600">
            Schemas passed to LLM ({schemasResult.length} tables)
          </summary>
          <pre className="p-3 bg-gray-100 rounded mt-2 overflow-auto">
            {JSON.stringify(schemasResult, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default QueryTest;
