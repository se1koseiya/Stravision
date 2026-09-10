"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  StrawberrySprig,
  ScribbleUnderline,
  CircleMark,
  ArrowDoodle,
  TapeStrip,
} from "./doodles";

/* ============================================================
   HERO —— 纸质拼贴 · 人工自然主义
   · 暖纸底 + 左侧衬线大标题（手绘圈注）
   · 右侧照片拼贴：白框照片 + 胶带 + 手写图注
   ============================================================ */

const EASE = [0.16, 1, 0.3, 1] as const;
const SERIF = 'Georgia, "Songti SC", "STSong", "SimSun", serif';
const KAI = '"Kaiti SC", "STKaiti", "KaiTi", "楷体", serif';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#F4EFE3]">
      {/* 手绘草莓背景点缀 */}
      <StrawberrySprig className="pointer-events-none absolute -left-6 bottom-16 w-28 opacity-[0.14] md:left-10 md:w-36" />

      <div className="mx-auto grid min-h-[100dvh] max-w-[1400px] items-center gap-14 px-6 pb-24 pt-32 md:grid-cols-[1.05fr_0.95fr] md:gap-6 md:px-10 md:pt-36">
        {/* 左：文字 */}
        <div className="relative z-10">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
            className="mb-7 text-[15px] text-[#A63A3D]"
            style={{ fontFamily: KAI }}
          >
            —— 给种草莓的人，和替他们醒着的系统
          </motion.p>

          <h1
            className="text-[clamp(2.5rem,5.6vw,4.6rem)] leading-[1.22] tracking-tight text-[#2B3122]"
            style={{ fontFamily: SERIF }}
          >
            <span className="block overflow-hidden">
              <motion.span
                initial={{ y: "108%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 1.1, ease: EASE, delay: 0.3 }}
                className="block"
              >
                种草莓这件事，
              </motion.span>
            </span>
            <span className="block overflow-hidden pb-2">
              <motion.span
                initial={{ y: "108%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 1.1, ease: EASE, delay: 0.45 }}
                className="block"
              >
                值得被
                <span className="relative mx-1 inline-block px-1">
                  <span className="relative z-10 italic">认真</span>
                  <CircleMark className="absolute -inset-x-3 -inset-y-2 z-0 h-[calc(100%+1rem)] w-[calc(100%+1.5rem)]" />
                </span>
                对待。
              </motion.span>
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 0.7 }}
            className="mt-7 max-w-[46ch] text-[15.5px] leading-[1.9] text-[#2B3122]/70"
          >
            莓界把大棚里的温度、湿度、光照和影像，
            交给一个会对话的 AI 农事伙伴照看。
            它记得每一次浇水，看得懂凌晨四点的温度曲线——
            你只管问一句：<span style={{ fontFamily: KAI }}>「今天大棚怎么样？」</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 0.85 }}
            className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4"
          >
            <Link
              href="/login"
              className="group relative inline-flex items-center gap-2 text-[16px] text-[#2B3122] transition-colors duration-300 hover:text-[#A63A3D]"
              style={{ fontFamily: SERIF }}
            >
              <span className="relative">
                进入我的大棚
                <ScribbleUnderline className="absolute -bottom-2 left-0 h-3 w-full opacity-70 transition-opacity group-hover:opacity-100" />
              </span>
              <ArrowDoodle className="h-7 w-9 -rotate-12 transition-transform duration-300 group-hover:translate-x-1" stroke="#A63A3D" />
            </Link>
            <a
              href="#work"
              className="text-[14.5px] text-[#2B3122]/55 underline decoration-[#2B3122]/25 decoration-1 underline-offset-4 transition-colors duration-300 hover:text-[#2B3122]"
              style={{ fontFamily: SERIF }}
            >
              先看看它每天做什么
            </a>
          </motion.div>
        </div>

        {/* 右：照片拼贴 */}
        <div className="relative mx-auto h-[420px] w-full max-w-[520px] md:h-[560px]">
          {/* 主照片：晨间苗床 */}
          <motion.figure
            initial={{ opacity: 0, y: 40, rotate: -5 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            transition={{ duration: 1.2, ease: EASE, delay: 0.5 }}
            className="absolute left-0 top-4 w-[78%] bg-white p-3 pb-10 shadow-[0_18px_45px_-18px_rgba(43,49,34,0.35)]"
          >
            <TapeStrip className="-top-3 left-1/2 -translate-x-1/2 -rotate-3" />
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src="/landing-v2/morning-rows.webp"
                alt="晨光里的草莓苗床"
                fill
                priority
                sizes="(min-width: 768px) 36vw, 72vw"
                className="object-cover"
              />
            </div>
            <figcaption
              className="absolute bottom-2.5 left-4 text-[13px] text-[#2B3122]/60"
              style={{ fontFamily: KAI }}
            >
              三月，棚里的早晨
            </figcaption>
          </motion.figure>

          {/* 次照片：草莓花 */}
          <motion.figure
            initial={{ opacity: 0, y: 48, rotate: 6 }}
            animate={{ opacity: 1, y: 0, rotate: 2.5 }}
            transition={{ duration: 1.2, ease: EASE, delay: 0.7 }}
            className="absolute bottom-0 right-0 w-[46%] bg-white p-2.5 pb-9 shadow-[0_16px_40px_-16px_rgba(43,49,34,0.35)]"
          >
            <TapeStrip className="-top-3 right-6 rotate-6" />
            <div className="relative aspect-[3/4] overflow-hidden">
              <Image
                src="/landing-v2/blossom.webp"
                alt="一朵草莓花"
                fill
                sizes="(min-width: 768px) 18vw, 40vw"
                className="object-cover"
              />
            </div>
            <figcaption
              className="absolute bottom-2 left-3.5 text-[12.5px] text-[#2B3122]/60"
              style={{ fontFamily: KAI }}
            >
              第一茬花
            </figcaption>
          </motion.figure>

          {/* 手绘小草莓点缀 */}
          <motion.div
            initial={{ opacity: 0, rotate: 12 }}
            animate={{ opacity: 1, rotate: 6 }}
            transition={{ duration: 1, ease: EASE, delay: 1 }}
            className="absolute -bottom-6 left-2 w-20 md:w-24"
          >
            <StrawberrySprig className="w-full opacity-70" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
