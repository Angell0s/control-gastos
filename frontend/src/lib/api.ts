import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  console.warn("⚠️ NEXT_PUBLIC_API_URL no está definida");
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para token del store
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
