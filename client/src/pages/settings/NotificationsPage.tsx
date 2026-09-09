import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { usersApi } from '@/api/users';
import { NotificationTypesList } from '@/lib/notifications';
import type { NotificationPreferences } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export function NotificationsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['notification-preferences'], queryFn: usersApi.getNotificationPreferences });
  const [prefs, setPrefs] = React.useState<NotificationPreferences | null>(null);

  React.useEffect(() => {
    if (data) setPrefs(data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (value: NotificationPreferences) => usersApi.updateNotificationPreferences(value),
    onSuccess: (updated) => {
      queryClient.setQueryData(['notification-preferences'], updated);
      toast.success(t('settings.savedToast'));
    },
    onError: () => toast.error(t('settings.saveFailed')),
  });

  function toggleChannel(type: string, channel: 'inApp' | 'email' | 'push') {
    setPrefs((prev) => {
      if (!prev) return prev;
      const current = prev.types[type] ?? { inApp: false, email: false, push: false };
      return { ...prev, types: { ...prev.types, [type]: { ...current, [channel]: !current[channel] } } };
    });
  }

  if (isLoading || !prefs) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('notifications.title')}</h2>
        <p className="text-muted-foreground text-sm">{t('notifications.desc')}</p>
      </div>

      <Card className="py-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('notifications.type')}</TableHead>
                <TableHead className="text-center">{t('notifications.inApp')}</TableHead>
                <TableHead className="text-center">{t('notifications.email')}</TableHead>
                <TableHead className="text-center">{t('notifications.push')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {NotificationTypesList.map((type) => {
                const channels = prefs.types[type] ?? { inApp: false, email: false, push: false };
                return (
                  <TableRow key={type}>
                    <TableCell className="font-medium">{t(`notifications.${type}`)}</TableCell>
                    <TableCell className="text-center">
                      <Checkbox checked={channels.inApp} onCheckedChange={() => toggleChannel(type, 'inApp')} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox checked={channels.email} onCheckedChange={() => toggleChannel(type, 'email')} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox checked={channels.push} onCheckedChange={() => toggleChannel(type, 'push')} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-sm font-semibold">{t('notifications.digestTitle')}</h3>
          <div className="space-y-1.5">
            <Label>{t('notifications.digest')}</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={prefs.digest}
              onValueChange={(v) => v && setPrefs((prev) => (prev ? { ...prev, digest: v as NotificationPreferences['digest'] } : prev))}
            >
              <ToggleGroupItem value="none">{t('notifications.digestNone')}</ToggleGroupItem>
              <ToggleGroupItem value="daily">{t('notifications.digestDaily')}</ToggleGroupItem>
              <ToggleGroupItem value="weekly">{t('notifications.digestWeekly')}</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-sm font-semibold">{t('notifications.quietHoursTitle')}</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('notifications.quietHoursEnable')}</p>
              <p className="text-muted-foreground text-xs">{t('notifications.quietHoursHint')}</p>
            </div>
            <Switch
              checked={prefs.quietHoursEnabled}
              onCheckedChange={(v) => setPrefs((prev) => (prev ? { ...prev, quietHoursEnabled: v } : prev))}
            />
          </div>
          {prefs.quietHoursEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t('notifications.quietHoursFrom')}</Label>
                <Input
                  type="time"
                  value={prefs.quietHoursStart ?? '22:00'}
                  onChange={(e) => setPrefs((prev) => (prev ? { ...prev, quietHoursStart: e.target.value } : prev))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('notifications.quietHoursTo')}</Label>
                <Input
                  type="time"
                  value={prefs.quietHoursEnd ?? '08:00'}
                  onChange={(e) => setPrefs((prev) => (prev ? { ...prev, quietHoursEnd: e.target.value } : prev))}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => prefs && saveMutation.mutate(prefs)} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? t('common.saving') : t('settings.saveChanges')}
        </Button>
      </div>
    </div>
  );
}
