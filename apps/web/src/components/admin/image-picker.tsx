'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { mediaUrl } from '@/lib/media';

export type PickerImage = { id: string; storageKey: string; altText: string };

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

/** Featured image selection: upload a new image or pick a recent one from the library. */
export function ImagePicker({
  name,
  initial,
  library,
  error,
}: {
  name: string;
  initial: PickerImage | null;
  library: PickerImage[];
  error?: string;
}) {
  const [selected, setSelected] = useState<PickerImage | null>(initial);
  const [items, setItems] = useState(library);
  const [browsing, setBrowsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [alt, setAlt] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setUploadError('Choose a file first.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.set('file', file);
      body.set('altText', alt);
      const res = await fetch('/admin/api/media', { method: 'POST', body });
      const json = (await res.json()) as {
        id?: string;
        storageKey?: string;
        altText?: string;
        error?: string;
      };
      if (!res.ok || !json.id || !json.storageKey) throw new Error(json.error ?? 'Upload failed.');
      const img = { id: json.id, storageKey: json.storageKey, altText: json.altText ?? '' };
      setItems((prev) => [img, ...prev]);
      setSelected(img);
      setAlt('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={selected?.id ?? ''} />
      {selected ? (
        <div className="flex flex-col gap-2">
          <div className="relative aspect-[16/10] bg-paper-deep border border-rule">
            <Image
              src={mediaUrl(selected.storageKey)}
              alt={selected.altText}
              fill
              sizes="320px"
              className="object-cover"
            />
          </div>
          <p className="admin-hint">
            {selected.altText ? `Alt: ${selected.altText}` : 'No alt text: add it in Media.'}
          </p>
          <button type="button" onClick={() => setSelected(null)} className="admin-btn self-start">
            Remove image
          </button>
        </div>
      ) : (
        <p className="admin-hint">No featured image.</p>
      )}
      {error && <p className="admin-error">{error}</p>}

      <fieldset className="flex flex-col gap-2 border-t border-rule pt-3">
        <legend className="text-xs font-semibold">Upload new</legend>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          aria-label="Image file"
          className="text-sm"
        />
        <input
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="Alt text (describe the image)"
          aria-label="Alt text for the new image"
          maxLength={500}
          className="admin-input"
        />
        <button
          type="button"
          onClick={upload}
          disabled={uploading}
          className="admin-btn self-start"
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        {uploadError && (
          <p role="alert" className="admin-error">
            {uploadError}
          </p>
        )}
        <p className="admin-hint">JPEG, PNG, WebP or GIF.</p>
      </fieldset>

      <button
        type="button"
        onClick={() => setBrowsing((b) => !b)}
        className="admin-btn self-start"
        aria-expanded={browsing}
      >
        {browsing ? 'Close library' : 'Choose from library'}
      </button>
      {browsing && (
        <ul className="grid grid-cols-3 gap-2">
          {items.map((img) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => {
                  setSelected(img);
                  setBrowsing(false);
                }}
                className={`relative block w-full aspect-square border-2 ${selected?.id === img.id ? 'border-accent' : 'border-transparent'}`}
                aria-label={`Use image: ${img.altText || 'untitled'}`}
              >
                <Image
                  src={mediaUrl(img.storageKey)}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
          {items.length === 0 && <li className="admin-hint col-span-3">The library is empty.</li>}
        </ul>
      )}
    </div>
  );
}
