import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';

import { useAuthStore } from '@/store/auth';
import { notificationsApi, type AppNotification } from '@/api/notifications';
import { useNotificationsHub } from '@/lib/useNotificationsHub';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then((r) => r.data),
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useNotificationsHub(!!user, (notification: AppNotification) => {
    queryClient.setQueryData<AppNotification[]>(['notifications'], (prev) => [notification, ...(prev ?? [])].slice(0, 30));
  });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
  };

  const handleClick = async (n: AppNotification) => {
    if (!n.isRead) {
      queryClient.setQueryData<AppNotification[]>(['notifications'], (prev) =>
        (prev ?? []).map((x) => (x.id === n.id ? { ...x, isRead: true } : x))
      );
      notificationsApi.markRead(n.id).catch(() => {});
    }
    setOpen(false);
    if (n.projectId) {
      navigate(`/projects/${n.projectId}`);
    }
  };

  const handleMarkAllRead = () => {
    queryClient.setQueryData<AppNotification[]>(['notifications'], (prev) =>
      (prev ?? []).map((x) => ({ ...x, isRead: true }))
    );
    notificationsApi.markAllRead().catch(() => {});
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-8" title={t('notificationsBell.title')}>
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full px-1 text-[10px] leading-none"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">{t('notificationsBell.title')}</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleMarkAllRead}>
              {t('notificationsBell.markAllRead')}
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">{t('notificationsBell.empty')}</p>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    'flex flex-col gap-0.5 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-accent',
                    !n.isRead && 'bg-accent/50'
                  )}
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    {!n.isRead && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                    {n.title}
                  </span>
                  {n.body && <span className="text-xs text-muted-foreground line-clamp-2">{n.body}</span>}
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="border-t p-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              setOpen(false);
              navigate('/notifications');
            }}
          >
            {t('notificationsBell.viewAll')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
