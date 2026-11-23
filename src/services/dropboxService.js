import { api } from './api.js';

export const dropboxService = {
  async status() {
    return (await api.get('/integrations/dropbox/status')).data;
  },
  async connect() {
    return (await api.get('/integrations/dropbox/connect')).data;
  },
  async disconnect() {
    return (await api.post('/integrations/dropbox/disconnect')).data;
  },
  async sync() {
    return (await api.post('/integrations/dropbox/sync')).data;
  },
};
