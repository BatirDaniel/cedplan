import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { usersApi } from '@/api/users';
import { useAuthStore } from '@/store/auth';
import { useThemeStore, type Theme } from '@/store/theme';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const TIMEZONES = [
  'UTC', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Bucharest', 'Europe/Moscow',
  'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Tokyo',
];

const DATE_FORMATS = ['MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd', 'dd MMM yyyy'];

const WEEKDAY_KEYS = [0, 1, 2, 3, 4, 5, 6] as const;

export function PreferencesPage() {
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const queryClient = useQueryClient();

  const [language, setLanguage] = React.useState<SupportedLanguage>((user?.preferredLanguage as SupportedLanguage) ?? 'en');
  const [timezone, setTimezone] = React.useState(user?.timezone ?? 'UTC');
  const [dateFormat, setDateFormat] = React.useState(user?.dateFormat ?? 'MM/dd/yyyy');
  const [timeFormat, setTimeFormat] = React.useState<string>(user?.timeFormat ?? '24h');
  const [firstDayOfWeek, setFirstDayOfWeek] = React.useState(user?.firstDayOfWeek ?? 1);
  const [defaultView, setDefaultView] = React.useState<string>(user?.defaultView ?? 'list');
  const [showCompletedTasks, setShowCompletedTasks] = React.useState(user?.showCompletedTasks ?? true);
  const [confirmBeforeDelete, setConfirmBeforeDelete] = React.useState(user?.confirmBeforeDelete ?? true);
  const [autoFollowCreated, setAutoFollowCreated] = React.useState(user?.autoFollowCreatedTasks ?? true);
  const [autoFollowAssigned, setAutoFollowAssigned] = React.useState(user?.autoFollowAssignedTasks ?? true);

  const saveMutation = useMutation({
    mutationFn: () =>
      usersApi.updatePreferences({
        preferredLanguage: language,
        theme,
        timezone,
        dateFormat,
        timeFormat,
        firstDayOfWeek,
        defaultView,
        showCompletedTasks,
        confirmBeforeDelete,
        autoFollowCreatedTasks: autoFollowCreated,
        autoFollowAssignedTasks: autoFollowAssigned,
        defaultCalendarView: user?.defaultCalendarView ?? 'month',
        defaultEventDurationMinutes: user?.defaultEventDurationMinutes ?? 60,
      }),
    onSuccess: (updated) => {
      updateUser(updated);
      queryClient.invalidateQueries();
      toast.success(t('settings.savedToast'));
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? t('settings.saveFailed')),
  });

  function onLanguageChange(v: SupportedLanguage) {
    setLanguage(v);
    i18n.changeLanguage(v);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('preferences.title')}</h2>
        <p className="text-muted-foreground text-sm">{t('preferences.desc')}</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-sm font-semibold">{t('preferences.generalTitle')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t('preferences.language')}</Label>
              <Select value={language} onValueChange={(v) => onLanguageChange(v as SupportedLanguage)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((lng) => (
                    <SelectItem key={lng} value={lng}>
                      {t(`languages.${lng}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('preferences.timezone')}</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t('preferences.dateFormat')}</Label>
              <Select value={dateFormat} onValueChange={setDateFormat}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('preferences.timeFormat')}</Label>
              <Select value={timeFormat} onValueChange={setTimeFormat}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">{t('preferences.time12h')}</SelectItem>
                  <SelectItem value="24h">{t('preferences.time24h')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t('preferences.firstDayOfWeek')}</Label>
            <Select value={String(firstDayOfWeek)} onValueChange={(v) => setFirstDayOfWeek(Number(v))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAY_KEYS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {t(`workingHours.days${d}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-sm font-semibold">{t('preferences.interfaceTitle')}</h3>
          <div className="space-y-1.5">
            <Label>{t('preferences.appearance')}</Label>
            <ToggleGroup type="single" variant="outline" value={theme} onValueChange={(v) => v && setTheme(v as Theme)}>
              <ToggleGroupItem value="light">{t('preferences.light')}</ToggleGroupItem>
              <ToggleGroupItem value="dark">{t('preferences.dark')}</ToggleGroupItem>
              <ToggleGroupItem value="system">{t('preferences.systemDefault')}</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-sm font-semibold">{t('preferences.defaultViewTitle')}</h3>
          <div className="space-y-1.5">
            <Label>{t('preferences.defaultView')}</Label>
            <ToggleGroup type="single" variant="outline" value={defaultView} onValueChange={(v) => v && setDefaultView(v)}>
              <ToggleGroupItem value="list">{t('preferences.defaultViewList')}</ToggleGroupItem>
              <ToggleGroupItem value="board">{t('preferences.defaultViewBoard')}</ToggleGroupItem>
              <ToggleGroupItem value="gantt">{t('preferences.defaultViewGantt')}</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-1">
          <h3 className="text-sm font-semibold mb-3">{t('preferences.behaviorTitle')}</h3>
          <ToggleRow
            label={t('preferences.showCompletedTasks')}
            hint={t('preferences.showCompletedTasksHint')}
            checked={showCompletedTasks}
            onChange={setShowCompletedTasks}
          />
          <Separator />
          <ToggleRow
            label={t('preferences.confirmBeforeDeleting')}
            hint={t('preferences.confirmBeforeDeletingHint')}
            checked={confirmBeforeDelete}
            onChange={setConfirmBeforeDelete}
          />
          <Separator />
          <ToggleRow label={t('preferences.autoFollowCreated')} checked={autoFollowCreated} onChange={setAutoFollowCreated} />
          <Separator />
          <ToggleRow label={t('preferences.autoFollowAssigned')} checked={autoFollowAssigned} onChange={setAutoFollowAssigned} />
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

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
