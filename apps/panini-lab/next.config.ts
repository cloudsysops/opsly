import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@intcloudsysops/opsly-core', '@intcloudsysops/conversational-runtime'],
};

export default nextConfig;
