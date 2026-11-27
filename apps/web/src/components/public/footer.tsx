import Link from 'next/link';
import { site } from '@/config/site';
import { listNavCategories } from '@/server/content/public';
import { sectionHref } from './story';

const socialLabels: Record<keyof typeof site.social, string> = {
  x: 'X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
};

export async function Footer() {
  const categories = await listNavCategories();
  const socials = (Object.keys(site.social) as (keyof typeof site.social)[]).filter(
    (k) => site.social[k],
  );

  return (
    <footer className="mt-20 bg-ink text-paper">
      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10 py-12 grid gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <Link href="/" className="no-underline">
            <span className="font-masthead text-5xl">{site.name}</span>
          </Link>
          <p className="max-w-sm text-paper/75 italic">{site.description}</p>
        </div>
        <FooterList
          title="Sections"
          items={categories.map((c) => ({ href: sectionHref(c.slug), label: c.name }))}
        />
        <FooterList
          title="Publication"
          items={[
            { href: '/about', label: 'About' },
            { href: '/contact', label: 'Contact' },
            { href: '/privacy', label: 'Privacy' },
            { href: '/rss.xml', label: 'RSS feed' },
          ]}
        />
        {socials.length > 0 ? (
          <FooterList
            title="Follow"
            items={socials.map((k) => ({
              href: site.social[k],
              label: socialLabels[k],
              external: true,
            }))}
          />
        ) : (
          <div />
        )}
      </div>
      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10 py-4 border-t border-paper/20 meta !text-paper/60 flex flex-wrap justify-between gap-2">
        <span>
          © {new Date().getFullYear()} {site.name}. Independent publication.
        </span>
        <span>No trackers. No analytics.</span>
      </div>
    </footer>
  );
}

function FooterList({
  title,
  items,
}: {
  title: string;
  items: { href: string; label: string; external?: boolean }[];
}) {
  return (
    <div>
      <h2 className="meta !text-paper/60 uppercase tracking-widest mb-3">{title}</h2>
      <ul className="flex flex-col gap-1.5">
        {items.map((i) => (
          <li key={i.href}>
            {i.external ? (
              <a
                href={i.href}
                rel="noopener noreferrer me"
                className="font-headline text-lg no-underline hover:underline"
                style={{ fontStretch: '85%' }}
              >
                {i.label}
              </a>
            ) : (
              <Link
                href={i.href}
                className="font-headline text-lg no-underline hover:underline"
                style={{ fontStretch: '85%' }}
              >
                {i.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
