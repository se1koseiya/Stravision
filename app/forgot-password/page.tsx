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
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-emerald-500"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
          </div>
          <p className="text-white/60 font-jinbuti">密码已更新，请使用新密码登录</p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="找回密码" subtitle="验证身份以重置您的密码">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-white/60 text-xs font-jinbuti uppercase tracking-wider">邮箱</Label>
          <div className="relative group">
            <Input
              id="email"
              type="email"
              placeholder="请输入注册邮箱"
              className="h-11 pr-[100px] rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-all duration-300 font-jinbuti"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={codeSent && countdown > 0}
            />
            <div className="absolute right-1 top-1 bottom-1 flex items-center">
              <Button
                type="button"
                variant="ghost"
                className="h-full px-3 rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all text-xs font-medium font-jinbuti"
                onClick={sendResetCode}
                disabled={sendingCode || countdown > 0 || !email}
              >
                {sendingCode ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : countdown > 0 ? (
                  `${countdown}s`
                ) : codeSent ? (
                  "重发"
                ) : (
                  "获取验证码"
                )}
              </Button>
            </div>
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
                <Label htmlFor="code" className="text-white/60 text-xs font-jinbuti uppercase tracking-wider">验证码</Label>
                <InputOTP
                  maxLength={6}
                  value={verificationCode}
                  onChange={(value) => setVerificationCode(value)}
                >
                  <InputOTPGroup className="w-full justify-center gap-2">
                    <InputOTPSlot index={0} className="w-12 h-12 rounded-xl border border-white/10 bg-white/5 text-lg" />
                    <InputOTPSlot index={1} className="w-12 h-12 rounded-xl border border-white/10 bg-white/5 text-lg" />
                    <InputOTPSlot index={2} className="w-12 h-12 rounded-xl border border-white/10 bg-white/5 text-lg" />
                    <InputOTPSlot index={3} className="w-12 h-12 rounded-xl border border-white/10 bg-white/5 text-lg" />
                    <InputOTPSlot index={4} className="w-12 h-12 rounded-xl border border-white/10 bg-white/5 text-lg" />
                    <InputOTPSlot index={5} className="w-12 h-12 rounded-xl border border-white/10 bg-white/5 text-lg" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-white/60 text-xs font-jinbuti uppercase tracking-wider">新密码</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="请输入新密码（至少8位）"
                  className="h-11 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-all duration-300 font-jinbuti"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <Button
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all duration-300 mt-2 font-jinbuti"
                onClick={onSubmit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    重置中...
                  </>
                ) : "重置密码"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center flex items-center justify-center gap-2 font-jinbuti">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {error}
          </div>
        )}

        <div className="pt-4 text-center">
          <Link href="/login" className="text-xs text-white/40 hover:text-white transition-colors flex items-center justify-center gap-1 font-jinbuti">
            <ArrowLeft className="w-3 h-3" />
            返回登录
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
