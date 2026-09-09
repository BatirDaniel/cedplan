import * as React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { format, isToday, startOfDay } from 'date-fns';

import { eventSpansDay, layoutOverlaps, minutesSinceStartOfDay, taskSpansDay } from '@/lib/calendar-dates';
import { useDateLocale, periodRange } from '@/lib/period';
import { statusMeta } from '@/lib/ui';
import { cn } from '@/lib/utils';
import type { CalendarEvent, CalendarTask } from '@/types';
import { CalendarChip } from '@/components/calendar/calendar-chip';
import { ScrollArea } from '@/components/ui/scroll-area';

export const HOUR_HEIGHT = 48; // px

interface CalendarTimeGridProps {
  anchor: Date;
  mode: 'week' | 'day';
  weekStartsOn: 0 | 1;
  events: CalendarEvent[];
  tasks: CalendarTask[];
  showProjectBadge?: boolean;
  canEdit: boolean;
  onSelectEvent: (e: CalendarEvent) => void;
  onSelectTask: (t: CalendarTask) => void;
  onCreateEventAt: (date: Date, hour: number) => void;
}

export function CalendarTimeGrid({
  anchor,
  mode,
  weekStartsOn,
  events,
  tasks,
  showProjectBadge,
  canEdit,
  onSelectEvent,
  onSelectTask,
  onCreateEventAt,
}: CalendarTimeGridProps) {
  const locale = useDateLocale();

  const days = React.useMemo(() => {
    if (mode === 'day') return [anchor];
    const { start } = periodRange('week', anchor, weekStartsOn);
    return Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * 86400000));
  }, [anchor, mode, weekStartsOn]);

  const allDayItems = React.useMemo(
    () =>
      days.map((day) => ({
        day,
        events: events.filter((e) => e.isAllDay && eventSpansDay(e, day)),
        tasks: tasks.filter((tk) => taskSpansDay(tk, day)),
      })),
    [days, events, tasks]
  );

  const hasAllDayRow = allDayItems.some((d) => d.events.length > 0 || d.tasks.length > 0);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex border-b">
        <div className="w-14 shrink-0" />
        {days.map((day) => (
          <div key={day.toISOString()} className="flex-1 border-l px-2 py-1.5 text-center">
            <p className="text-muted-foreground text-[11px] capitalize">{format(day, 'EEE', { locale })}</p>
            <p className={cn('text-sm font-medium', isToday(day) && 'text-primary')}>{format(day, 'd')}</p>
          </div>
        ))}
      </div>

      {hasAllDayRow && (
        <div className="flex border-b">
          <div className="text-muted-foreground w-14 shrink-0 px-1 py-1 text-right text-[10px]">all-day</div>
          {allDayItems.map(({ day, events: dayEvents, tasks: dayTasks }) => (
            <div key={day.toISOString()} className="flex-1 space-y-0.5 border-l p-0.5">
              {dayEvents.map((e) => (
                <CalendarChip
                  key={e.id}
                  label={e.title}
                  color={e.color ?? e.projectColor}
                  onClick={() => onSelectEvent(e)}
                />
              ))}
              {dayTasks.map((tk) => (
                <TimeGridTaskChip key={tk.id} task={tk} draggable={canEdit} onClick={() => onSelectTask(tk)} />
              ))}
            </div>
          ))}
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex">
          <div className="w-14 shrink-0">
            {hours.map((h) => (
              <div key={h} className="text-muted-foreground border-b px-1 text-right text-[10px]" style={{ height: HOUR_HEIGHT }}>
                {h > 0 && `${String(h).padStart(2, '0')}:00`}
              </div>
            ))}
          </div>
          {days.map((day) => (
            <DayColumn
              key={day.toISOString()}
              day={day}
              hours={hours}
              events={events.filter((e) => !e.isAllDay && eventSpansDay(e, day))}
              canEdit={canEdit}
              showProjectBadge={showProjectBadge}
              onSelectEvent={onSelectEvent}
              onCreateEventAt={onCreateEventAt}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function DayColumn({
  day,
  hours,
  events,
  canEdit,
  showProjectBadge,
  onSelectEvent,
  onCreateEventAt,
}: {
  day: Date;
  hours: number[];
  events: CalendarEvent[];
  canEdit: boolean;
  showProjectBadge?: boolean;
  onSelectEvent: (e: CalendarEvent) => void;
  onCreateEventAt: (date: Date, hour: number) => void;
}) {
  const dayStart = startOfDay(day);
  const dayEnd = new Date(dayStart.getTime() + 86400000);

  const clipped = events.map((e) => {
    const start = new Date(Math.max(new Date(e.startsAt).getTime(), dayStart.getTime()));
    const end = new Date(Math.min(new Date(e.endsAt).getTime(), dayEnd.getTime()));
    return { event: e, start, end };
  });
  const packed = layoutOverlaps(clipped);

  const dateKey = format(day, 'yyyy-MM-dd');
  const { setNodeRef, isOver } = useDroppable({ id: `time-${dateKey}`, data: { date: day }, disabled: !canEdit });

  return (
    <div ref={setNodeRef} className={cn('relative flex-1 border-l', isOver && 'bg-primary/5')} style={{ height: hours.length * HOUR_HEIGHT }}>
      {hours.map((h) => (
        <div
          key={h}
          className="hover:bg-accent/40 cursor-pointer border-b"
          style={{ height: HOUR_HEIGHT }}
          onDoubleClick={() => canEdit && onCreateEventAt(day, h)}
        />
      ))}
      {isToday(day) && <NowLine />}
      {packed.map(({ item, lane, lanes }) => {
        const top = (minutesSinceStartOfDay(item.start) / 60) * HOUR_HEIGHT;
        const height = Math.max(18, ((item.end.getTime() - item.start.getTime()) / 60000 / 60) * HOUR_HEIGHT);
        const width = 100 / lanes;
        return (
          <TimeGridEventBlock
            key={item.event.id}
            event={item.event}
            top={top}
            height={height}
            left={`${lane * width}%`}
            width={`${width}%`}
            canEdit={canEdit}
            showProjectBadge={showProjectBadge}
            onSelectEvent={onSelectEvent}
          />
        );
      })}
    </div>
  );
}

function TimeGridEventBlock({
  event,
  top,
  height,
  left,
  width,
  canEdit,
  showProjectBadge,
  onSelectEvent,
}: {
  event: CalendarEvent;
  top: number;
  height: number;
  left: string;
  width: string;
  canEdit: boolean;
  showProjectBadge?: boolean;
  onSelectEvent: (e: CalendarEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `event-${event.id}`,
    data: { kind: 'event', event },
    disabled: !canEdit,
  });
  const {
    attributes: resizeAttrs,
    listeners: resizeListeners,
    setNodeRef: setResizeRef,
    transform: resizeTransform,
    isDragging: isResizing,
  } = useDraggable({
    id: `resize-${event.id}`,
    data: { kind: 'resize', event },
    disabled: !canEdit,
  });

  const dragY = transform?.y ?? 0;
  const resizeExtra = resizeTransform?.y ?? 0;
  const timeLabel = new Date(event.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className="absolute px-px"
      style={{
        top,
        height: Math.max(18, height + (isResizing ? resizeExtra : 0)),
        left,
        width,
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? `translateY(${dragY}px)` : undefined,
        zIndex: isDragging || isResizing ? 20 : undefined,
      }}
    >
      <div ref={setNodeRef} {...(canEdit ? attributes : {})} {...(canEdit ? listeners : {})} className="h-full">
        <CalendarChip
          label={`${timeLabel} ${event.title}${showProjectBadge ? ` · ${event.projectIdentifier}` : ''}`}
          color={event.color ?? event.projectColor}
          onClick={() => onSelectEvent(event)}
          className="h-full items-start whitespace-normal"
        />
      </div>
      {canEdit && (
        <div
          ref={setResizeRef}
          {...resizeAttrs}
          {...resizeListeners}
          className="absolute inset-x-1 bottom-0 h-1.5 cursor-ns-resize touch-none"
        />
      )}
    </div>
  );
}

function TimeGridTaskChip({ task, draggable, onClick }: { task: CalendarTask; draggable: boolean; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { task },
    disabled: !draggable,
  });
  return (
    <div
      ref={setNodeRef}
      {...(draggable ? attributes : {})}
      {...(draggable ? listeners : {})}
      style={{ opacity: isDragging ? 0.4 : 1, transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined }}
    >
      <CalendarChip label={task.subject} color={`var(${statusMeta[task.status].var})`} onClick={onClick} />
    </div>
  );
}

function NowLine() {
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const top = (minutesSinceStartOfDay(now) / 60) * HOUR_HEIGHT;
  return <div className="bg-destructive/70 pointer-events-none absolute right-0 left-0 z-10 h-px" style={{ top }} />;
}
