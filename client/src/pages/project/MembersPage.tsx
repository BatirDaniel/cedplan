import { useMemo, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown, Copy, MoreHorizontal, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { projectsApi } from '@/api/projects';
import { usersApi } from '@/api/users';
import { useProjectPermissions } from '@/lib/useProjectPermissions';
import type { ProjectRole } from '@/types';
import { cn } from '@/lib/utils';
import { initials } from '@/lib/ui';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ROLES: ProjectRole[] = [0, 1, 2, 3];
const ALL_DEPARTMENTS = '__all__';

export function MembersPage() {
  const { t } = useTranslation();
  const { projectId } = useParams();
  const queryClient = useQueryClient();
  const { canInviteMembers, canManageMembers } = useProjectPermissions(projectId);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ProjectRole>(1);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState<string>(ALL_DEPARTMENTS);

  const { data: members } = useQuery({
    queryKey: ['members', projectId],
    queryFn: () => projectsApi.members(projectId!),
    enabled: !!projectId,
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: usersApi.listDepartments,
  });

  const { data: userResults } = useQuery({
    queryKey: ['user-search', search, department],
    queryFn: () => usersApi.search(search, department === ALL_DEPARTMENTS ? undefined : department),
    enabled: pickerOpen,
  });

  const memberEmails = useMemo(() => new Set(members?.map((m) => m.email) ?? []), [members]);
  const availableResults = userResults?.filter((u) => !memberEmails.has(u.email)) ?? [];

  const addMutation = useMutation({
    mutationFn: () => projectsApi.addMember(projectId!, email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEmail('');
      toast.success(t('members.addedToast'));
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? t('members.addFailed')),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: ProjectRole }) =>
      projectsApi.updateMemberRole(projectId!, memberId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members', projectId] }),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => projectsApi.removeMember(projectId!, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    addMutation.mutate();
  }

  return (
    <div className="p-6 space-y-4">
      {canInviteMembers && (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <UserPlus className="text-primary size-4" />
            {t('members.addMember')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-wrap gap-2">
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={pickerOpen}
                  className="min-w-56 flex-1 justify-between font-normal"
                >
                  <span className={cn('truncate', !email && 'text-muted-foreground')}>
                    {email || t('members.searchPlaceholder')}
                  </span>
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder={t('members.searchPlaceholder')}
                    value={search}
                    onValueChange={setSearch}
                  />
                  {departments && departments.length > 0 && (
                    <div className="border-b p-2">
                      <Select value={department} onValueChange={setDepartment}>
                        <SelectTrigger size="sm" className="w-full">
                          <SelectValue placeholder={t('members.allDepartments')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL_DEPARTMENTS}>{t('members.allDepartments')}</SelectItem>
                          {departments.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <CommandList>
                    <CommandEmpty>{t('members.noUsersFound')}</CommandEmpty>
                    <CommandGroup>
                      {availableResults.map((u) => (
                        <CommandItem
                          key={u.id}
                          value={u.id}
                          onSelect={() => {
                            setEmail(u.email);
                            setPickerOpen(false);
                          }}
                        >
                          <Avatar className="size-6">
                            <AvatarFallback className="text-[10px]" style={{ backgroundColor: u.avatarColor }}>
                              {initials(u.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm">{u.fullName}</p>
                            <p className="text-muted-foreground truncate text-xs">
                              {u.email}
                              {u.department ? ` · ${u.department}` : ''}
                            </p>
                          </div>
                          {email === u.email && <Check className="size-4" />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Select value={String(role)} onValueChange={(v) => setRole(Number(v) as ProjectRole)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* A plain Member can invite people, but only Admin/Responsible can hand out those roles. */}
                {(canManageMembers ? ROLES : ROLES.filter((r) => r < 2)).map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    {t(`members.role${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={addMutation.isPending || !email}>
              {t('common.add')}
            </Button>
          </form>
        </CardContent>
      </Card>
      )}

      <Card className="py-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('members.member')}</TableHead>
              <TableHead>{t('members.role')}</TableHead>
              {canManageMembers && <TableHead className="text-right">{t('members.actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members?.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar>
                      <AvatarFallback style={{ backgroundColor: m.avatarColor }}>{initials(m.fullName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{m.fullName}</p>
                      <p className="text-muted-foreground text-xs">{m.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {canManageMembers ? (
                    <Select
                      value={String(m.role)}
                      onValueChange={(v) => updateRoleMutation.mutate({ memberId: m.id, role: Number(v) as ProjectRole })}
                    >
                      <SelectTrigger size="sm" className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={String(r)}>
                            {t(`members.role${r}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary">{t(`members.role${m.role}`)}</Badge>
                  )}
                </TableCell>
                {canManageMembers && (
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => {
                            navigator.clipboard.writeText(m.email).catch(() => {});
                            toast.success(t('members.emailCopied'));
                          }}
                        >
                          <Copy />
                          {t('members.copyEmail')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => removeMutation.mutate(m.id)}
                        >
                          <Trash2 />
                          {t('members.removeFromProject')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
