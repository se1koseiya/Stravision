"use client"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import { CopilotSidebar } from "@/components/ai/copilot/copilot-sidebar"
import Image from "next/image"
import { IconAlarmClock, IconBox, IconCamera, IconCd, IconChartLine, IconClose, IconCloudStorage, IconCpu, IconDashboard, IconDown, IconFan, IconFullScreen, IconInfo, IconLeft, IconLight, IconLinkOut, IconLoading, IconLock, IconMicrophone, IconMonitor, IconMoon, IconMore, IconOffScreen, IconPlayOne, IconPlus, IconRefresh, IconRemind, IconRight, IconRound, IconSetting, IconSignal, IconSun, IconThermometer, IconUnlock, IconUp, IconVideo, IconVolumeMute, IconVolumeNotice, IconWater, IconWind, IconZoomIn, IconZoomOut } from "@/components/icon";

// 传感器指标不再配图标（2026-10-24）：4 个 12px 图标 × 标签 × 数值挤在 240px 宽的卡里
// 只是噪音，标签本身已经表意。原 SENSOR_METRIC_ICON_MAP / getSensorMetricIcon 已删，
// 需要恢复时从 git 历史取，别再往度量格里加小图标。

// 设备图标映射（设备注册表 icon 字段 → 组件）
const DEVICE_ICON_MAP: Record<string, typeof IconWater> = {
  IconThermometer, IconWater, IconFan, IconLight, IconSun, IconCloudStorage, IconVideo, IconCamera, IconChartLine, IconCpu, IconWind, IconSignal, IconDashboard, default: IconCpu,
}

function getDeviceIcon(iconName: string): typeof IconWater {
  return DEVICE_ICON_MAP[iconName] || DEVICE_ICON_MAP.default
}
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useFfmpegStatus, fetchFfmpegStatus } from "@/lib/hooks/use-ffmpeg-status"
import { useDeviceControl } from "@/lib/hooks/use-device-control"
import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import type { UserPublic } from "@/lib/db/user-service"
import { cn } from "@/lib/utils"
import { MembersPanel } from "@/components/monitor/members-panel"
import { ActivityPanel } from "@/components/monitor/activity-panel"
import { useTheme } from "next-themes"
import { toast } from "@/lib/ui/feedback"
import dynamic from "next/dynamic"
// 沉浸光感材质（HDS 组件材质 · HarmonyOS Immersive Light 的 Web 落地）：
// **唯一来源** = components/device/material-css.ts，与 /device-control、/dashboard 共用同一套
// 材质四件套（半透明底 + 背景模糊 + 1px 细边 + 柔和阴影）+ 档位 + 自适应等级。
// monitor 这里只负责「把组件挂上去」，不复制任何 --mat-* 数值。
import { ImmersiveCard } from "@/components/device/immersive-card"
import { MATERIAL_CSS } from "@/components/device/material-css"
import { useAdaptiveMaterialLevel } from "@/components/device/use-material-level"

const GreenhouseModel = dynamic(
  () => import("@/components/monitor/greenhouse-model").then((mod) => mod.GreenhouseModel),
  { 
    ssr: false,
    loading: () => (
      <div className="relative w-full h-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 rounded-[32px] overflow-hidden" />
    )
  }
)

const LiveStreamPlayer = dynamic(
  () => import("@/components/live-stream-player").then((mod) => mod.LiveStreamPlayer),
  { ssr: false }
)
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// 可用设备列表（来自 device-control）
const AVAILABLE_DEVICES = [
  { id: "relay5", name: "水泵/灌溉", relay: 5 as const, icon: "Droplets", color: { bg: "#E0F2F1", fg: "#009688", gradFrom: "#6EE7B7", gradTo: "#059669" } },
  { id: "relay6", name: "风扇/通风", relay: 6 as const, icon: "Fan", color: { bg: "#F4F4F5", fg: "#2196F3", gradFrom: "#C7D2FE", gradTo: "#52525B" } },
  { id: "relay7", name: "植物全光谱补光灯", relay: 7 as const, icon: "Lightbulb", color: { bg: "#F4F4F5", fg: "#52525B", gradFrom: "#FDE68A", gradTo: "#52525B" } },
  { id: "relay8", name: "光照植物补光灯", relay: 8 as const, icon: "Sun", color: { bg: "#F3E8FF", fg: "#52525B", gradFrom: "#DDD6FE", gradTo: "#52525B" } },
]

const ICON_MAP: Record<string, typeof IconWater> = {
  "Droplets": IconWater,
  "Fan": IconFan,
  "Lightbulb": IconLight,
  "Sun": IconSun,
}

interface EnvironmentControl {
  id: string
  name: string
  relay: 5 | 6 | 7 | 8
  icon: string
  color: { bg: string; fg: string; gradFrom: string; gradTo: string }
  battery: number
}

import { useDailyGreeting } from "@/lib/hooks/use-daily-greeting"
/* 🚨 2026-09-24：页面级语音球已移除 —— 语音统一走 Copilot 的 Call 态 */
import { DailyBriefingIsland } from "@/components/daily-briefing-island"

/* ==================== monitor 侧材质补充（不放任何 --mat-* 数值） ====================
   材质本体/档位/自适应等级都在 material-css.ts，这里只有本页需要的三样：
     ① 入场动效 .dc-rise
     ② 本页 hairline 变量（立层级用）
     ③ 「无容器信息网格」.mon-grid2
   ⚠️ 圆角只用鸿蒙六档（层级正相关）：4 / 8 / 12 / 16 / 20 / 32。
      与 device-control 的 --dc-r-* 同一套数值，但**不能**直接写 rounded-dc-shell ——
      那些变量只声明在 /device-control 的 .dc-scope 上，本页取到的是空值
      （`border-radius: var(--dc-r-shell)` → 无效 → 静默变成 0 圆角）。所以这里写字面量。
   ⚠️ 卡片悬停一律走 filter，**不要**用 Tailwind 的 shadow-* / ring-*
      —— 它们是 box-shadow，会被未分层材质规则（.dc-mat 的 box-shadow + inset 内缘光）
      整条覆盖掉，写了等于没写（ring 会直接消失）。状态改用 outline 表达。 */
const MONITOR_MATERIAL_CSS = `
/* —— 本页作用域：hairline（「一层容器」里唯一的立层级手段）—— */
.mon-scope{
  --mon-hair: rgba(60,60,67,.10);
  --mon-hair-2: rgba(60,60,67,.16);
}
.dark .mon-scope{
  --mon-hair: rgba(255,255,255,.10);
  --mon-hair-2: rgba(255,255,255,.16);
}
/* 分组小标题：HDS 用「字号 + 字重 + 三级文字色」立层级，不用色块 */
.mon-group-title{ font-size: 13px; font-weight: 600; letter-spacing: .01em; }
/* 卡内分区块标题之间的 hairline 分隔（右栏聚合面板用） */
.mon-sep{ border-top: 1px solid var(--mon-hair); }

/* —— 无容器信息网格（HDS「一层容器」的卡内网格）——
   卡里**不放**灰底格：用 hairline 十字分隔代替「格子套格子」。
   列分隔按 nth-child(even) 实现，所以**只对 2 列栅格成立**。
   与 device-control 的 .dc-plain-grid 是同一手法（那边叫「正面样板」）。 */
.mon-grid2{ display: grid; grid-template-columns: 1fr 1fr; }
.mon-grid2 > *{ min-width: 0; padding-block: 10px; }
.mon-grid2 > *:nth-child(even){ padding-left: 14px; border-left: 1px solid var(--mon-hair); }
.mon-grid2 > *:nth-child(n+3){ border-top: 1px solid var(--mon-hair); }

/* —— 右栏聚合面板的滚动条：交回全站统一段（原 6px / --mon-hair-2 私有定义已删，2026-10-11）—— */

/* —— 入场动效 —— */
@keyframes dcRiseIn{ from{ transform: translateY(10px) } }
.dc-rise{ animation: dcRiseIn .38s cubic-bezier(.22,.61,.36,1) backwards; }
@media (prefers-reduced-motion: reduce){
  .dc-rise{ animation: none !important; }
}

/* —— 浮层/弹层（portal 到 body，故不能挂在 .mon-scope 下）——
   ⚠️ 这两条刻意**手写 CSS 而不是 Tailwind 任意值类**（曾写 rounded-[28px] / bg-[rgba(...)]）：
      Tailwind dev 的增量扫描会漏掉新出现的任意值类，漏了不报错、只是静默不生效 ——
      实测弹窗圆角停在 sm:rounded-lg 的 10px（本该 28px），遮罩也完全没变。
      手写未分层 CSS 既绕开扫描，又天然盖过分层 utilities（同特异性下未分层优先）。
   ⚠️ 类名带 mon- 前缀且只在本页注入 → 不会外溢到别的页面。 */
.mon-float{ border-radius: 28px; }
.mon-float-overlay{
  background-color: rgba(0,0,0,.25);
  /* 接全站「材质厚度」档位（--dc-mat-scale 由 <html data-mat-level> 提供） */
  -webkit-backdrop-filter: blur(calc(3px * var(--dc-mat-scale, 1)));
  backdrop-filter: blur(calc(3px * var(--dc-mat-scale, 1)));
}
`

/* ==========================================================================
   列宽可调（2026-10-23 用户：「monitor 页面用户可以自己设置宽度」）
   ── 为什么是「左右两栏各自可拖」而不是整体一个缩放 ──
     本页是固定壳（h-screen + 三列），中间那列 3D 应该吃掉剩余空间；
     用户真正想调的是「左侧设备栏多宽 / 右侧面板多宽」这两件事。
   ── 落库 ──
     宽度写 localStorage（monitor.leftW / monitor.rightW），刷新/重启后保持。
     上下限按 HDS 的间隔档给：左 240~520（默认 320）、右 280~560（默认 360）。
   ========================================================================== */
const PANEL_DEFAULT = { left: 320, right: 360 }
const PANEL_MIN = { left: 240, right: 280 }
const PANEL_MAX = { left: 520, right: 560 }

function usePanelWidth(side: "left" | "right") {
  const key = `stravision.monitor.${side}W`
  const [width, setWidth] = useState(PANEL_DEFAULT[side])
  useEffect(() => {
    try {
      const raw = Number(localStorage.getItem(key))
      if (Number.isFinite(raw) && raw >= PANEL_MIN[side] && raw <= PANEL_MAX[side]) setWidth(raw)
    } catch {
      /* ignore */
    }
  }, [key, side])
  const commit = useCallback(
    (v: number) => {
      const clamped = Math.round(Math.min(PANEL_MAX[side], Math.max(PANEL_MIN[side], v)))
      setWidth(clamped)
      try {
        localStorage.setItem(key, String(clamped))
      } catch {
        /* ignore */
      }
    },
    [key, side],
  )
  return [width, commit] as const
}

/** 竖分隔条：拖动改列宽。invert = 拖左变宽（用于右栏）。 */
function ColumnResizer({
  width,
  setWidth,
  invert,
  title,
}: {
  width: number
  setWidth: (v: number) => void
  invert?: boolean
  title: string
}) {
  const start = useRef(0)
  const base = useRef(0)
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={title}
      title={title}
      className="group relative -mx-1 w-2 shrink-0 cursor-col-resize touch-none select-none"
      onPointerDown={(e) => {
        e.preventDefault()
        start.current = e.clientX
        base.current = width
        ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
      }}
      onPointerMove={(e) => {
        if ((e.buttons & 1) === 0) return
        const dx = e.clientX - start.current
        setWidth(base.current + (invert ? -dx : dx))
      }}
      onDoubleClick={() => setWidth(PANEL_DEFAULT[invert ? "right" : "left"])}
    >
      {/* 静止时是一条 hairline，hover/拖动时变粗变深 —— 有可拖的暗示，但不抢内容 */}
      <span className="absolute inset-y-3 left-1/2 w-px -translate-x-1/2 rounded-full bg-black/10 transition-all duration-150 group-hover:w-[3px] group-hover:bg-black/30 dark:bg-white/10 dark:group-hover:bg-white/30" />
    </div>
  )
}

export default function MonitorPage() {
  // 左右两栏宽度可调（拖分隔条 / 双击复位），写 localStorage
  const [leftW, setLeftW] = usePanelWidth("left")
  const [rightW, setRightW] = usePanelWidth("right")
  // Layout adjustments for monitor page
  const router = useRouter()
  const { deviceData, devices, customDeviceData } = useDeviceData()
  const { toggleRelay, toggleRelayByDeviceId, setLEDs, controlStepper } = useDeviceControl()

  // 从设备注册表动态获取传感器设备
  const sensorDevices = useMemo(() => devices.filter(d => d.type === 'sensor' && d.is_enabled), [devices])
  // 从设备注册表动态获取继电器设备
  const registryRelayDevices = useMemo(() => devices.filter(d => d.type === 'relay' && d.is_enabled), [devices])
  const { setTheme, resolvedTheme } = useTheme()
  // 沉浸光感材质等级（HDS MaterialLevel）：按设备算力自适应，写到 <html data-mat-level>。
  // 等级只缩放 blur() 半径；saturate / brightness 这两个「光感本体」任何档位都保留。
  useAdaptiveMaterialLevel()
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null)

  // Use Daily Greeting Hook (Web Speech API version - disabled for now)
  // useDailyGreeting({ 
  //   username: currentUser?.username,
  //   enabled: !!currentUser 
  // })

  // Local state
  const [filter, setFilter] = useState<"all" | "active" | "offline">("all")
  const [lockedControls, setLockedControls] = useState<Record<number, boolean>>({})
  const [cameras, setCameras] = useState([
    { id: 1, name: "温室摄像头 A", time: "08:00 - 18:00", on: true, url: "", username: "", password: "", stunUrl: "", stunUsername: "", stunPassword: "" },
    { id: 2, name: "温室摄像头 B", time: "08:00 - 18:00", on: true, url: "", username: "", password: "", stunUrl: "", stunUsername: "", stunPassword: "" },
  ])
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false)
  const [cameraModalOpen, setCameraModalOpen] = useState(false)
  const [cameraSettingsOpen, setCameraSettingsOpen] = useState(false)
  const [selectedCamera, setSelectedCamera] = useState<typeof cameras[0] | null>(null)
  const [environmentControls, setEnvironmentControls] = useState<EnvironmentControl[]>([])
  const hasAutoPlayedRef = useRef(false)

  // Data Fetching
  useEffect(() => {
    const initData = async () => {
      try {
        const [camerasRes, authRes, membersRes] = await Promise.all([
          fetch('/api/greenhouse/cameras'),
          fetch("/api/auth/me"),
          fetch("/api/members")
        ])

        // Handle Cameras
        if (camerasRes.ok) {
          const data = await camerasRes.json()
          setCameras(prev => prev.map(cam => {
            if (cam.id === 1) return { ...cam, url: data.cameraAUrl || "" }
            if (cam.id === 2) return { ...cam, url: data.cameraBUrl || "" }
            return cam
          }))
        }

        // Handle Auth
        const authData = await authRes.json()
        if (authData.authenticated && authData.user) {
          setCurrentUser(authData.user)
        } else {
          router.push("/login")
          return
        }

        // Handle Admin Name
        if (membersRes.ok) {
          const data = await membersRes.json()
          const membersList = data.members || []
          setMembers(membersList)
          const superAdmin = membersList.find((m: UserPublic) => m.role === "super_admin")
          if (superAdmin) {
            setAdminName(superAdmin.username || "")
          }
        }
      } catch (error) {
        console.error("Initialization failed:", error)
      } finally {
        setIsLoadingUser(false)
      }
    }

    initData()
  }, [router])

  const getStreamUrlFromInput = useCallback((rawUrl: string) => {
    const url = rawUrl.trim()
    if (!url) return ""

    if (/player\.xstrive\.com\/video\/live/i.test(url)) {
      const safeDecode = (value: string) => {
        try {
          return decodeURIComponent(value)
        } catch {
          return value
        }
      }

      const extractVideoUrlLoosely = (playerUrl: string) => {
        const qIndex = playerUrl.indexOf("?")
        if (qIndex < 0) return ""
        const query = playerUrl.slice(qIndex + 1)
        const lower = query.toLowerCase()
        let start = lower.indexOf("videourl=")
        while (start !== -1 && start > 0 && query[start - 1] !== "&") {
          start = lower.indexOf("videourl=", start + 1)
        }
        if (start === -1) return ""
        const valueStart = start + "videourl=".length
        const after = query.slice(valueStart)
        const parts = after.split("&")
        const stopKeys = new Set(["islive", "ismute", "aspect", "lang", "autoplay", "from", "player", "t", "ts"])
        const videoParts: string[] = []
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i]
          const eq = p.indexOf("=")
          const key = eq >= 0 ? p.slice(0, eq).toLowerCase() : ""
          if (i > 0 && key && stopKeys.has(key)) break
          videoParts.push(p)
        }
        return videoParts.join("&")
      }

      try {
        const u = new URL(url)
        const videoUrl = u.searchParams.get("videoUrl") ?? ""
        const loose = extractVideoUrlLoosely(url)
        const picked = loose.length > videoUrl.length ? loose : videoUrl
        if (!picked) return ""
        return safeDecode(picked)
      } catch {
        const loose = extractVideoUrlLoosely(url)
        if (!loose) return ""
        return safeDecode(loose)
      }
    }

    return url
  }, [])

  const getPlayableUrl = useCallback((rawUrl: string) => {
    const url = getStreamUrlFromInput(rawUrl)
    if (!url) return ""

    // Handle RTMP protocol → route through FFmpeg proxy
    if (url.startsWith("rtmp://") || url.startsWith("rtmps://")) {
      return `/api/stream-rtmp?url=${encodeURIComponent(url)}`
    }

    if (typeof window !== "undefined") {
      try {
        const u = new URL(url)
        if (u.protocol === "http:" || u.protocol === "https:") {
          return `/api/stream-proxy?url=${encodeURIComponent(url)}`
        }
      } catch {}
    }

    return url
  }, [getStreamUrlFromInput])

  const cameraPlayerSources = useMemo(() => {
    if (!selectedCamera?.url) return []
    const src = getPlayableUrl(selectedCamera.url)
    if (!src) return []
    return [{ src }]
  }, [getPlayableUrl, selectedCamera?.url])

  // RTMP 画面靠服务端 FFmpeg 转封装；缺失时明确提示，而不是让播放器无声空转
  const isRtmpCamera = useMemo(() => {
    const raw = getStreamUrlFromInput(selectedCamera?.url ?? "") || selectedCamera?.url || ""
    return raw.startsWith("rtmp://") || raw.startsWith("rtmps://")
  }, [getStreamUrlFromInput, selectedCamera?.url])

  const ffmpegStatus = useFfmpegStatus(isRtmpCamera)
  const ffmpegMissing = Boolean(isRtmpCamera && ffmpegStatus && !ffmpegStatus.available)

  const cameraExternalPlayerUrl = useMemo(() => {
    const raw = selectedCamera?.url?.trim()
    if (!raw) return null
    try {
      const u = new URL(raw)
      if (u.protocol !== "https:") return null
      if (u.hostname !== "player.xstrive.com") return null
      if (!u.pathname.startsWith("/video/live")) return null
      return u.toString()
    } catch {
      return null
    }
  }, [selectedCamera?.url])

  // 从 localStorage 加载环境控制设备
  useEffect(() => {
    const saved = localStorage.getItem("monitor-environment-controls")
    if (saved) {
      try {
        setEnvironmentControls(JSON.parse(saved))
      } catch {
        // 使用默认设备
        setEnvironmentControls([
          { id: "relay5", name: "自动灌溉系统", relay: 5, icon: "Droplets", color: { bg: "#E0F2F1", fg: "#009688", gradFrom: "#6EE7B7", gradTo: "#059669" }, battery: 80 },
          { id: "relay6", name: "智能通风系统", relay: 6, icon: "Fan", color: { bg: "#F4F4F5", fg: "#2196F3", gradFrom: "#C7D2FE", gradTo: "#52525B" }, battery: 90 },
        ])
      }
    } else {
      // 默认设备
      setEnvironmentControls([
        { id: "relay5", name: "自动灌溉系统", relay: 5, icon: "Droplets", color: { bg: "#E0F2F1", fg: "#009688", gradFrom: "#6EE7B7", gradTo: "#059669" }, battery: 80 },
        { id: "relay6", name: "智能通风系统", relay: 6, icon: "Fan", color: { bg: "#F4F4F5", fg: "#2196F3", gradFrom: "#C7D2FE", gradTo: "#52525B" }, battery: 90 },
      ])
    }
  }, [])

  // 从 localStorage 加载摄像头配置
  useEffect(() => {
    const savedCameras = localStorage.getItem("monitor-cameras")
    if (savedCameras) {
      try {
        setCameras(JSON.parse(savedCameras))
      } catch {
        // 使用默认配置
      }
    }
  }, [])

  // 保存环境控制设备到 localStorage
  const saveEnvironmentControls = useCallback((controls: EnvironmentControl[]) => {
    setEnvironmentControls(controls)
    localStorage.setItem("monitor-environment-controls", JSON.stringify(controls))
  }, [])

  // 添加设备
  const handleAddDevice = useCallback((device: typeof AVAILABLE_DEVICES[0]) => {
    if (environmentControls.find(c => c.id === device.id)) return
    const newControl: EnvironmentControl = {
      ...device,
      battery: Math.floor(Math.random() * 30) + 70, // 随机电量 70-100
    }
    saveEnvironmentControls([...environmentControls, newControl])
  }, [environmentControls, saveEnvironmentControls])

  // 移除设备
  const handleRemoveDevice = useCallback((deviceId: string) => {
    saveEnvironmentControls(environmentControls.filter(c => c.id !== deviceId))
  }, [environmentControls, saveEnvironmentControls])

  // 保存摄像头配置到 localStorage
  const saveCameras = useCallback((newCameras: typeof cameras) => {
    setCameras(newCameras)
    localStorage.setItem("monitor-cameras", JSON.stringify(newCameras))
  }, [])

  // 摄像头相关处理
  const handleCameraClick = useCallback((camera: typeof cameras[0]) => {
    setSelectedCamera(camera)
    setCameraModalOpen(true)
  }, [])

  const handleCameraSettingsSave = useCallback((cameraId: number, settings: { name: string; url: string; time: string; username: string; password: string; stunUrl: string; stunUsername: string; stunPassword: string }) => {
    const newCameras = cameras.map(cam => 
      cam.id === cameraId 
        ? { ...cam, ...settings }
        : cam
    )
    saveCameras(newCameras)
    const updated = newCameras.find((c) => c.id === cameraId) ?? null
    if (updated) setSelectedCamera(updated)
    setCameraSettingsOpen(false)
  }, [cameras, saveCameras])

  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [adminName, setAdminName] = useState<string>("")
  const [members, setMembers] = useState<UserPublic[]>([])

  // Helper to check relay status
  const isRelayOn = (relayNum: 5 | 6 | 7 | 8) => {
    return deviceData?.[`relay${relayNum}`] === 1
  }

  const handleToggle = (relayNum: 5 | 6 | 7 | 8) => {
    if (lockedControls[relayNum]) return
    if (!deviceData) return
    const current = deviceData[`relay${relayNum}`]
    toggleRelay(relayNum, current)
  }

  const toggleCamera = (id: number) => {
    setCameras(prev => prev.map(c => c.id === id ? { ...c, on: !c.on } : c))
  }

  const toggleLock = (relay: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setLockedControls(prev => ({ ...prev, [relay]: !prev[relay] }))
  }

  // Camera Control State
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isRecording, setIsRecording] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const videoContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (cameraModalOpen) {
      setZoomLevel(1)
      setIsMuted(true)
      setIsRecording(false)
    }
  }, [cameraModalOpen, selectedCamera])

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleChange)
    return () => document.removeEventListener('fullscreenchange', handleChange)
  }, [])

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => {
      const next = prev + delta
      return Math.min(Math.max(1, next), 3) // Limit zoom 1x to 3x
    })
  }

  const handleSnapshot = () => {
    const video = videoContainerRef.current?.querySelector('video')
    if (!video) return
    
    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.href = dataUrl
        link.download = `snapshot-${selectedCamera?.name || 'camera'}-${new Date().getTime()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success("截图已保存到本地")
      }
    } catch (e) {
      toast.error("截图失败")
    }
  }

  const handleRecord = () => {
    if (isRecording) {
      setIsRecording(false)
      toast.success("录像已保存")
    } else {
      setIsRecording(true)
      toast.info("开始录像...")
    }
  }

  const handlePTZ = async (action: string) => {
    // 步进电机只支持左右移动，上下暂不支持
    if (action === "left") {
      toast.info("云台左移中...")
      const success = await controlStepper(1) // 1=正转/左移
      if (success) {
        toast.success("云台左移指令已发送")
      } else {
        toast.error("云台控制失败")
      }
    } else if (action === "right") {
      toast.info("云台右移中...")
      const success = await controlStepper(2) // 2=反转/右移
      if (success) {
        toast.success("云台右移指令已发送")
      } else {
        toast.error("云台控制失败")
      }
    } else if (action === "reset" || action === "up" || action === "down") {
      // 停止或不支持的方向
      const success = await controlStepper(0) // 0=停止
      if (success) {
        toast.success("云台已停止")
      } else {
        toast.error("云台控制失败")
      }
    }
  }

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      videoContainerRef.current?.requestFullscreen().then(() => {
        setIsFullscreen(true)
      }).catch(() => {
        toast.error("无法进入全屏模式")
      })
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false)
      })
    }
  }

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="animate-in fade-in duration-500">
          <div className="h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50" />
          <div className="p-6">
            <div className="max-w-[1400px] mx-auto">
              <div className="h-8 w-64 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse mb-2" />
              <div className="h-4 w-96 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-8" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-96 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
                <div className="space-y-4">
                  <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
                  <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return null
  }

  const MiniToggle = ({ on, onClick }: { on: boolean; onClick?: () => void }) => {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation()
          onClick?.()
        }}
        className={cn(
          "dc-ctrl--press dc-ctrl--sm relative h-5 w-9 rounded-full border border-black/5 shadow-inner transition-colors dark:border-white/10 cursor-pointer",
          on ? "bg-emerald-400" : "bg-zinc-200 dark:bg-zinc-700/60"
        )}
      >
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-white shadow-sm transition-all dark:bg-zinc-100",
            on ? "left-[calc(100%-18px)]" : "left-0.5"
          )}
        />
      </div>
    )
  }

  return (
    <>
      {/* 沉浸光感材质（唯一来源）：必须用**普通 <style>** —— styled-jsx 的模板串不接受运行时插值，
          而 MATERIAL_CSS 是从 material-css.ts 引入的共享常量（dashboard 同款做法）。 */}
      <style>{MATERIAL_CSS + MONITOR_MATERIAL_CSS}</style>
      {/* mon-scope：本页 hairline 变量与「一层容器」辅助类的落点（见 MONITOR_MATERIAL_CSS） */}
      <div className="mon-scope relative h-screen w-full text-foreground overflow-hidden">
      <div className="absolute inset-0 bg-[var(--berry-canvas)]" />
      {/* 2026-10-22：页面级三层彩色光斑（浅色薄荷/淡紫、深色蓝/绿/靛）已移除。
          判据见 material-css.ts「场景轴」：本页没有需要被透出的氛围景，
          彩色渐变只是给整页刷一层"彩色页面"的滤镜 —— 用户判定好丑。
          3D 模型背后那层**中性白柔光**保留（那是打光，不是渐变背景）。 */}
      
      {/* Daily Briefing Dynamic Island */}
      <DailyBriefingIsland
        username={currentUser?.username}
        deviceData={deviceData}
        enabled={!!currentUser}
      />
      
      {/* ⚠️ 2026-10-23：原来这里是「固定的 Logo 块 + 固定的导航胶囊 + 全局兜底窗口键」三套东西，
          和其余页面（统一走 PageHeader）完全是两种版式 —— 用户反馈「monitor 页面没有统一」。
          现在整页改成和看板/设备控制一致的骨架：顶部 PageHeader（品牌 + 菜单 + 导航 + 窗口键），
          下面才是三列内容。固定定位的那两块已删除，不要再加回来。 */}

      <div className="relative z-10 flex h-full w-full flex-col">
        <div className="relative z-20 shrink-0">
          <PageHeader user={currentUser} />
        </div>

      <div className="relative flex min-h-0 flex-1 w-full gap-6 px-4 pb-4 lg:px-6 lg:pb-6 overflow-hidden">
      
      {/* Left Column: Devices & Control
          这一列本身**不做容器**（它只是一条滚动栏）：容器全部落在各张卡上，
          栏内只有「分组小标题 + 卡列表」，组间距 24 是 HDS 的分组留白档。 */}
      <div 
        className="flex flex-col gap-6 shrink-0 animate-in slide-in-from-left duration-500 fade-in h-full overflow-y-auto custom-scrollbar pr-2"
        style={{ width: leftW }}
        data-lenis-prevent
      >
        {/* Monitoring Devices
            ——「一层容器」：容器只有这张卡（16 = --dc-r-shell 档），卡内零灰底块。
            图标基座是允许的例外（HDS 设置行/智能家居卡的通用做法：40 见方、圆角 10），
            但基座必须用**状态色**而不是中性白块 —— 白底 + 描边贴在玻璃卡上，
            读起来就是「卡里又套了一张白色圆角卡」，正是本页要禁的那条。 */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg font-bold flex items-center gap-2">
              监控设备 <span className="text-muted-foreground text-sm font-normal">{cameras.length}</span>
            </h2>
            <Button variant="ghost" size="icon" className="dc-ctrl--press h-8 w-8 text-muted-foreground">
              <IconMore className="h-5 w-5" />
            </Button>
          </div>
          <div className="space-y-3">
            {cameras.map((cam) => (
              <ImmersiveCard
                key={cam.id}
                data-camera-id={cam.id}
                className="group dc-rise dc-ctrl--press dc-press--card cursor-pointer rounded-[16px] p-4"
                onClick={() => handleCameraClick(cam)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {/* 2026-10-24：删掉 40×40 圆角图标**基座**（卡内套圆角矩形），
                        但**保留 40×40 的占位槽** —— 不铺底色、不加圆角，只负责两件事：
                        ①图标与卡片左右边距之间留出呼吸（16 padding + 槽内居中）；
                        ②标题与状态行共用同一条左基线，不会因为图标位置左右漂。
                        图标 18 放在 40 槽里视觉居中，比顶到卡边好看得多。 */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                      {cam.on
                        ? <IconPlayOne className="h-[18px] w-[18px] text-primary" />
                        : <IconVideo className="h-[18px] w-[18px] text-zinc-400 dark:text-zinc-500" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{cam.name}</h3>
                      {/* 状态一律「点 + 文字」，不加填充色块（HDS：色块只会让卡越读越碎） */}
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          cam.on ? "bg-primary" : "bg-zinc-400 dark:bg-zinc-600"
                        )} />
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">{cam.on ? "Live" : "Offline"}</span>
                        <span className="ml-1 font-mono text-xs text-zinc-400 dark:text-zinc-500">{cam.time}</span>
                      </div>
                    </div>
                  </div>

                  <MiniToggle on={cam.on} onClick={() => toggleCamera(cam.id)} />
                </div>
              </ImmersiveCard>
            ))}
          </div>
        </div>

        {/* Environment Control */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg font-bold flex items-center gap-2">
              环境控制 <span className="text-muted-foreground text-sm font-normal">{environmentControls.length}</span>
            </h2>
            <Button 
              variant="ghost" 
              size="icon" 
              className="dc-ctrl--press h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={() => setDeviceDialogOpen(true)}
            >
              <IconSetting className="h-5 w-5" />
            </Button>
          </div>
          <div className="space-y-3">
            {environmentControls.map((ctrl) => {
              const Icon = ICON_MAP[ctrl.icon] || IconWater
              const on = isRelayOn(ctrl.relay as 5 | 6 | 7 | 8)
              const isLocked = lockedControls[ctrl.relay]
              /* 这一张是「一层容器」的正面样板：卡内零灰底块，层级全靠
                 留白 + hairline（右栏竖分隔线）+ 字号字重 + 彩色图标建立。 */
              return (
                <ImmersiveCard
                  key={ctrl.id}
                  className={cn(
                    "dc-rise rounded-[16px]",
                    /* 开启态：原来用 ring-2（= box-shadow 通道），而沉浸卡的内缘光 + 外阴影
                       也是 box-shadow —— 未分层材质规则整条覆盖，ring 会直接消失。
                       换成 outline：语义不变（卡外一圈 2px 绿环），且不占 box-shadow 通道。 */
                    on && "outline-2 outline-solid outline-primary/35"
                  )}
                >
                  <div className="grid grid-cols-[1fr_62px]">
                    <div className="dc-ctrl--press dc-press--card p-4 cursor-pointer" onClick={() => handleToggle(ctrl.relay as 5 | 6 | 7 | 8)}>
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-3">
                          {/* 与监控设备卡同一套：40×40 纯占位槽（无底色无圆角），
                              图标 18 居中 —— 图标与外层卡片的距离由「卡内 padding + 槽」两层给出。 */}
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                              <Icon className={cn(
                                "h-[18px] w-[18px]",
                                on ? "text-primary" : "text-zinc-400 dark:text-zinc-500",
                                ctrl.relay === 6 && on && "animate-spin"
                              )} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{ctrl.name}</span>
                                {isLocked && <IconLock className="h-3 w-3 shrink-0 text-zinc-400 dark:text-zinc-500" />}
                              </div>
                              {/* 状态 = 点 + 文字（不加填充块） */}
                              <div className="mt-1 flex items-center gap-1.5">
                                <span className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  on ? "bg-primary" : "bg-zinc-400 dark:bg-zinc-600"
                                )} />
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">{on ? "Active" : "Offline"}</span>
                              </div>
                            </div>
                          </div>

                          {/* 卡内小控件：走材质控件档（THIN 等价），不再用「白底块 + 描边」 */}
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className={cn(
                                "dc-ctrl--field dc-ctrl--sm dc-ctrl--press h-8 w-8 rounded-full",
                                isLocked && "text-primary"
                              )}
                              onClick={(e) => toggleLock(ctrl.relay, e)}
                            >
                              {isLocked ? <IconLock className="h-3.5 w-3.5" /> : <IconUnlock className="h-3.5 w-3.5" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="dc-ctrl--field dc-ctrl--sm dc-ctrl--press h-8 w-8 rounded-full"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push('/device-control')
                              }}
                            >
                              <IconRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 右列电量：一条竖 hairline 分区（不是内嵌卡片）。
                        竖条是「数据可视化元素」，不属于容器，所以允许它有轨道底。 */}
                    <div className="flex flex-col items-center justify-between py-3 border-l border-zinc-900/8 dark:border-white/10">
                      <div className="text-base font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{ctrl.battery}%</div>
                      <div className="text-[11px] text-zinc-400 tracking-wide dark:text-zinc-500">Battery</div>
                      <div className="relative h-24 w-9 rounded-full bg-zinc-900/8 overflow-hidden dark:bg-white/10">
                        <div
                          className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-500"
                          style={{
                            height: `${Math.max(10, Math.min(100, ctrl.battery))}%`,
                            backgroundImage: `linear-gradient(to top, ${ctrl.color.gradTo}, ${ctrl.color.gradFrom})`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </ImmersiveCard>
              )
            })}
          </div>
        </div>

        {/* 传感器数据（动态来自设备注册表） */}
        {sensorDevices.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-lg font-bold flex items-center gap-2">
                传感器 <span className="text-muted-foreground text-sm font-normal">{sensorDevices.length}</span>
              </h2>
              <Button
                variant="ghost"
                size="icon"
                className="dc-ctrl--press h-8 w-8 text-muted-foreground hover:text-primary"
                onClick={() => router.push('/device-control')}
              >
                <IconRight className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-3">
              {sensorDevices.map((sensor) => {
                const IconCmp = getDeviceIcon(sensor.icon)
                const metrics = sensor.config?.metrics || []
                /* 只展示前 4 项（2×2）。六项指标全塞进 240px 宽的卡里，就是「信息密度过高」：
                   标签、单位、数值三行字号各不同，扫读成本比拿到的信息更贵。 */
                const shownMetrics = metrics.slice(0, 4)
                const restCount = Math.max(0, metrics.length - shownMetrics.length)
                const liveData = customDeviceData[sensor.id] || {}
                const hasData = Object.keys(liveData).length > 0
                return (
                  <ImmersiveCard
                    key={sensor.id}
                    className="dc-rise rounded-[16px] p-4"
                  >
                    {/* 卡头：40×40 纯占位槽（无底色无圆角）+ 名称 / 状态点，
                        与监控设备、环境控制三处同一套对齐关系。
                        卡头与下方数据之间**不压线**：度量区的 hairline 十字本身就把两段分开了。 */}
                    <div className="flex items-center gap-3 pb-2">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                        {/* 图标颜色一律走设计 token（有数据 = primary，无数据 = 三级文字）。
                            注册表里的 sensor.color 是任意 hex，直接用会让这一栏出现
                            和全站 emerald×zinc 不是一套的杂色 —— 2026-10-24 起不再使用。 */}
                        <IconCmp
                          className={cn("h-[18px] w-[18px]", hasData ? "text-primary" : "text-zinc-400 dark:text-zinc-500")}
                          strokeWidth={2}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{sensor.name}</div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            hasData ? "bg-primary" : "bg-zinc-400 dark:bg-zinc-600"
                          )} />
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">{hasData ? "实时" : "等待数据"}</span>
                        </div>
                      </div>
                    </div>
                    {metrics.length > 0 ? (
                      <>
                        {/* 无容器信息网格：hairline 十字分隔（列 nth-child(even) 左边线 / 行 n+3 上边线），
                            层级靠分隔线而不是底色 —— 卡内零容器。
                            每格不再配小图标：4 个 12px 图标 × 4 个标签 × 4 个数值是纯粹的视觉噪音，
                            标签本身已经说清楚了（温度 / 湿度 / 光照…）。 */}
                        <div className="mon-grid2">
                          {shownMetrics.map((m) => {
                            const rawVal = liveData[m.mqtt_field]
                            const val = rawVal !== undefined && rawVal !== null
                              ? (m.scale ? Number(rawVal) * m.scale : Number(rawVal))
                              : null
                            return (
                              <div key={m.key} className="min-w-0">
                                <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">{m.label}</div>
                                <div className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                                  {val !== null && !isNaN(val) ? val.toFixed(m.scale && m.scale < 1 ? 1 : 0) : "--"}
                                  <span className="ml-0.5 text-xs font-normal text-zinc-400 dark:text-zinc-500">{m.unit}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        {restCount > 0 && (
                          <button
                            onClick={() => router.push('/device-control')}
                            className="dc-ctrl--press mt-1 flex items-center gap-0.5 text-xs text-zinc-400 transition-colors hover:text-primary dark:text-zinc-500"
                          >
                            还有 {restCount} 项指标
                            <IconRight className="h-3 w-3" />
                          </button>
                        )}
                      </>
                    ) : hasData ? (
                      /* 无 metrics 配置时的兜底读数：同样不铺色块，
                         改成「键 · 值」一行 + hairline 竖分隔（键三等文字 / 值主文字）。 */
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-zinc-900/8 dark:border-white/10 pt-3">
                        {Object.entries(liveData)
                          .filter(([k]) => k !== '_ts')
                          .slice(0, 3)
                          .map(([k, v], i) => (
                            <div key={k} className={cn("flex items-baseline gap-1.5", i > 0 && "pl-3 border-l border-zinc-900/8 dark:border-white/10")}>
                              <span className="text-xs text-zinc-500 dark:text-zinc-400">{k}</span>
                              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                                {typeof v === 'number' ? v : String(v)}
                              </span>
                            </div>
                          ))
                        }
                      </div>
                    ) : null}
                  </ImmersiveCard>
                )
              })}
            </div>
          </div>
        )}

        {/* 注册表继电器设备（不在旧版 environmentControls 中的自定义继电器） */}
        {registryRelayDevices
          .filter(d => !environmentControls.some(ec => ec.relay === d.config?.relay_num))
          .length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-lg font-bold flex items-center gap-2">
                自定义设备 <span className="text-muted-foreground text-sm font-normal">
                  {registryRelayDevices.filter(d => !environmentControls.some(ec => ec.relay === d.config?.relay_num)).length}
                </span>
              </h2>
            </div>
            <div className="space-y-3">
              {registryRelayDevices
                .filter(d => !environmentControls.some(ec => ec.relay === d.config?.relay_num))
                .map((d) => {
                  const IconCmp = getDeviceIcon(d.icon)
                  const relayNum = d.config?.relay_num as number | undefined
                  const on = relayNum
                    ? deviceData?.[`relay${relayNum}` as keyof typeof deviceData] === 1
                    : false
                  return (
                    <ImmersiveCard
                      key={d.id}
                      className={cn(
                        "dc-rise rounded-[16px] p-4",
                        on && "outline-2 outline-solid outline-primary/35"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          {/* 同左栏其它卡：40×40 纯占位槽，无底色无圆角，图标 18 居中 */}
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                            <IconCmp
                              className={cn("h-[18px] w-[18px]", on ? "text-primary" : "text-zinc-400 dark:text-zinc-500")}
                              strokeWidth={2}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{d.name}</div>
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                on ? "bg-primary" : "bg-zinc-400 dark:bg-zinc-600"
                              )} />
                              <span className="text-xs text-zinc-500 dark:text-zinc-400">{on ? "Active" : "Offline"}</span>
                            </div>
                          </div>
                        </div>
                        <MiniToggle
                          on={on}
                          onClick={() => {
                            if (relayNum) {
                              handleToggle(relayNum as 5 | 6 | 7 | 8)
                            } else {
                              toggleRelayByDeviceId(d.id, on ? 1 : 0)
                            }
                          }}
                        />
                      </div>
                    </ImmersiveCard>
                  )
                })}
            </div>
          </div>
        )}
      </div>

      {/* 左栏 ↔ 中栏 的分隔条：拖动改宽度，双击复位到 320 */}
      <ColumnResizer width={leftW} setWidth={setLeftW} title="拖动调整设备栏宽度（双击复位）" />

      {/* Center Column: Main Visual */}
      {/* 主视觉壳：THICK 档 —— 它压着一整块 3D 画布（多行内容 + WebGL），底色要比内容卡实一档，
          可读性与「透」在这里要偏前者。
          interactive={false}：内部全是画布交互，不能整块跟着指针缩放/泛白光。
          ⚠️ 入场动画**不许带缩放**（zoom-in-95 已移除）：3D 画布挂载时会测量父容器尺寸，
             缩放途中量到的是 scale(0.95) 的值（实测 canvas 291×759 vs 容器 306×798，等比例差 4.9%），
             动画结束后 r3f 不会自动纠偏 → 画布被拉伸/裁切、底部控件错位。
             只保留 fade-in（opacity 不参与尺寸计算），卡片靠 .dc-rise 之外的方式入场。 */}
      <ImmersiveCard
        grade="thick"
        interactive={false}
        className="flex-1 min-w-0 flex flex-col rounded-[32px] overflow-hidden animate-in fade-in duration-500 delay-100"
      >
        {/* Header —— 卡头不铺任何底色，靠留白 + 字号层级与 3D 画布分开 */}
        <div className="flex justify-between items-start p-6 pb-0 z-10">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">监室设备</h1>
            <p className="text-zinc-500 font-medium mt-1 dark:text-zinc-400">Agriculture</p>
          </div>
          {/* 棚区切换：交互控件（允许的例外），走材质控件档而不是「白底块 + 描边」。
              hover/选中的底色由材质变量提供，和下方分段控件是同一套材质语言。 */}
          <div className="flex items-center gap-2">
            <div className="dc-ctrl--brand-soft dc-ctrl--press rounded-full px-5 py-2 text-sm font-semibold text-br-brand-ink cursor-pointer">1 Flow</div>
            <div className="dc-ctrl--ghost dc-ctrl--press rounded-full px-5 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 cursor-pointer">2 Flow</div>
            <div className="dc-ctrl--ghost dc-ctrl--press rounded-full px-5 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 cursor-pointer">Garage</div>
          </div>
        </div>

        {/* 3D Model Container */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(800px_circle_at_50%_55%,rgba(255,255,255,0.55),transparent_60%)] dark:hidden" />
          <div className="absolute inset-0 hidden dark:block dark:bg-[radial-gradient(900px_circle_at_50%_55%,rgba(255,255,255,0.06),transparent_60%)]" />
          <GreenhouseModel 
            className="w-full h-full" 
            theme={resolvedTheme === "dark" ? "dark" : "light"}
            deviceData={deviceData}
            onToggleRelay={handleToggle}
            onUpdateLEDs={async (r, g, b, w) => {
              await setLEDs(r, g, b, w)
            }}
            filter={filter}
            onViewCamera={(cameraId) => {
              // Map camera-a/camera-b to numeric ID
              const id = cameraId === "camera-a" ? 1 : cameraId === "camera-b" ? 2 : 0
              const targetCam = cameras.find(c => c.id === id)
              if (targetCam) {
                setSelectedCamera(targetCam)
                setCameraModalOpen(true)
              }
            }}
          />

        </div>

        {/* 底部一行：读数（左） + 筛选与视图（右），两者各自浮着、**不共用容器**。
            上一版两块都用 `left-6` / 居中各自定位，中栏一窄就压在一起（读数被分段控件吃掉半截）。
            现在让它们分别贴左右两端，中间留出空隙 —— 结构上永远不会重叠，
            也没有引入「大圆角容器套小圆角控件」那种最丑的嵌套。
            同心圆角：贴边 16、半径 16 = 卡片 32 − 16（底排三件都用同一组数）。 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex items-end justify-between gap-3 px-4">
          {/* 读数条：THIN 档（压在别的内容之上的小浮层，圆角走 20 档）。
              interactive={false} —— 它是读数，不是按钮。 */}
          <ImmersiveCard grade="thin" interactive={false} className="pointer-events-auto min-w-0 rounded-[16px] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">Sensor</div>
              <div className="h-4 w-px shrink-0 bg-zinc-900/10 dark:bg-white/10" />
              <div className="truncate text-xs font-semibold text-zinc-700 dark:text-zinc-200 tabular-nums">{deviceData ? `${deviceData.temperature.toFixed(1)}°C · ${deviceData.humidity.toFixed(1)}%` : "--"}</div>
              {sensorDevices.slice(0, 1).map(sensor => {
                const data = customDeviceData[sensor.id] || {}
                const firstMetric = sensor.config?.metrics?.[0]
                if (!firstMetric || data[firstMetric.mqtt_field] === undefined) return null
                const raw = data[firstMetric.mqtt_field]
                const val = firstMetric.scale ? Number(raw) * firstMetric.scale : Number(raw)
                return (
                  <div key={sensor.id} className="flex shrink-0 items-center gap-1.5">
                    <div className="h-4 w-px bg-zinc-900/10 dark:bg-white/10" />
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{firstMetric.label}</span>
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 tabular-nums">
                      {isNaN(val) ? "--" : val.toFixed(firstMetric.scale && firstMetric.scale < 1 ? 1 : 0)}{firstMetric.unit}
                    </span>
                  </div>
                )
              })}
            </div>
          </ImmersiveCard>

          <div className="pointer-events-auto flex shrink-0 items-center gap-3">
            {/* Filter Toggles —— 分段控件（交互控件）：
                滑槽 = 凹槽（.dc-ctrl--track.dc-seg），选中块 = 凸起（.dc-ctrl--thumb）。
                滑槽 p-1.5 + 滑块 h-10 → 半径 20 + 6 = 26 = 滑槽高度/2，同心。
                选中态不混色：三者统一「白玻璃滑块 + 品牌墨绿字」。 */}
            <div className="dc-ctrl--track dc-seg rounded-full p-1.5 flex gap-1">
              {([
                ["all", "All"],
                ["active", "Active"],
                ["offline", "Offline"],
              ] as const).map(([key, label]) => (
                <Button
                  key={key}
                  variant="ghost"
                  onClick={() => setFilter(key)}
                  className={cn(
                    "dc-ctrl--press h-10 rounded-full px-5 transition-colors",
                    filter === key
                      ? "dc-ctrl--thumb font-semibold text-br-brand-ink"
                      : "font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  )}
                >
                  {label}
                </Button>
              ))}
            </div>

            {/* 3D Rotate Button */}
            <Button size="icon" className="dc-ctrl--field dc-ctrl--sm dc-ctrl--press h-11 w-11 rounded-[16px] text-zinc-700 dark:text-zinc-200">
              <IconBox className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </ImmersiveCard>

      {/* 浮动导航已上移到 PageHeader（2026-10-23 统一版式），这里不再重复渲染 */}

      {/* 中栏 ↔ 右栏 的分隔条：拖动改宽度（向左拖变宽），双击复位到 360 */}
      <ColumnResizer width={rightW} setWidth={setRightW} invert title="拖动调整信息栏宽度（双击复位）" />

      {/* Right Column: System Info & Activity
          —— 这一张是「聚合面板」（承载多行内容 + 可滚动 + 内部有浮层），走 THICK 档。
          它自己需要滚动，所以**不能**用 ImmersiveCard（.dc-imv 会裁掉溢出）——
          规范给的写法就是直接挂 .dc-glass + 档位类，两者读同一组 --mat-* 变量。
          内部各分组之间只用 hairline（.mon-sep）分区，组内零灰底块。 */}
      <div 
        className="dc-glass dc-mat--thick mon-panel-scroll flex flex-col shrink-0 rounded-[32px] p-7 animate-in slide-in-from-right duration-500 fade-in h-full overflow-y-auto"
        style={{ width: rightW }}
        data-lenis-prevent
      >
        {/* Top Header Icons */}
        <div className="flex items-center justify-between shrink-0">
          {/* Theme Switch */}
          <div 
            className="dc-ctrl--press relative h-10 w-[72px] rounded-full bg-gradient-to-r from-amber-100 to-amber-50 dark:from-zinc-700 dark:to-zinc-800 cursor-pointer transition-all duration-500 ease-out border border-amber-200/50 dark:border-zinc-600/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] hover:shadow-sm"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {/* Background Icons */}
            <div className="absolute inset-0 flex items-center justify-between px-2.5 pointer-events-none">
              <IconSun className={cn(
                "size-4 transition-all duration-500",
                resolvedTheme === "dark" ? "text-zinc-500 opacity-60" : "text-amber-400 opacity-0 scale-75"
              )} />
              <IconMoon className={cn(
                "size-4 transition-all duration-500",
                resolvedTheme === "dark" ? "text-zinc-400 opacity-0 scale-75" : "text-zinc-400 opacity-60"
              )} />
            </div>
            {/* Sliding Knob */}
            <div 
              className={cn(
                "absolute top-1 h-8 w-8 rounded-full shadow-lg transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center",
                resolvedTheme === "dark" 
                  ? "left-[calc(100%-36px)] bg-gradient-to-br from-zinc-600 to-zinc-700 shadow-zinc-900/30" 
                  : "left-1 bg-gradient-to-br from-white to-amber-50 shadow-amber-200/50"
              )}
            >
              <div className={cn(
                "transition-all duration-500",
                resolvedTheme === "dark" ? "rotate-0 scale-100" : "rotate-90 scale-0 absolute"
              )}>
                <IconMoon className="size-4 text-zinc-200" />
              </div>
              <div className={cn(
                "transition-all duration-500",
                resolvedTheme === "dark" ? "-rotate-90 scale-0 absolute" : "rotate-0 scale-100"
              )}>
                <IconSun className="size-4 text-amber-500" />
              </div>
            </div>
          </div>

          {/* User Avatar */}
          <UserAvatarMenu user={currentUser} variant="avatar" />
        </div>

        {/* System Title */}
        <div className="mt-5 shrink-0">
           <h1 className="text-3xl font-black leading-tight tracking-tight">
             {adminName ? `${adminName}的大棚` : "Stravision莓界大棚"}
           </h1>
        </div>

        {/* 成员 —— 分组之间只压一条 hairline（.mon-sep）+ 留白，
            组内不再套任何「灰底块 / 内嵌卡片」（一层容器原则）。 */}
        <div className="mt-6 pt-6 mon-sep shrink-0">
          <MembersPanel currentUser={currentUser} initialMembers={members} />
        </div>

        {/* Activity —— 唯一允许「滚动」的分组，所以它吃掉剩余高度 */}
        <div className="mt-6 pt-6 mon-sep flex-1 flex flex-col min-h-0">
          <ActivityPanel />
        </div>
      </div>
      </div>
      </div>



      {/* 设备管理对话框
          ⚠️ 必须显式挂 ULTRA_THICK 材质（与成员管理弹层同一套）：
             本页背景是一张真实照片（大棚），弹层只给 `bg-background` 时，
             在桌面端玻璃壳（--berry-canvas 半透明）下会退化成「一层玻璃纸」——
             文字直接压在照片上，几乎读不出来。ULTRA 档 alpha .62 + 64px 模糊
             是规范里「菜单/对话框」这一档，目的就是**几乎不透明以保可读**。 */}
      <Dialog open={deviceDialogOpen} onOpenChange={setDeviceDialogOpen}>
        <DialogContent
          className="dc-mat dc-mat--ultra mon-float sm:max-w-md"
          overlayClassName="mon-float-overlay"
        >
          <DialogHeader>
            <DialogTitle>管理环境控制设备</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-5">
            {/* 已添加的设备 —— 弹层内的「一层容器」同样是：列表行只用 hairline 分隔，
                不铺灰底块（旧版每行都是一个 bg-zinc-50 圆角块 = 弹窗里套一叠小圆角矩形）。
                图标基座是允许的例外：36 见方 / 圆角 8（--dc-r-inner 档）。 */}
            <div>
              <h4 className="mon-group-title text-zinc-500 dark:text-zinc-400 mb-2">已添加的设备</h4>
              <div className="divide-y divide-zinc-900/8 dark:divide-white/10">
                {environmentControls.length === 0 ? (
                  <p className="text-sm text-zinc-400 py-3">暂无设备</p>
                ) : (
                  environmentControls.map((ctrl) => {
                    const Icon = ICON_MAP[ctrl.icon] || IconWater
                    return (
                      <div key={ctrl.id} className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${ctrl.color.fg}1a`, color: ctrl.color.fg }}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{ctrl.name}</div>
                            <div className="text-xs text-zinc-400 dark:text-zinc-500">Relay {ctrl.relay}</div>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-zinc-400 hover:text-red-500"
                          onClick={() => handleRemoveDevice(ctrl.id)}
                        >
                          <IconClose className="w-4 h-4" />
                        </Button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* 可添加的设备 */}
            <div>
              <h4 className="mon-group-title text-zinc-500 dark:text-zinc-400 mb-2">可添加的设备</h4>
              <div className="divide-y divide-zinc-900/8 dark:divide-white/10">
                {AVAILABLE_DEVICES.filter(d => !environmentControls.find(c => c.id === d.id)).map((device) => {
                  const Icon = ICON_MAP[device.icon] || IconWater
                  return (
                    <div key={device.id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${device.color.fg}1a`, color: device.color.fg }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{device.name}</div>
                          <div className="text-xs text-zinc-400 dark:text-zinc-500">Relay {device.relay}</div>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-zinc-400 hover:text-primary"
                        onClick={() => handleAddDevice(device)}
                      >
                        <IconPlus className="w-4 h-4" />
                      </Button>
                    </div>
                  )
                })}
                {AVAILABLE_DEVICES.filter(d => !environmentControls.find(c => c.id === d.id)).length === 0 && (
                  <p className="text-sm text-zinc-400 py-3">所有设备已添加</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 摄像头模态框 */}
      <Dialog open={cameraModalOpen} onOpenChange={setCameraModalOpen}>
        <DialogContent className="sm:max-w-[1400px] p-0 gap-0 overflow-hidden bg-black border-white/10 shadow-lg rounded-2xl [&>button:last-child]:hidden">
           <DialogTitle className="sr-only">监控画面: {selectedCamera?.name}</DialogTitle>
           <div ref={videoContainerRef} className="relative w-full h-[80vh] bg-black group overflow-hidden">
              {/* Background Video */}
              <div className="absolute inset-0 z-0 transition-transform duration-300 ease-out origin-center" style={{ transform: `scale(${zoomLevel})` }}>
                {selectedCamera?.url ? (
                  <LiveStreamPlayer
                    sources={cameraPlayerSources}
                    className="w-full h-full object-cover"
                    autoplay
                    muted={isMuted}
                    controls={false}
                    iceServers={
                      selectedCamera.stunUrl 
                        ? [{ 
                            urls: selectedCamera.stunUrl, 
                            username: selectedCamera.stunUsername || undefined, 
                            credential: selectedCamera.stunPassword || undefined 
                          }] 
                        : undefined
                    }
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 mx-auto rounded-full bg-zinc-800/50 flex items-center justify-center border border-white/5">
                        <IconSignal className="w-8 h-8 text-zinc-600 animate-pulse" />
                      </div>
                      <p className="text-zinc-400 font-medium">无视频信号</p>
                    </div>
                  </div>
                )}
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 pointer-events-none" />

                {/* FFmpeg 缺失提示：RTMP 源在本机无法转封装时给出可操作原因 */}
                {ffmpegMissing && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center p-8 bg-black/70">
                    <div className="max-w-xl space-y-3 text-center">
                      <div className="w-14 h-14 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <IconInfo className="w-6 h-6 text-amber-300" />
                      </div>
                      <p className="text-sm font-medium text-white">本机缺少 FFmpeg，无法解码 RTMP 实时画面</p>
                      <p className="text-xs leading-relaxed whitespace-pre-line text-white/60">
                        {ffmpegStatus?.hint || "请重新安装桌面端，或指定 FFmpeg 可执行文件路径。"}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="pointer-events-auto border-white/20 bg-white/5 text-white hover:bg-white/10"
                        onClick={() => {
                          void fetchFfmpegStatus(true)
                          window.location.reload()
                        }}
                      >
                        <IconRefresh className="w-4 h-4 mr-2" />
                        重新检测
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Top Bar */}
              <div className="absolute top-0 left-0 right-0 z-20 p-6 flex items-start justify-between pointer-events-none">
                 {/* Left: Status */}
                 <div className="flex items-center gap-3 pointer-events-auto">
                    <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-2">
                       <div className={cn("w-2 h-2 rounded-full animate-pulse", selectedCamera?.on ? "bg-red-500" : "bg-zinc-500")} />
                       <span className="text-xs font-bold text-white tracking-wide">{isRecording ? "Recording" : "Live"}</span>
                       <span className="text-[11px] text-white/60 font-mono pl-1 border-l border-white/10 ml-1">430kb/s</span>
                    </div>
                 </div>

                 {/* Center: Title */}
                 <div className="px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 pointer-events-auto">
                    <span className="text-sm font-medium text-white">{selectedCamera?.name || "Smart Camera"}</span>
                 </div>

                 {/* Right: Time & Weather */}
                 <div className="flex items-center gap-3 pointer-events-auto">
                    <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-2 text-white">
                       <IconCloudStorage className="w-4 h-4 text-amber-400" />
                       <span className="text-xs font-mono">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                    {cameraExternalPlayerUrl && (
                      <Button
                        asChild
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white backdrop-blur-md"
                      >
                        <a href={cameraExternalPlayerUrl} target="_blank" rel="noreferrer">
                          <IconLinkOut className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white backdrop-blur-md"
                      onClick={() => setCameraSettingsOpen(true)}
                    >
                       <IconSetting className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white backdrop-blur-md"
                      onClick={() => setCameraModalOpen(false)}
                    >
                       <IconClose className="w-4 h-4" />
                    </Button>
                 </div>
              </div>

              {/* Left Toolbar: Actions */}
              <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-4 pointer-events-none">
                 <div className="flex flex-col gap-3 pointer-events-auto">
                    <Button size="icon" onClick={() => toast.info("警报已触发")} className="h-12 w-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 hover:scale-105 transition-all">
                       <IconAlarmClock className="w-5 h-5" />
                    </Button>
                    <Button size="icon" onClick={() => toast.info("补光灯已开启")} className="h-12 w-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 hover:scale-105 transition-all">
                       <IconLight className="w-5 h-5" />
                    </Button>
                    <Button size="icon" onClick={() => toast.info("通知推送已开启")} className="h-12 w-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 hover:scale-105 transition-all">
                       <IconRemind className="w-5 h-5" />
                    </Button>
                     <Button size="icon" onClick={() => toast.info("进入监控巡航模式")} className="h-12 w-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 hover:scale-105 transition-all">
                       <IconMonitor className="w-5 h-5" />
                    </Button>
                 </div>
              </div>
              
              {/* Bottom Left: Zoom */}
              <div className="absolute left-6 bottom-6 z-20 pointer-events-auto">
                 <div className="flex items-center gap-1 p-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                    <Button size="icon" variant="ghost" onClick={() => handleZoom(-0.5)} className="h-8 w-8 rounded-full text-white hover:bg-white/20">
                       <IconZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-xs font-bold text-white px-2 w-8 text-center">{zoomLevel}X</span>
                    <Button size="icon" variant="ghost" onClick={() => handleZoom(0.5)} className="h-8 w-8 rounded-full text-white hover:bg-white/20">
                       <IconZoomIn className="w-4 h-4" />
                    </Button>
                 </div>
              </div>

              {/* Right Toolbar: Media & PTZ */}
              <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-8 pointer-events-none">
                 {/* Media Controls */}
                 <div className="flex flex-col gap-3 pointer-events-auto">
                    <Button size="icon" onClick={handleSnapshot} className="h-12 w-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 hover:scale-105 transition-all">
                       <IconCamera className="w-5 h-5" />
                    </Button>
                    <Button size="icon" onClick={handleRecord} className={cn("h-12 w-12 rounded-full backdrop-blur-md border border-white/10 text-white hover:bg-white/20 hover:scale-105 transition-all", isRecording ? "bg-red-500/50 border-red-500" : "bg-black/30")}>
                       <IconCd className={cn("w-5 h-5", isRecording && "animate-spin")} />
                    </Button>
                    <Button size="icon" onClick={() => toast.info("麦克风已开启")} className="h-12 w-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 hover:scale-105 transition-all">
                       <IconMicrophone className="w-5 h-5" />
                    </Button>
                 </div>
                 
                 {/* PTZ Controller */}
                 <div className="relative w-48 h-48 rounded-full bg-black/20 backdrop-blur-sm border border-white/5 flex items-center justify-center pointer-events-auto">
                    {/* Direction Buttons */}
                    <Button variant="ghost" size="icon" onClick={() => handlePTZ("up")} className="dc-ctrl--press absolute top-2 left-1/2 -translate-x-1/2 h-10 w-10 rounded-full text-white/70 hover:text-white hover:bg-white/10">
                       <IconUp className="w-6 h-6" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handlePTZ("down")} className="dc-ctrl--press absolute bottom-2 left-1/2 -translate-x-1/2 h-10 w-10 rounded-full text-white/70 hover:text-white hover:bg-white/10">
                       <IconDown className="w-6 h-6" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handlePTZ("left")} className="dc-ctrl--press absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full text-white/70 hover:text-white hover:bg-white/10">
                       <IconLeft className="w-6 h-6" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handlePTZ("right")} className="dc-ctrl--press absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full text-white/70 hover:text-white hover:bg-white/10">
                       <IconRight className="w-6 h-6" />
                    </Button>
                    {/* Center Button */}
                    <Button variant="ghost" size="icon" onClick={() => handlePTZ("reset")} className="h-16 w-16 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10">
                       <IconRound className="w-6 h-6 fill-current" />
                    </Button>
                 </div>

                 {/* Bottom Actions */}
                 <div className="flex flex-col gap-3 pointer-events-auto">
                    <Button size="icon" onClick={() => setIsMuted(!isMuted)} className="h-12 w-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 hover:scale-105 transition-all">
                       {isMuted ? <IconVolumeMute className="w-5 h-5" /> : <IconVolumeNotice className="w-5 h-5" />}
                    </Button>
                    <Button size="icon" onClick={handleFullscreenToggle} className="h-12 w-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 hover:scale-105 transition-all">
                       {isFullscreen ? <IconOffScreen className="w-5 h-5" /> : <IconFullScreen className="w-5 h-5" />}
                    </Button>
                 </div>
              </div>
           </div>
        </DialogContent>
      </Dialog>

      {/* 摄像头设置对话框 */}
      <Dialog open={cameraSettingsOpen} onOpenChange={setCameraSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>摄像头设置</DialogTitle>
          </DialogHeader>
          
          {selectedCamera && (
            <CameraSettingsForm 
              camera={selectedCamera}
              onSave={(settings) => handleCameraSettingsSave(selectedCamera.id, settings)}
              onCancel={() => setCameraSettingsOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ===== AI 助手侧栏（复用 ai-assistant 的对话组件，欢迎词按页面区分）===== */}
      <CopilotSidebar
        pageKey="monitor"
        deviceData={(deviceData ?? null) as unknown as Record<string, unknown> | null}
        context={() => {
          const lines: string[] = ["页面：实时监控（/monitor）"]
          if (deviceData) {
            const t = Number(deviceData.temperature)
            const h = Number(deviceData.humidity)
            if (Number.isFinite(t)) lines.push(`当前温度：${t.toFixed(1)}℃`)
            if (Number.isFinite(h)) lines.push(`当前湿度：${h.toFixed(1)}%`)
            const relays: string[] = []
            for (let i = 1; i <= 4; i++) {
              const key = `relay${i}` as keyof typeof deviceData
              if (deviceData[key] === 1) relays.push(`继电器${i}`)
            }
            if (relays.length) lines.push(`已开启设备：${relays.join("、")}`)
          } else {
            lines.push("设备数据：暂未上报")
          }
          if (selectedCamera) lines.push(`用户刚才正在查看摄像头：${selectedCamera.name}`)
          if (environmentControls.length) {
            lines.push(`可控项：${environmentControls.map((c) => c.name).join("、")}`)
          }
          return lines.join("\n")
        }}
      />
      </div>
    </>
  )
}

// 摄像头设置表单组件
function CameraSettingsForm({ 
  camera, 
  onSave, 
  onCancel 
}: { 
  camera: { name: string; url: string; time: string; username?: string; password?: string; stunUrl?: string; stunUsername?: string; stunPassword?: string }
  onSave: (settings: { name: string; url: string; time: string; username: string; password: string; stunUrl: string; stunUsername: string; stunPassword: string }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(camera.name)
  const [url, setUrl] = useState(camera.url)
  const [time, setTime] = useState(camera.time)
  const [username, setUsername] = useState(camera.username || "")
  const [password, setPassword] = useState(camera.password || "")
  const [showAuth, setShowAuth] = useState(!!camera.username || !!camera.password)
  
  // STUN Configuration State
  const [stunUrl, setStunUrl] = useState(camera.stunUrl || "")
  const [stunUsername, setStunUsername] = useState(camera.stunUsername || "")
  const [stunPassword, setStunPassword] = useState(camera.stunPassword || "")
  const [showAdvanced, setShowAdvanced] = useState(!!camera.stunUrl)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ name, url, time, username, password, stunUrl, stunUsername, stunPassword })
  }

  // 检测是否是 ONVIF 或需要认证的协议
  const needsAuth = url.toLowerCase().includes("onvif") || url.toLowerCase().includes("rtsp")

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="max-h-[60vh] overflow-y-auto px-1">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">摄像头名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="dc-ctrl--field w-full rounded-[8px] px-3 py-2 text-zinc-900 dark:text-zinc-100"
              placeholder="输入摄像头名称"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">视频流地址</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="dc-ctrl--field w-full rounded-[8px] px-3 py-2 text-zinc-900 dark:text-zinc-100"
              placeholder="rtsp://... 或 http://... 或 onvif://... 或 https://player.xstrive.com/video/live?..."
            />
            <p className="text-xs text-zinc-500 mt-1">支持 RTSP、RTMP、HTTP (WHEP/HLS/FLV)、ONVIF，以及 https://player.xstrive.com/video/live?...（右上角可跳转外部播放器）</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">工作时间</label>
            <input
              type="text"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="dc-ctrl--field w-full rounded-[8px] px-3 py-2 text-zinc-900 dark:text-zinc-100"
              placeholder="08:00 - 18:00"
            />
          </div>

          {/* ONVIF/RTSP 认证信息 */}
          {(needsAuth || showAuth) && (
            <div className="space-y-3 pt-3 border-t border-zinc-900/8 dark:border-white/10">
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                认证信息 (ONVIF/RTSP)
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">用户名</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="dc-ctrl--field w-full rounded-[8px] px-3 py-2 text-zinc-900 dark:text-zinc-100"
                  placeholder="摄像头用户名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="dc-ctrl--field w-full rounded-[8px] px-3 py-2 text-zinc-900 dark:text-zinc-100"
                  placeholder="摄像头密码"
                />
              </div>
            </div>
          )}

          {!needsAuth && !showAuth && (
            <button
              type="button"
              onClick={() => setShowAuth(true)}
              className="text-xs text-primary hover:text-primary"
            >
              + 添加认证信息
            </button>
          )}

          {/* 高级设置：STUN/WebRTC */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              <span>{showAdvanced ? "▼" : "▶"}</span>
              高级设置 (WebRTC/STUN)
            </button>
            
            {showAdvanced && (
              <div className="mt-3 space-y-3 animate-in slide-in-from-top-2">
                <p className="text-xs text-zinc-500 mb-2">
                  如果使用 WebRTC 直连，请配置 STUN/TURN 服务器以穿透 NAT。
                </p>
                <div>
                  <label className="block text-sm font-medium mb-1">STUN/TURN 地址</label>
                  <input
                    type="text"
                    value={stunUrl}
                    onChange={(e) => setStunUrl(e.target.value)}
                    className="dc-ctrl--field w-full rounded-[8px] px-3 py-2 text-zinc-900 dark:text-zinc-100"
                    placeholder="stun:stun.l.google.com:19302"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">用户名 (TURN)</label>
                    <input
                      type="text"
                      value={stunUsername}
                      onChange={(e) => setStunUsername(e.target.value)}
                      className="dc-ctrl--field w-full rounded-[8px] px-3 py-2 text-zinc-900 dark:text-zinc-100"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">密码 (TURN)</label>
                    <input
                      type="password"
                      value={stunPassword}
                      onChange={(e) => setStunPassword(e.target.value)}
                      className="dc-ctrl--field w-full rounded-[8px] px-3 py-2 text-zinc-900 dark:text-zinc-100"
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-700">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">
          保存
        </Button>
      </div>
    </form>
  )
}
