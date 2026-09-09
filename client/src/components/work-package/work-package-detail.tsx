import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { workPackagesApi } from '@/api/workPackages';
import { projectsApi } from '@/api/projects';
import { useIsMobile } from '@/hooks/use-mobile';
import { useProjectPermissions } from '@/lib/useProjectPermissions';
import { initials, ticketKey } from '@/lib/ui';
import { deleteWorkPackageWithUndo } from '@/lib/undoable-delete';
import { cn } from '@/lib/utils';
import type { WorkPackage, WorkPackagePriority, WorkPackageStatus, WorkPackageType } from '@/types';
import { WorkPackageStatusOrder } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { StatusDot } from '@/components/status-badge';
import { Textarea } from '@/components/ui/textarea';
import { MessagesSection } from '@/components/work-package/messages-section';

interface Props {
  projectId: string;
  projectIdentifier: string;
  workPackage: WorkPackage | null;
  onClose: () => void;
  onSelectWorkPackage?: (id: string) => void;
}

export function WorkPackageDetail({ projectId, projectIdentifier, workPackage, onClose, onSelectWorkPackage }: Props) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const open = !!workPackage;

  const body = workPackage && (
    <DetailBody
      projectId={projectId}
      projectIdentifier={projectIdentifier}
      workPackage={workPackage}
      onClose={onClose}
      onSelectWorkPackage={onSelectWorkPackage}
    />
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="max-h-[92vh]" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DrawerHeader className="sr-only">
            <DrawerTitle>{t('workPackage.details')}</DrawerTitle>
            <DrawerDescription>{t('workPackage.details')}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto">{body}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col" onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader className="sr-only">
          <SheetTitle>{t('workPackage.details')}</SheetTitle>
          <SheetDescription>{t('workPackage.details')}</SheetDescription>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  );
}

function DetailBody({
  projectId,
  projectIdentifier,
  workPackage,
  onClose,
  onSelectWorkPackage,
}: {
  projectId: string;
  projectIdentifier: string;
  workPackage: WorkPackage;
  onClose: () => void;
  onSelectWorkPackage?: (id: string) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { canEdit } = useProjectPermissions(projectId);
  const [subject, setSubject] = React.useState(workPackage.subject);
  const [description, setDescription] = React.useState(workPackage.description ?? '');

  React.useEffect(() => {
    setSubject(workPackage.subject);
    setDescription(workPackage.description ?? '');
  }, [workPackage.id]);

  const { data: members } = useQuery({
    queryKey: ['members', projectId],
    queryFn: () => projectsApi.members(projectId),
  });

  const { data: comments } = useQuery({
    queryKey: ['comments', projectId, workPackage.id],
    queryFn: () => workPackagesApi.comments(projectId, workPackage.id),
  });

  const { data: timeEntries } = useQuery({
    queryKey: ['time-entries', projectId, workPackage.id],
    queryFn: () => workPackagesApi.timeEntries(projectId, workPackage.id),
  });

  const { data: allItems } = useQuery({
    queryKey: ['work-packages', projectId],
    queryFn: () => workPackagesApi.list(projectId),
  });

  const subtasks = React.useMemo(
    () => (allItems ?? []).filter((w) => w.parentId === workPackage.id),
    [allItems, workPackage.id]
  );

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<Parameters<typeof workPackagesApi.update>[2]>) =>
      workPackagesApi.update(projectId, workPackage.id, {
        subject: patch.subject ?? workPackage.subject,
        description: patch.description ?? workPackage.description ?? '',
        type: patch.type ?? workPackage.type,
        status: patch.status ?? workPackage.status,
        priority: patch.priority ?? workPackage.priority,
        assigneeIds: 'assigneeIds' in patch ? patch.assigneeIds : workPackage.assignees.map((a) => a.id),
        startDate: patch.startDate ?? workPackage.startDate,
        dueDate: patch.dueDate ?? workPackage.dueDate,
        estimatedHours: patch.estimatedHours ?? workPackage.estimatedHours,
        percentDone: patch.percentDone ?? workPackage.percentDone,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-packages', projectId] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? t('workPackage.updateFailed')),
  });

  function commit(field: 'subject' | 'description') {
    if (field === 'subject' && subject !== workPackage.subject) updateMutation.mutate({ subject });
    if (field === 'description' && description !== (workPackage.description ?? ''))
      updateMutation.mutate({ description });
  }

  function onDelete() {
    onClose();
    deleteWorkPackageWithUndo(queryClient, projectId, workPackage);
  }

  const key = ticketKey(projectIdentifier, workPackage.sequence);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between gap-2 border-b py-4 pl-4 pr-14">
        <div className="min-w-0">
          <p className="font-mono-key text-xs text-muted-foreground mb-1">{key}</p>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onBlur={() => commit('subject')}
            readOnly={!canEdit}
            className="h-auto border-none px-0 text-base font-semibold shadow-none focus-visible:ring-0"
          />
        </div>
        {canEdit && (
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-muted-foreground hover:text-destructive shrink-0">
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <fieldset disabled={!canEdit} className="m-0 min-w-0 border-0 p-0 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('workPackage.columns.type')}>
            <Select
              value={String(workPackage.type)}
              onValueChange={(v) => updateMutation.mutate({ type: Number(v) as WorkPackageType })}
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4].map((k) => (
                  <SelectItem key={k} value={String(k)}>
                    {t(`workPackage.type.${k}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('workPackage.columns.status')}>
            <Select
              value={String(workPackage.status)}
              onValueChange={(v) => updateMutation.mutate({ status: Number(v) as WorkPackageStatus })}
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue>
                  <span className="inline-flex items-center gap-1.5">
                    <StatusDot status={workPackage.status} />
                    {t(`workPackage.status.${workPackage.status}`)}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {WorkPackageStatusOrder.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    <span className="inline-flex items-center gap-1.5">
                      <StatusDot status={s} />
                      {t(`workPackage.status.${s}`)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('workPackage.columns.priority')}>
            <Select
              value={String(workPackage.priority)}
              onValueChange={(v) => updateMutation.mutate({ priority: Number(v) as WorkPackagePriority })}
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3].map((k) => (
                  <SelectItem key={k} value={String(k)}>
                    {t(`workPackage.priority.${k}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('workPackage.assigneeLabel')}>
            <AssigneePicker
              assignees={workPackage.assignees}
              members={members ?? []}
              onChange={(ids) => updateMutation.mutate({ assigneeIds: ids })}
            />
          </Field>
          <Field label={t('workPackage.startDate')}>
            <Input
              type="date"
              defaultValue={workPackage.startDate ?? ''}
              onBlur={(e) => updateMutation.mutate({ startDate: e.target.value || null })}
              className="h-8 text-sm"
            />
          </Field>
          <Field label={t('workPackage.dueDate')}>
            <Input
              type="date"
              defaultValue={workPackage.dueDate ?? ''}
              onBlur={(e) => updateMutation.mutate({ dueDate: e.target.value || null })}
              className="h-8 text-sm"
            />
          </Field>
        </div>

        <div>
          <p className="text-muted-foreground text-xs font-medium mb-1.5">{t('workPackage.progress')}: {workPackage.percentDone}%</p>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            defaultValue={workPackage.percentDone}
            onMouseUp={(e) => updateMutation.mutate({ percentDone: Number((e.target as HTMLInputElement).value) })}
            className="w-full accent-primary"
          />
        </div>

        <div>
          <p className="text-muted-foreground text-xs font-medium mb-1.5">{t('workPackage.descriptionLabel')}</p>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => commit('description')}
            rows={4}
            placeholder={t('workPackage.descriptionPlaceholder')}
          />
        </div>

        <Separator />

        <SubtasksSection
          projectId={projectId}
          projectIdentifier={projectIdentifier}
          parentId={workPackage.id}
          subtasks={subtasks}
          canEdit={canEdit}
          onSelectWorkPackage={onSelectWorkPackage}
        />

        <Separator />

        <TimeSection projectId={projectId} workPackageId={workPackage.id} entries={timeEntries} estimatedHours={workPackage.estimatedHours} />

        <Separator />

        <MessagesSection projectId={projectId} workPackageId={workPackage.id} comments={comments} members={members ?? []} />
        </fieldset>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs font-medium mb-1">{label}</p>
      {children}
    </div>
  );
}

function AssigneePicker({
  assignees,
  members,
  onChange,
}: {
  assignees: { id: string; fullName: string; avatarColor: string }[];
  members: { userId: string; fullName: string; avatarColor: string }[];
  onChange: (ids: string[]) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const selectedIds = new Set(assignees.map((a) => a.id));

  function toggle(userId: string) {
    const next = selectedIds.has(userId) ? assignees.filter((a) => a.id !== userId).map((a) => a.id) : [...selectedIds, userId];
    onChange(next);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" role="combobox" className="w-full justify-start font-normal">
          {assignees.length === 0 ? (
            <span className="text-muted-foreground">{t('common.unassigned')}</span>
          ) : (
            <div className="flex items-center gap-1.5 overflow-hidden">
              <div className="flex -space-x-1.5 shrink-0">
                {assignees.slice(0, 3).map((a) => (
                  <Avatar key={a.id} className="border-background size-5 border-2">
                    <AvatarFallback style={{ backgroundColor: a.avatarColor }}>{initials(a.fullName)}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="truncate text-xs">{assignees.map((a) => a.fullName).join(', ')}</span>
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder={t('workPackage.searchMembers')} />
          <CommandList>
            <CommandEmpty>{t('members.noUsersFound')}</CommandEmpty>
            <CommandGroup>
              {members.map((m) => {
                const checked = selectedIds.has(m.userId);
                return (
                  <CommandItem key={m.userId} value={m.fullName} onSelect={() => toggle(m.userId)}>
                    <Avatar className="size-6">
                      <AvatarFallback style={{ backgroundColor: m.avatarColor }}>{initials(m.fullName)}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">{m.fullName}</span>
                    {checked && <Check className="size-4" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function SubtasksSection({
  projectId,
  projectIdentifier,
  parentId,
  subtasks,
  canEdit,
  onSelectWorkPackage,
}: {
  projectId: string;
  projectIdentifier: string;
  parentId: string;
  subtasks: WorkPackage[];
  canEdit: boolean;
  onSelectWorkPackage?: (id: string) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [subject, setSubject] = React.useState('');

  const createMutation = useMutation({
    mutationFn: (subj: string) =>
      workPackagesApi.create(projectId, {
        subject: subj,
        type: 0,
        status: 0,
        priority: 1,
        parentId,
      }),
    onSuccess: () => {
      setSubject('');
      queryClient.invalidateQueries({ queryKey: ['work-packages', projectId] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkPackageStatus }) =>
      workPackagesApi.updateStatus(projectId, id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['work-packages', projectId] }),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (subject.trim()) createMutation.mutate(subject.trim());
  }

  const done = subtasks.filter((s) => s.status === 4).length;

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-medium">
        {t('workPackage.subtasks')}
        {subtasks.length > 0 && ` (${done}/${subtasks.length})`}
      </p>
      <div className="space-y-1">
        {subtasks.map((s) => (
          <div key={s.id} className="hover:bg-accent/50 flex items-center gap-2 rounded-md px-1.5 py-1 text-sm">
            <Checkbox
              checked={s.status === 4}
              disabled={!canEdit}
              onCheckedChange={(checked) => toggleMutation.mutate({ id: s.id, status: checked ? 4 : 0 })}
            />
            <button
              type="button"
              onClick={() => onSelectWorkPackage?.(s.id)}
              className={cn(
                'min-w-0 flex-1 truncate text-left hover:underline',
                s.status === 4 && 'text-muted-foreground line-through'
              )}
            >
              <span className="font-mono-key text-muted-foreground mr-1.5 text-[10px]">{ticketKey(projectIdentifier, s.sequence)}</span>
              {s.subject}
            </button>
          </div>
        ))}
        {subtasks.length === 0 && <p className="text-muted-foreground text-xs">{t('workPackage.noSubtasks')}</p>}
      </div>
      {canEdit && (
        <form onSubmit={submit} className="flex items-center gap-1.5">
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('workPackage.addSubtaskPlaceholder')}
            className="h-7 text-xs"
          />
          <Button type="submit" size="icon" variant="ghost" className="h-7 w-7 shrink-0" disabled={!subject.trim() || createMutation.isPending}>
            <Plus className="size-4" />
          </Button>
        </form>
      )}
    </div>
  );
}

function TimeSection({
  projectId,
  workPackageId,
  entries,
  estimatedHours,
}: {
  projectId: string;
  workPackageId: string;
  entries?: { id: string; userName: string; hours: number; spentOn: string; comment?: string | null }[];
  estimatedHours?: number | null;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [hours, setHours] = React.useState('1');
  const [spentOn, setSpentOn] = React.useState(new Date().toISOString().slice(0, 10));

  const addMutation = useMutation({
    mutationFn: () => workPackagesApi.addTimeEntry(projectId, workPackageId, { hours: parseFloat(hours), spentOn }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', projectId, workPackageId] });
      queryClient.invalidateQueries({ queryKey: ['work-packages', projectId] });
    },
  });

  const total = entries?.reduce((sum, e) => sum + e.hours, 0) ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs">
        <span>
          <strong>{total}h</strong> {t('detail.loggedOf', { estimated: estimatedHours ? t('detail.outOfEstimated', { hours: estimatedHours }) : '' })}
        </span>
      </div>
      <div className="space-y-1.5">
        {entries?.length === 0 && <p className="text-muted-foreground text-xs">{t('detail.noTimeEntries')}</p>}
        {entries?.map((e) => (
          <div key={e.id} className="flex items-center justify-between bg-muted rounded-md px-2.5 py-1.5 text-xs">
            <span>
              <span className="font-medium">{e.userName}</span>
              <span className="text-muted-foreground ml-2">{e.spentOn}</span>
            </span>
            <span className="font-semibold text-primary">{e.hours}h</span>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addMutation.mutate();
        }}
        className="flex items-center gap-2"
      >
        <Input
          type="number"
          step="0.25"
          min="0.25"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className="h-8 w-20"
        />
        <Input type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)} className="h-8" />
        <Button type="submit" size="sm" variant="secondary" className="shrink-0">
          {t('common.add')}
        </Button>
      </form>
    </div>
  );
}
