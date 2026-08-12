"use client"

import { useEffect, useState } from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"

/**
 * 落地页专用极简光标
 * · 仅桌面端（pointer: fine）启用
 * · 一个 1px 描边圆环，跟随鼠标，遇可交互元素放大并反色
 * · 不替换系统光标，仅作编辑级视觉点缀
 */
export function LandingCursor() {
  const [enabled, setEnabled] = useState(false)
  const [variant, setVariant] = useState<"default" | "hover" | "text">("default")

  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const spring = { damping: 28, stiffness: 350, mass: 0.4 }
  const sx = useSpring(x, spring)
  const sy = useSpring(y, spring)

  useEffect(() => {
    if (typeof window === "undefined") return
    const fine = window.matchMedia("(pointer: fine)").matches
    if (!fine) return
    setEnabled(true)

    const move = (e: MouseEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
      const t = e.target as HTMLElement | null
      if (!t) return
      const interactive = t.closest("a,button,[data-cursor='hover'],input,textarea,select")
      if (interactive) {
        setVariant(interactive.matches("input,textarea") ? "text" : "hover")
      } else {
        setVariant("default")
      }
    }
    window.addEventListener("mousemove", move, { passive: true })
    return () => window.removeEventListener("mousemove", move)
  }, [x, y])

  if (!enabled) return null

  const size = variant === "hover" ? 56 : variant === "text" ? 4 : 28
  const ringOpacity = variant === "text" ? 0 : 1
  const dotOpacity = variant === "default" ? 0 : 1

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[100] hidden md:block"
      style={{ x: sx, y: sy }}
    >
      <motion.div
        className="absolute flex items-center justify-center mix-blend-difference"
        style={{
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
        }}
        animate={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}
        transition={{ type: "spring", damping: 24, stiffness: 400 }}
      >
        {/* 描边圆环 */}
        <motion.span
          className="absolute inset-0 rounded-full border border-white"
          animate={{ opacity: ringOpacity }}
          transition={{ duration: 0.2 }}
        />
        {/* 中心点 */}
        <motion.span
          className="rounded-full bg-white"
          style={{ width: 4, height: 4 }}
          animate={{ opacity: dotOpacity }}
          transition={{ duration: 0.2 }}
        />
      </motion.div>
    </motion.div>
  )
}
