import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ArticleView } from '@/components/public/article-view';
import { StatusPill } from '@/components/admin/status';
import { requireUser } from '@/server/auth/current-user';
import { getArticleForEditor } from '@/server/content/editorial';
import { DomainError } from '@/server/content/errors';

export const metadata: Metadata = { title: 'Preview', robots: { index: false, follow: false } };

/** Renders any article the user may view, in the public reading layout, behind authentication. */
export default async function PreviewPage({ params }: PageProps<'/admin/articles/[id]/preview'>) {
  const user = await requireUser();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  let article;
  try {
    article = await getArticleForEditor(user, id);
  } catch (error) {
    if (error instanceof DomainError && error.code === 'not_found') notFound();
    throw error;
  }
  return (
    <div className="-mx-4 sm:-mx-8 -my-6 sm:-my-8 font-serif">
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 bg-accent text-accent-ink px-4 py-2 font-sans text-sm">
        <strong>Preview</strong>
        <StatusPill status={article.status} />
        <span>
          This is how the last saved version will look. It is not public unless published.
        </span>
        <Link href={`/admin/articles/${article.id}`} className="ml-auto underline">
          Back to editor
        </Link>
      </div>
      <ArticleView article={article} />
    </div>
  );
}
