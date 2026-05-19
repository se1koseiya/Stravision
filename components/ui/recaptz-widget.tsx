"use client"

import { Captcha } from "recaptz"
import { useState, useEffect } from "react"

interface RecaptzWidgetProps {
  onSuccess: () => void
}

export default function RecaptzWidget({ onSuccess }: RecaptzWidgetProps) {
  const [type, setType] = useState<'slider' | 'mixed'>('slider')
  const [mounted, setMounted] = useState(false)
  const [dynamicBg, setDynamicBg] = useState<string>("")

  // 动态生成高复杂度验证码背景
  const generateBackground = () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return ""

    const width = 320
    const height = 160
    canvas.width = width
    canvas.height = height

    // 1. 随机复杂渐变背景
    const gradient = ctx.createLinearGradient(
      Math.random() * width, 
      Math.random() * height, 
      Math.random() * width, 
      Math.random() * height
    )
    const colors = [
      '#0f172a', '#1e293b', '#334155', // Slate
      '#022c22', '#064e3b', '#065f46', // Emerald
      '#312e81', '#1e1b4b', '#4338ca', // Indigo
      '#4c0519', '#881337', '#9f1239'  // Rose
    ]
    gradient.addColorStop(0, colors[Math.floor(Math.random() * colors.length)])
    gradient.addColorStop(0.5, colors[Math.floor(Math.random() * colors.length)])
    gradient.addColorStop(1, colors[Math.floor(Math.random() * colors.length)])
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // 2. 随机几何干扰形状 (Mosaic/Abstract)
    for (let i = 0; i < 20; i++) {
      ctx.beginPath()
      ctx.fillStyle = `rgba(${Math.random()*255}, ${Math.random()*255}, ${Math.random()*255}, ${Math.random() * 0.2})`
      const x = Math.random() * width
      const y = Math.random() * height
      const r = Math.random() * 50 + 10
      
      if (Math.random() > 0.5) {
        ctx.arc(x, y, r, 0, Math.PI * 2)
      } else {
        ctx.rect(x - r, y - r, r * 2, r * 2)
      }
      ctx.fill()
    }

    // 3. 随机贝塞尔曲线干扰线
    for (let i = 0; i < 15; i++) {
      ctx.beginPath()
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`
      ctx.lineWidth = Math.random() * 2 + 0.5
      ctx.moveTo(Math.random() * width, Math.random() * height)
      ctx.bezierCurveTo(
        Math.random() * width, Math.random() * height,
        Math.random() * width, Math.random() * height,
        Math.random() * width, Math.random() * height
      )
      ctx.stroke()
    }

    // 4. 高频噪点 (防止简单的边缘检测)
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      if (Math.random() > 0.8) {
        const noise = (Math.random() - 0.5) * 30
        data[i] = Math.min(255, Math.max(0, data[i] + noise))
        data[i+1] = Math.min(255, Math.max(0, data[i+1] + noise))
        data[i+2] = Math.min(255, Math.max(0, data[i+2] + noise))
      }
    }
    ctx.putImageData(imageData, 0, 0)

    return canvas.toDataURL('image/jpeg', 0.8)
  }

  useEffect(() => {
    setMounted(true)
    // 随机选择验证码类型
    setType(Math.random() > 0.5 ? 'slider' : 'mixed')
    // 生成动态背景
    setDynamicBg(generateBackground())
  }, [])

  // 避免服务端渲染不匹配
  if (!mounted) {
    return (
      <div className="w-full flex justify-center py-2">
        <div className="w-[320px] h-[180px] rounded-xl border border-white/10 bg-white/5 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="w-full flex justify-center py-2">
      {/* 移除 overflow-hidden，给予固定最小宽度防止压缩 */}
      <div className="relative rounded-xl border border-white/10 bg-black/20 backdrop-blur-xl shadow-2xl min-w-[340px] p-4 flex flex-col items-center group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl pointer-events-none" />
        
        <div className="w-full flex justify-between items-center mb-3 px-1 z-10">
          <span className="text-sm font-medium text-white/90 font-jinbuti tracking-wide">安全验证</span>
          <div className="flex gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-pulse" />
             <div className="w-1.5 h-1.5 rounded-full bg-primary/30 animate-pulse delay-75" />
             <div className="w-1.5 h-1.5 rounded-full bg-primary/10 animate-pulse delay-150" />
          </div>
        </div>

        {type === 'slider' ? (
          <Captcha 
            type="slider"
            darkMode
            sliderConfig={{
              width: 300, 
              height: 160,
              pieceSize: 45,
              tolerance: 10,
              enableShadow: true,
              backgroundImage: dynamicBg
            }}
            text={{
              slide: "向右滑动完成拼图",
              verifying: "验证中...",
              success: "验证通过",
              error: "验证失败，请重试",
              loading: "加载中..."
            }}
            onValidate={(isValid: boolean) => {
              if (isValid) onSuccess()
            }}
            showSuccessAnimation
            showConfetti
          />
        ) : (
          <div className="w-[300px]">
            <Captcha
              type="mixed"
              length={5}
              darkMode
              text={{
                 verify: "验证",
                 input: "请输入验证码",
                 refresh: "刷新"
              }}
              onValidate={(isValid: boolean) => {
                if (isValid) onSuccess()
              }}
              showSuccessAnimation
              showConfetti
            />
          </div>
        )}
      </div>
    </div>
  )
}
