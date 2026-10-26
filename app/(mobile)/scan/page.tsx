"use client"

/**
 * 移动端「扫一扫」（2026-10-05 原型重写）
 * ---------------------------------------------------------------------------
 * 原型底部第 3 tab。用途：**扫码添加设备**（与「我的」页的「扫一扫添加设备」同一条路）。
 *
 * 🚨 关键约束（与项目既有实现对齐）：
 *  - 设备真相源是 `/api/devices` + DeviceProvider（写后广播 `berry:devices-changed`），
 *    扫码成功后必须 `refreshDevices()`，不能自己维护一份设备列表。
 *  - 摄像头取景需要 https 或 localhost；非安全上下文下 `getUserMedia` 直接 undefined，
 *    所以要能优雅退回到「手动输入设备编号」。
 *  - `BarcodeDetector` 只有部分安卓 Chrome 支持；不支持时不要假装能扫，直接给手动入口。
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/lib/ui/feedback"
import { cn } from "@/lib/utils"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import {
  EmptyHint,
  MOBILE_CANVAS,
  MobileHeader,
  Tag,
  hairline,
  mobileCard,
} from "@/components/mobile/mobile-shell"
import { IconCamera, IconEdit, IconScan, IconScanCode } from "@/components/icon"

type ScannerState = "idle" | "starting" | "scanning" | "unsupported" | "denied"

export default function MobileScanPage() {
  const router = useRouter()
  const { allDevices, refreshDevices } = useDeviceData()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const detectorRef = useRef<any>(null)

  const [state, setState] = useState<ScannerState>("idle")
  const [manual, setManual] = useState("")
  const [match, setMatch] = useState<{ id: string; name: string } | null>(null)

  const stop = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  useEffect(() => stop, [stop])

  /**
   * 扫到一串文本 → 与设备注册表比对。
   * 🚨 直接在 `allDevices`（DeviceProvider 已拉到内存）里匹配，不再打 API：
   * `/api/devices` 只支持 `type` / `includeDisabled`，没有 `q` 参数，
   * 多打一次请求既拿不到过滤结果、又让 DeviceProvider 与本地状态两份数据不一致。
   */
  const resolve = useCallback(
    async (raw: string) => {
      const code = raw.trim()
      if (!code) return
      const lower = code.toLowerCase()
      const hit = allDevices.find(
        (d) =>
          String(d.node_id ?? "").toLowerCase() === lower ||
          String(d.name ?? "").toLowerCase() === lower ||
          String(d.id) === code
      )
      if (hit) {
        setMatch({ id: String(hit.id), name: hit.name })
        await refreshDevices()
        toast.success(`已识别设备：${hit.name}`)
        return
      }
      // 注册表里没有 → 标记为待新增（真正的新增在设备管理里做，那里才有权限校验与表单）
      setMatch({ id: code, name: code })
    },
    [allDevices, refreshDevices]
  )

  const start = useCallback(async () => {
    setState("starting")
    stop()

    const md = typeof window !== "undefined" ? (window as any).BarcodeDetector : null
    const media = navigator.mediaDevices?.getUserMedia
    if (!md || !media) {
      setState("unsupported")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }

      const detector = new md({ formats: ["qr_code", "code_128", "code_39", "ean_13"] })
      detectorRef.current = detector
      setState("scanning")

      const tick = async () => {
        if (!videoRef.current || !detectorRef.current) return
        try {
          const codes = await detectorRef.current.detect(videoRef.current)
          if (codes && codes.length > 0) {
            const value = codes[0]?.rawValue
            if (value) {
              stop()
              setState("idle")
              await resolve(value)
              return
            }
          }
        } catch {
          /* 单帧识别失败忽略，继续下一帧 */
        }
        rafRef.current = requestAnimationFrame(() => void tick())
      }
      rafRef.current = requestAnimationFrame(() => void tick())
    } catch (e) {
      setState("denied")
    }
  }, [resolve, stop])

  return (
    <div className={cn("flex min-h-dvh w-full flex-col", MOBILE_CANVAS)}>
      <MobileHeader title="扫一扫" />

      <main className="flex flex-1 flex-col gap-4 px-4 pb-28" data-lenis-prevent>
        {/* 取景区 */}
        <div className="relative mt-1 aspect-[3/4] w-full overflow-hidden rounded-2xl bg-zinc-900">
          <video ref={videoRef} playsInline muted className="size-full object-cover" />

          {/* 取景框：四角标记 + 扫描线 */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-[16%] rounded-2xl border-2 border-emerald-400/90" />
            <div className="absolute inset-x-[16%] top-[16%] h-px animate-pulse bg-emerald-400" />
            <div className="absolute inset-0 grid place-items-center">
              <span className="rounded-full bg-black/45 px-3 py-1 text-[12px] text-white/90">
                {state === "scanning"
                  ? "把设备二维码放进取景框"
                  : state === "starting"
                    ? "正在启动摄像头…"
                    : state === "denied"
                      ? "摄像头权限被拒绝，可用下方手动输入"
                      : state === "unsupported"
                        ? "当前浏览器不支持扫码，请用下方手动输入"
                        : "点击下方按钮开始扫码"}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => (state === "scanning" ? (stop(), setState("idle")) : void start())}
          className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-emerald-600 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(5,150,105,0.28)] active:scale-[0.98] transition-transform"
        >
          <IconScan className="size-5 self-center" />
          <span className="self-center">{state === "scanning" ? "停止扫码" : "开始扫码"}</span>
        </button>

        {/* 手动输入（不支持扫码 / 无摄像头时的唯一可用路径） */}
        <div className={mobileCard("px-3.5 py-1")}>
          <div className="flex items-center gap-2.5 py-3">
            <IconEdit className="size-4 shrink-0 self-center text-zinc-400" />
            <input
              value={manual}
              onChange={(e) => {
                setManual(e.target.value)
                setMatch(null)
              }}
              placeholder="手动输入设备编号"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-zinc-800 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
            />
            <button
              type="button"
              disabled={!manual.trim()}
              onClick={() => void resolve(manual)}
              className="shrink-0 self-center rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[12px] font-medium text-emerald-700 disabled:opacity-40 dark:bg-emerald-500/15 dark:text-emerald-300"
            >
              识别
            </button>
          </div>
        </div>

        {/* 识别结果 */}
        {match && (
          <div className={cn(mobileCard(), "px-3.5 py-3")}>
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                <IconScanCode className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-zinc-800 dark:text-zinc-100">{match.name}</p>
                <p className="mt-0.5 truncate text-[12px] text-zinc-500 dark:text-zinc-400">编号 {match.id}</p>
              </div>
              <Tag tone={allDevices.some((d) => String(d.id) === match.id) ? "ok" : "warn"}>
                {allDevices.some((d) => String(d.id) === match.id) ? "已注册" : "未注册"}
              </Tag>
            </div>
            <p className="mt-2.5 text-[12px] leading-5 text-zinc-500 dark:text-zinc-400">
              {allDevices.some((d) => String(d.id) === match.id)
                ? "该设备已在注册表中，可在设备管理里查看与控制。"
                : "注册表里没有这台设备。新增需要管理员权限，可在「我的 → 设备管理」里绑定。"}
            </p>
          </div>
        )}

        {/* 已注册设备速览 */}
        <div className={mobileCard("px-3.5 py-1")}>
          <div className="flex items-center gap-2 py-3">
            <IconEdit className="size-4 shrink-0 self-center text-zinc-400" />
            <span className="flex-1 text-[13px] font-medium text-zinc-700 dark:text-zinc-200">已注册设备</span>
            <Tag tone="neutral">{allDevices.length}</Tag>
          </div>
          {allDevices.length === 0 ? (
            <EmptyHint icon={<IconCamera className="size-7" />} text="还没有注册任何设备" />
          ) : (
            <>
              {hairline()}
              <ul>
                {allDevices.slice(0, 6).map((d) => (
                  <li key={d.id} className="flex items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-700 dark:text-zinc-200">
                      {d.name}
                    </span>
                    <span className="shrink-0 text-[11px] text-zinc-400">{d.category}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => router.push("/devices")}
                className="w-full border-t border-zinc-200/70 py-3 text-[13px] font-medium text-emerald-600 dark:border-white/8 dark:text-emerald-400"
              >
                查看全部设备
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
