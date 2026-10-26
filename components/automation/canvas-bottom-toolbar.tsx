"use client"

import { Panel, useReactFlow } from "@xyflow/react"
import { Tooltip, Dropdown } from "antd"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { IconDelete, IconFullScreenOne, IconMinus, IconMoon, IconPlus, IconRedo, IconShare, IconSun, IconUndo } from "@/components/icon";
interface CanvasBottomToolbarProps {
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onDelete: () => void
  selectedCount: number
}

/**
 * 画布底部右下浮动工具条：删除所选 / 缩放 / 适配 / 主题 / 撤销重做
 */
export function CanvasBottomToolbar({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onDelete,
  selectedCount,
}: CanvasBottomToolbarProps) {
  const { zoomIn, zoomOut, fitView, getZoom } = useReactFlow()
  const { theme, setTheme } = useTheme()

  const zoomPercent = Math.round(getZoom() * 100)

  const isDark = theme === "dark"

  const IconBtn = ({
    tip,
    onClick,
    disabled,
    active,
    children,
  }: {
    tip: string
    onClick: () => void
    disabled?: boolean
    active?: boolean
    children: React.ReactNode
  }) => (
    <Tooltip title={tip} mouseEnterDelay={0.5}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "nodrag flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-300 transition-colors",
          active
            ? "bg-[#059669]/10 text-[#059669] dark:text-[#10B981]"
            : "hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
          disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
        )}
      >
        {children}
      </button>
    </Tooltip>
  )

  return (
    <Panel position="bottom-right" className="!m-4">
      <div className="nodrag pointer-events-auto flex items-center gap-1 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 px-1.5 py-1 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.35)]">
        {/* 删除所选（节点 / 连线） */}
        <button
          type="button"
          onClick={onDelete}
          disabled={selectedCount === 0}
          className={cn(
            "nodrag flex h-8 items-center justify-center gap-1 rounded-lg px-2 text-[12px] font-medium transition-colors",
            selectedCount > 0
              ? "text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              : "text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
          )}
        >
          <IconDelete className="h-4 w-4" />
          {selectedCount > 0 && (
            <span className="tabular-nums text-[11px]">{selectedCount}</span>
          )}
        </button>

        <div className="mx-0.5 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />

        {/* 分享 / 导出 */}
        <IconBtn tip="分享 / 导出" onClick={() => alert("导出功能待接入")}>
          <IconShare className="h-4 w-4" />
        </IconBtn>

        <div className="mx-0.5 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />

        {/* 缩放 */}
        <IconBtn tip="缩小" onClick={() => zoomOut({ duration: 150 })}>
          <IconMinus className="h-4 w-4" />
        </IconBtn>

        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              { key: "50", label: "50%" },
              { key: "75", label: "75%" },
              { key: "100", label: "100%（默认）" },
              { key: "125", label: "125%" },
              { key: "150", label: "150%" },
            ],
            onClick: ({ key }) => {
              // 简化：通过 fitView 适配，再用 setViewport
              // ReactFlow 没有直接 setZoom；用 fitView
              if (key === "100") fitView({ duration: 150, padding: 0.2 })
            },
          }}
        >
          <button
            type="button"
            className="nodrag flex h-8 min-w-[52px] items-center justify-center rounded-lg px-1.5 text-[12px] font-medium tabular-nums text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {zoomPercent}%
          </button>
        </Dropdown>

        <IconBtn tip="放大" onClick={() => zoomIn({ duration: 150 })}>
          <IconPlus className="h-4 w-4" />
        </IconBtn>

        <IconBtn tip="适配画布" onClick={() => fitView({ duration: 200, padding: 0.18 })}>
          <IconFullScreenOne className="h-4 w-4" />
        </IconBtn>

        <div className="mx-0.5 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />

        {/* 主题切换 */}
        <IconBtn
          tip="切换深色 / 浅色"
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {isDark ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />}
        </IconBtn>

        <div className="mx-0.5 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />

        {/* 撤销 / 重做 */}
        <IconBtn tip="撤销 (⌘Z)" onClick={onUndo} disabled={!canUndo}>
          <IconUndo className="h-4 w-4" />
        </IconBtn>
        <IconBtn tip="重做 (⌘⇧Z)" onClick={onRedo} disabled={!canRedo}>
          <IconRedo className="h-4 w-4" />
        </IconBtn>
      </div>
    </Panel>
  )
}
