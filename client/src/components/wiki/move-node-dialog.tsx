import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Folder, FolderTree } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { WikiPage } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface MoveNodeDialogProps {
  node: WikiPage | null;
  nodes: WikiPage[];
  onClose: () => void;
  onConfirm: (newParentId: string | null) => void;
}

export function MoveNodeDialog({ node, nodes, onClose, onConfirm }: MoveNodeDialogProps) {
  const { t } = useTranslation();
  const [target, setTarget] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (node) setTarget(node.parentId);
  }, [node?.id]);

  const excludedIds = React.useMemo(() => {
    if (!node) return new Set<string>();
    const excluded = new Set<string>([node.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const n of nodes) {
        if (n.parentId && excluded.has(n.parentId) && !excluded.has(n.id)) {
          excluded.add(n.id);
          changed = true;
        }
      }
    }
    return excluded;
  }, [node, nodes]);

  const folders = nodes.filter((n) => n.nodeType === 0 && !excludedIds.has(n.id));

  function folderDepthLabel(f: WikiPage): string {
    const parts = [f.title];
    let cursor = f.parentId;
    while (cursor) {
      const parent = nodes.find((n) => n.id === cursor);
      if (!parent) break;
      parts.unshift(parent.title);
      cursor = parent.parentId;
    }
    return parts.join(' / ');
  }

  return (
    <Dialog open={!!node} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('wiki.moveTitle', { title: node?.title })}</DialogTitle>
          <DialogDescription>{t('wiki.moveDesc')}</DialogDescription>
        </DialogHeader>

        <div className="max-h-72 space-y-0.5 overflow-y-auto">
          <button
            type="button"
            onClick={() => setTarget(null)}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm',
              target === null ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-accent/50'
            )}
          >
            <FolderTree className="size-4" />
            {t('wiki.rootLevel')}
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setTarget(f.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm',
                target === f.id ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-accent/50'
              )}
            >
              <Folder className="size-4 shrink-0" />
              <span className="truncate">{folderDepthLabel(f)}</span>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => node && onConfirm(target)}>{t('wiki.moveHere')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
