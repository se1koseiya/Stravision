"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import CapWidget from "@/components/ui/cap-widget"
import { isCapRequiredClient } from "@/lib/cap-client"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/* 登录卡片顶部美术资源（public/web/login/） */
const LOGIN_ART = "/web/login/memory.png"

// Helper for redirect
const getRedirectPath = () => {
  if (typeof window === 'undefined') return "/monitor"
  const isMobile = /mobile|android|iphone|ipad|phone/i.test(window.navigator.userAgent)
  return isMobile ? "/home" : "/monitor"
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [captchaCompleted, setCaptchaCompleted] = useState(false)
  const [capToken, setCapToken] = useState("")
  const [warning, setWarning] = useState<{ type: string; message: string; lastRegion: string | null } | null>(null)
  const [showWarningDialog, setShowWarningDialog] = useState(false)

  // Verification Code State
  const [requireVerification, setRequireVerification] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const [sendingCode, setSendingCode] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // 测试环境（NODE_ENV≠production）跳过人机验证：不渲染 widget、不强制校验
  const capRequired = isCapRequiredClient()
  const shouldShowCaptcha = capRequired && email.length > 0 && password.length > 0

  // 协议勾选（对齐 Loomy/Accio 登录卡）
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    if (!shouldShowCaptcha) {
      setCaptchaCompleted(false)
      setCapToken("")
    }
  }, [shouldShowCaptcha])

  // 当验证码组件展示或验证成功时，自动滚动到最底下以展现后续内容
  useEffect(() => {
    if (shouldShowCaptcha || captchaCompleted) {
      const timer = setTimeout(() => {
        const panel = document.querySelector('.exact-left-panel')
        if (panel) {
          panel.scrollTo({
            top: panel.scrollHeight,
            behavior: 'smooth'
          })
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [shouldShowCaptcha, captchaCompleted])

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/auth/me")
        const data = await res.json()
        if (data?.authenticated) router.replace(getRedirectPath())
      } catch { }
    }
    check()

    const params = new URLSearchParams(window.location.search)
    const errorParam = params.get('error')
    const msgParam = params.get('msg')

    if (errorParam) {
      const errorMessages: Record<string, string> = {
        'alipay_state': '支付宝登录验证失败，请重试',
        'alipay_code_missing': '支付宝授权码缺失',
        'alipay_config_missing': '支付宝配置缺失，请联系管理员',
        'alipay_sdk_init': `支付宝SDK初始化失败: ${msgParam || '请检查密钥配置'}`,
        'alipay_token': `获取支付宝令牌失败: ${msgParam || '请检查应用配置'}`,
        'alipay_no_token': '支付宝未返回访问令牌',
        'alipay_user_id_missing': `无法获取支付宝用户ID${msgParam ? ': ' + msgParam : '，请查看服务器日志'}`,
        'alipay_exception': `支付宝登录异常: ${msgParam || '未知错误'}`,
      }

      setError(errorMessages[errorParam] || `登录失败: ${errorParam}`)
      window.history.replaceState({}, '', '/login')
    }
  }, [router])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const sendVerificationCode = async () => {
    setSendingCode(true)
    setError("")
    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || "发送验证码失败")
        setSendingCode(false)
        return
      }
      setCodeSent(true)
      setCountdown(60)
    } catch {
      setError("网络错误")
    } finally {
      setSendingCode(false)
    }
  }

  const onSubmit = async () => {
    if (!agreed) {
      setError("请先阅读并同意《用户协议》与《隐私政策》")
      return
    }
    // 仅生产环境强制人机验证；测试环境跳过
    if (capRequired && (!captchaCompleted || !capToken)) {
      setError("请完成人机验证")
      return
    }

    setLoading(true)
    setError("")
    try {
      const body: any = { email, password }
      if (capRequired) body.capToken = capToken
      if (requireVerification && verificationCode) {
        body.verificationCode = verificationCode
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || "登录失败")
        // 人机验证令牌通常一次性使用，登录失败后需要重新验证
        setCaptchaCompleted(false)
        setCapToken("")
        setLoading(false)
        return
      }

      const responseData = await res.json()

      if (responseData.requireVerification) {
        setWarning(responseData.warning)
        setRequireVerification(true)
        setShowWarningDialog(true)
        setLoading(false)
        return
      }

      if (responseData.warning) {
        setWarning(responseData.warning)
        setShowWarningDialog(true)
        setLoading(false)
        return
      }

      window.location.href = getRedirectPath()
    } catch (e) {
      console.error("Login error:", e)
      setError("网络错误")
      setLoading(false)
    }
  }

  const handleProceed = () => {
    window.location.href = getRedirectPath()
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-white font-sans">
      {/* 背景光斑：左下柠檬黄 + 右上薄荷绿（对齐 Loomy 登录页） */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(42% 44% at 4% 96%, rgba(255,248,94,0.35) 0%, transparent 70%), radial-gradient(46% 48% at 97% 6%, rgba(117,255,159,0.30) 0%, transparent 70%)",
        }}
      />

      {/* 左上品牌 */}
      <Link
        href="/"
        className="absolute left-6 top-6 z-20 flex items-center gap-2.5"
        aria-label="莓界 Berry Realm 首页"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="size-8 rounded-[10px] object-cover" />
        <span className="text-[17px] font-extrabold tracking-tight text-[#222]" style={{ fontFamily: "'AlimamaShuHeiTi', sans-serif" }}>
          莓界
        </span>
      </Link>

      {/* 居中登录卡 */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[400px] overflow-hidden rounded-[20px] bg-white shadow-[0_24px_70px_-24px_rgba(15,23,42,0.28)] ring-1 ring-black/[0.04]"
        >
          {/* 顶部美术：海报轮换 + 白色曲线收边（对齐 Loomy 卡片插画语言） */}
          <div className="relative h-44 overflow-hidden bg-[#F3FAF5]">
            <Image
              src={LOGIN_ART}
              alt="莓小智"
              fill
              sizes="400px"
              className="object-cover"
              style={{ objectPosition: "center 22%" }}
              priority
            />
            <div
              aria-hidden
              className="absolute inset-x-[-10%] bottom-[-34px] h-[68px] rounded-[100%] bg-white"
            />
          </div>

          <div className="px-7 pb-7 pt-4">
            <h1 className="text-[22px] font-bold leading-tight text-[#1a1a1a]" style={{ fontFamily: "'AlimamaShuHeiTi', sans-serif" }}>
              欢迎登录
            </h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#999]">
              欢迎使用莓界，登录您的莓园管控中心
            </p>

            <div className="mt-6 space-y-3">
              <Input
                id="email"
                type="email"
                placeholder="账户邮箱"
                className="h-12 rounded-[10px] border-[#e5e5e5] bg-white text-sm text-[#111] placeholder:text-[#bbb] focus-visible:ring-2 focus-visible:ring-[#4ED18F]/60 focus-visible:border-[#4ED18F]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  placeholder="密码"
                  className="h-12 rounded-[10px] border-[#e5e5e5] bg-white text-sm text-[#111] placeholder:text-[#bbb] focus-visible:ring-2 focus-visible:ring-[#4ED18F]/60 focus-visible:border-[#4ED18F] pr-16"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                />
                <Link
                  href="/forgot-password"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-medium text-[#999] transition-colors hover:text-[#009456]"
                >
                  忘记密码？
                </Link>
              </div>
            </div>

            {/* Cap Widget —— CAP 启用即始终显示（不再依赖邮箱/密码已填），验证完成后收起 */}
            <AnimatePresence>
              {capRequired && !captchaCompleted && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="py-1">
                    <CapWidget
                      onSuccess={(token) => {
                        setCaptchaCompleted(true)
                        setCapToken(token)
                      }}
                      onError={() => {
                        setCaptchaCompleted(false)
                        setCapToken("")
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              className="mt-5 h-12 w-full rounded-[10px] bg-[#111] text-[15px] font-semibold tracking-[0.2em] text-white shadow-none transition-opacity hover:opacity-85 hover:shadow-none"
              onClick={onSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>验证中...</span>
                </>
              ) : (
                "登 录"
              )}
            </Button>

            {/* 协议勾选（对齐 Loomy 登录卡） */}
            <label className="mt-4 flex cursor-pointer items-start gap-2 text-[11px] leading-relaxed text-[#999]">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 size-3.5 shrink-0 cursor-pointer appearance-none rounded-[4px] border border-[#d4d4d4] transition-colors checked:border-[#009456] checked:bg-[#009456] bg-no-repeat bg-center"
                style={
                  agreed
                    ? { backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='white'%3E%3Cpath d='M12.7 5.3a1 1 0 0 1 0 1.4l-4.5 4.5a1 1 0 0 1-1.4 0L4.3 8.7a1 1 0 0 1 1.4-1.4l1.8 1.8 3.8-3.8a1 1 0 0 1 1.4 0z'/%3E%3C/svg%3E\")" }
                    : undefined
                }
              />
              <span>
                阅读并同意
                <Link href="/terms" className="mx-0.5 text-[#009456] hover:underline">《用户协议》</Link>
                <Link href="/privacy" className="mx-0.5 text-[#009456] hover:underline">《隐私政策》</Link>
                ，未注册的账户登录后将自动注册
              </span>
            </label>

            {error && (
              <div className="mt-3 flex items-center justify-center gap-2 rounded-[10px] border border-red-100 bg-red-50 p-2.5 text-[11px] font-medium text-red-600">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                {error}
              </div>
            )}

            <div className="flex items-center justify-center gap-4 py-4">
              <div className="h-px flex-1 bg-[#eeeeee]" />
              <span className="text-[10px] font-medium uppercase tracking-widest text-[#bbb]">或使用</span>
              <div className="h-px flex-1 bg-[#eeeeee]" />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="h-11 flex-1 rounded-[10px] border-[#e5e5e5] bg-white text-[#555] transition-all hover:bg-[#f7f7f7] hover:text-black"
                onClick={() => window.location.href = "/api/auth/alipay/login"}
              >
                <Image src="/alipay.svg" alt="Alipay" width={16} height={16} className="mr-1.5 h-4 w-4 opacity-80" />
                <span className="text-xs font-medium">支付宝</span>
              </Button>
              <Button
                variant="outline"
                className="h-11 flex-1 rounded-[10px] border-[#e5e5e5] bg-white text-[#555] transition-all hover:bg-[#f7f7f7] hover:text-black"
                onClick={() => window.location.href = "/api/auth/qq/login"}
              >
                <svg className="mr-1.5 h-4 w-4 opacity-80" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                  <path d="M824.8 613.2c-16-51.4-34.4-94.6-62.7-165.3C766.5 262.2 689.3 112 511.5 112 331.7 112 256.2 265.2 261 447.9c-28.4 70.8-46.7 113.7-62.7 165.3-34 109.5-23 154.8-14.6 155.8 18 2.2 70.1-82.4 70.1-82.4 0 49 25.2 112.9 79.8 159-26.4 8.1-85.7 29.9-71.6 53.8 11.4 19.3 196.2 12.3 249.5 6.3 53.3 6 238.1 13 249.5-6.3 14.1-23.8-45.2-45.7-71.6-53.8 54.6-46.2 79.8-110.1 79.8-159 0 0 52.1 84.6 70.1 82.4 8.5-1.1 19.5-46.4-14.5-155.8z" fill="currentColor" />
                </svg>
                <span className="text-xs font-medium">QQ</span>
              </Button>
            </div>

            <p className="pt-4 text-center text-xs font-medium text-[#999]">
              还没有账户？{" "}
              <Link href="/register" className="font-semibold text-[#111] underline underline-offset-4 transition-all hover:text-[#009456]">
                立即注册
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Warning / Verification Dialog */}
      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogContent className="sm:max-w-md bg-white border-[#e5e5e0] text-[#1a1a1a] shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              {requireVerification ? "安全验证" : "安全警告"}
            </DialogTitle>
            <DialogDescription className="text-[#888] pt-2">
              {warning?.message}
            </DialogDescription>
          </DialogHeader>

          {requireVerification && (
            <div className="py-4 space-y-4">
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-[#666] font-medium uppercase tracking-wider">邮箱验证码</Label>
                <div className="flex gap-2">
                  <InputOTP
                    maxLength={6}
                    value={verificationCode}
                    onChange={setVerificationCode}
                  >
                    <InputOTPGroup className="gap-2">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="w-10 h-10 rounded-lg border border-[#e5e5e0] bg-[#f4f3ef] text-[#111]"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 px-3 min-w-[100px] rounded-lg border-[#e5e5e0] text-black hover:text-black hover:bg-[#e4e2dd] text-xs"
                    onClick={sendVerificationCode}
                    disabled={sendingCode || countdown > 0}
                  >
                    {sendingCode ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : countdown > 0 ? (
                      `${countdown}s`
                    ) : (
                      "获取验证码"
                    )}
                  </Button>
                </div>
                {codeSent && <p className="text-[11px] text-[#4a8c3f] font-medium">验证码已发送至您的邮箱</p>}
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!requireVerification ? (
              <Button
                onClick={handleProceed}
                className="bg-amber-600 hover:bg-amber-500 text-white w-full sm:w-auto rounded-full px-6"
              >
              继续登录
              </Button>
            ) : (
              <Button
                onClick={onSubmit}
                disabled={loading || verificationCode.length !== 6}
                className="bg-black hover:bg-black/80 text-white w-full sm:w-auto rounded-full px-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    验证并登录
                  </>
                ) : "验证并登录"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
