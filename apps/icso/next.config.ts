import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  // Do NOT set outputFileTracingExcludes for sibling ../*/.next — same failure
  // mode as Peskids #918 (missing webpack-runtime.js in GHCR standalone).
  transpilePackages: [
    '@intcloudsysops/mission-control-kit',
    '@intcloudsysops/game-core',
    '@intcloudsysops/game-web',
    '@intcloudsysops/universe',
  ],
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  webpack: (config) => {
    const repoRoot = path.join(__dirname, '../..');
    config.resolve.alias = {
      ...config.resolve.alias,
      '@intcloudsysops/game-core': path.join(repoRoot, 'lib/game-core/src/index.ts'),
      '@intcloudsysops/game-web': path.join(repoRoot, 'lib/game-web/src/index.ts'),
      '@intcloudsysops/universe': path.join(repoRoot, 'lib/universe/src/index.ts'),
    };
    // Kit (and other ESM workspaces) import with `.js` extensions pointing at `.ts` sources.
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    };
    return config;
  },
};

export default nextConfig;
