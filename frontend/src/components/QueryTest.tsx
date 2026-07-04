import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';

interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
}

interface Dataset {
  id: string;
  display_name: string;
  row_count: number;
}

interface Project {
  id: string;
  display_name: string;
}

const QueryTest: React.FC = () => {
  const { getToken } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [queryHistory, setQueryHistory] = useState<Array<{prompt: string, timestamp: Date}>>([]);

  // Load projects on mount
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
      
      if (response.data && response.data.length > 0) {
        setSelectedProjectId(response.data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load projects:', err);
      setError('Failed to load projects');
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
    }
  };

  const executeQuery = async () => {
    setError('');
    setResult(null);

    if (!selectedProjectId || !prompt) {
      setError('Project and prompt are both required.');
      return;
    }

    if (datasets.length === 0) {
      setError('This project has no datasets. Upload some data first.');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const response = await axios.post(
        'http://localhost:8000/api/v1/query/execute',
        { project_id: selectedProjectId, prompt },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setResult({
        columns: response.data.columns || [],
        rows: response.data.rows || []
      });
      
      // Add to history
      setQueryHistory([{ prompt, timestamp: new Date() }, ...queryHistory].slice(0, 10));
      
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-4 border-t mt-8">
      <h2 className="text-xl font-bold">🔍 Query Engine (Multi-Dataset)</h2>

      {/* Project & Dataset Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-3">
          <label className="block text-sm text-gray-600 mb-1">Select Project</label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="border p-2 w-full rounded font-mono text-sm"
          >
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.display_name}
              </option>
            ))}
          </select>
        </div>
        <div className="border rounded p-3">
          <label className="block text-sm text-gray-600 mb-1">Available Datasets</label>
          <div className="flex flex-wrap gap-1">
            {datasets.length > 0 ? (
              datasets.map((ds) => (
                <span key={ds.id} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                  {ds.display_name} ({ds.row_count})
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-400">No datasets</span>
            )}
          </div>
        </div>
      </div>

      {/* Query Input */}
      <div className="space-y-2 border rounded p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">💡 Try: </span>
          <button
            onClick={() => setPrompt("Show me all rows from all tables")}
            className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
          >
            Show all
          </button>
          <button
            onClick={() => setPrompt("What's the total count across all datasets?")}
            className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
          >
            Count all
          </button>
          <button
            onClick={() => setPrompt("Show me a sample of 5 rows from each table")}
            className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
          >
            Sample
          </button>
        </div>
        
        <textarea
          placeholder="Ask a question about your data (supports multiple tables)..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="border p-3 w-full rounded resize-none"
          rows={3}
        />
        
        <button
          onClick={executeQuery}
          disabled={loading || datasets.length === 0}
          className="bg-purple-500 text-white px-6 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {loading ? '⏳ Querying...' : '🚀 Execute Query'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-100 text-red-800 rounded border border-red-200">
          ❌ {error}
        </div>
      )}

      {/* Query History */}
      {queryHistory.length > 0 && (
        <div className="text-xs text-gray-500 border rounded p-2">
          <span className="font-semibold">Recent Queries:</span>
          {queryHistory.map((q, i) => (
            <button
              key={i}
              onClick={() => setPrompt(q.prompt)}
              className="ml-2 text-blue-500 hover:text-blue-700 underline"
            >
              {q.prompt.length > 40 ? q.prompt.substring(0, 40) + '...' : q.prompt}
            </button>
          ))}
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="space-y-4 border rounded p-4 bg-white">
          <div className="flex justify-between items-center">
            <div className="flex gap-4 text-sm">
              <span>📊 Columns: <strong>{result.columns.length}</strong></span>
              <span>📈 Rows: <strong>{result.rows.length.toLocaleString()}</strong></span>
              <span className="text-green-600">✅ Query executed successfully</span>
            </div>
            {result.rows.length > 0 && (
              <button
                onClick={() => {
                  // Copy as CSV
                  const csv = [result.columns.join(','), ...result.rows.map(r => 
                    result.columns.map(c => `"${String(r[c] || '')}"`).join(',')
                  )].join('\n');
                  navigator.clipboard.writeText(csv);
                }}
                className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
              >
                📋 Copy CSV
              </button>
            )}
          </div>

          {/* Data Table */}
          {result.rows.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 text-white sticky top-0">
                    <tr>
                      {result.columns.map((col) => (
                        <th key={col} className="px-4 py-2 text-left font-mono text-xs whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {result.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        {result.columns.map((col) => (
                          <td key={col} className="px-4 py-2 font-mono text-xs whitespace-nowrap max-w-xs truncate">
                            {row[col] !== undefined && row[col] !== null 
                              ? String(row[col]) 
                              : <span className="text-gray-400">null</span>
                            }
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 text-yellow-800 rounded border border-yellow-200">
              ⚠️ Query returned no rows
            </div>
          )}

          {/* Raw JSON */}
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
              🔍 View raw JSON data ({result.rows.length} rows)
            </summary>
            <pre className="p-3 bg-gray-100 rounded mt-2 overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default QueryTest;