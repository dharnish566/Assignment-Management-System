import { api } from './api.js';

export const groupService = {
  async getMine() { return (await api.get('/groups/me')).data; },
  async getById(id) { return (await api.get(`/groups/${id}`)).data; },
  async create(name) { return (await api.post('/groups', { name })).data; },
  async invite(groupId, identifier) { return (await api.post(`/groups/${groupId}/invitations`, { identifier })).data; },
  async lookupStudent(groupId, identifier) { return (await api.get(`/groups/${groupId}/invitees`, { params: { identifier } })).data; },
  async removeMember(groupId, studentId) { return (await api.delete(`/groups/${groupId}/members/${studentId}`)).data; },
  async getInvitations() { return (await api.get('/invitations/me')).data; },
  async respondToInvitation(id, status) { return (await api.patch(`/invitations/${id}`, { status })).data; },
};
