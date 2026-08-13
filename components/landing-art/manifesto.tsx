"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";

/* ============================================================
   MANIFESTO —— 编辑式宣言 · 获奖级重设计
   · 纸色背景 + 微颗粒质感
   · 背景巨字 "01" 视差位移（与 AIChapters 巨字编号呼应）
   · 逐行 clip-path + blur + y 三重揭示
   · 末行点睛：蓝色 + 下划线扩展
   · 顶部章节进度条 + 右上信念计数
   · 左侧垂直发丝轨 + 章节标签
   · 结尾圆形印章
   ============================================================ */

const LINES: { text: string; accent?: boolean }[] = [
  { text: "莓界不只是工具。" },
  { text: "它是一个会思考、" },
  { text: "会提问、会解释、" },
  { text: "会规划的农事伙伴——" },
  { text: "把复杂的决策，" },
  { text: "变成一次自然的对话。" },
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
  const opacity = useTransform(progress, range, [0.1, 1]);
  const y = useTransform(progress, range, [60, 0]);
  const blur = useTransform(progress, range, ["blur(12px)", "blur(0px)"]);
  const underlineScale = useTransform(
    progress,
    [range[0] + 0.08, range[1]],
    [0, 1]
  );

  return (
    <span className="block overflow-hidden">
      <motion.span
        style={{
          clipPath: clip,
          WebkitClipPath: clip,
          opacity,
          y,
          filter: blur,
        }}
        className="block"
      >
        <span
          className="font-mono text-[11px] sm:text-[12px] text-[#0A0A0B]/25 align-top mr-3 sm:mr-5 hidden sm:inline"
          style={{ letterSpacing: "0.15em" }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <span
          className={accent ? "text-[#1677ff] relative inline-block" : "text-[#0A0A0B]"}
        >
          {children}
          {accent && (
            <motion.span
              style={{ scaleX: underlineScale, transformOrigin: "left" }}
              className="absolute -bottom-1 left-0 right-0 h-[3px] bg-[#1677ff]/20"
            />
          )}
        </span>
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

  // 顶部进度条
  const progressScaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  // 背景巨字 01 —— 横向位移 + 上浮视差
  const bgX = useTransform(scrollYProgress, [0, 1], ["6vw", "-10vw"]);
  const bgY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 0.045, 0.045, 0]);

  // 背景点阵网格 —— 上浮视差
  const gridY = useTransform(scrollYProgress, [0, 1], [0, -150]);

  // 进度计数：0 → 6
  const counter = useTransform(scrollYProgress, [0, 1], [0, 6]);
  const counterText = useTransform(counter, (v) =>
    String(Math.min(6, Math.floor(v) + 1)).padStart(2, "0")
  );

  // 暗→亮转场闪光（进入 Manifesto 时的白闪）
  const flashOpacity = useTransform(scrollYProgress, [0, 0.06, 0.14], [1, 0.3, 0]);

  // 左侧轨道进度
  const railScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const step = 0.7 / LINES.length;

  return (
    <section ref={ref} className="relative h-[300vh] bg-[#F7F5F0]">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* ============ 纸色微颗粒质感 ============ */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.035] mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
          aria-hidden
        />

        {/* ============ 背景点阵网格 ============ */}
        <motion.div
          style={{ y: gridY }}
          className="absolute inset-0 pointer-events-none opacity-[0.4]"
          aria-hidden
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(10,10,11,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(10,10,11,0.04) 1px, transparent 1px)",
              backgroundSize: "80px 80px",
              maskImage:
                "radial-gradient(ellipse at 60% 50%, black 15%, transparent 75%)",
              WebkitMaskImage:
                "radial-gradient(ellipse at 60% 50%, black 15%, transparent 75%)",
            }}
          />
        </motion.div>

        {/* ============ 背景巨字 01 ============ */}
        <motion.div
          style={{ x: bgX, y: bgY, opacity: bgOpacity }}
          className="absolute right-[-5vw] top-1/2 -translate-y-1/2 pointer-events-none select-none"
          aria-hidden
        >
          <span
            className="font-alimama font-bold text-[#0A0A0B] leading-none whitespace-nowrap"
            style={{
              fontSize: "clamp(320px, 52vw, 900px)",
              letterSpacing: "-0.08em",
            }}
          >
            01
          </span>
        </motion.div>

        {/* ============ 顶部章节进度条 ============ */}
        <div className="absolute top-0 left-0 right-0 z-30">
          <div className="h-px bg-[#0A0A0B]/8 w-full">
            <motion.div
              style={{ scaleX: progressScaleX, transformOrigin: "left" }}
              className="h-full bg-[#1677ff] w-full"
            />
          </div>
        </div>

        {/* ============ 顶部章节标记 ============ */}
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
            {/* 信念计数 */}
            <div className="flex items-baseline gap-2 font-mono">
              <motion.span
                style={{ opacity: useTransform(scrollYProgress, [0, 0.05], [0, 1]) }}
                className="text-[24px] sm:text-[32px] text-[#0A0A0B] tabular-nums leading-none font-light"
              >
                {counterText}
              </motion.span>
              <span className="text-[11px] tracking-[0.2em] text-[#0A0A0B]/35 uppercase">
                / 06
              </span>
            </div>
          </div>
        </div>

        {/* ============ 左侧垂直轨道 ============ */}
        <div className="absolute left-6 lg:left-10 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center gap-4 z-20">
          <span className="font-mono text-[10px] tracking-[0.3em] text-[#0A0A0B]/30 uppercase [writing-mode:vertical-rl] rotate-180">
            Belief
          </span>
          <div className="relative w-px h-48 bg-[#0A0A0B]/10">
            <motion.div
              style={{ scaleY: railScale }}
              className="absolute inset-0 origin-top bg-[#1677ff]"
            />
          </div>
          <motion.span
            style={{ opacity: useTransform(scrollYProgress, [0.8, 1], [0, 1]) }}
            className="font-mono text-[10px] tracking-[0.3em] text-[#1677ff] uppercase"
          >
            ✓
          </motion.span>
        </div>

        {/* ============ 主体：逐行揭示的巨字 ============ */}
        <div className="absolute inset-0 flex flex-col justify-center px-6 lg:px-10">
          <div className="max-w-[1600px] mx-auto w-full">
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-8 lg:mb-12 ml-0 sm:ml-[3.2rem]"
            >
              <span className="inline-flex items-center gap-3 font-mono text-[11px] sm:text-[12px] tracking-[0.3em] text-[#1677ff] uppercase">
                <span className="block w-1.5 h-1.5 bg-[#1677ff]" />
                我们相信
              </span>
            </motion.div>

            {/* 宣言正文 */}
            <h2
              className="font-alimama font-medium text-[#0A0A0B] leading-[1.06]"
              style={{
                fontSize: "clamp(36px, 7vw, 118px)",
                letterSpacing: "-0.04em",
              }}
            >
              {LINES.map((l, i) => {
                const start = 0.1 + i * step;
                const end = start + step * 1.5;
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

            {/* 签名落款 + 印章 */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mt-12 lg:mt-16 flex items-center gap-6 ml-0 sm:ml-[3.2rem]"
            >
              <span className="block w-12 h-px bg-[#0A0A0B]/40" />
              <span className="font-mono text-[11px] tracking-[0.25em] text-[#0A0A0B]/45 uppercase">
                Berry Realm · 2026
              </span>

              {/* 圆形印章 */}
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-14 h-14 sm:w-16 sm:h-16 ml-auto sm:ml-8"
              >
                <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden>
                  <circle
                    cx="32"
                    cy="32"
                    r="29"
                    fill="none"
                    stroke="#1677ff"
                    strokeWidth="1.5"
                    strokeDasharray="3 2"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="22"
                    fill="none"
                    stroke="#1677ff"
                    strokeWidth="1"
                    opacity="0.4"
                  />
                  <text
                    x="32"
                    y="28"
                    textAnchor="middle"
                    fill="#1677ff"
                    fontFamily="AlimamaShuHeiTi, sans-serif"
                    fontSize="11"
                    fontWeight="700"
                  >
                    莓界
                  </text>
                  <text
                    x="32"
                    y="42"
                    textAnchor="middle"
                    fill="#1677ff"
                    fontFamily="monospace"
                    fontSize="7"
                    letterSpacing="0.1em"
                  >
                    BELIEF
                  </text>
                </svg>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* ============ 暗→亮转场白闪 ============ */}
        <motion.div
          style={{ opacity: flashOpacity }}
          className="absolute inset-0 bg-white pointer-events-none z-40"
          aria-hidden
        />

        {/* ============ 底部过渡：纸色 → 暗 ============ */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-20"
          style={{ background: "linear-gradient(to top, #08080A 0%, transparent 100%)" }}
        />
      </div>
    </section>
  );
}
