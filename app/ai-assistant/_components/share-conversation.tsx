"use client"

/**
 * ↗ 分享对话
 *
 * 形态对齐 WorkBuddy：顶栏一枚分享图标 → 底部升起一张宽卡：
 *   ┌──────────────────────────────────────────────┐
 *   │ ☑ 全选                                    ✕  │
 *   │ ☑ ┌────────────────────────────────────────┐ │
 *   │   │ 消息内容（截断展示，可勾选）              │ │
 *   │   └────────────────────────────────────────┘ │
 *   │      …可滚动…                                │
 *   ├──────────────────────────────────────────────┤
 *   │  (微信)(企微)(朋友圈)(复制链接)(二维码)(浏览器) ✕ │
 *   └──────────────────────────────────────────────┘
 *
 * ## 动作的诚实边界
 *
 * 「分享到微信 / 企业微信 / 朋友圈」在网页里没有 JS-SDK 授权就走不通
 * （那需要公众号配置与签名后端）。这里不装死按钮：
 * 三个目标都执行「复制所选对话为文本」，再提示去对应 App 粘贴 ——
 * 用户的真实意图（把这段对话发给朋友）达成了，且不会被一个灰按钮卡住。
 * 链接类动作（复制链接 / 二维码 / 浏览器打开）只在**非临时会话**时可用：
 * 临时对话不落库，生成一个打不开的链接是在骗人。
 */

import * as React from "react"
import { Modal, QRCode as AntQRCode } from "antd"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/ui/feedback"
import {
  IconClose,
  IconComment,
  IconComments,
  IconEarth,
  IconGlobe,
  IconLink,
  IconScanCode,
  IconShare,
} from "@/components/icon"
import type { SearchableMessage } from "./conversation-search"

interface ShareTarget {
  key: string
  label: string
  Icon: React.ComponentType<{ size?: number }>
  run: () => void
}

export function ShareConversationButton({
  messages,
  sessionId,
  darkMode,
}: {
  messages: SearchableMessage[]
  sessionId: string | null
  darkMode: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<Set<number>>(new Set())
  const [qrOpen, setQrOpen] = React.useState(false)

  // 每次打开默认全选（分享的意图几乎总是"整个对话"）
  React.useEffect(() => {
    if (open) setSelected(new Set(messages.map((_, i) => i)))
  }, [open, messages])

  const shareable = Boolean(sessionId) && !String(sessionId).startsWith("__temp__")
  const shareLink = shareable && typeof window !== "undefined"
    ? `${window.location.origin}/ai-assistant?session=${encodeURIComponent(sessionId!)}`
    : ""

  const pickText = () =>
    messages
      .filter((_, i) => selected.has(i))
      .map(m => `${m.role === "user" ? "我" : "AI"}：${String(m.content ?? "").trim()}`)
      .join("\n\n")

  const copy = async (text: string, okTip: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(okTip)
    } catch {
      toast.error("复制失败，请手动选择内容复制")
    }
  }

  const targets: ShareTarget[] = [
    {
      key: "wechat",
      label: "分享到微信",
      Icon: IconComments,
      run: () => void copy(pickText(), "对话已复制，打开微信粘贴即可分享"),
    },
    {
      key: "wecom",
      label: "分享到企业微信",
      Icon: IconComment,
      run: () => void copy(pickText(), "对话已复制，打开企业微信粘贴即可分享"),
    },
    {
      key: "moments",
      label: "分享到朋友圈",
      Icon: IconEarth,
      run: () => void copy(pickText(), "对话已复制，可粘贴到朋友圈或笔记"),
    },
    {
      key: "link",
      label: "复制链接",
      Icon: IconLink,
      run: () =>
        shareLink
          ? void copy(shareLink, "链接已复制")
          : toast.error("临时对话不落库，无法生成分享链接"),
    },
    {
      key: "qrcode",
      label: "生成二维码",
      Icon: IconScanCode,
      run: () =>
        shareLink
          ? setQrOpen(true)
          : toast.error("临时对话不落库，无法生成分享链接"),
    },
    {
      key: "browser",
      label: "浏览器打开",
      Icon: IconGlobe,
      run: () =>
        shareLink
          ? window.open(shareLink, "_blank")
          : toast.error("临时对话不落库，无法生成分享链接"),
    },
  ]

  const allSelected = messages.length > 0 && selected.size === messages.length

  const toggle = (i: number) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-conversation-share-trigger
        title="分享对话"
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500",
          "transition-colors hover:bg-zinc-900/[0.06] hover:text-zinc-700",
          "dark:text-zinc-400 dark:hover:bg-white/[0.08] dark:hover:text-zinc-200",
        )}
      >
        <IconShare size={16} />
      </button>

      {/* ── 底部升起卡 ── */}
      {open ? (
        <div className="fixed inset-0 z-[1150] flex items-end justify-center" data-conversation-share>
          {/* 点遮罩不关：分享是带勾选状态的操作，误触丢失勾选比多按一次 ✕ 更烦 */}
          <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" />

          <div
            className={cn(
              "relative mb-0 w-full max-w-[900px] overflow-hidden rounded-t-2xl",
              "bg-white shadow-2xl dark:bg-zinc-900",
              "animate-in slide-in-from-bottom-4 fade-in duration-300",
            )}
          >
            {/* 头部：全选 + 关闭 */}
            <div className="flex items-center gap-3 border-b border-zinc-100 px-6 py-3 dark:border-white/[0.06]">
              <label className="flex cursor-pointer select-none items-center gap-2 text-[13px] text-zinc-600 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() =>
                    setSelected(allSelected ? new Set() : new Set(messages.map((_, i) => i)))
                  }
                  className="h-4 w-4 accent-emerald-600"
                />
                全选
              </label>
              <span className="text-[12px] text-zinc-400 dark:text-zinc-500">
                已选 {selected.size}/{messages.length} 条
              </span>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                title="关闭"
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500",
                  "transition-colors hover:bg-zinc-900/[0.05] hover:text-zinc-700",
                  "dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200",
                )}
              >
                <IconClose size={15} />
              </button>
            </div>

            {/* 消息卡列表 */}
            <div className="max-h-[44vh] overflow-y-auto px-6 py-4" data-conversation-share-list>
              <div className="flex flex-col gap-3">
                {messages.map((m, i) => (
                  <label
                    key={i}
                    className="flex cursor-pointer items-start gap-3"
                    data-conversation-share-item={i}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggle(i)}
                      className="mt-1.5 h-4 w-4 shrink-0 accent-emerald-600"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-[12px] text-zinc-400 dark:text-zinc-500">
                        {m.role === "user" ? "我" : "AI"}
                      </p>
                      <div
                        className={cn(
                          "rounded-xl px-4 py-2.5 text-[13px] leading-[1.7] text-zinc-700",
                          "bg-zinc-100/80 dark:bg-white/[0.06] dark:text-zinc-200",
                        )}
                      >
                        <p className="line-clamp-4 whitespace-pre-wrap break-words">
                          {String(m.content ?? "").trim() || "（这条消息没有文本内容）"}
                        </p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 底部：分享目标 */}
            <div className="flex items-start gap-2 border-t border-zinc-100 px-6 py-4 dark:border-white/[0.06]">
              {targets.map(({ key, label, Icon, run }) => (
                <button
                  key={key}
                  type="button"
                  onClick={run}
                  data-conversation-share-target={key}
                  className={cn(
                    "flex w-[76px] flex-col items-center gap-1.5 rounded-xl py-2",
                    "transition-colors hover:bg-zinc-900/[0.04] dark:hover:bg-white/[0.05]",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-full",
                      "bg-zinc-100 text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300",
                    )}
                  >
                    <Icon size={19} />
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{label}</span>
                </button>
              ))}
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={cn(
                  "inline-flex h-11 w-11 items-center justify-center rounded-full text-zinc-500",
                  "transition-colors hover:bg-zinc-900/[0.05] hover:text-zinc-700",
                  "dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200",
                )}
                title="关闭"
              >
                <IconClose size={17} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 二维码 */}
      <Modal
        open={qrOpen}
        onCancel={() => setQrOpen(false)}
        footer={null}
        title="扫码打开这段对话"
        width={320}
        centered
      >
        <div className="flex flex-col items-center gap-3 py-2">
          {shareLink ? <AntQRCode value={shareLink} size={220} /> : null}
          <p className="text-[12px] text-zinc-400 dark:text-zinc-500">
            需要登录同一账号后才能查看
          </p>
        </div>
      </Modal>
    </>
  )
}
