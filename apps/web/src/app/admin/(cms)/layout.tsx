import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/config/site';
import { logoutAction } from '@/app/admin/actions';
import { requireUser } from '@/server/auth/current-user';
import { canManageTaxonomy } from '@/server/content/workflow';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: { default: 'Newsroom', template: `%s — Newsroom` },
  robots: { index: false, follow: false },
};

export default async function CmsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const editorial = canManageTaxonomy(user);
  const nav = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/articles', label: 'Articles' },
    { href: '/admin/articles/new', label: 'New article' },
    { href: '/admin/media', label: 'Media' },
    ...(editorial
      ? [
          { href: '/admin/sections', label: 'Sections' },
          { href: '/admin/bylines', label: 'Bylines' },
          { href: '/admin/tags', label: 'Tags' },
        ]
      : []),
  ];

  return (
    <div className="flex-1 flex flex-col lg:flex-row font-sans bg-paper">
      <aside className="lg:w-60 lg:shrink-0 bg-ink text-paper lg:min-h-dvh">
        <div className="px-5 py-4 lg:py-6 flex lg:flex-col items-center lg:items-start justify-between gap-2">
          <Link href="/admin" className="no-underline">
            <span className="font-masthead text-3xl block">{site.name}</span>
            <span className="meta !text-paper/60">Newsroom</span>
          </Link>
          <Link href="/" className="meta !text-paper/70 hover:!text-paper no-underline lg:mt-2">
            View site ↗
          </Link>
        </div>
        <nav aria-label="CMS" className="px-3 pb-3 lg:pb-0">
          <ul className="flex lg:flex-col gap-1 overflow-x-auto whitespace-nowrap">
            {nav.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className="block rounded-sm px-2 py-1.5 text-sm font-semibold no-underline hover:bg-paper/10"
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden lg:block px-5 py-6 mt-6 border-t border-paper/15">
          <p className="text-sm font-semibold">{user.name}</p>
          <p className="meta !text-paper/60 capitalize">{user.role}</p>
          <form action={logoutAction} className="mt-3">
            <button type="submit" className="meta !text-paper underline">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main id="main" className="flex-1 min-w-0 px-4 sm:px-8 py-6 sm:py-8">
        <div className="lg:hidden flex justify-between items-center mb-4 meta">
          <span>
            {user.name} · <span className="capitalize">{user.role}</span>
          </span>
          <form action={logoutAction}>
            <button type="submit" className="underline !text-ink">
              Sign out
            </button>
          </form>
        </div>
        {children}
      </main>
    </div>
  );
}
