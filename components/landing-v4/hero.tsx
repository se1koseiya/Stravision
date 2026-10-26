"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { HERO_GLOWS, HERO_GLOW_BLUR, L } from "./shared";
import { AppWindow } from "./app-window";
import { IconArrowRightUp, IconPlay } from "@/components/icon";

/* ------------------------------------------------------------
   首屏 —— 对齐 loomy.xunfei.cn 的 HeroGradientBackground
   · 背景是左右两个大椭圆光斑（左黄 #FFF85E 82% / 右绿 #75FF9F 76%），
     各自 rotate ±8-9°、blur clamp(3.5rem,7vw,7rem)，落在 34%/42% 高度
   · 顶部 38% 白色渐隐 + 底部 5rem 白色渐隐，把光斑"洗"进白底
   · 标题 clamp(1.9rem,4vw,3.5rem) / 700 / leading 1.06 / tracking -0.045em
   · 品牌名下划线是 emerald-300 圆条，压在文字后面（-z-10）
   · 按钮：主=墨黑胶囊，次=薄荷胶囊（和下载区同一套）
   · 第二行绿字是上下滑动的轮播字（RotatingLine），等宽 5 字词不抖版
   ------------------------------------------------------------ */

const HERO_WORDS = ["种好每一茬", "管好每个棚", "看好每株苗"];
const WORD_SWAP_MS = 2600;

function RotatingLine() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((v) => (v + 1) % HERO_WORDS.length);
    }, WORD_SWAP_MS);
    return () => clearInterval(timer);
  }, []);
  return (
    <span
      className="relative inline-block overflow-hidden align-bottom"
      style={{ color: L.accentStrong }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={HERO_WORDS[index]}
          className="inline-block whitespace-nowrap"
          initial={{ y: "105%" }}
          animate={{ y: "0%" }}
          exit={{ y: "-105%" }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          {HERO_WORDS[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * 首屏文案全可覆盖（2026-09-29 新增，全部可选）：
 * 不传 = 品牌落地页原样；产品更新页 /whats-new 传自己的三行字 + 按钮，
 * 复用同一套光斑背景 / 排版 / 动画，不再另写一版 Hero。
 */
export interface HeroProps {
  /** 大标题上方的小字标签 */
  eyebrow?: string;
  /** 主标题（可传 ReactNode，自带 <br /> 分行） */
  title?: ReactNode;
  /** 副标题段落 */
  subtitle?: string;
  /** 主按钮（默认「免费开始使用」→ /dashboard） */
  primaryCta?: { href: string; label: string };
  /** 次按钮（默认「查看现场演示」→ /showcase） */
  secondaryCta?: { href: string; label: string };
  /** 按钮下方的小字 */
  note?: string;
  /** 是否在首屏下方挂应用窗口（默认挂） */
  showAppWindow?: boolean;
}

export function Hero({
  eyebrow,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  note,
  showAppWindow = true,
}: HeroProps = {}) {
  return (
    <section
      className="relative isolate overflow-hidden"
      style={{ background: L.surface, color: L.ink }}
    >
      {/* 光斑背景 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden dark:opacity-70">
        {HERO_GLOWS.map((g) => (
          <div
            key={g.background}
            className="absolute rounded-full"
            style={{ ...g.style, background: g.background, opacity: g.opacity, transform: g.transform, filter: `blur(${HERO_GLOW_BLUR})` }}
          />
        ))}
        {/* 顶部 38% 底色渐隐（深浅色各自洗进页面底色） */}
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: "38%",
            background:
              "linear-gradient(180deg, var(--lg-surface) 0%, color-mix(in srgb, var(--lg-surface) 82%, transparent) 55%, transparent 100%)",
          }}
        />
        {/* 底部 5rem 底色渐隐 */}
        <div
          className="absolute inset-x-0 bottom-0 h-20"
          style={{ background: "linear-gradient(0deg, color-mix(in srgb, var(--lg-surface) 55%, transparent) 0%, transparent 100%)" }}
        />
      </div>

      <div className="relative z-10 mx-auto flex w-[min(100%-2rem,76rem)] flex-col items-center px-2 pb-10 pt-[156px] text-center lg:pb-12 lg:pt-[188px]">
        {eyebrow ? (
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6 rounded-full px-3.5 py-1.5 text-[12.5px] font-bold tracking-[0.14em]"
            style={{ background: "var(--lg-chip)", color: L.greenInk }}
          >
            {eyebrow}
          </motion.p>
        ) : null}
        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto font-bold"
          style={{
            fontSize: "clamp(2.125rem, 10vw, 3rem)",
            lineHeight: 1.06,
            letterSpacing: "-0.045em",
          }}
        >
          {title ?? (
            <>
              <span className="inline-flex flex-wrap items-baseline justify-center md:text-[clamp(1.9rem,4vw,3.5rem)]">
                <span className="inline-flex whitespace-nowrap">
                  {/* 品牌名 + emerald-300 圆条下划线（压在字后面） */}
                  <span className="relative isolate inline-block after:absolute after:inset-x-0 after:bottom-0.5 after:-z-10 after:h-2.5 after:rounded-full after:bg-[#5EE9B5] after:content-['']">
                    莓界
                  </span>
                  <span aria-hidden>，</span>
                </span>
                <span className="whitespace-nowrap">你的 AI 农事搭子</span>
              </span>
              <br />
              <span className="mt-1 block whitespace-nowrap md:text-[clamp(1.9rem,4vw,3.5rem)]">
                帮你
                <RotatingLine />
              </span>
            </>
          )}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="mt-7 max-w-2xl text-base leading-8 sm:text-lg"
          style={{ color: L.muted }}
        >
          {subtitle ??
            "不只是听指令的助手，更会主动理解你的大棚——盯着温湿光水、按规则自动调控，把经验沉淀成每一茬稳定的收成。"}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row"
        >
          {/* 主：墨黑胶囊（深色模式翻转为白底墨字） */}
          <Link
            href={primaryCta?.href ?? "/dashboard"}
            className="group inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-7 text-[14px] font-semibold transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 sm:w-auto"
            style={{ background: L.btnBg, color: L.btnFg }}
          >
            {primaryCta?.label ?? "免费开始使用"}
            <IconArrowRightUp className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
          {/* 次：薄荷胶囊（Loomy 下载区同一个次按钮语言） */}
          <Link
            href={secondaryCta?.href ?? "/showcase"}
            className="group inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 text-[14px] font-semibold transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 sm:w-auto"
            style={{ background: L.emerald300, color: L.neutral950 }}
          >
            <IconPlay className="size-3.5 fill-current" />
            {secondaryCta?.label ?? "查看现场演示"}
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.34 }}
          className="mt-5 text-[13px]"
          style={{ color: L.muted, opacity: 0.8 }}
        >
          {note ?? "网页端 / 移动端均可使用 · 支持私有化部署"}
        </motion.p>
      </div>

      {showAppWindow ? <AppWindow className="relative z-10 mt-12 px-6 pb-24 md:mt-14" /> : null}

      {/* 窗口底缘熔进背景（对齐 Loomy：内容行以下渐隐，不在分区衔接处留硬切线） */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-40"
        style={{
          background: "linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--lg-surface) 72%, transparent) 45%, var(--lg-surface) 88%)",
        }}
      />
    </section>
  );
}
