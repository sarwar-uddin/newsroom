import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/current-user';
import { DomainError } from '@/server/content/errors';
import { env } from '@/server/env';
import { uploadImage } from '@/server/media/upload';

/**
 * Image upload endpoint for the CMS. Route handlers do not get the automatic server-action
 * origin check, so we enforce same-origin explicitly in addition to the SameSite=Lax cookie.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > env().MEDIA_MAX_BYTES + 64 * 1024) {
    return NextResponse.json({ error: 'File too large.' }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 });
  }
  const file = form.get('file');
  if (!(file instanceof File))
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const item = await uploadImage(
      user,
      { name: file.name, size: file.size, bytes },
      {
        altText: form.get('altText') ?? '',
        credit: form.get('credit') ?? '',
      },
    );
    return NextResponse.json(
      {
        id: item.id,
        storageKey: item.storageKey,
        altText: item.altText,
        width: item.width,
        height: item.height,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof DomainError)
      return NextResponse.json({ error: error.message }, { status: 422 });
    console.error(error);
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 });
  }
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    const o = new URL(origin);
    return o.host === host || o.origin === new URL(env().SITE_URL).origin;
  } catch {
    return false;
  }
}
