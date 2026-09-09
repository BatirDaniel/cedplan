import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek } from 'date-fns';
import { Plus } from 'lucide-react';

import { eventSpansDay, taskSpansDay } from '@/lib/calendar-dates';
import { useDateLocale } from '@/lib/period';
import { statusMeta } from '@/lib/ui';
import { cn } from '@/lib/utils';
import type { CalendarEvent, CalendarTask } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarChip } from '@/components/calendar/calendar-chip';

const MAX_CHIPS_PER_DAY = 3;

interface CalendarMonthGridProps {
  anchor: Date;
  weekStartsOn: 0 | 1;
  events: CalendarEvent[];
  tasks: CalendarTask[];
  showProjectBadge?: boolean;
  canEdit: boolean;
  onSelectEvent: (e: CalendarEvent) => void;
  onSelectTask: (t: CalendarTask) => void;
  onCreateEventAt: (date: Date) => void;
}

export function CalendarMonthGrid({
  anchor,
  weekStartsOn,
  events,
  tasks,
  showProjectBadge,
  canEdit,
  onSelectEvent,
  onSelectTask,
  onCreateEventAt,
}: CalendarMonthGridProps) {
  const { t } = useTranslation();
  const locale = useDateLocale();

  const days = React.useMemo(() => {
    const start = startOfWeek(startOfMonth(anchor), { weekStartsOn });
    const end = endOfWeek(endOfMonth(anchor), { weekStartsOn });
    return eachDayOfInterval({ start, end });
  }, [anchor, weekStartsOn]);

  const weekDayLabels = days.slice(0, 7).map((d) => format(d, 'EEEEEE', { locale }));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid grid-cols-7 border-b">
        {weekDayLabels.map((label, i) => (
          <div key={i} className="text-muted-foreground px-2 py-1.5 text-center text-xs font-medium capitalize">
            {label}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7" style={{ gridTemplateRows: `repeat(${days.length / 7}, 1fr)` }}>
        {days.map((day) => (
          <DayCell
            key={day.toISOString()}
            day={day}
            inMonth={isSameMonth(day, anchor)}
            events={events.filter((e) => eventSpansDay(e, day))}
            tasks={tasks.filter((tk) => taskSpansDay(tk, day))}
            showProjectBadge={showProjectBadge}
            canEdit={canEdit}
            onSelectEvent={onSelectEvent}
            onSelectTask={onSelectTask}
            onCreateEventAt={onCreateEventAt}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

function DayCell({
  day,
  inMonth,
  events,
  tasks,
  showProjectBadge,
  canEdit,
  onSelectEvent,
  onSelectTask,
  onCreateEventAt,
  t,
}: {
  day: Date;
  inMonth: boolean;
  events: CalendarEvent[];
  tasks: CalendarTask[];
  showProjectBadge?: boolean;
  canEdit: boolean;
  onSelectEvent: (e: CalendarEvent) => void;
  onSelectTask: (t: CalendarTask) => void;
  onCreateEventAt: (date: Date) => void;
  t: (key: string, opts?: any) => string;
}) {
  const dateKey = format(day, 'yyyy-MM-dd');
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dateKey}`, data: { date: day }, disabled: !canEdit });

  const items: Array<{ kind: 'event'; event: CalendarEvent } | { kind: 'task'; task: CalendarTask }> = [
    ...events.map((event) => ({ kind: 'event' as const, event })),
    ...tasks.map((task) => ({ kind: 'task' as const, task })),
  ];
  const visible = items.slice(0, MAX_CHIPS_PER_DAY);
  const overflow = items.length - visible.length;

  return (
    <div
      ref={setNodeRef}
      onDoubleClick={() => canEdit && onCreateEventAt(day)}
      className={cn(
        'group relative flex min-h-24 flex-col gap-0.5 border-b border-r p-1 last:border-r-0',
        !inMonth && 'bg-muted/20',
        isOver && 'bg-primary/5'
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'flex size-5 items-center justify-center rounded-full text-xs',
            !inMonth && 'text-muted-foreground/50',
            isToday(day) && 'bg-primary text-primary-foreground font-semibold'
          )}
        >
          {format(day, 'd')}
        </span>
        {canEdit && (
          <button
            onClick={() => onCreateEventAt(day)}
            className="text-muted-foreground hover:text-foreground hover:bg-accent size-4 rounded opacity-0 transition-opacity group-hover:opacity-100"
          >
            <Plus className="size-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-0.5">
        {visible.map((it) =>
          it.kind === 'event' ? (
            <EventChip key={it.event.id} event={it.event} showProjectBadge={showProjectBadge} onClick={() => onSelectEvent(it.event)} />
          ) : (
            <TaskChip key={it.task.id} task={it.task} draggable={canEdit} onClick={() => onSelectTask(it.task)} />
          )
        )}
        {overflow > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground px-1.5 text-left text-[11px]">
                {t('calendar.moreCount', { count: overflow })}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 space-y-1 p-2" align="start">
              {items.map((it) =>
                it.kind === 'event' ? (
                  <EventChip key={it.event.id} event={it.event} showProjectBadge={showProjectBadge} onClick={() => onSelectEvent(it.event)} />
                ) : (
                  <TaskChip key={it.task.id} task={it.task} draggable={false} onClick={() => onSelectTask(it.task)} />
                )
              )}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

function EventChip({ event, showProjectBadge, onClick }: { event: CalendarEvent; showProjectBadge?: boolean; onClick: () => void }) {
  const color = event.color ?? event.projectColor;
  const timeLabel = event.isAllDay ? '' : `${new Date(event.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} `;
  const label = `${timeLabel}${event.title}${showProjectBadge ? ` · ${event.projectIdentifier}` : ''}`;
  return <CalendarChip label={label} color={color} onClick={onClick} />;
}

function TaskChip({ task, draggable, onClick }: { task: CalendarTask; draggable: boolean; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { task },
    disabled: !draggable,
  });
  const color = `var(${statusMeta[task.status].var})`;

  return (
    <div
      ref={setNodeRef}
      {...(draggable ? attributes : {})}
      {...(draggable ? listeners : {})}
      style={{ opacity: isDragging ? 0.4 : 1, transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined }}
    >
      <CalendarChip label={task.subject} color={color} onClick={onClick} />
    </div>
  );
}
