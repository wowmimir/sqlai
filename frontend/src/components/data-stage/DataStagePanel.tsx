import { useWorkspaceStore } from '@/lib/store';
import { VirtualizedGrid } from './VirtualizedGrid';
import { Spinner } from '../ui/spinner';

export function DataStagePanel() {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const activeGridData = useWorkspaceStore((s) => s.activeGridData);
  const isGridLoading = useWorkspaceStore((s) => s.isGridLoading);
  const cacheMiss = useWorkspaceStore((s) => s.cacheMiss);
  const lastPromptByProject = useWorkspaceStore((s) => s.lastPromptByProject);
  const conversationThreads = useWorkspaceStore((s) => s.conversationThreads); // 👈 Add this
  const setCacheMiss = useWorkspaceStore((s) => s.setCacheMiss);
  const dispatchTextPrompt = useWorkspaceStore((s) => s.dispatchTextPrompt);

  // Handle re-run click for cache miss
  const handleReRun = () => {
    if (!activeProjectId) return;

    // 1. Try to get the stored prompt for this project
    let lastPrompt = lastPromptByProject[activeProjectId];

    // 2. If not found, fallback to the latest user message in the conversation
    if (!lastPrompt) {
      const messages = conversationThreads[activeProjectId] || [];
      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
      if (lastUserMsg) {
        lastPrompt = lastUserMsg.content;
      }
    }

    // 3. If we have a prompt, re-run it
    if (lastPrompt) {
      setCacheMiss(false);
      dispatchTextPrompt(lastPrompt, activeProjectId);
    }
  };

  // Determine button label
  const getButtonLabel = () => {
    if (!activeProjectId) return 'Select a project';
    const stored = lastPromptByProject[activeProjectId];
    if (stored) return 'Re-run pipeline';
    const messages = conversationThreads[activeProjectId] || [];
    const hasUserMessage = messages.some((m) => m.role === 'user');
    return hasUserMessage ? 'Re-run latest query' : 'Run a new query in chat';
  };

  // STATE 0: Cache miss (check this FIRST)
  if (cacheMiss && activeProjectId) {
    const isButtonDisabled = !lastPromptByProject[activeProjectId] &&
      !(conversationThreads[activeProjectId] || []).some((m) => m.role === 'user');

    return (
      <div className="h-full flex items-center justify-center bg-slate-900/10">
        <div className="text-center space-y-4">
          <div className="text-4xl mb-2">⏰</div>
          <div className="text-sm text-slate-400 font-medium">
            Result Matrix Cache Expired
          </div>
          <div className="text-xs text-slate-500">
            The cached data is no longer available.
          </div>
          <button
            onClick={handleReRun}
            disabled={isButtonDisabled}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {getButtonLabel()}
          </button>
        </div>
      </div>
    );
  }

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