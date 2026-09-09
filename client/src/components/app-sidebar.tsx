import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronsUpDown,
  Clock,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';

import { projectsApi } from '@/api/projects';
import { useAuthStore } from '@/store/auth';
import { initials } from '@/lib/ui';
import { Logo } from '@/components/Logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function AppSidebar({
  onOpenCommand,
  onCreateProject,
}: {
  onOpenCommand: () => void;
  onCreateProject: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { user, logout } = useAuthStore();

  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: projectsApi.list });
  const currentProject = projects?.find((p) => p.id === projectId);

  const projectNav = [
    { to: '', label: t('nav.tasks'), icon: ListTodo, end: true },
    { to: 'wiki', label: t('nav.wiki'), icon: BookOpen },
    { to: 'time', label: t('nav.time'), icon: Clock },
    { to: 'members', label: t('nav.team'), icon: Users },
  ];

  function onLogout() {
    logout();
    navigate('/login');
  }

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink to="/">
                <Logo size={22} showText={false} />
                <span className="font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
                  CED<span className="text-primary">Plan</span>
                </span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onOpenCommand} tooltip={`${t('nav.quickSearch')} (⌘K)`}>
              <Search />
              <span className="group-data-[collapsible=icon]:hidden">{t('nav.quickSearch')}</span>
              <kbd className="bg-sidebar-accent text-sidebar-foreground/70 ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium group-data-[collapsible=icon]:hidden">
                ⌘K
              </kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {projectId && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div
                  className="flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
                  style={{ backgroundColor: currentProject?.color ?? 'var(--primary)' }}
                >
                  {currentProject?.name?.[0]?.toUpperCase() ?? '·'}
                </div>
                <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-sm font-medium">{currentProject?.name ?? '···'}</span>
                  <span className="text-muted-foreground truncate text-xs">{currentProject?.identifier}</span>
                </div>
                <ChevronsUpDown className="ml-auto group-data-[collapsible=icon]:hidden" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="start">
              <DropdownMenuLabel>{t('nav.switchProject')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {projects?.map((p) => (
                <DropdownMenuItem key={p.id} onSelect={() => navigate(`/projects/${p.id}`)}>
                  <div
                    className="flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.name[0]?.toUpperCase()}
                  </div>
                  {p.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onCreateProject}>
                <Plus />
                {t('nav.newProject')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.general')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={t('nav.projects')}>
                  <NavLink to="/" end>
                    <LayoutDashboard />
                    <span>{t('nav.projects')}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={t('nav.calendar')}>
                  <NavLink to="/calendar">
                    <CalendarDays />
                    <span>{t('nav.calendar')}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {projectId && (
          <SidebarGroup>
            <SidebarGroupLabel>{currentProject?.name ?? '···'}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {projectNav.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton asChild tooltip={item.label}>
                      <NavLink to={`/projects/${projectId}/${item.to}`} end={item.end}>
                        <item.icon />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar className="size-6">
                    <AvatarFallback style={{ backgroundColor: user?.avatarColor }}>
                      {user ? initials(user.fullName) : ''}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-sm font-medium">{user?.fullName}</span>
                    <span className="text-muted-foreground truncate text-xs">{user?.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start" side="top">
                <DropdownMenuItem onSelect={() => navigate('/settings')}>
                  <Settings />
                  {t('nav.settings')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/notifications')}>
                  <Bell />
                  {t('nav.notifications')}
                </DropdownMenuItem>
                {(user?.role === 1 || user?.role === 2) && (
                  <DropdownMenuItem onSelect={() => navigate('/administration')}>
                    <ShieldCheck />
                    {t('nav.administration')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onLogout}>
                  <LogOut />
                  {t('nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
