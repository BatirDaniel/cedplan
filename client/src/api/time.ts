import { api } from './client';
import type { TimeEntry } from '../types';

export const projectTimeApi = {
  list: (projectId: string) => api.get<TimeEntry[]>(`/projects/${projectId}/time-entries`).then((r) => r.data),
  update: (projectId: string, id: string, hours: number, spentOn: string, comment: string | null) =>
    api.put<TimeEntry>(`/projects/${projectId}/time-entries/${id}`, { hours, spentOn, comment }).then((r) => r.data),
  remove: (projectId: string, id: string) => api.delete(`/projects/${projectId}/time-entries/${id}`),
};
