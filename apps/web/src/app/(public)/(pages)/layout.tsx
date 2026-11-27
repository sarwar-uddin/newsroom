import { Header } from '@/components/public/header';

export default function PagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header variant="compact" />
      <main id="main" className="flex-1">
        {children}
      </main>
    </>
  );
}
