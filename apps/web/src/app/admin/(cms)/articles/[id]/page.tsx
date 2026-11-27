import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { deleteArticleAction, transitionArticleAction } from '@/app/admin/actions';
import { ArticleForm } from '@/components/admin/article-form';
import { StatusPill } from '@/components/admin/status';
import { formatDateTime } from '@/lib/dates';
import { requireUser } from '@/server/auth/current-user';
import { getArticleForEditor, getEditorOptions, getUserName } from '@/server/content/editorial';
import { DomainError } from '@/server/content/errors';
import {
  availableIntents,
  canChooseAnyByline,
  canDeleteArticle,
  canEditArticle,
  canSetFeatured,
  type Intent,
} from '@/server/content/workflow';

export const metadata = { title: 'Edit article' };

const doneMessages: Partial<Record<Intent, string>> = {
  save: 'Saved.',
  submit: 'Submitted for review.',
  withdraw: 'Withdrawn from review.',
  publish: 'Published. The article is live.',
  unpublish: 'Unpublished. The article is no longer public.',
  archive: 'Archived.',
  restore: 'Restored to draft.',
};

export default async function EditArticlePage({
  params,
  searchParams,
}: PageProps<'/admin/articles/[id]'>) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();

  let article;
  try {
    article = await getArticleForEditor(user, id);
  } catch (error) {
    if (error instanceof DomainError && error.code === 'not_found') notFound();
    throw error;
  }
  const options = await getEditorOptions();
  const editable = canEditArticle(user, article);
  const intents = availableIntents(user, article);
  const creator = await getUserName(article.createdBy);
  const done = typeof sp.done === 'string' ? doneMessages[sp.done as Intent] : undefined;
  const error = typeof sp.error === 'string' ? sp.error.slice(0, 300) : undefined;
  const media = article.featuredImage
    ? [
        {
          id: article.featuredImage.id,
          storageKey: article.featuredImage.storageKey,
          altText: article.featuredImage.altText,
        },
      ]
    : [];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <Link href="/admin/articles" className="meta !text-ink no-underline hover:underline">
          ← Articles
        </Link>
        <StatusPill status={article.status} />
        {article.status === 'published' && (
          <Link
            href={`/articles/${article.slug}`}
            target="_blank"
            className="meta !text-ink underline"
          >
            View live ↗
          </Link>
        )}
      </div>
      <h1 className="admin-h1 mb-1">{editable ? 'Edit article' : article.title}</h1>
      <p className="meta mb-6">
        Created by {creator ?? 'a removed user'} · Last saved {formatDateTime(article.updatedAt)}
        {article.publishedAt && ` · First published ${formatDateTime(article.publishedAt)}`}
      </p>
      {done && (
        <p
          role="status"
          className="mb-6 border-l-4 border-[#1f6b3a] bg-paper-deep px-3 py-2 text-sm"
        >
          {done}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-6 border-l-4 border-accent bg-paper-deep px-3 py-2 text-sm">
          {error}
        </p>
      )}

      {editable ? (
        <ArticleForm
          key={article.revision}
          initial={{
            id: article.id,
            revision: article.revision,
            status: article.status,
            title: article.title,
            slug: article.slug,
            dek: article.dek,
            excerpt: article.excerpt,
            body: article.body,
            authorId: article.authorId,
            categoryId: article.categoryId,
            tags: article.tags.map((t) => t.name).join(', '),
            featuredImage: article.featuredImage
              ? {
                  id: article.featuredImage.id,
                  storageKey: article.featuredImage.storageKey,
                  altText: article.featuredImage.altText,
                }
              : null,
            imageCaption: article.imageCaption,
            imageCredit: article.imageCredit,
            seoTitle: article.seoTitle,
            seoDescription: article.seoDescription,
            featured: article.featured,
          }}
          intents={intents}
          options={{
            authors: options.authors,
            categories: options.categories,
            media: [
              ...media,
              ...options.recentMedia.filter((m) => m.id !== article.featuredImageId),
            ],
          }}
          permissions={{
            chooseByline: canChooseAnyByline(user),
            setFeatured: canSetFeatured(user),
            editable,
          }}
        />
      ) : (
        <div className="admin-panel max-w-2xl flex flex-col gap-3">
          <p className="text-sm">
            This article is{' '}
            {article.status === 'review' ? 'with the editors for review' : article.status}. You
            can’t edit it in this state.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/articles/${article.id}/preview`}
              target="_blank"
              className="admin-btn"
            >
              Preview ↗
            </Link>
            {intents
              .filter((i) => i !== 'save')
              .map((intent) => (
                <form key={intent} action={transitionArticleAction}>
                  <input type="hidden" name="id" value={article.id} />
                  <button type="submit" name="intent" value={intent} className="admin-btn">
                    {intent === 'withdraw' ? 'Withdraw to edit' : intent}
                  </button>
                </form>
              ))}
          </div>
        </div>
      )}

      {canDeleteArticle(user, article) && (
        <form action={deleteArticleAction} className="mt-12 border-t border-rule pt-4">
          <input type="hidden" name="id" value={article.id} />
          <details>
            <summary className="meta cursor-pointer !text-accent">Delete this article…</summary>
            <p className="text-sm mt-2">Deletion is permanent and cannot be undone.</p>
            <button type="submit" className="admin-btn admin-btn-danger mt-2">
              Permanently delete
            </button>
          </details>
        </form>
      )}
    </div>
  );
}
