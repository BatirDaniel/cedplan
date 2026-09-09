import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns';
import { Plus } from 'lucide-react';

import { formatRangeLabel, shiftAnchor, useDateLocale } from '@/lib/period';
import { ticketKey } from '@/lib/ui';
import type { CalendarEvent, CalendarTask } from '@/types';
import { PriorityBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { CalendarBacklog } from '@/components/calendar/calendar-backlog';
import { CalendarMonthGrid } from '@/components/calendar/calendar-month-grid';
import { CalendarTimeGrid, HOUR_HEIGHT } from '@/components/calendar/calendar-time-grid';
import { CalendarToolbar, type CalendarMode } from '@/components/calendar/calendar-toolbar';

interface CalendarShellProps {
  mode: CalendarMode;
  onModeChange: (mode: CalendarMode) => void;
  anchor: Date;
  onAnchorChange: (date: Date) => void;
  weekStartsOn: 0 | 1;
  events: CalendarEvent[];
  tasks: CalendarTask[];
  backlog: CalendarTask[];
  canEdit: boolean;
  showProjectBadge?: boolean;
  showBacklog?: boolean;
  onSelectEvent: (e: CalendarEvent) => void;
  onSelectTask: (t: CalendarTask) => void;
  onCreateEventAt: (date: Date, hour?: number) => void;
  onCreateEvent: () => void;
  onRescheduleTask: (task: CalendarTask, startDate: string, dueDate: string) => void;
  onRescheduleEvent: (event: CalendarEvent, startsAt: string, endsAt: string) => void;
}

export function CalendarShell({
  mode,
  onModeChange,
  anchor,
  onAnchorChange,
  weekStartsOn,
  events,
  tasks,
  backlog,
  canEdit,
  showProjectBadge,
  showBacklog = true,
  onSelectEvent,
  onSelectTask,
  onCreateEventAt,
  onCreateEvent,
  onRescheduleTask,
  onRescheduleEvent,
}: CalendarShellProps) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const [activeTask, setActiveTask] = React.useState<CalendarTask | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDragStart(e: DragStartEvent) {
    const task = e.active.data.current?.task as CalendarTask | undefined;
    setActiveTask(task ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const { active, over, delta } = e;

    const kind = active.data.current?.kind as 'event' | 'resize' | undefined;
    if (kind === 'event' || kind === 'resize') {
      const event = active.data.current?.event as CalendarEvent | undefined;
      if (!event) return;
      const start = parseISO(event.startsAt);
      const end = parseISO(event.endsAt);
      const snappedMinutes = Math.round(((delta.y / HOUR_HEIGHT) * 60) / 15) * 15;
      if (snappedMinutes === 0) return;

      if (kind === 'resize') {
        const newEnd = new Date(end.getTime() + snappedMinutes * 60000);
        if (newEnd.getTime() - start.getTime() < 15 * 60000) return;
        onRescheduleEvent(event, start.toISOString(), newEnd.toISOString());
        return;
      }

      const dropDate = over?.data.current?.date as Date | undefined;
      const targetDay = dropDate ?? startOfDay(start);
      const minutesOfDay = start.getHours() * 60 + start.getMinutes() + snappedMinutes;
      const newStart = new Date(startOfDay(targetDay).getTime() + minutesOfDay * 60000);
      const duration = end.getTime() - start.getTime();
      const newEnd = new Date(newStart.getTime() + duration);
      onRescheduleEvent(event, newStart.toISOString(), newEnd.toISOString());
      return;
    }

    if (!over) return;

    const task = active.data.current?.task as CalendarTask | undefined;
    const dropDate = over.data.current?.date as Date | undefined;
    if (!task || !dropDate) return;

    const dropDateStr = format(dropDate, 'yyyy-MM-dd');

    if (!task.startDate && !task.dueDate) {
      onRescheduleTask(task, dropDateStr, dropDateStr);
      return;
    }

    const anchorDate = task.startDate ? parseISO(task.startDate) : parseISO(task.dueDate!);
    const dayShift = differenceInCalendarDays(dropDate, anchorDate);
    const newStart = task.startDate ? format(addDays(parseISO(task.startDate), dayShift), 'yyyy-MM-dd') : dropDateStr;
    const newDue = task.dueDate ? format(addDays(parseISO(task.dueDate), dayShift), 'yyyy-MM-dd') : dropDateStr;
    onRescheduleTask(task, newStart, newDue);
  }

  const label = formatRangeLabel(mode === 'day' ? 'day' : mode === 'week' ? 'week' : 'month', anchor, locale, weekStartsOn);

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragEnd={canEdit ? onDragEnd : () => setActiveTask(null)}>
      <div className="flex h-full min-h-0 flex-col gap-3 p-4">
        <CalendarToolbar
          mode={mode}
          onModeChange={onModeChange}
          label={label}
          onPrev={() => onAnchorChange(shiftAnchor(mode === 'day' ? 'day' : mode === 'week' ? 'week' : 'month', anchor, -1))}
          onNext={() => onAnchorChange(shiftAnchor(mode === 'day' ? 'day' : mode === 'week' ? 'week' : 'month', anchor, 1))}
          onToday={() => onAnchorChange(new Date())}
          rightSlot={
            canEdit && (
              <Button size="sm" onClick={onCreateEvent}>
                <Plus />
                {t('calendar.newEvent')}
              </Button>
            )
          }
        />

        <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border">
          <div className="min-w-0 flex-1">
            {mode === 'month' ? (
              <CalendarMonthGrid
                anchor={anchor}
                weekStartsOn={weekStartsOn}
                events={events}
                tasks={tasks}
                showProjectBadge={showProjectBadge}
                canEdit={canEdit}
                onSelectEvent={onSelectEvent}
                onSelectTask={onSelectTask}
                onCreateEventAt={onCreateEventAt}
              />
            ) : (
              <CalendarTimeGrid
                anchor={anchor}
                mode={mode}
                weekStartsOn={weekStartsOn}
                events={events}
                tasks={tasks}
                showProjectBadge={showProjectBadge}
                canEdit={canEdit}
                onSelectEvent={onSelectEvent}
                onSelectTask={onSelectTask}
                onCreateEventAt={onCreateEventAt}
              />
            )}
          </div>
          {showBacklog && (
            <CalendarBacklog tasks={backlog} showProjectBadge={showProjectBadge} canEdit={canEdit} onSelectTask={onSelectTask} />
          )}
        </div>
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="bg-card w-56 rounded-md border p-2 shadow-lg">
            <p className="font-mono-key text-muted-foreground text-[10px]">{ticketKey(activeTask.projectIdentifier, activeTask.sequence)}</p>
            <p className="mb-1 line-clamp-2 text-sm font-medium">{activeTask.subject}</p>
            <PriorityBadge priority={activeTask.priority} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
