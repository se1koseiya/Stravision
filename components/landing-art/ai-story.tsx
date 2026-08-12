"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import { SpectralCard } from "@/components/ai/spectral-card";
import { ClarifyCard } from "@/components/ai/clarify-card";
import { DecisionCard } from "@/components/ai/decision-card";
import { PlanApprovalCard } from "@/components/ai/plan-approval-card";
import type { DeviceData } from "@/lib/hooks/use-device-data";
import { Eyebrow, ViewfinderCorners } from "./ui-primitives";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const MOCK_SPECTRAL: DeviceData = {
  temperature: 24.5,
  humidity: 62,
  soil_moisture: 0.45,
  co2: 420,
  light: 28400,
  channel1: 420, channel2: 680, channel3: 550, channel4: 810,
  channel5: 920, channel6: 740, channel7: 610, channel8: 880,
  channel9: 470, channel10: 350, channel11: 220,
} as DeviceData;

interface Stage {
  no: string;
  keyword: string;
  eyebrow: string;
  title: string;
  desc: string;
  meta: string;
  card: React.ReactNode;
}

const STAGES: Stage[] = [
  {
    no: "01",
    keyword: "PERCEIVE",
    eyebrow: "多光谱感知",
    title: "AI 的眼睛，\n看见叶片之下的信号。",
    desc: "11 通道光谱传感器穿透可见光，捕捉人眼无法察觉的作物胁迫信号——从叶绿素活性到水分胁迫，每一束光都是一次诊断。",
    meta: "sensor · 11ch · 38ms",
    card: <SpectralCard data={MOCK_SPECTRAL} />,
  },
  {
    no: "02",
    keyword: "CLARIFY",
    eyebrow: "主动澄清",
    title: "在不确定时，\nAI 会先问你。",
    desc: "面对模糊的提问，AI 不会盲目执行——它主动发起结构化提问，用表单与选项澄清意图，让每一次决策都建立在准确信息之上。",
    meta: "dialogue · structured",
    card: (
      <ClarifyCard
        data={{
          title: "需要更多信息",
          context: "请问要分析哪个温室的当前环境？",
          options: [
            { id: "1", label: "1 号温室 · 开花期" },
            { id: "2", label: "2 号温室 · 结果期" },
          ],
        }}
      />
    ),
  },
  {
    no: "03",
    keyword: "DECIDE",
    eyebrow: "可解释决策",
    title: "每一个动作，\n都有据可查。",
    desc: "AI 执行设备控制时附带决策卡——WHY 为什么这么做、WHAT 做了什么、EVIDENCE 基于什么数据，让信任建立在透明之上。",
    meta: "why · what · evidence",
    card: (
      <DecisionCard
        data={{
          why: "湿度偏低 12%，已偏离开花期适宜区间，需及时补湿以防花器脱水。",
          what: "开启 1 号温室雾化器，运行 8 分钟",
          type: "control",
          confidence: 0.85,
          evidence: [
            { metric: "空气湿度", value: "48%", reference: "≥60%", source: "传感器 A" },
            { metric: "土壤湿度", value: "0.32", reference: "≥0.40", source: "传感器 B" },
          ],
        }}
      />
    ),
  },
  {
    no: "04",
    keyword: "PLAN",
    eyebrow: "自主规划",
    title: "把复杂农事，\n拆解为可审批的计划。",
    desc: "面对多设备协同任务，AI 自主拆解步骤、标注工具与参数，生成结构化计划等待你的确认——智能，但不越权。",
    meta: "multi-step · approvable",
    card: (
      <PlanApprovalCard
        data={{
          title: "今日环境调控计划",
          summary: "基于当前环境偏差与开花期需求，拟定三步调控计划。",
          steps: [
            { id: "s1", content: "拉取 1 号温室最近 24h 环境数据", tool: "环境感知" },
            { id: "s2", content: "对比开花期适宜区间，定位偏差指标", tool: "数据分析" },
            { id: "s3", content: "生成补光与通风调控方案", tool: "报告生成" },
          ],
        }}
      />
    ),
  },
];

/* ============================================================
   AICHAPTERS —— 横向滚动电影感推理流程 · 重新设计
   · 高度 (stages+1)*100vh，sticky 钉一屏
   · 内层 film strip 横向位移：垂直滚动 → 水平推进
   · 每个 stage = 一帧：左侧巨字章节号 + 右侧真实 AI 卡（直角取景器）
   · 背景：跨帧巨字关键词，随进度交叉淡入
   · 顶部水平进度条 + 底部帧索引
   ============================================================ */
export function AIChapters() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const total = STAGES.length;
  // film strip 横向位移：0 → -(total-1)/total * 100%
  const x = useTransform(
    scrollYProgress,
    [0, 1],
    ["0%", `-${((total - 1) / total) * 100}%`]
  );
  // 进度条
  const progressScaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section
      ref={ref}
      className="relative bg-[#08080A]"
      style={{ height: `${(total + 1) * 100}vh` }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#08080A]">
        {/* ============ 顶部章节标记 ============ */}
        <div className="absolute top-0 left-0 right-0 z-30 pt-24">
          <div className="max-w-[1600px] mx-auto px-6 lg:px-10 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <span className="font-mono text-[11px] tracking-[0.25em] text-white/40 uppercase">
                02 / 推理
              </span>
              <span className="block w-12 h-px bg-white/10" />
              <span className="font-mono text-[11px] tracking-[0.25em] text-white/40 uppercase">
                The Reasoning
              </span>
            </div>
            {/* 滚动方向提示 */}
            <motion.div
              style={{ opacity: useTransform(scrollYProgress, [0, 0.05, 0.92, 1], [0, 1, 1, 0]) }}
              className="flex items-center gap-2 font-mono text-[11px] tracking-[0.25em] text-white/40 uppercase"
            >
              <span>Scroll</span>
              <span className="block w-8 h-px bg-white/30" />
              <span className="text-[#1677ff]">→</span>
            </motion.div>
          </div>
        </div>

        {/* ============ 顶部标题区（钉住）============ */}
        <div className="absolute top-0 left-0 right-0 z-20 pt-40 px-6 lg:px-10 pointer-events-none">
          <div className="max-w-[1600px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Eyebrow>一个会思考的温室</Eyebrow>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: EASE_OUT as any }}
              className="font-alimama font-medium text-white leading-[0.95] max-w-[14ch] mt-4"
              style={{ fontSize: "clamp(32px, 4.6vw, 72px)", letterSpacing: "-0.045em" }}
            >
              把农事，交给对话。
            </motion.h2>
          </div>
        </div>

        {/* ============ 横向 FILM STRIP ============ */}
        <div className="absolute inset-0 flex items-center">
          <motion.div
            style={{ x }}
            className="flex h-full"
          >
            {STAGES.map((st, i) => (
              <FilmFrame
                key={st.no}
                stage={st}
                index={i}
                total={total}
                progress={scrollYProgress}
              />
            ))}
            {/* 尾帧：收尾过渡 */}
            <EndFrame total={total} />
          </motion.div>
        </div>

        {/* ============ 底部水平进度条 + 帧索引 ============ */}
        <div className="absolute bottom-0 left-0 right-0 z-30 pb-10">
          <div className="max-w-[1600px] mx-auto px-6 lg:px-10">
            {/* 进度条 */}
            <div className="relative h-px bg-white/10">
              <motion.div
                style={{ scaleX: progressScaleX, transformOrigin: "left" }}
                className="absolute top-0 left-0 h-px w-full bg-[#1677ff]"
              />
              {/* 帧标记点 */}
              <div className="absolute inset-0 flex justify-between">
                {STAGES.map((s, i) => {
                  const pos = (i / (total - 1)) * 100;
                  return (
                    <FrameDot
                      key={s.no}
                      progress={scrollYProgress}
                      index={i}
                      total={total}
                      style={{ left: `${pos}%` }}
                    />
                  );
                })}
              </div>
            </div>
            {/* 底部帧索引文字 */}
            <div className="mt-3 flex items-center justify-between font-mono text-[10px] tracking-[0.25em] text-white/30 uppercase">
              {STAGES.map((s) => (
                <span key={s.no} className="flex-1 text-center first:text-left last:text-right">
                  {s.no} · {s.keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   FILM FRAME —— 单帧（一屏宽）
   · 左：巨字章节号 + 关键词
   · 中：编辑文案
   · 右：真实 AI 卡（直角取景器）
   · 进入视口时巨字 Y 位移 + 透明度淡入
   ============================================================ */
function FilmFrame({
  stage,
  index,
  total,
  progress,
}: {
  stage: Stage;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  // 每帧的进入/退出区间
  const seg = 1 / total;
  const start = index * seg;
  const enter = start + seg * 0.15;
  const exit = start + seg * 0.85;
  const leave = (index + 1) * seg;

  // 巨字章节号：进入时上浮 + 透明度
  const numOpacity = useTransform(
    progress,
    [start, enter, exit, leave],
    [0.1, 0.18, 0.18, 0.05]
  );
  const numY = useTransform(progress, [start, leave], [80, -80]);

  // 内容透明度
  const contentOpacity = useTransform(
    progress,
    [start, enter, exit, leave],
    [0, 1, 1, 0]
  );
  const contentY = useTransform(progress, [start, leave], [60, -60]);

  return (
    <div className="relative w-screen h-full shrink-0 flex items-center">
      {/* ============ 帧内背景巨字章节号 ============ */}
      <motion.div
        style={{ opacity: numOpacity, y: numY }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none"
        aria-hidden
      >
        <span
          className="font-alimama font-medium text-white leading-none"
          style={{
            fontSize: "clamp(320px, 56vw, 880px)",
            letterSpacing: "-0.08em",
          }}
        >
          {stage.no}
        </span>
      </motion.div>

      {/* ============ 帧内内容 ============ */}
      <motion.div
        style={{ opacity: contentOpacity, y: contentY }}
        className="relative z-10 w-full px-6 lg:px-10 pt-44 lg:pt-32"
      >
        <div className="max-w-[1600px] mx-auto grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* 左：编辑文案 */}
          <div className="lg:col-span-5 lg:col-start-1 order-2 lg:order-1">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="font-alimama font-medium text-[#1677ff] leading-none" style={{ fontSize: "clamp(48px, 6vw, 96px)", letterSpacing: "-0.05em" }}>
                {stage.no}
              </span>
              <div className="flex flex-col">
                <span className="font-mono text-[12px] tracking-[0.25em] text-[#1677ff] uppercase">
                  {stage.keyword}
                </span>
                <span className="font-mono text-[10px] tracking-[0.2em] text-white/30 uppercase mt-1">
                  {stage.eyebrow}
                </span>
              </div>
            </div>

            <h3
              className="font-alimama font-medium text-white leading-[1.05] whitespace-pre-line mb-6"
              style={{ fontSize: "clamp(28px, 3.6vw, 56px)", letterSpacing: "-0.04em" }}
            >
              {stage.title}
            </h3>

            <p className="text-white/50 text-[15px] sm:text-[16px] leading-[1.75] max-w-[440px] mb-8">
              {stage.desc}
            </p>

            <div className="flex items-center gap-4">
              <span className="block w-8 h-px bg-white/30" />
              <span className="font-mono text-[11px] tracking-[0.2em] text-white/40 uppercase">
                {stage.meta}
              </span>
            </div>
          </div>

          {/* 右：直角取景器框住真实 AI 卡 */}
          <div className="lg:col-span-5 lg:col-start-8 order-1 lg:order-2 flex justify-center lg:justify-start">
            <div className="relative w-full max-w-[400px]">
              <ViewfinderCorners tone="dark" />
              {/* 直角边框容器 */}
              <div className="relative border border-white/15 bg-white/[0.02] p-3 backdrop-blur-sm">
                <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-2 border-b border-white/10">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-white/40 uppercase">
                    AI · {stage.no}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <motion.span
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                      className="block w-1.5 h-1.5 bg-[#1677ff]"
                    />
                    <span className="font-mono text-[10px] tracking-[0.2em] text-white/40 uppercase">
                      live
                    </span>
                  </span>
                </div>
                <div className="pt-9">
                  <div className="overflow-hidden">{stage.card}</div>
                </div>
              </div>
              {/* 落款 */}
              <div className="mt-3 flex items-center justify-between font-mono text-[10px] tracking-[0.2em] text-white/30 uppercase">
                <span>fig.{stage.no}</span>
                <span>berry · ai</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 帧间分隔线 */}
      {index < total - 1 && (
        <div className="absolute right-0 top-1/4 bottom-1/4 w-px bg-white/5 pointer-events-none" />
      )}
    </div>
  );
}

/* ============================================================
   END FRAME —— 收尾过渡帧
   ============================================================ */
function EndFrame({ total }: { total: number }) {
  return (
    <div className="relative w-screen h-full shrink-0 flex items-center justify-center">
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE_OUT as any }}
        >
          <Eyebrow className="mb-6">推理完成</Eyebrow>
          <p
            className="font-alimama font-medium text-white leading-[0.95] max-w-[16ch] mx-auto"
            style={{ fontSize: "clamp(36px, 5vw, 80px)", letterSpacing: "-0.045em" }}
          >
            从感知到规划，
            <br />
            一次对话完成。
          </p>
          <div className="mt-10 flex items-center justify-center gap-2 font-mono text-[11px] tracking-[0.25em] text-white/30 uppercase">
            <span>end of chapter 02</span>
            <span className="block w-8 h-px bg-white/30" />
            <span>↓ next</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ============================================================
   FRAME DOT —— 进度条上的帧标记点
   ============================================================ */
function FrameDot({
  progress,
  index,
  total,
  style,
}: {
  progress: MotionValue<number>;
  index: number;
  total: number;
  style: React.CSSProperties;
}) {
  const seg = 1 / total;
  const start = index * seg;
  const enter = start + seg * 0.15;
  const exit = start + seg * 0.85;

  const isActive = useTransform(
    progress,
    [start, enter, exit],
    [0, 1, 0]
  );
  const scale = useTransform(isActive, [0, 1], [1, 2.4]);

  return (
    <div className="absolute top-1/2 -translate-y-1/2" style={style}>
      <motion.div
        style={{ scale }}
        className="w-1.5 h-1.5 bg-[#1677ff] -translate-x-1/2"
      />
    </div>
  );
}
