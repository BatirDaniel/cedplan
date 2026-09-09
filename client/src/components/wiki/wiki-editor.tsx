import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Table as TableIcon,
} from 'lucide-react';

import { uploadsApi } from '@/api/workPackages';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface WikiEditorProps {
  content: string;
  editable: boolean;
  onChange: (html: string) => void;
}

export function WikiEditor({ content, editable, onChange }: WikiEditorProps) {
  const { t } = useTranslation();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: 'wiki-prose max-w-none font-serif text-[15px] leading-relaxed focus:outline-none min-h-[50vh]',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  React.useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

  async function insertImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = await uploadsApi.uploadImage(file);
      editor?.chain().focus().setImage({ src: url }).run();
    };
    input.click();
  }

  function toggleLink() {
    const previous = editor?.getAttributes('link').href as string | undefined;
    const url = window.prompt(t('wiki.linkPrompt'), previous ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  if (!editor) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {editable && (
        <div className="bg-background sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b pb-2">
          <ToolbarButton active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} label="H1">
            <Heading1 className="size-4" />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="H2">
            <Heading2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="H3">
            <Heading3 className="size-4" />
          </ToolbarButton>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} label={t('wiki.bold')}>
            <Bold className="size-4" />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} label={t('wiki.italic')}>
            <Italic className="size-4" />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} label={t('wiki.inlineCode')}>
            <Code className="size-4" />
          </ToolbarButton>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} label={t('wiki.bulletList')}>
            <List className="size-4" />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} label={t('wiki.orderedList')}>
            <ListOrdered className="size-4" />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()} label={t('wiki.checklist')}>
            <ListChecks className="size-4" />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} label={t('wiki.quote')}>
            <Quote className="size-4" />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} label={t('wiki.codeBlock')}>
            <span className="font-mono text-xs font-semibold">{'</>'}</span>
          </ToolbarButton>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <ToolbarButton active={editor.isActive('link')} onClick={toggleLink} label={t('wiki.link')}>
            <LinkIcon className="size-4" />
          </ToolbarButton>
          <ToolbarButton onClick={insertImage} label={t('wiki.image')}>
            <ImageIcon className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            label={t('wiki.table')}
          >
            <TableIcon className="size-4" />
          </ToolbarButton>
        </div>
      )}
      <div className="flex-1 pt-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('size-7', active && 'bg-accent text-accent-foreground')}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {children}
    </Button>
  );
}
