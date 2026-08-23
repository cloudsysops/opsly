const path = require('node:path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  // Do NOT set outputFileTracingExcludes for sibling ../*/.next — that broke
  // GHCR standalone (missing webpack-runtime.js) on deploy 4d5f466d. Peskids
  // builds alone in its Dockerfile, so the Turbo parallel-trace race does not apply.
  transpilePackages: [
    '@intcloudsysops/capacity-alert',
    '@intcloudsysops/opsly-core',
    '@intcloudsysops/conversational-runtime',
    '@intcloudsysops/openwa',
    '@intcloudsysops/prompt-guard',
    '@intcloudsysops/tenant-profile',
  ],
  async headers() {
    // HTML/document routes: short shared cache so deploys are visible after CF purge.
    // Hashed /_next/static/* stays immutable via Next defaults.
    const htmlCache = [
      {
        key: 'Cache-Control',
        value: 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
      },
    ]
    // Baseline security headers, independently of whatever the CDN/edge may add.
    // No Content-Security-Policy yet — needs an inline-script/style audit first
    // (Firebase, Capacitor, and Supabase auth all inject client-side scripts here).
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ]
    return [
      { source: '/', headers: [...htmlCache, ...securityHeaders] },
      {
        source: '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
        headers: [...htmlCache, ...securityHeaders],
      },
    ]
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    }
    return config
  },
}

module.exports = nextConfig
