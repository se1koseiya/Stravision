"use client";

import { cn } from "@/lib/utils";
import { motion, useMotionValue, useSpring } from "framer-motion";
import React, { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

export type BerryOrbProps = {
  size?: string;
  className?: string;
  isActive?: boolean;
  theme?: 'dark' | 'light'; // 新增主题属性
};

const BerryOrb: React.FC<BerryOrbProps> = ({
  size = "192px",
  className,
  isActive = false,
  theme, // 如果手动指定主题则使用手动指定的，否则跟随系统主题
}) => {
  const numericSize = parseFloat(size) || 192;
  const scale = numericSize / 192;
  
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

  // 根据主题定义颜色配置
  const colorConfig = effectiveTheme === 'light' ? {
    // 浅色模式配色 - 极淡的浅绿色，几乎是纯白色，只有极其微弱的绿色调
    background: 'linear-gradient(135deg, #fefffe 0%, #fdfffd 100%)', // 几乎纯白，极微弱绿调
    innerGradientStart: 'rgba(250, 254, 252, 0.2)', // 极极淡绿
    innerGradientEnd: 'rgba(255, 255, 255, 0.6)', // 纯白
    glowColor1: 'rgba(220, 252, 231, 0.15)', // 极淡的绿色光晕
    glowColor2: 'rgba(240, 253, 244, 0.1)', // 更淡的绿色
    shadowInner: 'rgba(16, 185, 129, 0.01)',
    shadowOuter1: 'rgba(220, 252, 231, 0.08)',
    shadowOuter2: 'rgba(240, 253, 244, 0.05)',
    haloActive: 'radial-gradient(circle, rgba(220,252,231,0.08) 0%, rgba(240,253,244,0.04) 40%, transparent 70%)',
    haloInactive: 'radial-gradient(circle, rgba(220,252,231,0.04) 0%, rgba(240,253,244,0.02) 40%, transparent 70%)',
    eyeColor: '#10b981', // 中等绿色眼睛
    eyeColorActive: '#059669', // 稍深的绿
    eyeShadow: 'rgba(16,185,129,0.3)',
    eyeShadowActive: 'rgba(5,150,105,0.5)',
    particleColor: 'rgba(220,252,231,0.05)',
    borderGlow: '0 0 0 1px rgba(220, 252, 231, 0.08), 0 0 20px rgba(240, 253, 244, 0.05)',
  } : {
    // 深色模式配色 - 原有的青绿色调
    background: '#020617',
    innerGradientStart: 'rgba(6, 78, 59, 0.85)',
    innerGradientEnd: 'rgba(0, 0, 0, 0.95)',
    glowColor1: 'rgba(52, 211, 153, 0.9)',
    glowColor2: 'rgba(6, 182, 212, 0.7)',
    shadowInner: 'rgba(0, 0, 0, 0.9)',
    shadowOuter1: 'rgba(16, 185, 129, 0.3)',
    shadowOuter2: 'rgba(6, 182, 212, 0.2)',
    haloActive: 'radial-gradient(circle, rgba(52,211,153,0.25) 0%, rgba(6,182,212,0.1) 40%, transparent 70%)',
    haloInactive: 'radial-gradient(circle, rgba(52,211,153,0.1) 0%, rgba(6,182,212,0.05) 40%, transparent 70%)',
    eyeColor: '#6ee7b7',
    eyeColorActive: '#34d399',
    eyeShadow: 'rgba(52,211,153,0.8)',
    eyeShadowActive: 'rgba(52,211,153,1)',
    particleColor: 'rgba(255,255,255,0.15)',
    borderGlow: '0 0 0 1px rgba(16, 185, 129, 0.3), 0 0 30px rgba(16, 185, 129, 0.2)',
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
        '--orb-shadow-inner-glow': effectiveTheme === 'light' ? 'rgba(59, 189, 127, 1)' : 'rgba(16, 185, 129, 0.4)',
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
                    `radial-gradient(circle at 65% 65%, rgba(139, 92, 246, 0.3) 0%, ${colorConfig.innerGradientEnd} 60%)`,
                    `radial-gradient(circle at 35% 35%, ${colorConfig.innerGradientStart} 0%, ${colorConfig.innerGradientEnd} 60%)`
                  ]
                : [
                    "radial-gradient(circle at 35% 35%, rgba(6, 78, 59, 0.9) 0%, rgba(0, 0, 0, 0.95) 60%)",
                    "radial-gradient(circle at 65% 65%, rgba(6, 182, 212, 0.5) 0%, rgba(0, 0, 0, 0.95) 60%)",
                    "radial-gradient(circle at 35% 35%, rgba(6, 78, 59, 0.9) 0%, rgba(0, 0, 0, 0.95) 60%)"
                  ]
              : effectiveTheme === 'light'
                ? [
                    `radial-gradient(circle at 35% 35%, ${colorConfig.innerGradientStart} 0%, ${colorConfig.innerGradientEnd} 60%)`,
                    `radial-gradient(circle at 45% 45%, ${colorConfig.innerGradientStart} 0%, ${colorConfig.innerGradientEnd} 60%)`,
                    `radial-gradient(circle at 35% 35%, ${colorConfig.innerGradientStart} 0%, ${colorConfig.innerGradientEnd} 60%)`
                  ]
                : [
                    "radial-gradient(circle at 35% 35%, rgba(6, 78, 59, 0.85) 0%, rgba(0, 0, 0, 0.95) 60%)",
                    "radial-gradient(circle at 45% 45%, rgba(6, 78, 59, 0.85) 0%, rgba(0, 0, 0, 0.95) 60%)",
                    "radial-gradient(circle at 35% 35%, rgba(6, 78, 59, 0.85) 0%, rgba(0, 0, 0, 0.95) 60%)"
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

      {/* Expressive AI Eyes Container (跟随光标) */}
      <motion.div 
        className="absolute z-20 flex pointer-events-none items-center justify-center"
        style={{ x: eyeX, y: eyeY }}
      >
        {/* 眨眼容器 */}
        <motion.div
          className="flex"
          style={{ gap: `${16 * scale}px` }}
          animate={isActive ? {
            scaleY: [1, 0.1, 1.2, 1, 1, 0.1, 1], // 连眨
            y: [0, -2 * scale, 0] // 活跃时微微向上倾听
          } : {
            scaleY: [1, 0.05, 1], // 单眨
            y: 0
          }}
          transition={{
            duration: isActive ? 1.5 : 0.2,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: isActive ? 1.5 : 3 + Math.random() * 4 // 随机眨眼间隔
          }}
        >
          {/* Left Eye */}
          <motion.div 
            className="rounded-full relative overflow-hidden"
            style={{ 
              width: `${14 * scale}px`,
              backgroundColor: colorConfig.eyeColor
            }}
            animate={{ 
              height: isActive ? 28 * scale : 24 * scale,
              backgroundColor: isActive ? colorConfig.eyeColorActive : colorConfig.eyeColor,
              boxShadow: isActive 
                ? `0 0 ${35 * scale}px ${12 * scale}px ${colorConfig.eyeShadowActive}` 
                : `0 0 ${25 * scale}px ${8 * scale}px ${colorConfig.eyeShadow}`
            }}
            transition={{ duration: 0.3 }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent" />
          </motion.div>
          {/* Right Eye */}
          <motion.div 
            className="rounded-full relative overflow-hidden"
            style={{ 
              width: `${14 * scale}px`,
              backgroundColor: colorConfig.eyeColor
            }}
            animate={{ 
              height: isActive ? 28 * scale : 24 * scale,
              backgroundColor: isActive ? colorConfig.eyeColorActive : colorConfig.eyeColor,
              boxShadow: isActive 
                ? `0 0 ${35 * scale}px ${12 * scale}px ${colorConfig.eyeShadowActive}` 
                : `0 0 ${25 * scale}px ${8 * scale}px ${colorConfig.eyeShadow}`
            }}
            transition={{ duration: 0.3 }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent" />
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default BerryOrb;
