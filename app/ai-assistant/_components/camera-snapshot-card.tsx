"use client"

/**
 * 📷 摄像头快照卡（Camera Snapshot Card）
 *
 * ── 为什么需要它（2026-10-16）──
 * AI 调 `take_camera_snapshot` / `move_camera_and_look` 后，服务端用 ffmpeg 抓帧，
 * 结果随 SSE `tool_result.result.images` 回到浏览器。此前前端只把它塞进 studioData，
 * **没有任何地方渲染** —— 用户说"给我看看棚里"，AI 也真去抓了，但画面上根本没有图。
 *
 * 这里给出对话流里的展示形态：**画面为主角**（用户上传的原图仍走 168px 小预览，
 * 那是诊断卡底图凭据），支持点击看大图与下载 —— "发给用户"得能拿走才算数。
 *
 * ── 形态（2026-10-18 改版：用户反馈「卡片太丑了」）──
 * 旧版是「白色头部条（摄像头 B · 19:44 + 两个小图标）+ 满宽画面」的**一层白卡**。
 * 问题在于它把两种材质硬拼在一起：一条白纸条无缝压在黑色画面上 —— 夜间监控画面
 * 尤其像"贴了张标签的黑板"；而且头部与画面同宽，视觉重心全跑到了那条白条上。
 *
 * 现在改成 **裸画面 + 图下一行图注**：
 *   · 画面自己就是卡片（rounded-2xl + 淡 ring），不给它套底色框；
 *   · 元信息退到画面**下方**一行（12px 图标 + 12px 文字），像照片的图注；
 *   · 操作仍是两枚**裸图标**（24×24 热区，hover 才起淡底），⛔ 不再画成按钮框。
 * 这样无论画面是白天亮景还是夜间几乎全黑，卡片都不会出现"两块颜色打架"。
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { IconCamera, IconDownload, IconClose } from "@/components/icon"

export interface CameraSnapshotCardProps {
  /** 画面（dataURL 或同源 URL） */
  dataUrl: string
  /** 摄像头编号（a / b） */
  camera: "a" | "b"
  /** 抓帧时间戳（ms），仅用于页脚展示 */
  capturedAt?: number
  className?: string
}

/** 抓帧时刻 → 「19:12」/「昨天 19:12」/「10-14 19:12」 */
function formatCapturedAt(ts?: number): string {
  if (!ts) return ""
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ""
  const time = d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
  const now = new Date()
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (sameDay(d, now)) return time
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (sameDay(d, yesterday)) return `昨天 ${time}`
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${time}`
}

/** 尽量给下载文件一个可读名字：camera-a_20261016_1912.jpg */
function buildFileName(camera: "a" | "b", ts?: number): string {
  const d = ts ? new Date(ts) : new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const stamp =
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_` +
    `${pad(d.getHours())}${pad(d.getMinutes())}`
  // dataURL 的 mime → 扩展名（默认 jpg，服务端 ffmpeg 固定输出 jpeg）
  return `camera-${camera}_${stamp}.jpg`
}

export function CameraSnapshotCard({ dataUrl, camera, capturedAt, className }: CameraSnapshotCardProps) {
  const [open, setOpen] = React.useState(false)
  const label = camera.toUpperCase()
  const time = formatCapturedAt(capturedAt)
  const fileName = buildFileName(camera, capturedAt)

  const iconBtn = cn(
    "inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-400",
    "transition-colors hover:bg-zinc-900/[0.05] hover:text-zinc-600",
    "dark:text-zinc-500 dark:hover:bg-white/[0.06] dark:hover:text-zinc-300",
  )

  return (
    <>
      {/* 上 4px / 下 12px：上方是"这是摄像头 A 的实时画面："那句引导语（同一轮工具产物），
          要贴紧它成组；下方留给气泡的反馈行，需要多一点呼吸。 */}
      <div data-camera-snapshot={camera} className={cn("mb-3 mt-1 w-full max-w-[420px]", className)}>
        {/* 画面本体：整帧可见（object-contain），不裁切 —— 用户要判断的就是完整画面。
            它自己就是容器，不再套白底框。深色画面用深底垫住 letterbox 区，
            避免竖构图时露出白色空槽。 */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="点击查看大图"
          className={cn(
            "block w-full cursor-zoom-in overflow-hidden rounded-2xl bg-zinc-100",
            "ring-1 ring-zinc-900/[0.08] transition-shadow hover:ring-zinc-900/20",
            "dark:bg-zinc-950/60 dark:ring-white/10 dark:hover:ring-white/20",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            data-snapshot-img="card"
            src={dataUrl}
            alt={`摄像头 ${label} 实时画面`}
            className="block h-auto max-h-[320px] w-full object-contain"
          />
        </button>

        {/* 图注：一行元信息（图标 12 / 文字 12），右侧两枚裸图标。
            ⛔ 不要再把它做成"头部条"塞到画面上方 —— 那正是旧版难看的来源。 */}
        <div data-snapshot-meta className="mt-1.5 flex items-center gap-1.5 px-0.5">
          <IconCamera size={12} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="shrink-0 text-[12px] font-medium text-zinc-600 dark:text-zinc-300">
            摄像头 {label}
          </span>
          {time && (
            <>
              <span className="shrink-0 text-[11px] text-zinc-300 dark:text-zinc-600">·</span>
              <span className="shrink-0 text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">{time}</span>
            </>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-0.5">
            {/* ⛔ 不要再加「看大图」按钮 —— 画面本身就是一个 button，点图即开大图。
                这里只留「下载」这一个动作（"发给用户"得能拿走才算数）。 */}
            <a href={dataUrl} download={fileName} data-snapshot-action="download" className={iconBtn} title="下载这张画面">
              <IconDownload size={13} />
            </a>
          </div>
        </div>
      </div>

      {/* 大图浮层：整帧铺满视口高度，仍可下载 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "flex max-w-[92vw] items-center justify-center border-0 bg-transparent p-0 shadow-none",
            "[&>button]:hidden",
          )}
        >
          <DialogTitle className="sr-only">摄像头 {label} 实时画面</DialogTitle>
          <div className="relative max-h-[86vh] max-w-[92vw]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              data-snapshot-img="full"
              src={dataUrl}
              alt={`摄像头 ${label} 实时画面`}
              className="block max-h-[86vh] w-auto max-w-[92vw] rounded-xl object-contain"
            />
            <div className="absolute right-2 top-2 flex items-center gap-1.5">
              <a
                href={dataUrl}
                download={fileName}
                className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-black/55 px-2.5 text-[12px] text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                title="下载这张画面"
              >
                <IconDownload size={13} />
                下载
              </a>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                title="关闭"
              >
                <IconClose size={14} />
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
