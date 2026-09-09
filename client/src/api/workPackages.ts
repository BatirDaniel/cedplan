import { api } from './client';
import type {
  Comment,
  TimeEntry,
  WorkPackage,
  WorkPackagePriority,
  WorkPackageStatus,
  WorkPackageType,
} from '@/types';

export interface WorkPackageInput {
  subject: string;
  description?: string;
  type: WorkPackageType;
  status: WorkPackageStatus;
  priority: WorkPackagePriority;
  parentId?: string | null;
  assigneeIds?: string[] | null;
  startDate?: string | null;
  dueDate?: string | null;
  estimatedHours?: number | null;
  percentDone?: number;
}

export const workPackagesApi = {
  list: (projectId: string) =>
    api.get<WorkPackage[]>(`/projects/${projectId}/work-packages`).then((r) => r.data),
  get: (projectId: string, id: string) =>
    api.get<WorkPackage>(`/projects/${projectId}/work-packages/${id}`).then((r) => r.data),
  create: (projectId: string, data: WorkPackageInput) =>
    api.post<WorkPackage>(`/projects/${projectId}/work-packages`, data).then((r) => r.data),
  update: (projectId: string, id: string, data: WorkPackageInput) =>
    api.put<WorkPackage>(`/projects/${projectId}/work-packages/${id}`, data).then((r) => r.data),
  move: (projectId: string, id: string, status: WorkPackageStatus, position: number) =>
    api.patch(`/projects/${projectId}/work-packages/${id}/move`, { status, position }),
  updateStatus: (projectId: string, id: string, status: WorkPackageStatus) =>
    api.patch<WorkPackage>(`/projects/${projectId}/work-packages/${id}/status`, { status }).then((r) => r.data),
  updateSchedule: (projectId: string, id: string, startDate: string | null, dueDate: string | null) =>
    api
      .patch<WorkPackage>(`/projects/${projectId}/work-packages/${id}/schedule`, { startDate, dueDate })
      .then((r) => r.data),
  remove: (projectId: string, id: string) => api.delete(`/projects/${projectId}/work-packages/${id}`),

  comments: (projectId: string, id: string) =>
    api.get<Comment[]>(`/projects/${projectId}/work-packages/${id}/comments`).then((r) => r.data),
  addComment: (projectId: string, id: string, text: string, imageUrl?: string | null, mentionedUserIds?: string[]) =>
    api
      .post<Comment>(`/projects/${projectId}/work-packages/${id}/comments`, { text, imageUrl, mentionedUserIds })
      .then((r) => r.data),

  timeEntries: (projectId: string, id: string) =>
    api.get<TimeEntry[]>(`/projects/${projectId}/work-packages/${id}/time-entries`).then((r) => r.data),
  addTimeEntry: (projectId: string, id: string, data: { hours: number; spentOn: string; comment?: string }) =>
    api.post<TimeEntry>(`/projects/${projectId}/work-packages/${id}/time-entries`, data).then((r) => r.data),
};

export const uploadsApi = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api
      .post<{ url: string }>('/uploads/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data.url);
  },
};
