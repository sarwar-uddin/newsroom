import { site } from '@/config/site';

export function DemoNotice() {
  if (!site.demoNotice) return null;
  return (
    <div
      role="note"
      className="bg-accent text-accent-ink text-center meta !text-accent-ink py-1.5 px-4"
    >
      Demonstration build: all articles and contributors on this site are sample content, not
      journalism.
    </div>
  );
}
