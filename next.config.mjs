/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No remote image hosts are allowed. The site renders no remote images, and a
  // wildcard turned /_next/image into an optimizer proxy for any HTTPS host.
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
      {
        source: '/about',
        destination: '/pro',
        permanent: true,
      },
      {
        source: '/simulator',
        destination: '/pro',
        permanent: true,
      },
      {
        source: '/training',
        destination: '/pro',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
