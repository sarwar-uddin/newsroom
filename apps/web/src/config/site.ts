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
  /**
   * Public source of the code this site runs (AGPL-3.0 §13). If you run a modified version, point
   * this at your fork.
   */
  sourceUrl: process.env.NEXT_PUBLIC_SOURCE_URL ?? 'https://github.com/sarwar-uddin/newsroom',
  /** Visible on every page while the site carries sample content. */
  demoNotice: true,
} as const;

export type SiteConfig = typeof site;
