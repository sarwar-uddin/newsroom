'use client';

import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import type { RichTextDoc } from '@/lib/rich-text/schema';
import { isSafeHref } from '@/lib/rich-text/schema';

/**
 * Tiptap configured to produce exactly the node and mark types the server accepts
 * (see lib/rich-text/schema.ts). The server re-validates regardless.
 */
export function RichTextEditor({
  initial,
  onChange,
}: {
  initial: RichTextDoc;
  onChange: (doc: RichTextDoc) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        code: false,
        codeBlock: false,
        strike: false,
        underline: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: 'https',
          protocols: ['http', 'https', 'mailto'],
          isAllowedUri: (url) => isSafeHref(url),
        },
      }),
      Placeholder.configure({ placeholder: 'Write the story…' }),
    ],
    content: initial,
    editorProps: {
      attributes: {
        class: 'prose-article !max-w-none',
        'aria-label': 'Article body',
        role: 'textbox',
        'aria-multiline': 'true',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as RichTextDoc),
  });

  return (
    <div className="editor-surface border border-ink bg-[#fffdf8]">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      quote: e.isActive('blockquote'),
      ul: e.isActive('bulletList'),
      ol: e.isActive('orderedList'),
      link: e.isActive('link'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt(
      'Link URL (https://…, or leave empty to remove)',
      previous ?? 'https://',
    );
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    if (!isSafeHref(url.trim())) {
      window.alert('Only http, https and mailto links are allowed.');
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const btn = (
    label: string,
    active: boolean,
    run: () => void,
    title: string,
    disabled = false,
  ) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
      aria-pressed={active}
      aria-label={title}
      title={title}
      disabled={disabled}
      className={`px-2.5 py-1.5 text-sm font-semibold font-sans border-r border-rule disabled:opacity-30 ${active ? 'bg-ink text-paper' : 'hover:bg-paper-deep'}`}
    >
      {label}
    </button>
  );

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="sticky top-0 z-10 flex flex-wrap border-b border-ink bg-paper"
    >
      {btn('B', state.bold, () => editor.chain().focus().toggleBold().run(), 'Bold')}
      {btn('I', state.italic, () => editor.chain().focus().toggleItalic().run(), 'Italic')}
      {btn(
        'H2',
        state.h2,
        () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        'Heading',
      )}
      {btn(
        'H3',
        state.h3,
        () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        'Subheading',
      )}
      {btn('“ ”', state.quote, () => editor.chain().focus().toggleBlockquote().run(), 'Quote')}
      {btn(
        '• List',
        state.ul,
        () => editor.chain().focus().toggleBulletList().run(),
        'Bulleted list',
      )}
      {btn(
        '1. List',
        state.ol,
        () => editor.chain().focus().toggleOrderedList().run(),
        'Numbered list',
      )}
      {btn('Link', state.link, setLink, 'Link')}
      {btn('—', false, () => editor.chain().focus().setHorizontalRule().run(), 'Section break')}
      {btn('↶', false, () => editor.chain().focus().undo().run(), 'Undo', !state.canUndo)}
      {btn('↷', false, () => editor.chain().focus().redo().run(), 'Redo', !state.canRedo)}
    </div>
  );
}
