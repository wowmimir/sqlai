import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkspaceStore } from '@/lib/store';
import { NewProjectForm } from './NewProjectForm';
import { ProjectListItem } from './ProjectListItem';
import { DatasetList } from './DatasetList';
import { UploadCsvButton } from './UploadCsvButton';

export function ProjectSidebar() {
  const projects = useWorkspaceStore((s) => s.projects);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="h-full flex flex-col min-h-0 bg-slate-900/30">
      <div className="shrink-0 p-4 border-b border-slate-800 space-y-2">
        {formOpen ? (
          <NewProjectForm onClose={() => setFormOpen(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="w-full px-3 py-2 text-sm border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white rounded-md transition"
          >
            + New Project
          </button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {projects.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-8 px-4">
              No projects yet. Create one to get started.
            </div>
          ) : (
            projects.map((p) => <ProjectListItem key={p.id} project={p} />)
          )}
        </div>
      </ScrollArea>

      {activeProjectId && (
        <div className="shrink-0 p-3 border-t border-slate-800 space-y-3">
          <UploadCsvButton projectId={activeProjectId} />
          <DatasetList />
        </div>
      )}
    </div>
  );
}
