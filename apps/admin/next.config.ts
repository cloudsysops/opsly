import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: 'standalone',
  // Monorepo root (avoids picking ~/package-lock.json when tracing)
  outputFileTracingRoot: path.join(__dirname, '../..'),
  // Do NOT set outputFileTracingExcludes for sibling ../*/.next — same failure
  // mode as Peskids #918 (missing webpack-runtime.js in GHCR standalone).
  transpilePackages: ['@intcloudsysops/components', '@intcloudsysops/capacity-alert'],
};

export default nextConfig;
