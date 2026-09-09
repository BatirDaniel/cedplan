import { useDraggable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import { Inbox } from 'lucide-react';

import { ticketKey } from '@/lib/ui';
import { cn } from '@/lib/utils';
import type { CalendarTask } from '@/types';
import { PriorityBadge } from '@/components/status-badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CalendarBacklogProps {
  tasks: CalendarTask[];
  showProjectBadge?: boolean;
  canEdit: boolean;
  onSelectTask: (t: CalendarTask) => void;
}

export function CalendarBacklog({ tasks, showProjectBadge, canEdit, onSelectTask }: CalendarBacklogProps) {
  const { t } = useTranslation();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-l">
      <div className="border-b px-3 py-2">
        <p className="text-sm font-medium">
          {t('calendar.backlog')} <span className="text-muted-foreground font-normal">· {tasks.length}</span>
        </p>
        <p className="text-muted-foreground text-xs">{t('calendar.backlogHint')}</p>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-1.5 p-2">
          {tasks.length === 0 && (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center text-xs">
              <Inbox className="size-6" />
              {t('calendar.backlogEmpty')}
            </div>
          )}
          {tasks.map((task) => (
            <BacklogCard key={task.id} task={task} showProjectBadge={showProjectBadge} draggable={canEdit} onClick={() => onSelectTask(task)} />
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}

function BacklogCard({
  task,
  showProjectBadge,
  draggable,
  onClick,
}: {
  task: CalendarTask;
  showProjectBadge?: boolean;
  draggable: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { task },
    disabled: !draggable,
  });

  return (
    <div
      ref={setNodeRef}
      {...(draggable ? attributes : {})}
      {...(draggable ? listeners : {})}
      onClick={onClick}
      style={{ opacity: isDragging ? 0.4 : 1, transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined }}
      className={cn(
        'bg-card cursor-pointer rounded-md border p-2 transition-all hover:border-primary/40 hover:shadow-sm',
        draggable && 'cursor-grab active:cursor-grabbing'
      )}
    >
      <p className="font-mono-key text-muted-foreground text-[10px]">{ticketKey(task.projectIdentifier, task.sequence)}</p>
      <p className="mb-1.5 line-clamp-2 text-sm leading-snug font-medium">{task.subject}</p>
      <div className="flex items-center justify-between">
        <PriorityBadge priority={task.priority} />
        {showProjectBadge && <span className="text-muted-foreground truncate text-[10px]">{task.projectName}</span>}
      </div>
    </div>
  );
}
