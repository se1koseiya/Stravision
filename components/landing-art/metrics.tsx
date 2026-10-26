"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { useCountUp, EASE } from "./ui-primitives";

/* ============================================================
   METRICS —— 编辑式巨数 + 等宽标签 · 重新设计
   · 4 列等距，瑞士栅格，直角垂直分隔线
   · 数字使用 AlimamaShuHeiTi 巨字
   · 视差上浮 + blur 入场 + 数字 0→目标值 count-up
   · 鼠标悬浮：磁性吸引 + 单位上色 + 底部蓝线延展
   ============================================================ */

const METRICS = [
  { value: 11, display: (v: string) => v, unit: "ch", label: "多光谱通道", sub: "覆盖可见光至近红外" },
  { value: 38, display: (v: string) => v, unit: "ms", label: "感知延迟", sub: "端到端响应时间" },
  { value: 99.8, display: (v: string) => v, unit: "%", label: "决策置信度", sub: "可解释证据链" },
  { value: 4, display: (v: string) => v, unit: "步", label: "AI 推理流程", sub: "感知→澄清→决策→规划" },
];

export function Metrics() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const titleX = useTransform(scrollYProgress, [0, 1], [60, -60]);

  return (
    <section ref={ref} className="relative bg-[#F7F5F0] overflow-hidden">
      {/* 顶部章节标记（克制版）*/}
      <div className="pt-32">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-mono text-[11px] tracking-[0.25em] text-[#09090B]/40 uppercase">
              05 / 数据
            </span>
            <span className="block w-12 h-px bg-[#09090B]/10" />
            <span className="font-mono text-[11px] tracking-[0.25em] text-[#09090B]/40 uppercase">
              The Numbers
            </span>
          </div>
          <span className="font-mono text-[11px] tracking-[0.2em] text-[#09090B]/30 uppercase hidden sm:inline">
            source · live sensors
          </span>
        </div>
      </div>

      {/* 标题行 */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 pt-20 sm:pt-28 pb-12">
        <div className="grid lg:grid-cols-12 gap-8 items-end">
          <motion.h2
            style={{
              x: titleX,
              fontSize: "clamp(36px, 5.4vw, 80px)",
              letterSpacing: "-0.045em",
            }}
            initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.9, ease: EASE as any }}
            className="lg:col-span-8 font-alimama font-medium text-[#09090B] leading-[0.95]"
          >
            用<span style={{ color: "#059669" }}>数字</span>说话。
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-4 text-[14px] text-[#09090B]/50 leading-[1.7] max-w-[320px]"
          >
            从感知到决策，每一个数字都来自真实传感器与推理链路。
          </motion.p>
        </div>
      </div>

      {/* 4 列巨数栅格 —— 直角垂直分隔 + 磁性 hover */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 pb-32 sm:pb-48">
        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-l border-[#09090B]/15">
          {METRICS.map((m, i) => (
            <MetricCell key={i} metric={m} index={i} total={METRICS.length} />
          ))}
        </div>

        {/* 底部落款 */}
        <div className="mt-10 flex items-center justify-between font-mono text-[11px] tracking-[0.25em] text-[#09090B]/30 uppercase">
          <span>updated · real-time</span>
          <span>fig.06 · metrics</span>
          <span>berry · realm</span>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   METRIC CELL —— 单个数字格
   · 进入视口时 count-up 0→目标值
   · 鼠标悬浮：磁性位移 + 巨字蓝色高亮
   ============================================================ */
function MetricCell({
  metric,
  index,
  total,
}: {
  metric: typeof METRICS[number];
  index: number;
  total: number;
}) {
  const decimals = metric.value % 1 !== 0 ? 1 : 0;
  const { ref: countRef, value } = useCountUp(metric.value, 1.8, decimals);
  const cellRef = useRef<HTMLDivElement>(null);

  // 磁性位移
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 15 });
  const sy = useSpring(y, { stiffness: 200, damping: 15 });
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const el = cellRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      x.set((e.clientX - cx) * 0.08);
      y.set((e.clientY - cy) * 0.08);
    };
    const onLeave = () => {
      x.set(0);
      y.set(0);
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [x, y]);

  return (
    <motion.div
      ref={cellRef}
      style={{ x: sx, y: sy }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-cursor="hover"
      className="relative border-r border-b border-[#09090B]/15 p-6 lg:p-10 group transition-colors duration-300 hover:bg-[#09090B]/[0.02] cursor-default overflow-hidden"
    >
      {/* 序号 */}
      <div className="absolute top-4 right-4 font-mono text-[11px] text-[#09090B]/30">
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </div>
      {/* 巨数 —— count-up 触发器挂在 wrapper */}
      <motion.div
        ref={countRef as React.RefObject<HTMLDivElement>}
        className="flex items-baseline gap-1 mb-6"
        animate={{ color: hovered ? "#059669" : "#09090B" }}
        transition={{ duration: 0.3 }}
      >
        <span
          className="font-alimama font-medium leading-none tabular-nums"
          style={{ fontSize: "clamp(72px, 9vw, 152px)", letterSpacing: "-0.05em" }}
        >
          {value}
        </span>
        <span
          className="font-mono text-[#059669]"
          style={{ fontSize: "clamp(18px, 2vw, 28px)" }}
        >
          {metric.unit}
        </span>
      </motion.div>
      {/* 标签 */}
      <div className="font-mono text-[12px] tracking-[0.2em] text-[#09090B] uppercase mb-2">
        {metric.label}
      </div>
      <div className="text-[14px] text-[#09090B]/45 leading-relaxed">{metric.sub}</div>
      {/* 底部蓝线 hover 延展 */}
      <motion.span
        className="absolute bottom-0 left-0 h-[2px] bg-[#059669]"
        animate={{ width: hovered ? "100%" : "0%" }}
        transition={{ duration: 0.4, ease: EASE as any }}
      />
    </motion.div>
  );
}
