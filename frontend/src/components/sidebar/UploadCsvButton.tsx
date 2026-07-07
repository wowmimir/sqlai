import { useRef } from 'react';
import { useWorkspaceStore } from '@/lib/store';

interface Props { projectId: string; }

export function UploadCsvButton({ projectId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const submit = useWorkspaceStore((s) => s.submitFileToBackend);
  const error = useWorkspaceStore((s) => s.uploadError);
  const clearError = useWorkspaceStore((s) => s.clearUploadError);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      useWorkspaceStore.setState({ uploadError: 'Only .csv files are supported.' });
      e.target.value = '';
      return;
    }
    submit(file, projectId);
    e.target.value = '';
  };

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => { clearError(); inputRef.current?.click(); }}
        className="w-full px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded transition"
      >
        ↑ Upload CSV
      </button>
      <input ref={inputRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
      {error && <div className="text-xs text-red-400 px-1">{error}</div>}
    </div>
  );
}
