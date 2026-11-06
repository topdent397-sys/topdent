import axios from 'axios';

const productionApiUrl = 'https://topdent-production-654a.up.railway.app/api';
const localApiUrl = 'http://localhost:3000/api';
const API_URL = (process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname) ? productionApiUrl : localApiUrl)).replace(/\/$/, '');

const api = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      window.localStorage.removeItem('token');
      window.localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/auth/')) window.location.assign(`/auth/login?next=${encodeURIComponent(window.location.pathname)}`);
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default api;
