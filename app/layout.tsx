import type { Metadata, Viewport } from "next";
import "./globals.css";
import { WeatherProvider } from "@/lib/contexts/weather-context";
import { DeviceProvider } from "@/lib/contexts/device-context";
import { ElderFriendlyProvider } from "@/lib/contexts/elder-friendly-context";
import { ThemeProvider } from "@/components/theme-provider";
import { PageTransition } from "@/components/page-transition";
import { LazyProviders } from "@/components/lazy-providers";
import { DesktopNotificationBridge } from "@/components/desktop/desktop-notification-bridge";
// 桌面端自绘标题栏的兜底层（Provider 不产生额外 DOM，只在"这一页没有顶栏"时
// 补一条顶部拖拽带 + 窗口控制键 —— 主窗口是无边框的，登录页也必须有 − □ ✕）。
import { DesktopWindowChromeProvider } from "@/components/desktop/desktop-window-chrome";
// 沉浸光感材质（HDS 组件材质）—— **全局注入**（不是按页注入）：
//   ① 页面导航 / 头像菜单 / 顶部横幅是全局 chrome，几乎每页都在用；
//   ② antd / Radix 的 Modal / Select / Dropdown 都 portal 到 body，只认全局样式；
//   ③ 按页注入的话，没注入的页面会拿到「没有材质本体」的裸类名（.dc-mat 无定义 → 元素直接全透明）。
// 页面侧只再注入自己的氛围层（如 dashboard 的 .dash-atmos）。
import { MATERIAL_CSS, MATERIAL_PREF_BOOT } from "@/components/device/material-css";
import { GLASS_ALPHA_BOOT } from "@/lib/ui/glass-alpha";
// 沉浸光感「场景轴」的声明入口：按路由白名单决定这一屏有没有"景"（= 该不该用玻璃）。
// 白名单只有 /device-control；桌面端窗口透传桌面壁纸时全站视为有景。见文件内注释。
import { ImvSceneBridge } from "@/components/device/imv-scene";
import { headers } from "next/headers";
import { isIPBanned, recordAccessLog, getBanDetails } from "@/lib/db/security-service";
import NextTopLoader from "nextjs-toploader";

export const metadata: Metadata = {
  title: "莓界 Berry Realm · 让每一寸土地都孕育生机",
  description:
    "莓界是一个由 AI 驱动的智慧农业平台——用自然语言对话，即可感知、决策与守护你的草莓园，让每一次生长都被精准照料。",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  manifest: "/manifest.json",
  /**
   * PWA 添加到 iOS 主屏后以 standalone 全屏运行；状态栏透明（内容延伸到
   * 灵动岛/刘海后面，由各页 safe-area 避让），而非白条压顶。
   */
  appleWebApp: {
    capable: true,
    title: "莓界",
    statusBarStyle: "black-translucent",
  },
};

/**
 * iOS 灵动岛 / 刘海适配（2026-10-05）—— 全站 safe-area 的开关，缺了它下面全是摆设：
 *   `viewport-fit=cover` 让页面延伸进刘海/灵动岛/Home Indicator 区域，
 *   此时 `env(safe-area-inset-top/bottom)` 才有非零值，各页的
 *   `pt-[max(env(safe-area-inset-top),14px)]` 避让才真正生效。
 *   ⚠️ 没有这一行，env() 恒为 0 —— 灵动岛机型上状态栏会直接压住页面内容。
 * appleWebApp.statusBarStyle="black-translucent"：PWA 添加到主屏后状态栏透明，
 *   内容顶到灵动岛后面（配合上面的 safe-area 避让），呈现原生 iOS 全屏观感。
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F5F6" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0B0C" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // IP Ban Check
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

  const banDetails = await getBanDetails(ip);
  if (banDetails) {
    // Record access attempt
    await recordAccessLog({
      ip,
      method: "GET",
      path: "layout",
      status: 403,
      duration: 0,
      user_agent: headersList.get("user-agent") || ""
    });

    return (
      <html lang="en">
        <body>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            flexDirection: 'column',
            fontFamily: 'system-ui, sans-serif',
            padding: '20px',
            textAlign: 'center'
          }}>
            <h1 style={{ color: '#e11d48', fontSize: '2rem', marginBottom: '1rem' }}>Access Denied</h1>
            <p style={{ marginBottom: '1rem' }}>Your IP address ({ip}) has been banned from accessing this system.</p>
            {banDetails.reason && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fee2e2',
                color: '#b91c1c',
                padding: '1rem',
                borderRadius: '0.5rem',
                maxWidth: '400px'
              }}>
                <strong>Reason:</strong> {banDetails.reason}
              </div>
            )}
            {banDetails.expires_at && (
              <p style={{ marginTop: '1rem', color: '#71717A', fontSize: '0.875rem' }}>
                Expires: {new Date(banDetails.expires_at).toLocaleString()}
              </p>
            )}
          </div>
        </body>
      </html>
    );
  }

  // Record normal access (optional, but requested "record every visiting ip")
  // To avoid slowing down page loads, we fire and forget, but in Server Components
  // we can't easily fire-and-forget without `void`.
  // Also, doing this on every layout render might be heavy.
  // We'll record it.
  // 解码 auth cookie 获取 user_id（仅本地 JWT 校验，无 DB 开销），供在线用户统计使用
  let accessUserId: number | undefined
  try {
    const cookieHeader = headersList.get("cookie") || ""
    const authMatch = cookieHeader.match(/(?:^|;\s*)auth=([^;]+)/)
    if (authMatch) {
      const { verifyToken } = await import("@/lib/token")
      const payload = await verifyToken(decodeURIComponent(authMatch[1]))
      if (payload?.id) accessUserId = payload.id
    }
  } catch {
    // token 无效按未登录处理
  }

  recordAccessLog({
    ip,
    method: "GET",
    path: "PAGE_VIEW", // Not easy to get full path in layout
    status: 200,
    duration: 0,
    user_id: accessUserId,
    user_agent: headersList.get("user-agent") || ""
  }).catch(console.error);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased font-jinbuti`}>
        {/* 沉浸光感厚度（用户在设置里选的）：**水合前**先把 html[data-mat-level] 写上，
            否则 React 挂载那一帧会先按自动档渲染、随后跳档 —— 「精美」用户开机必然看见闪一下。
            顺带覆盖没挂 useAdaptiveMaterialLevel 的页面（档位变量挂在 html 上，dataset 在就生效）。
            没设置过则什么都不写，行为与以前一致（交给 hook 自适应探测）。 */}
        <script dangerouslySetInnerHTML={{ __html: MATERIAL_PREF_BOOT }} />
        {/* 窗口不透明度（设置 ▸ 外观 ▸ 桌面透视）：同样水合前先写 --glass-a，
            否则桌面端冷启动会先按默认透明度画一帧再跳，闪一下。浏览器部署下是空操作。 */}
        <script dangerouslySetInnerHTML={{ __html: GLASS_ALPHA_BOOT }} />
        {/* HDS 沉浸光感材质 · 全局样式表（材质本体 + 档位 + 按压光效）。见上方 import 说明。 */}
        <style>{MATERIAL_CSS}</style>
        <NextTopLoader color="var(--primary)" showSpinner={false} />
        {/* 桌面端：点原生通知后把页面导航到通知携带的路由（浏览器部署下是空组件） */}
        <DesktopNotificationBridge />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ImvSceneBridge />
          <ElderFriendlyProvider>
            <WeatherProvider>
              <DeviceProvider>
                <LazyProviders>
                  <PageTransition>
                    <DesktopWindowChromeProvider>
                      {children}
                    </DesktopWindowChromeProvider>
                  </PageTransition>
                </LazyProviders>
              </DeviceProvider>
            </WeatherProvider>
          </ElderFriendlyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
