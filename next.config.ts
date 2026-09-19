import type { NextConfig } from "next";
import path from "path";

// 桌面端（Electron）构建开关。
// 仅在 DESKTOP_BUILD=1 时输出 Next standalone 产物，供 Electron 主进程直接 fork。
// 默认关闭 —— Docker / 线上构建仍走 standard 模式，行为与改造前完全一致。
const isDesktopBuild = process.env.DESKTOP_BUILD === "1";

const nextConfig: NextConfig = {
  // 桌面端需要自包含的服务端产物（.next/standalone/server.js + 精简 node_modules）
  ...(isDesktopBuild ? { output: "standalone" as const } : {}),
  // 桌面端：收紧文件追踪范围。
  // 实测（Next 16.1 + turbopack）不加此配置时，standalone 会把项目根目录整体
  // 镜像进去 —— 含 README/Dockerfile/nginx，其中 data/ai-providers-config.json
  // 带真实 API Key、data/sessions.json 是用户会话数据，构成凭据外发风险。
  // 这里从源头排除，再由 scripts/desktop/prepare-standalone.mjs 精确放入所需资源。
  ...(isDesktopBuild
    ? {
        outputFileTracingExcludes: {
          "*": [
            "./data/**",
            "./desktop/**",
            "./docs/**",
            "./nginx/**",
            "./scripts/**",
            "./tmp/**",
            "./release/**",
            "./.git/**",
            "./.workbuddy/**",
            "./prisma/**",
            "./examples/**",
            "**/*.md",
          ],
        },
      }
    : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  // 固定项目根目录：父目录存在杂散 package-lock.json 时 Next 会误判 workspace root
  outputFileTracingRoot: path.join(__dirname),
  // Disable source maps in production to save memory
  productionBrowserSourceMaps: false,
  // Increase timeout for static page generation
  staticPageGenerationTimeout: 180,
  // Improve memory usage
  experimental: {
    // This is default in recent versions but good to be explicit if issues arise
    optimizePackageImports: [
      'lucide-react',
      '@heroicons/react',
      'framer-motion',
      '@lobehub/icons',
      '@ant-design/plots',
      'antd',
      '@ant-design/x',
      '@ant-design/icons',
      'date-fns',
      'react-markdown',
      'remark-gfm',
      'mermaid',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'gsap',
      'cmdk',
      'zod',
      'mqtt',
    ],
  },
  // Fix mermaid module resolution issues - works with both Turbopack and Webpack
  transpilePackages: ['mermaid'],
  // Mark server-only packages to prevent client-side bundling (moved from experimental in Next.js 16+)
  serverExternalPackages: ['lightningcss', 'better-sqlite3', 'pg', 'pg-connection-string', 'bcryptjs'],
  // Turbopack configuration (Next.js 16+)
  turbopack: {
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
  },
  // Webpack configuration (fallback for --webpack flag)
  webpack: (config, { isServer }) => {
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx', '.jsx'],
      '.mjs': ['.mjs', '.mts'],
    };
    
    // Exclude Node.js built-in modules from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
        util: false,
      };
    }
    
    return config;
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
  // 本地开发代理 OnlyOffice Document Server
  // Docker 容器暴露在宿主机的 8080 端口，前端通过 /onlyoffice/* 访问
  // 生产环境由 nginx 反代，不需要这条
  async rewrites() {
    const isDev = process.env.NODE_ENV !== "production";
    const onlyofficeHost = process.env.ONLYOFFICE_URL || "http://localhost:8080";

    return {
      // beforeFiles 的匹配时机早于 public/ 静态文件与 _next 资源，
      // 因此这里可以把 /logo.png 从静态文件手里"接管"给动态端点：
      // 管理员在 admin UI 更换应用图标后，全站（favicon、PWA manifest 图标、
      // 侧边栏品牌位、邮件模板 logo）随之后续请求即时生效，无需重新构建部署。
      beforeFiles: [
        {
          source: "/logo.png",
          destination: "/api/branding/icon",
        },
      ],
      afterFiles: isDev
        ? [
            {
              source: "/onlyoffice/:path*",
              destination: `${onlyofficeHost}/:path*`,
            },
          ]
        : [],
      fallback: [],
    };
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== "production";
    // 开发环境放宽 CSP 允许 OnlyOffice iframe 与跨域连接
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://*.alipay.com https://*.alipayobjects.com https://*.qq.com https://*.weixin.qq.com https://static.cloudflareinsights.com https://o.alicdn.com ${isDev ? "http://localhost:8080 'unsafe-eval' 'unsafe-inline'" : ""};
      script-src-elem 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://*.alipay.com https://*.alipayobjects.com https://*.qq.com https://*.weixin.qq.com https://static.cloudflareinsights.com https://o.alicdn.com ${isDev ? "http://localhost:8080" : ""};
      worker-src 'self' blob:;
      style-src 'self' 'unsafe-inline' https://o.alicdn.com ${isDev ? "http://localhost:8080 'unsafe-inline'" : ""};
      style-src-elem 'self' 'unsafe-inline' https://o.alicdn.com ${isDev ? "http://localhost:8080 'unsafe-inline'" : ""};
      img-src 'self' blob: data: https: https://images.unsplash.com https://plus.unsplash.com https://o.alicdn.com ${isDev ? "http://localhost:8080 data:" : ""};
      media-src 'self' blob: data: ${isDev ? "http://localhost:8080" : ""};
      font-src 'self' data: ${isDev ? "http://localhost:8080 data:" : ""};
      connect-src 'self' blob: data: https://*.alipay.com https://*.qq.com https://*.weixin.qq.com https://api.ipify.org ws: wss: https://o.alicdn.com https://*.stravision.site wss://*.stravision.site ${isDev ? "http://localhost:8080 ws://localhost:8080" : ""};
      object-src 'self';
      base-uri 'self';
      form-action 'self';
      ${isDev ? "" : "frame-ancestors 'none';"}
      frame-src 'self' https: https://challenges.cloudflare.com https://*.alipay.com https://*.qq.com https://o.alicdn.com ${isDev ? "http://localhost:8080" : ""};
    `.replace(/\s{2,}/g, ' ').trim()

    return [
      {
        source: '/:path*',
        headers: [
          // 跨源隔离（COOP + COEP credentialless）：开启 SharedArrayBuffer，
          // 使 onnxruntime-web 的 Silero VAD 推理真正生效（否则 simd-threaded.wasm
          // 在无 SAB 时静默失败）。credentialless 不会像 require-corp 那样阻断
          // 第三方资源，跨域请求仅去除凭证，兼容现有 alipay/qq/wechat/unsplash 等。
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless'
          },
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
            // 桌面端需放开 camera：(self) —— 摄像头巡检、拍照上传依赖本机摄像头，
            // 且桌面窗口访问的是 127.0.0.1 本地服务，非公网页面。
            // 浏览器部署保持 camera=()，威胁模型不同，公网页面不应默认获得摄像头权限。
            key: 'Permissions-Policy',
            value: isDesktopBuild
              ? 'camera=(self), microphone=(self), geolocation=(self)'
              : 'camera=(), microphone=(self), geolocation=(self)'
          }
        ]
      }
    ]
  },
};

export default nextConfig;
