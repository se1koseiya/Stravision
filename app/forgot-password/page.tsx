"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { AnimatePresence, motion } from "framer-motion"
import { IconArrowLeft, IconLoading } from "@/components/icon";

/* 与登录页共用同一张美术资源 */
const LOGIN_ART = "/web/login/memory.png"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // 倒计时效果
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  const sendResetCode = async () => {
    if (!validateEmail(email)) {
      setError("请输入有效的邮箱地址")
      return
    }

    setSendingCode(true)
    setError("")

    try {
      const res = await fetch("/api/auth/forgot-password", {
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
      setError("")
    } catch {
      setError("网络错误，请稍后重试")
    } finally {
      setSendingCode(false)
    }
  }

  const onSubmit = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("请输入6位验证码")
      return
    }
    if (!newPassword || newPassword.length < 8) {
      setError("新密码至少需要8个字符")
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: verificationCode, password: newPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || "重置密码失败")
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch {
      setError("网络错误，请稍后重试")
      setLoading(false)
    }
  }

  const cardShell = (children: React.ReactNode) => (
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

      {/* 居中卡片 */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[400px] overflow-hidden rounded-[20px] bg-white shadow-[0_24px_70px_-24px_rgba(15,23,42,0.28)] ring-1 ring-black/[0.04]"
        >
          {/* 顶部美术 + 白色曲线收边（与登录卡一致） */}
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
          {children}
        </motion.div>
      </div>
    </div>
  )

  if (success) {
    return cardShell(
      <div className="px-7 pb-9 pt-4">
        <h1 className="text-[22px] font-bold leading-tight text-[#1a1a1a]" style={{ fontFamily: "'AlimamaShuHeiTi', sans-serif" }}>
          重置成功
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#999]">
          正在跳转到登录页面...
        </p>
        <div className="flex flex-col items-center justify-center py-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="flex size-16 items-center justify-center rounded-full bg-[#E6FDEE]"
          >
            <svg className="h-8 w-8 text-[#009456]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
          <p className="mt-4 text-[13px] font-medium text-[#666]">密码已更新，请使用新密码登录</p>
        </div>
      </div>
    )
  }

  return cardShell(
    <div className="px-7 pb-7 pt-4">
      <h1 className="text-[22px] font-bold leading-tight text-[#1a1a1a]" style={{ fontFamily: "'AlimamaShuHeiTi', sans-serif" }}>
        找回密码
      </h1>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[#999]">
        验证身份以重置您的密码
      </p>

      <div className="mt-6 space-y-3">
        {/* 邮箱 + 获取验证码 */}
        <div className="relative">
          <Input
            id="email"
            type="email"
            placeholder="账户邮箱"
            className="h-12 rounded-[10px] border-[#e5e5e5] bg-white pr-24 text-sm text-[#111] placeholder:text-[#bbb] focus-visible:border-[#4ED18F] focus-visible:ring-2 focus-visible:ring-[#4ED18F]/60"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={codeSent && countdown > 0}
          />
          <button
            type="button"
            onClick={sendResetCode}
            disabled={sendingCode || countdown > 0 || !email}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-[8px] px-2.5 py-1.5 text-xs font-semibold text-[#009456] transition-colors hover:bg-[#009456]/[0.06] disabled:cursor-not-allowed disabled:text-[#bbb] disabled:hover:bg-transparent"
          >
            {sendingCode ? (
              <IconLoading className="h-3.5 w-3.5 animate-spin" />
            ) : countdown > 0 ? (
              `${countdown}s`
            ) : codeSent ? (
              "重发"
            ) : (
              "获取验证码"
            )}
          </button>
        </div>

        <AnimatePresence>
          {codeSent && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-1">
                <InputOTP
                  maxLength={6}
                  value={verificationCode}
                  onChange={(value) => setVerificationCode(value)}
                >
                  <InputOTPGroup className="w-full justify-center gap-2">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="h-11 w-11 rounded-[10px] border-[#e5e5e5] bg-white text-sm font-semibold text-[#111] focus-visible:border-[#4ED18F] focus-visible:ring-2 focus-visible:ring-[#4ED18F]/60"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>

                <Input
                  id="new-password"
                  type="password"
                  placeholder="请输入新密码（至少8位）"
                  className="h-12 rounded-[10px] border-[#e5e5e5] bg-white text-sm text-[#111] placeholder:text-[#bbb] focus-visible:border-[#4ED18F] focus-visible:ring-2 focus-visible:ring-[#4ED18F]/60"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                />

                <Button
                  className="h-12 w-full rounded-[10px] bg-[#111] text-[15px] font-semibold tracking-[0.2em] text-white shadow-none transition-opacity hover:opacity-85 hover:shadow-none"
                  onClick={onSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <IconLoading className="mr-2 h-4 w-4 animate-spin" />
                      重置中...
                    </>
                  ) : (
                    "重 置 密 码"
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="flex items-center justify-center gap-2 rounded-[10px] border border-red-100 bg-red-50 p-2.5 text-[11px] font-medium text-red-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            {error}
          </div>
        )}

        <div className="pt-3 text-center">
          <Link href="/login" className="inline-flex items-center gap-1 text-xs font-medium text-[#999] transition-colors hover:text-[#009456]">
            <IconArrowLeft className="h-3.5 w-3.5" />
            返回登录
          </Link>
        </div>
      </div>
    </div>
  )
}
