"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Loader2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Checkbox } from "@/components/ui/checkbox"
import { AuthLayout } from "@/components/auth/auth-layout"
import RecaptzWidget from "@/components/ui/recaptz-widget"
import dynamic from "next/dynamic"
// Helper for redirect
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
  const [captchaParams, setCaptchaParams] = useState<any>(null)
  const [captchaCompleted, setCaptchaCompleted] = useState(false)
  const [showCaptcha, setShowCaptcha] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const captchaEnabled = !!process.env.NEXT_PUBLIC_ALIYUN_CAPTCHA_REGISTER_SCENE_ID

  React.useEffect(() => {
    // Reset captcha if email changes
    if (captchaCompleted) {
      setCaptchaCompleted(false)
    }
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

  // 倒计时效果
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // 实际发送验证码逻辑
  const doSendCode = async () => {
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
      setError("")
    } catch {
      setError("网络错误")
    } finally {
      setSendingCode(false)
    }
  }

  // 点击获取验证码按钮
  const handleGetCodeClick = async () => {
    if (!validateEmail(email)) return
    
    // 如果还没验证，显示验证码
    if (!captchaCompleted) {
      setShowCaptcha(true)
      return
    }

    // 如果已验证，直接发送
    await doSendCode()
  }

  // 验证码成功回调
  const handleCaptchaSuccess = () => {
    setCaptchaCompleted(true)
    setShowCaptcha(false)
    doSendCode()
  }

  const onSubmit = async () => {
    const isEmailValid = validateEmail(email)
    const isUsernameValid = validateUsername(username)
    const isPasswordValid = validatePassword(password)
    const isCodeValid = codeSent ? validateCode(verificationCode) : true

    if (!isEmailValid || !isUsernameValid || !isPasswordValid || !isCodeValid) return

    if (!codeSent) {
      setError("请先获取验证码")
      return
    }

    if (!agreed) {
      setError("请阅读并同意服务条款和隐私政策")
      return
    }

    // Check captcha again just in case, though they should have it for code
    if (!captchaCompleted && !codeSent) {
      setError("请先获取验证码")
      return
    }

    setLoading(true)
    setError("")
    
    try {
      // 先验证邮箱验证码
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
      
      // 验证成功后注册
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
    <AuthLayout 
      title="加入我们" 
      subtitle="创建您的 Stravision ID"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-white/60 text-xs font-jinbuti uppercase tracking-wider">邮箱</Label>
          <div className="relative group">
            <Input
              id="email"
              type="email"
              placeholder="请输入邮箱"
              className="h-11 pr-[100px] rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-all duration-300 font-jinbuti"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (emailError) validateEmail(e.target.value) }}
              onBlur={(e) => validateEmail(e.target.value)}
            />
            <div className="absolute right-1 top-1 bottom-1 flex items-center">
              <Button
                type="button"
                variant="ghost"
                className="h-full px-3 rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all text-xs font-medium font-jinbuti"
                onClick={handleGetCodeClick}
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
          {emailError && <p className="text-xs text-red-400 font-jinbuti">{emailError}</p>}
        </div>

        {/* Recaptz Widget for Email Verification */}
        <AnimatePresence>
          {showCaptcha && !captchaCompleted && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: "auto", opacity: 1, marginTop: 8 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="py-2 bg-white/5 rounded-xl border border-white/10 p-4">
                <p className="text-xs text-white/60 mb-3 text-center font-jinbuti">请完成安全验证以获取验证码</p>
                <RecaptzWidget onSuccess={handleCaptchaSuccess} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {codeSent && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="overflow-hidden space-y-2"
            >
              <Label htmlFor="code" className="text-white/60 text-xs font-jinbuti uppercase tracking-wider">邮箱验证码</Label>
              <InputOTP
                maxLength={6}
                value={verificationCode}
                onChange={(value) => { 
                  setVerificationCode(value); 
                  if (codeError) validateCode(value) 
                }}
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
              {codeError && <p className="text-xs text-red-400 font-jinbuti text-center">{codeError}</p>}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-2">
          <Label htmlFor="username" className="text-white/60 text-xs font-jinbuti uppercase tracking-wider">用户名</Label>
          <Input
            id="username"
            type="text"
            placeholder="请输入显示名称"
            className="h-11 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-all duration-300 font-jinbuti"
            value={username}
            onChange={(e) => { setUsername(e.target.value); if (usernameError) validateUsername(e.target.value) }}
            onBlur={(e) => validateUsername(e.target.value)}
          />
          {usernameError && <p className="text-xs text-red-400 font-jinbuti">{usernameError}</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password" className="text-white/60 text-xs font-jinbuti uppercase tracking-wider">密码</Label>
          <Input
            id="password"
            type="password"
            placeholder="至少8个字符"
            className="h-11 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 transition-all duration-300 font-jinbuti"
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (passwordError) validatePassword(e.target.value) }}
            onBlur={(e) => validatePassword(e.target.value)}
          />
          {passwordError && <p className="text-xs text-red-400 font-jinbuti">{passwordError}</p>}
        </div>

        <div className="flex items-center space-x-2 py-1">
          <Checkbox 
            id="terms" 
            checked={agreed} 
            onCheckedChange={(checked) => setAgreed(checked as boolean)}
            className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
          />
          <label
            htmlFor="terms"
            className="text-xs text-white/60 font-jinbuti leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            我已阅读并同意
            <Link href="/terms" target="_blank" className="text-emerald-500 hover:text-emerald-400 hover:underline mx-1">
              服务条款
            </Link>
            和
            <Link href="/privacy" target="_blank" className="text-emerald-500 hover:text-emerald-400 hover:underline mx-1">
              隐私政策
            </Link>
          </label>
        </div>
        
        <Button
          className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all duration-300 mt-2 font-jinbuti" 
          onClick={onSubmit} 
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              <span className="font-jinbuti">创建账户中...</span>
            </>
          ) : "注册账户"}
        </Button>
        
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center flex items-center justify-center gap-2 font-jinbuti">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {error}
          </div>
        )}

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-[#0a0a0a] text-white/30 uppercase tracking-widest font-jinbuti">其他方式注册</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="h-10 rounded-xl bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white hover:border-white/20 transition-all"
            onClick={() => window.location.href = "/api/auth/alipay/login"}
          >
            <Image src="/alipay.svg" alt="Alipay" width={20} height={20} className="w-5 h-5 mr-2 opacity-80" />
            <span className="text-xs">支付宝</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-10 rounded-xl bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white hover:border-white/20 transition-all"
            onClick={() => window.location.href = "/api/auth/qq/login"}
          >
            <svg className="w-5 h-5 mr-2 opacity-80" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
              <path d="M824.8 613.2c-16-51.4-34.4-94.6-62.7-165.3C766.5 262.2 689.3 112 511.5 112 331.7 112 256.2 265.2 261 447.9c-28.4 70.8-46.7 113.7-62.7 165.3-34 109.5-23 154.8-14.6 155.8 18 2.2 70.1-82.4 70.1-82.4 0 49 25.2 112.9 79.8 159-26.4 8.1-85.7 29.9-71.6 53.8 11.4 19.3 196.2 12.3 249.5 6.3 53.3 6 238.1 13 249.5-6.3 14.1-23.8-45.2-45.7-71.6-53.8 54.6-46.2 79.8-110.1 79.8-159 0 0 52.1 84.6 70.1 82.4 8.5-1.1 19.5-46.4-14.5-155.8z" fill="currentColor"/>
            </svg>
            <span className="text-xs">QQ</span>
          </Button>
        </div>

        <p className="text-xs text-center text-white/30 pt-4 font-jinbuti">
          已有账户？{" "}
          <Link href="/login" className="text-emerald-500 hover:text-emerald-400 hover:underline transition-all">
            直接登录
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
