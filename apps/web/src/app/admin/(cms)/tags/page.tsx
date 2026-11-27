import Link from 'next/link';
import { deleteTagAction } from '@/app/admin/actions';
import { requireRole } from '@/server/auth/current-user';
import { listTagsWithCounts } from '@/server/content/taxonomy';

export const metadata = { title: 'Tags' };

export default async function TagsPage() {
  await requireRole('admin', 'editor');
  const tags = await listTagsWithCounts();
  return (
    <div className="max-w-3xl">
      <h1 className="admin-h1">Tags</h1>
      <p className="admin-hint mt-2">
        Tags are created from the article editor. Deleting a tag removes it from every article.
      </p>
      <table className="mt-6 w-full text-sm border-t-2 border-ink">
        <tbody className="divide-y divide-rule">
          {tags.map((t) => (
            <tr key={t.id}>
              <td className="py-2 font-semibold">
                <Link
                  href={`/tags/${t.slug}`}
                  target="_blank"
                  className="no-underline hover:underline"
                >
                  {t.name}
                </Link>
              </td>
              <td className="py-2 meta">{t.articleCount} articles</td>
              <td className="py-2 text-right">
                <form action={deleteTagAction}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" className="meta !text-accent underline">
                    Delete
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {tags.length === 0 && (
            <tr>
              <td className="py-6 text-muted">No tags yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
