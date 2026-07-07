import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth} from '@clerk/clerk-react';
import { TopNav } from './TopNav';
import { ProjectSidebar } from '../components/sidebar/ProjectSidebar';
import { ChatPanel } from '../components/chat/ChatPanel';
import { DataStagePanel } from '../components/data-stage/DataStagePanel';
import { UploadOverlay } from '../components/sidebar/UploadOverlay';
import { useWorkspaceStore } from '../lib/store';
import { bindClerkTokenGetter } from '@/lib/api';

export function AppShell() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { userId, isSignedIn, getToken} = useAuth();
  const loadProjects = useWorkspaceStore((s) => s.loadProjects);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const setClerkUserId = useWorkspaceStore((s) => s.setClerkUserId);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);

  useEffect(() => {
    setClerkUserId(userId ?? null);
  }, [userId, setClerkUserId]);

  useEffect(() => {
    bindClerkTokenGetter(() => getToken());
  }, []);

  useEffect(() => {
    if (isSignedIn) loadProjects();
  }, [isSignedIn, loadProjects]);

  useEffect(() => {
    const target = projectId ?? null;
    if (target !== activeProjectId) {
      setActiveProject(target);
    }
    if (!target && activeProjectId) {
      navigate('/', { replace: true });
    }
  }, [projectId, activeProjectId, setActiveProject, navigate]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-950 text-slate-200">
      <TopNav />
      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="w-[20%] min-h-0">
          <ProjectSidebar />
        </div>
        <div className="w-[35%] min-h-0 border-x border-slate-800">
          <ChatPanel />
        </div>
        <div className="w-[45%] min-h-0">
          <DataStagePanel />
        </div>
      </div>
      <UploadOverlay />
    </div>
  );
}
