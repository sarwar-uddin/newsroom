import type { Metadata } from 'next';
import { StaticPage } from '@/components/public/static-page';
import { site } from '@/config/site';

export const metadata: Metadata = { title: 'About', alternates: { canonical: '/about' } };

export default function AboutPage() {
  return (
    <StaticPage title="About">
      <p>
        <strong>{site.name}</strong> is a placeholder name for an independent digital publication
        based in Bangladesh. Its final name, ownership statement and masthead have not been
        published yet.
      </p>
      <p>
        The publication intends to cover investigations, politics and power, society, counterculture
        and underground movements, arts, music, cinema and literature, along with long-form
        commentary and signed opinion.
      </p>
      <h2>Editorial principles</h2>
      <ul>
        <li>Reporting is separated from opinion, and opinion is always signed.</li>
        <li>
          We do not invent sources, quotations or statistics, and we label sample or illustrative
          material.
        </li>
        <li>We do not republish material that humiliates or exposes private people.</li>
        <li>We correct errors openly.</li>
        <li>We do not run third-party trackers or analytics.</li>
      </ul>
      <h2>Ownership and funding</h2>
      <p>
        To be published before launch. A publication that asks who owns other media should answer
        that question about itself first.
      </p>
    </StaticPage>
  );
}
