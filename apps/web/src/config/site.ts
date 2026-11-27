/**
 * Central publication identity. The final name, description and social accounts have not been
 * decided: change them here (or via env) and every masthead, metadata tag, feed and footer follows.
 */
export const site = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? 'Working Title',
  /** Short descriptive line, not a slogan. */
  description:
    'Independent reporting, criticism and essays on power, society and culture in Bangladesh and beyond.',
  locale: 'en',
  /** IANA timezone used for every displayed date. Timestamps are stored in UTC. */
  timeZone: 'Asia/Dhaka',
  /** Shown only where set. Use full URLs. */
  social: {
    x: '',
    instagram: '',
    facebook: '',
    youtube: '',
  },
  contactEmail: '',
  /** Visible on every page while the site carries sample content. */
  demoNotice: true,
} as const;

export type SiteConfig = typeof site;
