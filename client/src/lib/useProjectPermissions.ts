import { useQuery } from '@tanstack/react-query';

import { projectsApi } from '@/api/projects';
import { useAuthStore } from '@/store/auth';
import type { ProjectRole } from '@/types';

export interface ProjectPermissions {
  /** The caller's role inside this project, or undefined while loading / not a member. */
  role?: ProjectRole;
  /** Viewers can read everything but change nothing. */
  canEdit: boolean;
  /** Any Member+ can invite people into the project. */
  canInviteMembers: boolean;
  /** Only Admin/Responsible can change someone's role or remove them. */
  canManageMembers: boolean;
}

export function useProjectPermissions(projectId: string | undefined): ProjectPermissions {
  const currentUser = useAuthStore((s) => s.user);

  const { data: members } = useQuery({
    queryKey: ['members', projectId],
    queryFn: () => projectsApi.members(projectId!),
    enabled: !!projectId,
  });

  const role = members?.find((m) => m.userId === currentUser?.id)?.role;

  return {
    role,
    canEdit: role !== undefined && role >= 1,
    canInviteMembers: role !== undefined && role >= 1,
    canManageMembers: role !== undefined && role >= 2,
  };
}
