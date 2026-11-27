import type { Metadata } from 'next';
import { StaticPage } from '@/components/public/static-page';

export const metadata: Metadata = { title: 'Privacy', alternates: { canonical: '/privacy' } };

export default function PrivacyPage() {
  return (
    <StaticPage title="Privacy">
      <p>
        <em>Placeholder policy. This page must be reviewed and completed before public launch.</em>
      </p>
      <h2>What this site collects</h2>
      <ul>
        <li>No analytics, advertising or third-party tracking scripts are loaded.</li>
        <li>Readers do not need an account, and no cookies are set for readers.</li>
        <li>A single session cookie is set only for staff who sign in to the editorial system.</li>
        <li>
          Like most web servers, ours may keep short-lived technical logs (such as IP addresses) for
          security and reliability.
        </li>
      </ul>
      <h2>Share links</h2>
      <p>Share links are plain links. Nothing is sent to social networks unless you click one.</p>
    </StaticPage>
  );
}
