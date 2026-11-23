import { api } from './api.js';

export const analyticsService = {
  async studentDashboard() { return (await api.get('/student/dashboard')).data; },
  async adminDashboard() { return (await api.get('/admin/dashboard')).data; },
  async analytics() { return (await api.get('/admin/analytics')).data; },
  async submissions(params = {}) { return (await api.get('/admin/submissions', { params })).data; },
};
