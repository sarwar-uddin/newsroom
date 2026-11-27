'use client';

/** Generic failure page. Never renders the error message: it may contain internal details. */
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main" className="flex-1 mx-auto w-full max-w-3xl px-4 py-24">
      <p className="kicker">Something went wrong</p>
      <h1 className="font-headline mt-3 text-5xl">We couldn’t load this page.</h1>
      <p className="mt-4 text-lg text-ink-soft">Please try again in a moment.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 border-2 border-ink px-5 py-2 font-headline uppercase hover:bg-ink hover:text-paper"
      >
        Try again
      </button>
    </main>
  );
}
