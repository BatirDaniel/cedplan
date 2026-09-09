import { api } from './client';
import type { AttendeeResponse, CalendarEvent, CalendarEventType, CalendarFeed, CalendarTask } from '@/types';

export interface CalendarEventInput {
  title: string;
  description?: string | null;
  location?: string | null;
  meetingUrl?: string | null;
  type: CalendarEventType;
  isAllDay: boolean;
  startsAt: string;
  endsAt: string;
  workPackageId?: string | null;
  color?: string | null;
  attendeeIds?: string[] | null;
}

export const calendarEventsApi = {
  list: (projectId: string, from: string, to: string) =>
    api.get<CalendarEvent[]>(`/projects/${projectId}/events`, { params: { from, to } }).then((r) => r.data),
  get: (projectId: string, id: string) =>
    api.get<CalendarEvent>(`/projects/${projectId}/events/${id}`).then((r) => r.data),
  create: (projectId: string, data: CalendarEventInput) =>
    api.post<CalendarEvent>(`/projects/${projectId}/events`, data).then((r) => r.data),
  update: (projectId: string, id: string, data: CalendarEventInput) =>
    api.put<CalendarEvent>(`/projects/${projectId}/events/${id}`, data).then((r) => r.data),
  reschedule: (projectId: string, id: string, startsAt: string, endsAt: string) =>
    api
      .patch<CalendarEvent>(`/projects/${projectId}/events/${id}/reschedule`, { startsAt, endsAt })
      .then((r) => r.data),
  remove: (projectId: string, id: string) => api.delete(`/projects/${projectId}/events/${id}`),
  respond: (projectId: string, id: string, response: AttendeeResponse) =>
    api.post(`/projects/${projectId}/events/${id}/respond`, { response }),
};

export const calendarApi = {
  feed: (from: string, to: string, projectIds?: string[]) =>
    api
      .get<CalendarFeed>('/calendar', { params: { from, to, projectIds: projectIds?.join(',') } })
      .then((r) => r.data),
  backlog: (projectIds?: string[]) =>
    api.get<CalendarTask[]>('/calendar/backlog', { params: { projectIds: projectIds?.join(',') } }).then((r) => r.data),
};
