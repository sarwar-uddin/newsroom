import { Fragment, type ReactNode } from 'react';
import type { BlockNode, InlineNode, RichTextDoc, TextNode } from './schema';
import { isSafeHref } from './schema';

/**
 * Server-side renderer for validated article documents. Every output element is constructed
 * explicitly from an allow-listed node type; text is escaped by React. There is no
 * `dangerouslySetInnerHTML` anywhere in the content path.
 */
export function RichText({ doc }: { doc: RichTextDoc }) {
  return <>{doc.content.map((node, i) => renderBlock(node, i))}</>;
}

function renderBlock(node: BlockNode, key: number): ReactNode {
  switch (node.type) {
    case 'paragraph':
      if (!node.content?.length) return null;
      return <p key={key}>{renderInline(node.content)}</p>;
    case 'heading': {
      const Tag = `h${node.attrs.level}` as 'h2' | 'h3' | 'h4';
      return <Tag key={key}>{renderInline(node.content)}</Tag>;
    }
    case 'blockquote':
      return <blockquote key={key}>{node.content.map(renderBlock)}</blockquote>;
    case 'bulletList':
      return (
        <ul key={key}>
          {node.content.map((li, i) => (
            <li key={i}>{li.content.map(renderBlock)}</li>
          ))}
        </ul>
      );
    case 'orderedList':
      return (
        <ol key={key} start={node.attrs?.start}>
          {node.content.map((li, i) => (
            <li key={i}>{li.content.map(renderBlock)}</li>
          ))}
        </ol>
      );
    case 'horizontalRule':
      return <hr key={key} />;
  }
}

function renderInline(nodes: InlineNode[] | undefined): ReactNode {
  if (!nodes) return null;
  return nodes.map((n, i) => (n.type === 'hardBreak' ? <br key={i} /> : renderText(n, i)));
}

function renderText(node: TextNode, key: number): ReactNode {
  let out: ReactNode = node.text;
  for (const mark of node.marks ?? []) {
    if (mark.type === 'bold') out = <strong>{out}</strong>;
    else if (mark.type === 'italic') out = <em>{out}</em>;
    else if (mark.type === 'link' && isSafeHref(mark.attrs.href)) {
      const external = /^https?:/i.test(mark.attrs.href);
      out = (
        <a href={mark.attrs.href} rel={external ? 'noopener noreferrer' : undefined}>
          {out}
        </a>
      );
    }
  }
  return <Fragment key={key}>{out}</Fragment>;
}
