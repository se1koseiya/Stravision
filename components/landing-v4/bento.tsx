"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import type { ComponentType } from "react";
import { Qwen, DeepSeek, Moonshot, Zhipu, Doubao, Spark } from "@lobehub/icons";
import { L, L_MIX, SECTION_TITLE, SHADOW, fadeUp } from "./shared";
import { IconShield, type IconProps } from "@/components/icon";

/* 3D 工牌（three + rapier + meshline）只在这张卡滚进视口时才下载 */
const LanyardScene = dynamic(() => import("./lanyard"), { ssr: false });

/* ------------------------------------------------------------
   第二部分 · 卖点 bento
   配色/排版直接对齐 loomy.xunfei.cn 的真实设计令牌
   （线上 CSS 的 oklch 变量 → hex 精确换算，不是凭感觉调的）：

     toneCyan  = --landing-cyan   oklch(.973 .028 206.8) → #E2FCFF
     toneBlue  = --landing-blue   oklch(.947 .036 245.3) → #DAF1FF
     toneMint  = --remote-work-card-background           → #CFF8E4
     模型卡    = radial(brand-primary 18% @76% 46%) + linear-gradient(122deg, mint, mix(cyan 62%, surface))
     卡片圆角 1.25rem / 网格 2 等分列 + gap 1.5rem / 右卡跨 2 行 / 模型卡通栏
   ------------------------------------------------------------ */

const CARD = "relative overflow-hidden rounded-[20px]";
const CARD_TITLE = "font-bold leading-[1.35] tracking-tight text-[clamp(1.5rem,1.98vw,2rem)]";
const CARD_DESC = "mt-2 text-[17px] leading-[1.6]";

const CONTAINER =
  "mx-auto w-[min(100%-2rem,80rem)] md:w-[min(100%-5rem,80rem)] xl:w-[min(100%-10rem,80rem)]";

/** 三块工牌的卡面：public/web/ 下的角色立绘 */
const PERSONA_FACES = [
  { front: "/web/gongchengshi.png", alt: "农业工程师" },
  { front: "/web/guide.png", alt: "新手向导" },
  { front: "/web/zhongzhizhuanjia.png", alt: "种植专家" },
];

/** 产品动态模型选择器里实际支持的 provider（真实品牌图标） */
const MODELS: { name: string; Icon: ComponentType<IconProps> | any }[] = [
  { name: "通义千问", Icon: (Qwen as any).Color ?? Qwen },
  { name: "DeepSeek", Icon: (DeepSeek as any).Color ?? DeepSeek },
  { name: "Kimi", Icon: (Moonshot as any).Color ?? Moonshot },
  { name: "智谱 GLM", Icon: (Zhipu as any).Color ?? Zhipu },
  { name: "豆包", Icon: (Doubao as any).Color ?? Doubao },
  { name: "讯飞星火", Icon: (Spark as any).Color ?? Spark },
];

/** 美术资源：public/web/{chuanganqi,switch,camera,gateway}.png */
const PROTOCOLS: { img: string; label: string }[] = [
  { img: "/web/chuanganqi.png", label: "MQTT" },
  { img: "/web/switch.png", label: "Modbus RTU" },
  { img: "/web/camera.png", label: "RTSP 摄像头" },
  { img: "/web/gateway.png", label: "HTTP 开放接口" },
];

const STEPS = ["大棚设备", "你的服务器", "莓小智"];

export function Bento() {
  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      {/* 环境光：Loomy 的 backgroundGlow（#53FF98 大半径模糊，落在右下角） */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(46% 40% at 88% 106%, rgba(83,255,152,0.55) 0%, rgba(83,255,152,0.18) 42%, rgba(83,255,152,0) 74%)",
        }}
      />
      {/* 底部渐隐：环境光平滑落回页面底色，不在分区衔接处形成硬切线（对齐 Loomy） */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
        style={{
          background: "linear-gradient(180deg, transparent 0%, var(--lg-surface) 82%)",
        }}
      />

      <div className={`relative ${CONTAINER}`}>
        <motion.h2 {...fadeUp()} className="max-w-[16em]" style={SECTION_TITLE}>
          和莓界一起，
          <br />
          让种大棚更简单
        </motion.h2>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* ① 数据不出门（toneCyan） */}
          <motion.article
            {...fadeUp(0.04)}
            className={`${CARD} flex flex-col gap-5 p-[22px] lg:h-[212px] lg:flex-row lg:items-center lg:gap-6`}
            style={{ background: L.cyan, color: L.ink }}
          >
            <div className="min-w-0 flex-1">
              <h3 className={CARD_TITLE}>数据不出门，我才敢把活交给 AI</h3>
              <p className={CARD_DESC} style={{ color: L.muted }}>
                大棚数据、历史记录、知识库文件都存在你自己的服务器上。不外传、不上云。
              </p>
            </div>

            <div
              className="w-full shrink-0 rounded-[14px] bg-white p-3.5 lg:w-[212px] dark:bg-[#141714]"
              style={{ border: `1px solid ${L.hairline}`, boxShadow: SHADOW.soft }}
            >
              {STEPS.map((n, i) => (
                <div key={n} className="flex items-center gap-2 py-[5px]">
                  <span
                    className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                    style={{
                      background: i === 1 ? L.brandPrimary : "color-mix(in srgb, var(--lg-ink) 6%, transparent)",
                      color: i === 1 ? "#0B3B26" : L.muted,
                    }}
                  >
                    {i === 1 ? <IconShield className="size-3" /> : i + 1}
                  </span>
                  <span
                    className="text-[12.5px] font-medium"
                    style={{ color: i === 1 ? L.ink : L.muted }}
                  >
                    {n}
                  </span>
                </div>
              ))}
              <p className="mt-1.5 text-[11px] leading-snug" style={{ color: L.muted }}>
                数据 100% 留在你的服务器
              </p>
            </div>
          </motion.article>

          {/* ② 硬件都能接（toneBlue） */}
          <motion.article
            {...fadeUp(0.1)}
            className={`${CARD} flex flex-col gap-5 p-[22px] lg:row-start-2 lg:h-[212px] lg:flex-row lg:items-center lg:gap-5`}
            style={{ background: L.blue, color: L.ink }}
          >
            <div className="min-w-0 flex-1">
              <h3 className={CARD_TITLE}>现成的硬件，接上就能用</h3>
              <p className={CARD_DESC} style={{ color: L.muted }}>
                按标准协议接进来，莓小智自己读数据、下指令。
              </p>
            </div>

            <div className="grid w-full shrink-0 grid-cols-4 gap-2.5 lg:w-[248px]">
              {PROTOCOLS.map((p) => (
                <div key={p.label} className="flex min-w-0 flex-col items-center gap-1.5">
                  <div className="flex h-[64px] w-full items-center justify-center">
                    <Image
                      src={p.img}
                      alt={p.label}
                      width={200}
                      height={200}
                      sizes="80px"
                      className="h-[62px] w-auto object-contain drop-shadow-[0_6px_12px_rgba(34,34,34,0.14)]"
                    />
                  </div>
                  <span
                    className="w-full truncate text-center text-[10.5px] font-semibold"
                    style={{ color: L.ink }}
                  >
                    {p.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.article>

          {/* ③ 搭子和搭子团（toneMint，右侧跨 2 行）——底部是三块可拖拽的 3D 工牌 */}
          <motion.article
            {...fadeUp(0.16)}
            className={`${CARD} flex flex-col p-[22px] lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:h-[448px]`}
            style={{ background: "var(--lg-mint-strong)", color: L.ink }}
          >
            <div className="lg:max-w-[76%]">
              <h3 className={CARD_TITLE}>专业需求，交给搭子和搭子团</h3>
              <p className={CARD_DESC} style={{ color: L.muted }}>
                种什么、怎么调、划不划算，交给不同的角色来答；复杂的事让搭子团分工协作。
              </p>
            </div>

            {/* 三块工牌：堆叠靠右，真实物理垂坠，可以拿鼠标拎起来甩 */}
            <div className="relative mt-3 h-[300px] w-full lg:h-auto lg:min-h-[240px] lg:flex-1">
              <LanyardScene faces={PERSONA_FACES} layout="stack" align="right" />
              <p
                className="pointer-events-none absolute bottom-1 left-0 text-[11px] font-medium tracking-wide"
                style={{ color: L.muted }}
              >
                拖一下，工牌会晃
              </p>
            </div>
          </motion.article>

          {/* ④ 多种主流模型（通栏 · Loomy multiModelCard 同款渐变） */}
          <motion.article
            {...fadeUp(0.22)}
            className={`${CARD} flex flex-col gap-6 p-[22px] lg:col-span-2 lg:min-h-[236px] lg:flex-row lg:items-center lg:gap-10`}
            style={{
              color: L.ink,
              background: `radial-gradient(circle at 76% 46%, rgba(114,227,173,0.18), transparent 34%), linear-gradient(122deg, ${L.mint}, ${L_MIX.voices})`,
            }}
          >
            <div className="lg:w-[38%] lg:shrink-0">
              <h3 className={CARD_TITLE}>多种主流模型，按需灵活选择</h3>
              <p className={CARD_DESC} style={{ color: L.muted }}>
                按任务自动切换更合适的模型，也能接入你自己的 OpenAI 兼容接口。
              </p>
            </div>

            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
              {MODELS.map((m) => (
                <div
                  key={m.name}
                  className="flex items-center gap-2.5 rounded-[14px] px-3 py-2.5"
                  style={{
                    background: "var(--lg-chip-strong)",
                    border: `1px solid ${L.hairline}`,
                    boxShadow: SHADOW.soft,
                  }}
                >
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full"
                    style={{ background: L.surface, boxShadow: `inset 0 0 0 1px ${L.hairline}` }}
                  >
                    <m.Icon size={17} />
                  </span>
                  <span className="truncate text-[13px] font-semibold" style={{ color: L.ink }}>
                    {m.name}
                  </span>
                </div>
              ))}
            </div>
          </motion.article>
        </div>
      </div>
    </section>
  );
}
