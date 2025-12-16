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
};

export default nextConfig;
