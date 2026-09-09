import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  Calendar as CalendarIcon,
  Clock,
  Download,
  KeyRound,
  Link2,
  Monitor,
  Settings2,
  ShieldAlert,
  User,
  UserCog,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationBell } from '@/components/notification-bell';

export function SettingsLayout() {
  const { t } = useTranslation();

  const groups = [
    {
      label: t('settings.groupPersonal'),
      items: [
        { to: 'profile', label: t('settings.navProfile'), icon: User },
        { to: 'preferences', label: t('settings.navPreferences'), icon: Settings2 },
        { to: 'notifications', label: t('settings.navNotifications'), icon: Bell },
      ],
    },
    {
      label: t('settings.groupWork'),
      items: [
        { to: 'working-hours', label: t('settings.navWorkingHours'), icon: Clock },
        { to: 'availability', label: t('settings.navAvailability'), icon: UserCog },
        { to: 'calendar', label: t('settings.navCalendar'), icon: CalendarIcon },
      ],
    },
    {
      label: t('settings.groupSecurity'),
      items: [
        { to: 'security/password', label: t('settings.navPassword'), icon: KeyRound },
        { to: 'security/sessions', label: t('settings.navSessions'), icon: Monitor },
      ],
    },
    {
      label: t('settings.groupIntegrations'),
      items: [{ to: 'integrations/connected-apps', label: t('settings.navConnectedApps'), icon: Link2 }],
    },
    {
      label: t('settings.groupPrivacy'),
      items: [
        { to: 'privacy/activity', label: t('settings.navActivity'), icon: ShieldAlert },
        { to: 'privacy/export', label: t('settings.navExportData'), icon: Download },
      ],
    },
    {
      label: t('settings.groupAccount'),
      items: [{ to: 'account', label: t('settings.navAccountManagement'), icon: UserCog }],
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-sm font-medium">{t('settings.title')}</h1>
        <div className="ml-auto flex items-center gap-1">
          <NotificationBell />
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden min-w-0">
        {/* Desktop: vertical grouped nav. Mobile: horizontal scrolling pill strip. */}
        <nav className="shrink-0 min-w-0 w-full md:w-64 border-b md:border-b-0 md:border-r overflow-x-auto md:overflow-y-auto md:py-4">
          <div className="flex md:flex-col gap-1 px-3 py-2 md:py-0 w-max md:w-auto">
            {groups.map((group) => (
              <div key={group.label} className="md:mb-4 flex md:block gap-1 shrink-0">
                <span className="hidden md:block text-muted-foreground px-2 pb-1 text-xs font-semibold uppercase tracking-wide">
                  {group.label}
                </span>
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors shrink-0 md:w-full',
                        isActive
                          ? 'bg-accent text-accent-foreground font-medium'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                      )
                    }
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </div>
        </nav>

        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
