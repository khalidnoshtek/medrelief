import axios from 'axios';
import { useAuthStore } from '../store/auth-store';

// In dev: "/api/v1" is proxied by vite to localhost:4782
// In prod: set VITE_API_BASE to "https://your-backend.onrender.com/api/v1"
const baseURL = (import.meta.env.VITE_API_BASE as string | undefined) || '/api/v1';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  maxContentLength: 50 * 1024 * 1024,
  maxBodyLength: 50 * 1024 * 1024,
});

api.interceptors.request.use((config) => {
  const isAuthEndpoint = config.url?.includes('/auth/');
  if (!isAuthEndpoint) {
    const token = useAuthStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
