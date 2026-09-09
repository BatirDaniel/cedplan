import { api } from '@/api/client';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  projectId: string | null;
  projectName: string | null;
  workPackageId: string | null;
  workPackageSubject: string | null;
  actorId: string | null;
  actorName: string | null;
  actorColor: string | null;
  isRead: boolean;
  createdAt: string;
}

export const notificationsApi = {
  list: (take = 30) => api.get<AppNotification[]>('/notifications', { params: { take } }),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};
