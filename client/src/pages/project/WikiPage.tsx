import * as React from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BookOpen, FilePlus, FolderPlus, History, RotateCcw } from 'lucide-react';

import { wikiApi } from '@/api/wiki';
import { useProjectPermissions } from '@/lib/useProjectPermissions';
import { formatDate } from '@/lib/ui';
import type { WikiNodeType, WikiPage as WikiNode } from '@/types';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { MoveNodeDialog } from '@/components/wiki/move-node-dialog';
import { WikiEditor } from '@/components/wiki/wiki-editor';
import { WikiTree } from '@/components/wiki/wiki-tree';

const AUTOSAVE_DELAY_MS = 2000;

export function WikiPage() {
  const { t } = useTranslation();
  const { projectId } = useParams();
  const queryClient = useQueryClient();
  const { canEdit } = useProjectPermissions(projectId);

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [title, setTitle] = React.useState('');
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'unsaved' | 'saving' | 'saved'>('idle');
  const [createDialog, setCreateDialog] = React.useState<{ parentId: string | null; nodeType: WikiNodeType } | null>(null);
  const [newTitle, setNewTitle] = React.useState('');
  const [moveNode, setMoveNode] = React.useState<WikiNode | null>(null);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [previewVersionId, setPreviewVersionId] = React.useState<string | null>(null);

  const contentRef = React.useRef('');
  const titleRef = React.useRef('');
  const pageIdRef = React.useRef<string | null>(null);
  const autosaveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: pages } = useQuery({
    queryKey: ['wiki', projectId],
    queryFn: () => wikiApi.list(projectId!),
    enabled: !!projectId,
  });

  const selected = pages?.find((p) => p.id === selectedId) ?? null;

  const { data: versions } = useQuery({
    queryKey: ['wiki-versions', projectId, selectedId],
    queryFn: () => wikiApi.versions(projectId!, selectedId!),
    enabled: !!projectId && !!selectedId && historyOpen,
  });

  const { data: previewVersion } = useQuery({
    queryKey: ['wiki-version', projectId, selectedId, previewVersionId],
    queryFn: () => wikiApi.version(projectId!, selectedId!, previewVersionId!),
    enabled: !!projectId && !!selectedId && !!previewVersionId,
  });

  function expandAncestors(node: WikiNode) {
    setExpanded((prev) => {
      const next = new Set(prev);
      let cursor = node.parentId;
      while (cursor) {
        next.add(cursor);
        cursor = pages?.find((p) => p.id === cursor)?.parentId ?? null;
      }
      return next;
    });
  }

  function selectPage(id: string) {
    flushAutosave();
    setSelectedId(id);
    const node = pages?.find((p) => p.id === id);
    if (node) expandAncestors(node);
  }

  React.useEffect(() => {
    if (selected) {
      setTitle(selected.title);
      titleRef.current = selected.title;
      contentRef.current = selected.content;
      pageIdRef.current = selected.id;
      setSaveStatus('idle');
    }
  }, [selectedId]);

  React.useEffect(() => {
    setHistoryOpen(false);
    setPreviewVersionId(null);
  }, [selectedId]);

  const updateMutation = useMutation({
    mutationFn: ({ id, t, c }: { id: string; t: string; c: string }) => wikiApi.update(projectId!, id, t, c),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki', projectId] });
      queryClient.invalidateQueries({ queryKey: ['wiki-versions', projectId, selectedId] });
      setSaveStatus('saved');
    },
  });

  function flushAutosave() {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
      if (pageIdRef.current) updateMutation.mutate({ id: pageIdRef.current, t: titleRef.current, c: contentRef.current });
    }
  }

  function scheduleAutosave() {
    setSaveStatus('unsaved');
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      autosaveTimer.current = null;
      if (!pageIdRef.current) return;
      setSaveStatus('saving');
      updateMutation.mutate({ id: pageIdRef.current, t: titleRef.current, c: contentRef.current });
    }, AUTOSAVE_DELAY_MS);
  }

  function onEditorChange(html: string) {
    contentRef.current = html;
    scheduleAutosave();
  }

  function onTitleChange(value: string) {
    setTitle(value);
    titleRef.current = value;
    scheduleAutosave();
  }

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        flushAutosave();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  React.useEffect(() => () => flushAutosave(), []);

  const createMutation = useMutation({
    mutationFn: () => wikiApi.create(projectId!, newTitle.trim(), '', createDialog!.nodeType, createDialog!.parentId),
    onSuccess: (node) => {
      queryClient.invalidateQueries({ queryKey: ['wiki', projectId] });
      setCreateDialog(null);
      setNewTitle('');
      if (node.parentId) setExpanded((prev) => new Set(prev).add(node.parentId!));
      if (node.nodeType === 1) setSelectedId(node.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => wikiApi.remove(projectId!, id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['wiki', projectId] });
      if (selectedId === id) setSelectedId(null);
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, newParentId }: { id: string; newParentId: string | null }) => wikiApi.move(projectId!, id, newParentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wiki', projectId] });
      setMoveNode(null);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (versionId: string) => wikiApi.restoreVersion(projectId!, selected!.id, versionId),
    onSuccess: (page) => {
      queryClient.invalidateQueries({ queryKey: ['wiki', projectId] });
      queryClient.invalidateQueries({ queryKey: ['wiki-versions', projectId, selectedId] });
      setTitle(page.title);
      titleRef.current = page.title;
      contentRef.current = page.content;
      setPreviewVersionId(null);
      setHistoryOpen(false);
    },
  });

  function countDescendants(id: string): number {
    const children = (pages ?? []).filter((p) => p.parentId === id);
    return children.reduce((sum, c) => sum + 1 + countDescendants(c.id), 0);
  }

  function onDeleteNode(node: WikiNode) {
    if (node.nodeType === 0) {
      const count = countDescendants(node.id);
      if (count > 0 && !window.confirm(t('wiki.confirmDeleteFolder', { title: node.title, count }))) return;
    }
    deleteMutation.mutate(node.id);
  }

  const breadcrumbTrail = React.useMemo(() => {
    if (!selected || !pages) return [];
    const trail: WikiNode[] = [];
    let cursor: string | null = selected.parentId;
    while (cursor) {
      const node = pages.find((p) => p.id === cursor);
      if (!node) break;
      trail.unshift(node);
      cursor = node.parentId;
    }
    return trail;
  }, [selected, pages]);

  function openVersion(versionId: string) {
    setPreviewVersionId(versionId);
  }

  const statusLabel =
    saveStatus === 'saving' ? t('wiki.saving') : saveStatus === 'saved' ? t('wiki.saved') : saveStatus === 'unsaved' ? t('wiki.unsaved') : '';

  return (
    <div className="flex h-full min-w-0 flex-col sm:flex-row">
      <aside className="flex shrink-0 flex-col border-b bg-background sm:w-72 sm:border-b-0 sm:border-r">
        {canEdit && (
          <div className="flex gap-1.5 p-3">
            <Button size="sm" className="flex-1" onClick={() => setCreateDialog({ parentId: null, nodeType: 1 })}>
              <FilePlus />
              {t('wiki.newPage')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCreateDialog({ parentId: null, nodeType: 0 })}>
              <FolderPlus />
            </Button>
          </div>
        )}
        <ScrollArea className="min-h-0 flex-1">
          <WikiTree
            nodes={pages ?? []}
            selectedId={selectedId}
            expanded={expanded}
            onToggleExpand={(id) =>
              setExpanded((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            onSelect={selectPage}
            canEdit={canEdit}
            onNewPage={(parentId) => setCreateDialog({ parentId, nodeType: 1 })}
            onNewFolder={(parentId) => setCreateDialog({ parentId, nodeType: 0 })}
            onMove={setMoveNode}
            onDelete={onDeleteNode}
          />
        </ScrollArea>
      </aside>

      <ScrollArea className="min-w-0 flex-1">
        <div className="p-6 sm:p-10">
          {!selected && (
            <div className="text-muted-foreground mt-20 text-center text-sm">
              <BookOpen className="mx-auto mb-2 size-8" />
              {t('wiki.selectOrCreate')}
            </div>
          )}
          {selected && (
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {breadcrumbTrail.length > 0 && (
                <Breadcrumb>
                  <BreadcrumbList>
                    {breadcrumbTrail.map((node) => (
                      <React.Fragment key={node.id}>
                        <BreadcrumbItem>
                          <button type="button" onClick={() => expandAncestors(node)} className="hover:text-foreground transition-colors">
                            {node.title}
                          </button>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                      </React.Fragment>
                    ))}
                    <BreadcrumbItem>
                      <BreadcrumbPage>{selected.title}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              )}

              <div className="space-y-2">
                <Input
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  placeholder={t('wiki.pageTitlePlaceholder')}
                  readOnly={!canEdit}
                  className="h-auto border-none px-0 font-serif text-4xl font-semibold shadow-none focus-visible:ring-0"
                />
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-xs">
                    {t('wiki.lastUpdatedBy', { name: selected.updatedByName, date: formatDate(selected.updatedAt) })}
                    {statusLabel && <span className="ml-2">· {statusLabel}</span>}
                  </p>
                  <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={() => setHistoryOpen(true)}>
                    <History className="size-3.5" />
                    {t('wiki.history')}
                  </Button>
                </div>
              </div>

              <div className="border-t" />

              <WikiEditor key={selected.id} content={selected.content} editable={canEdit} onChange={onEditorChange} />
            </div>
          )}
        </div>
      </ScrollArea>

      <Dialog open={!!createDialog} onOpenChange={(o) => !o && setCreateDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{createDialog?.nodeType === 0 ? t('wiki.newFolder') : t('wiki.newPage')}</DialogTitle>
            <DialogDescription>{t('wiki.createDialogDesc')}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newTitle.trim()) createMutation.mutate();
            }}
          >
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={t('wiki.pageTitlePlaceholder')} autoFocus />
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setCreateDialog(null)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={!newTitle.trim() || createMutation.isPending}>
                {t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <MoveNodeDialog
        node={moveNode}
        nodes={pages ?? []}
        onClose={() => setMoveNode(null)}
        onConfirm={(newParentId) => moveNode && moveMutation.mutate({ id: moveNode.id, newParentId })}
      />

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t('wiki.versionHistory')}</SheetTitle>
            <SheetDescription>{t('wiki.versionHistoryDesc')}</SheetDescription>
          </SheetHeader>

          {previewVersion ? (
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 pb-4">
              <Button type="button" variant="ghost" size="sm" className="w-fit gap-1.5 px-2 text-xs" onClick={() => setPreviewVersionId(null)}>
                ← {t('wiki.backToList')}
              </Button>
              <div className="space-y-1">
                <h3 className="font-serif text-xl font-semibold">{previewVersion.title}</h3>
                <p className="text-muted-foreground text-xs">
                  {t('wiki.savedBy', { name: previewVersion.savedByName, date: formatDate(previewVersion.createdAt) })}
                </p>
              </div>
              <ScrollArea className="min-h-0 flex-1 rounded-md border">
                <div className="wiki-prose p-3" dangerouslySetInnerHTML={{ __html: previewVersion.content }} />
              </ScrollArea>
              <Button type="button" onClick={() => restoreMutation.mutate(previewVersion.id)} disabled={restoreMutation.isPending}>
                <RotateCcw />
                {t('wiki.restoreThisVersion')}
              </Button>
            </div>
          ) : (
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-1 px-4 pb-4">
                {versions?.length === 0 && <p className="text-muted-foreground text-sm">{t('wiki.noVersionsYet')}</p>}
                {versions?.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => openVersion(v.id)}
                    className="hover:bg-accent flex w-full flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left text-sm"
                  >
                    <span className="font-medium">{v.title}</span>
                    <span className="text-muted-foreground text-xs">
                      {t('wiki.savedBy', { name: v.savedByName, date: formatDate(v.createdAt) })}
                    </span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
