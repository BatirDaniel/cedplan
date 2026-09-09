import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FolderKanban, Info, ListChecks, ShieldCheck, Trash2, UserCog, Users } from 'lucide-react';

import { usersApi } from '@/api/users';
import { permissionsApi } from '@/api/permissions';
import { useAuthStore } from '@/store/auth';
import { formatDate, initials } from '@/lib/ui';
import type { SystemRole } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationBell } from '@/components/notification-bell';

const ROLES: SystemRole[] = [0, 1, 2];

export function AdministrationPage() {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const isAdmin = currentUser?.role === 2;
  const isManagerOrAdmin = currentUser ? currentUser.role === 1 || currentUser.role === 2 : false;

  const { data: users } = useQuery({ queryKey: ['admin-users'], queryFn: usersApi.adminListUsers, enabled: isManagerOrAdmin });
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: usersApi.adminStats, enabled: isManagerOrAdmin });
  const { data: permissions } = useQuery({ queryKey: ['permissions'], queryFn: permissionsApi.list, enabled: isManagerOrAdmin });
  const { data: matrix } = useQuery({ queryKey: ['permissions-matrix'], queryFn: permissionsApi.matrix, enabled: isManagerOrAdmin });

  const toggleMutation = useMutation({
    mutationFn: (entry: { role: SystemRole; permissionKey: string; granted: boolean }) =>
      permissionsApi.updateMatrix([entry]),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['permissions-matrix'] }),
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Error'),
  });

  const setRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: SystemRole }) => usersApi.adminSetRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.adminDeleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Error'),
  });

  if (currentUser && !isManagerOrAdmin) {
    return (
      <div className="flex flex-col h-full">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <h1 className="text-sm font-medium">{t('admin.title')}</h1>
        </header>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          {t('admin.accessDenied')}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: t('admin.totalUsers'), value: stats?.userCount, icon: Users },
    { label: t('admin.totalProjects'), value: stats?.projectCount, icon: FolderKanban },
    { label: t('admin.totalTasks'), value: stats?.workPackageCount, icon: ListChecks },
    { label: t('admin.admins'), value: stats?.adminCount, icon: ShieldCheck },
    { label: t('admin.managers'), value: stats?.managerCount, icon: UserCog },
  ];

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-medium">{t('admin.title')}</h1>
        <div className="ml-auto flex items-center gap-1">
          <NotificationBell />
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="space-y-6">
          <p className="text-muted-foreground text-sm">{t('admin.subtitle')}</p>

          {!isAdmin && (
            <div className="bg-muted flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
              <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <p className="text-muted-foreground">{t('admin.readOnlyNotice')}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {statCards.map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-4">
                  <s.icon className="text-primary size-4 mb-2" />
                  <p className="text-2xl font-bold">{s.value ?? '—'}</p>
                  <p className="text-muted-foreground text-xs">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="py-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.user')}</TableHead>
                  <TableHead>{t('admin.joined')}</TableHead>
                  <TableHead>{t('admin.projectsCount')}</TableHead>
                  <TableHead>{t('admin.role')}</TableHead>
                  <TableHead className="text-right">{t('admin.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar>
                          <AvatarFallback style={{ backgroundColor: u.avatarColor }}>{initials(u.fullName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium flex items-center gap-1.5">
                            {u.fullName}
                            {u.role === 2 && (
                              <Badge variant="secondary" className="text-[10px]">
                                {t('admin.adminBadge')}
                              </Badge>
                            )}
                            {u.role === 1 && (
                              <Badge variant="outline" className="text-[10px]">
                                {t('admin.managerBadge')}
                              </Badge>
                            )}
                          </p>
                          <p className="text-muted-foreground text-xs">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{formatDate(u.createdAt)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{u.projectCount}</TableCell>
                    <TableCell>
                      <Select
                        value={String(u.role)}
                        disabled={!isAdmin || u.id === currentUser?.id}
                        onValueChange={(v) => setRoleMutation.mutate({ id: u.id, role: Number(v) as SystemRole })}
                      >
                        <SelectTrigger size="sm" className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={String(r)}>
                              {t(`admin.role${r}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={!isAdmin || u.id === currentUser?.id}
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm(t('admin.confirmDeleteUser', { name: u.fullName }))) deleteMutation.mutate(u.id);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="space-y-2">
            <div>
              <h2 className="text-sm font-medium">{t('admin.permissionsTitle')}</h2>
              <p className="text-muted-foreground text-xs">{t('admin.permissionsDesc')}</p>
            </div>
            <Card className="py-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.permission')}</TableHead>
                    {ROLES.map((r) => (
                      <TableHead key={r} className="text-center">
                        {t(`admin.role${r}`)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions?.map((p) => (
                    <TableRow key={p.key}>
                      <TableCell>
                        <p className="font-medium">{p.description}</p>
                        <p className="text-muted-foreground text-xs">{p.category}</p>
                      </TableCell>
                      {ROLES.map((r) => {
                        const granted = matrix?.some((e) => e.role === r && e.permissionKey === p.key && e.granted) ?? false;
                        return (
                          <TableCell key={r} className="text-center">
                            <Checkbox
                              checked={granted}
                              disabled={!isAdmin}
                              onCheckedChange={(checked) =>
                                toggleMutation.mutate({ role: r, permissionKey: p.key, granted: checked === true })
                              }
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
