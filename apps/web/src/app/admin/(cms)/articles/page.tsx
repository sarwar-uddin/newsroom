import Link from 'next/link';
import { StatusPill } from '@/components/admin/status';
import { Pagination, parsePage } from '@/components/public/pagination';
import { formatDateTime } from '@/lib/dates';
import { requireUser } from '@/server/auth/current-user';
import { listArticlesForAdmin } from '@/server/content/editorial';
import { articleStatus, type ArticleStatus } from '@/server/db/schema';

export const metadata = { title: 'Articles' };

const statuses = articleStatus.enumValues;

export default async function ArticlesPage({ searchParams }: PageProps<'/admin/articles'>) {
  const user = await requireUser();
  const sp = await searchParams;
  const statusParam = typeof sp.status === 'string' ? sp.status : '';
  const status = (statuses as readonly string[]).includes(statusParam)
    ? (statusParam as ArticleStatus)
    : undefined;
  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 200) : '';
  const page = parsePage(sp.page);
  const result = await listArticlesForAdmin(user, { status, q: q || undefined, page });

  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    if (p > 1) params.set('page', String(p));
    const s = params.toString();
    return `/admin/articles${s ? `?${s}` : ''}`;
  };

  return (
    <div className="max-w-6xl">
      {sp.deleted && (
        <p role="status" className="mb-4 border-l-4 border-ink bg-paper-deep px-3 py-2 text-sm">
          Article deleted.
        </p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="admin-h1">Articles</h1>
        <Link href="/admin/articles/new" className="admin-btn admin-btn-primary">
          + New article
        </Link>
      </div>

      <form method="get" className="mt-6 flex flex-wrap gap-2 items-end">
        <label className="admin-label">
          Status
          <select name="status" defaultValue={status ?? ''} className="admin-input !w-40">
            <option value="">All</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s === 'review' ? 'In review' : s[0]!.toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-label flex-1 min-w-[12rem]">
          Headline or slug
          <input name="q" defaultValue={q} className="admin-input" type="search" />
        </label>
        <button type="submit" className="admin-btn">
          Filter
        </button>
      </form>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm border-t-2 border-ink">
          <thead>
            <tr className="text-left meta border-b border-ink">
              <th className="py-2 pr-3 font-normal">Headline</th>
              <th className="py-2 pr-3 font-normal">Status</th>
              <th className="py-2 pr-3 font-normal hidden md:table-cell">Section</th>
              <th className="py-2 pr-3 font-normal hidden md:table-cell">Byline</th>
              <th className="py-2 font-normal">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {result.rows.map((a) => (
              <tr key={a.id}>
                <td className="py-3 pr-3">
                  <Link
                    href={`/admin/articles/${a.id}`}
                    className="font-semibold no-underline hover:underline"
                  >
                    {a.title}
                  </Link>
                  {a.featured && <span className="ml-2 kicker">Featured</span>}
                </td>
                <td className="py-3 pr-3">
                  <StatusPill status={a.status} />
                </td>
                <td className="py-3 pr-3 hidden md:table-cell">{a.categoryName}</td>
                <td className="py-3 pr-3 hidden md:table-cell">{a.authorName}</td>
                <td className="py-3 meta whitespace-nowrap">{formatDateTime(a.updatedAt)}</td>
              </tr>
            ))}
            {result.rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-muted">
                  No articles match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <Pagination page={result.page} pageCount={result.pageCount} href={qs} />
      </div>
    </div>
  );
}
