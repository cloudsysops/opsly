import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  // Do NOT set outputFileTracingExcludes for sibling ../*/.next — same failure
  // mode as Peskids #918 (missing webpack-runtime.js in GHCR standalone).
  transpilePackages: ['@intcloudsysops/mission-control-kit'],
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
