import { useWorkspaceStore } from '@/lib/store';
import { VirtualizedGrid } from './VirtualizedGrid';
import { Spinner } from '../ui/spinner';

export function DataStagePanel() {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const activeGridData = useWorkspaceStore((s) => s.activeGridData);
  const isGridLoading = useWorkspaceStore((s) => s.isGridLoading);

  // STATE 1: No project selected
  if (!activeProjectId) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900/10">
        <div className="text-center space-y-2">
          <div className="text-4xl mb-2">📁</div>
          <div className="text-sm text-slate-400 font-medium">No Project Selected</div>
          <div className="text-xs text-slate-500">Select a project to begin analysing data.</div>
        </div>
      </div>
    );
  }

  // STATE 2: Loading
  if (isGridLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900/10">
        <div className="text-center space-y-4">
          <Spinner className="h-12 w-12" />
          <div className="text-sm text-slate-400">Loading data…</div>
        </div>
      </div>
    );
  }

  // STATE 3: No data (no query run yet)
  if (!activeGridData) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900/10">
        <div className="text-center space-y-2">
          <div className="text-4xl mb-2">💬</div>
          <div className="text-sm text-slate-400 font-medium">No Query Yet</div>
          <div className="text-xs text-slate-500">Run a query in the chat panel to see results here.</div>
        </div>
      </div>
    );
  }

  // STATE 4: Empty result set (query ran but returned 0 rows)
  if (activeGridData.rows.length === 0 || activeGridData.columns.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900/10">
        <div className="text-center space-y-2">
          <div className="text-4xl mb-2">📭</div>
          <div className="text-sm text-slate-400 font-medium">Empty Result Set</div>
          <div className="text-xs text-slate-500">Query executed successfully, but returned 0 rows.</div>
        </div>
      </div>
    );
  }

  // STATE 5: Data available – render virtualized grid
  return <VirtualizedGrid data={activeGridData} />;
}