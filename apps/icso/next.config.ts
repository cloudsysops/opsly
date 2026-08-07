import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  // Sibling apps build in parallel via Turbo; their .next dirs (incl. transient
  // cache lock files) must never be traced as dependencies of this app's routes.
  outputFileTracingExcludes: {
    '*': ['../*/.next/**'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
