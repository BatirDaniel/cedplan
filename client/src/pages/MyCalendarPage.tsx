import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';

import { calendarApi, calendarEventsApi } from '@/api/calendar';
import { workPackagesApi } from '@/api/workPackages';
import { useAuthStore } from '@/store/auth';
import { periodRange } from '@/lib/period';
import type { CalendarEvent, CalendarTask } from '@/types';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationBell } from '@/components/notification-bell';
import { CalendarShell } from '@/components/calendar/calendar-shell';
import type { CalendarMode } from '@/components/calendar/calendar-toolbar';
import { EventDialog } from '@/components/calendar/event-dialog';
import { EventDetailSheet } from '@/components/calendar/event-detail-sheet';
import { TaskQuickSheet } from '@/components/calendar/task-quick-sheet';

export function MyCalendarPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const weekStartsOn: 0 | 1 = currentUser?.firstDayOfWeek === 0 ? 0 : 1;

  const [mode, setMode] = React.useState<CalendarMode>((currentUser?.defaultCalendarView as CalendarMode) ?? 'month');
  const [anchor, setAnchor] = React.useState(new Date());
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null);
  const [selectedTask, setSelectedTask] = React.useState<CalendarTask | null>(null);
  const [dialogState, setDialogState] = React.useState<{ open: boolean; date?: Date; hour?: number; event?: CalendarEvent } | null>(null);

  const { from, to } = React.useMemo(() => {
    if (mode === 'month') {
      return { from: startOfWeek(startOfMonth(anchor), { weekStartsOn }), to: endOfWeek(endOfMonth(anchor), { weekStartsOn }) };
    }
    const { start, end } = periodRange(mode, anchor, weekStartsOn);
    return { from: start, to: end };
  }, [mode, anchor, weekStartsOn]);

  const feedQueryKey = ['calendar-feed', from.toISOString(), to.toISOString()];

  const { data: feed } = useQuery({
    queryKey: feedQueryKey,
    queryFn: () => calendarApi.feed(from.toISOString(), to.toISOString()),
  });

  const { data: backlog } = useQuery({
    queryKey: ['calendar-backlog'],
    queryFn: () => calendarApi.backlog(),
  });

  const selectedEvent = React.useMemo(
    () => (selectedEventId ? (feed?.events ?? []).find((e) => e.id === selectedEventId) ?? null : null),
    [feed, selectedEventId]
  );

  const rescheduleTask = async (task: CalendarTask, startDate: string, dueDate: string) => {
    queryClient.setQueryData(['calendar-backlog'], (prev: CalendarTask[] | undefined) => (prev ?? []).filter((tk) => tk.id !== task.id));
    queryClient.setQueryData(feedQueryKey, (prev: any) =>
      prev
        ? {
            ...prev,
            tasks: prev.tasks.some((tk: CalendarTask) => tk.id === task.id)
              ? prev.tasks.map((tk: CalendarTask) => (tk.id === task.id ? { ...tk, startDate, dueDate } : tk))
              : [...prev.tasks, { ...task, startDate, dueDate }],
          }
        : prev
    );

    try {
      await workPackagesApi.updateSchedule(task.projectId, task.id, startDate, dueDate);
    } finally {
      queryClient.invalidateQueries({ queryKey: feedQueryKey });
      queryClient.invalidateQueries({ queryKey: ['calendar-backlog'] });
    }
  };

  const rescheduleEvent = async (event: CalendarEvent, startsAt: string, endsAt: string) => {
    const previous = queryClient.getQueryData(feedQueryKey);
    queryClient.setQueryData(feedQueryKey, (prev: any) =>
      prev
        ? { ...prev, events: prev.events.map((e: CalendarEvent) => (e.id === event.id ? { ...e, startsAt, endsAt } : e)) }
        : prev
    );

    try {
      await calendarEventsApi.reschedule(event.projectId, event.id, startsAt, endsAt);
    } catch {
      queryClient.setQueryData(feedQueryKey, previous);
    } finally {
      queryClient.invalidateQueries({ queryKey: feedQueryKey });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-medium">{t('calendar.title')}</h1>
        <div className="ml-auto flex items-center gap-1">
          <NotificationBell />
          <ThemeToggle />
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <CalendarShell
          mode={mode}
          onModeChange={setMode}
          anchor={anchor}
          onAnchorChange={setAnchor}
          weekStartsOn={weekStartsOn}
          events={feed?.events ?? []}
          tasks={feed?.tasks ?? []}
          backlog={backlog ?? []}
          canEdit
          showProjectBadge
          onSelectEvent={(e) => setSelectedEventId(e.id)}
          onSelectTask={setSelectedTask}
          onCreateEventAt={(date, hour) => setDialogState({ open: true, date, hour })}
          onCreateEvent={() => setDialogState({ open: true })}
          onRescheduleTask={rescheduleTask}
          onRescheduleEvent={rescheduleEvent}
        />
      </div>

      <EventDialog
        open={!!dialogState?.open}
        onOpenChange={(open) => setDialogState(open ? dialogState : null)}
        defaultDate={dialogState?.date}
        defaultHour={dialogState?.hour}
        event={dialogState?.event}
        feedQueryKey={feedQueryKey}
      />
      <EventDetailSheet
        event={selectedEvent}
        onClose={() => setSelectedEventId(null)}
        onEdit={(event) => {
          setSelectedEventId(null);
          setDialogState({ open: true, event });
        }}
        feedQueryKey={feedQueryKey}
      />
      <TaskQuickSheet
        task={selectedTask ? (feed?.tasks ?? backlog ?? []).find((tk) => tk.id === selectedTask.id) ?? selectedTask : null}
        onClose={() => setSelectedTask(null)}
        onOpenTask={(task) => navigate(`/projects/${task.projectId}?view=list&task=${task.id}`)}
        feedQueryKey={feedQueryKey}
      />
    </div>
  );
}
