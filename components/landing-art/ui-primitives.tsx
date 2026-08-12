"use client"

import {
  ReactNode,
  useRef,
  useState,
  useEffect,
  ComponentPropsWithoutRef,
} from "react"
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useScroll,
  useTransform,
  MotionValue,
} from "framer-motion"
import Link from "next/link"

const EASE = [0.16, 1, 0.3, 1] as const

/* ============================================================
   MAGNETIC BUTTON —— 鼠标靠近时被吸引位移
   · 用于主 CTA，桌面端启用
   · 内层文字反向位移，制造轻微视差
   ============================================================ */
export function MagneticButton({
  children,
  className = "",
  strength = 0.35,
  as = "link",
  href,
  onClick,
  ...rest
}: {
  children: ReactNode
  className?: string
  strength?: number
  as?: "link" | "button"
  href?: string
  onClick?: () => void
} & ComponentPropsWithoutRef<"button">) {
  const ref = useRef<HTMLAnchorElement | HTMLButtonElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 250, damping: 18, mass: 0.4 })
  const sy = useSpring(y, { stiffness: 250, damping: 18, mass: 0.4 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof window === "undefined") return
    if (!window.matchMedia("(pointer: fine)").matches) return

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      x.set((e.clientX - cx) * strength)
      y.set((e.clientY - cy) * strength)
    }
    const onLeave = () => {
      x.set(0)
      y.set(0)
    }
    el.addEventListener("mousemove", onMove)
    el.addEventListener("mouseleave", onLeave)
    return () => {
      el.removeEventListener("mousemove", onMove)
      el.removeEventListener("mouseleave", onLeave)
    }
  }, [strength, x, y])

  const inner = (
    <motion.span
      style={{
        x: useTransform(sx, (v) => -v * 0.3),
        y: useTransform(sy, (v) => -v * 0.3),
      }}
      className="inline-flex items-center gap-3"
    >
      {children}
    </motion.span>
  )

  const motionStyle = { x: sx, y: sy } as const

  if (as === "link" && href) {
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        data-cursor="hover"
        className={className}
        {...motionStyle}
      >
        {inner}
      </Link>
    )
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      onClick={onClick}
      data-cursor="hover"
      className={className}
      {...motionStyle}
      {...rest}
    >
      {inner}
    </button>
  )
}

/* ============================================================
   MARQUEE —— 无缝横向滚动跑马灯
   · 两份内容并列，CSS animation 平移 -50%
   · direction: "left" | "right"
   · 用于 Hero 底部词条带、Footer 巨字带
   ============================================================ */
export function Marquee({
  children,
  direction = "left",
  duration = 32,
  className = "",
  separator,
}: {
  children: ReactNode
  direction?: "left" | "right"
  duration?: number
  className?: string
  separator?: ReactNode
}) {
  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
      }}
    >
      <div
        className="flex w-max"
        style={{
          animation: `marquee-${direction} ${duration}s linear infinite`,
        }}
      >
        <div className="flex shrink-0 items-center">
          {children}
          {separator}
          {children}
          {separator}
        </div>
        <div className="flex shrink-0 items-center" aria-hidden>
          {children}
          {separator}
          {children}
          {separator}
        </div>
      </div>
      <style>{`
        @keyframes marquee-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}

/* ============================================================
   KINETIC TEXT —— 逐字入场 + 滚动驱动逐字位移
   · 字符按 index 错开进入
   · 滚动时每字独立 y 位移（视差），形成"破碎"效果
   ============================================================ */
function KineticChar({
  ch,
  index,
  total,
  stagger,
  delay,
  inView,
  scrollY,
  range,
  yShift,
}: {
  ch: string
  index: number
  total: number
  stagger: number
  delay: number
  inView: boolean
  scrollY?: MotionValue<number>
  range?: [number, number]
  yShift: number
}) {
  const charY =
    scrollY && range
      ? useTransform(
          scrollY,
          range,
          [yShift * (index / total), -yShift * (index / total)]
        )
      : undefined

  return (
    <span
      className="inline-block overflow-hidden align-bottom"
      style={{ lineHeight: 1 }}
    >
      <motion.span
        style={{ y: charY }}
        className="inline-block"
        initial={{ y: "110%", opacity: 0 }}
        animate={inView ? { y: "0%", opacity: 1 } : { y: "110%", opacity: 0 }}
        transition={{
          duration: 0.7,
          delay: delay + index * stagger,
          ease: EASE as any,
        }}
      >
        {ch === " " ? "\u00A0" : ch}
      </motion.span>
    </span>
  )
}

export function KineticText({
  text,
  className = "",
  stagger = 0.04,
  delay = 0,
  scrollY,
  range,
  yShift = 80,
}: {
  text: string
  className?: string
  stagger?: number
  delay?: number
  scrollY?: MotionValue<number>
  range?: [number, number]
  yShift?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-10%" })
  const chars = Array.from(text)

  return (
    <span ref={ref} className={`inline-block ${className}`}>
      {chars.map((ch, i) => (
        <KineticChar
          key={i}
          ch={ch}
          index={i}
          total={chars.length}
          stagger={stagger}
          delay={delay}
          inView={inView}
          scrollY={scrollY}
          range={range}
          yShift={yShift}
        />
      ))}
    </span>
  )
}

/* ============================================================
   USE COUNT UP —— 数字从 0 滚动到目标值
   · 进入视口时触发
   · 支持小数（decimals）
   ============================================================ */
export function useCountUp(target: number, duration = 1.6, decimals = 0) {
  const ref = useRef<HTMLElement>(null)
  const [value, setValue] = useState("0")
  const inView = useInView(ref, { once: true, margin: "-15%" })

  useEffect(() => {
    if (!inView) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000))
      // easeOutExpo
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      const v = target * eased
      setValue(v.toFixed(decimals))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, target, duration, decimals])

  return { ref, value }
}

/* ============================================================
   CROSSFADE PANEL —— sticky 容器内多面板按进度交叉淡入
   · 配合 useScroll 的 scrollYProgress 使用
   ============================================================ */
export function CrossfadePanel({
  progress,
  index,
  total,
  children,
  yRange = [60, -60],
}: {
  progress: MotionValue<number>
  index: number
  total: number
  children: ReactNode
  yRange?: [number, number]
}) {
  const seg = 1 / total
  const start = index * seg
  const enter = start + seg * 0.15
  const exit = start + seg * 0.85
  const leave = (index + 1) * seg

  const opacity = useTransform(
    progress,
    [start, enter, exit, leave],
    [0, 1, 1, 0]
  )
  const y = useTransform(progress, [start, leave], yRange)
  const scale = useTransform(progress, [start, enter, exit, leave], [0.98, 1, 1, 1.02])

  return (
    <motion.div
      style={{ opacity, y, scale }}
      className="absolute inset-0 flex items-center"
    >
      {children}
    </motion.div>
  )
}

/* ============================================================
   CHAPTER MARKER —— 替代重复的章节头，更克制
   · 不再每节都展示"序号 / 英文 / hairline"三件套
   · 仅显示左侧索引 + 右侧英文，更编辑式
   ============================================================ */
export function ChapterMarker({
  no,
  title,
  tone = "dark",
}: {
  no: string
  title: string
  tone?: "dark" | "light"
}) {
  const muted = tone === "dark" ? "text-white/35" : "text-[#0A0A0B]/35"
  const line = tone === "dark" ? "bg-white/10" : "bg-[#0A0A0B]/10"
  return (
    <div className="flex items-center gap-4">
      <span className={`font-mono text-[11px] tracking-[0.25em] ${muted} uppercase`}>
        {no}
      </span>
      <span className={`block w-12 h-px ${line}`} />
      <span className={`font-mono text-[11px] tracking-[0.25em] ${muted} uppercase`}>
        {title}
      </span>
    </div>
  )
}

/* ============================================================
   VIEWFINDER CORNERS —— 取景器四角直角标记
   ============================================================ */
export function ViewfinderCorners({
  tone = "light",
}: {
  tone?: "dark" | "light"
}) {
  const c = tone === "dark"
    ? "absolute w-3 h-3 border-white/50 z-10"
    : "absolute w-3 h-3 border-[#0A0A0B]/50 z-10"
  return (
    <>
      <span className={`${c} -top-px -left-px border-t border-l`} />
      <span className={`${c} -top-px -right-px border-t border-r`} />
      <span className={`${c} -bottom-px -left-px border-b border-l`} />
      <span className={`${c} -bottom-px -right-px border-b border-r`} />
    </>
  )
}

/* ============================================================
   EYEBROW —— 章节小标（蓝色单色点 + 等宽文字）
   ============================================================ */
export function Eyebrow({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-3 font-mono text-[11px] sm:text-[12px] tracking-[0.3em] text-[#1677ff] uppercase ${className}`}
    >
      <span className="block w-1.5 h-1.5 bg-[#1677ff]" />
      {children}
    </span>
  )
}

export { EASE }
