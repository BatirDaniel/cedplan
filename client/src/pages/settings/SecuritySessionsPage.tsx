import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Laptop, Smartphone, Tablet } from 'lucide-react';

import { usersApi } from '@/api/users';
import { formatDate } from '@/lib/ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const DEVICE_ICON: Record<string, typeof Laptop> = { Mobile: Smartphone, Tablet: Tablet };

export function SecuritySessionsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: sessions, isLoading } = useQuery({ queryKey: ['sessions'], queryFn: usersApi.getSessions });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => usersApi.revokeSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success(t('security.sessionRevoked'));
    },
  });

  const revokeOthersMutation = useMutation({
    mutationFn: () => usersApi.revokeOtherSessions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success(t('security.otherSessionsRevoked'));
    },
  });

  const others = sessions?.filter((s) => !s.isCurrent) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('security.sessionsTitle')}</h2>
        <p className="text-muted-foreground text-sm">{t('security.sessionsDesc')}</p>
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {!isLoading && (
        <div className="space-y-3">
          {sessions?.map((s) => {
            const Icon = DEVICE_ICON[s.device ?? ''] ?? Laptop;
            return (
              <Card key={s.id}>
                <CardContent className="flex items-center gap-3 pt-6">
                  <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="text-muted-foreground size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {s.browser} · {s.operatingSystem}
                      {s.isCurrent && (
                        <Badge variant="secondary" className="text-[10px]">
                          {t('security.currentSession')}
                        </Badge>
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {s.ipAddress ?? '—'} · {t('security.lastActive', { date: formatDate(s.lastActiveAt) })}
                    </p>
                  </div>
                  {!s.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive shrink-0"
                      onClick={() => revokeMutation.mutate(s.id)}
                    >
                      {t('security.logOutSession')}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div>
        <Button
          variant="outline"
          disabled={others.length === 0 || revokeOthersMutation.isPending}
          onClick={() => revokeOthersMutation.mutate()}
        >
          {others.length === 0 ? t('security.noOtherSessions') : t('security.logOutOthers')}
        </Button>
      </div>
    </div>
  );
}
