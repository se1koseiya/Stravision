"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { Checkbox } from "@/components/ui/checkbox"
import { AuthLayout } from "@/components/auth/auth-layout"
import CapWidget from "@/components/ui/cap-widget"
import { isCapRequiredClient } from "@/lib/cap-client"
import { cn } from "@/lib/utils"

const getRedirectPath = () => {
  if (typeof window === 'undefined') return "/monitor"
  const isMobile = /mobile|android|iphone|ipad|phone/i.test(window.navigator.userAgent)
  return isMobile ? "/home" : "/monitor"
}

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
    const isCodeValid = codeSent ? validateCode(verificationCode) : true
    if (!isEmailValid || !isUsernameValid || !isPasswordValid || !isCodeValid) return
    if (!codeSent) { setError("请先获取验证码"); return }
    if (!agreed) { setError("请阅读并同意服务条款和隐私政策"); return }
    setLoading(true)
    setError("")
    try {
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

  // Capsule pill input — 还原原版暖灰凹陷胶囊 + 黑色聚焦环（匹配顶部黑pill设计语言）
  const pillInput = cn(
    "h-11 w-full rounded-full text-[14px] text-[#111] placeholder:text-[#999]",
    "bg-[#e8e7e3] border-none shadow-inner",
    "transition-all duration-200 outline-none",
    "focus:bg-white focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus:ring-1 focus:ring-black",
    "px-5",
  )

  return (
    <AuthLayout
      title="加入我们"
      subtitle="创建您的 Stravision ID"
    >
      <div className="space-y-3.5">
        {/* Email + Get Code */}
        <div className="space-y-1.5 relative group">
          <input
            id="email"
            type="email"
            placeholder="账户邮箱"
            className={cn(
              pillInput,
              "!pr-[110px]"
            )}
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (emailError) validateEmail(e.target.value) }}
            onBlur={(e) => validateEmail(e.target.value)}
          />
          {/* 验证码按钮 — 嵌在胶囊内部右侧，黑色小pill */}
          <div className="absolute right-1 top-1 bottom-1 flex items-center pr-1">
            <button
              type="button"
              onClick={handleGetCodeClick}
              disabled={sendingCode || countdown > 0 || !email}
              className={cn(
                "h-9 px-3.5 rounded-full text-[11px] font-medium transition-all duration-200 flex items-center gap-1",
                countdown > 0
                  ? "bg-[#f0efeb] text-[#aaa] cursor-default"
                  : sendingCode
                    ? "bg-black/80 text-white"
                    : email
                      ? "bg-black text-white hover:bg-black/80 active:scale-95"
                      : "bg-[#f0efeb] text-[#c0bdb6] cursor-not-allowed"
              )}
            >
              {sendingCode ? (
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              ) : countdown > 0 ? (
                `${countdown}s`
              ) : codeSent ? (
                "重发"
              ) : (
                "获取验证码"
              )}
            </button>
          </div>
        </div>
        {emailError && <p className="text-[10px] text-red-500 font-medium pl-3 -mt-1">{emailError}</p>}

        {/* Captcha */}
        <AnimatePresence>
          {showCaptcha && !captchaCompleted && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: "auto", opacity: 1, marginTop: 6 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl bg-[#e8e7e3] p-4 shadow-inner">
                <p className="text-[12px] text-[#888] mb-3 text-center font-medium">请完成安全验证以获取验证码</p>
                <CapWidget
                  onSuccess={handleCaptchaSuccess}
                  onError={() => { setCaptchaCompleted(false); setCapToken("") }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Verification Code OTP — 6格方形圆角，整体嵌入胶囊容器感 */}
        <AnimatePresence>
          {codeSent && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 8 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 justify-center">
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
              {codeError && <p className="text-[11px] text-red-500 font-medium text-center mt-2">{codeError}</p>}
              {verificationCode.length === 6 && !codeError && (
                <div className="flex items-center justify-center gap-1 mt-2 text-[12px] text-[#4a8c3f]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  验证码已输入
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Username */}
        <div className="space-y-1.5">
          <input
            id="username"
            type="text"
            placeholder="显示名称 / 用户名"
            className={pillInput}
            value={username}
            onChange={(e) => { setUsername(e.target.value); if (usernameError) validateUsername(e.target.value) }}
            onBlur={(e) => validateUsername(e.target.value)}
          />
          {usernameError && <p className="text-[11px] text-red-500 font-medium pl-4">{usernameError}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <input
            id="password"
            type="password"
            placeholder="密码 (至少8个字符)"
            className={pillInput}
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (passwordError) validatePassword(e.target.value) }}
            onBlur={(e) => validatePassword(e.target.value)}
          />
          {passwordError && <p className="text-[11px] text-red-500 font-medium pl-4">{passwordError}</p>}
        </div>

        {/* Terms */}
        <div className="flex items-start gap-2.5 py-1 pl-1">
          <Checkbox
            id="terms"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked as boolean)}
            className="mt-0.5 border-[#d0cec9] data-[state=checked]:bg-black data-[state=checked]:border-black rounded-[4px]"
          />
          <label
            htmlFor="terms"
            className="text-[12px] text-[#888] leading-relaxed cursor-pointer select-none"
          >
            我已阅读并同意
            <Link href="/terms" target="_blank" className="text-[#4a8c3f] hover:text-black font-semibold mx-0.5 transition-colors">
              服务条款
            </Link>
            和
            <Link href="/privacy" target="_blank" className="text-[#4a8c3f] hover:text-black font-semibold mx-0.5 transition-colors">
              隐私政策
            </Link>
          </label>
        </div>

        {/* Submit — 黑色胶囊大按钮，与顶部nav pill呼应 */}
        <button
          onClick={onSubmit}
          disabled={loading}
          className="group relative w-full h-11 rounded-full bg-black hover:bg-black/90 text-white font-medium text-[14px] tracking-wide transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-black/15 overflow-hidden mt-1"
        >
          {/* subtle gradient sheen */}
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin relative z-10" />
              <span className="relative z-10">创建账户中...</span>
            </>
          ) : (
            <>
              <span className="relative z-10">创建账户</span>
              <ArrowRight className="w-4 h-4 relative z-10 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-100 text-red-600 text-[12px] py-2.5 px-4 text-center font-medium">
            {error}
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-4 py-2">
          <div className="h-px flex-1 bg-[#e4e2dd]" />
          <span className="text-[10px] text-[#c0bdb6] uppercase tracking-[0.2em] font-medium">其他方式</span>
          <div className="h-px flex-1 bg-[#e4e2dd]" />
        </div>

        {/* Social Login */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => window.location.href = "/api/auth/alipay/login"}
            className="h-11 rounded-full bg-white border border-[#e8e6e1] hover:border-[#d8d6d0] hover:bg-[#faf9f6] text-[#111] text-[13px] font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm"
          >
            <Image src="/alipay.svg" alt="Alipay" width={18} height={18} className="w-[18px] h-[18px]" />
            支付宝
          </button>
          <button
            onClick={() => window.location.href = "/api/auth/qq/login"}
            className="h-11 rounded-full bg-white border border-[#e8e6e1] hover:border-[#d8d6d0] hover:bg-[#faf9f6] text-[#111] text-[13px] font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm"
          >
            <svg className="w-[18px] h-[18px]" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
              <path d="M824.8 613.2c-16-51.4-34.4-94.6-62.7-165.3C766.5 262.2 689.3 112 511.5 112 331.7 112 256.2 265.2 261 447.9c-28.4 70.8-46.7 113.7-62.7 165.3-34 109.5-23 154.8-14.6 155.8 18 2.2 70.1-82.4 70.1-82.4 0 49 25.2 112.9 79.8 159-26.4 8.1-85.7 29.9-71.6 53.8 11.4 19.3 196.2 12.3 249.5 6.3 53.3 6 238.1 13 249.5-6.3 14.1-23.8-45.2-45.7-71.6-53.8 54.6-46.2 79.8-110.1 79.8-159 0 0 52.1 84.6 70.1 82.4 8.5-1.1 19.5-46.4-14.5-155.8z" fill="currentColor" />
            </svg>
            QQ
          </button>
        </div>

        {/* Login Link */}
        <p className="text-[13px] text-center text-[#999] pt-2 font-medium">
          已有账户？{" "}
          <Link href="/login" className="text-black hover:text-[#4a8c3f] font-semibold transition-colors">
            直接登录 →
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}

/** 单个验证码输入框 — 圆角方形，带聚焦动画，不用圆形避免"D"形视觉bug */
function OTPBox({ index, value, onChange, hasError }: { index: number; value: string; onChange: (v: string) => void; hasError: boolean }) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const char = value[index] || ""
  const isActive = value.length === index && !hasError
  const isFilled = !!char

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !char && index > 0) {
      // move focus to previous box
      const prev = (inputRef.current?.parentElement?.children[index - 1] as HTMLElement)?.querySelector('input')
      prev?.focus()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(-1)
    if (v) {
      const newValue = value.slice(0, index) + v + value.slice(index + 1)
      onChange(newValue)
      // auto-focus next
      if (index < 5) {
        const next = (inputRef.current?.parentElement?.children[index + 1] as HTMLElement)?.querySelector('input')
        next?.focus()
      }
    }
  }

  const handleFocus = () => {
    if (value.length <= index) {
      // position caret at end of current position
    }
  }

  return (
    <div
      className={cn(
        "relative w-11 h-11 rounded-xl flex items-center justify-center text-[18px] font-semibold text-[#111] transition-all duration-200 cursor-text",
        isActive
          ? "bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black scale-105"
          : isFilled
            ? "bg-white shadow-inner"
            : "bg-[#e8e7e3] shadow-inner"
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {char}
      {isActive && (
        <div className="w-[2px] h-5 bg-black rounded-full animate-pulse" />
      )}
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        maxLength={1}
        className="absolute inset-0 w-full h-full opacity-0 cursor-text"
        value={char}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
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
