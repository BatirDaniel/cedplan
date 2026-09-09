import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { statusMeta } from '@/lib/ui';
import type { WorkPackage } from '@/types';

interface Props {
  items: WorkPackage[];
  onSelect: (wp: WorkPackage) => void;
}

const DATE_LOCALES: Record<string, string> = { en: 'en-US', it: 'it-IT', ro: 'ro-RO', ru: 'ru-RU' };

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dayDiff(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function GanttView({ items, onSelect }: Props) {
  const { t, i18n } = useTranslation();
  const dateLocale = DATE_LOCALES[i18n.language] ?? 'en-US';
  const scheduled = React.useMemo(() => items.filter((w) => w.startDate || w.dueDate), [items]);

  const { rangeStart, totalDays } = React.useMemo(() => {
    if (scheduled.length === 0) return { rangeStart: new Date(), totalDays: 30 };
    const starts = scheduled.map((w) => new Date(w.startDate ?? w.dueDate!));
    const ends = scheduled.map((w) => new Date(w.dueDate ?? w.startDate!));
    const min = new Date(Math.min(...starts.map((d) => d.getTime())));
    const max = new Date(Math.max(...ends.map((d) => d.getTime())));
    const start = addDays(min, -2);
    const days = Math.max(dayDiff(start, addDays(max, 3)), 14);
    return { rangeStart: start, totalDays: days };
  }, [scheduled]);

  const dayWidth = 30;
  const today = new Date();
  const todayOffset = dayDiff(rangeStart, today);
  const days = Array.from({ length: totalDays }, (_, i) => addDays(rangeStart, i));

  if (scheduled.length === 0) {
    return (
      <div className="text-muted-foreground p-10 text-center text-sm">{t('workPackage.ganttEmpty')}</div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="border rounded-lg overflow-hidden" style={{ minWidth: 200 + totalDays * dayWidth }}>
        <div className="flex sticky top-0 bg-background z-10 border-b">
          <div className="w-52 shrink-0 px-3 py-2 text-muted-foreground text-xs font-medium border-r">{t('workPackage.task')}</div>
          <div className="flex">
            {days.map((d, i) => (
              <div
                key={i}
                style={{ width: dayWidth }}
                className={`shrink-0 text-center py-1.5 text-[10px] border-r ${
                  d.getDay() === 0 || d.getDay() === 6 ? 'bg-muted/40 text-muted-foreground/60' : 'text-muted-foreground'
                }`}
              >
                <div>{d.toLocaleDateString(dateLocale, { day: '2-digit' })}</div>
                <div className="text-muted-foreground/60">{d.toLocaleDateString(dateLocale, { month: 'short' })}</div>
              </div>
            ))}
          </div>
        </div>

        {scheduled.map((w) => {
          const start = new Date(w.startDate ?? w.dueDate!);
          const end = new Date(w.dueDate ?? w.startDate!);
          const offset = Math.max(dayDiff(rangeStart, start), 0);
          const duration = Math.max(dayDiff(start, end) + 1, 1);

          return (
            <div key={w.id} className="flex border-b last:border-0 hover:bg-muted/30">
              <div className="w-52 shrink-0 px-3 py-2 text-sm truncate border-r">{w.subject}</div>
              <div className="relative" style={{ width: totalDays * dayWidth, height: 36 }}>
                {todayOffset >= 0 && todayOffset < totalDays && (
                  <div className="absolute top-0 bottom-0 w-px bg-destructive/60 z-10" style={{ left: todayOffset * dayWidth }} />
                )}
                <button
                  onClick={() => onSelect(w)}
                  className="absolute top-2 h-4 rounded flex items-center px-1.5 overflow-hidden opacity-90 hover:opacity-100 transition-opacity"
                  style={{
                    left: offset * dayWidth,
                    width: Math.max(duration * dayWidth - 4, 8),
                    backgroundColor: `var(${statusMeta[w.status].var})`,
                  }}
                  title={`${w.subject} — ${t(`workPackage.status.${w.status}`)}`}
                >
                  <span className="text-[10px] font-medium text-white truncate">{w.subject}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
