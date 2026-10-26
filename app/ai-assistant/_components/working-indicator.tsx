"use client"

import { WorkingLoader } from "@/app/ai-assistant/_components/working-loader"

/**
 * AI 「工作状态」指示器
 *
 * 2026-10-01 改版（用户：工作状态用 Uiverse 那个飘星 loader，改成绿色）：
 * 原来是一对小球绕中心旋转 —— 语义偏「加载中」，且视觉上和项目里其他 spin
 * 图标撞车。现在换成三瓣星星自上而下连续飘落（见 working-loader），
 * 主色走全站晨雾松 emerald（亮 #059669 / 暗 #34D399）。
 *
 * 与「输出状态」的分工（见 chat-bubble-list.tsx 的 isWorkingBubble）：
 *   · 工作状态 = 已发出请求、首字节还没到（或工具链执行中）→ 本组件
 *   · 输出状态 = 正文开始流式输出 → 直接渲染正文，本组件随即卸载
 */
export interface WorkingIndicatorProps {
  darkMode?: boolean
  /** 状态文案，默认「正在工作」 */
  label?: string
  /** 飘星尺寸，默认 20 */
  size?: number
}

export function WorkingIndicator({ darkMode = false, label = "正在工作", size = 20 }: WorkingIndicatorProps) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <WorkingLoader size={size} darkMode={darkMode} />
      <span
        className={[
          "text-[14px] leading-none",
          darkMode ? "text-zinc-200" : "text-zinc-700",
        ].join(" ")}
        style={{ fontWeight: 400 }}
      >
        {label}
      </span>
    </div>
  )
}

export default WorkingIndicator
