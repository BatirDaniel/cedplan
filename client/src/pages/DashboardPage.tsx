import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FolderKanban, ListChecks, Plus, Users } from 'lucide-react';

import { projectsApi } from '@/api/projects';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { CreateProjectDialog } from '@/components/create-project-dialog';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationBell } from '@/components/notification-bell';

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = React.useState(false);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-medium">{t('dashboard.title')}</h1>
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <ThemeToggle />
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus />
            {t('dashboard.newProject')}
          </Button>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-auto p-6">
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <Skeleton className="h-4 w-32 mt-2" />
                  <Skeleton className="h-3 w-20" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-3 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && projects?.length === 0 && (
          <div className="text-center py-24 border border-dashed rounded-xl">
            <FolderKanban className="mx-auto text-muted-foreground mb-3" size={36} />
            <p className="text-muted-foreground text-sm mb-4">{t('dashboard.noProjects')}</p>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
              {t('dashboard.createFirst')}
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {projects?.map((p) => (
            <Card
              key={p.id}
              className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all"
              onClick={() => navigate(`/projects/${p.id}`)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg font-bold text-white"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-muted-foreground text-xs font-mono-key">{p.identifier}</p>
                  </div>
                  {p.isArchived && (
                    <Badge variant="outline" className="ml-auto text-muted-foreground">
                      {t('dashboard.archived')}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {p.description && (
                  <p className="text-muted-foreground text-xs mb-3 line-clamp-2">{p.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t">
                  <span className="flex items-center gap-1">
                    <ListChecks size={13} /> {t('dashboard.activeOf', { total: p.workPackageCount, count: p.openWorkPackageCount })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={13} /> {p.memberCount}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
