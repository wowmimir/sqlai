import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Types (unchanged)
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

  // Effects (unchanged)
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

  // API functions (unchanged – keep same logic)
  const loadProjects = async () => {
    try {
      const token = await getToken();
      const response = await axios.get('http://localhost:8000/api/v1/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });
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
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">🔍 Multi‑Dataset Query Engine</h2>

      {/* Project & Dataset Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Select Project</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedProjectId}
              onValueChange={handleProjectChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((proj) => (
                  <SelectItem key={proj.id} value={proj.id}>
                    {proj.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available Datasets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {datasets.length > 0 ? (
                datasets.map((ds) => (
                  <Badge key={ds.id} variant="secondary">
                    {ds.display_name} ({ds.row_count.toLocaleString()} rows)
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-gray-400">No datasets</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Interface */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>💬 Conversation</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => loadChatHistory(selectedProjectId)} disabled={loadingHistory}>
            {loadingHistory ? 'Loading...' : '↻ Refresh'}
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-72 rounded-md border p-2">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-4">
                {loadingHistory ? 'Loading history...' : 'No messages yet. Ask a question!'}
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
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
                        msg.role === 'user' ? 'justify-end' : msg.role === 'error' ? 'justify-center' : 'justify-start'
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
                        <div
                          className={`flex items-center justify-between gap-2 mt-1 ${
                            msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'
                          }`}
                        >
                          <span className="text-[10px]">{formatTime(msg.created_at)}</span>
                          {msg.role === 'assistant' && msg.redis_cache_key && prevUserPrompt && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 text-[10px] px-2 py-0 bg-purple-200 hover:bg-purple-300 text-purple-800"
                              onClick={() => runQueryWithPrompt(prevUserPrompt)}
                            >
                              🔄 Re-run
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Query Input */}
      <Card>
        <CardHeader>
          <CardTitle>Ask a question about your data</CardTitle>
          <CardDescription>Supports multiple tables and natural language</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-500">💡 Try:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPrompt('Show me all rows from all tables')}
            >
              Show all
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPrompt("What's the total count across all datasets?")}
            >
              Count all
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPrompt('Show me a sample of 5 rows from each table')}
            >
              Sample
            </Button>
          </div>

          <Textarea
            placeholder="e.g., Show total sales by region"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            disabled={loading}
          />

          <Button onClick={executeQuery} disabled={loading || datasets.length === 0 || !prompt.trim()}>
            {loading ? '⏳ Executing...' : '🚀 Execute Query'}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>❌ {error}</AlertDescription>
        </Alert>
      )}

      {/* Results Display */}
      {result && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div className="flex gap-4 text-sm">
                <span>📊 Columns: <strong>{result.columns.length}</strong></span>
                <span>📈 Rows: <strong>{result.rows.length.toLocaleString()}</strong></span>
                <span className="text-green-600">✅ Query executed successfully</span>
              </div>
              {result.rows.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const csv = [
                      result.columns.join(','),
                      ...result.rows.map((r) =>
                        result.columns.map((c) => `"${String(r[c] || '')}"`).join(',')
                      ),
                    ].join('\n');
                    navigator.clipboard.writeText(csv);
                  }}
                >
                  📋 Copy CSV
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {result.rows.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader className="bg-slate-800 sticky top-0">
                      <TableRow>
                        {result.columns.map((col) => (
                          <TableHead key={col} className="text-white font-mono text-xs">
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.rows.map((row, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50">
                          {result.columns.map((col) => (
                            <TableCell key={col} className="font-mono text-xs whitespace-nowrap max-w-xs truncate">
                              {row[col] !== undefined && row[col] !== null
                                ? String(row[col])
                                : <span className="text-gray-400">null</span>}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 text-yellow-800 rounded border border-yellow-200">
                ⚠️ Query returned no rows
              </div>
            )}

            <details className="mt-4 text-xs">
              <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                🔍 View raw JSON data
              </summary>
              <pre className="p-3 bg-gray-100 rounded mt-2 overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QueryTest;