"use client"

import { Tooltip } from "antd"
import {
  CursorArrowRaysIcon,
  HandRaisedIcon,
  ChatBubbleLeftRightIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
} from "@heroicons/react/24/outline"
import { cn } from "@/lib/utils"

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
          "nodrag group relative flex h-10 w-10 items-center justify-center rounded-md transition-all duration-150",
          active
            ? "bg-[#1677ff] text-white shadow-[0_2px_6px_rgba(22,119,255,0.25)]"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
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
    <div className="nodrag pointer-events-auto flex w-[52px] flex-col items-center gap-1 rounded-xl border border-slate-200/80 bg-white py-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* Logo 占位 */}
      <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-[#1677ff] to-[#4096ff] text-white text-[15px] font-semibold">
        S
      </div>

      <div className="h-px w-7 bg-slate-200" />

      <ToolButton
        tip="选择 (V)"
        active={tool === "select"}
        onClick={() => onToolChange("select")}
      >
        <CursorArrowRaysIcon className="h-[18px] w-[18px]" />
      </ToolButton>

      <ToolButton
        tip="手型 · 平移画布 (H)"
        active={tool === "hand"}
        onClick={() => onToolChange("hand")}
      >
        <HandRaisedIcon className="h-[18px] w-[18px]" />
      </ToolButton>

      <ToolButton tip="便签" active={tool === "comment"} onClick={() => onToolChange("comment")}>
        <ChatBubbleLeftRightIcon className="h-[18px] w-[18px]" />
      </ToolButton>

      <div className="mt-auto flex flex-col gap-1">
        <div className="h-px w-7 bg-slate-200 mb-1" />
        <ToolButton
          tip="撤销 (⌘Z)"
          active={false}
          onClick={onUndo}
        >
          <ArrowUturnLeftIcon
            className={cn("h-[18px] w-[18px]", !canUndo && "opacity-40")}
          />
        </ToolButton>
        <ToolButton
          tip="重做 (⌘⇧Z)"
          active={false}
          onClick={onRedo}
        >
          <ArrowUturnRightIcon
            className={cn("h-[18px] w-[18px]", !canRedo && "opacity-40")}
          />
        </ToolButton>
      </div>
    </div>
  )
}
