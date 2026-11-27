import { site } from '@/config/site';

const longDate = new Intl.DateTimeFormat('en-GB', {
  timeZone: site.timeZone,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const dateTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: site.timeZone,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** "26 November 2026", in the publication timezone. */
export function formatDate(date: Date): string {
  return longDate.format(date);
}

/** "26 Nov 2026, 14:05", in the publication timezone. */
export function formatDateTime(date: Date): string {
  return dateTime.format(date);
}
