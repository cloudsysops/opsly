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
    '@intcloudsysops/franchise-core',
    '@intcloudsysops/franchise-persistence',
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
    return [
      { source: '/', headers: htmlCache },
      {
        source: '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
        headers: htmlCache,
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
