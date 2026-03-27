import type { Metadata } from "next";
import "./globals.css";
import { WeatherProvider } from "@/lib/contexts/weather-context";
import { DeviceProvider } from "@/lib/contexts/device-context";
import { ElderFriendlyProvider } from "@/lib/contexts/elder-friendly-context";
import { ThemeProvider } from "@/components/theme-provider";
import { SchedulerInit } from "@/components/scheduler-init";
import { PageTransition } from "@/components/page-transition";
import { SmoothScroll } from "@/components/smooth-scroll";
import { EnvironmentAlert } from "@/components/environment-alert";
import { ToasterWrapper } from "@/components/toaster-wrapper";
import { MessageNotificationListener } from "@/components/message-notification-listener";
import { headers } from "next/headers";
import { isIPBanned, recordAccessLog, getBanDetails } from "@/lib/db/security-service";
import NextTopLoader from "nextjs-toploader";
import { SWRegister } from "@/components/sw-register";
import { DesktopInstallPrompt } from "@/components/desktop-install-prompt";
import { FloatingXiaozhi } from "@/components/xiaozhi/FloatingXiaozhi";
import { FeatureAnnouncementDialog } from "@/components/dashboard/feature-announcement-dialog";
import Script from "next/script";
import { CopyrightProtection } from "@/components/copyright-protection";
import { checkSystemIntegrity } from "@/lib/security/integrity";
import { verifyCodeSignature } from "@/lib/security/signature";
import { AlertTriangle, Fingerprint, Lock, ShieldAlert, Cpu, Code2 } from "lucide-react";

export const metadata: Metadata = {
  title: "STRAVISION 莓界 · 智慧农业平台",
  description: "AI驱动的物联网草莓种植管理平台",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/icon.png",
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


  const { isValid, machineID } = checkSystemIntegrity();
  const { isTampered, tamperedFiles } = verifyCodeSignature();

  if (!isValid || isTampered) {
    return (
      <html lang="zh-CN">
        <body className="bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans antialiased">
          <div className="min-h-screen w-full flex flex-col items-center justify-center p-8 text-center">
            <div className="space-y-6 max-w-lg">
              <h1 className="text-9xl font-extrabold tracking-tighter text-zinc-200 dark:text-zinc-800">404</h1>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-200">
                  {isTampered ? "无法加载系统资源" : "页面不存在"}
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                  {isTampered
                    ? "由于核心组件校验失败，系统无法正常初始化。请检查您的网络连接或尝试重新启动服务器。"
                    : "您请求的资源在服务器上未找到，或者由于安全原因已被临时挂起。请返回首页或联系系统管理员。"}
                </p>
              </div>

              <div className="pt-8">
                <a
                  href="/"
                  className="inline-flex h-10 items-center px-6 rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-sm font-medium transition-colors hover:bg-zinc-800 dark:hover:bg-zinc-200"
                >
                  返回首页
                </a>
              </div>


              <div className="fixed bottom-8 left-0 right-0 opacity-10 hover:opacity-100 transition-opacity duration-500 cursor-default">
                <div className="text-[10px] font-mono text-zinc-500 flex flex-col items-center gap-1">
                  <span>ENVIRONMENT_STATUS: ERROR_MISMATCH</span>
                  <div className="flex items-center gap-2">
                    <span className="uppercase tracking-widest text-zinc-600">Trace ID:</span>
                    <span className="select-all">{machineID}</span>
                  </div>
                  {isTampered && (
                    <div className="mt-1 flex gap-2">
                      <span className="text-rose-500/50">TAMPER_SIG:</span>
                      <span>{tamperedFiles.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    );
  }

  // Record normal access (optional, but requested "record every visiting ip")

  return (
    <html lang="en">
      <head>
        <Script
          id="aliyun-captcha-config"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.AliyunCaptchaConfig=window.AliyunCaptchaConfig||{region:${JSON.stringify(process.env.NEXT_PUBLIC_ALIYUN_CAPTCHA_REGION || "cn")},prefix:${JSON.stringify(process.env.NEXT_PUBLIC_ALIYUN_CAPTCHA_PREFIX || "")}};`,
          }}
        />
        <Script
          id="aliyun-captcha-sdk"
          strategy="beforeInteractive"
          src="https://o.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js"
        />
      </head>
      <body className={`antialiased font-jinbuti`}>
        <CopyrightProtection />
        <NextTopLoader color="var(--primary)" showSpinner={false} />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ElderFriendlyProvider>
            <SchedulerInit />
            <WeatherProvider>
              <DeviceProvider>
                <EnvironmentAlert />
                <SmoothScroll>
                  <PageTransition>
                    {children}
                  </PageTransition>
                  <ToasterWrapper />
                  <MessageNotificationListener />
                  <SWRegister />
                  <DesktopInstallPrompt />
                  <FloatingXiaozhi />
                  <FeatureAnnouncementDialog autoFetch />
                </SmoothScroll>
              </DeviceProvider>
            </WeatherProvider>
          </ElderFriendlyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
