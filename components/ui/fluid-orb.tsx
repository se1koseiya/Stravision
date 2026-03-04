"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FluidOrbProps {
  state: "idle" | "listening" | "processing" | "speaking";
  className?: string;
}

export function FluidOrb({ state, className }: FluidOrbProps) {
  // 颜色配置
  const colors = {
    idle: "from-blue-400/60 via-purple-400/60 to-pink-400/60",
    listening: "from-red-400/80 via-orange-400/80 to-yellow-400/80",
    processing: "from-cyan-400/80 via-blue-500/80 to-indigo-500/80",
    speaking: "from-emerald-400/80 via-green-500/80 to-teal-500/80",
  };

  const glowColors = {
    idle: "shadow-[0_0_50px_rgba(168,85,247,0.4)]",
    listening: "shadow-[0_0_60px_rgba(239,68,68,0.5)]",
    processing: "shadow-[0_0_60px_rgba(59,130,246,0.5)]",
    speaking: "shadow-[0_0_60px_rgba(34,197,94,0.5)]",
  };

  return (
    <div className={cn("relative w-full h-full flex items-center justify-center", className)}>
      {/* 核心球体容器 */}
      <div className={cn(
        "relative w-full h-full rounded-full overflow-hidden transition-all duration-700",
        glowColors[state]
      )}>
        {/* 背景光晕 - 模拟 Siri 的黑色底色上的流光 */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-0" />

        {/* 动态流体层 1 */}
        <motion.div
          animate={{
            rotate: [0, 360],
            scale: state === "listening" ? [1, 1.2, 1] : [1, 1.1, 1],
          }}
          transition={{
            rotate: { duration: 8, repeat: Infinity, ease: "linear" },
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }}
          className={cn(
            "absolute inset-[-50%] w-[200%] h-[200%] opacity-70 blur-xl bg-gradient-to-r",
            colors[state],
            "rounded-[40%]"
          )}
          style={{ transformOrigin: "center center" }}
        />

        {/* 动态流体层 2 (反向旋转) */}
        <motion.div
          animate={{
            rotate: [360, 0],
            scale: state === "speaking" ? [0.9, 1.1, 0.9] : [0.9, 1, 0.9],
          }}
          transition={{
            rotate: { duration: 12, repeat: Infinity, ease: "linear" },
            scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
          }}
          className={cn(
            "absolute inset-[-50%] w-[200%] h-[200%] opacity-60 blur-2xl bg-gradient-to-tr",
            colors[state],
            "rounded-[45%]"
          )}
          style={{ transformOrigin: "center center" }}
        />

        {/* 核心高光 - 玻璃质感 */}
        <div className="absolute inset-0 rounded-full z-10 bg-gradient-to-b from-white/30 to-transparent opacity-50 pointer-events-none" />
        <div className="absolute top-[10%] left-[15%] w-[30%] h-[20%] bg-white/40 blur-md rounded-full transform -rotate-45 pointer-events-none" />
        
        {/* 边缘发光 */}
        <div className="absolute inset-0 rounded-full border border-white/20 z-20" />
      </div>
    </div>
  );
}
