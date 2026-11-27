import type { Metadata } from 'next';
import { ArchiveList } from '@/components/public/archive';
import { parsePage } from '@/components/public/pagination';
import { MAX_QUERY_LENGTH, searchArticles } from '@/server/content/public';

export const metadata: Metadata = {
  title: 'Search',
  robots: { index: false, follow: true },
  alternates: { canonical: '/search' },
};

export default async function SearchPage({ searchParams }: PageProps<'/search'>) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (raw ?? '').trim().slice(0, MAX_QUERY_LENGTH);
  const page = parsePage(sp.page);
  const result = await searchArticles(q, page);

  return (
    <>
      <header className="mx-auto max-w-5xl px-4 sm:px-6 pt-10 pb-6 border-b-2 border-ink mb-2">
        <h1 className="font-masthead text-6xl sm:text-8xl">Search</h1>
        <form role="search" action="/search" method="get" className="mt-6 flex gap-0 max-w-2xl">
          <label htmlFor="q" className="sr-only">
            Search articles
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            maxLength={MAX_QUERY_LENGTH}
            placeholder="Search published articles"
            className="flex-1 min-w-0 border-2 border-ink bg-paper px-4 py-3 text-lg font-serif placeholder:text-muted focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="border-2 border-l-0 border-ink bg-ink px-5 font-headline text-lg uppercase text-paper hover:bg-accent hover:border-accent"
          >
            Search
          </button>
        </form>
        {q && (
          <p className="meta mt-4" aria-live="polite">
            {result.total === 0
              ? 'No results'
              : `${result.total} result${result.total === 1 ? '' : 's'}`}{' '}
            for “{q}”
          </p>
        )}
      </header>
      {q ? (
        <ArchiveList
          result={result}
          href={(p) => `/search?q=${encodeURIComponent(q)}${p > 1 ? `&page=${p}` : ''}`}
          empty="Nothing matched. Try fewer or different words."
        />
      ) : (
        <p className="mx-auto max-w-5xl px-4 sm:px-6 py-10 text-muted italic">
          Search headlines, summaries and full text. Use quotes for exact phrases, and “-word” to
          exclude.
        </p>
      )}
    </>
  );
}
