import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';

// --- Types ---
interface Project {
  id: string;
  display_name: string;
}

interface Dataset {
  id: string;
  display_name: string;
  row_count: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  redis_cache_key: string | null;
  created_at: string;
}

interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  redis_cache_key?: string;
}

const QueryTest: React.FC = () => {
  const { getToken } = useAuth();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [currentRedisKey, setCurrentRedisKey] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadDatasets(selectedProjectId);
      loadChatHistory(selectedProjectId);
    } else {
      setDatasets([]);
      setMessages([]);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- API calls ---

  const loadProjects = async () => {
    try {
      const token = await getToken();
      const response = await axios.get(
        'http://localhost:8000/api/v1/projects',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = response.data || [];
      setProjects(data);
      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
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

  const loadChatHistory = async (projectId: string) => {
    if (!projectId) return;
    setLoadingHistory(true);
    try {
      const token = await getToken();
      const response = await axios.get(
        `http://localhost:8000/api/v1/chat/history?project_id=${projectId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(response.data || []);
    } catch (err: any) {
      console.error('Failed to load chat history:', err);
      setMessages([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const executeQuery = async () => {
    setError('');
    setResult(null);
    setCurrentRedisKey(null);

    if (!selectedProjectId || !prompt.trim()) {
      setError('Project and prompt are required.');
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
        { project_id: selectedProjectId, prompt: prompt.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = response.data;
      setResult({
        columns: data.columns || [],
        rows: data.rows || [],
        redis_cache_key: data.redis_cache_key,
      });
      setCurrentRedisKey(data.redis_cache_key || null);

      await loadChatHistory(selectedProjectId);
      setPrompt('');

    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message;
      setError(detail);
      await loadChatHistory(selectedProjectId);
    } finally {
      setLoading(false);
    }
  };

  // Re-run a previous query
  const runQueryWithPrompt = async (promptText: string) => {
    setError('');
    setResult(null);
    setCurrentRedisKey(null);

    if (!selectedProjectId || !promptText.trim()) {
      setError('Project and prompt are required.');
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
        { project_id: selectedProjectId, prompt: promptText.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = response.data;
      setResult({
        columns: data.columns || [],
        rows: data.rows || [],
        redis_cache_key: data.redis_cache_key,
      });
      setCurrentRedisKey(data.redis_cache_key || null);

      await loadChatHistory(selectedProjectId);
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message;
      setError(detail);
      await loadChatHistory(selectedProjectId);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setResult(null);
    setCurrentRedisKey(null);
    setError('');
    setPrompt('');
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-4 border-t mt-8">
      <h2 className="text-xl font-bold">🔍 Multi‑Dataset Query Engine</h2>

      {/* Project & Dataset Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-3">
          <label className="block text-sm text-gray-600 mb-1">Select Project</label>
          <select
            value={selectedProjectId}
            onChange={(e) => handleProjectChange(e.target.value)}
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
                  {ds.display_name} ({ds.row_count.toLocaleString()} rows)
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-400">No datasets</span>
            )}
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="border rounded p-4 bg-gray-50">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-sm">💬 Conversation</h3>
          <button
            onClick={() => loadChatHistory(selectedProjectId)}
            className="text-xs text-blue-500 hover:text-blue-700"
            disabled={loadingHistory}
          >
            {loadingHistory ? 'Loading...' : '↻ Refresh'}
          </button>
        </div>
        
        <div className="flex flex-col max-h-72 overflow-y-auto space-y-2 bg-white rounded p-2 border">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-4">
              {loadingHistory ? 'Loading history...' : 'No messages yet. Ask a question!'}
            </div>
          ) : (
            messages.map((msg) => {
              // Find previous user prompt for assistant re-run button
              let prevUserPrompt = '';
              if (msg.role === 'assistant' && msg.redis_cache_key) {
                const idx = messages.indexOf(msg);
                for (let i = idx - 1; i >= 0; i--) {
                  if (messages[i].role === 'user') {
                    prevUserPrompt = messages[i].content;
                    break;
                  }
                }
              }

              return (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 
                    msg.role === 'error' ? 'justify-center' : 
                    'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-2 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : msg.role === 'error'
                        ? 'bg-red-100 text-red-800 border border-red-200 w-full max-w-[90%]'
                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    <div className="text-sm break-words">
                      {msg.role === 'user' ? '🧑‍💻 ' : msg.role === 'error' ? '⚠️ ' : '🤖 '}
                      {msg.content}
                    </div>
                    
                    <div className={`flex items-center justify-between gap-2 mt-1 ${
                      msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'
                    }`}>
                      <span className="text-[10px]">{formatTime(msg.created_at)}</span>
                      
                      {/* Re-run button for assistant messages that have a cache key */}
                      {msg.role === 'assistant' && msg.redis_cache_key && prevUserPrompt && (
                        <button
                          onClick={() => runQueryWithPrompt(prevUserPrompt)}
                          className="text-[10px] bg-purple-200 hover:bg-purple-300 text-purple-800 px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                          title="Re-run this query"
                        >
                          <span>🔄</span> Re-run
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Query Input */}
      <div className="space-y-2 border rounded p-4 bg-white">
        <div className="flex items-center gap-2 flex-wrap">
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
          className="border p-3 w-full rounded resize-none focus:ring-2 focus:ring-purple-300 outline-none"
          rows={2}
        />

        <button
          onClick={executeQuery}
          disabled={loading || datasets.length === 0 || !prompt.trim()}
          className="bg-purple-500 text-white px-6 py-2 rounded hover:bg-purple-600 disabled:opacity-50 transition-colors"
        >
          {loading ? '⏳ Executing...' : '🚀 Execute Query'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-100 text-red-800 rounded border border-red-200">
          ❌ {error}
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="space-y-4 border rounded p-4 bg-white">
          <div className="flex justify-between items-center">
            <div className="flex gap-4 text-sm flex-wrap">
              <span>📊 Columns: <strong>{result.columns.length}</strong></span>
              <span>📈 Rows: <strong>{result.rows.length.toLocaleString()}</strong></span>
              <span className="text-green-600">✅ Query executed successfully</span>
            </div>
            {result.rows.length > 0 && (
              <button
                onClick={() => {
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

          <details className="text-xs">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
              🔍 View raw JSON data
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