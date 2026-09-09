import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';
import { priorityMeta, statusMeta } from '@/lib/ui';
import type { WorkPackagePriority, WorkPackageStatus } from '@/types';

/** Status as a small dot + colored text — never a large fill, keeps dense views calm. */
export function StatusBadge({ status, className }: { status: WorkPackageStatus; className?: string }) {
  const { t } = useTranslation();
  const meta = statusMeta[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', className)}>
      <span
        className="inline-block size-[7px] shrink-0 rounded-full"
        style={{ backgroundColor: `var(${meta.var})` }}
      />
      <span style={{ color: `var(${meta.var})` }}>{t(`workPackage.status.${status}`)}</span>
    </span>
  );
}

export function PriorityBadge({ priority, className }: { priority: WorkPackagePriority; className?: string }) {
  const { t } = useTranslation();
  const meta = priorityMeta[priority];
  return (
    <span
      className={cn('inline-flex items-center gap-1 text-xs font-medium', className)}
      style={{ color: `var(${meta.var})` }}
    >
      {t(`workPackage.priority.${priority}`)}
    </span>
  );
}

export function StatusDot({ status, className }: { status: WorkPackageStatus; className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn('inline-block size-[7px] shrink-0 rounded-full', className)}
      style={{ backgroundColor: `var(${statusMeta[status].var})` }}
      title={t(`workPackage.status.${status}`)}
    />
  );
}
