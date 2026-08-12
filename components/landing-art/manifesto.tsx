"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import { Eyebrow } from "./ui-primitives";

/* ============================================================
   MANIFESTO —— 编辑式逐行揭示宣言 · 重新设计
   · 保留：纸色背景、逐行 clip-path 揭示、末行点睛上色
   · 新增：背景巨字 "BELIEF" 横向视差位移 + 旋转
   · 新增：右上角信念计数 01/06 → 06/06（按进度同步）
   · 新增：背景点阵网格 + 视差上浮
   ============================================================ */

const LINES: { text: string; accent?: boolean }[] = [
  { text: "莓界不只是工具。" },
  { text: "它是一个会思考、" },
  { text: "会提问、会解释、" },
  { text: "会规划的农事伙伴——" },
  { text: "把复杂的决策，", accent: false },
  { text: "变成一次自然的对话。", accent: true },
];

function Line({
  progress,
  range,
  children,
  accent,
  index,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  children: React.ReactNode;
  accent?: boolean;
  index: number;
}) {
  const clip = useTransform(progress, range, ["inset(100% 0% 0% 0%)", "inset(0% 0% 0% 0%)"]);
  const opacity = useTransform(progress, range, [0.15, 1]);
  const y = useTransform(progress, range, [40, 0]);

  return (
    <span className="block overflow-hidden">
      <motion.span
        style={{
          clipPath: clip,
          WebkitClipPath: clip,
          opacity,
          y,
          color: accent ? "#1677ff" : "#0A0A0B",
        }}
        className="block"
      >
        <span className="font-mono text-[12px] text-[#0A0A0B]/30 align-top mr-4 hidden sm:inline">
          {String(index + 1).padStart(2, "0")}
        </span>
        {children}
      </motion.span>
    </span>
  );
}

export function Manifesto() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // 进度轨高度
  const railScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  // 背景巨字 BELIEF —— 横向位移 + 轻微旋转
  const bgX = useTransform(scrollYProgress, [0, 1], ["8vw", "-12vw"]);
  const bgY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const bgRotate = useTransform(scrollYProgress, [0, 1], [-2, 2]);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.4, 0.85, 1], [0, 0.05, 0.05, 0]);

  // 背景点阵网格 —— 上浮视差
  const gridY = useTransform(scrollYProgress, [0, 1], [0, -120]);

  // 进度计数：0 → 6
  const counter = useTransform(scrollYProgress, [0, 1], [0, 6]);
  const counterText = useTransform(counter, (v) => String(Math.min(6, Math.floor(v) + 1)).padStart(2, "0"));

  const step = 0.7 / LINES.length;

  return (
    <section ref={ref} className="relative h-[280vh] bg-[#F7F5F0]">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* ============ 背景点阵网格 ============ */}
        <motion.div
          style={{ y: gridY }}
          className="absolute inset-0 pointer-events-none opacity-[0.5]"
          aria-hidden
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(10,10,11,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(10,10,11,0.05) 1px, transparent 1px)",
              backgroundSize: "80px 80px",
              maskImage:
                "radial-gradient(ellipse at center, black 20%, transparent 80%)",
              WebkitMaskImage:
                "radial-gradient(ellipse at center, black 20%, transparent 80%)",
            }}
          />
        </motion.div>

        {/* ============ 背景巨字 BELIEF ============ */}
        <motion.div
          style={{ x: bgX, y: bgY, rotate: bgRotate, opacity: bgOpacity }}
          className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none select-none"
          aria-hidden
        >
          <span
            className="font-alimama font-medium text-[#0A0A0B] leading-none whitespace-nowrap"
            style={{
              fontSize: "clamp(280px, 38vw, 720px)",
              letterSpacing: "-0.08em",
            }}
          >
            BELIEF
          </span>
        </motion.div>

        {/* ============ 顶部章节标记（克制版）============ */}
        <div className="absolute top-0 left-0 right-0 z-20 pt-24">
          <div className="max-w-[1600px] mx-auto px-6 lg:px-10 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <span className="font-mono text-[11px] tracking-[0.25em] text-[#0A0A0B]/40 uppercase">
                01 / 信仰
              </span>
              <span className="block w-12 h-px bg-[#0A0A0B]/15" />
              <span className="font-mono text-[11px] tracking-[0.25em] text-[#0A0A0B]/40 uppercase">
                Manifesto
              </span>
            </div>
            {/* 信念计数 —— 滚动时同步更新 */}
            <div className="flex items-baseline gap-2 font-mono">
              <motion.span
                style={{ opacity: useTransform(scrollYProgress, [0, 0.05], [0, 1]) }}
                className="text-[24px] sm:text-[32px] text-[#0A0A0B] tabular-nums leading-none"
              >
                {counterText}
              </motion.span>
              <span className="text-[11px] tracking-[0.2em] text-[#0A0A0B]/40 uppercase">
                / 06
              </span>
            </div>
          </div>
        </div>

        {/* ============ 左侧滚动进度发丝轨 ============ */}
        <div className="absolute left-6 lg:left-10 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center gap-4 z-20">
          <span className="font-mono text-[10px] tracking-[0.3em] text-[#0A0A0B]/35 uppercase [writing-mode:vertical-rl] rotate-180">
            Belief
          </span>
          <div className="relative w-px h-48 bg-[#0A0A0B]/10">
            <motion.div
              style={{ scaleY: railScale }}
              className="absolute inset-0 origin-top bg-[#0A0A0B]"
            />
          </div>
          <motion.span
            style={{ opacity: useTransform(scrollYProgress, [0.8, 1], [0, 1]) }}
            className="font-mono text-[10px] tracking-[0.3em] text-[#0A0A0B]/60 uppercase"
          >
            ✓
          </motion.span>
        </div>

        {/* ============ 主体：逐行揭示的巨字 ============ */}
        <div className="absolute inset-0 flex flex-col justify-center px-6 lg:px-10">
          <div className="max-w-[1600px] mx-auto w-full">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-8 lg:mb-12 ml-0 sm:ml-[2.2rem]"
            >
              <Eyebrow>我们相信</Eyebrow>
            </motion.div>

            <h2
              className="font-alimama font-medium text-[#0A0A0B] leading-[1.08]"
              style={{
                fontSize: "clamp(34px, 6.5vw, 104px)",
                letterSpacing: "-0.04em",
              }}
            >
              {LINES.map((l, i) => {
                const start = 0.12 + i * step;
                const end = start + step * 1.4;
                return (
                  <Line
                    key={i}
                    progress={scrollYProgress}
                    range={[start, end]}
                    accent={l.accent}
                    index={i}
                  >
                    {l.text}
                  </Line>
                );
              })}
            </h2>

            {/* 签名落款 */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mt-12 lg:mt-16 flex items-center gap-4 ml-0 sm:ml-[2.2rem]"
            >
              <span className="block w-12 h-px bg-[#0A0A0B]/40" />
              <span className="font-mono text-[11px] tracking-[0.25em] text-[#0A0A0B]/45 uppercase">
                Berry Realm · 2025
              </span>
            </motion.div>
          </div>
        </div>

        {/* 底部过渡：纸色 → 暗 */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{ background: "linear-gradient(to top, #08080A 0%, transparent 100%)" }}
        />
      </div>
    </section>
  );
}
