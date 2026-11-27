import { DemoNotice } from '@/components/public/demo-notice';
import { Footer } from '@/components/public/footer';

/** Public pages read live data; nothing here is statically prerendered at build time. */
export const dynamic = 'force-dynamic';

export default function PublicLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <DemoNotice />
      {children}
      <Footer />
    </>
  );
}
