"use client"

import { motion } from "framer-motion"

/**
 * AI 正在工作指示器
 * - 双球绕中心旋转，传达"AI 正在思考/工作"的状态
 * - 主球使用 Ant Design 主色蓝 (#1677ff)，副球淡色形成拖尾感
 */
export function WorkingIndicator({ darkMode = false }: { darkMode?: boolean }) {
  const primary = "#1677ff"
  const secondary = darkMode ? "rgba(22,119,255,0.32)" : "rgba(22,119,255,0.42)"

  return (
    <div className="inline-flex items-center gap-2">
      {/* 双球旋转动效 */}
      <span className="relative inline-flex items-center justify-center w-5 h-5 shrink-0">
        <motion.span
          aria-hidden
          className="relative block w-5 h-5"
          animate={{ rotate: 360 }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {/* 主球 */}
          <span
            className="absolute left-1/2 top-0 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: primary }}
          />
          {/* 副球（对侧，较淡，形成拖尾） */}
          <span
            className="absolute left-1/2 bottom-0 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: secondary }}
          />
        </motion.span>
      </span>
      {/* 固定文案：「正在工作」 */}
      <span
        className={[
          "text-[14px] leading-none",
          darkMode ? "text-zinc-200" : "text-zinc-700",
        ].join(" ")}
        style={{ fontWeight: 400 }}
      >
        正在工作
      </span>
    </div>
  )
}
