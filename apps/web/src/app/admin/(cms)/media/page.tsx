import Image from 'next/image';
import { updateMediaAction } from '@/app/admin/actions';
import { ActionForm } from '@/components/admin/action-form';
import { MediaUploader } from '@/components/admin/media-uploader';
import { formatDateTime } from '@/lib/dates';
import { mediaUrl } from '@/lib/media';
import { requireUser } from '@/server/auth/current-user';
import { listMedia } from '@/server/media/upload';

export const metadata = { title: 'Media' };

export default async function MediaPage() {
  await requireUser();
  const items = await listMedia(60);
  return (
    <div className="max-w-6xl">
      <h1 className="admin-h1">Media</h1>
      <MediaUploader />
      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((m) => (
          <li key={m.id} className="admin-panel flex flex-col gap-3">
            <div className="relative aspect-[16/10] bg-paper-deep">
              <Image
                src={mediaUrl(m.storageKey)}
                alt={m.altText}
                fill
                sizes="(min-width: 1024px) 30vw, 90vw"
                className="object-cover"
              />
            </div>
            <p className="meta break-all">
              {m.originalFilename} · {m.width && m.height ? `${m.width}×${m.height} · ` : ''}
              {Math.round(m.fileSize / 1024)} KB · {formatDateTime(m.createdAt)}
            </p>
            <ActionForm action={updateMediaAction} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={m.id} />
              <label className="admin-label">
                Alt text
                <input
                  name="altText"
                  defaultValue={m.altText}
                  maxLength={500}
                  className="admin-input"
                />
              </label>
              <label className="admin-label">
                Credit
                <input
                  name="credit"
                  defaultValue={m.credit ?? ''}
                  maxLength={200}
                  className="admin-input"
                />
              </label>
            </ActionForm>
          </li>
        ))}
      </ul>
    </div>
  );
}
