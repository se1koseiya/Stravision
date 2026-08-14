"use client";

import { cn } from "@/lib/utils";
import type { OrbExpression } from "@/lib/ai/orb-expression";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import React, { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

export type BerryOrbProps = {
  size?: string;
  className?: string;
  isActive?: boolean;
  theme?: 'dark' | 'light'; // 新增主题属性
  /**
   * 表情：idle / thinking / working / speaking / happy / confused / angry / surprised
   * 不传时按旧逻辑：isActive ? working : idle
   */
  expression?: OrbExpression;
};

// ---------------------------------------------------------------------------
// 表情脸谱定义（SVG path，viewBox 0 0 100 80，stroke-currentColor）
// ---------------------------------------------------------------------------

type EyeDef = { left: string; right: string; width: number };

const EYES: Record<OrbExpression, EyeDef> = {
  idle:      { left: "M 32 24 L 32 44", right: "M 68 24 L 68 44", width: 13 },
  thinking:  { left: "M 32 30 L 32 44", right: "M 68 30 L 68 44", width: 12 },
  working:   { left: "M 32 24 L 32 44", right: "M 68 24 L 68 44", width: 13 },
  speaking:  { left: "M 32 24 L 32 44", right: "M 68 24 L 68 44", width: 13 },
  happy:     { left: "M 24 42 Q 32 26 40 42", right: "M 60 42 Q 68 26 76 42", width: 10 },
  confused:  { left: "M 32 26 L 32 44", right: "M 68 32 L 68 44", width: 13 },
  angry:     { left: "M 24 28 L 40 40", right: "M 76 28 L 60 40", width: 12 },
  surprised: {
    left: "M 32 34 m -7 0 a 7 7 0 1 0 14 0 a 7 7 0 1 0 -14 0",
    right: "M 68 34 m -7 0 a 7 7 0 1 0 14 0 a 7 7 0 1 0 -14 0",
    width: 6,
  },
};

/** 表情脸谱：仅眼睛（不同表情眼型 + 动画） */
const OrbFace: React.FC<{ expression: OrbExpression }> = ({ expression }) => {
  const eyes = EYES[expression];

  return (
    <motion.g
      style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
      animate={
        expression === "thinking"
          ? { scaleY: [1, 0.4, 1], x: [-3, 3, -3], y: 0 } // 思考：眯眼 + 眼神缓慢游移
          : expression === "speaking"
            ? { scaleY: [1, 0.75, 1], y: [0, 2, 0], x: 0 } // 说话：眼睛随语速轻快张合
            : { scaleY: [1, 0.08, 1], x: 0, y: 0 }         // 其他：自然眨眼
      }
      transition={
        expression === "thinking"
          ? { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
          : expression === "speaking"
            ? { duration: 0.45, repeat: Infinity, ease: "easeInOut" }
            : {
                duration: 0.2,
                repeat: Infinity,
                repeatDelay: expression === "working" ? 1.2 : 2.5 + Math.random() * 3, // 工作时眨眼更频繁
                ease: "easeInOut",
              }
      }
    >
      <path d={eyes.left} strokeWidth={eyes.width} strokeLinecap="round" fill="none" />
      <path d={eyes.right} strokeWidth={eyes.width} strokeLinecap="round" fill="none" />
    </motion.g>
  );
};

const BerryOrb: React.FC<BerryOrbProps> = ({
  size = "192px",
  className,
  isActive = false,
  theme, // 如果手动指定主题则使用手动指定的，否则跟随系统主题
  expression,
}) => {
  const numericSize = parseFloat(size) || 192;
  const scale = numericSize / 192;
  // 表情缺省时按旧逻辑推导，保持向后兼容
  const face: OrbExpression = expression ?? (isActive ? "working" : "idle");

  // 获取系统主题
  const { resolvedTheme } = useTheme();

  // 处理水合问题：在客户端挂载前使用默认主题
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // 确定最终使用的主题：手动指定 > 系统主题
  // 在未挂载时，如果没有手动指定主题，默认使用深色模式避免闪烁
  const effectiveTheme = theme || (mounted && resolvedTheme === 'light' ? 'light' : 'dark');

  // 根据主题定义颜色配置（蓝色系）
  const colorConfig = effectiveTheme === 'light' ? {
    // 浅色模式配色 - 极淡的浅蓝色，几乎是纯白色，只有极其微弱的蓝色调
    background: 'linear-gradient(135deg, #feffff 0%, #fdfeff 100%)', // 几乎纯白，极微弱蓝调
    innerGradientStart: 'rgba(250, 253, 254, 0.2)', // 极极淡蓝
    innerGradientEnd: 'rgba(255, 255, 255, 0.6)', // 纯白
    glowColor1: 'rgba(219, 234, 254, 0.25)', // 极淡的蓝色光晕
    glowColor2: 'rgba(239, 246, 255, 0.15)', // 更淡的蓝色
    shadowInner: 'rgba(59, 130, 246, 0.01)',
    shadowOuter1: 'rgba(219, 234, 254, 0.1)',
    shadowOuter2: 'rgba(239, 246, 255, 0.06)',
    haloActive: 'radial-gradient(circle, rgba(191,219,254,0.12) 0%, rgba(219,234,254,0.06) 40%, transparent 70%)',
    haloInactive: 'radial-gradient(circle, rgba(191,219,254,0.06) 0%, rgba(219,234,254,0.03) 40%, transparent 70%)',
    eyeColor: '#3b82f6', // 中等蓝色眼睛
    eyeColorActive: '#2563eb', // 稍深的蓝
    eyeShadow: 'rgba(59,130,246,0.3)',
    eyeShadowActive: 'rgba(37,99,235,0.5)',
    particleColor: 'rgba(191,219,254,0.08)',
    borderGlow: '0 0 0 1px rgba(191, 219, 254, 0.12), 0 0 20px rgba(219, 234, 254, 0.08)',
  } : {
    // 深色模式配色 - 蓝色调
    background: '#020617',
    innerGradientStart: 'rgba(30, 58, 138, 0.85)',
    innerGradientEnd: 'rgba(0, 0, 0, 0.95)',
    glowColor1: 'rgba(96, 165, 250, 0.9)',
    glowColor2: 'rgba(34, 211, 238, 0.7)',
    shadowInner: 'rgba(0, 0, 0, 0.9)',
    shadowOuter1: 'rgba(59, 130, 246, 0.3)',
    shadowOuter2: 'rgba(34, 211, 238, 0.2)',
    haloActive: 'radial-gradient(circle, rgba(96,165,250,0.25) 0%, rgba(34,211,238,0.1) 40%, transparent 70%)',
    haloInactive: 'radial-gradient(circle, rgba(96,165,250,0.1) 0%, rgba(34,211,238,0.05) 40%, transparent 70%)',
    eyeColor: '#93c5fd',
    eyeColorActive: '#60a5fa',
    eyeShadow: 'rgba(96,165,250,0.8)',
    eyeShadowActive: 'rgba(96,165,250,1)',
    particleColor: 'rgba(255,255,255,0.15)',
    borderGlow: '0 0 0 1px rgba(59, 130, 246, 0.3), 0 0 30px rgba(59, 130, 246, 0.2)',
  };

  const orbRef = useRef<HTMLDivElement>(null);

  // 光标追踪的物理弹簧值
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // 使用 useSpring 增加阻尼感，让跟随动作更顺滑、有重量感
  const springConfig = { damping: 25, stiffness: 150, mass: 0.5 };
  const eyeX = useSpring(mouseX, springConfig);
  const eyeY = useSpring(mouseY, springConfig);

  const rectRef = useRef<DOMRect | null>(null);

  useEffect(() => {
    const handleScrollOrResize = () => {
      rectRef.current = null;
    };
    window.addEventListener("scroll", handleScrollOrResize, { passive: true });
    window.addEventListener("resize", handleScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, []);

  useEffect(() => {
    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      // 使用 requestAnimationFrame 优化性能
      animationFrameId = requestAnimationFrame(() => {
        if (!orbRef.current) return;
        if (!rectRef.current) {
          rectRef.current = orbRef.current.getBoundingClientRect();
        }
        const rect = rectRef.current;
        // 计算球体中心点
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // 鼠标相对于中心的偏移量
        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;

        // 计算偏移量并限制最大移动范围 (应用缩放)
        const maxDistance = 16 * scale; // 眼睛移动的最大像素距离
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const factor = Math.min(distance / 250, 1); // 鼠标在250px外达到最大偏移

        const moveX = distance === 0 ? 0 : (deltaX / distance) * maxDistance * factor;
        const moveY = distance === 0 ? 0 : (deltaY / distance) * maxDistance * factor;

        mouseX.set(moveX);
        mouseY.set(moveY);
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mouseX, mouseY, scale]);

  return (
    <motion.div
      ref={orbRef}
      className={cn("relative flex items-center justify-center", className)}
      style={{
        width: size,
        height: size,
        '--orb-scale': scale,
        '--orb-bg': colorConfig.background,
        '--orb-shadow-inner': colorConfig.shadowInner,
        '--orb-shadow-inner-glow': effectiveTheme === 'light' ? 'rgba(147, 197, 253, 0.55)' : 'rgba(59, 130, 246, 0.4)',
        '--orb-shadow-outer-1': colorConfig.shadowOuter1,
        '--orb-shadow-outer-2': colorConfig.shadowOuter2,
        '--orb-glow-1': colorConfig.glowColor1,
        '--orb-glow-2': colorConfig.glowColor2,
        '--orb-inner-start': colorConfig.innerGradientStart,
        '--orb-inner-end': colorConfig.innerGradientEnd,
        '--orb-shadow-inner-deep': effectiveTheme === 'light' ? 'rgba(99,102,241,0.08)' : 'rgba(0,0,0,1)',
        '--orb-particle-color': colorConfig.particleColor,
        '--orb-border-glow': colorConfig.borderGlow,
      } as React.CSSProperties}
      // 整体悬浮呼吸动效
      animate={{
        y: isActive ? [-4 * scale, 4 * scale, -4 * scale] : [-8 * scale, 8 * scale, -8 * scale],
        scale: isActive ? [0.98, 1.03, 0.98] : [1, 1.01, 1],
      }}
      transition={{
        y: { duration: isActive ? 2 : 4, repeat: Infinity, ease: "easeInOut" },
        scale: { duration: isActive ? 1.5 : 3, repeat: Infinity, ease: "easeInOut" }
      }}
    >
      <style>{`
        @keyframes rotate-orb {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes float-particles {
          0% { background-position: 0px 0px; }
          100% { background-position: calc(16px * var(--orb-scale)) calc(16px * var(--orb-scale)); }
        }
        .berry-orb-wrapper {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: var(--orb-bg);
          box-shadow:
            inset 0 0 calc(50px * var(--orb-scale)) var(--orb-shadow-inner),
            inset 0 0 calc(20px * var(--orb-scale)) var(--orb-shadow-inner-glow),
            0 0 calc(40px * var(--orb-scale)) var(--orb-shadow-outer-1),
            0 0 calc(80px * var(--orb-scale)) var(--orb-shadow-outer-2),
            var(--orb-border-glow);
          overflow: hidden;
          isolation: isolate;
          z-index: 10;
        }
        .berry-orb-glow {
          position: absolute;
          inset: -50%;
          background: conic-gradient(
            from 0deg,
            transparent 0%,
            var(--orb-glow-1) 15%,
            var(--orb-glow-2) 25%,
            transparent 40%,
            transparent 50%,
            var(--orb-glow-1) 65%,
            var(--orb-glow-2) 75%,
            transparent 90%
          );
          filter: blur(calc(24px * var(--orb-scale)));
          animation: rotate-orb 6s linear infinite;
          mix-blend-mode: screen;
          opacity: var(--active-opacity, 0.7);
          transition: opacity 0.5s ease;
        }
        .berry-orb-inner {
          position: absolute;
          inset: 4px;
          border-radius: 50%;
          background: radial-gradient(circle at var(--mouse-x, 35%) var(--mouse-y, 35%), var(--orb-inner-start) 0%, var(--orb-inner-end) 60%);
          box-shadow: inset 0 0 calc(20px * var(--orb-scale)) var(--orb-shadow-inner-deep);
          z-index: 1;
        }
        .berry-orb-highlight {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.2) 0%, transparent 40%);
          z-index: 2;
          pointer-events: none;
        }
        .berry-orb-particles {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          z-index: 1;
          background-image: radial-gradient(circle at center, var(--orb-particle-color) 1px, transparent 1px);
          background-size: calc(12px * var(--orb-scale)) calc(12px * var(--orb-scale));
          opacity: 0.3;
          mix-blend-mode: overlay;
          animation: float-particles 4s linear infinite;
          pointer-events: none;
        }
      `}</style>

      {/* 高级外围环境光晕 (Halo Aura) */}
      <motion.div
        className="absolute inset-[-45%] rounded-full z-0 pointer-events-none"
        animate={{
          background: isActive ? colorConfig.haloActive : colorConfig.haloInactive,
          scale: isActive ? [1, 1.1, 1] : [1, 1.05, 1],
          opacity: isActive ? [0.8, 1, 0.8] : [0.5, 0.8, 0.5],
        }}
        transition={{ duration: isActive ? 2 : 4, repeat: Infinity, ease: "easeInOut" }}
        style={{ mixBlendMode: "screen" }}
      />

      {/* Main Orb */}
      <div className="berry-orb-wrapper">
        {/* 底层辉光 */}
        <div
          className="berry-orb-glow"
          style={{
            animationDuration: isActive ? '2s' : '8s',
            '--active-opacity': isActive ? '1' : '0.6'
          } as React.CSSProperties}
        />
        {/* 反向辉光层，增加复杂感 */}
        <div
          className="berry-orb-glow"
          style={{
            animationDuration: isActive ? '3s' : '12s',
            animationDirection: 'reverse',
            '--active-opacity': isActive ? '0.8' : '0.4',
            filter: 'blur(30px)'
          } as React.CSSProperties}
        />

        {/* 内部液态质感层 */}
        <motion.div
          className="berry-orb-inner"
          animate={{
            background: isActive
              ? effectiveTheme === 'light'
                ? [
                    `radial-gradient(circle at 35% 35%, ${colorConfig.innerGradientStart} 0%, ${colorConfig.innerGradientEnd} 60%)`,
                    `radial-gradient(circle at 65% 65%, rgba(147, 197, 253, 0.5) 0%, ${colorConfig.innerGradientEnd} 60%)`,
                    `radial-gradient(circle at 35% 35%, ${colorConfig.innerGradientStart} 0%, ${colorConfig.innerGradientEnd} 60%)`
                  ]
                : [
                    "radial-gradient(circle at 35% 35%, rgba(30, 58, 138, 0.9) 0%, rgba(0, 0, 0, 0.95) 60%)",
                    "radial-gradient(circle at 65% 65%, rgba(34, 211, 238, 0.5) 0%, rgba(0, 0, 0, 0.95) 60%)",
                    "radial-gradient(circle at 35% 35%, rgba(30, 58, 138, 0.9) 0%, rgba(0, 0, 0, 0.95) 60%)"
                  ]
              : effectiveTheme === 'light'
                ? [
                    `radial-gradient(circle at 35% 35%, ${colorConfig.innerGradientStart} 0%, ${colorConfig.innerGradientEnd} 60%)`,
                    `radial-gradient(circle at 45% 45%, ${colorConfig.innerGradientStart} 0%, ${colorConfig.innerGradientEnd} 60%)`,
                    `radial-gradient(circle at 35% 35%, ${colorConfig.innerGradientStart} 0%, ${colorConfig.innerGradientEnd} 60%)`
                  ]
                : [
                    "radial-gradient(circle at 35% 35%, rgba(30, 58, 138, 0.85) 0%, rgba(0, 0, 0, 0.95) 60%)",
                    "radial-gradient(circle at 45% 45%, rgba(30, 58, 138, 0.85) 0%, rgba(0, 0, 0, 0.95) 60%)",
                    "radial-gradient(circle at 35% 35%, rgba(30, 58, 138, 0.85) 0%, rgba(0, 0, 0, 0.95) 60%)"
                  ]
          }}
          transition={{ duration: isActive ? 2 : 6, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* 悬浮粒子层 */}
        <div
          className="berry-orb-particles"
          style={{ animationDuration: isActive ? '1.5s' : '6s' }}
        />

        {/* 顶部高光 */}
        <motion.div
          className="berry-orb-highlight"
          animate={{ opacity: isActive ? [0.8, 1, 0.8] : [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Expressive AI Face (跟随光标) */}
      <motion.div
        className="absolute z-20 flex pointer-events-none items-center justify-center"
        style={{ x: eyeX, y: eyeY }}
      >
        <AnimatePresence mode="wait">
          <motion.svg
            key={face}
            width={100 * scale}
            height={80 * scale}
            viewBox="0 0 100 80"
            stroke="currentColor"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{
              color: isActive ? colorConfig.eyeColorActive : colorConfig.eyeColor,
              filter: `drop-shadow(0 0 ${8 * scale}px ${isActive ? colorConfig.eyeShadowActive : colorConfig.eyeShadow})`,
              transition: 'color 0.3s ease, filter 0.3s ease',
            }}
          >
            <OrbFace expression={face} />
          </motion.svg>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default BerryOrb;
