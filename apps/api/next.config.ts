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
};

export default nextConfig;
