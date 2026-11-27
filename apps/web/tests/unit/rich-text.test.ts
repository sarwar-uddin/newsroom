import { describe, expect, it } from 'vitest';
import { isSafeHref, parseRichText, richTextDocSchema } from '@/lib/rich-text/schema';
import {
  docFromMarkup,
  docToPlainText,
  readingTimeMinutes,
  truncateText,
} from '@/lib/rich-text/text';

describe('rich text schema', () => {
  it('accepts the documents the editor produces', () => {
    const doc = docFromMarkup(
      '## Heading\n\nA **bold** and *italic* line.\n\n> Quote\n\n- one\n- two\n\n---',
    );
    expect(richTextDocSchema.parse(doc)).toEqual(doc);
  });

  it('rejects javascript: and data: links', () => {
    for (const href of [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      'data:text/html,<script>',
      '//evil.example',
    ]) {
      expect(isSafeHref(href)).toBe(false);
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href } }] }],
          },
        ],
      };
      expect(richTextDocSchema.safeParse(doc).success).toBe(false);
    }
    expect(isSafeHref('https://example.org')).toBe(true);
    expect(isSafeHref('/articles/x')).toBe(true);
    expect(isSafeHref('mailto:desk@example.org')).toBe(true);
  });

  it('rejects unknown node types such as raw HTML or images', () => {
    for (const node of [
      { type: 'html', content: '<script>' },
      { type: 'image', attrs: { src: 'x' } },
      { type: 'codeBlock' },
    ]) {
      expect(richTextDocSchema.safeParse({ type: 'doc', content: [node] }).success).toBe(false);
    }
  });

  it('strips unknown attributes instead of storing them', () => {
    const doc = parseRichText(
      JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'x',
                marks: [
                  {
                    type: 'link',
                    attrs: { href: 'https://a.example', onclick: 'evil()', target: '_blank' },
                  },
                ],
              },
            ],
          },
        ],
      }),
    );
    const mark = (doc.content[0] as { content: { marks: { attrs: object }[] }[] }).content[0]!
      .marks[0]!;
    expect(mark.attrs).toEqual({ href: 'https://a.example' });
  });

  it('rejects malformed JSON and invalid heading levels', () => {
    expect(() => parseRichText('{nope')).toThrow();
    expect(
      richTextDocSchema.safeParse({
        type: 'doc',
        content: [{ type: 'heading', attrs: { level: 1 } }],
      }).success,
    ).toBe(false);
  });

  it('rejects pathologically deep nesting', () => {
    let node: object = { type: 'paragraph', content: [{ type: 'text', text: 'x' }] };
    for (let i = 0; i < 30; i++) node = { type: 'blockquote', content: [node] };
    expect(richTextDocSchema.safeParse({ type: 'doc', content: [node] }).success).toBe(false);
  });
});

describe('plain text projection', () => {
  it('extracts text and computes reading time', () => {
    const doc = docFromMarkup('Hello **world**.\n\n- a\n- b');
    expect(docToPlainText(doc)).toBe('Hello world.\n\na\nb');
    expect(readingTimeMinutes('word '.repeat(10))).toBe(1);
    expect(readingTimeMinutes('word '.repeat(461))).toBe(3);
  });

  it('truncates on word boundaries', () => {
    expect(truncateText('one two three four', 9)).toBe('one two…');
    expect(truncateText('short', 10)).toBe('short');
  });
});
