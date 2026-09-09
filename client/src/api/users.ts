import { api } from './client';
import type { NotificationPreferences, SystemRole, User, UserSession, WorkingHours } from '@/types';

export interface AdminUser extends User {
  createdAt: string;
  projectCount: number;
  isDeactivated: boolean;
}

export interface AdminStats {
  userCount: number;
  projectCount: number;
  workPackageCount: number;
  adminCount: number;
  managerCount: number;
}

export interface ProfileUpdateInput {
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  location?: string | null;
  bio?: string | null;
  avatarColor: string;
  status: number;
  statusMessage?: string | null;
}

export interface PreferencesUpdateInput {
  preferredLanguage: string;
  theme: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  firstDayOfWeek: number;
  defaultView: string;
  showCompletedTasks: boolean;
  confirmBeforeDelete: boolean;
  autoFollowCreatedTasks: boolean;
  autoFollowAssignedTasks: boolean;
  defaultCalendarView: string;
  defaultEventDurationMinutes: number;
}

export const usersApi = {
  me: () => api.get<User>('/users/me').then((r) => r.data),
  updateProfile: (data: ProfileUpdateInput) => api.put<User>('/users/me/profile', data).then((r) => r.data),
  updatePreferences: (data: PreferencesUpdateInput) => api.put<User>('/users/me/preferences', data).then((r) => r.data),

  getNotificationPreferences: () => api.get<NotificationPreferences>('/users/me/notifications').then((r) => r.data),
  updateNotificationPreferences: (data: NotificationPreferences) =>
    api.put<NotificationPreferences>('/users/me/notifications', data).then((r) => r.data),

  getWorkingHours: () => api.get<WorkingHours>('/users/me/working-hours').then((r) => r.data),
  updateWorkingHours: (data: WorkingHours) => api.put<WorkingHours>('/users/me/working-hours', data).then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/users/me/change-password', { currentPassword, newPassword }),

  getSessions: () => api.get<UserSession[]>('/users/me/sessions').then((r) => r.data),
  revokeSession: (id: string) => api.delete(`/users/me/sessions/${id}`),
  revokeOtherSessions: () => api.post('/users/me/sessions/revoke-others'),

  deactivate: () => api.post('/users/me/deactivate'),
  deleteAccount: () => api.delete('/users/me'),

  getActivity: () =>
    api
      .get<{ projectsJoined: number; tasksCreated: number; tasksCompleted: number; commentsPosted: number }>('/users/me/activity')
      .then((r) => r.data),
  exportData: () => api.get('/users/me/export', { responseType: 'blob' }).then((r) => r.data as Blob),

  search: (q: string, department?: string) =>
    api.get<User[]>('/users', { params: { q, department } }).then((r) => r.data),
  listDepartments: () => api.get<string[]>('/users/departments').then((r) => r.data),

  adminListUsers: () => api.get<AdminUser[]>('/users/admin/all').then((r) => r.data),
  adminStats: () => api.get<AdminStats>('/users/admin/stats').then((r) => r.data),
  adminSetRole: (id: string, role: SystemRole) => api.put(`/users/admin/${id}/role`, { role }),
  adminDeleteUser: (id: string) => api.delete(`/users/admin/${id}`),
};
