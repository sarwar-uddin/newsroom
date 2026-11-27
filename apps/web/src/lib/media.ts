/** Public URL for a stored media object. Safe to import from client components. */
export function mediaUrl(storageKey: string): string {
  return `/media/${storageKey}`;
}
