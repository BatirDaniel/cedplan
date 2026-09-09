import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Calendar, Check, MapPin, Pencil, Video, X } from 'lucide-react';

import { calendarEventsApi } from '@/api/calendar';
import { useAuthStore } from '@/store/auth';
import { initials } from '@/lib/ui';
import { cn } from '@/lib/utils';
import type { AttendeeResponse, CalendarEvent } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

interface EventDetailSheetProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
  feedQueryKey: unknown[];
}

const RESPONSE_LABEL_KEY: Record<AttendeeResponse, string> = {
  0: 'calendar.responseNoResponse',
  1: 'calendar.responseAccepted',
  2: 'calendar.responseDeclined',
  3: 'calendar.responseTentative',
};

export function EventDetailSheet({ event, onClose, onEdit, feedQueryKey }: EventDetailSheetProps) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const myAttendance = event?.attendees.find((a) => a.userId === currentUser?.id);

  const respondMutation = useMutation({
    mutationFn: (response: AttendeeResponse) => calendarEventsApi.respond(event!.projectId, event!.id, response),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedQueryKey });
      queryClient.invalidateQueries({ queryKey: ['project-events', event?.projectId] });
    },
  });

  return (
    <Sheet open={!!event} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        {event && (
          <>
            <SheetHeader>
              <SheetTitle className="pr-8">{event.title}</SheetTitle>
              <SheetDescription>
                {event.projectName}
                {event.workPackageSubject ? ` · ${event.workPackageSubject}` : ''}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 px-4 pb-4">
              <div className="flex items-start gap-2 text-sm">
                <Calendar className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <div>
                  <p>
                    {event.isAllDay
                      ? t('calendar.allDay')
                      : `${new Date(event.startsAt).toLocaleString()} – ${new Date(event.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                </div>
              </div>

              {event.location && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <p>{event.location}</p>
                </div>
              )}

              {event.meetingUrl && (
                <div className="flex items-start gap-2 text-sm">
                  <Video className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <a href={event.meetingUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {event.meetingUrl}
                  </a>
                </div>
              )}

              {event.description && <p className="text-muted-foreground text-sm whitespace-pre-wrap">{event.description}</p>}

              {myAttendance && (
                <div className="space-y-1.5 border-t pt-3">
                  <p className="text-muted-foreground text-xs font-medium">{t('calendar.yourResponse')}</p>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant={myAttendance.response === 1 ? 'default' : 'outline'}
                      onClick={() => respondMutation.mutate(1)}
                    >
                      <Check />
                      {t('calendar.responseAccepted')}
                    </Button>
                    <Button
                      size="sm"
                      variant={myAttendance.response === 3 ? 'default' : 'outline'}
                      onClick={() => respondMutation.mutate(3)}
                    >
                      {t('calendar.responseTentative')}
                    </Button>
                    <Button
                      size="sm"
                      variant={myAttendance.response === 2 ? 'default' : 'outline'}
                      onClick={() => respondMutation.mutate(2)}
                    >
                      <X />
                      {t('calendar.responseDeclined')}
                    </Button>
                  </div>
                </div>
              )}

              {event.attendees.length > 0 && (
                <div className="space-y-1.5 border-t pt-3">
                  <p className="text-muted-foreground text-xs font-medium">{t('calendar.attendees')}</p>
                  <div className="space-y-1.5">
                    {event.attendees.map((a) => (
                      <div key={a.userId} className="flex items-center gap-2 text-sm">
                        <Avatar className="size-6">
                          <AvatarFallback style={{ backgroundColor: a.avatarColor }}>{initials(a.fullName)}</AvatarFallback>
                        </Avatar>
                        <span className="flex-1 truncate">{a.fullName}</span>
                        <span
                          className={cn(
                            'text-xs',
                            a.response === 1 && 'text-status-done',
                            a.response === 2 && 'text-destructive',
                            a.response === 0 && 'text-muted-foreground'
                          )}
                        >
                          {t(RESPONSE_LABEL_KEY[a.response])}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button variant="outline" size="sm" className="w-full" onClick={() => onEdit(event)}>
                <Pencil />
                {t('common.edit')}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
