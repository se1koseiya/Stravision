"use client"

import { Section, H2, Caption } from "./ui-primitives"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef, useState, useEffect } from "react"

export function Warning({ onRiskChange }: { onRiskChange?: (level: string) => void }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"]
  })
  
  const [riskLevel, setRiskLevel] = useState("L1")

  // Use raw scroll value to trigger side effects (not ideal for React render, but good for callbacks)
  useEffect(() => {
    return scrollYProgress.on("change", (v) => {
      if (v > 0.8 && riskLevel !== "L2") {
        setRiskLevel("L2")
        onRiskChange?.("L2")
      }
    })
  }, [scrollYProgress, riskLevel, onRiskChange])

  return (
    <Section>
      <div ref={ref}>
        <H2>变化，<br/>不会提前提醒你。</H2>
        <H2 className="text-emerald-500">系统会。</H2>
        <Caption>风险在上升之前，就已经被标记。</Caption>
      </div>

      <div className="relative h-64 flex items-center">
        {/* Risk Label */}
        <motion.button 
          className="absolute top-0 right-0 text-xs font-jinbuti border border-white/20 px-2 py-1 rounded text-white/60 hover:text-white hover:border-white transition-colors"
          animate={{ 
            color: riskLevel === "L2" ? "#10b981" : "#9CA3AF",
            borderColor: riskLevel === "L2" ? "#10b981" : "rgba(255,255,255,0.2)",
            x: riskLevel === "L2" ? [0, -2, 2, 0] : 0
          }}
          onClick={() => alert("建议：开启自动通风策略")}
        >
          风险等级: {riskLevel}
        </motion.button>

        {/* Minimal Curve */}
        <svg className="w-full h-full overflow-visible" viewBox="0 0 400 200">
          <motion.path
            d="M0,180 C100,180 150,180 200,150 C250,120 300,50 400,20"
            fill="none"
            stroke={riskLevel === "L2" ? "#10b981" : "#4B5563"}
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ margin: "-20%" }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
          
          {/* Gradient Area under curve (optional, keeping minimal as requested) */}
        </svg>
      </div>
    </Section>
  )
}
