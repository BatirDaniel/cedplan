import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCheck } from 'lucide-react';

import { notificationsApi, type AppNotification } from '@/api/notifications';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { initials } from '@/lib/ui';

export function NotificationsFeedPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications-feed'],
    queryFn: () => notificationsApi.list(200).then((r) => r.data),
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleClick = async (n: AppNotification) => {
    if (!n.isRead) {
      queryClient.setQueryData<AppNotification[]>(['notifications-feed'], (prev) =>
        (prev ?? []).map((x) => (x.id === n.id ? { ...x, isRead: true } : x))
      );
      queryClient.setQueryData<AppNotification[]>(['notifications'], (prev) =>
        (prev ?? []).map((x) => (x.id === n.id ? { ...x, isRead: true } : x))
      );
      notificationsApi.markRead(n.id).catch(() => {});
    }
    if (n.projectId) navigate(`/projects/${n.projectId}`);
  };

  const handleMarkAllRead = () => {
    queryClient.setQueryData<AppNotification[]>(['notifications-feed'], (prev) =>
      (prev ?? []).map((x) => ({ ...x, isRead: true }))
    );
    queryClient.setQueryData<AppNotification[]>(['notifications'], (prev) =>
      (prev ?? []).map((x) => ({ ...x, isRead: true }))
    );
    notificationsApi.markAllRead().catch(() => {});
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-medium">{t('notificationsBell.title')}</h1>
        <div className="ml-auto flex items-center gap-1">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={handleMarkAllRead}>
              <CheckCheck className="size-3.5" />
              {t('notificationsBell.markAllRead')}
            </Button>
          )}
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-2xl">
          {isLoading && <p className="text-muted-foreground text-sm">{t('common.loading')}</p>}

          {!isLoading && notifications.length === 0 && (
            <div className="text-muted-foreground mt-20 text-center text-sm">
              <Bell className="mx-auto mb-2 size-8" />
              {t('notificationsBell.empty')}
            </div>
          )}

          <div className="flex flex-col gap-1">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  'flex items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors hover:bg-accent',
                  !n.isRead && 'bg-accent/40'
                )}
              >
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback style={{ backgroundColor: n.actorColor ?? undefined }}>
                    {n.actorName ? initials(n.actorName) : <Bell className="size-3.5" />}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    {!n.isRead && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                    {n.title}
                  </p>
                  {n.body && <p className="text-muted-foreground text-sm">{n.body}</p>}
                  {n.projectName && (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {n.projectName}
                      {n.workPackageSubject ? ` · ${n.workPackageSubject}` : ''}
                    </p>
                  )}
                  <p className="text-muted-foreground mt-1 text-xs">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
