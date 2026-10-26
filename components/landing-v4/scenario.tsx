"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { CONTAINER, EYEBROW, L, L_MIX, PANEL_TITLE, SECTION_TITLE, SHADOW } from "./shared";
import { DemoChatSkeleton } from "./skeletons";
import { IconArrowRight, IconBookmark, IconChartLine, IconHistory, IconLayers, IconNotebook, IconRadio, IconRefresh, IconSearch, IconShield } from "@/components/icon";

/* ------------------------------------------------------------
   场景区 —— 对齐 Loomy `BusinessNeedsSection`
   ─────────────────────────────────────────────────────────────
   结构（全部按 loomy.xunfei.cn 浅色模式实测值还原）：
     标题(max-w 29rem) + 手写感胶囊「点击卡片切换预览」(rotate 2deg)
     → 一行场景卡切换器（激活 flex-2 / 收起 flex-1，gap 16，r 24）
     → 详情面板（grid 442/692、gap 48、p 48/48/0、r 28、#ECFDF2）
         · 左：eyebrow + h3 + 3 步流程列表（44px 圆底图标 + 分隔线）
         · 右：预览台（#FAFFFB + 径向光斑）+ 真实产品组件窗口（白底 + #DAF5E4 光环）
   右侧用的是产品里真实在跑的卡片组件，不是手搓 mock。
   ------------------------------------------------------------ */

const DeepResearchDemo = dynamic(
  () => import("@/components/landing-v4/deep-research-demo").then((m) => m.DeepResearchDemo),
  { ssr: false, loading: () => <DemoChatSkeleton /> }
);

const MemoryDemo = dynamic(
  () => import("@/components/landing-v4/memory-demo").then((m) => m.MemoryDemo),
  { ssr: false, loading: () => <DemoChatSkeleton /> }
);

const DeviceDemo = dynamic(
  () => import("@/components/landing-v4/device-demo").then((m) => m.DeviceDemo),
  { ssr: false, loading: () => <DemoChatSkeleton /> }
);

export type Step = { icon: typeof IconSearch; label: string; note: string };

export type Scene = {
  key: string;
  tab: string;
  desc: string;
  tags: string[];
  img: string;
  title: React.ReactNode;
  steps: Step[];
  preview: React.ReactNode;
  /** 预览区内容容器的额外类 */
  previewClass?: string;
  /**
   * 预览窗口（白底那一层）的高度类。
   * 默认 `h-[24rem] md:h-[30.8rem]`；要装下「整条页面侧栏」这类高个子内容时，
   * 由场景自己传一个更高的值（如产品更新页的 Copilot 场景）。
   */
  previewWindowClass?: string;
};

const SCENES: Scene[] = [
  {
    key: "research",
    tab: "深度研究",
    desc: "一次提问，多轮检索 + 交叉验证，最后沉淀成带引用的知识条目。",
    tags: ["#多轮检索", "#带引用入库"],
    img: "/web/guide.png",
    title: (
      <>
        一句话问下去，
        <br />
        它自己查完写清楚
      </>
    ),
    steps: [
      { icon: IconSearch, label: "拆解子查询", note: "把一个含糊的问题拆成几个能检索的方向" },
      { icon: IconLayers, label: "多轮检索补缺", note: "先并行检索，再做缺口分析补搜，直到没有盲区" },
      { icon: IconBookmark, label: "沉淀成知识条目", note: "融合成带引用的条目写进知识库，下次直接召回" },
    ],
    preview: <DeepResearchDemo />,
    previewClass: "w-full",
  },
  {
    key: "memory",
    tab: "记忆功能",
    desc: "棚号、品种、习惯说一次就落成档案，新对话照样认得你。",
    tags: ["#说一次就记住", "#跨会话认得你"],
    img: "/web/zhongzhizhuanjia.png",
    title: (
      <>
        你随口说的，
        <br />
        它都替你记着
      </>
    ),
    steps: [
      { icon: IconNotebook, label: "提一句就记住", note: "棚号、品种、习惯，说一次就写进你的记忆档案" },
      { icon: IconRefresh, label: "说错了能改", note: "同一项直接覆盖旧值，不会留下两套说法" },
      { icon: IconHistory, label: "换台设备也认得", note: "新开对话、别的终端打开，照样知道你是谁" },
    ],
    preview: <MemoryDemo />,
    previewClass: "w-full",
  },
  {
    key: "device",
    tab: "设备调控",
    desc: "说清要干什么，AI 找准设备、下发指令、拿到回执才算数。",
    tags: ["#指令带回执", "#动作可追溯"],
    img: "/web/switch.png",
    title: (
      <>
        一句话，
        <br />
        设备自己动起来
      </>
    ),
    steps: [
      { icon: IconChartLine, label: "先看清现场", note: "温湿度、CO₂ 实时读一遍，再决定动不动设备" },
      { icon: IconRadio, label: "认准是哪台设备", note: "一堆继电器通道里精确定位，不误伤别的棚" },
      { icon: IconShield, label: "拿到回执才算数", note: "指令下发后等设备确认状态，动作全程留痕" },
    ],
    preview: <DeviceDemo />,
    previewClass: "w-full",
  },
];

/** 面板左侧的 3 步流程列表（对齐 Loomy workflowList） */
function WorkflowList({ steps, activeIndex }: { steps: Step[]; activeIndex: number }) {
  return (
    <ol className="mt-13 flex flex-col">
      {steps.map((s, i) => {
        const on = i === activeIndex;
        const last = i === steps.length - 1;
        return (
          <li
            key={s.label}
            className="relative -mx-3 grid items-center gap-4 rounded-2xl px-3 py-3.5 transition-colors duration-500"
            style={{
              gridTemplateColumns: "44px minmax(0,1fr) 24px",
              background: on ? "var(--lg-ghost-soft)" : "transparent",
            }}
          >
            <span
              className="flex size-11 items-center justify-center rounded-full border transition-colors duration-500"
              style={{
                background: on ? L_MIX.workflowIcon : "var(--lg-ghost)",
                borderColor: on ? L.iconBorder : L.line,
                color: on ? L.accentStrong : L.muted,
              }}
            >
              <s.icon className="size-[1.15rem]" />
            </span>
            <span className="flex flex-col gap-1">
              <span
                className="text-[0.95rem] font-semibold transition-colors duration-500"
                style={{ color: on ? L.ink : L.desc }}
              >
                {s.label}
              </span>
              <span className="text-[0.8125rem] leading-[1.6]" style={{ color: L.muted }}>
                {s.note}
              </span>
            </span>
            <IconArrowRight
              className="size-[1.375rem] transition-transform duration-500"
              style={{ color: L.accentStrong, transform: on ? "none" : "translate(-5.6px, 5.6px)" }}
            />
            {!last && (
              <span
                aria-hidden
                className="absolute bottom-0 left-3 right-3 h-px"
                style={{ background: L.line }}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function SceneCard({ s, active, onClick }: { s: Scene; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-selected={active}
      className={`group relative flex rounded-2xl text-left transition-all duration-500 ${
        active
          ? "flex-1 flex-row items-start gap-[1.1rem] p-3.5 lg:flex-[2] lg:min-h-[10.5rem] lg:px-5 lg:py-3.5"
          : "flex-col items-center justify-center gap-3 p-3.5 lg:flex-1 lg:min-h-[10.5rem] lg:px-5 lg:py-3.5"
      }`}
      style={{ background: active ? L.accent : L_MIX.idle }}
    >
      <span
        className={`relative block shrink-0 transition-all duration-500 ${
          active ? "size-[4.7rem] lg:size-[7.06rem]" : "size-[4.2rem] lg:size-[5.125rem]"
        }`}
        style={{ transform: "scale(1.04)" }}
      >
        <Image src={s.img} alt="" fill sizes="120px" className="object-contain" />
      </span>

      {active ? (
        /* 激活卡 = 亮绿底，两种主题下文字都用深墨，避免深色下白字压绿底看不清 */
        <span className="flex min-w-0 flex-col">
          <span className="flex items-center gap-2">
            <span className="text-[1.5rem] font-bold leading-[1.3]" style={{ color: "#12291D" }}>
              {s.tab}
            </span>
            <IconArrowRight className="size-[1.15rem]" style={{ color: "#0B8A52" }} />
          </span>
          <span className="mt-2 text-[0.875rem] leading-[1.5]" style={{ color: "#3D5C4B" }}>
            {s.desc}
          </span>
          <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {s.tags.map((t) => (
              <span key={t} className="text-[0.8125rem] font-bold leading-[1.5]" style={{ color: "#0F7A45" }}>
                {t}
              </span>
            ))}
          </span>
        </span>
      ) : (
        <span className="text-center text-[1.25rem] font-bold leading-[1.3]" style={{ color: L.ink }}>
          {s.tab}
        </span>
      )}
    </button>
  );
}

/**
 * 场景区可被别的页复用来演别的场景（2026-09-29 新增，全部可选）：
 * 不传 = 落地页原样（深度研究 / 记忆 / 设备调控）；产品更新页传自己的三个场景。
 */
export interface ScenariosProps {
  /** 场景列表（默认落地页那三个） */
  scenes?: Scene[];
  /** 区块大标题（默认「为多种种植场景而设计」） */
  heading?: React.ReactNode;
  /** 标题旁的手写感胶囊文案 */
  hint?: string;
}

export function Scenarios({ scenes = SCENES, heading, hint }: ScenariosProps = {}) {
  const [active, setActive] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const scene = scenes[active] ?? scenes[0];

  // 传入的 scenes 变短时把选中项拉回范围内
  useEffect(() => {
    if (active >= scenes.length) setActive(0);
  }, [active, scenes.length]);

  // 流程列表的高亮项依次推进，让「管线在跑」这件事可见
  useEffect(() => {
    setStepIndex(0);
    const timer = setInterval(() => setStepIndex((i) => (i + 1) % 3), 1900);
    return () => clearInterval(timer);
  }, [active]);

  if (!scene) return null;

  return (
    <section className="pb-36 pt-24" style={{ background: L.surface }}>
      <div className={CONTAINER}>
        {/* 标题 + 手写感胶囊 */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-10">
          <h2 className="max-w-[29rem]" style={SECTION_TITLE}>
            {heading ?? (
              <>
                为多种种植场景
                <br />
                而设计
              </>
            )}
          </h2>
          <p
            className="w-fit shrink-0 whitespace-nowrap rounded-full px-[1.15rem] py-3 text-[0.9375rem] font-bold leading-[1.4] lg:mt-[1.1rem]"
            style={{ background: L.accent, color: "#12291D", transform: "rotate(2deg)" }}
          >
            {hint ?? "点击卡片切换预览"}
          </p>
        </div>

        {/* 场景卡切换器 */}
        <div className="mt-12 flex flex-col gap-4 lg:flex-row">
          {scenes.map((s, i) => (
            <SceneCard key={s.key} s={s} active={i === active} onClick={() => setActive(i)} />
          ))}
        </div>

        {/* 详情面板 */}
        <div className="mt-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={scene.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="grid gap-8 overflow-hidden rounded-[1.75rem] border p-6 md:p-12 md:pb-0 lg:grid-cols-[minmax(0,442fr)_minmax(0,692fr)] lg:gap-12"
              style={{ background: L_MIX.panel, borderColor: L.panelBorder }}
            >
              {/* 左：说明 + 流程 */}
              <div className="flex flex-col pb-6 md:pb-12">
                <p style={EYEBROW}>适用于&nbsp;&nbsp;{scene.tab}</p>
                <h3 className="mt-5 max-w-[30rem]" style={PANEL_TITLE}>
                  {scene.title}
                </h3>
                <WorkflowList steps={scene.steps} activeIndex={stepIndex} />
              </div>

              {/* 右：真实产品组件预览台 */}
              <div
                className="relative flex items-end rounded-t-3xl border border-b-0 p-3.5 pt-8 md:p-8 md:pb-0"
                style={{
                  background: `${L_MIX.preview}`,
                  backgroundImage: "radial-gradient(circle at 78% 16%, rgba(125,233,172,0.18), transparent 42%)",
                  borderColor: "var(--lg-window-border)",
                }}
              >
                <div
                  className={`w-full overflow-hidden rounded-t-[1.15rem] border border-b-0 bg-white dark:bg-[#121713] ${
                    scene.previewWindowClass ?? "h-[24rem] md:h-[30.8rem]"
                  }`}
                  style={{ borderColor: "var(--lg-window-border)", boxShadow: SHADOW.halo }}
                >
                  <div data-chat-scroll className="h-full overflow-y-auto p-5">
                    <div className={scene.previewClass}>{scene.preview}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
