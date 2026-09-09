import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { workPackagesApi } from '@/api/workPackages';
import { useProjectPermissions } from '@/lib/useProjectPermissions';
import { deleteWorkPackageWithUndo } from '@/lib/undoable-delete';
import { initials, formatDate, ticketKey } from '@/lib/ui';
import type { WorkPackage, WorkPackageStatus } from '@/types';
import { WorkPackageStatusOrder } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PriorityBadge, StatusDot } from '@/components/status-badge';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/api/projects';

interface Props {
  projectId: string;
  projectIdentifier: string;
  items: WorkPackage[];
  onSelect: (wp: WorkPackage) => void;
  onCreate: (status: WorkPackageStatus) => void;
}

export function BoardView({ projectId, projectIdentifier, items, onSelect, onCreate }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canEdit } = useProjectPermissions(projectId);
  const [activeItem, setActiveItem] = React.useState<WorkPackage | null>(null);

  const { data: members } = useQuery({ queryKey: ['members', projectId], queryFn: () => projectsApi.members(projectId) });

  const moveMutation = useMutation({
    mutationFn: ({ id, status, position }: { id: string; status: WorkPackageStatus; position: number }) =>
      workPackagesApi.move(projectId, id, status, position),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['work-packages', projectId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: any }) => {
      const wp = items.find((w) => w.id === id)!;
      return workPackagesApi.update(projectId, id, {
        subject: wp.subject,
        description: wp.description ?? '',
        type: wp.type,
        status: wp.status,
        priority: wp.priority,
        assigneeIds: wp.assignees.map((a) => a.id),
        startDate: wp.startDate,
        dueDate: wp.dueDate,
        estimatedHours: wp.estimatedHours,
        percentDone: wp.percentDone,
        ...patch,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['work-packages', projectId] }),
    onError: (err: any) => toast.error(err.response?.data?.message ?? t('workPackage.updateFailed')),
  });

  const columns = React.useMemo(() => {
    const map: Record<number, WorkPackage[]> = {};
    WorkPackageStatusOrder.forEach((s) => (map[s] = []));
    items.forEach((w) => map[w.status]?.push(w));
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.position - b.position));
    return map;
  }, [items]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDragStart(e: DragStartEvent) {
    setActiveItem(items.find((w) => w.id === e.active.id) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveItem(null);
    const { active, over } = e;
    if (!over) return;

    const dragged = items.find((w) => w.id === active.id);
    if (!dragged) return;

    const overData = over.data.current as { status?: WorkPackageStatus } | undefined;
    const targetStatus = overData?.status ?? (columns[Number(over.id)] ? (Number(over.id) as WorkPackageStatus) : dragged.status);

    const overItem = items.find((w) => w.id === over.id);
    const targetColumn = columns[targetStatus] ?? [];
    let newPosition: number;

    if (overItem && overItem.id !== dragged.id) {
      const idx = targetColumn.findIndex((w) => w.id === overItem.id);
      const prev = targetColumn[idx - 1];
      newPosition = prev ? (prev.position + overItem.position) / 2 : overItem.position - 1024;
    } else {
      const last = targetColumn[targetColumn.length - 1];
      newPosition = last ? last.position + 1024 : 1024;
    }

    if (targetStatus === dragged.status && newPosition === dragged.position) return;
    moveMutation.mutate({ id: dragged.id, status: targetStatus, position: newPosition });
  }

  function onDelete(wp: WorkPackage) {
    deleteWorkPackageWithUndo(queryClient, projectId, wp);
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={canEdit ? onDragEnd : () => setActiveItem(null)}>
      <div className="flex gap-3 h-full overflow-x-auto p-4">
        {WorkPackageStatusOrder.map((status) => (
          <Column
            key={status}
            status={status}
            items={columns[status] ?? []}
            projectIdentifier={projectIdentifier}
            members={members ?? []}
            canEdit={canEdit}
            onSelect={onSelect}
            onCreate={() => onCreate(status)}
            onStatusChange={(id, s) => updateMutation.mutate({ id, patch: { status: s } })}
            onToggleAssignee={(id, userId) => {
              const wp = items.find((w) => w.id === id)!;
              const has = wp.assignees.some((a) => a.id === userId);
              const assigneeIds = has
                ? wp.assignees.filter((a) => a.id !== userId).map((a) => a.id)
                : [...wp.assignees.map((a) => a.id), userId];
              updateMutation.mutate({ id, patch: { assigneeIds } });
            }}
            onDelete={onDelete}
          />
        ))}
      </div>
      <DragOverlay>
        {activeItem && <Card item={activeItem} projectIdentifier={projectIdentifier} dragging />}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  items,
  projectIdentifier,
  members,
  canEdit,
  onSelect,
  onCreate,
  onStatusChange,
  onToggleAssignee,
  onDelete,
}: {
  status: WorkPackageStatus;
  items: WorkPackage[];
  projectIdentifier: string;
  members: { userId: string; fullName: string }[];
  canEdit: boolean;
  onSelect: (w: WorkPackage) => void;
  onCreate: () => void;
  onStatusChange: (id: string, status: WorkPackageStatus) => void;
  onToggleAssignee: (id: string, userId: string) => void;
  onDelete: (w: WorkPackage) => void;
}) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { status } });

  return (
    <div className="flex flex-col w-72 shrink-0 rounded-lg bg-muted/40">
      <div className="flex items-center justify-between px-2.5 py-2">
        <h3 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <StatusDot status={status} />
          {t(`workPackage.status.${status}`)}
          <span className="text-muted-foreground/60">{items.length}</span>
        </h3>
        {canEdit && (
          <button onClick={onCreate} className="text-muted-foreground hover:text-foreground hover:bg-background rounded p-1 transition-colors">
            <Plus className="size-3.5" />
          </button>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 px-2 pb-2 space-y-2 overflow-y-auto min-h-24 rounded-md transition-colors ${isOver ? 'bg-primary/5' : ''}`}
      >
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableCard
              key={item.id}
              item={item}
              projectIdentifier={projectIdentifier}
              members={members}
              canEdit={canEdit}
              onSelect={onSelect}
              onStatusChange={onStatusChange}
              onToggleAssignee={onToggleAssignee}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

function SortableCard({
  item,
  projectIdentifier,
  members,
  canEdit,
  onSelect,
  onStatusChange,
  onToggleAssignee,
  onDelete,
}: {
  item: WorkPackage;
  projectIdentifier: string;
  members: { userId: string; fullName: string }[];
  canEdit: boolean;
  onSelect: (w: WorkPackage) => void;
  onStatusChange: (id: string, status: WorkPackageStatus) => void;
  onToggleAssignee: (id: string, userId: string) => void;
  onDelete: (w: WorkPackage) => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
          {...attributes}
          {...listeners}
          onClick={() => onSelect(item)}
        >
          <Card item={item} projectIdentifier={projectIdentifier} />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuLabel className="font-mono-key">{ticketKey(projectIdentifier, item.sequence)}</ContextMenuLabel>
        {!canEdit && (
          <>
            <ContextMenuSeparator />
            <ContextMenuLabel className="text-muted-foreground text-xs font-normal">
              {t('workPackage.readOnlyRole')}
            </ContextMenuLabel>
          </>
        )}
        {canEdit && (
          <>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>{t('workPackage.changeStatus')}</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {WorkPackageStatusOrder.map((s) => (
              <ContextMenuItem key={s} onSelect={() => onStatusChange(item.id, s)}>
                <StatusDot status={s} />
                {t(`workPackage.status.${s}`)}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger>{t('workPackage.assign')}</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {members.map((m) => {
              const assigned = item.assignees.some((a) => a.id === m.userId);
              return (
                <ContextMenuItem key={m.userId} onSelect={() => onToggleAssignee(item.id, m.userId)}>
                  <span className={assigned ? 'font-medium' : ''}>{assigned ? '✓ ' : ''}{m.fullName}</span>
                </ContextMenuItem>
              );
            })}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={() => onDelete(item)}>
          {t('common.delete')}
        </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

function Card({ item, projectIdentifier, dragging }: { item: WorkPackage; projectIdentifier: string; dragging?: boolean }) {
  return (
    <div
      className={`bg-card rounded-md border p-2.5 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all ${
        dragging ? 'shadow-lg rotate-1' : ''
      }`}
    >
      <p className="font-mono-key text-muted-foreground text-[10px] mb-1">{ticketKey(projectIdentifier, item.sequence)}</p>
      <p className="text-sm font-medium mb-2 line-clamp-2 leading-snug">{item.subject}</p>
      <div className="flex items-center justify-between">
        <PriorityBadge priority={item.priority} />
        {item.assignees.length > 0 ? (
          <div className="flex -space-x-1.5">
            {item.assignees.slice(0, 3).map((a) => (
              <Avatar key={a.id} className="border-card size-5 border-2" title={a.fullName}>
                <AvatarFallback style={{ backgroundColor: a.avatarColor }}>{initials(a.fullName)}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        ) : (
          <div className="size-5" />
        )}
      </div>
      {item.dueDate && <p className="text-muted-foreground text-[11px] mt-1.5">{formatDate(item.dueDate)}</p>}
    </div>
  );
}
