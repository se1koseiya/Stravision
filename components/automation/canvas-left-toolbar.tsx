"use client"

import { Tooltip } from "antd"
import { cn } from "@/lib/utils"
import { IconAiming, IconComment, IconHandUp, IconRedo, IconUndo } from "@/components/icon";
export type CanvasTool = "select" | "hand" | "comment"

interface CanvasLeftToolbarProps {
  tool: CanvasTool
  onToolChange: (tool: CanvasTool) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

interface ToolButtonProps {
  active: boolean
  onClick: () => void
  tip: string
  children: React.ReactNode
}

function ToolButton({ active, onClick, tip, children }: ToolButtonProps) {
  return (
    <Tooltip placement="right" title={tip} mouseEnterDelay={0.4}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "nodrag group relative flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200",
          active
            ? "bg-[#059669] text-white shadow-[0_2px_6px_rgba(0,148,86,0.25)]"
            : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
        )}
      >
        {children}
      </button>
    </Tooltip>
  )
}

/**
 * 画布左侧垂直工具栏（选择 / 手型平移 / 便签 + 撤销重做）
 */
export function CanvasLeftToolbar({
  tool,
  onToolChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: CanvasLeftToolbarProps) {
  return (
    <div className="nodrag pointer-events-auto flex w-[52px] flex-col items-center gap-1 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 py-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]">
      {/* Logo 占位 */}
      <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#059669] to-[#10B981] text-white text-[14px] font-semibold">
        S
      </div>

      <div className="h-px w-7 bg-zinc-200 dark:bg-zinc-700" />

      <ToolButton
        tip="选择 (V)"
        active={tool === "select"}
        onClick={() => onToolChange("select")}
      >
        <IconAiming className="h-[18px] w-[18px]" />
      </ToolButton>

      <ToolButton
        tip="手型 · 平移画布 (H)"
        active={tool === "hand"}
        onClick={() => onToolChange("hand")}
      >
        <IconHandUp className="h-[18px] w-[18px]" />
      </ToolButton>

      <ToolButton tip="便签" active={tool === "comment"} onClick={() => onToolChange("comment")}>
        <IconComment className="h-[18px] w-[18px]" />
      </ToolButton>

      <div className="mt-auto flex flex-col gap-1">
        <div className="h-px w-7 bg-zinc-200 dark:bg-zinc-700 mb-1" />
        <ToolButton
          tip="撤销 (⌘Z)"
          active={false}
          onClick={onUndo}
        >
          <IconUndo
            className={cn("h-[18px] w-[18px]", !canUndo && "opacity-40")}
          />
        </ToolButton>
        <ToolButton
          tip="重做 (⌘⇧Z)"
          active={false}
          onClick={onRedo}
        >
          <IconRedo
            className={cn("h-[18px] w-[18px]", !canRedo && "opacity-40")}
          />
        </ToolButton>
      </div>
    </div>
  )
}
