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
import { AuthLayout } from "@/components/auth/auth-layout"
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
    <AuthLayout
      title="欢迎回来"
      subtitle="登录您的 IoT 管控中心"
    >
      <div className="space-y-3.5">
        <div className="space-y-1.5">
          <Input
            id="email"
            type="email"
            placeholder="账户邮箱"
            className="h-11 rounded-full bg-[#e8e7e3] border-none text-[#111] placeholder:text-[#999] focus-visible:ring-1 focus-visible:ring-black px-5 text-sm shadow-inner"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-1.5 relative">
          <Input
            id="password"
            type="password"
            placeholder="密码"
            className="h-11 rounded-full bg-[#e8e7e3] border-none text-[#111] placeholder:text-[#999] focus-visible:ring-1 focus-visible:ring-black px-5 pr-20 text-sm shadow-inner"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Link href="/forgot-password" className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-[#666] hover:text-black transition-colors font-medium">
            忘记密码？
          </Link>
        </div>

        {/* Cap Widget */}
        <AnimatePresence>
          {shouldShowCaptcha && (
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
          className="w-full h-11 rounded-full bg-black hover:bg-black/80 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 text-sm tracking-wider mt-2"
          onClick={onSubmit}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              <span>验证中...</span>
            </>
          ) : "登 录"}
        </Button>

        {error && (
          <div className="p-2.5 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-[11px] font-medium text-center flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-4 py-2">
          <div className="h-[1px] flex-1 bg-[#e4e2dd]"></div>
          <span className="text-[10px] text-[#aaa] uppercase tracking-widest font-medium">其他方式</span>
          <div className="h-[1px] flex-1 bg-[#e4e2dd]"></div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-10 rounded-full bg-white/50 border-[#e4e2dd] text-[#555] hover:bg-white hover:text-black transition-all shadow-sm"
            onClick={() => window.location.href = "/api/auth/alipay/login"}
          >
            <Image src="/alipay.svg" alt="Alipay" width={16} height={16} className="w-4 h-4 mr-1.5 opacity-80" />
            <span className="text-xs font-medium">支付宝</span>
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-10 rounded-full bg-white/50 border-[#e4e2dd] text-[#555] hover:bg-white hover:text-black transition-all shadow-sm"
            onClick={() => window.location.href = "/api/auth/qq/login"}
          >
            <svg className="w-4 h-4 mr-1.5 opacity-80" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
              <path d="M824.8 613.2c-16-51.4-34.4-94.6-62.7-165.3C766.5 262.2 689.3 112 511.5 112 331.7 112 256.2 265.2 261 447.9c-28.4 70.8-46.7 113.7-62.7 165.3-34 109.5-23 154.8-14.6 155.8 18 2.2 70.1-82.4 70.1-82.4 0 49 25.2 112.9 79.8 159-26.4 8.1-85.7 29.9-71.6 53.8 11.4 19.3 196.2 12.3 249.5 6.3 53.3 6 238.1 13 249.5-6.3 14.1-23.8-45.2-45.7-71.6-53.8 54.6-46.2 79.8-110.1 79.8-159 0 0 52.1 84.6 70.1 82.4 8.5-1.1 19.5-46.4-14.5-155.8z" fill="currentColor" />
            </svg>
            <span className="text-xs font-medium">QQ</span>
          </Button>
        </div>

        <p className="text-xs text-center text-[#999] pt-3.5 font-medium">
          还没有账户？{" "}
          <Link href="/register" className="text-black hover:text-[#4a8c3f] font-semibold transition-all underline underline-offset-4">
            立即注册
          </Link>
        </p>
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
    </AuthLayout>
  )
}
