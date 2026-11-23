import { api } from './api.js';

export const submissionService = {
  async status(assignmentId) { return (await api.get(`/assignments/${assignmentId}/submission-status`)).data; },
  async confirm(assignmentId, targetStudentId) { return (await api.post(`/assignments/${assignmentId}/confirmations`, { targetStudentId })).data; },
  async declareGroup(targetId) { return (await api.post(`/assignment-targets/${targetId}/group-submission`)).data; },
  async progress() { return (await api.get('/student/progress')).data; },
  async groupProgress(groupId) { return (await api.get(`/groups/${groupId}/progress`)).data; },
};
