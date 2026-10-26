"use client"

import { useId } from "react"
import type { CSSProperties } from "react"

/**
 * 「工作状态」图标 —— 三瓣星星自上而下连续飘落的 loader（Uiverse by andrew-manzyk 原稿）。
 *
 * 相对原稿做的三处必要修正（外观、节奏、比例 1:1 保留，未改任何一帧）：
 *
 * 1. 🚨 **id 去重**：原稿把 `#shine` / `#mask` / `#gradient-1..5` 在三个 <svg> 里
 *    各定义一遍 —— 同一文档内同 id 只有第一个生效，等于后两个 svg 的渐变/遮罩
 *    全靠"蹭"第一个的定义，一旦其中某个 svg 被单独复用就整片变黑。
 *    这里改为**一份共享 <defs>**（0×0 的 svg），三瓣统一 `url(#${uid}-xxx)` 引用。
 *
 * 2. **配色参数化**：原稿主色 `#5c3d99`（紫）→ 本项目用量子 `--fill` 注入
 *    （亮 #059669 / 暗 #34D399，即全站晨雾松 emphasis）。星星第一层本来是
 *    `fill="currentColor"`，所以只把根节点的 `color` 设成 fill 色即可，
 *    其余 6 层是黑/白渐变高光，保持中性 —— 换色不会把立体感换掉。
 *
 * 3. **尺寸可控**：原稿靠 `transform: scale(0.5)` 缩一个固定 100px 的舞台，
 *    但 scale 不改变布局盒（永远占 100px）。这里外层用一个 `size` 的占位盒，
 *    内部 100px 舞台绝对定位居中再缩放 —— 布局尺寸精确，视觉比例不变。
 *    原稿坐标系的可见行程约 y ∈ [-100, +100]，k = size/100，故 size=20 时
 *    可见飘落带 ≈ 40px 高、星星峰值 ≈ 20px。
 */

/** 原稿的四角星路径（三瓣共用） */
const STAR_D =
  "M63,37c-6.7-4-4-27-13-27s-6.3,23-13,27-27,4-27,13,20.3,9,27,13,4,27,13,27,6.3-23,13-27,27-4,27-13-20.3-9-27-13Z"

export interface WorkingLoaderProps {
  /** 星星峰值边长（px），默认 20 */
  size?: number
  darkMode?: boolean
  /** 亮色下的主色，默认 #059669（晨雾松 emerald-600） */
  color?: string
  /** 暗色下的主色，默认 #34D399（emerald-400） */
  darkColor?: string
  className?: string
}

export function WorkingLoader({
  size = 20,
  darkMode = false,
  color = "#059669",
  darkColor = "#34D399",
  className,
}: WorkingLoaderProps) {
  // React 的 useId 会带 ":" / "«»" 等字符，不能直接进 CSS url(#...) —— 先洗一遍
  const uid = `wl${useId().replace(/[^a-zA-Z0-9]/g, "")}`
  const k = size / 100
  const fill = darkMode ? darkColor : color
  const shine = darkMode ? "rgba(52,211,153,0.34)" : "rgba(5,150,105,0.30)"

  const g1 = `${uid}-g1`
  const g2 = `${uid}-g2`
  const g3 = `${uid}-g3`
  const g4 = `${uid}-g4`
  const g5 = `${uid}-g5`
  const shineId = `${uid}-shine`
  const maskId = `${uid}-mask`

  /* 一瓣 = 原稿 <g> 里那 7 层路径（底色 + 6 层黑/白渐变高光） */
  const Petal = (
    <g>
      <path d={STAR_D} fill="currentColor" />
      <path d={STAR_D} fill={`url(#${g1})`} />
      <path
        d={STAR_D}
        fill="none"
        stroke="white"
        opacity="0.3"
        strokeWidth="3"
        filter={`url(#${shineId})`}
        mask={`url(#${maskId})`}
      />
      <path d={STAR_D} fill={`url(#${g2})`} />
      <path d={STAR_D} fill={`url(#${g3})`} />
      <path d={STAR_D} fill={`url(#${g4})`} />
      <path d={STAR_D} fill={`url(#${g5})`} />
    </g>
  )

  return (
    <span
      aria-hidden
      className={className}
      style={{
        position: "relative",
        display: "inline-block",
        /* 占位盒：横竖给足，避免左右两瓣飘出边界撞到「正在工作」文字 */
        width: Math.round(size * 1.7),
        height: size,
        flexShrink: 0,
        color: fill,
        pointerEvents: "none",
      }}
    >
      <style>{`
        .wl-stage {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 100px;
          height: 100px;
          transform-origin: center center;
          /* 原稿 .loader 的 filter: drop-shadow(0 0 10px var(--shine-color)) */
          filter: drop-shadow(0 0 10px var(--wl-shine));
        }
        .wl-stage > svg {
          position: absolute;
          inset: 0;
          width: 100px;
          height: 100px;
          display: block;
          overflow: visible;
        }
        .wl-petal--1 { animation: wl-flowe-one 1s linear infinite; }
        .wl-petal--2 {
          opacity: 0;
          transform: scale(0) translateY(-200px) translateX(-100px);
          animation: wl-flowe-two 1s linear infinite;
          animation-delay: 0.3s;
        }
        .wl-petal--3 {
          opacity: 0;
          transform: scale(0) translateY(-200px) translateX(100px);
          animation: wl-flowe-three 1s linear infinite;
          animation-delay: 0.6s;
        }
        @keyframes wl-flowe-one {
          0%   { transform: scale(0.5) translateY(-200px); opacity: 0; }
          25%  { transform: scale(0.75) translateY(-100px); opacity: 1; }
          50%  { transform: scale(1) translateY(0px); opacity: 1; }
          75%  { transform: scale(0.5) translateY(50px); opacity: 1; }
          100% { transform: scale(0) translateY(100px); opacity: 0; }
        }
        @keyframes wl-flowe-two {
          0%   { transform: scale(0.5) rotateZ(-10deg) translateY(-200px) translateX(-100px); opacity: 0; }
          25%  { transform: scale(1) rotateZ(-5deg) translateY(-100px) translateX(-50px); opacity: 1; }
          50%  { transform: scale(1) rotateZ(0deg) translateY(0px) translateX(-25px); opacity: 1; }
          75%  { transform: scale(0.5) rotateZ(5deg) translateY(50px) translateX(0px); opacity: 1; }
          100% { transform: scale(0) rotateZ(10deg) translateY(100px) translateX(25px); opacity: 0; }
        }
        @keyframes wl-flowe-three {
          0%   { transform: scale(0.5) rotateZ(10deg) translateY(-200px) translateX(100px); opacity: 0; }
          25%  { transform: scale(1) rotateZ(5deg) translateY(-100px) translateX(50px); opacity: 1; }
          50%  { transform: scale(1) rotateZ(0deg) translateY(0px) translateX(25px); opacity: 1; }
          75%  { transform: scale(0.5) rotateZ(-5deg) translateY(50px) translateX(0px); opacity: 1; }
          100% { transform: scale(0) rotateZ(-10deg) translateY(100px) translateX(-25px); opacity: 0; }
        }
        /* 降级：关掉位移/缩放，只留一次缓慢呼吸 —— 仍然能读出「在工作」 */
        @media (prefers-reduced-motion: reduce) {
          .wl-petal--2, .wl-petal--3 { display: none; }
          .wl-petal--1 {
            animation: wl-breathe 1.7s ease-in-out infinite !important;
            transform: scale(1) !important;
            opacity: 1 !important;
          }
          @keyframes wl-breathe {
            0%, 100% { opacity: 0.4; }
            50%      { opacity: 1; }
          }
        }
      `}</style>

      {/* 共享 defs：一份即可（原稿三份同 id 属无效 HTML） */}
      <svg width="0" height="0" aria-hidden focusable="false" style={{ position: "absolute" }}>
        <defs>
          <filter id={shineId}>
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <mask id={maskId}>
            <path d={STAR_D} fill="white" />
          </mask>
          <radialGradient
            id={g1}
            cx="50" cy="66" fx="50" fy="66" r="30"
            gradientTransform="translate(0 35) scale(1 0.5)"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="black" stopOpacity="0.3" />
            <stop offset="50%" stopColor="black" stopOpacity="0.1" />
            <stop offset="100%" stopColor="black" stopOpacity="0" />
          </radialGradient>
          <radialGradient
            id={g2}
            cx="55" cy="20" fx="55" fy="20" r="30"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="white" stopOpacity="0.3" />
            <stop offset="50%" stopColor="white" stopOpacity="0.1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={g3} cx="85" cy="50" fx="85" fy="50" href={`#${g2}`} />
          <radialGradient
            id={g4}
            cx="50" cy="58" fx="50" fy="58" r="60"
            gradientTransform="translate(0 47) scale(1 0.2)"
            href={`#${g3}`}
          />
          <linearGradient id={g5} x1="50" y1="90" x2="50" y2="10" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="black" stopOpacity="0.2" />
            <stop offset="40%" stopColor="black" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <span
        className="wl-stage"
        style={{
          transform: `translate(-50%, -50%) scale(${k})`,
          ...({ "--wl-shine": shine } as CSSProperties),
        }}
      >
        <svg className="wl-petal--1" viewBox="0 0 100 100">{Petal}</svg>
        <svg className="wl-petal--2" viewBox="0 0 100 100">{Petal}</svg>
        <svg className="wl-petal--3" viewBox="0 0 100 100">{Petal}</svg>
      </span>
    </span>
  )
}

export default WorkingLoader
