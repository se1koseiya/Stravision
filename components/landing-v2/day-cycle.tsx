"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { TapeStrip, LeafDoodle } from "./doodles";

/* ============================================================
   DAY —— 大棚一日 · 拼贴手账
   · 四个时刻，错落排布（非对称网格）
   · 照片以「贴纸」形式穿插，手写时间标注
   ============================================================ */

const EASE = [0.16, 1, 0.3, 1] as const;
const SERIF = 'Georgia, "Songti SC", "STSong", "SimSun", serif';
const KAI = '"Kaiti SC", "STKaiti", "KaiTi", "楷体", serif';

const MOMENTS = [
  {
    time: "05:30",
    title: "晨检简报",
    desc: "夜间的温湿度曲线、设备动作和异常摘要，自动汇成一页简报。醒来第一眼，就知道大棚昨夜睡得好不好。",
    image: "/landing-v2/corridor-light.webp",
    imageAlt: "清晨光柱斜射进大棚",
    caption: "05:47，第一缕光",
    rotate: -1.5,
  },
  {
    time: "09:00",
    title: "AI 巡棚",
    desc: "巡检摄像头沿垄慢慢扫过去，AI 比对叶片的纹理与色泽。可疑病斑被标记、截图、附上处理建议，等你确认。",
  },
  {
    time: "14:00",
    title: "午后自动调控",
    desc: "温度越过阈值，自动化规则触发：风机启动、遮阳展开。每一次动作都写进日志，事后随时翻得出来。",
  },
  {
    time: "21:00",
    title: "静夜守夜",
    desc: "传感器网络整夜不眠。温度逼近霜冻线时，告警会比霜害更早一步抵达你的手机。",
    image: "/landing-v2/night-sensor.webp",
    imageAlt: "夜里大棚中亮着灯的传感器",
    caption: "它值班，你睡觉",
    rotate: 2,
  },
];

function PhotoCard({
  src,
  alt,
  caption,
  rotate,
}: {
  src: string;
  alt: string;
  caption: string;
  rotate: number;
}) {
  return (
    <motion.figure
      initial={{ opacity: 0, y: 40, rotate: rotate * 2.5 }}
      whileInView={{ opacity: 1, y: 0, rotate }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 1.1, ease: EASE, delay: 0.15 }}
      className="relative w-[88%] bg-white p-2.5 pb-9 shadow-[0_16px_42px_-16px_rgba(43,49,34,0.35)] md:w-full"
      style={{ marginInline: "auto" }}
    >
      <TapeStrip className="-top-3 left-1/2 -translate-x-1/2 rotate-2" />
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 768px) 38vw, 84vw"
          className="object-cover"
        />
      </div>
      <figcaption
        className="absolute bottom-2 left-3.5 text-[13px] text-[#2B3122]/60"
        style={{ fontFamily: KAI }}
      >
        {caption}
      </figcaption>
    </motion.figure>
  );
}

export function DayCycle() {
  return (
    <section id="day" className="relative bg-[#EDE6D2] py-28 md:py-36">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="mb-20 text-center">
          <p
            className="mb-5 text-[14px] text-[#2B3122]/50"
            style={{ fontFamily: KAI }}
          >
            <span className="text-[#A63A3D]">大棚一日</span>
            <span className="mx-2">·</span>
            <span>从晨检到守夜</span>
          </p>
          <h2
            className="mx-auto max-w-[24ch] text-[clamp(1.8rem,3.4vw,2.7rem)] leading-[1.4] tracking-tight text-[#2B3122]"
            style={{ fontFamily: SERIF }}
          >
            系统替你醒着的
            <span className="italic text-[#A63A3D]">每一分钟</span>，
            都有迹可循。
          </h2>
        </div>

        <div className="space-y-20 md:space-y-28">
          {MOMENTS.map((m, i) => {
            const left = i % 2 === 0;
            return (
              <div
                key={m.time}
                className="grid items-center gap-10 md:grid-cols-2 md:gap-20"
              >
                <motion.div
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-12%" }}
                  transition={{ duration: 0.9, ease: EASE }}
                  className={
                    left
                      ? "md:order-1 md:pl-[8%]"
                      : "md:order-2 md:pr-[8%] md:text-right"
                  }
                >
                  <p
                    className="text-[clamp(2.2rem,4vw,3.4rem)] leading-none text-[#A63A3D]/85"
                    style={{ fontFamily: KAI }}
                  >
                    {m.time}
                  </p>
                  <h3
                    className="mt-4 text-[1.55rem] tracking-tight text-[#2B3122]"
                    style={{ fontFamily: SERIF }}
                  >
                    {m.title}
                  </h3>
                  <p
                    className={`mt-4 max-w-[44ch] text-[14.5px] leading-[1.9] text-[#2B3122]/60 ${
                      left ? "" : "md:ml-auto"
                    }`}
                  >
                    {m.desc}
                  </p>
                </motion.div>

                <div className={left ? "md:order-2" : "md:order-1"}>
                  {m.image ? (
                    <PhotoCard
                      src={m.image}
                      alt={m.imageAlt ?? ""}
                      caption={m.caption ?? ""}
                      rotate={m.rotate ?? 1}
                    />
                  ) : (
                    <div className="hidden items-center justify-center md:flex">
                      <LeafDoodle
                        className={`w-16 opacity-25 ${left ? "-rotate-12" : "rotate-12"}`}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
