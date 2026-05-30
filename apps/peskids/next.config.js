const path = require('node:path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  transpilePackages: ['@intcloudsysops/opsly-core', '@intcloudsysops/conversational-runtime'],
}

module.exports = nextConfig
