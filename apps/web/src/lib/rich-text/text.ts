import type { BlockNode, InlineNode, RichTextDoc } from './schema';

function inlineText(nodes: InlineNode[] | undefined): string {
  if (!nodes) return '';
  return nodes.map((n) => (n.type === 'text' ? n.text : '\n')).join('');
}

function blockText(node: BlockNode): string {
  switch (node.type) {
    case 'paragraph':
    case 'heading':
      return inlineText(node.content);
    case 'blockquote':
      return node.content.map(blockText).join('\n\n');
    case 'bulletList':
    case 'orderedList':
      return node.content.map((li) => li.content.map(blockText).join('\n')).join('\n');
    case 'horizontalRule':
      return '';
  }
}

/** Plain-text projection used for search indexing, reading time and fallback excerpts. */
export function docToPlainText(doc: RichTextDoc): string {
  return doc.content
    .map(blockText)
    .filter((s) => s.trim().length > 0)
    .join('\n\n');
}

export function countWords(text: string): number {
  const words = text.trim().split(/\s+/u).filter(Boolean);
  return words.length;
}

const WORDS_PER_MINUTE = 230;

export function readingTimeMinutes(text: string): number {
  return Math.max(1, Math.ceil(countWords(text) / WORDS_PER_MINUTE));
}

export function truncateText(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : max).trimEnd()}…`;
}

/**
 * Builds a document from lightweight markup: blank-line separated blocks; `## ` / `### ` headings;
 * `> ` quotes; `- ` bullet lists; `---` rules; `**bold**` and `*italic*` inline. Used by the seed.
 */
export function docFromMarkup(markup: string): RichTextDoc {
  const blocks = markup.trim().split(/\n\s*\n/);
  const content: BlockNode[] = blocks.map((raw) => {
    const block = raw.trim();
    if (block === '---') return { type: 'horizontalRule' };
    if (block.startsWith('### '))
      return { type: 'heading', attrs: { level: 3 }, content: inline(block.slice(4)) };
    if (block.startsWith('## '))
      return { type: 'heading', attrs: { level: 2 }, content: inline(block.slice(3)) };
    if (block.startsWith('> ')) {
      return {
        type: 'blockquote',
        content: [{ type: 'paragraph', content: inline(block.replace(/^> ?/gm, '')) }],
      };
    }
    if (block.startsWith('- ')) {
      return {
        type: 'bulletList',
        content: block.split('\n').map((line) => ({
          type: 'listItem' as const,
          content: [{ type: 'paragraph' as const, content: inline(line.replace(/^- /, '')) }],
        })),
      };
    }
    return { type: 'paragraph', content: inline(block.replace(/\n/g, ' ')) };
  });
  return { type: 'doc', content };
}

function inline(text: string): InlineNode[] {
  const out: InlineNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push({ type: 'text', text: text.slice(last, m.index) });
    if (m[1]) out.push({ type: 'text', text: m[1], marks: [{ type: 'bold' }] });
    else if (m[2]) out.push({ type: 'text', text: m[2], marks: [{ type: 'italic' }] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return out;
}
