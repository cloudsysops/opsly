const path = require('node:path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  transpilePackages: [
    '@intcloudsysops/opsly-core',
    '@intcloudsysops/conversational-runtime',
    '@intcloudsysops/openwa',
    '@intcloudsysops/prompt-guard',
    '@intcloudsysops/tenant-profile',
  ],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    }
    return config
  },
}

module.exports = nextConfig
