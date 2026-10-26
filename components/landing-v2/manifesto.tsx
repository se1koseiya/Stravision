"use client";

import { useRef } from "react";
import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ScribbleUnderline, TapeStrip, LeafDoodle } from "./doodles";

/* ============================================================
   NOTES —— 栽培笔记 · 编辑式宣言
   · 逐行滚动揭示的衬线宣言
   · 页边手写批注 + 静物照片（贴胶带）
   ============================================================ */

const SERIF = 'Georgia, "Songti SC", "STSong", "SimSun", serif';
const KAI = '"Kaiti SC", "STKaiti", "KaiTi", "楷体", serif';

const LINES: { text: string; note?: string }[] = [
  { text: "莓界不只是工具。" },
  { text: "它记得每一次浇水与通风，" },
  { text: "看得懂凌晨四点的温度曲线，", note: "这句是真的。" },
  { text: "也解释得清每一次决策的理由。" },
  { text: "把复杂的农事判断，" },
  { text: "变成一次自然的对话。" },
];

function Line({
  progress,
  range,
  children,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  children: React.ReactNode;
}) {
  const clip = useTransform(
    progress,
    range,
    ["inset(100% 0% 0% 0%)", "inset(0% 0% 0% 0%)"]
  );
  const opacity = useTransform(progress, range, [0.1, 1]);
  const y = useTransform(progress, range, [36, 0]);

  return (
    <span className="block overflow-hidden pb-[0.1em]">
      <motion.span
        style={{ clipPath: clip, WebkitClipPath: clip, opacity, y }}
        className="block"
      >
        {children}
      </motion.span>
    </span>
  );
}

export function Manifesto() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.8", "end 0.55"],
  });

  const step = 1 / LINES.length;

  return (
    <section
      id="notes"
      ref={ref}
      className="relative bg-[#EDE6D2] py-28 md:py-36"
    >
      <LeafDoodle className="pointer-events-none absolute right-[8%] top-16 w-8 rotate-12 opacity-20" />

      <div className="mx-auto grid max-w-[1400px] gap-16 px-6 md:grid-cols-[1.15fr_0.85fr] md:gap-12 md:px-10">
        <div>
          <p
            className="mb-12 flex items-baseline gap-3 text-[14px] text-[#18181B]/50"
            style={{ fontFamily: KAI }}
          >
            <span className="text-[#A63A3D]">栽培笔记</span>
            <span>·</span>
            <span>关于这座系统，先说几句实话</span>
          </p>

          <h2
            className="text-[clamp(1.8rem,3.8vw,3.1rem)] leading-[1.5] tracking-tight text-[#18181B]"
            style={{ fontFamily: SERIF }}
          >
            {LINES.map((line, i) => (
              <Line
                key={i}
                progress={scrollYProgress}
                range={[i * step, (i + 0.85) * step]}
              >
                <span className="relative inline">
                  {line.text}
                  {line.note && (
                    <span
                      className="absolute -right-2 top-0 hidden translate-x-full whitespace-nowrap text-[14px] font-normal text-[#A63A3D]/80 lg:inline"
                      style={{ fontFamily: KAI }}
                    >
                      {line.note}
                    </span>
                  )}
                </span>
              </Line>
            ))}
          </h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 1.2, delay: 0.2 }}
            className="relative mt-14 max-w-[48ch] pl-6 text-[14px] leading-[1.9] text-[#18181B]/60"
          >
            <span
              aria-hidden
              className="absolute left-0 top-1 h-[calc(100%-0.5rem)] w-[3px] -rotate-1 rounded-full bg-[#A63A3D]/40"
            />
            农业的难点从来不是缺数据，而是缺把数据变成判断的时间。
            莓界替你守着曲线、看着画面、记着每一次操作。
          </motion.p>
        </div>

        {/* 静物照片 · 贴胶带 */}
        <div className="relative hidden items-center md:flex">
          <motion.figure
            initial={{ opacity: 0, y: 48, rotate: 4 }}
            whileInView={{ opacity: 1, y: 0, rotate: 1.5 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto w-[78%] bg-white p-3 pb-11 shadow-[0_20px_50px_-20px_rgba(43,49,34,0.4)]"
          >
            <TapeStrip className="-top-3 left-8 -rotate-6" />
            <div className="relative aspect-[3/4] overflow-hidden">
              <Image
                src="/landing-v2/macro-berry.webp"
                alt="静物：带露珠的草莓"
                fill
                sizes="(min-width: 768px) 30vw, 80vw"
                className="object-cover"
              />
            </div>
            <figcaption
              className="absolute bottom-3 left-4 text-[13px] text-[#18181B]/60"
              style={{ fontFamily: KAI }}
            >
              静物，晨露未干
            </figcaption>
          </motion.figure>

          <ScribbleUnderline className="absolute bottom-4 right-6 w-32 -rotate-6 opacity-40" stroke="#18181B" />
        </div>
      </div>
    </section>
  );
}
