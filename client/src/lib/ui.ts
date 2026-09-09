import i18n from '@/i18n';
import type { WorkPackagePriority, WorkPackageStatus } from '@/types';

const DATE_LOCALES: Record<string, string> = { en: 'en-US', it: 'it-IT', ro: 'ro-RO', ru: 'ru-RU' };

export const statusMeta: Record<WorkPackageStatus, { var: string }> = {
  0: { var: '--status-todo' },
  1: { var: '--status-progress' },
  2: { var: '--status-review' },
  3: { var: '--status-onhold' },
  4: { var: '--status-done' },
  5: { var: '--status-rejected' },
};

export const priorityMeta: Record<WorkPackagePriority, { var: string }> = {
  0: { var: '--priority-low' },
  1: { var: '--priority-med' },
  2: { var: '--priority-high' },
  3: { var: '--priority-urgent' },
};

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function formatDate(date?: string | null): string {
  if (!date) return '—';
  const locale = DATE_LOCALES[i18n.language] ?? 'en-US';
  return new Date(date).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Short ticket key like "PLT-142" — mono, used as a stable per-project sequential id. */
export function ticketKey(projectIdentifier: string, seq: number): string {
  return `${projectIdentifier.slice(0, 4).toUpperCase()}-${seq}`;
}
