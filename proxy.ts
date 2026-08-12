import { NextRequest, NextResponse, NextFetchEvent } from "next/server"
import { rateLimit, getClientIp, resetIp, unbanIp } from "@/lib/rate-limit"
import { getInternalApiSecret } from "@/lib/constants"
import { verifyToken } from "@/lib/token"

function isMobileUA(ua: string | null, chMobile: string | null) {
  if (chMobile === "?1") return true
  if (!ua) return false
  const u = ua.toLowerCase()
  if (u.includes("ipad") || u.includes("tablet")) return false
  const hasAndroidMobile = u.includes("android") && (u.includes("mobile") || u.includes("mobi"))
  const hasIphone = u.includes("iphone") || u.includes("ipod")
  const hasWindowsPhone = u.includes("windows phone")
  const hasGenericMobile = u.includes("mobi") || u.includes("mobile")
  return hasAndroidMobile || hasIphone || hasWindowsPhone || hasGenericMobile
}

export async function proxy(req: NextRequest, event: NextFetchEvent) {
  const url = new URL(req.url)
  const pathname = url.pathname
  const banEnabled = process.env.NODE_ENV === "production"
  const globals = globalThis as unknown as {
    rateLimitConfig?: { limit: number; windowMs: number; violationLimit: number; banDuration: number }
    lastConfigFetch?: number
    maintenanceConfig?: { enabled: boolean }
    lastMaintenanceFetch?: number
  }

  // Skip internal APIs to avoid infinite loops and rate limiting on internal checks
  if (pathname.startsWith("/api/internal")) {
    return NextResponse.next()
  }

  // Exempt Alipay login and callback from rate limiting
  if (pathname.startsWith("/api/auth/alipay/login") || 
      pathname.startsWith("/api/auth/alipay/callback") || 
      pathname.startsWith("/api/auth/ticket/check")) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/api/stream-proxy")) {
    return NextResponse.next()
  }

  // --- Maintenance Mode Check (内存缓存 + 后台刷新，不阻塞请求) ---
  // 旧实现：每个 /api/* 请求都同步 await fetch maintenance/check，导致所有 API 延迟翻倍
  // 新实现：用内存缓存，60s 后台刷新一次，缓存命中时零延迟
  const maintenanceConfig = globals.maintenanceConfig
  const maintenanceNow = Date.now()
  if (!maintenanceConfig || (maintenanceNow - (globals.lastMaintenanceFetch || 0) > 60000)) {
    // 后台刷新（不 await，不阻塞当前请求）
    const protocol = req.nextUrl.protocol
    const host = req.headers.get("host") || 'localhost:3000'
    fetch(`${protocol}//${host}/api/internal/maintenance/check`, {
      headers: { "x-internal-secret": getInternalApiSecret() }
    }).then(res => res.json()).then(config => {
      if (config && !config.error) {
        globals.maintenanceConfig = config
        globals.lastMaintenanceFetch = Date.now()
      }
    }).catch(() => {})
  }

  if (maintenanceConfig?.enabled) {
    // Allowed paths during maintenance
    const isAllowedPath =
      pathname.startsWith("/api/internal") ||
      pathname.startsWith("/api/auth") ||
      pathname === "/login" ||
      pathname === "/maintenance" ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/static") ||
      pathname.includes(".")

    if (!isAllowedPath) {
      const token = req.cookies.get("auth")?.value
      let isAdmin = false
      if (token) {
        try {
          const payload = await verifyToken(token)
          if (payload && (payload.role === 'admin' || payload.role === 'super_admin')) {
            isAdmin = true
          }
        } catch (e) {}
      }
      if (!isAdmin) {
        return NextResponse.redirect(new URL("/maintenance", req.url))
      }
    }
  }
  // -----------------------------

  // Fetch Rate Limit Config (Lazy/Cache)
  // Note: Proxy in Next.js (Node runtime) shares process memory usually, 
  // but to be safe and robust, we fetch from internal API periodically or use defaults.
  // For performance, we'll use hardcoded defaults for now but overridden by logic below if we had a lightweight config store.
  // In a real high-scale app, this would be a Redis call.
  // Here, we'll implement a simple "stale-while-revalidate" in-memory cache variable if possible, 
  // but since proxy scope is tricky, we'll fetch only on specific triggers or just use defaults + DB check for unban.
  
  // Wait, user explicitly asked for Admin adjustable thresholds.
  // We will try to fetch config from internal API asynchronously and update a local variable?
  // No, we can't easily update a global variable reliably across all isolate instances in Edge (though we are on Node).
  // Strategy: We will try to fetch config from a global variable if we are in Node.
  // Actually, we can just fetch it from the internal API with a short timeout? No, adds 10ms+ latency.
  
  // Revised Strategy: We use a "Soft Fetch" - we default to standard limits, but if a request comes in, 
  // we occasionally (e.g. 1% of requests) refresh the config from the DB via internal API and store it in a global.
  
  // For now, to ensure it works immediately without complexity, we'll just define the limits here.
  // If we want dynamic limits, we need to pass them to rateLimit.
  
  // Dynamic Configuration Loading (Simulated with Global Cache)
  const dynamicConfig = globals.rateLimitConfig
  const now = Date.now()
  if (!dynamicConfig || (now - (globals.lastConfigFetch || 0) > 60000)) {
     // Trigger background refresh
     const protocol = req.nextUrl.protocol
     const host = req.headers.get("host") || 'localhost:3000'
     // Don't await to avoid blocking response
     fetch(`${protocol}//${host}/api/internal/security/config`, {
        headers: { "x-internal-secret": getInternalApiSecret() }
     }).then(res => res.json()).then(config => {
        if (config && !config.error) {
           globals.rateLimitConfig = config
           globals.lastConfigFetch = Date.now()
        }
     }).catch(e => console.error("Config fetch failed", e))
  }

  // 1. Auth Protection (New)
  // Protected Routes
  const protectedRoutes = [
    "/dashboard",
    "/monitor",
    "/device-control",
    "/ai-assistant",
    "/chat",
    "/settings",
    "/profile"
  ]
  
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  if (isProtectedRoute) {
    const token = req.cookies.get("auth")?.value
    if (!token) {
      const url = req.nextUrl.clone()
      url.pathname = "/login"
      url.searchParams.set("from", pathname)
      return NextResponse.redirect(url)
    }
  }

  // 0. Global Rate Limiting & Auto-Ban (API & Auth routes)
  // Protect sensitive endpoints from brute force / DoS
  // 豁免聊天相关 API（消息收发频繁，SSE 长连接）
  const isChatApi = pathname.startsWith("/api/direct-messages") ||
                    pathname.startsWith("/api/groups/messages") ||
                    pathname.startsWith("/api/messages") ||
                    pathname.startsWith("/api/chat") ||
                    pathname.startsWith("/api/friends") ||
                    pathname.startsWith("/api/groups") ||
                    pathname.startsWith("/api/events")
  if ((pathname.startsWith("/api") || pathname.startsWith("/login") || pathname.startsWith("/register")) && !isChatApi) {
    // Exempt /api/auth/me from strict limits as it's a frequent session check
    const isStrictAuthApi = pathname.startsWith("/api/auth") && !pathname.startsWith("/api/auth/me");
    
    // Default values if config not loaded yet
    const config = globals.rateLimitConfig || {
       limit: 300,
       windowMs: 60000,
       violationLimit: 20,
       banDuration: 900000
    }

    // Stricter limits for auth endpoints (unless configured otherwise, we assume config is for general API)
    // We can scale auth limits based on general limits (e.g. 1/6th)
    const limit = isStrictAuthApi ? Math.max(5, Math.floor(config.limit / 6)) : config.limit; 
    const windowMs = config.windowMs;
    
    // Enable auto-ban for repeated violations
    const ip = getClientIp(req);
    if (!banEnabled) unbanIp(ip)

    const result = rateLimit(req, { 
       limit, 
       windowMs, 
       autoBan: banEnabled,
       violationLimit: config.violationLimit,
       banDuration: config.banDuration
    });
    
    if (!result.success) {
      if (banEnabled && result.banned) {
        if ("newBan" in result && result.newBan) {
          // Persist ban to DB asynchronously
          const protocol = req.nextUrl.protocol
          const host = req.headers.get("host") || 'localhost:3000'
          event.waitUntil(
            fetch(`${protocol}//${host}/api/internal/security/ban`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'x-internal-secret': getInternalApiSecret()
              },
              body: JSON.stringify({ ip, reason: "Auto-ban: Frequent suspicious activity" })
            }).catch(e => console.error("Failed to persist ban:", e))
          )
        }

        // Check if unbanned in DB (Allowlist Check)
        try {
           const protocol = req.nextUrl.protocol
           const host = req.headers.get("host") || 'localhost:3000'
           const checkRes = await fetch(`${protocol}//${host}/api/internal/security/check?ip=${ip}`, {
              headers: { "x-internal-secret": getInternalApiSecret() }
           })
           
           if (checkRes.ok) {
             const { banned } = await checkRes.json()
             if (!banned) {
               // Unbanned in DB -> Unban locally
               resetIp(ip)
               return NextResponse.next()
             }
           }
        } catch (e) {
           console.error("Security check failed:", e)
        }

        console.warn(`[Security] IP ${ip} blocked due to suspicious behavior (Auto-Ban)`);
        
        // For API requests, return JSON error
        if (pathname.startsWith("/api")) {
          return new NextResponse(JSON.stringify({ error: "Access Denied: Suspicious activity detected." }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        // For page requests (login/register), redirect to Access Denied page
        return NextResponse.redirect(new URL("/access-denied", req.url));
      }

      // For API requests, return JSON error
      if (pathname.startsWith("/api")) {
        return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
          status: 429,
          headers: { "Content-Type": "application/json" }
        });
      }

      // For page requests, redirect to Too Many Requests page
      return NextResponse.redirect(new URL("/too-many-requests", req.url));
    }
  }

  // 1. Admin Protection (Stealth Mode)
  if (pathname.startsWith("/admin")) {
    const token = req.cookies.get("auth")?.value
    // If no token, pretend it doesn't exist (404) or redirect to home to avoid detection
    if (!token) {
      return NextResponse.redirect(new URL("/", req.url))
    }
    // Note: Role check happens in layout/page server components for security
  }
  if (pathname.startsWith("/super-secure-admin")) {
    const token = req.cookies.get("auth")?.value
    if (!token) {
      return NextResponse.redirect(new URL("/", req.url))
    }
  }

  // 2. Authentication Check (Security)
  // 检查是否访问受保护的路由
  const protectedPaths = [
    "/dashboard", 
    "/monitor",
    "/home",
    "/device-control", 
    "/settings", 
    "/profile",
    "/ai-assistant",
    "/super-secure-admin"
  ]
  
  const isProtected = protectedPaths.some(path => pathname.startsWith(path))
  
  if (isProtected) {
    const token = req.cookies.get("auth")?.value
    if (!token) {
      // 如果没有 auth cookie，重定向到登录页
      const loginUrl = new URL("/login", req.url)
      // Add return URL for better UX
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl)
    }
  }

  // 3. Mobile Redirection (UX)
  const ua = req.headers.get("user-agent")
  const chMobile = req.headers.get("sec-ch-ua-mobile")
  const mobile = isMobileUA(ua, chMobile)

  const mapping: Record<string, string> = {
    "/monitor": "/monitor-ios",
    "/device-control": "/device-control-ios",
    "/dashboard": "/dashboard-ios",
    "/ai-assistant": "/ai-assistant-ios"
  }

  // Only redirect if explicitly accessing the desktop version while on mobile
  // and avoid infinite loops or redirecting API calls
  if (mobile && mapping[pathname]) {
    const target = mapping[pathname]
    const nextUrl = new URL(req.url)
    nextUrl.pathname = target
    return NextResponse.rewrite(nextUrl)
  }

  const response = NextResponse.next()

  // 4. Security Headers
  // Add basic security headers to every response
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "SAMEORIGIN")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(self), geolocation=(self)")

  return response
}

export const config = {
  // 匹配所有受保护的路由、API路由和需要移动端适配的路由
  matcher: [
    "/dashboard/:path*", 
    "/monitor/:path*", 
    "/home/:path*",
    "/device-control/:path*", 
    "/settings/:path*",
    "/profile/:path*",
    "/ai-assistant/:path*",
    "/admin/:path*",
    "/super-secure-admin/:path*",
    "/api/:path*",     // Add API routes for rate limiting
    "/login",          // Add login page
    "/register"        // Add register page
  ],
}
