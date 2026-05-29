const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    scrollRestoration: true,
  },
  images: {
    remotePatterns: [
      { hostname: 'jkwykpldnitavhmtuzmo.supabase.co' },
      { hostname: '*.supabase.co' },
    ],
  },
  rewrites: async () => {
    return {
      beforeFiles: [
        {
          source: '/api/v1/:path*',
          destination: 'http://localhost:3011/api/:path*',
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  redirects: async () => {
    return [
      {
        source: '/',
        destination: '/chat',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
