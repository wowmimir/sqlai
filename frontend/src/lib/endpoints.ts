const API = import.meta.env.VITE_API_BASE_URL;

export const ENDPOINTS = {
  projects: `${API}/api/v1/projects`,
  project: (id: string) => `${API}/api/v1/projects/${id}`,
  datasets: (projectId: string) => `${API}/api/v1/projects/${projectId}/datasets`,
  uploadDataset: (projectId: string) => `${API}/api/v1/projects/${projectId}/datasets/upload`,
  chatHistory: (projectId: string) => `${API}/api/v1/chat/history?project_id=${projectId}`,
  queryExecute: `${API}/api/v1/query/execute`,
  cacheRetrieve: (key: string) => `${API}/api/v1/cache/retrieve?key=${encodeURIComponent(key)}`,
};
