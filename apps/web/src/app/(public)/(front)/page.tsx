import Link from 'next/link';
import type { Metadata } from 'next';
import { site } from '@/config/site';
import {
  ArchiveStory,
  articleHref,
  authorHref,
  Kicker,
  LeadStory,
  ListStory,
  SecondaryStory,
  SectionHeading,
  sectionHref,
  StoryImage,
  StoryMeta,
} from '@/components/public/story';
import { getHomepage, listNavCategories, type ArticleCard } from '@/server/content/public';

/** Homepage sections are configured by category slug. */
const HOME_SECTIONS = { highlights: ['investigations', 'culture'], opinion: 'opinion' };

export const metadata: Metadata = {
  title: { absolute: site.name },
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const [home, sections] = await Promise.all([getHomepage(HOME_SECTIONS), listNavCategories()]);
  const [investigations, culture] = home.highlightSections;

  if (!home.lead) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <p className="font-headline text-3xl">Nothing has been published yet.</p>
        <p className="mt-3 text-muted">Stories appear here as soon as an editor publishes them.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10">
      {/* Front: lead story + latest column */}
      <section aria-label="Top stories" className="grid gap-8 py-8 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-8">
          <LeadStory article={home.lead} />
        </div>
        <aside
          aria-labelledby="latest-heading"
          className="lg:col-span-4 lg:border-l lg:border-rule lg:pl-10"
        >
          <h2 id="latest-heading" className="kicker !text-ink border-b-2 border-ink pb-2">
            Latest
          </h2>
          <ol className="divide-y divide-rule">
            {home.latest.slice(0, 6).map((a, i) => (
              <li key={a.id}>
                <ListStory article={a} index={i} />
              </li>
            ))}
          </ol>
        </aside>
      </section>

      {/* Secondary featured stories */}
      {home.secondary.length > 0 && (
        <section aria-label="Featured" className="border-t border-ink py-8">
          <div className="grid gap-6 divide-y divide-rule sm:grid-cols-3 sm:gap-8 sm:divide-y-0 sm:divide-x">
            {home.secondary.map((a) => (
              <div key={a.id} className="pt-6 first:pt-0 sm:pt-0 sm:pl-8 sm:first:pl-0">
                <SecondaryStory article={a} />
              </div>
            ))}
          </div>
        </section>
      )}

      {investigations?.category && investigations.articles.length > 0 && (
        <InvestigationsBand category={investigations.category} articles={investigations.articles} />
      )}

      {culture?.category && culture.articles.length > 0 && (
        <section aria-labelledby="culture-heading" className="py-12">
          <SectionHeading title={culture.category.name} href={sectionHref(culture.category.slug)} />
          <div className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {culture.articles.map((a) => (
              <CultureTile key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}

      {home.opinion.category && home.opinion.articles.length > 0 && (
        <OpinionSection category={home.opinion.category} articles={home.opinion.articles} />
      )}

      {home.latest.length > 6 && (
        <section aria-label="More stories" className="py-12">
          <SectionHeading title="More" />
          <div className="divide-y divide-rule">
            {home.latest.slice(6).map((a) => (
              <ArchiveStory key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}

      {/* Section index */}
      <section aria-labelledby="sections-heading" className="border-t-2 border-ink py-10">
        <h2 id="sections-heading" className="kicker !text-ink mb-6">
          Sections
        </h2>
        <ul className="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {sections.map((s) => (
            <li key={s.slug} className="border-t border-rule pt-3">
              <Link
                href={sectionHref(s.slug)}
                className="font-headline text-2xl no-underline hover:text-accent"
              >
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Investigations get an inverted, full-bleed band: the publication's most serious work. */
function InvestigationsBand({
  category,
  articles,
}: {
  category: { name: string; slug: string };
  articles: ArticleCard[];
}) {
  const [main, ...rest] = articles;
  if (!main) return null;
  return (
    <section
      aria-labelledby="investigations-heading"
      className="-mx-4 sm:-mx-6 lg:-mx-10 bg-ink text-paper px-4 sm:px-6 lg:px-10 py-12 my-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b-2 border-paper pb-2">
        <h2 id="investigations-heading" className="font-masthead text-5xl sm:text-7xl">
          <Link href={sectionHref(category.slug)} className="no-underline hover:underline">
            {category.name}
          </Link>
        </h2>
        <Link
          href={sectionHref(category.slug)}
          className="meta !text-paper/70 no-underline hover:underline"
        >
          All investigations →
        </Link>
      </div>
      <div className="mt-8 grid gap-10 lg:grid-cols-12">
        <article className="lg:col-span-7 flex flex-col gap-4">
          {main.image && (
            <Link href={articleHref(main.slug)} tabIndex={-1} aria-hidden="true">
              <StoryImage
                image={main.image}
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="grayscale contrast-125"
              />
            </Link>
          )}
          <h3 className="font-headline text-4xl sm:text-5xl text-balance">
            <Link href={articleHref(main.slug)} className="headline-link">
              {main.title}
            </Link>
          </h3>
          {main.dek && <p className="text-lg leading-snug text-paper/80 max-w-2xl">{main.dek}</p>}
          <StoryMeta article={main} className="!text-paper/60" />
        </article>
        <ul className="lg:col-span-5 flex flex-col divide-y divide-paper/20 lg:border-l lg:border-paper/20 lg:pl-10">
          {rest.map((a) => (
            <li key={a.id} className="py-5 first:pt-0">
              <h3 className="font-headline text-2xl text-balance">
                <Link href={articleHref(a.slug)} className="headline-link">
                  {a.title}
                </Link>
              </h3>
              {a.dek && <p className="mt-2 text-paper/75 leading-snug line-clamp-3">{a.dek}</p>}
              <StoryMeta article={a} className="mt-2 !text-paper/60" />
            </li>
          ))}
          {rest.length === 0 && (
            <li className="text-paper/70 italic">
              {category.name} is where long-term reporting lives. More is in progress.
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}

function CultureTile({ article }: { article: ArticleCard }) {
  return (
    <article className="flex flex-col gap-3">
      {article.image && (
        <Link href={articleHref(article.slug)} tabIndex={-1} aria-hidden="true">
          <StoryImage
            image={article.image}
            sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 100vw"
            aspect="aspect-[4/5]"
          />
        </Link>
      )}
      <Kicker category={article.category} />
      <h3 className="font-headline text-2xl text-balance">
        <Link href={articleHref(article.slug)} className="headline-link">
          {article.title}
        </Link>
      </h3>
      <StoryMeta article={article} />
    </article>
  );
}

/** Opinion is set in the serif italic with the writer's name first: voices, not stories. */
function OpinionSection({
  category,
  articles,
}: {
  category: { name: string; slug: string };
  articles: ArticleCard[];
}) {
  return (
    <section
      aria-labelledby="opinion-heading"
      className="-mx-4 sm:-mx-6 lg:-mx-10 bg-paper-deep px-4 sm:px-6 lg:px-10 py-12"
    >
      <SectionHeading title={category.name} href={sectionHref(category.slug)} />
      <div className="mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {articles.map((a) => (
          <article key={a.id} className="flex flex-col gap-3 border-t-4 border-accent pt-4">
            <Link
              href={authorHref(a.author.slug)}
              className="font-headline text-lg uppercase no-underline hover:underline"
              style={{ fontStretch: '75%' }}
            >
              {a.author.name}
            </Link>
            <h3 className="font-serif italic text-2xl sm:text-[1.65rem] leading-tight text-balance">
              <Link href={articleHref(a.slug)} className="headline-link">
                {a.title}
              </Link>
            </h3>
            {a.excerpt && <p className="text-base text-ink-soft leading-snug">{a.excerpt}</p>}
            <StoryMeta article={a} showAuthor={false} />
          </article>
        ))}
      </div>
    </section>
  );
}
