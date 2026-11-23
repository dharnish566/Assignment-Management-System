import { api } from './api.js';

export const submissionService = {
  async status(assignmentId) {
    return (await api.get(`/assignments/${assignmentId}/submission-status`)).data;
  },
  async mySubmission(assignmentId) {
    return (await api.get(`/assignments/${assignmentId}/my-submission`)).data;
  },
  async verify(assignmentId) {
    return (await api.post(`/assignments/${assignmentId}/verify-upload`)).data;
  },
  async confirmSubmission(assignmentId, payload = {}) {
    return (await api.post(`/assignments/${assignmentId}/confirm-submission`, payload)).data;
  },
  async confirm(assignmentId, targetStudentId) {
    return (await api.post(`/assignments/${assignmentId}/confirmations`, { targetStudentId })).data;
  },
  async declareGroup(targetId) {
    return (await api.post(`/assignment-targets/${targetId}/group-submission`)).data;
  },
  async submissions(assignmentId) {
    return (await api.get(`/assignments/${assignmentId}/submissions`)).data;
  },
  async review(assignmentId, submissionId, decision, reason) {
    return (await api.post(`/assignments/${assignmentId}/submissions/${submissionId}/review`, { decision, reason })).data;
  },
  async progress() {
    return (await api.get('/student/progress')).data;
  },
  async groupProgress(groupId) {
    return (await api.get(`/groups/${groupId}/progress`)).data;
  },
};
