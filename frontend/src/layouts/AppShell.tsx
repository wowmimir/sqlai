import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
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
  const { userId, isSignedIn, getToken } = useAuth();
  const loadProjects = useWorkspaceStore((s) => s.loadProjects);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const setClerkUserId = useWorkspaceStore((s) => s.setClerkUserId);
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const isUploading = useWorkspaceStore((s) => s.isUploading);
  const isEngineWaking = useWorkspaceStore((s) => s.isEngineWaking); // 👈 add this

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
      
      {/* Upload overlay takes priority over engine waking overlay */}
      {isUploading ? <UploadOverlay /> : null}
      
      {/* Engine waking overlay - rendered inline, no separate file needed */}
      {!isUploading && isEngineWaking && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md">
          <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-sm text-slate-400">
            Waking up analytical query engines, please hold…
          </p>
        </div>
      )}
    </div>
  );
}