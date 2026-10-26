"use client"

import PixelBlast from "@/components/ai/pixel-blast"

/**
 * 配置向导的氛围背景。
 *
 * 与 AI 助手首页（app/ai-assistant/page.tsx 的 .pb-aurora + PixelBlast）同源，
 * 三层结构逐一对齐：
 *   ① emerald 光晕：三团径向渐变在上半部缓慢漂移（18s alternate）；
 *   ② 像素层：细密圆点（PixelBlast）叠在渐变之上，给平面加一点颗粒感；
 *   ③ 向下渐隐：整体走一条 mask，只在上半部可见、到中部回到纯底色 ——
 *      这是「清透」而不是「糊了一层」的决定性一步。
 *
 * ⚠️ 类名前缀用 ds-（desktop setup）而不是 pb-，避免与 AI 助手页的样式互相干扰：
 *    两边各自的 <style> 是全局作用域的，同名 keyframes 会互相覆盖。
 */

/** 只保留上半部、向下渐隐（与 AI 助手页逐字一致） */
const MASK =
  "linear-gradient(to bottom, #000 0%, #000 26%, rgba(0,0,0,0.60) 46%, rgba(0,0,0,0.17) 64%, transparent 78%)"

const AURORA_CSS = `
  @keyframes ds-aurora-drift {
    from { transform: translate3d(-2.5%, -1%, 0) scale(1.04) rotate(-1.5deg); }
    to   { transform: translate3d(2.5%, 1.5%, 0) scale(1.12) rotate(1.5deg); }
  }
  .ds-aurora {
    position: absolute;
    inset: -28% -12% 0 -12%;
    background:
      radial-gradient(46% 52% at 30% 20%, rgba(52,211,153,0.30) 0%, rgba(52,211,153,0) 68%),
      radial-gradient(42% 48% at 72% 10%, rgba(110,231,183,0.26) 0%, rgba(110,231,183,0) 70%),
      radial-gradient(60% 44% at 50% -4%, rgba(167,243,208,0.36) 0%, rgba(167,243,208,0) 72%);
    filter: blur(26px);
    animation: ds-aurora-drift 18s ease-in-out infinite alternate;
    will-change: transform;
  }
  .ds-aurora--dark {
    background:
      radial-gradient(46% 52% at 30% 20%, rgba(4,120,87,0.42) 0%, rgba(4,120,87,0) 68%),
      radial-gradient(42% 48% at 72% 10%, rgba(6,95,70,0.40) 0%, rgba(6,95,70,0) 70%),
      radial-gradient(60% 44% at 50% -4%, rgba(16,185,129,0.26) 0%, rgba(16,185,129,0) 72%);
  }
  @media (prefers-reduced-motion: reduce) {
    .ds-aurora { animation: none; }
  }
`

export function AuroraBackdrop({ dark = false }: { dark?: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ WebkitMaskImage: MASK, maskImage: MASK }}
    >
      <style>{AURORA_CSS}</style>

      {/* ① 渐变流动 */}
      <div className={dark ? "ds-aurora ds-aurora--dark" : "ds-aurora"} />

      {/* ② 像素抖动：细密圆点叠在渐变之上 */}
      <div className="absolute inset-0" style={{ opacity: dark ? 0.4 : 0.42 }}>
        <PixelBlast
          variant="circle"
          pixelSize={2.5}
          color={dark ? "#10B981" : "#6EE7B7"}
          patternScale={2}
          patternDensity={1.15}
          pixelSizeJitter={0.35}
          enableRipples={false}
          rippleSpeed={0.4}
          rippleThickness={0.12}
          rippleIntensityScale={1.2}
          speed={0.35}
          edgeFade={0.08}
          transparent
        />
      </div>
    </div>
  )
}
