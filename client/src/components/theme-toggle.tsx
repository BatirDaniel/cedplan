import { useTranslation } from 'react-i18next';
import { Moon, Sun, SunMoon } from 'lucide-react';

import { useThemeStore, type Theme } from '@/store/theme';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, setTheme } = useThemeStore();

  const options: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: t('preferences.light'), icon: Sun },
    { value: 'dark', label: t('preferences.dark'), icon: Moon },
    { value: 'system', label: t('preferences.systemDefault'), icon: SunMoon },
  ];
  const current = options.find((o) => o.value === theme) ?? options[2];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" title={t('preferences.appearance')}>
          <current.icon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((o) => (
          <DropdownMenuItem key={o.value} onSelect={() => setTheme(o.value)}>
            <o.icon className="size-4" />
            {o.label}
            {theme === o.value && <span className="ml-auto text-xs">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
