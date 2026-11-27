import { z } from 'zod';

/**
 * The stored article body format: a strict subset of the ProseMirror JSON produced by the Tiptap
 * editor. Anything outside this allow-list (unknown nodes, marks, attributes, raw HTML) is
 * rejected or stripped before it reaches the database, and the public renderer only knows these
 * node types. This is the rendering boundary: no HTML string is ever stored or injected.
 */

export const ALLOWED_LINK_PROTOCOLS = ['http:', 'https:', 'mailto:'] as const;

export function isSafeHref(href: string): boolean {
  if (href.startsWith('/') && !href.startsWith('//')) return true; // site-relative
  try {
    const url = new URL(href);
    return (ALLOWED_LINK_PROTOCOLS as readonly string[]).includes(url.protocol);
  } catch {
    return false;
  }
}

export type BoldMark = { type: 'bold' };
export type ItalicMark = { type: 'italic' };
export type LinkMark = { type: 'link'; attrs: { href: string } };
export type RichTextMark = BoldMark | ItalicMark | LinkMark;

export type TextNode = { type: 'text'; text: string; marks?: RichTextMark[] };
export type HardBreakNode = { type: 'hardBreak' };
export type InlineNode = TextNode | HardBreakNode;

export type ParagraphNode = { type: 'paragraph'; content?: InlineNode[] };
export type HeadingNode = { type: 'heading'; attrs: { level: 2 | 3 | 4 }; content?: InlineNode[] };
export type BlockquoteNode = { type: 'blockquote'; content: BlockNode[] };
export type ListItemNode = { type: 'listItem'; content: BlockNode[] };
export type BulletListNode = { type: 'bulletList'; content: ListItemNode[] };
export type OrderedListNode = {
  type: 'orderedList';
  attrs?: { start?: number };
  content: ListItemNode[];
};
export type HorizontalRuleNode = { type: 'horizontalRule' };
export type BlockNode =
  | ParagraphNode
  | HeadingNode
  | BlockquoteNode
  | BulletListNode
  | OrderedListNode
  | HorizontalRuleNode;

export type RichTextDoc = { type: 'doc'; content: BlockNode[] };

const markSchema: z.ZodType<RichTextMark> = z.discriminatedUnion('type', [
  z.object({ type: z.literal('bold') }),
  z.object({ type: z.literal('italic') }),
  z.object({
    type: z.literal('link'),
    attrs: z.object({
      href: z.string().trim().max(2000).refine(isSafeHref, 'Links must use http, https or mailto'),
    }),
  }),
]);

const textSchema: z.ZodType<TextNode> = z.object({
  type: z.literal('text'),
  text: z.string().min(1).max(100_000),
  marks: z.array(markSchema).max(5).optional(),
});

const inlineSchema: z.ZodType<InlineNode> = z.union([
  textSchema,
  z.object({ type: z.literal('hardBreak') }),
]);

const inlineContent = z.array(inlineSchema).max(5000).optional();

const listItemSchema: z.ZodType<ListItemNode> = z.lazy(() =>
  z.object({ type: z.literal('listItem'), content: z.array(blockSchema).min(1).max(100) }),
);

const blockSchema: z.ZodType<BlockNode> = z.lazy(() =>
  z.union([
    z.object({ type: z.literal('paragraph'), content: inlineContent }),
    z.object({
      type: z.literal('heading'),
      attrs: z.object({ level: z.union([z.literal(2), z.literal(3), z.literal(4)]) }),
      content: inlineContent,
    }),
    z.object({ type: z.literal('blockquote'), content: z.array(blockSchema).min(1).max(100) }),
    z.object({ type: z.literal('bulletList'), content: z.array(listItemSchema).min(1).max(500) }),
    z.object({
      type: z.literal('orderedList'),
      attrs: z.object({ start: z.number().int().min(0).max(100_000).optional() }).optional(),
      content: z.array(listItemSchema).min(1).max(500),
    }),
    z.object({ type: z.literal('horizontalRule') }),
  ]),
);

export const MAX_NESTING_DEPTH = 8;

function depth(node: { content?: unknown[] }): number {
  if (!Array.isArray(node.content) || node.content.length === 0) return 1;
  let max = 0;
  for (const child of node.content) {
    if (child && typeof child === 'object')
      max = Math.max(max, depth(child as { content?: unknown[] }));
  }
  return 1 + max;
}

export const richTextDocSchema: z.ZodType<RichTextDoc> = z
  .object({ type: z.literal('doc'), content: z.array(blockSchema).max(5000) })
  .refine((doc) => depth(doc) <= MAX_NESTING_DEPTH + 2, 'Document is nested too deeply');

export const EMPTY_DOC: RichTextDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

/** Parses untrusted JSON text into a validated document. */
export function parseRichText(json: string): RichTextDoc {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('Article body is not valid JSON');
  }
  return richTextDocSchema.parse(raw);
}
