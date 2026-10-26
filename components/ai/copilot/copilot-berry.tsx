"use client";

/**
 * CopilotBerry —— 莓小智悬浮莓果 IP（copilot.png）状态机视觉层
 *
 * 状态机：Idle 呼吸 → Hover 醒来 → Pressed 软压缩 → Opening 球展开成面板
 *         → Thinking 内部流光 → Answered 轻弹一下 → Closing 缩回球体
 *
 * 美术资源是单张扁平 PNG（脸/叶子烘焙在图里），所以：
 *  - 「内部流光 / 高光游走」用 conic / radial 渐变层 + PNG alpha 蒙版（mask-image）实现，
 *    光效只出现在莓果像素上，不会溢出成方块；
 *  - 「叶子晃动 / 抬起」用整体绕底部锚点的微旋转（transform-origin 50% 88%）模拟滞后摆动；
 *  - 表情（臭脸）保持不动，只让球体、高光、叶子响应 —— 不做卖萌宠物化。
 *
 * 导出：
 *  - BerryVisual      纯视觉叠层（光晕 + PNG + 蒙版光效层）
 *  - CopilotBerryFab  右下角悬浮球（呼吸待机 / 近距感知转向 / hover 提示 / 按压缩扁 / 消散 / boop）
 *  - COPILOT_FAB      悬浮球几何常量（copilot-sidebar 的开合编排依赖它对齐）
 */

import React, { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useReducedMotion,
  useSpring,
} from "framer-motion";

import { useMaterialCss } from "@/components/device/immersive-card";

export const COPILOT_FAB = {
  SIZE: 52,
  INSET: 16,
} as const;

const BERRY_PNG = "/copilot.png";

/** PNG alpha 蒙版：让高光/流光只出现在莓果像素上 */
const BERRY_MASK_STYLE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  WebkitMaskImage: `url(${BERRY_PNG})`,
  maskImage: `url(${BERRY_PNG})`,
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
};

/**
 * 光效层样式。注意：JSX <style> 模板串内禁止反引号 —— url 一律硬编码字面量。
 */
const BERRY_CSS = `
@keyframes berry-sheen-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes berry-highlight-drift { 0%,100% { transform: translate(-6%, -4%) scale(1); } 50% { transform: translate(9%, 7%) scale(1.18); } }
@keyframes berry-halo-breathe { 0%,100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.85; transform: scale(1.07); } }
@keyframes berry-leaf-sway { 0%,100% { transform: rotate(-1.1deg); } 50% { transform: rotate(1.3deg); } }
.berry-halo { position: absolute; inset: -32%; border-radius: 50%; pointer-events: none; background: radial-gradient(circle, rgba(236,72,153,0.20) 0%, rgba(244,114,182,0.08) 45%, transparent 70%); animation: berry-halo-breathe 3.8s ease-in-out infinite; }
.berry-halo[data-thinking="true"] { animation-duration: 1.9s; background: radial-gradient(circle, rgba(236,72,153,0.34) 0%, rgba(244,114,182,0.15) 45%, transparent 70%); }
.berry-img { animation: berry-leaf-sway 5.4s ease-in-out infinite; transform-origin: 50% 88%; }
.berry-highlight { position: absolute; left: 14%; top: 10%; width: 36%; height: 32%; border-radius: 50%; pointer-events: none; background: radial-gradient(closest-side, rgba(255,255,255,0.65), transparent); filter: blur(2px); animation: berry-highlight-drift 7s ease-in-out infinite; }
.berry-sheen { position: absolute; inset: -30%; pointer-events: none; background: conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0) 35deg, rgba(255,255,255,0.7) 95deg, rgba(255,255,255,0) 160deg, transparent 215deg, rgba(255,190,214,0.45) 300deg, transparent 360deg); animation: berry-sheen-spin 2.6s linear infinite; }
@media (prefers-reduced-motion: reduce) { .berry-halo, .berry-img, .berry-highlight, .berry-sheen { animation: none; } }
`;

/** 完成态 boop（快速上浮 + 叶尖轻弹后回位） */
function useBoop(boopKey: number | undefined) {
  const controls = useAnimationControls();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    void controls.start({
      y: [0, -3.5, 0],
      rotate: [0, -2.5, 0],
      transition: { duration: 0.45, ease: "easeOut" },
    });
  }, [boopKey, controls]);
  return controls;
}

/** 纯视觉叠层：呼吸光晕 + 莓果 PNG（叶子滞后摆动）+ alpha 蒙版光效层 */
export function BerryVisual({
  size,
  thinking,
  hovering,
}: {
  size: number;
  thinking?: boolean;
  hovering?: boolean;
}) {
  return (
    <div data-berry-visual style={{ position: "relative", width: size, height: size }}>
      <style>{BERRY_CSS}</style>
      <div className="berry-halo" data-thinking={thinking ? "true" : undefined} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BERRY_PNG}
        alt=""
        draggable={false}
        className="berry-img"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
          position: "relative",
        }}
      />
      <div style={{ ...BERRY_MASK_STYLE, pointerEvents: "none" }}>
        <div
          className="berry-highlight"
          style={{ opacity: hovering ? 0.95 : 0.55, transition: "opacity 0.25s ease" }}
        />
        {thinking ? <div className="berry-sheen" /> : null}
      </div>
    </div>
  );
}

/**
 * 悬浮球（收起态）：
 *  - Idle：整体 2~3px 悬浮 + 每 3.7s 一次 1→1.03→1 呼吸缩放 + 叶子滞后摆动 + 高光缓慢游走
 *  - 近距感知：光标进入 150px 半径（无需 hover 到球上）→ 球体朝鼠标方向轻转
 *  - Hover：上浮 + 高光增强 + 左侧出现「问问我 / 需要帮忙？」
 *  - Pressed：whileTap 软压缩 scale(.86, .94)，松手交给面板展开
 *  - Thinking：内部柔光旋转 + 光晕加速（面板收起但 AI 在跑时）
 */
export function CopilotBerryFab({
  dark,
  thinking,
  boopKey,
  leaving,
  onActivate,
}: {
  dark: boolean;
  thinking?: boolean;
  boopKey?: number;
  /** Opening：面板从球的位置长出来时，球本体收缩消散（球就是这个窗口的来源） */
  leaving?: boolean;
  onActivate: () => void;
}) {
  /* `dark` 保留在 API 里：过去用它手写下沉/tooltip 玻璃，现已交给 .dark .dc-ctrl--popup
     （由 <html class="dark"> 驱动，与站点其它材质同源）。别因"暂时没用到"删掉这个 prop ——
     copilot-sidebar 传它进来，将来做暗态专项微调时不用再改签名。 */
  const reduce = useReducedMotion() ?? false;
  const [hovered, setHovered] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const tilt = useSpring(0, { stiffness: 130, damping: 15 });
  const boopControls = useBoop(boopKey);

  /**
   * HDS 沉浸光感：悬浮体直接压在业务页之上，是「材质」最该出场的位置。
   * useMaterialCss() 保证材质 CSS 在文档里（幂等；已由 app/layout 全局注入）。
   */
  useMaterialCss();

  /* 近距感知：window mousemove + 距离场，不依赖真 hover */
  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      raf = requestAnimationFrame(() => {
        const el = btnRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const near = Math.hypot(dx, dy) < 150;
        tilt.set(near ? Math.max(-7, Math.min(7, dx / 14)) : 0);
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [tilt, reduce]);

  return (
    <motion.button
      ref={btnRef}
      type="button"
      aria-label="唤起莓小智"
      data-copilot-fab
      data-copilot-fab-thinking={thinking ? "true" : undefined}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: leaving ? 0 : 1, scale: leaving ? 0.55 : 1 }}
      transition={
        leaving
          ? { duration: 0.26, ease: "easeOut" }
          : { type: "spring", stiffness: 260, damping: 18 }
      }
      onClick={onActivate}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileTap={{ scaleX: 0.86, scaleY: 0.94, transition: { duration: 0.12 } }}
      style={{
        position: "fixed",
        right: COPILOT_FAB.INSET,
        bottom: COPILOT_FAB.INSET,
        /**
         * 🚨 Copilot 必须在「容器顶层」：设备管理 / 接入向导这类弹窗是 antd Modal（z=1000，
         * 次级面板显式 1100），旧值 159 会被弹窗连同遮罩一起盖住 —— 用户开着弹窗就点不到莓果球了。
         * 取值 1280：高于 1100 的接入弹窗，仍低于全屏截图/引导类浮层。
         */
        zIndex: 1280,
        width: COPILOT_FAB.SIZE,
        height: COPILOT_FAB.SIZE,
        borderRadius: "50%",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        pointerEvents: leaving ? "none" : "auto",
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* L1 悬浮：待机 4.4s 循环上下 3px；hover 时弹簧上浮 5px */}
      <motion.div
        animate={reduce ? { y: 0 } : hovered ? { y: -5 } : { y: [0, -3, 0] }}
        transition={
          hovered || reduce
            ? { type: "spring", stiffness: 240, damping: 16 }
            : { duration: 4.4, repeat: Infinity, ease: "easeInOut" }
        }
        style={{ width: "100%", height: "100%" }}
      >
        {/* L2 呼吸缩放：1 → 1.03 → 1，3.7s 一次 */}
        <motion.div
          animate={reduce ? undefined : { scale: [1, 1.03, 1] }}
          transition={{ duration: 3.7, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: "100%", height: "100%" }}
        >
          {/* L3 近距感知转向（绕底部锚点，视觉上叶子滞后于球体） */}
          <motion.div
            style={{ rotate: tilt, transformOrigin: "50% 85%", width: "100%", height: "100%" }}
          >
            {/* L4 完成 boop */}
            <motion.div animate={boopControls} style={{ width: "100%", height: "100%" }}>
              <BerryVisual size={COPILOT_FAB.SIZE} thinking={!!thinking} hovering={hovered} />
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* hover 提示：问问我 / 需要帮忙？ */}
      <AnimatePresence>
        {hovered && !leaving && (
          <motion.div
            data-copilot-fab-hint
            /* HDS 沉浸光感 POPUP 档（官方定义 = 悬浮面板 / 提示气泡：比 field 实一档，
               因为它悬在**任意内容**之上，可读性优先）。
               替代原先手写的 rgba(255,255,255,.82) + blur(12px) saturate(150%)。
               注意：background / border / box-shadow 一律交给材质，
               inline 写死了它们 inline 优先级高会把材质整层盖掉。 */
            className="dc-ctrl--popup"
            initial={{ opacity: 0, x: 8, y: "-50%", scale: 0.92 }}
            animate={{ opacity: 1, x: 0, y: "-50%", scale: 1 }}
            exit={{ opacity: 0, x: 8, y: "-50%", scale: 0.94 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "absolute",
              right: "calc(100% + 12px)",
              top: "50%",
              width: 96,
              padding: "8px 12px",
              borderRadius: 12,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: dark ? "#f4f4f5" : "#18181b",
                lineHeight: 1.4,
              }}
            >
              问问我
            </span>
            <span
              style={{
                fontSize: 11.5,
                color: dark ? "#a1a1aa" : "#7a7a85",
                lineHeight: 1.4,
              }}
            >
              需要帮忙？
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
