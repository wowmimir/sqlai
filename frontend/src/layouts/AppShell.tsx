import { TopNav } from './TopNav';
import { ProjectSidebar } from '../components/sidebar/ProjectSidebar';
import { ChatPanel } from '../components/chat/ChatPanel';
import { DataStagePanel } from '../components/data-stage/DataStagePanel';

interface AppShellProps {
  projectId?: string | null;
}

export function AppShell({ projectId }: AppShellProps) {
  // For 4.1, projectId is received but not used (future Zustand wiring)
  console.log('[AppShell] Rendering for project:', projectId);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-950 text-slate-200">
      {/* Top Navigation — fixed height, shrink-0 */}
      <TopNav />

      {/* Main Row — takes remaining height, prevents overflow */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Project Sidebar — 20% */}
        <div className="w-[20%] min-h-0">
          <ProjectSidebar />
        </div>

        {/* Middle: Chat Panel — 35% */}
        <div className="w-[35%] min-h-0 border-x border-slate-800">
          <ChatPanel />
        </div>

        {/* Right: Data Stage — 45% */}
        <div className="w-[45%] min-h-0">
          <DataStagePanel />
        </div>
      </div>
    </div>
  );
}