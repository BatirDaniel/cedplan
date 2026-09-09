import { api } from './client';
import type { SystemRole } from '@/types';

export interface Permission {
  key: string;
  category: string;
  description: string;
}

export interface RolePermissionEntry {
  role: SystemRole;
  permissionKey: string;
  granted: boolean;
}

export const permissionsApi = {
  list: () => api.get<Permission[]>('/permissions').then((r) => r.data),
  matrix: () => api.get<RolePermissionEntry[]>('/permissions/matrix').then((r) => r.data),
  updateMatrix: (entries: RolePermissionEntry[]) => api.put('/permissions/matrix', { entries }),
};
