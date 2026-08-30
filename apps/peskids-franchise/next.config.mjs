/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "reactflow",
    "@reactflow/core",
    "@reactflow/background",
    "@reactflow/controls",
    "@reactflow/minimap",
    "@reactflow/node-resizer",
    "@reactflow/node-toolbar",
    "d3-selection",
    "d3-zoom",
    "d3-drag",
    "d3-interpolate",
    "d3-color",
    "d3-transition",
    "d3-dispatch",
    "d3-timer",
    "d3-ease",
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.acmefranchise.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
      {
        source: '/videos/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
