import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FolderKanban, LayoutDashboard, Plus } from 'lucide-react';

import { projectsApi } from '@/api/projects';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';

export function CommandPalette({
  open,
  onOpenChange,
  onCreateProject,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProject: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: projectsApi.list, enabled: open });

  function go(path: string) {
    onOpenChange(false);
    navigate(path);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title={t('command.title')} description={t('command.description')}>
      <CommandInput placeholder={t('command.placeholder')} />
      <CommandList>
        <CommandEmpty>{t('common.noResults')}</CommandEmpty>
        <CommandGroup heading={t('command.actions')}>
          <CommandItem onSelect={() => go('/')}>
            <LayoutDashboard />
            {t('command.allProjects')}
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onCreateProject();
            }}
          >
            <Plus />
            {t('command.newProject')}
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        {projects && projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t('command.projects')}>
              {projects.map((p) => (
                <CommandItem key={p.id} onSelect={() => go(`/projects/${p.id}`)}>
                  <FolderKanban />
                  {p.name}
                  <span className="text-muted-foreground ml-auto text-xs">{p.identifier}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
