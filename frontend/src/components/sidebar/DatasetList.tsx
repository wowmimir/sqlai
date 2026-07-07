import { useWorkspaceStore } from '@/lib/store';
import { useShallow } from 'zustand/shallow';

export function DatasetList() {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const datasets = useWorkspaceStore(useShallow((s) =>
    activeProjectId ? s.datasetsByProject[activeProjectId] ?? [] : []
  ));

  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 px-1">
        Datasets ({datasets.length})
      </div>
      {datasets.length === 0 ? (
        <div className="text-xs text-slate-500 px-1 py-1">No datasets yet</div>
      ) : (
        datasets.map((d) => (
          <div key={d.id} className="px-2 py-1.5 rounded hover:bg-slate-800/30 text-xs">
            <div className="text-slate-200 truncate">{d.display_name}</div>
            <div className="text-slate-500 text-[10px]">
              {d.row_count.toLocaleString()} rows
            </div>
          </div>
        ))
      )}
    </div>
  );
}
