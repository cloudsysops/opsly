const path = require('node:path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  // Sibling apps build in parallel via Turbo; their .next dirs (incl. transient
  // cache lock files) must never be traced as dependencies of this app's routes.
  outputFileTracingExcludes: {
    '*': ['../*/.next/**'],
  },
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
