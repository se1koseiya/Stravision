import type { Metadata } from "next";
import "./globals.css";
import { WeatherProvider } from "@/lib/contexts/weather-context";
import { DeviceProvider } from "@/lib/contexts/device-context";
import { ElderFriendlyProvider } from "@/lib/contexts/elder-friendly-context";
import { ThemeProvider } from "@/components/theme-provider";
import { PageTransition } from "@/components/page-transition";
import { LazyProviders } from "@/components/lazy-providers";
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
              <p style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
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
        <NextTopLoader color="var(--primary)" showSpinner={false} />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ElderFriendlyProvider>
            <WeatherProvider>
              <DeviceProvider>
                <LazyProviders>
                  <PageTransition>
                    {children}
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
