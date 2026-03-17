import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable source maps in production to save memory
  productionBrowserSourceMaps: false,
  // Increase timeout for static page generation
  staticPageGenerationTimeout: 180,
  // Improve memory usage
  experimental: {
    // This is default in recent versions but good to be explicit if issues arise
    optimizePackageImports: ['lucide-react', '@heroicons/react', '@tabler/icons-react'],
  },
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
    ],
  },
  async headers() {
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://*.alipay.com https://*.alipayobjects.com https://*.qq.com https://*.weixin.qq.com https://static.cloudflareinsights.com https://o.alicdn.com;
      script-src-elem 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://*.alipay.com https://*.alipayobjects.com https://*.qq.com https://*.weixin.qq.com https://static.cloudflareinsights.com https://o.alicdn.com;
      worker-src 'self' blob:;
      style-src 'self' 'unsafe-inline' https://o.alicdn.com;
      style-src-elem 'self' 'unsafe-inline' https://o.alicdn.com;
      img-src 'self' blob: data: https: https://images.unsplash.com https://plus.unsplash.com https://o.alicdn.com;
      media-src 'self' blob:;
      font-src 'self' data:;
      connect-src 'self' blob: data: https://*.alipay.com https://*.qq.com https://*.weixin.qq.com https://api.ipify.org ws: wss: https://o.alicdn.com;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      frame-src 'self' https://challenges.cloudflare.com https://*.alipay.com https://*.qq.com https://o.alicdn.com;
    `.replace(/\s{2,}/g, ' ').trim()

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=(self)'
          }
        ]
      }
    ]
  },
};

export default nextConfig;
