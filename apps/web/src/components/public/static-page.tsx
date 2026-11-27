export function StaticPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-10">
      <h1 className="font-masthead text-6xl sm:text-8xl border-b-2 border-ink pb-4">{title}</h1>
      <div className="prose-article mt-8">{children}</div>
    </div>
  );
}
