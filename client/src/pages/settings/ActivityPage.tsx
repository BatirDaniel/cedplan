import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, FolderKanban, ListPlus, MessageSquare } from 'lucide-react';

import { usersApi } from '@/api/users';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ActivityPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({ queryKey: ['my-activity'], queryFn: usersApi.getActivity });

  const items = [
    { label: t('privacy.activityProjectsJoined'), value: data?.projectsJoined, icon: FolderKanban },
    { label: t('privacy.activityTasksCreated'), value: data?.tasksCreated, icon: ListPlus },
    { label: t('privacy.activityTasksCompleted'), value: data?.tasksCompleted, icon: CheckCircle2 },
    { label: t('privacy.activityComments'), value: data?.commentsPosted, icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('settings.navActivity')}</h2>
        <p className="text-muted-foreground text-sm">{t('privacy.activityDesc')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-6">
              <item.icon className="text-primary mb-2 size-4" />
              {isLoading ? <Skeleton className="h-7 w-12" /> : <p className="text-2xl font-bold">{item.value ?? 0}</p>}
              <p className="text-muted-foreground text-xs">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
