import axios from 'axios';

const TOKEN_STORAGE_KEY = 'joineazy_access_token';

export const api = axios.create({ 
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
});

// Restore saved access token from localStorage on initial load
const savedToken = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
if (savedToken) {
  api.defaults.headers.common.Authorization = `Bearer ${savedToken}`;
}

export function setAccessToken(token) {
  if (token) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    delete api.defaults.headers.common.Authorization;
  }
}

api.interceptors.response.use(undefined, (error) => {
  if (error.response?.status === 401) {
    setAccessToken(null);
    window.dispatchEvent(new Event('joineazy:auth-expired'));
  }
  return Promise.reject(error);
});
