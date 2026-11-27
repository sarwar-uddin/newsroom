'use client';

import { useActionState } from 'react';
import { loginAction, type ActionState } from '@/app/admin/actions';

export function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(loginAction, {});
  return (
    <form action={action} className="flex flex-col gap-4 border-2 border-ink p-6 bg-paper">
      {state.message && (
        <p
          role="alert"
          className="border-l-4 border-accent bg-paper-deep px-3 py-2 text-sm font-sans"
        >
          {state.message}
        </p>
      )}
      <label className="flex flex-col gap-1 font-sans text-sm font-semibold">
        Email
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={320}
          className="admin-input"
        />
      </label>
      <label className="flex flex-col gap-1 font-sans text-sm font-semibold">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={256}
          className="admin-input"
        />
      </label>
      <button type="submit" disabled={pending} className="admin-btn admin-btn-primary mt-2">
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
