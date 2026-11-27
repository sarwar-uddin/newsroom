import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { site } from '@/config/site';
import { LoginForm } from '@/components/admin/login-form';
import { getCurrentUser } from '@/server/auth/current-user';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sign in', robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/admin');
  return (
    <main id="main" className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <p className="font-masthead text-5xl text-center">{site.name}</p>
        <h1 className="kicker !text-ink text-center mt-3 mb-8">Editorial sign-in</h1>
        <LoginForm />
      </div>
    </main>
  );
}
