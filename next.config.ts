import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Note: React Strict Mode is disabled because Leaflet's MapContainer
  // doesn't properly handle Strict Mode's intentional double-mounting behavior.
  // This is a known limitation documented in the React Leaflet community.
  // Strict Mode is a development-only tool and doesn't affect production.
  // The server-side export feature works independently of this setting.
  reactStrictMode: false,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: true,
  },
  // Turbopack configuration (stable)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  // Optimize package imports for better tree shaking
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  // Baseline security headers applied to every response. Keep conservative
  // defaults — no CSP yet (would need an audit of inline scripts / external
  // origins first), and no Permissions-Policy beyond the obvious ones.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Forces HTTPS for a year + includes subdomains. Only takes effect
          // when the response is actually served over HTTPS.
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          // Prevents the app from being framed by any site — mitigates
          // clickjacking. Use CSP frame-ancestors if a framing allowlist
          // is ever needed.
          { key: 'X-Frame-Options', value: 'DENY' },
          // Stops browsers from MIME-sniffing responses (e.g. treating a
          // text/plain as JS).
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Send only the origin on cross-origin navigations; avoids
          // leaking full URLs with query params (which may contain IDs)
          // to third parties.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Disable powerful APIs we don't use.
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), payment=(self)',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
