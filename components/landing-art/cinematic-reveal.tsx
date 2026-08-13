"use client"

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MagneticButton } from "./ui-primitives";

/* ============================================================
   CINEMATIC REVEAL —— 获奖级滚动叙事开篇
   叙事节拍（320vh 滚动行程）：
   1. 0–28%   视频仅从「对话即决策 / 感知即守护」字缝里透出
   2. 28–48%  镜头前推，虹膜圆遮罩从字心骤扩 → 视野瞬间开阔
   3. 48–78%  全屏沉浸影像，巨型标语 + CTA 浮入
   4. 78–100% 影像回暗，硬切到纸白宣言章节
   ============================================================ */
export function CinematicReveal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // 弹簧化让镜头推进更顺滑、有惯性
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    mass: 0.6,
  });

  // 镜头前推：视频由 1.12 缓慢推到 2.35
  const videoScale = useTransform(
    progress,
    [0, 0.28, 0.48, 0.72, 1],
    [1.12, 1.25, 1.75, 2.2, 2.35]
  );

  // 虹膜半径（px）：憋住 → 爆发 → 铺满
  const irisR = useTransform(
    progress,
    [0, 0.28, 0.36, 0.5, 1],
    [0, 0, 900, 2400, 2600]
  );

  // 视频亮度：打开瞬间提亮，结尾回暗
  const brightness = useTransform(
    progress,
    [0, 0.3, 0.5, 0.85, 1],
    [0.92, 0.98, 1.18, 1.05, 0.7]
  );
  const saturate = useTransform(
    progress,
    [0, 0.45, 0.65, 1],
    [1.05, 1.1, 1.3, 1.1]
  );

  // 字框描边：打开后迅速隐去
  const strokeOpacity = useTransform(
    progress,
    [0, 0.3, 0.42, 1],
    [0.18, 0.18, 0, 0]
  );

  // 上下黑边 letterbox
  const barScaleY = useTransform(
    progress,
    [0, 0.32, 0.5, 1],
    [1, 1, 0, 0]
  );

  // 巨型标语浮入
  const taglineOpacity = useTransform(
    progress,
    [0, 0.5, 0.62, 0.82, 1],
    [0, 0, 1, 1, 0]
  );
  const taglineY = useTransform(
    progress,
    [0, 0.5, 0.62, 0.82, 1],
    [48, 48, 0, 0, -32]
  );
  const taglineScale = useTransform(
    progress,
    [0, 0.5, 0.62, 0.82, 1],
    [0.96, 0.96, 1, 1, 1.02]
  );

  // CTA 延迟浮入
  const ctaOpacity = useTransform(
    progress,
    [0, 0.6, 0.7, 0.82, 1],
    [0, 0, 1, 1, 0]
  );
  const ctaY = useTransform(
    progress,
    [0, 0.6, 0.7, 0.82, 1],
    [28, 28, 0, 0, -16]
  );

  // 章节角标
  const cornerOpacity = useTransform(
    progress,
    [0, 0.08, 0.85, 1],
    [0, 1, 1, 0]
  );

  return (
    <section
      ref={containerRef}
      className="relative h-[320vh] w-full bg-[#08080A]"
      aria-label="Cinematic opening"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* ===== 主视频：唯一源，由 SVG mask 控制可见区域 ===== */}
        <motion.video
          src="/login-video/14361873_2880_2160_30fps.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          style={{
            scale: reduceMotion ? 1.2 : videoScale,
            filter: useTransform(
              [brightness, saturate],
              ([b, s]) => `brightness(${b}) saturate(${s})`
            ),
          }}
          className="absolute inset-0 h-full w-full object-cover will-change-transform"
        />

        {/* ===== 黑色遮罩 + 虹膜/文字 mask（核心手法） ===== */}
        <div
          style={{
            WebkitMaskImage: "url(#cine-mask)",
            maskImage: "url(#cine-mask)",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskSize: "100% 100%",
            maskSize: "100% 100%",
          }}
          className="absolute inset-0 bg-[#08080A]"
        />

        {/* SVG mask 定义：白底（遮住视频）+ 黑字（字缝开窗）+ 扩张黑圆（虹膜打开） */}
        <svg
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <mask
              id="cine-mask"
              maskUnits="userSpaceOnUse"
              maskContentUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="100%"
              height="100%"
            >
              <rect width="100%" height="100%" fill="white" />
              <text
                x="50%"
                y="43%"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="black"
                fontFamily="AlimamaShuHeiTi, system-ui, sans-serif"
                fontWeight={700}
                style={{ fontSize: "clamp(56px, 11vw, 184px)", letterSpacing: "-0.04em" }}
              >
                对话即决策
              </text>
              <text
                x="50%"
                y="59%"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="black"
                fontFamily="AlimamaShuHeiTi, system-ui, sans-serif"
                fontWeight={700}
                style={{ fontSize: "clamp(56px, 11vw, 184px)", letterSpacing: "-0.04em" }}
              >
                感知即守护
              </text>
              {!reduceMotion && (
                <motion.circle
                  cx="50%"
                  cy="51%"
                  fill="black"
                  r={irisR}
                />
              )}
            </mask>
          </defs>
        </svg>

        {/* ===== 文字描边轮廓：始终给字形一丝定义 ===== */}
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          aria-hidden="true"
          focusable="false"
        >
          <motion.g style={{ opacity: strokeOpacity }} fill="none" stroke="white" strokeWidth={1}>
            <text
              x="50%"
              y="43%"
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="AlimamaShuHeiTi, system-ui, sans-serif"
              fontWeight={700}
              style={{ fontSize: "clamp(56px, 11vw, 184px)", letterSpacing: "-0.04em" }}
            >
              对话即决策
            </text>
            <text
              x="50%"
              y="59%"
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="AlimamaShuHeiTi, system-ui, sans-serif"
              fontWeight={700}
              style={{ fontSize: "clamp(56px, 11vw, 184px)", letterSpacing: "-0.04em" }}
            >
              感知即守护
            </text>
          </motion.g>
        </svg>

        {/* ===== Vignette 暗角 ===== */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)",
          }}
        />

        {/* ===== 胶片颗粒 ===== */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        {/* ===== 上下黑边 Letterbox ===== */}
        <motion.div
          style={{ scaleY: barScaleY }}
          className="absolute top-0 left-0 right-0 h-[7vh] bg-[#08080A] origin-top z-20"
        />
        <motion.div
          style={{ scaleY: barScaleY }}
          className="absolute bottom-0 left-0 right-0 h-[7vh] bg-[#08080A] origin-bottom z-20"
        />

        {/* ===== 章节角标 ===== */}
        <motion.div
          style={{ opacity: cornerOpacity }}
          className="absolute top-24 left-6 lg:left-10 flex items-center gap-4 pointer-events-none z-30"
        >
          <span className="font-mono text-[11px] tracking-[0.3em] text-white/40 uppercase">00</span>
          <span className="block w-10 h-px bg-white/15" />
          <span className="font-mono text-[11px] tracking-[0.3em] text-white/40 uppercase">Prologue</span>
        </motion.div>

        {/* ===== 打开后的巨型标语 + CTA ===== */}
        <motion.div
          style={{ opacity: taglineOpacity, y: taglineY, scale: taglineScale }}
          className="absolute inset-0 flex flex-col items-center justify-center z-30 px-6"
        >
          {/* 英文引导线 */}
          <div className="flex items-center gap-4 mb-8">
            <span className="block w-8 h-px bg-white/30" />
            <span className="font-mono text-[11px] sm:text-[12px] tracking-[0.4em] text-white/50 uppercase">
              Berry Realm
            </span>
            <span className="block w-8 h-px bg-white/30" />
          </div>

          {/* 巨型双行标语 */}
          <h2
            className="font-alimama font-bold text-white text-center leading-[0.95]"
            style={{
              fontSize: "clamp(40px, 8.5vw, 148px)",
              letterSpacing: "-0.04em",
              textShadow: "0 4px 40px rgba(0,0,0,0.5)",
            }}
          >
            <span className="block">让每一次感知</span>
            <span
              className="block mt-2"
              style={{
                background: "linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.55) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              都成为守护的决策
            </span>
          </h2>

          {/* 英文副标 */}
          <span className="mt-8 font-mono text-[10px] sm:text-[11px] tracking-[0.35em] text-white/35 uppercase">
            Where perception becomes guardianship
          </span>

          {/* CTA */}
          <motion.div
            style={{ opacity: ctaOpacity, y: ctaY }}
            className="mt-12 flex flex-col sm:flex-row items-center gap-6"
          >
            <MagneticButton
              href="/dashboard"
              className="group inline-flex items-center bg-white text-black px-9 py-4 text-[12px] tracking-[0.2em] uppercase transition-colors duration-300 hover:bg-[#1677ff] hover:text-white"
            >
              进入莓界
              <ArrowUpRight
                className="w-4 h-4 ml-3 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                strokeWidth={1.75}
              />
            </MagneticButton>
            <Link
              href="/ai-assistant"
              data-cursor="hover"
              className="group inline-flex items-center gap-2 text-[12px] tracking-[0.2em] uppercase text-white/60 hover:text-white transition-colors"
            >
              <span className="relative">
                体验 AI 助理
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-white transition-all duration-300 group-hover:w-full" />
              </span>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
