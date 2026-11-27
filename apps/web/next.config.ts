import type { NextConfig } from 'next';
import { loadRootEnv } from './src/load-env';

loadRootEnv();

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['@node-rs/argon2'],
  images: {
    localPatterns: [{ pathname: '/media/**' }],
  },
  experimental: {
    serverActions: {
      // Uploads go through a route handler; actions only carry article text.
      bodySizeLimit: '2mb',
    },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
