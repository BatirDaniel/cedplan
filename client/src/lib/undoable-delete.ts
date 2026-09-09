import type { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { workPackagesApi } from '@/api/workPackages';
import i18n from '@/i18n';
import type { WorkPackage } from '@/types';

const UNDO_WINDOW_MS = 4500;

/**
 * Optimistically removes a work package from the cache and shows an undo toast.
 * The actual DELETE request fires only after the undo window elapses.
 */
export function deleteWorkPackageWithUndo(
  queryClient: QueryClient,
  projectId: string,
  workPackage: WorkPackage
) {
  const queryKey = ['work-packages', projectId];
  const previous = queryClient.getQueryData<WorkPackage[]>(queryKey);

  queryClient.setQueryData<WorkPackage[]>(queryKey, (old) => old?.filter((w) => w.id !== workPackage.id));

  let undone = false;
  const timeout = setTimeout(async () => {
    if (undone) return;
    try {
      await workPackagesApi.remove(projectId, workPackage.id);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    } catch {
      queryClient.setQueryData(queryKey, previous);
      toast.error(i18n.t('workPackage.deleteFailed'));
    }
  }, UNDO_WINDOW_MS);

  toast(i18n.t('workPackage.deletedToast', { subject: workPackage.subject }), {
    action: {
      label: i18n.t('workPackage.undo'),
      onClick: () => {
        undone = true;
        clearTimeout(timeout);
        queryClient.setQueryData(queryKey, previous);
      },
    },
    duration: UNDO_WINDOW_MS,
  });
}
