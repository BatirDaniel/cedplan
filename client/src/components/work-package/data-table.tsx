import * as React from 'react';
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type Row } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { formatDate, initials, ticketKey } from '@/lib/ui';
import type { WorkPackage, WorkPackageStatus } from '@/types';
import { WorkPackageStatusOrder } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PriorityBadge, StatusDot } from '@/components/status-badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface Props {
  projectIdentifier: string;
  items: WorkPackage[];
  onSelect: (wp: WorkPackage) => void;
}

export function WorkPackageDataTable({ projectIdentifier, items, onSelect }: Props) {
  const { t } = useTranslation();

  const columns = React.useMemo<ColumnDef<WorkPackage>[]>(
    () => [
      {
        id: 'key',
        header: t('workPackage.columns.key'),
        accessorFn: (row) => ticketKey(projectIdentifier, row.sequence),
        size: 90,
        minSize: 70,
        cell: ({ getValue }) => <span className="font-mono-key text-muted-foreground text-xs">{getValue<string>()}</span>,
      },
      {
        id: 'subject',
        header: t('workPackage.columns.title'),
        accessorKey: 'subject',
        size: 340,
        minSize: 160,
        cell: ({ row }) => (
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate font-medium">{row.original.subject}</span>
          </div>
        ),
      },
      {
        id: 'type',
        header: t('workPackage.columns.type'),
        accessorKey: 'type',
        size: 110,
        minSize: 90,
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-xs">{t(`workPackage.type.${getValue<number>()}`)}</span>
        ),
      },
      {
        id: 'priority',
        header: t('workPackage.columns.priority'),
        accessorKey: 'priority',
        size: 110,
        minSize: 90,
        cell: ({ getValue }) => <PriorityBadge priority={getValue<number>() as 0} />,
      },
      {
        id: 'assignee',
        header: t('workPackage.columns.assignee'),
        accessorFn: (row) => row.assignees.map((a) => a.fullName).join(', '),
        size: 170,
        minSize: 120,
        cell: ({ row }) =>
          row.original.assignees.length > 0 ? (
            <div className="flex items-center -space-x-1.5">
              {row.original.assignees.slice(0, 3).map((a) => (
                <Avatar key={a.id} className="border-background size-5 border-2" title={a.fullName}>
                  <AvatarFallback style={{ backgroundColor: a.avatarColor }}>{initials(a.fullName)}</AvatarFallback>
                </Avatar>
              ))}
              {row.original.assignees.length > 3 && (
                <span className="text-muted-foreground pl-2 text-[10px]">+{row.original.assignees.length - 3}</span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground/60 text-xs">{t('common.unassigned')}</span>
          ),
      },
      {
        id: 'dueDate',
        header: t('workPackage.columns.dueDate'),
        accessorKey: 'dueDate',
        size: 110,
        minSize: 90,
        cell: ({ getValue }) => <span className="text-muted-foreground text-xs">{formatDate(getValue<string>())}</span>,
      },
      {
        id: 'progress',
        header: t('workPackage.columns.progress'),
        accessorKey: 'percentDone',
        size: 120,
        minSize: 80,
        cell: ({ getValue }) => (
          <div className="bg-muted h-1.5 w-full max-w-24 rounded-full">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${getValue<number>()}%` }} />
          </div>
        ),
      },
    ],
    [projectIdentifier, t]
  );

  const table = useReactTable({
    data: items,
    columns,
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
  });

  // Grouping by status is done manually (rather than via TanStack's built-in
  // grouped/expanded row models) — cheap for this data size and sidesteps it.
  const rowsByStatus = React.useMemo(() => {
    const map = new Map<number, Row<WorkPackage>[]>();
    for (const row of table.getRowModel().rows) map.set(row.original.status, [...(map.get(row.original.status) ?? []), row]);
    return map;
  }, [table.getRowModel().rows]);

  const [collapsed, setCollapsed] = React.useState<Set<number>>(new Set());
  function toggleGroup(status: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(status) ? next.delete(status) : next.add(status);
      return next;
    });
  }

  return (
    <ScrollArea orientation="both" className="h-full">
      <Table style={{ width: '100%', minWidth: table.getTotalSize() }}>
        <TableHeader className="sticky top-0 bg-background z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} style={{ width: header.getSize() }} className="relative select-none">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  <div
                    onMouseDown={header.getResizeHandler()}
                    onTouchStart={header.getResizeHandler()}
                    className={cn(
                      'absolute right-0 top-0 h-full w-1 cursor-col-resize touch-none select-none hover:bg-primary/50',
                      header.column.getIsResizing() && 'bg-primary'
                    )}
                  />
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {WorkPackageStatusOrder.filter((s) => (rowsByStatus.get(s)?.length ?? 0) > 0).map((status) => {
            const rows = rowsByStatus.get(status) ?? [];
            const isCollapsed = collapsed.has(status);
            return (
              <React.Fragment key={status}>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableCell colSpan={columns.length} className="py-1.5">
                    <button onClick={() => toggleGroup(status)} className="flex items-center gap-1.5 text-xs font-medium">
                      {isCollapsed ? (
                        <ChevronRight className="size-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-3.5 text-muted-foreground" />
                      )}
                      <StatusDot status={status as WorkPackageStatus} />
                      {t(`workPackage.status.${status}`)}
                      <span className="text-muted-foreground/60 font-normal">{rows.length}</span>
                    </button>
                  </TableCell>
                </TableRow>
                {!isCollapsed &&
                  rows.map((row) => (
                    <TableRow key={row.id} className="cursor-pointer" onClick={() => onSelect(row.original)}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} style={{ width: cell.column.getSize() }}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
              </React.Fragment>
            );
          })}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-muted-foreground text-center py-10 text-sm">
                {t('workPackage.noTasksFound')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
