import type { NextConfig } from "next";
const JavaScriptObfuscator = require('webpack-obfuscator');

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable source maps in production to save memory and protect code
  productionBrowserSourceMaps: false,
  webpack: (config, { dev, isServer }) => {
    // 生产环境且不是开发模式时，启用深度代码混淆
    if (!dev) {
      config.plugins.push(
        new JavaScriptObfuscator({
          rotateStringArray: true,
          stringArray: true,
          stringArrayThreshold: 0.75, // 对 75% 的字符串进行混淆
          debugProtection: true, // 开启调试保护，防止控制台调试
          debugProtectionInterval: 2000,
          disableConsoleOutput: true, // 彻底静默控制台，增加代码破解难度
          selfDefending: true, // 自我防御，代码被格式化后将无法运行
          splitStrings: true, // 拆分长字符串，防止 AI 分析语义
          unicodeEscapeSequence: false
        }, [])
      );
    }
    return config;
  },
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
      media-src 'self' blob: data:;
      font-src 'self' data:;
      connect-src 'self' blob: data: https://*.alipay.com https://*.qq.com https://*.weixin.qq.com https://api.ipify.org ws: wss: https://o.alicdn.com https://*.stravision.site wss://*.stravision.site;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      frame-src 'self' https: https://challenges.cloudflare.com https://*.alipay.com https://*.qq.com https://o.alicdn.com;
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
