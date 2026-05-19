"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, ArrowLeft } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AuthLayout } from "@/components/auth/auth-layout"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { AnimatePresence, motion } from "framer-motion"

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

  if (success) {
    return (
      <AuthLayout title="重置成功" subtitle="正在跳转到登录页面...">
        <div className="flex flex-col items-center justify-center py-10 space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#e8e7e3] flex items-center justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-black"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
          </div>
          <p className="text-[#666] font-medium">密码已更新，请使用新密码登录</p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="找回密码" subtitle="验证身份以重置您的密码">
      <div className="space-y-3.5">
        <div className="space-y-1.5 relative group">
          <Input
            id="email"
            type="email"
            placeholder="账户邮箱"
            className="h-11 pr-[110px] rounded-full bg-[#e8e7e3] border-none text-[#111] placeholder:text-[#999] focus-visible:ring-1 focus-visible:ring-black px-5 text-sm shadow-inner w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={codeSent && countdown > 0}
          />
          <div className="absolute right-1 top-1 bottom-1 flex items-center pr-1">
            <Button
              type="button"
              variant="ghost"
              className="h-9 px-3.5 rounded-full bg-black hover:bg-black/80 text-white text-[11px] font-medium transition-all duration-300"
              onClick={sendResetCode}
              disabled={sendingCode || countdown > 0 || !email}
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
                "获取"
              )}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {codeSent && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="code" className="text-[#666] text-xs font-semibold pl-2">验证码</Label>
                <InputOTP
                  maxLength={6}
                  value={verificationCode}
                  onChange={(value) => setVerificationCode(value)}
                >
                  <InputOTPGroup className="w-full justify-center gap-2">
                    <InputOTPSlot index={0} className="w-11 h-11 rounded-full border border-black/5 bg-[#e8e7e3] text-black text-sm font-semibold" />
                    <InputOTPSlot index={1} className="w-11 h-11 rounded-full border border-black/5 bg-[#e8e7e3] text-black text-sm font-semibold" />
                    <InputOTPSlot index={2} className="w-11 h-11 rounded-full border border-black/5 bg-[#e8e7e3] text-black text-sm font-semibold" />
                    <InputOTPSlot index={3} className="w-11 h-11 rounded-full border border-black/5 bg-[#e8e7e3] text-black text-sm font-semibold" />
                    <InputOTPSlot index={4} className="w-11 h-11 rounded-full border border-black/5 bg-[#e8e7e3] text-black text-sm font-semibold" />
                    <InputOTPSlot index={5} className="w-11 h-11 rounded-full border border-black/5 bg-[#e8e7e3] text-black text-sm font-semibold" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="space-y-1.5">
                <Input
                  id="new-password"
                  type="password"
                  placeholder="请输入新密码（至少8位）"
                  className="h-11 rounded-full bg-[#e8e7e3] border-none text-[#111] placeholder:text-[#999] focus-visible:ring-1 focus-visible:ring-black px-5 text-sm shadow-inner w-full"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <Button
                className="w-full h-11 rounded-full bg-black hover:bg-black/80 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 text-sm tracking-wider mt-2"
                onClick={onSubmit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    重置中...
                  </>
                ) : "重 置 密 码"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="p-2.5 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-[11px] font-medium text-center flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {error}
          </div>
        )}

        <div className="pt-4 text-center">
          <Link href="/login" className="text-xs text-[#666] hover:text-black transition-colors flex items-center justify-center gap-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" />
            返回登录
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
