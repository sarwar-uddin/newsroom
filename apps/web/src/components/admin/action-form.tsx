'use client';

import { useActionState } from 'react';
import type { ActionState } from '@/app/admin/actions';

/** Small wrapper for CMS forms backed by a server action returning ActionState. */
export function ActionForm({
  action,
  children,
  submitLabel = 'Save',
  danger = false,
  className = '',
  confirm,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children?: React.ReactNode;
  submitLabel?: string;
  danger?: boolean;
  className?: string;
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={className}
    >
      {children}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className={`admin-btn ${danger ? 'admin-btn-danger' : 'admin-btn-primary'}`}
        >
          {pending ? 'Working…' : submitLabel}
        </button>
        {state.message && (
          <span
            role={state.ok ? 'status' : 'alert'}
            className={state.ok ? 'admin-hint' : 'admin-error'}
          >
            {state.message}
            {state.fieldErrors &&
              Object.entries(state.fieldErrors).map(([k, v]) => (
                <span key={k} className="block">
                  {k}: {v}
                </span>
              ))}
          </span>
        )}
      </div>
    </form>
  );
}
