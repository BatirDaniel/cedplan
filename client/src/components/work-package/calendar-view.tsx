import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';

import { calendarEventsApi } from '@/api/calendar';
import { projectsApi } from '@/api/projects';
import { workPackagesApi } from '@/api/workPackages';
import { useAuthStore } from '@/store/auth';
import { useProjectPermissions } from '@/lib/useProjectPermissions';
import { periodRange } from '@/lib/period';
import type { CalendarEvent, CalendarTask, WorkPackage } from '@/types';
import { CalendarShell } from '@/components/calendar/calendar-shell';
import type { CalendarMode } from '@/components/calendar/calendar-toolbar';
import { EventDialog } from '@/components/calendar/event-dialog';
import { EventDetailSheet } from '@/components/calendar/event-detail-sheet';

interface Props {
  projectId: string;
  items: WorkPackage[];
  onSelect: (wp: WorkPackage) => void;
}

function toCalendarTask(wp: WorkPackage, projectName: string, projectColor: string, projectIdentifier: string): CalendarTask {
  return {
    id: wp.id,
    projectId: wp.projectId,
    projectName,
    projectColor,
    projectIdentifier,
    sequence: wp.sequence,
    subject: wp.subject,
    type: wp.type,
    status: wp.status,
    priority: wp.priority,
    startDate: wp.startDate,
    dueDate: wp.dueDate,
    estimatedHours: wp.estimatedHours,
    percentDone: wp.percentDone,
    assignees: wp.assignees,
  };
}

export function CalendarView({ projectId, items, onSelect }: Props) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const { canEdit } = useProjectPermissions(projectId);
  const weekStartsOn: 0 | 1 = currentUser?.firstDayOfWeek === 0 ? 0 : 1;

  const [mode, setMode] = React.useState<CalendarMode>('month');
  const [anchor, setAnchor] = React.useState(new Date());
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null);
  const [dialogState, setDialogState] = React.useState<{ open: boolean; date?: Date; hour?: number; event?: CalendarEvent } | null>(null);

  const { from, to } = React.useMemo(() => {
    if (mode === 'month') {
      return { from: startOfWeek(startOfMonth(anchor), { weekStartsOn }), to: endOfWeek(endOfMonth(anchor), { weekStartsOn }) };
    }
    const { start, end } = periodRange(mode, anchor, weekStartsOn);
    return { from: start, to: end };
  }, [mode, anchor, weekStartsOn]);

  const eventsQueryKey = ['project-events', projectId, from.toISOString(), to.toISOString()];

  const { data: events } = useQuery({
    queryKey: eventsQueryKey,
    queryFn: () => calendarEventsApi.list(projectId, from.toISOString(), to.toISOString()),
    enabled: !!projectId,
  });

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId),
    enabled: !!projectId,
  });

  const tasksAsCalendarTasks = React.useMemo(
    () => items.map((wp) => toCalendarTask(wp, project?.name ?? '', project?.color ?? '#2563eb', project?.identifier ?? '')),
    [items, project]
  );

  const backlog = React.useMemo(
    () =>
      tasksAsCalendarTasks.filter(
        (t) => !t.startDate && !t.dueDate && t.status !== 4 /* Closed */ && t.status !== 5 /* Rejected */
      ),
    [tasksAsCalendarTasks]
  );

  const scheduledTasks = React.useMemo(() => tasksAsCalendarTasks.filter((t) => t.startDate || t.dueDate), [tasksAsCalendarTasks]);

  const rescheduleTask = async (task: CalendarTask, startDate: string, dueDate: string) => {
    const wp = items.find((w) => w.id === task.id);
    if (!wp) return;

    const workPackagesQueryKey = ['work-packages', projectId];
    const previous = queryClient.getQueryData<WorkPackage[]>(workPackagesQueryKey);
    queryClient.setQueryData<WorkPackage[]>(workPackagesQueryKey, (prev) =>
      (prev ?? []).map((w) => (w.id === task.id ? { ...w, startDate, dueDate } : w))
    );

    try {
      await workPackagesApi.updateSchedule(projectId, task.id, startDate, dueDate);
    } catch {
      queryClient.setQueryData(workPackagesQueryKey, previous);
    } finally {
      queryClient.invalidateQueries({ queryKey: workPackagesQueryKey });
    }
  };

  const rescheduleEvent = async (event: CalendarEvent, startsAt: string, endsAt: string) => {
    const previous = queryClient.getQueryData(eventsQueryKey);
    queryClient.setQueryData(eventsQueryKey, (prev: CalendarEvent[] | undefined) =>
      (prev ?? []).map((e) => (e.id === event.id ? { ...e, startsAt, endsAt } : e))
    );

    try {
      await calendarEventsApi.reschedule(projectId, event.id, startsAt, endsAt);
    } catch {
      queryClient.setQueryData(eventsQueryKey, previous);
    } finally {
      queryClient.invalidateQueries({ queryKey: eventsQueryKey });
    }
  };

  return (
    <div className="h-full min-h-0">
      <CalendarShell
        mode={mode}
        onModeChange={setMode}
        anchor={anchor}
        onAnchorChange={setAnchor}
        weekStartsOn={weekStartsOn}
        events={events ?? []}
        tasks={scheduledTasks}
        backlog={backlog}
        canEdit={canEdit}
        onSelectEvent={setSelectedEvent}
        onSelectTask={(task) => {
          const wp = items.find((w) => w.id === task.id);
          if (wp) onSelect(wp);
        }}
        onCreateEventAt={(date, hour) => setDialogState({ open: true, date, hour })}
        onCreateEvent={() => setDialogState({ open: true })}
        onRescheduleTask={rescheduleTask}
        onRescheduleEvent={rescheduleEvent}
      />

      <EventDialog
        projectId={projectId}
        open={!!dialogState?.open}
        onOpenChange={(open) => setDialogState(open ? dialogState : null)}
        defaultDate={dialogState?.date}
        defaultHour={dialogState?.hour}
        event={dialogState?.event}
        feedQueryKey={eventsQueryKey}
      />
      <EventDetailSheet
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onEdit={(event) => {
          setSelectedEvent(null);
          setDialogState({ open: true, event });
        }}
        feedQueryKey={eventsQueryKey}
      />
    </div>
  );
}
