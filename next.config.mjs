import os from 'node:os';

function collectAllowedDevOrigins() {
  const origins = new Set([
    '127.0.0.1',
    '127.*.*.*',
    '192.168.*.*',
    '10.*.*.*',
    '172.*.*.*',
    '100.*.*.*',
    '*.local',
    '**.local',
    '**.ngrok-free.app',
    '**.ngrok-free.dev',
    '**.ngrok.io',
    '**.ngrok.app',
    '**.trycloudflare.com',
    '**.loca.lt',
    '**.ts.net',
    'simdream.co.il',
    '**.simdream.co.il',
  ]);

  try {
    const hostname = os.hostname();
    if (hostname) {
      origins.add(hostname);
      origins.add(hostname.toLowerCase());
    }
    const interfaces = os.networkInterfaces();
    for (const entries of Object.values(interfaces)) {
      for (const entry of entries ?? []) {
        if (entry && entry.address && entry.family === 'IPv4') {
          origins.add(entry.address);
        }
      }
    }
  } catch {
    // Ignore restricted OS interface lookups
  }

  return Array.from(origins);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `next dev` starts on localhost by default, while developers and mobile test
  // devices (iPhone Safari, Samsung/Android browsers) often open the server over
  // 127.0.0.1, Wi-Fi LAN IPs (192.168.x.x / 10.x.x.x), mDNS (.local), or tunnels.
  // Next 16 blocks non-allowlisted origins for HMR/dev assets, which prevents the
  // client bundle from hydrating interactive buttons.
  allowedDevOrigins: collectAllowedDevOrigins(),
  experimental: {
    // Next 16's React debug channel blocks `await initialServerResponse` in
    // app-index.js until the dev HMR WebSocket delivers REACT_DEBUG_CHUNK. If a
    // mobile browser on LAN, tunnel, or cellular cannot open the dev WebSocket,
    // hydrateRoot() never runs and all buttons remain unclickable.
    reactDebugChannel: false,
  },
  // Do not advertise the framework (X-Powered-By: Next.js).
  poweredByHeader: false,
  // Lets a test build go to a separate folder (NEXT_DIST_DIR) without disturbing .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // No remote image hosts are allowed. The site renders no remote images, and a
  // wildcard turned /_next/image into an optimizer proxy for any HTTPS host.
  // Wix's managed OpenNext worker serves public assets but does not expose Next's
  // /_next/image optimization endpoint. Ship the local brand and editorial images
  // directly so the same build works on Wix hosting and local Next servers.
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
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
        ],
      },
    ];
  },
};

export default nextConfig;
