import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, FilePlus, FileText, Folder, FolderPlus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { WikiPage } from '@/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface WikiTreeProps {
  nodes: WikiPage[];
  selectedId: string | null;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  canEdit: boolean;
  onNewPage: (parentId: string | null) => void;
  onNewFolder: (parentId: string | null) => void;
  onMove: (node: WikiPage) => void;
  onDelete: (node: WikiPage) => void;
}

export function WikiTree(props: WikiTreeProps) {
  const { t } = useTranslation();
  const childrenByParent = React.useMemo(() => {
    const map = new Map<string, WikiPage[]>();
    for (const n of props.nodes) {
      const key = n.parentId ?? '__root__';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(n);
    }
    for (const list of map.values()) list.sort((a, b) => a.position - b.position || a.title.localeCompare(b.title));
    return map;
  }, [props.nodes]);

  const roots = childrenByParent.get('__root__') ?? [];

  return (
    <div className="space-y-0.5 px-2 pb-3">
      {roots.length === 0 && <p className="text-muted-foreground px-1.5 py-2 text-xs">{t('wiki.noPagesYet')}</p>}
      {roots.map((node) => (
        <WikiTreeRow key={node.id} node={node} depth={0} childrenByParent={childrenByParent} {...props} />
      ))}
    </div>
  );
}

type TreeRowSharedProps = Omit<WikiTreeProps, 'nodes'>;

function WikiTreeRow({
  node,
  depth,
  childrenByParent,
  selectedId,
  expanded,
  onToggleExpand,
  onSelect,
  canEdit,
  onNewPage,
  onNewFolder,
  onMove,
  onDelete,
}: TreeRowSharedProps & { node: WikiPage; depth: number; childrenByParent: Map<string, WikiPage[]> }) {
  const { t } = useTranslation();
  const isFolder = node.nodeType === 0;
  const isOpen = expanded.has(node.id);
  const children = childrenByParent.get(node.id) ?? [];

  return (
    <div>
      <div
        className={cn(
          'group flex w-full items-center gap-1 rounded-md py-1.5 pr-1 text-left text-sm transition-colors',
          selectedId === node.id ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-accent/50'
        )}
        style={{ paddingLeft: 6 + depth * 14 }}
      >
        {isFolder ? (
          <button
            type="button"
            onClick={() => onToggleExpand(node.id)}
            className="shrink-0 rounded p-0.5 hover:bg-accent"
            aria-label={isOpen ? t('common.collapse') : t('common.expand')}
          >
            <ChevronRight className={cn('size-3.5 transition-transform', isOpen && 'rotate-90')} />
          </button>
        ) : (
          <span className="size-3.5 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => (isFolder ? onToggleExpand(node.id) : onSelect(node.id))}
          className="flex min-w-0 flex-1 items-center gap-2"
        >
          {isFolder ? <Folder className="size-3.5 shrink-0" /> : <FileText className="size-3.5 shrink-0" />}
          <span className="truncate">{node.title}</span>
        </button>
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6 shrink-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
              >
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isFolder && (
                <>
                  <DropdownMenuItem onClick={() => onNewPage(node.id)}>
                    <FilePlus /> {t('wiki.newPage')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNewFolder(node.id)}>
                    <FolderPlus /> {t('wiki.newFolder')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {!isFolder && (
                <DropdownMenuItem onClick={() => onSelect(node.id)}>
                  <Pencil /> {t('common.open')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onMove(node)}>{t('wiki.moveTo')}</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(node)}>
                <Trash2 /> {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {isFolder && isOpen && children.length > 0 && (
        <div>
          {children.map((child) => (
            <WikiTreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              childrenByParent={childrenByParent}
              selectedId={selectedId}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              canEdit={canEdit}
              onNewPage={onNewPage}
              onNewFolder={onNewFolder}
              onMove={onMove}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
