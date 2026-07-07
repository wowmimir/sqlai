import { useState, useRef, useEffect } from 'react';
import { useWorkspaceStore } from '@/lib/store';

interface Props { onClose: () => void; }

export function NewProjectForm({ onClose }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createProject = useWorkspaceStore((s) => s.createProject);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await createProject(name.trim(), description.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to create project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="p-3 border border-slate-700 rounded-md bg-slate-900/50 space-y-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        placeholder="Project name"
        maxLength={100}
        className="w-full px-2 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        placeholder="Description (optional)"
        maxLength={500}
        className="w-full px-2 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
      />
      {error && <div className="text-xs text-red-400">{error}</div>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="flex-1 px-2 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !name.trim()}
          className="flex-1 px-2 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Create'}
        </button>
      </div>
    </div>
  );
}
