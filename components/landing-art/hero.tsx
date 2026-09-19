"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
} from "framer-motion";
import Link from "next/link";
import BerryOrb from "@/components/smoothui/berry-orb";
import {
  MagneticButton,
  KineticText,
  Marquee,
  Eyebrow,
  EASE,
} from "./ui-primitives";
import { IconArrowRightUp } from "@/components/icon";

/* ============================================================
   HERO —— 电影级编辑式开篇 (Cinematic Editorial Prologue)
   灵感：Awwwards / Apple / Linear / OpenAI / Stripe / Swiss Grid
   · 中性聚光 + 编辑式序号 + 取景留白
   · 双行不对称巨字：实色 + 渐隐幽灵行
   · BerryOrb 签名视觉（跟随光标 + 呼吸光晕）
   · 三层视差：标题破碎上浮 / 球体下沉 / 光场淡出
   · 底部关键词跑马灯
   ============================================================ */
export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // 三层视差：标题上浮 + 球体下沉 + 光场淡出
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);

  const orbY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const orbScale = useSpring(useTransform(scrollYProgress, [0, 1], [1, 1.18]), {
    stiffness: 120,
    damping: 30,
  });
  const orbOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const glowOpacity = useTransform(scrollYProgress, [0, 0.8], [0.55, 0]);
  const glowScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);

  const hintOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const metaOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  return (
    <>
      <section ref={ref} className="relative w-full h-[150vh] overflow-hidden bg-[#08080A]">
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          {/* ============ 背景柔光：中性聚光，不与球体绿晕争色 ============ */}
          <motion.div
            style={{ opacity: glowOpacity, scale: glowScale }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          >
            <div
              className="w-[130vw] h-[130vw] max-w-[1600px] max-h-[1600px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 38%, transparent 65%)",
              }}
            />
          </motion.div>

          {/* ============ 顶部编辑式元信息：左序号 / 右状态 ============ */}
          <motion.div
            style={{ opacity: metaOpacity }}
            className="absolute top-24 left-6 lg:left-10 right-6 lg:right-10 flex items-start justify-between pointer-events-none"
          >
            <div className="flex items-center gap-4">
              <span className="font-mono text-[11px] tracking-[0.3em] text-white/35 uppercase">01</span>
              <span className="block w-10 h-px bg-white/15" />
              <span className="font-mono text-[11px] tracking-[0.3em] text-white/35 uppercase">Prologue</span>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#1677ff] opacity-60 animate-ping" />
                <span className="relative inline-flex size-1.5 rounded-full bg-[#1677ff]" />
              </span>
              <span className="font-mono text-[11px] tracking-[0.3em] text-white/45 uppercase">System Online</span>
            </div>
          </motion.div>

          {/* ============ 主内容：12 列 Swiss 网格 ============ */}
          <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-12 gap-8 px-6 lg:px-10">
            {/* 左：文字区 */}
            <motion.div
              style={{ y: titleY, opacity: titleOpacity }}
              className="lg:col-span-7 flex flex-col justify-center"
            >
              {/* 小标 */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15, ease: EASE as any }}
              >
                <Eyebrow>Conversational Agri-Intelligence</Eyebrow>
              </motion.div>

              {/* 主标题：双行不对称巨字 */}
              <h1
                className="font-alimama font-medium text-white mt-7"
                style={{
                  fontSize: "clamp(56px, 10.5vw, 176px)",
                  letterSpacing: "-0.05em",
                  lineHeight: 0.9,
                }}
              >
                <span className="block">
                  <KineticText
                    text="对话即决策"
                    stagger={0.05}
                    delay={0.3}
                    scrollY={scrollYProgress}
                    range={[0, 0.6]}
                    yShift={90}
                  />
                </span>
                <span
                  className="block text-right mt-1"
                  style={{
                    color: "rgba(255,255,255,0.16)",
                    WebkitMaskImage:
                      "linear-gradient(180deg, black 0%, transparent 95%)",
                    maskImage:
                      "linear-gradient(180deg, black 0%, transparent 95%)",
                  }}
                >
                  <KineticText
                    text="感知即守护"
                    stagger={0.05}
                    delay={0.5}
                    scrollY={scrollYProgress}
                    range={[0, 0.6]}
                    yShift={90}
                  />
                </span>
              </h1>

              {/* 英文副线 */}
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.95, ease: EASE as any }}
                className="font-mono text-[12px] tracking-[0.25em] text-white/40 uppercase mt-8"
              >
                Where conversation becomes cultivation.
              </motion.p>

              {/* 中文副文案 */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.05, ease: EASE as any }}
                className="mt-5 text-[15px] sm:text-[17px] leading-[1.7] text-white/55 max-w-[460px]"
              >
                一个会思考、会提问、会规划的 AI 农事伙伴——
                把复杂的决策，变成一次自然的对话。
              </motion.p>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 1.2, ease: EASE as any }}
                className="mt-12 flex items-center gap-8"
              >
                <MagneticButton
                  href="/dashboard"
                  className="group inline-flex items-center bg-white text-black px-8 py-4 text-[12px] tracking-[0.2em] uppercase transition-colors duration-300 hover:bg-[#1677ff] hover:text-white"
                >
                  进入莓界
                  <IconArrowRightUp
                    className="w-4 h-4 ml-3 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    strokeWidth={1.75}
                  />
                </MagneticButton>
                <Link
                  href="/ai-assistant"
                  data-cursor="hover"
                  className="group inline-flex items-center gap-2 text-[12px] tracking-[0.2em] uppercase text-white/70 hover:text-white transition-colors"
                >
                  <span className="relative">
                    体验 AI 助理
                    <span className="absolute -bottom-1 left-0 h-px w-0 bg-white transition-all duration-300 group-hover:w-full" />
                  </span>
                </Link>
              </motion.div>
            </motion.div>

            {/* 右：AI 感知球体（签名视觉） */}
            <motion.div
              style={{ y: orbY, scale: orbScale, opacity: orbOpacity }}
              className="lg:col-span-5 hidden lg:flex items-center justify-center"
            >
              <BerryOrb size="380px" theme="dark" />
            </motion.div>
          </div>

          {/* ============ 底部：滚动提示 + 关键词跑马灯 ============ */}
          <motion.div
            style={{ opacity: hintOpacity }}
            className="absolute bottom-0 left-0 right-0"
          >
            <div className="flex flex-col items-center gap-3 pb-6">
              <span className="font-mono text-[10px] tracking-[0.35em] text-white/30 uppercase">
                Scroll to begin
              </span>
              <span className="block w-px h-10 bg-gradient-to-b from-white/30 to-transparent" />
            </div>
            <div className="border-t border-white/5 py-3">
              <Marquee
                duration={42}
                separator={<span className="text-white/15 mx-6">·</span>}
              >
                {[
                  "PERCEPTION",
                  "REASONING",
                  "DECISION",
                  "GUARDIAN",
                  "IoT CLUSTER",
                  "VISION AI",
                  "REAL-TIME",
                ].map((w) => (
                  <span
                    key={w}
                    className="font-mono text-[10px] tracking-[0.35em] text-white/25 uppercase mx-6"
                  >
                    {w}
                  </span>
                ))}
              </Marquee>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}

/* ============================================================
   NAV —— 顶部发丝线，纯文字导航，mix-blend-difference 自适应
   ============================================================ */
export function Nav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 mix-blend-difference">
      <div className="grid grid-cols-3 items-center max-w-[1600px] mx-auto px-6 lg:px-10 py-5">
        <Link
          href="/"
          data-cursor="hover"
          className="justify-self-start flex items-center gap-3 text-white"
        >
          <span className="block w-2 h-2 bg-white" />
          <span className="text-[13px] tracking-[0.22em] font-medium uppercase">
            Berry&nbsp;Realm
          </span>
          <span className="hidden sm:inline font-mono text-[10px] tracking-[0.3em] text-white/50 ml-1">
            / v4.0
          </span>
        </Link>
        <nav className="justify-self-center hidden md:flex items-center gap-9">
          {[
            { label: "推理", href: "/ai-assistant" },
            { label: "控制台", href: "/dashboard" },
            { label: "监控", href: "/monitor" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              data-cursor="hover"
              className="group relative text-[12px] tracking-[0.2em] uppercase text-white/70 transition-colors hover:text-white"
            >
              {l.label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-white transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>
        <Link
          href="/dashboard"
          data-cursor="hover"
          className="justify-self-end text-[12px] tracking-[0.2em] uppercase text-white/70 hover:text-white transition-colors group"
        >
          <span className="inline-flex items-center gap-2">
            进入
            <span className="inline-block w-6 h-px bg-white/40 group-hover:bg-white transition-colors" />
          </span>
        </Link>
      </div>
    </header>
  );
}
