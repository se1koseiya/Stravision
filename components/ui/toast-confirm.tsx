"use client"

import type { HTMLAttributes } from "react"
import { AnimatePresence, motion } from "framer-motion"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { IconCheckOne, IconInfo, IconLoading } from "@/components/icon"

/**
 * ToastConfirm —— 浮动确认胶囊（三态：待确认 / 执行中 / 已完成）
 *
 * 用于「AI 即将执行某个动作、需要用户先点一下确认」的场景（设备启停等）。
 * 形态参考 ToastSave：一枚胶囊，左半是状态图标 + 文案，右半（仅 initial 态）
 * 是「忽略 / 执行」两个圆角小按钮。
 *
 * ── 与模板的差异（已按本项目规范落地）──
 *   · 主题色：模板的 violet 渐变已替换为项目主色 `--primary`
 *     （亮 #059669 / 暗 #34D399，由 next-themes 驱动，勿再硬编码 violet）。
 *   · 图标：模板的 lucide `Check` / `Loader` 换成唯一图标源 `@/components/icon`
 *     （HarmonyOS Symbol 填充轮廓，`strokeWidth` 无效）。
 *   · 按钮：复用已存在的 shadcn `@/components/ui/button`，只覆盖尺寸与圆角。
 *   · 字阶：模板的 13px 对齐项目 12px 档。
 *
 * 🚨 **不要给外层加 `animate={{ width: "auto" }}`**（模板原写法）。
 *    framer-motion 对 `auto` 的处理是「先测量当前布局、再动画到该像素值」，而测量
 *    发生在按钮区自身还在 `width: 0` 首帧时 → 量到的是「没有按钮」的宽度，
 *    胶囊从此卡在窄宽度上，`overflow-hidden` 会把「忽略 / 执行」整块裁掉。
 *    实测（`_probe_ctrl_toast.cjs`，light 下 93px / 按钮区 clientWidth=0，dark 下才 197px）。
 *    现在宽度完全交给 `inline-flex` 内容驱动，三态切换用透明度过渡 —— 无测量、无卡死。
 *
 * 🚨 本组件是**浮层**（内容驱动高度/宽度），调用方不要再给它套死宽高，
 *    也不要加 `truncate`（文案必须完整可读）。
 */
interface ToastConfirmProps extends HTMLAttributes<HTMLDivElement> {
  /** 卡片状态：initial=待确认，loading=执行中，success=已完成 */
  state: "initial" | "loading" | "success"
  /** 左键（忽略 / 取消）回调，仅 initial 态可点 */
  onReset?: () => void
  /** 右键（执行 / 确认）回调，仅 initial 态可点 */
  onSave?: () => void
  /** 执行中文案 */
  loadingText?: string
  /** 已完成文案 */
  successText?: string
  /** 待确认文案 */
  initialText?: string
  /** 左键文案 */
  resetText?: string
  /** 右键文案 */
  saveText?: string
  /** 禁用执行键 */
  saveDisabled?: boolean
}

/** 内容三态互斥切换的过渡时长（够快，不拖沓） */
const FADE = { duration: 0.14, ease: "easeOut" as const }

export function ToastConfirm({
  state = "initial",
  onReset,
  onSave,
  loadingText = "执行中",
  successText = "已完成",
  initialText = "待确认",
  resetText = "忽略",
  saveText = "执行",
  saveDisabled = false,
  className,
  ...props
}: ToastConfirmProps) {
  return (
    <div
      data-toast-confirm={state}
      className={cn(
        "inline-flex h-10 items-center justify-center overflow-hidden rounded-full",
        "border border-black/[0.08] bg-background/95 backdrop-blur dark:border-white/[0.08]",
        "shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_8px_16px_-4px_rgba(0,0,0,0.1)]",
        "dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_16px_-4px_rgba(0,0,0,0.2)]",
        className,
      )}
      {...props}
    >
      <div className="flex h-full items-center justify-between px-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={state}
            className="flex items-center gap-2 text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={FADE}
          >
            {state === "loading" && (
              <>
                <IconLoading size={14} className="animate-spin text-foreground/70" />
                <span className="whitespace-nowrap text-[12px] font-normal leading-tight">
                  {loadingText}
                </span>
              </>
            )}
            {state === "success" && (
              <>
                <span className="flex items-center justify-center gap-1.5 overflow-hidden rounded-full border border-emerald-500/20 bg-emerald-500/10 p-0.5 shadow-sm dark:border-emerald-500/25 dark:bg-emerald-500/25">
                  <IconCheckOne size={12} className="text-emerald-600 dark:text-emerald-400" />
                </span>
                <span className="whitespace-nowrap text-[12px] font-normal leading-tight">
                  {successText}
                </span>
              </>
            )}
            {state === "initial" && (
              <>
                <IconInfo size={15} className="shrink-0 text-foreground/80" />
                <span className="whitespace-nowrap text-[12px] font-normal leading-tight">
                  {initialText}
                </span>
              </>
            )}
          </motion.div>
        </AnimatePresence>
        <AnimatePresence initial={false}>
          {state === "initial" && (
            <motion.div
              className="ml-2 flex items-center gap-2"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={FADE}
            >
              <Button
                type="button"
                variant="ghost"
                onClick={onReset}
                className="h-7 rounded-full px-3 py-0 text-[12px] font-normal transition-colors hover:bg-muted/80"
              >
                {resetText}
              </Button>
              <Button
                type="button"
                disabled={saveDisabled}
                onClick={onSave}
                /* 主题色 = shadcn 默认 variant（bg-primary / text-primary-foreground），
                   随 next-themes 在亮 #059669 与暗 #34D399 之间自动切换 */
                className={cn(
                  "h-7 rounded-full px-3 py-0 text-[12px] font-medium",
                  "shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.4)] dark:shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.2)]",
                  "transition-all duration-200",
                )}
              >
                {saveText}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
