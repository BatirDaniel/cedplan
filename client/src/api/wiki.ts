import { api } from './client';
import type { WikiNodeType, WikiPage } from '../types';

export interface WikiPageVersionSummary {
  id: string;
  title: string;
  savedByName: string;
  createdAt: string;
}

export interface WikiPageVersion extends WikiPageVersionSummary {
  content: string;
}

export const wikiApi = {
  list: (projectId: string) => api.get<WikiPage[]>(`/projects/${projectId}/wiki`).then((r) => r.data),
  get: (projectId: string, id: string) => api.get<WikiPage>(`/projects/${projectId}/wiki/${id}`).then((r) => r.data),
  create: (projectId: string, title: string, content: string, nodeType: WikiNodeType, parentId: string | null) =>
    api.post<WikiPage>(`/projects/${projectId}/wiki`, { title, content, nodeType, parentId }).then((r) => r.data),
  update: (projectId: string, id: string, title: string, content: string) =>
    api.put<WikiPage>(`/projects/${projectId}/wiki/${id}`, { title, content }).then((r) => r.data),
  move: (projectId: string, id: string, newParentId: string | null) =>
    api.patch<WikiPage>(`/projects/${projectId}/wiki/${id}/move`, { newParentId }).then((r) => r.data),
  remove: (projectId: string, id: string) => api.delete(`/projects/${projectId}/wiki/${id}`),

  versions: (projectId: string, id: string) =>
    api.get<WikiPageVersionSummary[]>(`/projects/${projectId}/wiki/${id}/versions`).then((r) => r.data),
  version: (projectId: string, id: string, versionId: string) =>
    api.get<WikiPageVersion>(`/projects/${projectId}/wiki/${id}/versions/${versionId}`).then((r) => r.data),
  restoreVersion: (projectId: string, id: string, versionId: string) =>
    api.post<WikiPage>(`/projects/${projectId}/wiki/${id}/versions/${versionId}/restore`).then((r) => r.data),
};
