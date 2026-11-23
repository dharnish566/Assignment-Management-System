import axios from 'axios';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api' });

export function setAccessToken(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

api.interceptors.response.use(undefined, (error) => {
  if (error.response?.status === 401) window.dispatchEvent(new Event('joineazy:auth-expired'));
  return Promise.reject(error);
});
