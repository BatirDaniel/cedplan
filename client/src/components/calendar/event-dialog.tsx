import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Check, MapPin, Video } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { calendarEventsApi } from '@/api/calendar';
import { projectsApi } from '@/api/projects';
import { workPackagesApi } from '@/api/workPackages';
import { useAuthStore } from '@/store/auth';
import { initials } from '@/lib/ui';
import type { CalendarEvent } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

type FormValues = {
  projectId: string;
  title: string;
  description?: string;
  location?: string;
  meetingUrl?: string;
  type: number;
  isAllDay: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  workPackageId: string;
  attendeeIds: string[];
};

function toIsoAllDay(dateStr: string) {
  return `${dateStr}T00:00:00.000Z`;
}

function toIsoTimed(dateStr: string, timeStr: string) {
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
}

interface EventDialogProps {
  projectId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
  defaultHour?: number;
  event?: CalendarEvent | null;
  feedQueryKey: unknown[];
}

export function EventDialog({ projectId, open, onOpenChange, defaultDate, defaultHour, event, feedQueryKey }: EventDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const defaultDurationMinutes = useAuthStore((s) => s.user?.defaultEventDurationMinutes) ?? 60;
  const [attendeesOpen, setAttendeesOpen] = React.useState(false);
  const isEditing = !!event;

  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: projectsApi.list, enabled: open && !projectId });

  const schema = z.object({
    projectId: z.string().min(1, t('calendar.projectRequired')),
    title: z.string().min(1, t('workPackage.titleRequired')).max(200),
    description: z.string().max(4000).optional(),
    location: z.string().max(200).optional(),
    meetingUrl: z.string().max(500).optional(),
    type: z.coerce.number(),
    isAllDay: z.boolean(),
    startDate: z.string().min(1),
    startTime: z.string(),
    endDate: z.string().min(1),
    endTime: z.string(),
    workPackageId: z.string(),
    attendeeIds: z.array(z.string()),
  });

  const defaults = React.useMemo((): FormValues => {
    if (event) {
      const start = new Date(event.startsAt);
      const end = new Date(event.endsAt);
      return {
        projectId: event.projectId,
        title: event.title,
        description: event.description ?? '',
        location: event.location ?? '',
        meetingUrl: event.meetingUrl ?? '',
        type: event.type,
        isAllDay: event.isAllDay,
        startDate: format(start, 'yyyy-MM-dd'),
        startTime: format(start, 'HH:mm'),
        endDate: event.isAllDay ? format(new Date(end.getTime() - 86400000), 'yyyy-MM-dd') : format(end, 'yyyy-MM-dd'),
        endTime: format(end, 'HH:mm'),
        workPackageId: event.workPackageId ?? '',
        attendeeIds: event.attendees.map((a) => a.userId),
      };
    }
    const day = defaultDate ?? new Date();
    const dateStr = format(day, 'yyyy-MM-dd');
    const hour = defaultHour ?? 9;
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start.getTime() + defaultDurationMinutes * 60000);
    return {
      projectId: projectId ?? '',
      title: '',
      description: '',
      location: '',
      meetingUrl: '',
      type: 0,
      isAllDay: false,
      startDate: dateStr,
      startTime: format(start, 'HH:mm'),
      endDate: format(end, 'yyyy-MM-dd'),
      endTime: format(end, 'HH:mm'),
      workPackageId: '',
      attendeeIds: [],
    };
  }, [event, defaultDate, defaultHour, projectId, defaultDurationMinutes]);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults });

  React.useEffect(() => {
    if (open) form.reset(defaults);
  }, [open, defaults]);

  const selectedProjectId = form.watch('projectId');
  const isAllDay = form.watch('isAllDay');

  const { data: members } = useQuery({
    queryKey: ['members', selectedProjectId],
    queryFn: () => projectsApi.members(selectedProjectId),
    enabled: open && !!selectedProjectId,
  });

  const { data: projectTasks } = useQuery({
    queryKey: ['work-packages', selectedProjectId],
    queryFn: () => workPackagesApi.list(selectedProjectId),
    enabled: open && !!selectedProjectId,
  });

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const startsAt = values.isAllDay ? toIsoAllDay(values.startDate) : toIsoTimed(values.startDate, values.startTime);
      const endsAt = values.isAllDay ? toIsoAllDay(values.endDate) : toIsoTimed(values.endDate, values.endTime);
      const payload = {
        title: values.title,
        description: values.description || null,
        location: values.location || null,
        meetingUrl: values.meetingUrl || null,
        type: values.type as CalendarEvent['type'],
        isAllDay: values.isAllDay,
        startsAt,
        endsAt,
        workPackageId: values.workPackageId || null,
        color: null,
        attendeeIds: values.attendeeIds,
      };
      return isEditing
        ? calendarEventsApi.update(values.projectId, event!.id, payload)
        : calendarEventsApi.create(values.projectId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedQueryKey });
      queryClient.invalidateQueries({ queryKey: ['project-events', selectedProjectId] });
      toast.success(isEditing ? t('calendar.eventUpdatedToast') : t('calendar.eventCreatedToast'));
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? t('calendar.eventSaveFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => calendarEventsApi.remove(event!.projectId, event!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedQueryKey });
      queryClient.invalidateQueries({ queryKey: ['project-events', event?.projectId] });
      toast.success(t('calendar.eventDeletedToast'));
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('calendar.editEvent') : t('calendar.newEvent')}</DialogTitle>
          <DialogDescription>{t('calendar.eventDialogDesc')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="event-form" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))} className="space-y-4">
            {!projectId && (
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('calendar.project')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t('calendar.selectProject')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('calendar.eventTitle')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('calendar.eventTitlePlaceholder')} autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('calendar.eventType')}</FormLabel>
                    <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[0, 1, 2, 3].map((k) => (
                          <SelectItem key={k} value={String(k)}>
                            {t(`calendar.eventTypeValues.${k}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isAllDay"
                render={({ field }) => (
                  <FormItem className="flex flex-col justify-end">
                    <div className="flex items-center justify-between rounded-md border px-3 py-2">
                      <FormLabel className="text-sm font-normal">{t('calendar.allDay')}</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <FormLabel className="text-xs">{t('calendar.starts')}</FormLabel>
                <div className="flex gap-1.5">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    )}
                  />
                  {!isAllDay && (
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormControl>
                          <Input type="time" className="w-24" {...field} />
                        </FormControl>
                      )}
                    />
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <FormLabel className="text-xs">{t('calendar.ends')}</FormLabel>
                <div className="flex gap-1.5">
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    )}
                  />
                  {!isAllDay && (
                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormControl>
                          <Input type="time" className="w-24" {...field} />
                        </FormControl>
                      )}
                    />
                  )}
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {t('calendar.location')}
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={t('calendar.locationPlaceholder')} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="meetingUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Video className="size-3.5" />
                    {t('calendar.meetingUrl')}
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            {selectedProjectId && (
              <FormField
                control={form.control}
                name="workPackageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('calendar.relatedTask')}</FormLabel>
                    <Select value={field.value || 'none'} onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">{t('calendar.noRelatedTask')}</SelectItem>
                        {projectTasks?.map((wp) => (
                          <SelectItem key={wp.id} value={wp.id}>
                            {wp.subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            )}

            {selectedProjectId && (
              <FormField
                control={form.control}
                name="attendeeIds"
                render={({ field }) => {
                  const selected = members?.filter((m) => field.value.includes(m.userId)) ?? [];
                  return (
                    <FormItem>
                      <FormLabel>{t('calendar.attendees')}</FormLabel>
                      <Popover open={attendeesOpen} onOpenChange={setAttendeesOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button type="button" variant="outline" role="combobox" className="w-full justify-start font-normal">
                              {selected.length === 0 ? (
                                <span className="text-muted-foreground">{t('calendar.noAttendees')}</span>
                              ) : (
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                  <div className="flex -space-x-1.5 shrink-0">
                                    {selected.slice(0, 4).map((m) => (
                                      <Avatar key={m.userId} className="border-background size-5 border-2">
                                        <AvatarFallback style={{ backgroundColor: m.avatarColor }}>{initials(m.fullName)}</AvatarFallback>
                                      </Avatar>
                                    ))}
                                  </div>
                                  <span className="truncate text-xs">{selected.map((m) => m.fullName).join(', ')}</span>
                                </div>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-0" align="start">
                          <Command>
                            <CommandInput placeholder={t('workPackage.searchMembers')} />
                            <CommandList>
                              <CommandEmpty>{t('members.noUsersFound')}</CommandEmpty>
                              <CommandGroup>
                                {members?.map((m) => {
                                  const checked = field.value.includes(m.userId);
                                  return (
                                    <CommandItem
                                      key={m.userId}
                                      value={m.fullName}
                                      onSelect={() =>
                                        field.onChange(checked ? field.value.filter((id) => id !== m.userId) : [...field.value, m.userId])
                                      }
                                    >
                                      <Avatar className="size-6">
                                        <AvatarFallback style={{ backgroundColor: m.avatarColor }}>{initials(m.fullName)}</AvatarFallback>
                                      </Avatar>
                                      <span className="flex-1 truncate">{m.fullName}</span>
                                      {checked && <Check className="size-4" />}
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  );
                }}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('workPackage.descriptionLabel')}</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder={t('workPackage.descriptionPlaceholder')} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          {isEditing ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (confirm(t('calendar.confirmDeleteEvent'))) deleteMutation.mutate();
              }}
            >
              {t('common.delete')}
            </Button>
          ) : (
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
          )}
          <Button type="submit" form="event-form" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
