import * as React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { parseAsArrayOf, parseAsString, parseAsStringEnum, useQueryState } from 'nuqs';
import { CalendarDays, Download, LayoutGrid, List as ListIcon, Plus, Search } from 'lucide-react';

import { workPackagesApi } from '@/api/workPackages';
import { projectsApi } from '@/api/projects';
import { useProjectPermissions } from '@/lib/useProjectPermissions';
import type { WorkPackageStatus } from '@/types';
import { WorkPackageStatusOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MultiSelect } from '@/components/multi-select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusDot } from '@/components/status-badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { WorkPackageDataTable } from '@/components/work-package/data-table';
import { BoardView } from '@/components/work-package/board-view';
import { GanttView } from '@/components/work-package/gantt-view';
import { CalendarView } from '@/components/work-package/calendar-view';
import { WorkPackageDetail } from '@/components/work-package/work-package-detail';
import { CreateWorkPackageDialog } from '@/components/work-package/create-work-package-dialog';
import { ExportDialog } from '@/components/work-package/export-dialog';

const GanttIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" className="size-4">
    <path d="M2 3h6M2 8h9M2 13h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

// Hoisted to module scope: nuqs parsers must keep a stable reference across
// renders, otherwise `.withDefault([])` creates a new array each render and
// the query-state sync effect loops forever.
const qParser = parseAsString.withDefault('');
const statusFilterParser = parseAsArrayOf(parseAsString).withDefault([]);
const assigneeFilterParser = parseAsArrayOf(parseAsString).withDefault([]);
const viewParser = parseAsStringEnum(['list', 'board', 'gantt', 'calendar'] as const).withDefault('list');

export function WorkItemsPage() {
  const { t } = useTranslation();
  const { projectId } = useParams();

  const [q, setQ] = useQueryState('q', qParser);
  const [statusFilter, setStatusFilter] = useQueryState('status', statusFilterParser);
  const [assigneeFilter, setAssigneeFilter] = useQueryState('assignee', assigneeFilterParser);
  const [view, setView] = useQueryState('view', viewParser);
  const [taskParam, setTaskParam] = useQueryState('task', parseAsString);

  const [selectedId, setSelectedId] = React.useState<string | null>(taskParam || null);

  React.useEffect(() => {
    if (taskParam) {
      setSelectedId(taskParam);
      setTaskParam(null);
    }
  }, [taskParam, setTaskParam]);
  const [creating, setCreating] = React.useState(false);
  const [createStatus, setCreateStatus] = React.useState<WorkPackageStatus | undefined>();
  const [exporting, setExporting] = React.useState(false);

  const { canEdit } = useProjectPermissions(projectId);
  const { data: project } = useQuery({ queryKey: ['project', projectId], queryFn: () => projectsApi.get(projectId!), enabled: !!projectId });
  const { data: members } = useQuery({ queryKey: ['members', projectId], queryFn: () => projectsApi.members(projectId!), enabled: !!projectId });
  const { data: items, isLoading } = useQuery({
    queryKey: ['work-packages', projectId],
    queryFn: () => workPackagesApi.list(projectId!),
    enabled: !!projectId,
  });

  const selected = React.useMemo(
    () => (selectedId ? (items ?? []).find((w) => w.id === selectedId) ?? null : null),
    [items, selectedId]
  );

  const filtered = React.useMemo(() => {
    return (items ?? []).filter((w) => {
      const matchesSearch = w.subject.toLowerCase().includes(q.toLowerCase());
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(String(w.status));
      const matchesAssignee =
        assigneeFilter.length === 0 ||
        (assigneeFilter.includes('unassigned') && w.assignees.length === 0) ||
        w.assignees.some((a) => assigneeFilter.includes(a.id));
      return matchesSearch && matchesStatus && matchesAssignee;
    });
  }, [items, q, statusFilter, assigneeFilter]);

  function openCreate(status?: WorkPackageStatus) {
    setCreateStatus(status);
    setCreating(true);
  }

  const statusOptions = React.useMemo(
    () =>
      WorkPackageStatusOrder.map((s) => ({
        value: String(s),
        label: t(`workPackage.status.${s}`),
        indicator: <StatusDot status={s} />,
      })),
    [t]
  );

  const assigneeOptions = React.useMemo(
    () => [{ value: 'unassigned', label: t('common.unassigned') }, ...(members ?? []).map((m) => ({ value: m.userId, label: m.fullName }))],
    [members, t]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="relative">
          <Search className="text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value || null)}
            placeholder={t('workPackage.searchPlaceholder')}
            className="h-8 w-56 pl-8"
          />
        </div>
        <MultiSelect
          options={statusOptions}
          selected={statusFilter}
          onChange={(v) => setStatusFilter(v.length ? v : null)}
          placeholder={t('workPackage.statusFilter')}
        />
        <MultiSelect
          options={assigneeOptions}
          selected={assigneeFilter}
          onChange={(v) => setAssigneeFilter(v.length ? v : null)}
          placeholder={t('workPackage.assigneeFilter')}
        />

        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={view}
          onValueChange={(v) => v && setView(v as typeof view)}
          className="ml-auto"
        >
          <ToggleGroupItem value="list" aria-label={t('workPackage.listView')}>
            <ListIcon className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="board" aria-label={t('workPackage.boardView')}>
            <LayoutGrid className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="gantt" aria-label={t('workPackage.ganttView')}>
            <GanttIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="calendar" aria-label={t('workPackage.calendarView')}>
            <CalendarDays className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        <Button size="sm" variant="outline" onClick={() => setExporting(true)}>
          <Download />
          {t('export.title')}
        </Button>

        {canEdit && (
          <Button size="sm" onClick={() => openCreate()}>
            <Plus />
            {t('workPackage.newTask')}
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          <>
            {view === 'list' && (
              <WorkPackageDataTable
                projectIdentifier={project?.identifier ?? ''}
                items={filtered}
                onSelect={(w) => setSelectedId(w.id)}
              />
            )}
            {view === 'board' && (
              <BoardView
                projectId={projectId!}
                projectIdentifier={project?.identifier ?? ''}
                items={filtered}
                onSelect={(w) => setSelectedId(w.id)}
                onCreate={openCreate}
              />
            )}
            {view === 'gantt' && <GanttView items={filtered} onSelect={(w) => setSelectedId(w.id)} />}
            {view === 'calendar' && <CalendarView projectId={projectId!} items={filtered} onSelect={(w) => setSelectedId(w.id)} />}
          </>
        )}
      </div>

      <WorkPackageDetail
        projectId={projectId!}
        projectIdentifier={project?.identifier ?? ''}
        workPackage={selected}
        onClose={() => setSelectedId(null)}
        onSelectWorkPackage={setSelectedId}
      />
      <CreateWorkPackageDialog
        projectId={projectId!}
        projectIdentifier={project?.identifier ?? ''}
        open={creating}
        onOpenChange={setCreating}
        defaultStatus={createStatus}
      />
      <ExportDialog
        open={exporting}
        onOpenChange={setExporting}
        projectName={project?.name ?? ''}
        projectIdentifier={project?.identifier ?? ''}
        items={filtered}
      />
    </div>
  );
}
