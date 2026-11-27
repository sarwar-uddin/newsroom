import Link from 'next/link';
import { site } from '@/config/site';

export const metadata = { title: 'Page not found', robots: { index: false } };

export default function NotFound() {
  return (
    <main id="main" className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-16">
      <Link href="/" className="no-underline">
        <span className="font-masthead text-4xl">{site.name}</span>
      </Link>
      <div className="rule-double mt-4 pt-12">
        <p className="kicker">Error 404</p>
        <h1 className="font-headline mt-3 text-5xl sm:text-7xl text-balance">
          This page does not exist, or is not public.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-ink-soft">
          The link may be mistyped, or the article may have been moved or withdrawn.
        </p>
        <p className="mt-8 flex flex-wrap gap-6 font-headline text-xl">
          <Link href="/" className="underline decoration-accent decoration-2">
            Front page
          </Link>
          <Link href="/search" className="underline decoration-accent decoration-2">
            Search
          </Link>
        </p>
      </div>
    </main>
  );
}
