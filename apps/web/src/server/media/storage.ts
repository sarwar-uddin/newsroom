import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '@/server/env';

/**
 * Storage abstraction. The app only ever deals in opaque keys. Local disk is the development
 * driver; an S3-compatible driver can implement the same interface for serverless or multi-node
 * deployments (see docs/DEPLOYMENT.md).
 */
export interface MediaStorage {
  put(key: string, data: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
}

/** Keys are generated server-side: `<yyyy>/<mm>/<32 hex>.<ext>`. Anything else is refused. */
export const STORAGE_KEY_PATTERN = /^\d{4}\/\d{2}\/[a-f0-9]{32}\.(jpg|png|webp|gif)$/;

export function isValidStorageKey(key: string): boolean {
  return STORAGE_KEY_PATTERN.test(key);
}

export class LocalDiskStorage implements MediaStorage {
  constructor(private readonly root: string) {}

  private resolve(key: string): string {
    if (!isValidStorageKey(key)) throw new Error('Invalid storage key');
    const full = path.resolve(this.root, key);
    // Defence in depth: the pattern already excludes traversal, but verify containment anyway.
    if (!full.startsWith(path.resolve(this.root) + path.sep))
      throw new Error('Storage key escapes root');
    return full;
  }

  async put(key: string, data: Uint8Array): Promise<void> {
    const file = this.resolve(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data, { flag: 'wx' });
  }

  async get(key: string): Promise<Uint8Array | null> {
    try {
      return await readFile(this.resolve(key));
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }
}

let storage: MediaStorage | undefined;

export function getStorage(): MediaStorage {
  storage ??= new LocalDiskStorage(
    path.resolve(/* turbopackIgnore: true */ process.cwd(), env().UPLOAD_DIR),
  );
  return storage;
}

/** For tests. */
export function setStorage(s: MediaStorage): void {
  storage = s;
}
