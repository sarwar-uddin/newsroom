import { Header } from '@/components/public/header';

export default function FrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header variant="front" />
      <main id="main" className="flex-1">
        {children}
      </main>
    </>
  );
}
