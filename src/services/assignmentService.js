import { api } from './api.js';

export const assignmentService = {
  async list(params = {}) { return (await api.get('/assignments', { params })).data; },
  async getById(id) { return (await api.get(`/assignments/${id}`)).data; },
  async create(payload) { return (await api.post('/assignments', payload)).data; },
  async update(id, payload) { return (await api.patch(`/assignments/${id}`, payload)).data; },
  async publish(id) { return (await api.post(`/assignments/${id}/publish`)).data; },
  async groups() { return (await api.get('/groups')).data; },
};
