import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * CORS para /api/*: ver `middleware.ts` + `lib/cors-origins.ts` (admin + portal, sin wildcard).
 */
const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  // Do NOT set outputFileTracingExcludes for sibling ../*/.next — same failure
  // mode as Peskids #918 (missing webpack-runtime.js in GHCR standalone).
  // Platform Dockerfiles build each app in isolation, so the Turbo parallel-trace
  // race that originally motivated the exclude does not apply here.
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['@intcloudsysops/openwa', '@intcloudsysops/tenant-profile'],
  serverExternalPackages: [
    'redis',
    '@redis/client',
    '@redis/bloom',
    '@redis/graph',
    '@redis/json',
    '@redis/search',
    '@redis/time-series',
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push(
        'redis',
        '@redis/client',
        '@redis/bloom',
        '@redis/graph',
        '@redis/json',
        '@redis/search',
        '@redis/time-series'
      );
    }
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    };
    return config;
  },
};

export default nextConfig;
