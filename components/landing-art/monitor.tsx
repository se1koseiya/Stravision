"use client"

import { motion, useScroll, useTransform, useMotionTemplate, useSpring } from "framer-motion"
import { useRef } from "react"
import { ExactDesignHome } from "@/components/ai/exact-design-home"
import Image from "next/image"
import { IconLock } from "@/components/icon";

// --- THE FLOATING CARDS DATA (Light Premium Theme) ---
const floatCards = [
  {
    icon: "/glassyicons/Design.png",
    title: "多模态认知",
    desc: "融合视觉与时序传感数据，精准洞察",
    style: { top: '15%', left: '8%', rotateX: 10, rotateY: 15, rotateZ: -5 },
  },
  {
    icon: "/glassyicons/Calendar.png",
    title: "自主任务流",
    desc: "按环境节律与光照自动调度",
    style: { top: '25%', right: '8%', rotateX: -10, rotateY: -15, rotateZ: 5 },
  },
  {
    icon: "/glassyicons/Sygnal.png",
    title: "毫秒级响应",
    desc: "边缘计算极速下发控制指令，无延迟",
    style: { bottom: '25%', left: '10%', rotateX: 20, rotateY: -20, rotateZ: 8 },
  },
  {
    icon: "/glassyicons/Graph.png",
    title: "全息数据洞察",
    desc: "构建全生命周期草莓生长与环境模型",
    style: { bottom: '15%', right: '10%', rotateX: -15, rotateY: 15, rotateZ: -8 },
  }
]

// --- BROWSER WINDOW COMPONENT (Light Premium Theme) ---
function BrowserWindow({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full mx-auto group relative">
      {/* 极光边缘发光特效 - 清新透亮版 */}
      <div className="absolute -inset-[2px] bg-gradient-to-r from-emerald-300/40 via-teal-200/40 to-blue-300/40 rounded-[2rem] blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative rounded-[2rem] bg-white/70 backdrop-blur-3xl border border-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.08)] overflow-hidden transition-all duration-500 ring-1 ring-black/5">

        {/* Safari-like Titlebar */}
        <div className="h-14 bg-white/50 backdrop-blur-md border-b border-zinc-200/50 flex items-center px-6 relative z-20">
          <div className="flex items-center gap-2 absolute left-6">
            <div className="w-3.5 h-3.5 rounded-full bg-[#FF5F56] border border-[#E0443E]/30" />
            <div className="w-3.5 h-3.5 rounded-full bg-[#FFBD2E] border border-[#DEA123]/30" />
            <div className="w-3.5 h-3.5 rounded-full bg-[#27C93F] border border-[#1AAB29]/30" />
          </div>

          <div className="mx-auto flex items-center justify-center h-8 px-8 min-w-[200px] max-w-md bg-white/60 rounded-lg border border-black/5 shadow-sm">
            <IconLock className="w-3 h-3 text-zinc-400 mr-2" />
            <span className="text-[13px] font-medium text-zinc-500 font-mono tracking-tight">
              stravision.site/ai-assistant
            </span>
          </div>
        </div>

        {/* Content Area - Scrollable Fake Window */}
        <div className="bg-[#f8fafc] relative z-0 overflow-y-auto overflow-x-hidden custom-scrollbar" style={{ height: 'min(calc(100vh - 8rem), 800px)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export function Monitor() {
  const containerRef = useRef<HTMLDivElement>(null)

  // Track scroll over the container - Finishing much earlier at center
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"]
  })

  // 物理阻尼 —— 适度收紧，避免拖沓感（太软会显得滑动卡顿）
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 28,
    restDelta: 0.001
  })

  // --- LAYER 1: OUTER WHITE WORLD ANIMATIONS ---
  // Delayed start to let user see the text first
  const textOpacity = useTransform(smoothProgress, [0.2, 0.4], [1, 0])
  const textY = useTransform(smoothProgress, [0.2, 0.4], [0, -50])
  const textScale = useTransform(smoothProgress, [0.2, 0.4], [1, 1.2])
  const textFilter = useTransform(smoothProgress, [0.2, 0.4], ["blur(0px)", "blur(10px)"])

  // --- LAYER 2: INNER LIGHT WORLD REVEAL (APERTURE) ---
  // Starts after text begins to fade
  const apertureSize = useTransform(smoothProgress, [0.35, 0.75], ["0%", "150%"])
  const clipPath = useMotionTemplate`circle(${apertureSize} at 50% 50%)`

  // --- 3D CARDS FLY-THROUGH ---
  const cardsOpacity = useTransform(smoothProgress, [0.6, 0.95], [1, 0])
  const z1 = useTransform(smoothProgress, [0.4, 0.9], [0, 1600])
  const z2 = useTransform(smoothProgress, [0.45, 0.95], [0, 1600])
  const z3 = useTransform(smoothProgress, [0.4, 0.85], [0, 1600])
  const z4 = useTransform(smoothProgress, [0.5, 1], [0, 1600])
  const zArr = [z1, z2, z3, z4]

  // --- BROWSER WINDOW ANIMATION ---
  const browserY = useTransform(smoothProgress, [0.6, 1], ["40%", "0%"])
  const browserScale = useTransform(smoothProgress, [0.6, 1], [0.8, 1])
  const browserOpacity = useTransform(smoothProgress, [0.5, 0.9], [0, 1])

  // Glowing orb scale
  const orbScale = useTransform(smoothProgress, [0.3, 0.9], [1, 2.5])

  // 背景色过渡 —— 从首屏纸色 #F2F2F0 平滑过渡到白/浅灰，衔接 Hero
  const bgColor = useTransform(
    smoothProgress,
    [0, 0.5, 1],
    ["rgb(242, 242, 240)", "rgb(255, 255, 255)", "rgb(248, 250, 252)"]
  )

  // Mock data for ExactDesignHome
  const mockUser = {
    id: 1, uid: "mock-uid", username: "Satsuseii", email: "user@example.com", avatar_url: null,
    role: "user" as const, email_verified: true, created_at: Date.now(), updated_at: Date.now(),
    membership: "free" as const, permissions: {} as any, notification_settings: {} as any
  }
  const mockDeviceData = { temperature: 25.3, humidity: 46, light: 137, earth_water: 0 }
  const handleSendMessage = (msg: string) => console.log("Sending command:", msg)

  return (
    <section ref={containerRef} className="relative h-[150vh] bg-gradient-to-b from-[#F2F2F0] via-white to-slate-50">
      <div className="sticky top-0 h-screen w-full overflow-hidden">

        {/* ================= LAYER 1: THE WHITE WORLD ================= */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
          style={{ backgroundColor: bgColor }}
        >
          <motion.div
            style={{ opacity: textOpacity, y: textY, scale: textScale, filter: textFilter }}
            className="text-center px-4"
          >
            <h2 className="text-6xl md:text-[6rem] lg:text-[8rem] font-black tracking-tighter leading-[1.1] text-zinc-900 mb-6 font-alimama drop-shadow-sm">
              一句话，<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">
                掌控万千设备。
              </span>
            </h2>
            <p className="text-xl md:text-2xl text-zinc-500 font-medium tracking-tight animate-pulse">
              向下滚动，开启中枢
            </p>
          </motion.div>
        </motion.div>

        {/* ================= LAYER 2: THE INNER WORLD (APERTURE REVEAL) ================= */}
        <motion.div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden"
          style={{ clipPath, backgroundColor: bgColor }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000006_1px,transparent_1px),linear-gradient(to_bottom,#00000006_1px,transparent_1px)] bg-[size:48px_48px]" />

          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full mix-blend-multiply pointer-events-none z-10"
            style={{
              background: 'radial-gradient(circle, rgba(52,211,153,0.15) 0%, rgba(56,189,248,0.1) 40%, transparent 70%)',
              scale: orbScale
            }}
          />

          {/* --- 3D Fly-through Cards --- */}
          <motion.div
            className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center"
            style={{ perspective: '1200px' }}
          >
            <div className="relative w-full h-full max-w-[1600px] mx-auto" style={{ transformStyle: 'preserve-3d' }}>
              {floatCards.map((card, i) => (
                <motion.div
                  key={i}
                  className="absolute w-[280px] lg:w-[320px] bg-white/70 backdrop-blur-2xl p-6 lg:p-8 rounded-[2rem] border border-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08)]"
                  style={{
                    ...card.style,
                    z: zArr[i],
                    opacity: cardsOpacity
                  }}
                >
                  <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-white/80 border border-black/5 flex items-center justify-center mb-4 lg:mb-6 shadow-sm overflow-hidden">
                    <Image src={card.icon} alt={card.title} width={48} height={48} className="w-full h-full object-contain" />
                  </div>
                  <h3 className="text-zinc-900 font-bold text-xl lg:text-2xl mb-2 lg:mb-3 tracking-tight">{card.title}</h3>
                  <p className="text-zinc-500 text-sm lg:text-base font-medium">{card.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* --- The Destination: Browser Control Center --- */}
          <motion.div
            className="relative z-20 w-full max-w-[1400px] px-6 pointer-events-auto"
            style={{ y: browserY, scale: browserScale, opacity: browserOpacity }}
          >
            <BrowserWindow>
              <ExactDesignHome user={mockUser} deviceData={mockDeviceData} onSendMessage={handleSendMessage} />
            </BrowserWindow>
          </motion.div>

        </motion.div>

      </div>
    </section>
  )
}
