import { create } from 'zustand';
import { api } from './api';
import { ENDPOINTS } from './endpoints';
import type { Project, DatasetAsset, ChatMessage, TabularDataMatrix } from './types';

interface WorkspaceState {
  clerkUserId: string | null;
  activeProjectId: string | null;
  isUploading: boolean;
  uploadError: string | null;
  isQueryLoading: boolean;
  isGridLoading: boolean; // NEW: dedicated grid loading flag
  isEngineWaking: boolean;
  projects: Project[];
  datasetsByProject: Record<string, DatasetAsset[]>;
  conversationThreads: Record<string, ChatMessage[]>;
  activeGridData: TabularDataMatrix | null;

  setClerkUserId: (id: string | null) => void;
  setEngineWaking: (val: boolean) => void;
  clearUploadError: () => void;

  loadProjects: () => Promise<void>;
  createProject: (name: string, description?: string) => Promise<Project>;
  setActiveProject: (projectId: string | null) => Promise<void>;
  loadDatasetsForProject: (projectId: string) => Promise<void>;
  loadChatHistory: (projectId: string) => Promise<void>;
  submitFileToBackend: (file: File, projectId: string) => Promise<void>;
  dispatchTextPrompt: (promptText: string, projectId: string) => Promise<void>;
  hydrateGridFromCache: (cacheKey: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  clerkUserId: null,
  activeProjectId: null,
  isUploading: false,
  uploadError: null,
  isQueryLoading: false,
  isGridLoading: false, // NEW: initialised to false
  isEngineWaking: false,
  projects: [],
  datasetsByProject: {},
  conversationThreads: {},
  activeGridData: null,

  setClerkUserId: (id) => set({ clerkUserId: id }),
  setEngineWaking: (val) => set({ isEngineWaking: val }),
  clearUploadError: () => set({ uploadError: null }),

  loadProjects: async () => {
    const { data } = await api.get(ENDPOINTS.projects);
    set({ projects: data });
  },

  createProject: async (name, description) => {
    const { data } = await api.post(ENDPOINTS.projects, { display_name: name, description });
    set({ projects: [data, ...get().projects] });
    return data;
  },

  setActiveProject: async (projectId) => {
    set({ activeProjectId: projectId, activeGridData: null, isGridLoading: false });
    if (!projectId) return;

    const datasetsLoaded = !!get().datasetsByProject[projectId];
    const historyLoaded = !!get().conversationThreads[projectId];

    if (!datasetsLoaded || !historyLoaded) {
      await Promise.all([
        !datasetsLoaded ? get().loadDatasetsForProject(projectId) : Promise.resolve(),
        !historyLoaded ? get().loadChatHistory(projectId) : Promise.resolve(),
      ]);
    }
  },

  loadDatasetsForProject: async (projectId) => {
    const { data } = await api.get(ENDPOINTS.datasets(projectId));
    set({ datasetsByProject: { ...get().datasetsByProject, [projectId]: data } });
  },

  loadChatHistory: async (projectId: string) => {
    const { data } = await api.get(ENDPOINTS.chatHistory(projectId));
    set({
      conversationThreads: {
        ...get().conversationThreads,
        [projectId]: data,
      },
    });
  },

  submitFileToBackend: async (file, projectId) => {
    set({ isUploading: true, uploadError: null });
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post(ENDPOINTS.uploadDataset(projectId), formData);
      const existing = get().datasetsByProject[projectId] ?? [];
      set({ datasetsByProject: { ...get().datasetsByProject, [projectId]: [data, ...existing] } });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      set({ uploadError: typeof detail === 'string' ? detail : 'Upload failed. Please try again.' });
    } finally {
      set({ isUploading: false });
    }
  },

  dispatchTextPrompt: async (promptText, projectId) => {
  const userMsg: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    content: promptText,
    created_at: new Date().toISOString(),
  };
  const thread = get().conversationThreads[projectId] ?? [];
  set({
    conversationThreads: { ...get().conversationThreads, [projectId]: [...thread, userMsg] },
    isQueryLoading: true,
    isGridLoading: true,
    activeGridData: null,
  });

  try {
    const { data } = await api.post(ENDPOINTS.queryExecute, { project_id: projectId, prompt: promptText });
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: data.message ?? `✅ ${data.rows?.length ?? 0} rows returned`,
      redis_cache_key: data.redis_cache_key ?? null,
      created_at: new Date().toISOString(),
    };
    set({
      conversationThreads: {
        ...get().conversationThreads,
        [projectId]: [...get().conversationThreads[projectId], assistantMsg],
      },
      activeGridData: data.columns && data.rows ? { columns: data.columns, rows: data.rows } : null,
      isQueryLoading: false,
      isGridLoading: false,
    });
  } catch (err: any) {
    const detail = err?.response?.data?.detail ?? 'Query failed.';
    const errorMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'error',
      content: detail,
      created_at: new Date().toISOString(),
    };
    set({
      conversationThreads: {
        ...get().conversationThreads,
        [projectId]: [...get().conversationThreads[projectId], errorMsg],
      },
      activeGridData: null,
      isQueryLoading: false,
      isGridLoading: false,
    });
  }
},

  hydrateGridFromCache: async (cacheKey) => {
    set({ activeGridData: null, isGridLoading: true }); // NEW: show spinner
    try {
      const { data } = await api.get(ENDPOINTS.cacheRetrieve(cacheKey));
      set({ activeGridData: { columns: data.columns, rows: data.rows }, isGridLoading: false });
    } catch {
      set({ activeGridData: null, isGridLoading: false }); // NEW: hide spinner on error
    }
  },
}));