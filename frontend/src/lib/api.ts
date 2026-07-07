import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';

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
