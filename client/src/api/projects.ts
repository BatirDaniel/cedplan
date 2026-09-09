import { api } from './client';
import type { Project, ProjectMember, ProjectRole } from '../types';

export const projectsApi = {
  list: () => api.get<Project[]>('/projects').then((r) => r.data),
  get: (id: string) => api.get<Project>(`/projects/${id}`).then((r) => r.data),
  create: (data: { name: string; identifier: string; description?: string; color: string }) =>
    api.post<Project>('/projects', data).then((r) => r.data),
  update: (id: string, data: { name: string; description?: string; color: string; isArchived: boolean }) =>
    api.put(`/projects/${id}`, data),
  remove: (id: string) => api.delete(`/projects/${id}`),
  members: (id: string) => api.get<ProjectMember[]>(`/projects/${id}/members`).then((r) => r.data),
  addMember: (id: string, email: string, role: ProjectRole) =>
    api.post<ProjectMember>(`/projects/${id}/members`, { email, role }).then((r) => r.data),
  updateMemberRole: (id: string, memberId: string, role: ProjectRole) =>
    api.put(`/projects/${id}/members/${memberId}`, { role }),
  removeMember: (id: string, memberId: string) => api.delete(`/projects/${id}/members/${memberId}`),
};
