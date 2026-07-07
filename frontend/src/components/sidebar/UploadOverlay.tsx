import { useWorkspaceStore } from '@/lib/store';
import { Spinner } from '../ui/spinner';

export function UploadOverlay() {
  const isUploading = useWorkspaceStore((s) => s.isUploading);
  if (!isUploading) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md">
      <Spinner className="h-12 w-12" />
      <p className="mt-4 text-sm text-slate-400">Processing file into project storage…</p>
    </div>
  );
}
