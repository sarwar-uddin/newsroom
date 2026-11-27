import type { Metadata, Viewport } from 'next';
import { Archivo, IBM_Plex_Mono, Source_Serif_4 } from 'next/font/google';
import { site } from '@/config/site';
import './globals.css';

const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  axes: ['opsz'],
  style: ['normal', 'italic'],
  variable: '--font-source-serif',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000';
  return {
    metadataBase: new URL(siteUrl),
    title: { default: site.name, template: `%s — ${site.name}` },
    description: site.description,
    applicationName: site.name,
    openGraph: { siteName: site.name, type: 'website', locale: 'en_GB' },
    twitter: { card: 'summary_large_image' },
    alternates: { types: { 'application/rss+xml': [{ url: '/rss.xml', title: site.name }] } },
  };
}

export const viewport: Viewport = {
  themeColor: '#f4f1ea',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${archivo.variable} ${sourceSerif.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
