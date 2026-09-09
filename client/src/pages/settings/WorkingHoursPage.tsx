import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { usersApi } from '@/api/users';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

const DAYS = [0, 1, 2, 3, 4, 5, 6];

export function WorkingHoursPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['working-hours'], queryFn: usersApi.getWorkingHours });

  const [days, setDays] = React.useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = React.useState('09:00');
  const [endTime, setEndTime] = React.useState('17:00');
  const [breakEnabled, setBreakEnabled] = React.useState(false);
  const [breakStart, setBreakStart] = React.useState('12:00');
  const [breakEnd, setBreakEnd] = React.useState('13:00');

  React.useEffect(() => {
    if (!data) return;
    setDays(
      data.workingDays
        .split(',')
        .filter(Boolean)
        .map((d) => Number(d))
    );
    setStartTime(data.workStartTime);
    setEndTime(data.workEndTime);
    setBreakEnabled(!!data.workBreakStart);
    if (data.workBreakStart) setBreakStart(data.workBreakStart);
    if (data.workBreakEnd) setBreakEnd(data.workBreakEnd);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      usersApi.updateWorkingHours({
        workingDays: days.join(','),
        workStartTime: startTime,
        workEndTime: endTime,
        workBreakStart: breakEnabled ? breakStart : null,
        workBreakEnd: breakEnabled ? breakEnd : null,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['working-hours'], updated);
      toast.success(t('settings.savedToast'));
    },
    onError: () => toast.error(t('settings.saveFailed')),
  });

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('workingHours.title')}</h2>
        <p className="text-muted-foreground text-sm">{t('workingHours.desc')}</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-1.5">
            <Label>{t('workingHours.workingDays')}</Label>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={cn(
                    'size-10 rounded-md border text-xs font-medium transition-colors',
                    days.includes(d) ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
                  )}
                >
                  {t(`workingHours.days${d}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t('workingHours.startTime')}</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('workingHours.endTime')}</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={breakEnabled} onChange={(e) => setBreakEnabled(e.target.checked)} className="accent-primary" />
              {t('workingHours.breakOptional')}
            </label>
            {breakEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t('workingHours.breakStart')}</Label>
                  <Input type="time" value={breakStart} onChange={(e) => setBreakStart(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('workingHours.breakEnd')}</Label>
                  <Input type="time" value={breakEnd} onChange={(e) => setBreakEnd(e.target.value)} />
                </div>
              </div>
            )}
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
