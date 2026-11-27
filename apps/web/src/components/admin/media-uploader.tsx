'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function MediaUploader() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/admin/api/media', { method: 'POST', body: new FormData(form) });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Upload failed.');
      form.reset();
      setMessage({ ok: true, text: 'Uploaded.' });
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Upload failed.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="admin-panel mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] items-end"
    >
      <label className="admin-label">
        Image
        <input
          name="file"
          type="file"
          required
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="text-sm"
        />
      </label>
      <label className="admin-label">
        Alt text
        <input name="altText" maxLength={500} className="admin-input" />
      </label>
      <label className="admin-label">
        Credit
        <input name="credit" maxLength={200} className="admin-input" />
      </label>
      <button type="submit" disabled={busy} className="admin-btn admin-btn-primary">
        {busy ? 'Uploading…' : 'Upload'}
      </button>
      {message && (
        <p
          role={message.ok ? 'status' : 'alert'}
          className={`sm:col-span-4 ${message.ok ? 'admin-hint' : 'admin-error'}`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
