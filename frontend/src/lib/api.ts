import axios from 'axios';
import { useWorkspaceStore } from './store'; // 👈 add this import at the top

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// Attach Clerk session token to every request.
// We read the token via Clerk's useAuth() hook — a thin module-level
// reference is set once in AppShell so axios can access it without
// being a React hook itself.
let getTokenFn: (() => Promise<string | null>) | null = null;

export function bindClerkTokenGetter(fn: () => Promise<string | null>) {
  getTokenFn = fn;
}

api.interceptors.request.use(async (config) => {
  if (getTokenFn) {
    const token = await getTokenFn();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});



let slowRequestCount = 0;
const SLOW_THRESHOLD_MS = 3000;

api.interceptors.request.use((config) => {
  const timeoutId = setTimeout(() => {
    (config as any ).metadata.timedOut = true;
    slowRequestCount += 1;
    useWorkspaceStore.getState().setEngineWaking(true);
  }, SLOW_THRESHOLD_MS);

  (config as any ).metadata = {
    timeoutId,
    timedOut: false,
  };

  return config;
});

function handleResponseCleanup(config: any) {
  if (config?.metadata) {
    const { timeoutId, timedOut } = config.metadata;
    if (timeoutId) clearTimeout(timeoutId);
    if (timedOut) {
      slowRequestCount -= 1;
      if (slowRequestCount === 0) {
        useWorkspaceStore.getState().setEngineWaking(false);
      }
    }
  }
}

api.interceptors.response.use(
  (response) => {
    handleResponseCleanup(response.config);
    return response;
  },
  (error) => {
    handleResponseCleanup(error.config);
    return Promise.reject(error);
  }
);

// ─── Clerk token interceptor ────────────────────────────────────────────
api.interceptors.request.use(async (config) => {
  if (getTokenFn) {
    const token = await getTokenFn();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
