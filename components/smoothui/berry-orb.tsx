"use client";

/**
 * BerryOrb —— 平台 AI 化身外壳（2026-10-14 起默认形态 = logo 吉祥物「莓小智」）
 *
 * 形态（四选一，按优先级派发）：
 * - `variant="auto"`（默认）/ `variant="video"`：播透明动画 WebP 短片
 *   （状态 → Grok 姿态 → MASCOT_CLIPS 片源）。未产出片源的姿态回退到
 *   MASCOT_FALLBACK_CLIP 的中性待机片 —— **不会回退到 SVG**。
 * - `variant="mascot"`：SVG 造型。⚠️ 已弃用（造型观感不佳，用户明确否决），
 *   仅作为「连片源都取不到」时的兜底保留，新代码勿用。
 * - `variant="orb"`：原 Grok Orb 蓝白球体（见 grok-orb-body.tsx），保留作回退
 *
 * 本层只负责：尺寸解析 / 主题解析 / palette 合并 / 外围光晕 / 光标视差 / 形态派发。
 * 各形态共享 props 契约（size/theme/isActive/expression/paused/trails/palette），
 * 全站 12 处调用无需改动。
 */

import { cn } from "@/lib/utils";
import { toGrokExpression, type GrokOrbExpression, type OrbExpression } from "@/lib/ai/orb-expression";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import BerryMascotBody from "./berry-mascot-body";
import BerryVideoOrb from "./berry-video-orb";
import GrokOrbBody, { GROK_PALETTES, type OrbPalette } from "./grok-orb-body";
import {
  MASCOT_THEME_DARK,
  MASCOT_THEME_LIGHT,
  darkenHex,
  ensureInkContrast,
  type MascotTheme,
} from "./berry-mascot-data";

export type { OrbPalette };

export type BerryOrbVariant = "auto" | "video" | "mascot" | "orb";

/**
 * 已产出的吉祥物状态短片（transparent animated WebP + 静态 poster）。
 * 键 = Grok 姿态；状态别名（idle/thinking/working/speaking/listening）经
 * `toGrokExpression()` 落到这里。
 *
 * 这 5 个覆盖了 AI 交互的主流程：
 *   natural ← idle        （待机）
 *   curious ← thinking    （思考中）
 *   focused ← working     （执行中，listening 也映射到这）
 *   playful ← speaking    （流式说话中）
 *   happy                  （成功 / 打招呼）
 */
export const MASCOT_CLIPS: Partial<Record<GrokOrbExpression, { webp: string; png: string }>> = {
  natural: { webp: "/mascot/idle.webp", png: "/mascot/idle.png" },
  curious: { webp: "/mascot/thinking.webp", png: "/mascot/thinking.png" },
  focused: { webp: "/mascot/working.webp", png: "/mascot/working.png" },
  playful: { webp: "/mascot/speaking.webp", png: "/mascot/speaking.png" },
  happy: { webp: "/mascot/happy.webp", png: "/mascot/happy.png" },
};

/**
 * 未产出片源的表情回退到这里。
 * 选 natural 而不是某个"表情片"：它是中性待机脸，放在任何语义场景都不会违和
 * （不会出现「该难过却在笑」）。关键是 —— **绝不回退到 SVG 造型**，SVG 版本已弃用。
 */
export const MASCOT_FALLBACK_CLIP: GrokOrbExpression = "natural";

export type BerryOrbProps = {
  size?: string;
  className?: string;
  isActive?: boolean;
  theme?: "dark" | "light";
  /** 表情：12 种姿态 + 5 个遗留状态别名（idle/thinking/working/speaking/listening） */
  expression?: OrbExpression;
  /** 冻结动画在参考姿态上 */
  paused?: boolean;
  /** 表情切换时的环绕彩带；默认尺寸 ≥ 96px 时开启（仅 SVG 形态；短片自带动态） */
  trails?: boolean;
  /** 形态：auto = 有短片用短片 / 否则 SVG（默认）；video = 同上但明确走短片；mascot = 强制 SVG；orb = 原蓝白球体 */
  variant?: BerryOrbVariant;
  /**
   * 覆盖主题配色（局部字段即可）。
   * 吉祥物形态下：`bodyGradientStops` → 果体、`eye` → 眼睛/嘴、`face` → 面罩、`leaf` → 叶子。
   * 例：绿色标 —— `palette={{ bodyGradientStops: ["#22D98A", "#00B368"] }}`
   */
  palette?: Partial<OrbPalette>;
};

/**
 * 绿色莓小智标（对齐品牌 emerald）—— 供 AI 助手首页招呼语左侧的 orb 使用。
 * 吉祥物形态下会自动把过亮的 `eye` 兜底成深绿，避免「白眼白脸」。
 */
export const EMERALD_ORB_PALETTE: OrbPalette = {
  bodyGradientStops: ["#35E39B", "#00B368"],
  bodyStroke: "rgba(0,178,104,0.35)",
  eye: "#FFFFFF",
  eyeActive: "#F0FDF4",
  eyeGlow: "rgba(0,120,72,0.35)",
  particle: "rgba(255,255,255,0.9)",
  haloActive:
    "radial-gradient(circle, rgba(0,200,112,0.30) 0%, rgba(110,231,183,0.14) 40%, transparent 70%)",
  haloInactive:
    "radial-gradient(circle, rgba(0,200,112,0.16) 0%, rgba(167,243,208,0.08) 40%, transparent 70%)",
};

const BerryOrb: React.FC<BerryOrbProps> = ({
  size = "192px",
  className,
  isActive = false,
  theme,
  expression,
  paused = false,
  trails,
  variant = "auto",
  palette: paletteOverride,
}) => {
  const numericSize = parseFloat(size) || 192;
  const scale = numericSize / 192;
  const trailsEnabled = trails ?? numericSize >= 96;
  const reduceMotion = useReducedMotion() ?? false;
  const frozen = paused || reduceMotion;

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const effectiveTheme: "dark" | "light" =
    theme || (mounted && resolvedTheme === "light" ? "light" : "dark");

  /* ── 吉祥物配色 ── */
  const mascotTheme = useMemo<MascotTheme>(() => {
    const base = effectiveTheme === "light" ? MASCOT_THEME_LIGHT : MASCOT_THEME_DARK;
    const o = paletteOverride;
    if (!o) return base;
    const face = o.face ?? base.face;
    const ink = isActive ? o.eyeActive ?? o.eye ?? base.ink : o.eye ?? base.ink;
    const body = o.bodyGradientStops ?? base.body;
    return {
      ...base,
      body,
      bodyRim: o.bodyStroke ?? base.bodyRim,
      face,
      leaf: o.leaf ?? base.leaf,
      ink: ensureInkContrast(ink, face, darkenHex(body[1], 0.32)),
      particle: o.particle ?? base.particle,
      haloActive: o.haloActive ?? base.haloActive,
      haloInactive: o.haloInactive ?? base.haloInactive,
    };
  }, [effectiveTheme, paletteOverride, isActive]);

  /* ── 球体配色 ── */
  const orbPalette = useMemo(
    () => ({ ...GROK_PALETTES[effectiveTheme], ...(paletteOverride ?? {}) }),
    [effectiveTheme, paletteOverride]
  );

  const halo = variant === "orb"
    ? { active: orbPalette.haloActive, inactive: orbPalette.haloInactive }
    : { active: mascotTheme.haloActive, inactive: mascotTheme.haloInactive };
  /* 光晕被显式关掉（palette.haloActive / haloInactive 同时为 "none"）时整层不渲染。
     这层是 `absolute inset-[-45%]`，**即便 background:none 也照样撑出 14.4px 的
     不可达溢出**（LTR 下右侧计入 scrollWidth）：32px 头像位会被撑大 15px，
     窄宿主容器（antd avatar 槽 overflow:visible）因此产生横向溢出。 */
  const haloOff = halo.active === "none" && halo.inactive === "none";

  /* ── 形态派发：状态 → Grok 姿态 → 短片；未产出的姿态回退到中性片，绝不落 SVG ── */
  const resolvedExpression = expression ?? (isActive ? "working" : "idle");
  const clip =
    variant === "mascot" || variant === "orb"
      ? undefined
      : MASCOT_CLIPS[toGrokExpression(resolvedExpression)] ?? MASCOT_CLIPS[MASCOT_FALLBACK_CLIP];
  /* 小尺寸（≤36px 头像位）动效肉眼不可见，却要解码整张动画 WebP —— 全站十几处复用会白烧内存。
     这类尺寸只留静态首帧，观感等同、成本归零。
     ⚠️ 2026-10-16 曾按「AI 助手头像根本不是动态的」把门槛临时下调到 <24，
     随该头像被用户否决已一并回退。多张同时解码的开销由 berry-video-orb 的
     IntersectionObserver 视口门控兜底，不靠砍尺寸。 */
  const clipTooSmall = numericSize < 40;

  // ── 光标视差（整体轻微跟随） ──
  const orbRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 150, mass: 0.5 };
  const parallaxX = useSpring(mouseX, springConfig);
  const parallaxY = useSpring(mouseY, springConfig);
  const rectRef = useRef<DOMRect | null>(null);

  useEffect(() => {
    const invalidate = () => {
      rectRef.current = null;
    };
    window.addEventListener("scroll", invalidate, { passive: true });
    window.addEventListener("resize", invalidate, { passive: true });
    return () => {
      window.removeEventListener("scroll", invalidate);
      window.removeEventListener("resize", invalidate);
    };
  }, []);

  useEffect(() => {
    let frameId = 0;
    const handleMouseMove = (e: MouseEvent) => {
      frameId = requestAnimationFrame(() => {
        if (!orbRef.current) return;
        if (!rectRef.current) rectRef.current = orbRef.current.getBoundingClientRect();
        const rect = rectRef.current;
        const deltaX = e.clientX - (rect.left + rect.width / 2);
        const deltaY = e.clientY - (rect.top + rect.height / 2);
        const distance = Math.hypot(deltaX, deltaY);
        const maxDistance = 5 * scale;
        const factor = Math.min(distance / 250, 1);
        mouseX.set(distance === 0 ? 0 : (deltaX / distance) * maxDistance * factor);
        mouseY.set(distance === 0 ? 0 : (deltaY / distance) * maxDistance * factor);
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(frameId);
    };
  }, [mouseX, mouseY, scale]);

  return (
    <motion.div
      ref={orbRef}
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* 外围光晕 */}
      {!haloOff && (
        <motion.div
          className="absolute inset-[-45%] rounded-full z-0 pointer-events-none"
          style={{
            background: isActive ? halo.active : halo.inactive,
            mixBlendMode: "screen",
          }}
          animate={{
            scale: isActive ? [1, 1.1, 1] : [1, 1.05, 1],
            opacity: isActive ? [0.8, 1, 0.8] : [0.5, 0.8, 0.5],
          }}
          transition={{ duration: isActive ? 2 : 4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* 主体（含视差） */}
      <motion.div className="relative w-full h-full" style={{ x: parallaxX, y: parallaxY }}>
        {variant === "orb" ? (
          <GrokOrbBody
            expression={expression}
            isActive={isActive}
            paused={frozen}
            trails={trailsEnabled}
            palette={orbPalette}
          />
        ) : clip ? (
          <BerryVideoOrb src={clip.webp} poster={clip.png} paused={frozen || clipTooSmall} />
        ) : (
          <BerryMascotBody
            size={numericSize}
            theme={mascotTheme}
            isActive={isActive}
            expression={resolvedExpression}
            paused={frozen}
            trails={trailsEnabled}
          />
        )}
      </motion.div>
    </motion.div>
  );
};

export default BerryOrb;
