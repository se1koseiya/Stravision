"use client"

/**
 * sender「能力 / 模式」行的通用视觉件（2026-10-01）
 *
 * ── 为什么单独一个文件 ────────────────────────────────────────────────
 * 用户给的参考稿输入框里，能力入口是**一排扁平无边框的图文按钮**
 * （快速回答 / AI 生图 / 写作 / 解题 / 深度研究 / PPT 生成 / 数据分析 / 更多），
 * 一旦选中某一条，**整排收起来、只留那一枚**，变成「图标 + 名称 + ×」的绿色胶囊。
 *
 * 这套形态是「**模式**」而不是「开关」，和 sender 里已有的 深度思考 / 权限
 * 在语义上不是一类东西 —— 所以它既不能塞进 `.sender-chip`（会被那 7px/9px
 * 内距规则连吃 16px，见 MEMORY「复用控件类」那条血案），也不该和它们共用样式。
 * 这里给出**独立的**两枚原子：`ModeChip`（未选中）与 `ActiveModePill`（已选中）。
 *
 * ⚠️ 这里只有纯展示件，不含任何状态 —— 谁选中、用什么 seed 文案进输入框，
 *    全部由 `chat-sender-input.tsx` 决定（它拿 `SenderModeItem[]` 渲染）。
 *    这样 sender 不必知道「草莓」「病虫害」这些业务词。
 */

import React from "react"
import { IconClose } from "@/components/icon"

/** 一条能力/模式定义 —— sender 道具化输入，业务侧（种植能力 / 研究…）负责组装 */
export interface SenderModeItem {
  key: string
  label: string
  icon: React.ReactNode
  /** 进入该模式后输入框的 placeholder（不传则沿用 sender 默认文案） */
  placeholder?: string
  /** 进入该模式时顺带打开「联网检索 / 深度研究」工具组 */
  search?: boolean
  /** 进入该模式时灌进输入框的起始文案（可选；不传就是纯模式，由用户自己写） */
  seed?: string
  /**
   * 该模式依赖图片输入（如病虫害识别）。
   * 为 true 时 sender 会在进入模式的同一拍唤起文件选择器 ——
   * 让「选能力」和「给图」连成一个动作，而不是让用户自己去找 + 号。
   */
  pickImage?: boolean
}

/* ---------------- 视觉令牌（亮 / 暗两套，与晨雾松色系一致） ---------------- */

const chipColors = (darkMode: boolean) => ({
  text: darkMode ? "#d4d4d8" : "#3F3F46",
  hoverBg: darkMode ? "rgba(255,255,255,0.08)" : "rgba(24,24,27,0.05)",
  onBg: darkMode ? "rgba(0,148,86,0.18)" : "rgba(5,150,105,0.10)",
  onBgHover: darkMode ? "rgba(0,148,86,0.26)" : "rgba(5,150,105,0.16)",
  onText: darkMode ? "#6EE7B7" : "#047857",
})

const CHIP_BASE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  height: 30,
  padding: "0 9px",
  borderRadius: 8,
  border: "none",
  background: "transparent",
  fontSize: 13,
  fontWeight: 400,
  lineHeight: 1,
  whiteSpace: "nowrap",
  flexShrink: 0,
  cursor: "pointer",
  transition: "background .16s, color .16s",
}

export interface ModeChipProps {
  label: string
  icon: React.ReactNode
  darkMode?: boolean
  disabled?: boolean
  onClick: () => void
}

/**
 * 未选中的扁平能力胶囊 —— 对齐参考稿的「快速回答 / AI 生图 / 写作 / 解题…」：
 * 无边框、无底色，只有图标 + 文字；hover 才浮出一层极淡的灰底（参考稿里
 * 「深度研究」那枚被指到的形态）。
 */
export function ModeChip({ label, icon, darkMode = false, disabled = false, onClick }: ModeChipProps) {
  const C = chipColors(darkMode)
  return (
    <button
      type="button"
      disabled={disabled}
      title={`${label}：进入${label}模式`}
      onClick={onClick}
      className="sender-mode-chip"
      style={{
        ...CHIP_BASE,
        color: C.text,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = C.hoverBg }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
    >
      <span style={{ display: "inline-flex", opacity: 0.88, fontSize: 14, width: 14, justifyContent: "center" }}>
        {icon}
      </span>
      {/* min-width:0 + 省略号：左簇是 nowrap+overflow:hidden，窄到极限时宁可
          把某个名称截断，也绝不换行（换行会把整张卡的高度顶跳一档）。 */}
      <span className="sender-mode-chip__label" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
        {label}
      </span>
    </button>
  )
}

export interface ActiveModePillProps {
  label: string
  icon: React.ReactNode
  darkMode?: boolean
  onClear: () => void
}

/**
 * 已选中态 —— 对齐参考稿的「解题 ×」：淡绿底 + 墨绿字 + 尾部 16px 圆形 ×。
 *
 * 🚨 它**替代**整排能力胶囊出现在工具条里（参考稿就是这个行为：进入模式后
 *    其余能力全部收起），所以宽度天然只有一枚，空间问题自动消失。
 */
export function ActiveModePill({ label, icon, darkMode = false, onClear }: ActiveModePillProps) {
  const C = chipColors(darkMode)
  return (
    <span
      className="sender-mode-pill"
      data-mode-pill={label}
      style={{
        ...CHIP_BASE,
        padding: "0 4px 0 9px",
        gap: 5,
        background: C.onBg,
        color: C.onText,
        fontWeight: 500,
        cursor: "default",
      }}
    >
      <span style={{ display: "inline-flex", fontSize: 14, width: 14, justifyContent: "center" }}>{icon}</span>
      <span style={{ whiteSpace: "nowrap" }}>{label}</span>
      <button
        type="button"
        aria-label={`退出${label}模式`}
        title={`退出${label}模式`}
        /* className 是给 sender 的 CSS 用的：footer 里有一条通配
           `button { height:auto !important }`（为沉浸光感的圆胶囊 chip 而写），
           会把这里 16px 的方形命中区压成 14px —— 靠这个类把高度顶回来。 */
        className="sender-mode-pill__x"
        /* 阻止 mousedown 默认行为：否则点 × 会先把 textarea 的焦点抢走，
           失焦 → sender 收起 → 用户看到「点 × 之后输入框缩回去了」的鬼影。 */
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClear}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 16,
          height: 16,
          marginLeft: 1,
          padding: 0,
          border: "none",
          borderRadius: 999,
          background: "transparent",
          color: "inherit",
          opacity: 0.62,
          cursor: "pointer",
          transition: "background .15s, opacity .15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "1"
          e.currentTarget.style.background = C.onBgHover
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "0.62"
          e.currentTarget.style.background = "transparent"
        }}
      >
        <IconClose size={10} strokeWidth={2.4} />
      </button>
    </span>
  )
}

/**
 * 能力行 —— 有选中项就只渲染那一枚（绿色胶囊 + ×），否则铺开整排扁平胶囊。
 * sender 的工具条与落地页首屏的输入卡共用这一个组件，形态永不发散。
 */
export function SenderModeRow({
  modes,
  activeKey,
  darkMode = false,
  disabled = false,
  onEnter,
  onExit,
}: {
  modes: SenderModeItem[]
  activeKey?: string | null
  darkMode?: boolean
  disabled?: boolean
  onEnter: (mode: SenderModeItem) => void
  onExit: () => void
}) {
  const active = activeKey ? modes.find((m) => m.key === activeKey) : null
  if (active) {
    return <ActiveModePill label={active.label} icon={active.icon} darkMode={darkMode} onClear={onExit} />
  }
  return (
    <>
      {modes.map((m) => (
        <ModeChip
          key={m.key}
          label={m.label}
          icon={m.icon}
          darkMode={darkMode}
          disabled={disabled}
          onClick={() => onEnter(m)}
        />
      ))}
    </>
  )
}
