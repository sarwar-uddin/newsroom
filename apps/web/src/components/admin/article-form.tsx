'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState, useTransition } from 'react';
import { saveArticleAction, type ActionState } from '@/app/admin/actions';
import { slugify } from '@/lib/slug';
import type { RichTextDoc } from '@/lib/rich-text/schema';
import type { Intent } from '@/server/content/workflow';
import { ImagePicker, type PickerImage } from './image-picker';
import { RichTextEditor } from './rich-text-editor';

export type ArticleFormValues = {
  id?: string;
  revision?: number;
  status: 'draft' | 'review' | 'published' | 'archived';
  title: string;
  slug: string;
  dek: string;
  excerpt: string;
  body: RichTextDoc;
  authorId: string;
  categoryId: string;
  tags: string;
  featuredImage: PickerImage | null;
  imageCaption: string;
  imageCredit: string;
  seoTitle: string;
  seoDescription: string;
  featured: boolean;
};

const intentLabels: Record<Intent, string> = {
  save: 'Save',
  submit: 'Submit for review',
  withdraw: 'Withdraw from review',
  publish: 'Publish',
  unpublish: 'Unpublish',
  archive: 'Archive',
  restore: 'Restore to draft',
};

export function ArticleForm({
  initial,
  intents,
  options,
  permissions,
}: {
  initial: ArticleFormValues;
  intents: Intent[];
  options: {
    authors: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    media: PickerImage[];
  };
  permissions: { chooseByline: boolean; setFeatured: boolean; editable: boolean };
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveArticleAction, {});
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [body, setBody] = useState<RichTextDoc>(initial.body);
  const [dirty, setDirty] = useState(false);
  const errors = state.fieldErrors ?? {};
  const isNew = !initial.id;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // Submitting manually (rather than via `action=`) stops React from resetting the form when the
  // server returns validation errors, so nothing the writer typed is lost.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent = submitter?.value as Intent | undefined;
    if (
      intent === 'publish' &&
      !window.confirm('Publish this article now? It will be visible to everyone.')
    )
      return;
    if (
      intent === 'unpublish' &&
      !window.confirm('Unpublish this article? It will disappear from the public site.')
    )
      return;
    const fd = new FormData(e.currentTarget, submitter);
    fd.set('body', JSON.stringify(body));
    setDirty(false);
    startTransition(() => formAction(fd));
  }

  const fieldProps = (name: string) => ({
    name,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
    disabled: !permissions.editable,
  });

  return (
    <form
      onSubmit={onSubmit}
      onChange={() => setDirty(true)}
      className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]"
      noValidate
    >
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {initial.revision !== undefined && (
        <input type="hidden" name="revision" value={initial.revision} />
      )}

      <div className="flex flex-col gap-5 min-w-0">
        {state.message && (
          <p role="alert" className="border-l-4 border-accent bg-paper-deep px-3 py-2 text-sm">
            {state.message}
          </p>
        )}
        {!permissions.editable && (
          <p className="border-l-4 border-ink bg-paper-deep px-3 py-2 text-sm">
            This article is read-only for you in its current state.
          </p>
        )}
        <label className="admin-label">
          Headline
          <textarea
            {...fieldProps('title')}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            rows={2}
            maxLength={300}
            required
            className="admin-input !font-headline !text-3xl !leading-tight resize-none"
          />
          <FieldError errors={errors} name="title" />
        </label>
        <label className="admin-label">
          Standfirst / dek
          <textarea
            {...fieldProps('dek')}
            defaultValue={initial.dek}
            rows={2}
            maxLength={500}
            className="admin-input !font-serif !text-lg"
          />
          <FieldError errors={errors} name="dek" />
        </label>
        <div className="admin-label">
          <span>Body</span>
          {permissions.editable ? (
            <RichTextEditor
              initial={initial.body}
              onChange={(doc) => {
                setBody(doc);
                setDirty(true);
              }}
            />
          ) : (
            <p className="admin-hint">Open the preview to read the body.</p>
          )}
          <FieldError errors={errors} name="body" />
        </div>
        <label className="admin-label">
          Excerpt{' '}
          <span className="admin-hint">
            Used on listings and in search results when there is no dek.
          </span>
          <textarea
            {...fieldProps('excerpt')}
            defaultValue={initial.excerpt}
            rows={3}
            maxLength={1000}
            className="admin-input"
          />
          <FieldError errors={errors} name="excerpt" />
        </label>
        <fieldset className="admin-panel flex flex-col gap-4">
          <legend className="kicker !text-ink px-1">Search & social</legend>
          <label className="admin-label">
            SEO title <span className="admin-hint">Defaults to the headline.</span>
            <input
              {...fieldProps('seoTitle')}
              defaultValue={initial.seoTitle}
              maxLength={200}
              className="admin-input"
            />
          </label>
          <label className="admin-label">
            SEO description{' '}
            <span className="admin-hint">Defaults to the dek. Aim for under 160 characters.</span>
            <textarea
              {...fieldProps('seoDescription')}
              defaultValue={initial.seoDescription}
              rows={2}
              maxLength={320}
              className="admin-input"
            />
          </label>
        </fieldset>
      </div>

      <aside className="flex flex-col gap-5">
        <div className="admin-panel flex flex-col gap-2 xl:sticky xl:top-4">
          <p className="meta">
            Status:{' '}
            <strong className="!text-ink">
              {initial.status === 'review' ? 'In review' : initial.status}
            </strong>
          </p>
          <div className="flex flex-wrap gap-2">
            {intents.map((intent) => (
              <button
                key={intent}
                type="submit"
                name="intent"
                value={intent}
                disabled={pending}
                className={`admin-btn ${intent === 'publish' || (intent === 'save' && !intents.includes('publish')) ? 'admin-btn-primary' : ''} ${intent === 'unpublish' || intent === 'archive' ? 'admin-btn-danger' : ''}`}
              >
                {intent === 'save' && isNew ? 'Save draft' : intentLabels[intent]}
              </button>
            ))}
          </div>
          {initial.id && (
            <Link
              href={`/admin/articles/${initial.id}/preview`}
              target="_blank"
              className="admin-btn self-start"
            >
              Preview ↗
            </Link>
          )}
          <p className="admin-hint">
            {pending
              ? 'Saving…'
              : dirty
                ? 'Unsaved changes.'
                : initial.id
                  ? 'Preview shows the last saved version.'
                  : 'Save once to enable preview.'}
          </p>
        </div>

        <label className="admin-label">
          Slug
          <input
            {...fieldProps('slug')}
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
            maxLength={120}
            className="admin-input !font-mono !text-sm"
          />
          <span className="admin-hint">/articles/{slug || '…'}</span>
          {initial.status === 'published' && (
            <span className="admin-hint">Changing a published slug breaks existing links.</span>
          )}
          <FieldError errors={errors} name="slug" />
        </label>

        <label className="admin-label">
          Section
          <select
            {...fieldProps('categoryId')}
            defaultValue={initial.categoryId}
            required
            className="admin-input"
          >
            <option value="">Choose…</option>
            {options.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <FieldError errors={errors} name="categoryId" />
        </label>

        <label className="admin-label">
          Byline
          {permissions.chooseByline ? (
            <select
              {...fieldProps('authorId')}
              defaultValue={initial.authorId}
              required
              className="admin-input"
            >
              <option value="">Choose…</option>
              {options.authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          ) : (
            <>
              <input type="hidden" name="authorId" value={initial.authorId} />
              <span className="admin-hint">
                {options.authors.find((a) => a.id === initial.authorId)?.name ?? 'Your byline'}
              </span>
            </>
          )}
          <FieldError errors={errors} name="authorId" />
        </label>

        <label className="admin-label">
          Tags{' '}
          <span className="admin-hint">Comma-separated. New tags are created automatically.</span>
          <input {...fieldProps('tags')} defaultValue={initial.tags} className="admin-input" />
          <FieldError errors={errors} name="tags" />
        </label>

        {permissions.setFeatured && (
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={initial.featured}
              disabled={!permissions.editable}
              className="h-4 w-4 accent-[#b8321c]"
            />
            Feature on the front page
          </label>
        )}

        <fieldset className="admin-panel flex flex-col gap-3">
          <legend className="kicker !text-ink px-1">Featured image</legend>
          <ImagePicker
            name="featuredImageId"
            initial={initial.featuredImage}
            library={options.media}
            error={errors.featuredImageId}
          />
          <label className="admin-label">
            Caption
            <textarea
              {...fieldProps('imageCaption')}
              defaultValue={initial.imageCaption}
              rows={2}
              maxLength={500}
              className="admin-input"
            />
          </label>
          <label className="admin-label">
            Credit
            <input
              {...fieldProps('imageCredit')}
              defaultValue={initial.imageCredit}
              maxLength={200}
              className="admin-input"
            />
          </label>
        </fieldset>
      </aside>
    </form>
  );
}

function FieldError({ errors, name }: { errors: Record<string, string>; name: string }) {
  if (!errors[name]) return null;
  return (
    <span id={`${name}-error`} className="admin-error">
      {errors[name]}
    </span>
  );
}
