const isDev = process.env.NODE_ENV === 'development';

// Static CSP (no per-request nonce, so pages stay statically rendered). The App Router
// streams its RSC payload through inline scripts that differ per page and cannot be
// hashed at build time, so scripts need 'unsafe-inline'; scripts from other origins,
// framing, plugins, <base> hijacking and foreign form targets stay blocked. A strict
// script policy requires per-request nonces from proxy.ts (dynamic rendering).
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  // Server-rendered style attributes need 'unsafe-inline'; styles cannot run code.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  // Google Maps embed on /contact.
  "frame-src https://www.google.com https://maps.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "frame-ancestors 'none'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Do not advertise the framework (X-Powered-By: Next.js).
  poweredByHeader: false,
  // Lets a test build go to a separate folder (NEXT_DIST_DIR) without disturbing .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',
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
          // Browsers honour HSTS only over HTTPS, so this is inert on local http servers.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
        ],
      },
    ];
  },
};

export default nextConfig;
