"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ScribbleUnderline,
  ArrowDoodle,
  TapeStrip,
  StrawberrySprig,
} from "./doodles";

/* ============================================================
   FINALE —— 收尾 · 一季之后
   · 收获照片贴于纸面 + 衬线结语 + 手绘按钮
   ============================================================ */

const EASE = [0.16, 1, 0.3, 1] as const;
const SERIF = 'Georgia, "Songti SC", "STSong", "SimSun", serif';
const KAI = '"Kaiti SC", "STKaiti", "KaiTi", "楷体", serif';

const FOOTER_LINKS = [
  { href: "/plans", label: "订阅方案" },
  { href: "/kb-store", label: "知识库市场" },
  { href: "/blog", label: "日志" },
  { href: "/privacy", label: "隐私政策" },
  { href: "/terms", label: "服务条款" },
];

export function Finale() {
  return (
    <footer className="relative overflow-hidden bg-[#F4F4F5]">
      <div className="mx-auto max-w-[1400px] px-6 pb-12 pt-28 md:px-10 md:pt-36">
        <div className="grid items-center gap-14 md:grid-cols-[1.1fr_0.9fr] md:gap-8">
          {/* 结语 */}
          <motion.div
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 1, ease: EASE }}
          >
            <p
              className="mb-6 text-[14px] text-[#A63A3D]"
              style={{ fontFamily: KAI }}
            >
              —— 一季之后，你会感谢现在的决定
            </p>
            <h2
              className="text-[clamp(2rem,4.4vw,3.6rem)] leading-[1.35] tracking-tight text-[#18181B]"
              style={{ fontFamily: SERIF }}
            >
              把复杂的决策，
              <br />
              变成
              <span className="relative mx-1 inline-block italic">
                一次自然的对话
                <ScribbleUnderline className="absolute -bottom-2 left-0 h-3.5 w-full" />
              </span>
              。
            </h2>
            <p className="mt-7 max-w-[44ch] text-[14px] leading-[1.9] text-[#18181B]/65">
              大棚已经准备好开口说话了。
              登录莓界，或者先看看哪一种订阅方案适合你的季节。
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 text-[16px] text-[#18181B] transition-colors duration-300 hover:text-[#A63A3D]"
                style={{ fontFamily: SERIF }}
              >
                <span className="relative">
                  进入平台
                  <ScribbleUnderline className="absolute -bottom-2 left-0 h-3 w-full opacity-70 group-hover:opacity-100" />
                </span>
                <ArrowDoodle className="h-7 w-9 -rotate-12 transition-transform duration-300 group-hover:translate-x-1" stroke="#A63A3D" />
              </Link>
              <Link
                href="/plans"
                className="text-[14px] text-[#18181B]/55 underline decoration-[#18181B]/25 decoration-1 underline-offset-4 transition-colors duration-300 hover:text-[#18181B]"
                style={{ fontFamily: SERIF }}
              >
                看看订阅方案
              </Link>
            </div>
          </motion.div>

          {/* 收获照片 */}
          <motion.figure
            initial={{ opacity: 0, y: 44, rotate: 5 }}
            whileInView={{ opacity: 1, y: 0, rotate: 2 }}
            viewport={{ once: true, margin: "-12%" }}
            transition={{ duration: 1.2, ease: EASE, delay: 0.15 }}
            className="relative mx-auto w-[72%] max-w-[400px] bg-white p-3 pb-11 shadow-[0_20px_50px_-20px_rgba(43,49,34,0.4)]"
          >
            <TapeStrip className="-top-3 left-10 -rotate-6" />
            <TapeStrip className="-bottom-2 right-8 rotate-12" />
            <div className="relative aspect-[3/4] overflow-hidden">
              <Image
                src="/landing-v2/harvest-hands.webp"
                alt="农人双手捧着刚摘下的草莓"
                fill
                sizes="(min-width: 768px) 30vw, 70vw"
                className="object-cover"
              />
            </div>
            <figcaption
              className="absolute bottom-3 left-4 text-[13px] text-[#18181B]/60"
              style={{ fontFamily: KAI }}
            >
              收获那天，手是脏的，心是满的
            </figcaption>
          </motion.figure>
        </div>

        {/* 页脚 */}
        <div className="relative mt-28 pt-10">
          <StrawberrySprig className="pointer-events-none absolute -top-6 right-[10%] w-16 opacity-20" />
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-[#18181B]/15"
          />
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-baseline gap-2.5">
              <span
                className="text-lg tracking-tight text-[#18181B]"
                style={{ fontFamily: SERIF }}
              >
                莓界
              </span>
              <span
                className="text-[12px] text-[#18181B]/40"
                style={{ fontFamily: KAI }}
              >
                stravision.site
              </span>
            </div>

            <nav className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2">
              {FOOTER_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-[13px] text-[#18181B]/50 transition-colors duration-300 hover:text-[#A63A3D]"
                  style={{ fontFamily: SERIF }}
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            <p
              className="text-[12px] text-[#18181B]/35"
              style={{ fontFamily: KAI }}
            >
              © 2026 莓界 · 慢慢种，好好收
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
