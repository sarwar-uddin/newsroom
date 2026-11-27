import type { Metadata } from 'next';
import { StaticPage } from '@/components/public/static-page';
import { site } from '@/config/site';

export const metadata: Metadata = { title: 'Contact', alternates: { canonical: '/contact' } };

export default function ContactPage() {
  return (
    <StaticPage title="Contact">
      {site.contactEmail ? (
        <p>
          Write to the editors at <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
        </p>
      ) : (
        <p>Contact details will be published before launch.</p>
      )}
      <h2>Tips and sensitive information</h2>
      <p>
        A secure channel for sources has not been set up yet. Until it is, please do not send
        sensitive documents or information that could identify you through ordinary email.
      </p>
      <h2>Corrections</h2>
      <p>
        If you believe we have published something inaccurate, tell us which article and what is
        wrong. We will review every request.
      </p>
    </StaticPage>
  );
}
