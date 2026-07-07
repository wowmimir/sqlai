import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@/lib/store';
import type { Project } from '@/lib/types';

interface Props { project: Project; }

export function ProjectListItem({ project }: Props) {
  const navigate = useNavigate();
  const active = useWorkspaceStore((s) => s.activeProjectId === project.id);

  return (
    <button
      type="button"
      onClick={() => navigate(`/project/${project.id}`)}
      title={project.description ?? project.display_name}
      className={`w-full text-left px-3 py-2 rounded-md transition border-l-[3px] ${
        active
          ? 'bg-slate-800/50 border-blue-500 text-white'
          : 'border-transparent hover:bg-slate-800/30 text-slate-300'
      }`}
    >
      <div className="text-sm font-medium truncate">{project.display_name}</div>
    </button>
  );
}
