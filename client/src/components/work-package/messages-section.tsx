import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Send, X } from 'lucide-react';
import { toast } from 'sonner';

import { workPackagesApi, uploadsApi } from '@/api/workPackages';
import { useCommentsHub } from '@/lib/useCommentsHub';
import { formatDate, initials } from '@/lib/ui';
import { cn } from '@/lib/utils';
import type { Comment } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface Member {
  userId: string;
  fullName: string;
  avatarColor: string;
}

interface Props {
  projectId: string;
  workPackageId: string;
  comments?: Comment[];
  members: Member[];
}

/** Renders message text with @Full Name mentions highlighted. */
function MessageBody({ text, mentionedUserIds, members }: { text: string; mentionedUserIds: string[]; members: Member[] }) {
  if (mentionedUserIds.length === 0) return <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{text}</p>;

  const names = mentionedUserIds
    .map((id) => members.find((m) => m.userId === id)?.fullName)
    .filter((n): n is string => !!n)
    .sort((a, b) => b.length - a.length);

  if (names.length === 0) return <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{text}</p>;

  const pattern = new RegExp(`(@(?:${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}))`, 'g');
  const parts = text.split(pattern);

  return (
    <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">
      {parts.map((part, i) =>
        part.startsWith('@') && names.includes(part.slice(1)) ? (
          <span key={i} className="text-primary font-medium bg-primary/10 rounded px-1">
            {part}
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </p>
  );
}

export function MessagesSection({ projectId, workPackageId, comments, members }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [text, setText] = React.useState('');
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [mentioned, setMentioned] = React.useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [lightboxUrl, setLightboxUrl] = React.useState<string | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const listEndRef = React.useRef<HTMLDivElement>(null);

  const queryKey = ['comments', projectId, workPackageId];

  useCommentsHub(workPackageId, (comment) => {
    queryClient.setQueryData<Comment[]>(queryKey, (old) => {
      if (!old) return [comment];
      if (old.some((c) => c.id === comment.id)) return old;
      return [...old, comment];
    });
  });

  React.useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: 'end' });
  }, [comments?.length]);

  const addMutation = useMutation({
    mutationFn: () => workPackagesApi.addComment(projectId, workPackageId, text, imageUrl, mentioned),
    onSuccess: (comment) => {
      queryClient.setQueryData<Comment[]>(queryKey, (old) => (old?.some((c) => c.id === comment.id) ? old : [...(old ?? []), comment]));
      setText('');
      setImageUrl(null);
      setMentioned([]);
    },
    onError: () => toast.error(t('workPackage.updateFailed')),
  });

  const mentionMatches = React.useMemo(() => {
    if (mentionQuery === null) return [];
    return members.filter((m) => m.fullName.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6);
  }, [mentionQuery, members]);

  function onTextChange(value: string) {
    setText(value);
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const upToCursor = value.slice(0, cursor);
    const match = /(?:^|\s)@([\w\s]{0,30})$/.exec(upToCursor);
    setMentionQuery(match ? match[1] : null);
  }

  function insertMention(member: Member) {
    const cursor = textareaRef.current?.selectionStart ?? text.length;
    const upToCursor = text.slice(0, cursor);
    const replaced = upToCursor.replace(/(?:^|\s)@([\w\s]{0,30})$/, (m) => (m.startsWith(' ') ? ' ' : '') + `@${member.fullName} `);
    const newText = replaced + text.slice(cursor);
    const newCursor = replaced.length;
    setText(newText);
    setMentionQuery(null);
    setMentioned((prev) => (prev.includes(member.userId) ? prev : [...prev, member.userId]));
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(newCursor, newCursor);
    });
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadsApi.uploadImage(file);
      setImageUrl(url);
    } catch {
      toast.error(t('detail.uploading'));
    } finally {
      setUploading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && !imageUrl) return;
    addMutation.mutate();
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {comments?.length === 0 && <p className="text-muted-foreground text-xs">{t('detail.noComments')}</p>}
        {comments?.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <Avatar className="size-6 mt-0.5">
              <AvatarFallback style={{ backgroundColor: c.authorColor }}>{initials(c.authorName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 bg-muted rounded-lg px-3 py-2 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium">{c.authorName}</span>
                <span className="text-muted-foreground text-xs">{formatDate(c.createdAt)}</span>
              </div>
              {c.text && <MessageBody text={c.text} mentionedUserIds={c.mentionedUserIds} members={members} />}
              {c.imageUrl && (
                <button type="button" onClick={() => setLightboxUrl(c.imageUrl!)} className="mt-2 block cursor-zoom-in">
                  <img
                    src={c.imageUrl}
                    alt=""
                    className="max-h-48 rounded-md border object-cover transition-opacity hover:opacity-90"
                  />
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={listEndRef} />
      </div>

      <form onSubmit={onSubmit} className="space-y-2">
        {imageUrl && (
          <div className="relative inline-block">
            <img src={imageUrl} alt="" className="max-h-24 rounded-md border" />
            <button
              type="button"
              onClick={() => setImageUrl(null)}
              className="bg-background absolute -top-1.5 -right-1.5 rounded-full border p-0.5 shadow-sm"
            >
              <X className="size-3" />
            </button>
          </div>
        )}

        <div className="relative">
          {mentionQuery !== null && mentionMatches.length > 0 && (
            <div className="bg-popover absolute bottom-full left-0 z-20 mb-1 w-56 rounded-md border py-1 shadow-md">
              {mentionMatches.map((m) => (
                <button
                  type="button"
                  key={m.userId}
                  onClick={() => insertMention(m)}
                  className="hover:bg-accent flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm"
                >
                  <Avatar className="size-5">
                    <AvatarFallback style={{ backgroundColor: m.avatarColor }}>{initials(m.fullName)}</AvatarFallback>
                  </Avatar>
                  {m.fullName}
                </button>
              ))}
            </div>
          )}
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder={t('detail.writeMessage')}
            rows={2}
            className="pr-16"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileSelected} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              title={t('detail.attachImage')}
            >
              <ImagePlus className={cn('size-4', uploading && 'animate-pulse')} />
            </Button>
            <Button type="submit" size="icon" className="size-7" disabled={addMutation.isPending}>
              <Send className="size-3.5" />
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground text-[11px]">{t('detail.mentionHint')}</p>
      </form>

      <Dialog open={!!lightboxUrl} onOpenChange={(o) => !o && setLightboxUrl(null)}>
        <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none [&>button]:text-white">
          <DialogTitle className="sr-only">{t('detail.attachImage')}</DialogTitle>
          {lightboxUrl && <img src={lightboxUrl} alt="" className="max-h-[85vh] w-full rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
