import Link from 'next/link';
import { StatusPill } from '@/components/admin/status';
import { formatDateTime } from '@/lib/dates';
import { requireUser } from '@/server/auth/current-user';
import { getDashboardStats } from '@/server/content/editorial';

export const metadata = { title: 'Dashboard' };

export default async function Dashboard({ searchParams }: PageProps<'/admin'>) {
  const user = await requireUser();
  const { denied } = await searchParams;
  const { counts, recent } = await getDashboardStats(user);
  const stats = [
    {
      label: user.role === 'author' ? 'Your articles' : 'Total articles',
      value: counts.total,
      href: '/admin/articles',
    },
    { label: 'Published', value: counts.published, href: '/admin/articles?status=published' },
    { label: 'Drafts', value: counts.drafts, href: '/admin/articles?status=draft' },
    { label: 'Awaiting review', value: counts.review, href: '/admin/articles?status=review' },
  ];

  return (
    <div className="max-w-5xl">
      {denied && (
        <p role="alert" className="mb-6 border-l-4 border-accent bg-paper-deep px-3 py-2 text-sm">
          You don’t have permission to open that page.
        </p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="admin-h1">Dashboard</h1>
        <Link href="/admin/articles/new" className="admin-btn admin-btn-primary">
          + New article
        </Link>
      </div>

      <dl className="mt-8 grid grid-cols-2 sm:grid-cols-4 border-t-2 border-ink">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="no-underline border-b border-r border-rule p-4 hover:bg-paper-deep"
          >
            <dt className="meta">{s.label}</dt>
            <dd className="font-masthead text-5xl mt-1 tabular-nums">{s.value}</dd>
          </Link>
        ))}
      </dl>

      <section className="mt-10">
        <h2 className="kicker !text-ink border-b-2 border-ink pb-2">Recently updated</h2>
        {recent.length === 0 ? (
          <p className="py-6 text-muted">No articles yet.</p>
        ) : (
          <ul className="divide-y divide-rule">
            {recent.map((a) => (
              <li key={a.id} className="py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                <StatusPill status={a.status} />
                <Link
                  href={`/admin/articles/${a.id}`}
                  className="font-semibold flex-1 min-w-[12rem] no-underline hover:underline"
                >
                  {a.title}
                </Link>
                <span className="meta">
                  {a.authorName} · {formatDateTime(a.updatedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
