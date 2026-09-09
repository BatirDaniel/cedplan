import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, ExternalLink } from 'lucide-react';

import { workPackagesApi } from '@/api/workPackages';
import { initials, ticketKey } from '@/lib/ui';
import type { CalendarTask, WorkPackageStatus } from '@/types';
import { WorkPackageStatusOrder } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PriorityBadge, StatusDot } from '@/components/status-badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

interface TaskQuickSheetProps {
  task: CalendarTask | null;
  onClose: () => void;
  onOpenTask: (task: CalendarTask) => void;
  feedQueryKey: unknown[];
}

export function TaskQuickSheet({ task, onClose, onOpenTask, feedQueryKey }: TaskQuickSheetProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: (status: WorkPackageStatus) => workPackagesApi.updateStatus(task!.projectId, task!.id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedQueryKey });
      queryClient.invalidateQueries({ queryKey: ['calendar-backlog'] });
      queryClient.invalidateQueries({ queryKey: ['work-packages', task!.projectId] });
    },
  });

  return (
    <Sheet open={!!task} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-sm" onOpenAutoFocus={(e) => e.preventDefault()}>
        {task && (
          <>
            <SheetHeader>
              <p className="font-mono-key text-muted-foreground text-xs">{ticketKey(task.projectIdentifier, task.sequence)}</p>
              <SheetTitle className="pr-8">{task.subject}</SheetTitle>
              <SheetDescription>{task.projectName}</SheetDescription>
            </SheetHeader>

            <div className="space-y-4 px-4 pb-4">
              <div className="flex items-center gap-2">
                <PriorityBadge priority={task.priority} />
                {task.assignees.length > 0 && (
                  <div className="ml-auto flex -space-x-1.5">
                    {task.assignees.map((a) => (
                      <Avatar key={a.id} className="border-background size-6 border-2">
                        <AvatarFallback style={{ backgroundColor: a.avatarColor }} className="text-[10px]">
                          {initials(a.fullName)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-muted-foreground mb-1.5 text-xs font-medium">{t('workPackage.columns.status')}</p>
                <Select value={String(task.status)} onValueChange={(v) => statusMutation.mutate(Number(v) as WorkPackageStatus)}>
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue>
                      <span className="inline-flex items-center gap-1.5">
                        <StatusDot status={task.status} />
                        {t(`workPackage.status.${task.status}`)}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {WorkPackageStatusOrder.map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        <span className="inline-flex items-center gap-1.5">
                          <StatusDot status={s} />
                          {t(`workPackage.status.${s}`)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {task.status !== 4 && (
                <Button size="sm" className="w-full" onClick={() => statusMutation.mutate(4)} disabled={statusMutation.isPending}>
                  <Check />
                  {t('calendar.markDone')}
                </Button>
              )}

              <Button variant="outline" size="sm" className="w-full" onClick={() => onOpenTask(task)}>
                <ExternalLink />
                {t('calendar.openTask')}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
