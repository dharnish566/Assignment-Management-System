import { api } from './api.js';

export const authService = {
  async login(credentials) { return (await api.post('/auth/login', credentials)).data; },
  async register(payload) { return (await api.post('/auth/register', payload)).data; },
  async me() { return (await api.get('/auth/me')).data; },
};
