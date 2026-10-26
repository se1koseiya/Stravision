"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { AuthCardShell } from "@/components/auth/auth-card-shell"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import CapWidget from "@/components/ui/cap-widget"
import { isCapRequiredClient } from "@/lib/cap-client"
import { canUse, DESKTOP_CAPABILITIES } from "@/lib/desktop-mode"
import { cn } from "@/lib/utils"
import { IconCheckOne, IconLoading, IconShield } from "@/components/icon";

const getRedirectPath = () => {
  if (typeof window === 'undefined') return "/monitor"
  const isMobile = /mobile|android|iphone|ipad|phone/i.test(window.navigator.userAgent)
  return isMobile ? "/home" : "/monitor"
}

/** 登录/注册共用的输入框样式（新视觉） */
const fieldClass =
  "h-12 rounded-[10px] border-[#e4e4e7] bg-white text-sm text-[#111] placeholder:text-[#bbb] focus-visible:ring-2 focus-visible:ring-[#059669]/60 focus-visible:border-[#059669]"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState("")
  const [emailError, setEmailError] = useState("")
  const [usernameError, setUsernameError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [codeError, setCodeError] = useState("")
  const [captchaCompleted, setCaptchaCompleted] = useState(false)
  const [capToken, setCapToken] = useState("")
  const [showCaptcha, setShowCaptcha] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const capRequired = isCapRequiredClient()
  /**
   * 是否需要邮箱验证码。
   * 桌面端是离线单用户应用：没有发信服务（RESEND_API_KEY），发码接口必然失败，
   * 强制验证会让用户**根本注册不了**。此时隐藏「获取验证码」与 OTP，
   * 允许直接提交（/api/auth/register 本身不校验 email_verified）。
   */
  const needsEmailCode = canUse("registerEmailVerification")

  React.useEffect(() => {
    if (captchaCompleted) {
      setCaptchaCompleted(false)
    }
    setCapToken("")
  }, [email])

  const validateEmail = (value: string) => {
    if (!value) { setEmailError("邮箱不能为空"); return false }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { setEmailError("邮箱格式不正确"); return false }
    setEmailError(""); return true
  }

  const validateUsername = (value: string) => {
    if (!value) { setUsernameError("用户名不能为空"); return false }
    if (value.length < 2 || value.length > 20) { setUsernameError("用户名长度需在2-20个字符之间"); return false }
    setUsernameError(""); return true
  }

  const validatePassword = (value: string) => {
    if (!value) { setPasswordError("密码不能为空"); return false }
    if (value.length < 8) { setPasswordError("密码至少需要8个字符"); return false }
    setPasswordError(""); return true
  }

  const validateCode = (value: string) => {
    if (!value) { setCodeError("验证码不能为空"); return false }
    if (value.length !== 6) { setCodeError("验证码必须是6位数字"); return false }
    setCodeError(""); return true
  }

  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  React.useEffect(() => {
    if (showCaptcha || codeSent) {
      const timer = setTimeout(() => {
        const panel = document.querySelector('.exact-left-panel')
        if (panel) {
          panel.scrollTo({ top: panel.scrollHeight, behavior: 'smooth' })
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [showCaptcha, codeSent])

  const doSendCode = async (token?: string) => {
    const useToken = token || capToken
    if (capRequired && !useToken) {
      setShowCaptcha(true)
      return
    }
    setSendingCode(true)
    setError("")
    try {
      const bodyPayload: any = { email }
      if (capRequired) bodyPayload.capToken = useToken
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || "发送验证码失败")
        setSendingCode(false)
        return
      }
      setCodeSent(true)
      setCountdown(60)
      setError("")
    } catch {
      setError("网络错误")
    } finally {
      setSendingCode(false)
    }
  }

  const handleGetCodeClick = async () => {
    if (!validateEmail(email)) return
    if (capRequired && (!captchaCompleted || !capToken)) {
      setShowCaptcha(true)
      return
    }
    await doSendCode()
  }

  const handleCaptchaSuccess = (token: string) => {
    setCaptchaCompleted(true)
    setCapToken(token)
    setShowCaptcha(false)
    doSendCode(token)
  }

  const onSubmit = async () => {
    const isEmailValid = validateEmail(email)
    const isUsernameValid = validateUsername(username)
    const isPasswordValid = validatePassword(password)
    const isCodeValid = needsEmailCode && codeSent ? validateCode(verificationCode) : true
    if (!isEmailValid || !isUsernameValid || !isPasswordValid || !isCodeValid) return
    if (needsEmailCode && !codeSent) { setError("请先获取验证码"); return }
    if (!agreed) { setError("请阅读并同意服务条款和隐私政策"); return }
    setLoading(true)
    setError("")
    try {
      // 仅网页版需要先校验邮箱验证码（桌面端无发信服务，跳过该步）
      if (needsEmailCode) {
        const verifyRes = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code: verificationCode }),
        })
        if (!verifyRes.ok) {
          const data = await verifyRes.json().catch(() => ({}))
          setError(data?.error || "邮箱验证失败")
          setLoading(false)
          return
        }
      }
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || "注册失败")
        setLoading(false)
        return
      }
      router.replace(getRedirectPath())
    } catch {
      setError("网络错误")
      setLoading(false)
    }
  }

  return (
    <AuthCardShell
      title="加入我们"
      subtitle="创建您的 Stravision ID"
      artSrc="/web/login/memory.png"
      artAlt="莓小智"
      artPosition="center 22%"
    >
      <div className="mt-6 space-y-3">
        {/* 桌面端提示：本地模式不需要邮箱验证，避免用户误以为注册被卡住 */}
        {!needsEmailCode && (
          <div className="flex items-start gap-2 rounded-[10px] border border-[#e6f4ec] bg-[#f4fbf7] px-3 py-2.5">
            <IconShield className="mt-[1px] size-3.5 shrink-0 text-[#059669]" />
            <p className="text-[11px] leading-relaxed text-[#3f6b57]">
              本地模式：无需邮箱验证码，直接注册即可。本机第一个账号将自动成为管理员。
            </p>
          </div>
        )}

        {/* Email（+ 网页版的获取验证码按钮） */}
        <div className="space-y-1.5">
          <div className="relative">
            <Input
              id="email"
              type="email"
              placeholder="账户邮箱"
              className={cn(fieldClass, needsEmailCode && "pr-[104px]")}
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (emailError) validateEmail(e.target.value) }}
              onBlur={(e) => validateEmail(e.target.value)}
            />
            {needsEmailCode && (
              <button
                type="button"
                onClick={handleGetCodeClick}
                disabled={sendingCode || countdown > 0 || !email}
                className={cn(
                  "absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-medium transition-colors",
                  countdown > 0 || sendingCode
                    ? "text-[#bbb]"
                    : "text-[#059669] hover:underline"
                )}
              >
                {sendingCode ? (
                  <IconLoading className="size-3.5 animate-spin" />
                ) : countdown > 0 ? (
                  `${countdown}s`
                ) : codeSent ? (
                  "重新发送"
                ) : (
                  "获取验证码"
                )}
              </button>
            )}
          </div>
          {emailError && <p className="pl-1 text-[11px] font-medium text-red-500">{emailError}</p>}
        </div>

        {/* 人机验证（仅网页版；桌面端构建期已关闭 CAP） */}
        <AnimatePresence>
          {showCaptcha && !captchaCompleted && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: "auto", opacity: 1, marginTop: 12 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="py-1">
                <CapWidget
                  onSuccess={handleCaptchaSuccess}
                  onError={() => { setCaptchaCompleted(false); setCapToken("") }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 邮箱验证码 OTP（网页版专用） */}
        <AnimatePresence>
          {needsEmailCode && codeSent && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 12 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-center gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <OTPBox
                    key={i}
                    index={i}
                    value={verificationCode}
                    onChange={(v) => {
                      setVerificationCode(v)
                      if (codeError) validateCode(v)
                    }}
                    hasError={!!codeError}
                  />
                ))}
              </div>
              {codeError && <p className="mt-2 text-center text-[11px] font-medium text-red-500">{codeError}</p>}
              {verificationCode.length === 6 && !codeError && (
                <div className="mt-2 flex items-center justify-center gap-1 text-[11px] text-[#059669]">
                  <IconCheckOne className="size-3.5" />
                  验证码已输入
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Username */}
        <div className="space-y-1.5">
          <Input
            id="username"
            type="text"
            placeholder="显示名称 / 用户名"
            className={fieldClass}
            value={username}
            onChange={(e) => { setUsername(e.target.value); if (usernameError) validateUsername(e.target.value) }}
            onBlur={(e) => validateUsername(e.target.value)}
          />
          {usernameError && <p className="pl-1 text-[11px] font-medium text-red-500">{usernameError}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Input
            id="password"
            type="password"
            placeholder="密码（至少 8 个字符）"
            className={fieldClass}
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (passwordError) validatePassword(e.target.value) }}
            onBlur={(e) => validatePassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          />
          {passwordError && <p className="pl-1 text-[11px] font-medium text-red-500">{passwordError}</p>}
        </div>

        <Button
          className="mt-5 h-12 w-full rounded-[10px] bg-[#111] text-[14px] font-semibold tracking-[0.2em] text-white shadow-none transition-opacity hover:opacity-85 hover:shadow-none"
          onClick={onSubmit}
          disabled={loading}
        >
          {loading ? (
            <>
              <IconLoading className="mr-2 h-4 w-4 animate-spin" />
              <span>创建中...</span>
            </>
          ) : (
            "注 册"
          )}
        </Button>

        {/* 协议勾选（对齐登录卡） */}
        <label className="mt-4 flex cursor-pointer items-start gap-2 text-[11px] leading-relaxed text-[#999]">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 size-3.5 shrink-0 cursor-pointer appearance-none rounded-[4px] border border-[#d4d4d4] bg-no-repeat bg-center transition-colors checked:border-[#059669] checked:bg-[#059669]"
            style={
              agreed
                ? { backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='white'%3E%3Cpath d='M12.7 5.3a1 1 0 0 1 0 1.4l-4.5 4.5a1 1 0 0 1-1.4 0L4.3 8.7a1 1 0 0 1 1.4-1.4l1.8 1.8 3.8-3.8a1 1 0 0 1 1.4 0z'/%3E%3C/svg%3E\")" }
                : undefined
            }
          />
          <span>
            我已阅读并同意
            <Link href="/terms" target="_blank" className="mx-0.5 text-[#059669] hover:underline">《服务条款》</Link>
            和
            <Link href="/privacy" target="_blank" className="mx-0.5 text-[#059669] hover:underline">《隐私政策》</Link>
          </span>
        </label>

        {error && (
          <div className="mt-3 flex items-center justify-center gap-2 rounded-[10px] border border-red-100 bg-red-50 p-2.5 text-[11px] font-medium text-red-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            {error}
          </div>
        )}

        {/* 第三方 OAuth：依赖公网回调，桌面端离线不可用 */}
        {DESKTOP_CAPABILITIES.oauthLogin && (
          <>
            <div className="flex items-center justify-center gap-4 py-4">
              <div className="h-px flex-1 bg-[#eeeeee]" />
              <span className="text-[11px] font-medium uppercase tracking-widest text-[#bbb]">其他方式</span>
              <div className="h-px flex-1 bg-[#eeeeee]" />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="h-11 flex-1 rounded-[10px] border-[#e4e4e7] bg-white text-[#555] transition-all hover:bg-[#f7f7f8] hover:text-black"
                onClick={() => window.location.href = "/api/auth/alipay/login"}
              >
                <Image src="/alipay.svg" alt="Alipay" width={16} height={16} className="mr-1.5 h-4 w-4 opacity-80" />
                <span className="text-xs font-medium">支付宝</span>
              </Button>
              <Button
                variant="outline"
                className="h-11 flex-1 rounded-[10px] border-[#e4e4e7] bg-white text-[#555] transition-all hover:bg-[#f7f7f8] hover:text-black"
                onClick={() => window.location.href = "/api/auth/qq/login"}
              >
                <svg className="mr-1.5 h-4 w-4 opacity-80" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                  <path d="M824.8 613.2c-16-51.4-34.4-94.6-62.7-165.3C766.5 262.2 689.3 112 511.5 112 331.7 112 256.2 265.2 261 447.9c-28.4 70.8-46.7 113.7-62.7 165.3-34 109.5-23 154.8-14.6 155.8 18 2.2 70.1-82.4 70.1-82.4 0 49 25.2 112.9 79.8 159-26.4 8.1-85.7 29.9-71.6 53.8 11.4 19.3 196.2 12.3 249.5 6.3 53.3 6 238.1 13 249.5-6.3 14.1-23.8-45.2-45.7-71.6-53.8 54.6-46.2 79.8-110.1 79.8-159 0 0 52.1 84.6 70.1 82.4 8.5-1.1 19.5-46.4-14.5-155.8z" fill="currentColor" />
                </svg>
                <span className="text-xs font-medium">QQ</span>
              </Button>
            </div>
          </>
        )}

        <p className="pt-4 text-center text-xs font-medium text-[#999]">
          已有账户？{" "}
          <Link href="/login" className="font-semibold text-[#111] underline underline-offset-4 transition-all hover:text-[#059669]">
            直接登录
          </Link>
        </p>
      </div>
    </AuthCardShell>
  )
}

/** 单个验证码输入框 —— 圆角方形，对齐新视觉细边框 */
function OTPBox({ index, value, onChange, hasError }: { index: number; value: string; onChange: (v: string) => void; hasError: boolean }) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const char = value[index] || ""
  const isActive = value.length === index && !hasError
  const isFilled = !!char

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !char && index > 0) {
      const prev = (inputRef.current?.parentElement?.children[index - 1] as HTMLElement)?.querySelector('input')
      prev?.focus()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(-1)
    if (v) {
      const newValue = value.slice(0, index) + v + value.slice(index + 1)
      onChange(newValue)
      if (index < 5) {
        const next = (inputRef.current?.parentElement?.children[index + 1] as HTMLElement)?.querySelector('input')
        next?.focus()
      }
    }
  }

  return (
    <div
      className={cn(
        "relative flex h-11 w-11 cursor-text items-center justify-center rounded-[10px] border text-[16px] font-semibold text-[#111] transition-all duration-200",
        hasError
          ? "border-red-300 bg-red-50/40"
          : isActive
            ? "border-[#059669] bg-white ring-2 ring-[#059669]/40"
            : isFilled
              ? "border-[#e4e4e7] bg-white"
              : "border-[#e4e4e7] bg-[#fafafa]"
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {char}
      {isActive && (
        <div className="h-5 w-[2px] animate-pulse rounded-full bg-[#059669]" />
      )}
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        maxLength={1}
        aria-label={`验证码第 ${index + 1} 位`}
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
        value={char}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={(e) => {
          e.preventDefault()
          const pasted = e.clipboardData.getData('text').replace(/\D/g, "").slice(0, 6 - index)
          if (pasted) {
            const newValue = value.slice(0, index) + pasted + value.slice(index + pasted.length)
            onChange(newValue.slice(0, 6))
          }
        }}
      />
    </div>
  )
}
