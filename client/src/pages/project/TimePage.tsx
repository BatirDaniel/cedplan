import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Clock, Pencil, Trash2 } from 'lucide-react';
import { isWithinInterval, parseISO } from 'date-fns';
import { toast } from 'sonner';

import { projectTimeApi } from '@/api/time';
import { useAuthStore } from '@/store/auth';
import { buildBuckets, formatRangeLabel, periodRange, shiftAnchor, useDateLocale, type Period } from '@/lib/period';
import { formatDate, initials } from '@/lib/ui';
import type { TimeEntry } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

export function TimePage() {
  const { t } = useTranslation();
  const { projectId } = useParams();
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<Period>('week');
  const [anchor, setAnchor] = useState(new Date());
  const [editing, setEditing] = useState<TimeEntry | null>(null);
  const [editHours, setEditHours] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editComment, setEditComment] = useState('');

  const locale = useDateLocale();

  const { data: allEntries, isLoading } = useQuery({
    queryKey: ['project-time', projectId],
    queryFn: () => projectTimeApi.list(projectId!),
    enabled: !!projectId,
  });

  const { start, end } = periodRange(period, anchor);

  const entries = useMemo(
    () => (allEntries ?? []).filter((e) => isWithinInterval(parseISO(e.spentOn), { start, end })),
    [allEntries, start, end]
  );

  const buckets = useMemo(() => buildBuckets(period, anchor, locale), [period, anchor, locale]);

  const bucketHours = useMemo(
    () =>
      buckets.map((b) => ({
        ...b,
        hours: entries
          .filter((e) => isWithinInterval(parseISO(e.spentOn), { start: b.start, end: b.end }))
          .reduce((sum, e) => sum + e.hours, 0),
      })),
    [buckets, entries]
  );

  const byUser = useMemo(() => {
    const map = new Map<string, { userName: string; hours: number }>();
    entries.forEach((e) => {
      const cur = map.get(e.userId) ?? { userName: e.userName, hours: 0 };
      cur.hours += e.hours;
      map.set(e.userId, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.hours - a.hours);
  }, [entries]);

  const total = entries.reduce((sum, e) => sum + e.hours, 0);
  const bucketMax = Math.max(1, ...bucketHours.map((b) => b.hours));

  const updateMutation = useMutation({
    mutationFn: () =>
      projectTimeApi.update(projectId!, editing!.id, Number(editHours), editDate, editComment || null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-time', projectId] });
      setEditing(null);
      toast.success(t('time.updatedToast'));
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? t('time.updateFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => projectTimeApi.remove(projectId!, editing!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-time', projectId] });
      setEditing(null);
      toast.success(t('time.deletedToast'));
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? t('time.updateFailed')),
  });

  function openEdit(e: TimeEntry) {
    setEditing(e);
    setEditHours(String(e.hours));
    setEditDate(e.spentOn.slice(0, 10));
    setEditComment(e.comment ?? '');
  }

  const periodLabel =
    period === 'week' ? t('time.perDay') : period === 'month' ? t('time.perWeek') : period === 'year' ? t('time.perMonth') : null;

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="day">{t('time.day')}</TabsTrigger>
            <TabsTrigger value="week">{t('time.week')}</TabsTrigger>
            <TabsTrigger value="month">{t('time.month')}</TabsTrigger>
            <TabsTrigger value="year">{t('time.year')}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="size-8" onClick={() => setAnchor((a) => shiftAnchor(period, a, -1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-40 text-center text-sm font-medium capitalize">{formatRangeLabel(period, anchor, locale)}</span>
          <Button variant="outline" size="icon" className="size-8" onClick={() => setAnchor((a) => shiftAnchor(period, a, 1))}>
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" className="ml-1 text-xs" onClick={() => setAnchor(new Date())}>
            {t('time.today')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-muted-foreground text-xs mb-1">{t('time.totalLogged')}</p>
            <p className="flex items-center gap-2 text-2xl font-bold">
              <Clock className="text-primary size-5" />
              {total}h
            </p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardContent className="pt-4">
            <p className="text-muted-foreground text-xs mb-2">{t('time.distribution')}</p>
            <div className="space-y-2">
              {byUser.map((u) => (
                <div key={u.userName} className="flex items-center gap-3">
                  <span className="w-32 truncate text-sm">{u.userName}</span>
                  <div className="bg-muted h-2 flex-1 rounded-full">
                    <div className="bg-primary h-2 rounded-full" style={{ width: `${total ? (u.hours / total) * 100 : 0}%` }} />
                  </div>
                  <span className="w-12 text-right text-sm font-medium">{u.hours}h</span>
                </div>
              ))}
              {byUser.length === 0 && <p className="text-muted-foreground text-sm">{t('time.noEntries')}</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {periodLabel && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-muted-foreground text-xs mb-3">{periodLabel}</p>
            <div className="flex items-end gap-2" style={{ height: 120 }}>
              {bucketHours.map((b) => (
                <div key={b.key} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-xs font-medium">{b.hours > 0 ? `${b.hours}h` : ''}</span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="bg-primary w-full rounded-t-sm transition-all"
                      style={{ height: `${Math.max(2, (b.hours / bucketMax) * 100)}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground text-center text-[11px] leading-tight whitespace-nowrap">{b.label}</span>
                </div>
              ))}
            </div>
            {period === 'year' && (
              <div className="mt-4 flex items-center justify-between border-t pt-3 text-sm">
                <span className="text-muted-foreground">{t('time.yearTotal')}</span>
                <span className="font-semibold">{total}h</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="py-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('time.member')}</TableHead>
              <TableHead>{t('time.task')}</TableHead>
              <TableHead>{t('time.date')}</TableHead>
              <TableHead>{t('time.note')}</TableHead>
              <TableHead className="text-right">{t('time.hours')}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground text-center py-8">
                  {t('common.loading')}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground text-center py-8">
                  {t('time.noTimeEntries')}
                </TableCell>
              </TableRow>
            )}
            {entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="size-6">
                      <AvatarFallback>{initials(e.userName)}</AvatarFallback>
                    </Avatar>
                    {e.userName}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{e.workPackageSubject}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(e.spentOn)}</TableCell>
                <TableCell className="text-muted-foreground">{e.comment ?? '—'}</TableCell>
                <TableCell className="text-primary text-right font-medium">{e.hours}h</TableCell>
                <TableCell className="text-right">
                  {e.userId === currentUser?.id && (
                    <Button variant="ghost" size="icon" className="text-muted-foreground size-7" onClick={() => openEdit(e)}>
                      <Pencil className="size-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('time.editEntry')}</DialogTitle>
            <DialogDescription>{editing?.workPackageSubject}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-hours">{t('time.hours')}</Label>
              <Input
                id="edit-hours"
                type="number"
                min="0.25"
                step="0.25"
                value={editHours}
                onChange={(e) => setEditHours(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-date">{t('time.date')}</Label>
              <Input id="edit-date" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-comment">{t('time.note')}</Label>
              <Textarea id="edit-comment" rows={3} value={editComment} onChange={(e) => setEditComment(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (confirm(t('time.confirmDelete'))) deleteMutation.mutate();
              }}
            >
              <Trash2 />
              {t('common.delete')}
            </Button>
            <Button
              type="button"
              disabled={updateMutation.isPending || !editHours || Number(editHours) <= 0}
              onClick={() => updateMutation.mutate()}
            >
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
