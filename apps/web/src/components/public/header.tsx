import Link from 'next/link';
import { site } from '@/config/site';
import { formatDate } from '@/lib/dates';
import { listNavCategories } from '@/server/content/public';
import { sectionHref } from './story';

/**
 * Site header. `front` is the full newspaper masthead used on the homepage; `compact` keeps
 * the identity visible on inner pages without pushing the story below the fold.
 */
export async function Header({ variant }: { variant: 'front' | 'compact' }) {
  const categories = await listNavCategories();
  const today = formatDate(new Date());

  return (
    <header className="px-4 sm:px-6 lg:px-10">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
      >
        Skip to content
      </a>
      {variant === 'front' ? (
        <>
          <div className="flex items-center justify-between gap-4 border-b border-rule py-2 meta">
            <span>{today}</span>
            <span className="hidden sm:inline">Dhaka, Bangladesh</span>
            <Link href="/search" className="text-ink no-underline hover:underline">
              Search
            </Link>
          </div>
          <div className="py-5 sm:py-8 text-center">
            <Link href="/" className="no-underline">
              <span className="font-masthead block text-[clamp(2rem,11vw,9.5rem)] break-words">
                {site.name}
              </span>
            </Link>
            <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base italic text-muted text-balance">
              {site.description}
            </p>
          </div>
        </>
      ) : (
        <div className="flex items-end justify-between gap-4 pt-4 pb-3">
          <Link href="/" className="no-underline">
            <span className="font-masthead block text-4xl sm:text-5xl">{site.name}</span>
          </Link>
          <Link href="/search" className="meta text-ink no-underline hover:underline pb-1">
            Search
          </Link>
        </div>
      )}
      <nav aria-label="Sections" className="rule-double border-b border-ink">
        <ul className="-mx-4 flex gap-6 overflow-x-auto px-4 py-2.5 whitespace-nowrap sm:mx-0 sm:justify-center sm:px-0 [scrollbar-width:none]">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={sectionHref(c.slug)}
                className="font-headline text-[0.95rem] uppercase tracking-wide no-underline hover:text-accent"
                style={{ fontStretch: '85%' }}
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
