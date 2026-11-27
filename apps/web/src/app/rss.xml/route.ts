import { site } from '@/config/site';
import { absoluteUrl, escapeXml } from '@/lib/seo';
import { getFeedArticles } from '@/server/content/public';

export const dynamic = 'force-dynamic';

export async function GET() {
  const items = await getFeedArticles(30);
  const latest = items[0]?.publishedAt ?? new Date();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>${escapeXml(site.name)}</title>
<link>${escapeXml(absoluteUrl('/'))}</link>
<description>${escapeXml(site.description)}</description>
<language>en</language>
<lastBuildDate>${latest.toUTCString()}</lastBuildDate>
<atom:link href="${escapeXml(absoluteUrl('/rss.xml'))}" rel="self" type="application/rss+xml"/>
${items
  .map((a) => {
    const url = absoluteUrl(`/articles/${a.slug}`);
    return `<item>
<title>${escapeXml(a.title)}</title>
<link>${escapeXml(url)}</link>
<guid isPermaLink="true">${escapeXml(url)}</guid>
<description>${escapeXml(a.dek || a.excerpt)}</description>
<dc:creator>${escapeXml(a.authorName)}</dc:creator>
<category>${escapeXml(a.categoryName)}</category>
<pubDate>${(a.publishedAt ?? latest).toUTCString()}</pubDate>
</item>`;
  })
  .join('\n')}
</channel>
</rss>`;
  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
