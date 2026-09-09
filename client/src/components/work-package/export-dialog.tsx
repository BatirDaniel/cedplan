import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';

import { ticketKey } from '@/lib/ui';
import type { WorkPackage } from '@/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  projectIdentifier: string;
  items: WorkPackage[];
}

type FieldKey =
  | 'key' | 'subject' | 'description' | 'project' | 'status' | 'priority' | 'type'
  | 'percentDone' | 'assignees' | 'author' | 'startDate' | 'dueDate' | 'estimatedHours' | 'loggedHours';

const ALL_FIELDS: FieldKey[] = [
  'key', 'subject', 'status', 'priority', 'type', 'percentDone',
  'assignees', 'author', 'project', 'startDate', 'dueDate', 'estimatedHours', 'loggedHours', 'description',
];

const DEFAULT_FIELDS = new Set<FieldKey>([
  'key', 'subject', 'status', 'priority', 'percentDone', 'assignees', 'startDate', 'dueDate',
]);

const FIELD_WIDTHS: Record<FieldKey, number> = {
  key: 10, subject: 36, description: 46, project: 18, status: 14, priority: 12, type: 12,
  percentDone: 10, assignees: 26, author: 18, startDate: 13, dueDate: 13, estimatedHours: 12, loggedHours: 12,
};

const STATUS_COLORS = ['FF64748B', 'FF2563EB', 'FFD97706', 'FFEA580C', 'FF16A34A', 'FFDC2626'];
const PRIORITY_COLORS = ['FF64748B', 'FF2563EB', 'FFEA580C', 'FFDC2626'];

const HEADER_FILL = 'FF1E3A5F';
const BORDER_COLOR = 'FFE2E8F0';
const STRIPE_FILL = 'FFF7F9FC';

export function ExportDialog({ open, onOpenChange, projectName, projectIdentifier, items }: ExportDialogProps) {
  const { t } = useTranslation();
  const [fields, setFields] = React.useState<Set<FieldKey>>(new Set(DEFAULT_FIELDS));
  const [scope, setScope] = React.useState<'all' | 'range'>('all');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [exporting, setExporting] = React.useState(false);

  function toggleField(f: FieldKey) {
    setFields((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  }

  const statusLabel = (s: number) => t(`workPackage.status.${s}`);
  const priorityLabel = (p: number) => t(`workPackage.priority.${p}`);
  const typeLabel = (ty: number) => t(`workPackage.type.${ty}`);

  const fieldLabels: Record<FieldKey, string> = {
    key: t('workPackage.columns.key'),
    subject: t('workPackage.columns.title'),
    description: t('workPackage.descriptionLabel'),
    project: t('export.fieldProject'),
    status: t('workPackage.columns.status'),
    priority: t('workPackage.columns.priority'),
    type: t('workPackage.columns.type'),
    percentDone: t('workPackage.progress'),
    assignees: t('workPackage.assigneeLabel'),
    author: t('export.fieldAuthor'),
    startDate: t('workPackage.startDate'),
    dueDate: t('workPackage.dueDate'),
    estimatedHours: t('export.fieldEstimatedHours'),
    loggedHours: t('export.fieldLoggedHours'),
  };

  function inRange(w: WorkPackage) {
    if (scope !== 'range') return true;
    const start = w.startDate ?? w.dueDate;
    const end = w.dueDate ?? w.startDate;
    if (!start && !end) return false;
    if (from && end && end < from) return false;
    if (to && start && start > to) return false;
    return true;
  }

  function valueFor(f: FieldKey, w: WorkPackage): string | number {
    switch (f) {
      case 'key': return ticketKey(projectIdentifier, w.sequence);
      case 'subject': return w.subject;
      case 'description': return w.description ?? '';
      case 'project': return projectName;
      case 'status': return statusLabel(w.status);
      case 'priority': return priorityLabel(w.priority);
      case 'type': return typeLabel(w.type);
      case 'percentDone': return w.percentDone / 100;
      case 'assignees': return w.assignees.map((a) => a.fullName).join(', ');
      case 'author': return w.authorName;
      case 'startDate': return w.startDate ?? '';
      case 'dueDate': return w.dueDate ?? '';
      case 'estimatedHours': return w.estimatedHours ?? '';
      case 'loggedHours': return w.loggedHours;
    }
  }

  async function exportNow() {
    setExporting(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const scoped = items.filter(inRange);
      const activeFields = ALL_FIELDS.filter((f) => fields.has(f));

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CEDPlan';
      workbook.created = new Date();

      const sheetName = (projectIdentifier || 'Tasks').replace(/[\\/*?:[\]]/g, '').slice(0, 28) || 'Tasks';
      const sheet = workbook.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });

      sheet.columns = activeFields.map((f) => ({ header: fieldLabels[f], key: f, width: FIELD_WIDTHS[f] }));

      scoped.forEach((w) => {
        const row: Record<string, string | number> = {};
        for (const f of activeFields) row[f] = valueFor(f, w);
        sheet.addRow(row);
      });

      const headerRow = sheet.getRow(1);
      headerRow.height = 22;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      });

      if (activeFields.length > 0) {
        sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: activeFields.length } };
      }

      scoped.forEach((w, i) => {
        const row = sheet.getRow(i + 2);
        row.height = 20;
        const striped = i % 2 === 1;
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: BORDER_COLOR } },
            bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
            left: { style: 'thin', color: { argb: BORDER_COLOR } },
            right: { style: 'thin', color: { argb: BORDER_COLOR } },
          };
          cell.alignment = { vertical: 'middle', wrapText: false };
          if (striped) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STRIPE_FILL } };
        });

        activeFields.forEach((f, colIdx) => {
          const cell = row.getCell(colIdx + 1);
          if (f === 'percentDone') {
            cell.numFmt = '0%';
            cell.alignment = { ...cell.alignment, horizontal: 'right' };
          } else if (f === 'status') {
            cell.font = { bold: true, color: { argb: STATUS_COLORS[w.status] ?? 'FF334155' } };
          } else if (f === 'priority') {
            cell.font = { bold: true, color: { argb: PRIORITY_COLORS[w.priority] ?? 'FF334155' } };
          } else if (f === 'startDate' || f === 'dueDate') {
            cell.alignment = { ...cell.alignment, horizontal: 'center' };
          } else if (f === 'estimatedHours' || f === 'loggedHours') {
            cell.alignment = { ...cell.alignment, horizontal: 'right' };
          } else if (f === 'description') {
            cell.alignment = { ...cell.alignment, wrapText: true };
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${projectIdentifier || 'tasks'}-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      onOpenChange(false);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('export.title')}</DialogTitle>
          <DialogDescription>{t('export.desc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('export.scope')}</Label>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="export-scope" className="accent-primary" checked={scope === 'all'} onChange={() => setScope('all')} />
                {t('export.scopeAll', { count: items.length })}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="export-scope" className="accent-primary" checked={scope === 'range'} onChange={() => setScope('range')} />
                {t('export.scopeRange')}
              </label>
            </div>
            {scope === 'range' && (
              <div className="grid grid-cols-2 gap-2 pl-6 pt-1">
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t('export.fields')}</Label>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 max-h-56 overflow-y-auto pr-1">
              {ALL_FIELDS.map((f) => (
                <label key={f} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={fields.has(f)} onCheckedChange={() => toggleField(f)} />
                  {fieldLabels[f]}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={exportNow} disabled={fields.size === 0 || exporting}>
            <Download />
            {exporting ? t('common.saving') : t('export.download')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
