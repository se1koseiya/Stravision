import type { Metadata } from "next";
import "./globals.css";
import { WeatherProvider } from "@/lib/contexts/weather-context";
import { DeviceProvider } from "@/lib/contexts/device-context";
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
import Script from "next/script";

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

  // Record normal access (optional, but requested "record every visiting ip")
  // To avoid slowing down page loads, we fire and forget, but in Server Components 
  // we can't easily fire-and-forget without `void`.
  // Also, doing this on every layout render might be heavy.
  // We'll record it.
  recordAccessLog({
    ip,
    method: "GET",
    path: "PAGE_VIEW", // Not easy to get full path in layout
    status: 200,
    duration: 0,
    user_agent: headersList.get("user-agent") || ""
  }).catch(console.error);

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
        <NextTopLoader color="var(--primary)" showSpinner={false} />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
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
              </SmoothScroll>
            </DeviceProvider>
          </WeatherProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
