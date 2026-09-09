import * as React from 'react';
import { Outlet } from 'react-router-dom';

import { AppSidebar } from '@/components/app-sidebar';
import { CommandPalette } from '@/components/command-palette';
import { CreateProjectDialog } from '@/components/create-project-dialog';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export function AppLayout() {
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [createProjectOpen, setCreateProjectOpen] = React.useState(false);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar onOpenCommand={() => setCommandOpen(true)} onCreateProject={() => setCreateProjectOpen(true)} />
      <SidebarInset>
        <Outlet />
      </SidebarInset>

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onCreateProject={() => setCreateProjectOpen(true)}
      />
      <CreateProjectDialog open={createProjectOpen} onOpenChange={setCreateProjectOpen} />
    </SidebarProvider>
  );
}
