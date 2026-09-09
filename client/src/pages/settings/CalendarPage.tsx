import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { usersApi } from '@/api/users';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const DURATIONS = [15, 30, 45, 60, 90, 120];

export function CalendarPage() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();

  const [defaultCalendarView, setDefaultCalendarView] = React.useState<'month' | 'week' | 'day'>(
    user?.defaultCalendarView ?? 'month'
  );
  const [defaultEventDurationMinutes, setDefaultEventDurationMinutes] = React.useState(user?.defaultEventDurationMinutes ?? 60);

  const saveMutation = useMutation({
    mutationFn: () =>
      usersApi.updatePreferences({
        preferredLanguage: user!.preferredLanguage,
        theme: user!.theme,
        timezone: user!.timezone,
        dateFormat: user!.dateFormat,
        timeFormat: user!.timeFormat,
        firstDayOfWeek: user!.firstDayOfWeek,
        defaultView: user!.defaultView,
        showCompletedTasks: user!.showCompletedTasks,
        confirmBeforeDelete: user!.confirmBeforeDelete,
        autoFollowCreatedTasks: user!.autoFollowCreatedTasks,
        autoFollowAssignedTasks: user!.autoFollowAssignedTasks,
        defaultCalendarView,
        defaultEventDurationMinutes,
      }),
    onSuccess: (updated) => {
      updateUser(updated);
      queryClient.invalidateQueries();
      toast.success(t('settings.savedToast'));
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? t('settings.saveFailed')),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('settings.navCalendar')}</h2>
        <p className="text-muted-foreground text-sm">{t('calendarSettings.desc')}</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-1.5">
            <Label>{t('calendarSettings.defaultView')}</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={defaultCalendarView}
              onValueChange={(v) => v && setDefaultCalendarView(v as typeof defaultCalendarView)}
            >
              <ToggleGroupItem value="month">{t('calendar.month')}</ToggleGroupItem>
              <ToggleGroupItem value="week">{t('calendar.week')}</ToggleGroupItem>
              <ToggleGroupItem value="day">{t('calendar.day')}</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-1.5">
            <Label>{t('calendarSettings.defaultDuration')}</Label>
            <Select value={String(defaultEventDurationMinutes)} onValueChange={(v) => setDefaultEventDurationMinutes(Number(v))}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {t('calendarSettings.minutes', { count: m })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? t('common.saving') : t('settings.saveChanges')}
        </Button>
      </div>
    </div>
  );
}
