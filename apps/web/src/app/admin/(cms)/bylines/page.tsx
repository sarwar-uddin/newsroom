import { saveAuthorAction } from '@/app/admin/actions';
import { ActionForm } from '@/components/admin/action-form';
import { requireRole } from '@/server/auth/current-user';
import { listMedia } from '@/server/media/upload';
import { listAuthors } from '@/server/content/taxonomy';
import type { SocialLinks } from '@/server/db/schema';

export const metadata = { title: 'Bylines' };

type MediaOption = { id: string; label: string };

export default async function BylinesPage() {
  await requireRole('admin', 'editor');
  const [authors, media] = await Promise.all([listAuthors(), listMedia(100)]);
  const mediaOptions = media.map((m) => ({ id: m.id, label: m.altText || m.originalFilename }));
  return (
    <div className="max-w-4xl">
      <h1 className="admin-h1">Bylines</h1>
      <p className="admin-hint mt-2">
        Public contributor profiles. A byline doesn’t need a CMS account. Accounts are created with
        the CLI.
      </p>
      <ul className="mt-6 flex flex-col gap-4">
        {authors.map((a) => (
          <li key={a.id} className="admin-panel">
            <details>
              <summary className="cursor-pointer flex flex-wrap items-baseline gap-3">
                <span className="font-headline text-xl">{a.name}</span>
                <span className="meta">
                  /authors/{a.slug} · {a.articleCount} articles
                </span>
              </summary>
              <ActionForm action={saveAuthorAction} className="mt-4 flex flex-col gap-3">
                <input type="hidden" name="id" value={a.id} />
                <AuthorFields values={a} media={mediaOptions} />
              </ActionForm>
            </details>
          </li>
        ))}
      </ul>
      <section className="mt-10">
        <h2 className="kicker !text-ink border-b-2 border-ink pb-2 mb-4">Add a byline</h2>
        <ActionForm
          action={saveAuthorAction}
          submitLabel="Create byline"
          className="admin-panel flex flex-col gap-3"
        >
          <AuthorFields media={mediaOptions} />
        </ActionForm>
      </section>
    </div>
  );
}

function AuthorFields({
  values,
  media,
}: {
  values?: {
    name: string;
    slug: string;
    biography: string;
    socialLinks: SocialLinks;
    avatarMediaId: string | null;
  };
  media: MediaOption[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="admin-label">
        Name
        <input
          name="name"
          required
          maxLength={160}
          defaultValue={values?.name}
          className="admin-input"
        />
      </label>
      <label className="admin-label">
        Slug <span className="admin-hint">Blank = from name</span>
        <input
          name="slug"
          maxLength={120}
          defaultValue={values?.slug}
          className="admin-input !font-mono"
        />
      </label>
      <label className="admin-label sm:col-span-2">
        Biography
        <textarea
          name="biography"
          rows={3}
          maxLength={3000}
          defaultValue={values?.biography}
          className="admin-input"
        />
      </label>
      <label className="admin-label">
        Portrait <span className="admin-hint">Upload in Media first</span>
        <select
          name="avatarMediaId"
          defaultValue={values?.avatarMediaId ?? ''}
          className="admin-input"
        >
          <option value="">None</option>
          {media.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <label className="admin-label">
        Website
        <input
          name="website"
          type="url"
          placeholder="https://"
          defaultValue={values?.socialLinks.website}
          className="admin-input"
        />
      </label>
      <label className="admin-label">
        X
        <input
          name="x"
          type="url"
          placeholder="https://x.com/…"
          defaultValue={values?.socialLinks.x}
          className="admin-input"
        />
      </label>
      <label className="admin-label">
        Instagram
        <input
          name="instagram"
          type="url"
          placeholder="https://instagram.com/…"
          defaultValue={values?.socialLinks.instagram}
          className="admin-input"
        />
      </label>
    </div>
  );
}
