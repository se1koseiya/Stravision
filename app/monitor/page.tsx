"use client"
import { Button } from "@/components/ui/button"
import { PageNavigation } from "@/components/page-navigation"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import Image from "next/image"
import { 
  Fan, 
  Droplets, 
  MoreHorizontal,
  Video,
  Box,
  Lock,
  Unlock,
  ChevronRight,
  PlayCircle,
  Settings,
  X,
  Plus,
  Signal,
  Lightbulb,
  Sun,
  CloudSun,
  ExternalLink,
  Siren,
  Bell,
  Monitor,
  ZoomOut,
  ZoomIn,
  Camera,
  Disc,
  Mic,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  Circle,
  VolumeX,
  Volume2,
  Minimize2,
  Maximize2
} from "lucide-react"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useDeviceControl } from "@/lib/hooks/use-device-control"
import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import type { UserPublic } from "@/lib/db/user-service"
import { cn } from "@/lib/utils"
import { MembersPanel } from "@/components/monitor/members-panel"
import { ActivityPanel } from "@/components/monitor/activity-panel"
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const GreenhouseModel = dynamic(
  () => import("@/components/monitor/greenhouse-model").then((mod) => mod.GreenhouseModel),
  { 
    ssr: false,
    loading: () => (
      <div className="relative w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-xl overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-4 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
                <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-blue-500 rounded-2xl opacity-20" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-2xl">🏡</div>
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">加载 3D 模型中...</p>
          </div>
        </div>
      </div>
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
  { id: "relay5", name: "水泵/灌溉", relay: 5 as const, icon: "Droplets", color: { bg: "#E0F2F1", fg: "#009688", gradFrom: "#A7F3D0", gradTo: "#10B981" } },
  { id: "relay6", name: "风扇/通风", relay: 6 as const, icon: "Fan", color: { bg: "#E3F2FD", fg: "#2196F3", gradFrom: "#C7D2FE", gradTo: "#6366F1" } },
  { id: "relay7", name: "补光灯", relay: 7 as const, icon: "Lightbulb", color: { bg: "#FEF3C7", fg: "#F59E0B", gradFrom: "#FDE68A", gradTo: "#F59E0B" } },
  { id: "relay8", name: "白灯", relay: 8 as const, icon: "Sun", color: { bg: "#F3E8FF", fg: "#8B5CF6", gradFrom: "#DDD6FE", gradTo: "#8B5CF6" } },
]

const ICON_MAP: Record<string, typeof Droplets> = {
  Droplets,
  Fan,
  Lightbulb,
  Sun,
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
import { RealtimeVoiceOrb } from "@/components/realtime-voice-orb"

export default function MonitorPage() {
  // Layout adjustments for monitor page
  const router = useRouter()
  const { deviceData } = useDeviceData()
  const { toggleRelay, setLEDs, controlStepper } = useDeviceControl()
  const { setTheme, resolvedTheme } = useTheme()
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null)

  // Use Daily Greeting Hook (Web Speech API version - disabled for now)
  // useDailyGreeting({ 
  //   username: currentUser?.username,
  //   enabled: !!currentUser 
  // })
  
  // Qwen Omni Greeting Logic
  const [showGreeting, setShowGreeting] = useState(false)
  const [greetingText, setGreetingText] = useState("")

  useEffect(() => {
    if (!currentUser?.username) return
    
    const today = new Date().toISOString().split('T')[0]
    const storageKey = `last_greeting_qwen_${currentUser.username}`
    const lastGreetDate = localStorage.getItem(storageKey)
    
    if (lastGreetDate !== today) {
       // Determine greeting based on time of day
       const hour = new Date().getHours()
       let timeGreeting = ''
       if (hour < 6) timeGreeting = '夜深了'
       else if (hour < 9) timeGreeting = '早上好'
       else if (hour < 12) timeGreeting = '上午好'
       else if (hour < 14) timeGreeting = '中午好'
       else if (hour < 18) timeGreeting = '下午好'
       else timeGreeting = '晚上好'

       const text = `${timeGreeting}，${currentUser.username}。我是您的智能管家莓小智，很高兴见到您。`
       setGreetingText(text)
       setShowGreeting(true)
       
       // Mark as greeted
       localStorage.setItem(storageKey, today)
       
       // Auto-hide after 20 seconds
       setTimeout(() => setShowGreeting(false), 20000)
    }
  }, [currentUser])

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
          { id: "relay5", name: "自动灌溉系统", relay: 5, icon: "Droplets", color: { bg: "#E0F2F1", fg: "#009688", gradFrom: "#A7F3D0", gradTo: "#10B981" }, battery: 80 },
          { id: "relay6", name: "智能通风系统", relay: 6, icon: "Fan", color: { bg: "#E3F2FD", fg: "#2196F3", gradFrom: "#C7D2FE", gradTo: "#6366F1" }, battery: 90 },
        ])
      }
    } else {
      // 默认设备
      setEnvironmentControls([
        { id: "relay5", name: "自动灌溉系统", relay: 5, icon: "Droplets", color: { bg: "#E0F2F1", fg: "#009688", gradFrom: "#A7F3D0", gradTo: "#10B981" }, battery: 80 },
        { id: "relay6", name: "智能通风系统", relay: 6, icon: "Fan", color: { bg: "#E3F2FD", fg: "#2196F3", gradFrom: "#C7D2FE", gradTo: "#6366F1" }, battery: 90 },
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="animate-in fade-in duration-500">
          <div className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50" />
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mb-2" />
              <div className="h-4 w-96 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-8" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
                <div className="space-y-4">
                  <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
                  <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
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
          "relative h-5 w-9 rounded-full border border-black/5 shadow-inner transition-colors dark:border-white/10 cursor-pointer",
          on ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-700/60"
        )}
      >
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-white shadow-md transition-all dark:bg-slate-100",
            on ? "left-[calc(100%-18px)]" : "left-0.5"
          )}
        />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full text-foreground overflow-hidden">
      <div className="absolute inset-0 bg-[#F1EFEA] dark:bg-[#0B1220]" />
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(255,255,255,0.75),transparent_60%),radial-gradient(1000px_circle_at_85%_0%,rgba(209,250,229,0.55),transparent_55%),radial-gradient(900px_circle_at_70%_90%,rgba(224,231,255,0.55),transparent_60%)] dark:hidden" />
      <div className="absolute inset-0 hidden dark:block dark:bg-[radial-gradient(1200px_circle_at_15%_10%,rgba(59,130,246,0.18),transparent_60%),radial-gradient(1000px_circle_at_85%_0%,rgba(16,185,129,0.14),transparent_55%),radial-gradient(900px_circle_at_70%_90%,rgba(99,102,241,0.12),transparent_60%)]" />
      
      {/* Logo - 左上角固定 */}
      <div className="fixed top-4 left-6 z-50 flex items-center gap-4">
        <div className="relative size-12 shrink-0">
          <Image src="/icon.png" alt="logo" fill className="object-contain drop-shadow-sm" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-wide text-slate-900 dark:text-white">STRAVISION</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">莓界 · 智慧农业平台</div>
        </div>
      </div>

      <div className="relative flex min-h-screen w-full gap-6 px-4 pb-4 pt-16 lg:px-6 lg:pb-6 lg:pt-20">
      
      {/* Left Column: Devices & Control */}
      <div 
        className="w-[320px] flex flex-col gap-8 shrink-0 animate-in slide-in-from-left duration-700 fade-in h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar pr-2"
        data-lenis-prevent
      >
        {/* Monitoring Devices */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg font-bold flex items-center gap-2">
              监控设备 <span className="text-muted-foreground text-sm font-normal">{cameras.length}</span>
            </h2>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </div>
          <div className="space-y-4">
            {cameras.map((cam) => (
              <div
                key={cam.id}
                data-camera-id={cam.id}
                className="group relative rounded-[22px] bg-white/70 backdrop-blur-xl border border-white/60 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_14px_36px_rgba(0,0,0,0.10)] transition-all duration-300 cursor-pointer dark:bg-slate-900/45 dark:border-white/10 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
                onClick={() => handleCameraClick(cam)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-white/80 border border-black/5 flex items-center justify-center text-slate-800 transition-transform group-hover:scale-110 dark:bg-white/5 dark:border-white/10 dark:text-slate-100 group-hover:text-emerald-500">
                      {cam.on ? <PlayCircle className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{cam.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={cn("w-1.5 h-1.5 rounded-full", cam.on ? "bg-emerald-500" : "bg-slate-300")} />
                        <span className="text-xs text-slate-500 dark:text-slate-400">{cam.on ? "Live" : "Offline"}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-2 font-mono dark:text-slate-500">{cam.time}</div>
                    </div>
                  </div>

                  <MiniToggle on={cam.on} onClick={() => toggleCamera(cam.id)} />
                </div>
              </div>
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
              className="h-8 w-8 text-muted-foreground hover:text-emerald-500"
              onClick={() => setDeviceDialogOpen(true)}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
          <div className="space-y-4">
            {environmentControls.map((ctrl) => {
              const Icon = ICON_MAP[ctrl.icon] || Droplets
              const on = isRelayOn(ctrl.relay as 5 | 6 | 7 | 8)
              const isLocked = lockedControls[ctrl.relay]
              return (
                <div
                  key={ctrl.id}
                  className={cn(
                    "rounded-[28px] bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.06)] overflow-hidden dark:bg-slate-900/45 dark:border-white/10 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)] transition-all",
                    on && "ring-2 ring-emerald-200/60"
                  )}
                >
                  <div className="grid grid-cols-[1fr_64px]">
                    <div className="p-5 cursor-pointer" onClick={() => handleToggle(ctrl.relay as 5 | 6 | 7 | 8)}>
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-4">
                          <div
                            className={cn(
                              "h-12 w-12 rounded-full flex items-center justify-center transition-colors",
                              on ? "bg-emerald-400 text-white" : "text-slate-800"
                            )}
                            style={!on ? { backgroundColor: ctrl.color.bg, color: ctrl.color.fg } : undefined}
                          >
                            <Icon className={cn("h-6 w-6", ctrl.relay === 6 && on && "animate-spin")} />
                          </div>

                          <div>
                            <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              {ctrl.name}
                              {isLocked && <Lock className="h-3 w-3 text-slate-400" />}
                            </div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{on ? "Active" : "Offline"}</div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="secondary"
                              className={cn(
                                "h-8 w-8 rounded-full bg-white/70 hover:bg-white border border-black/5 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10",
                                isLocked && "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                              )}
                              onClick={(e) => toggleLock(ctrl.relay, e)}
                            >
                              {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-8 w-8 rounded-full bg-white/70 hover:bg-white border border-black/5 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push('/device-control')
                              }}
                            >
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-between py-3 border-l border-white/60 dark:border-white/10">
                      <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{ctrl.battery}%</div>
                      <div className="text-[10px] text-slate-400 tracking-wide dark:text-slate-500">Battery</div>
                      <div className="relative h-28 w-10 rounded-full bg-slate-100 overflow-hidden dark:bg-white/10">
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
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Center Column: Main Visual */}
      <div className="flex-1 flex flex-col relative rounded-[44px] bg-[#EDEBE6]/80 backdrop-blur-xl border border-white/50 shadow-[0_20px_60px_rgba(0,0,0,0.08)] overflow-hidden animate-in zoom-in-95 duration-700 fade-in delay-100 dark:bg-slate-900/35 dark:border-white/10 dark:shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        {/* Header */}
        <div className="flex justify-between items-start p-6 pb-0 z-10">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100">监室设备</h1>
            <p className="text-slate-500 font-medium mt-1 dark:text-slate-400">Agriculture</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-100/80 border border-white/70 px-5 py-2 text-sm font-bold text-emerald-700 shadow-sm cursor-pointer hover:bg-emerald-100 transition-colors dark:bg-emerald-400/15 dark:border-emerald-400/20 dark:text-emerald-200 dark:hover:bg-emerald-400/18">1 Flow</div>
            <div className="rounded-full bg-white/70 backdrop-blur border border-white/70 px-5 py-2 text-sm font-medium text-slate-700 shadow-sm cursor-pointer hover:bg-white/90 transition-colors dark:bg-white/5 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/8">2 Flow</div>
            <div className="rounded-full bg-white/70 backdrop-blur border border-white/70 px-5 py-2 text-sm font-medium text-slate-700 shadow-sm cursor-pointer hover:bg-white/90 transition-colors dark:bg-white/5 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/8">Garage</div>
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

          <div className="absolute bottom-6 left-6 rounded-[18px] bg-white/70 backdrop-blur-xl border border-white/70 px-4 py-3 shadow-sm dark:bg-slate-900/45 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">Sensor</div>
              <div className="h-4 w-px bg-slate-200 dark:bg-white/10" />
              <div className="text-xs text-slate-700 dark:text-slate-200">{deviceData ? `${deviceData.temperature.toFixed(1)}°C · ${deviceData.humidity.toFixed(1)}%` : "--"}</div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation / Controls */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center items-end pointer-events-none">
           <div className="pointer-events-auto flex items-center gap-4">
              {/* Filter Toggles */}
              <div className="bg-white/75 backdrop-blur-xl rounded-full p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.10)] border border-white/70 flex gap-1 dark:bg-slate-900/45 dark:border-white/10 dark:shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
                <Button 
                  variant="ghost" 
                  onClick={() => setFilter("all")}
                  className={cn(
                    "rounded-full px-6 h-10 hover:text-slate-900 hover:bg-white/70 dark:hover:text-slate-100 dark:hover:bg-white/8 transition-all",
                    filter === "all" ? "bg-white/90 text-slate-900 shadow-sm dark:bg-white/10 dark:text-slate-100" : "text-slate-500 dark:text-slate-300"
                  )}
                >
                  All
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => setFilter("active")}
                  className={cn(
                    "rounded-full px-6 h-10 hover:bg-emerald-100 shadow-none border-0 dark:hover:bg-emerald-400/18 transition-all",
                    filter === "active" ? "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200" : "text-slate-500 dark:text-slate-300"
                  )}
                >
                  Active
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setFilter("offline")}
                  className={cn(
                    "rounded-full px-6 h-10 hover:text-slate-900 hover:bg-white/70 dark:hover:text-slate-100 dark:hover:bg-white/8 transition-all",
                    filter === "offline" ? "bg-white/90 text-slate-900 shadow-sm dark:bg-white/10 dark:text-slate-100" : "text-slate-500 dark:text-slate-300"
                  )}
                >
                  Offline
                </Button>
              </div>

              {/* 3D Rotate Button */}
              <Button size="icon" className="h-12 w-12 rounded-2xl bg-white/75 backdrop-blur-xl border border-white/70 text-slate-800 shadow-lg hover:bg-white dark:bg-slate-900/45 dark:border-white/10 dark:text-slate-100 dark:hover:bg-slate-900/70">
                 <Box className="h-6 w-6" />
              </Button>
           </div>
        </div>
      </div>

      {/* Floating Navigation (Top Center Overlay) */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 scale-95 hover:scale-100 transition-transform origin-top">
        <PageNavigation variant={resolvedTheme === "dark" ? "dark" : "light"} />
      </div>

      {/* Right Column: System Info & Activity */}
      <div 
        className="w-[360px] flex flex-col gap-8 shrink-0 rounded-[44px] bg-white/70 backdrop-blur-xl border border-white/60 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] animate-in slide-in-from-right duration-700 fade-in dark:bg-slate-900/50 dark:border-white/10 dark:shadow-[0_30px_80px_rgba(0,0,0,0.45)] h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar"
        data-lenis-prevent
      >
        {/* Top Header Icons */}
        <div className="flex items-center justify-between shrink-0">
          {/* Theme Switch */}
          <div 
            className="relative h-10 w-[72px] rounded-full bg-gradient-to-r from-amber-100 to-amber-50 dark:from-slate-700 dark:to-slate-800 cursor-pointer transition-all duration-500 ease-out border border-amber-200/50 dark:border-slate-600/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] hover:shadow-md"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {/* Background Icons */}
            <div className="absolute inset-0 flex items-center justify-between px-2.5 pointer-events-none">
              <SunIcon className={cn(
                "size-4 transition-all duration-500",
                resolvedTheme === "dark" ? "text-slate-500 opacity-60" : "text-amber-400 opacity-0 scale-75"
              )} />
              <MoonIcon className={cn(
                "size-4 transition-all duration-500",
                resolvedTheme === "dark" ? "text-slate-400 opacity-0 scale-75" : "text-slate-400 opacity-60"
              )} />
            </div>
            {/* Sliding Knob */}
            <div 
              className={cn(
                "absolute top-1 h-8 w-8 rounded-full shadow-lg transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center",
                resolvedTheme === "dark" 
                  ? "left-[calc(100%-36px)] bg-gradient-to-br from-slate-600 to-slate-700 shadow-slate-900/30" 
                  : "left-1 bg-gradient-to-br from-white to-amber-50 shadow-amber-200/50"
              )}
            >
              <div className={cn(
                "transition-all duration-500",
                resolvedTheme === "dark" ? "rotate-0 scale-100" : "rotate-90 scale-0 absolute"
              )}>
                <MoonIcon className="size-4 text-slate-200" />
              </div>
              <div className={cn(
                "transition-all duration-500",
                resolvedTheme === "dark" ? "-rotate-90 scale-0 absolute" : "rotate-0 scale-100"
              )}>
                <SunIcon className="size-4 text-amber-500" />
              </div>
            </div>
          </div>

          {/* User Avatar */}
          <UserAvatarMenu user={currentUser} variant="avatar" />
        </div>

        {/* System Title */}
        <div className="mt-4">
           <h1 className="text-3xl font-black leading-tight tracking-tight">
             {adminName ? `${adminName}的大棚` : "Stravision莓界大棚"}
           </h1>
        </div>

        {/* 成员 */}
        <MembersPanel currentUser={currentUser} initialMembers={members} />

        {/* Activity */}
        <ActivityPanel />
      </div>
      </div>

      {/* Greeting Orb */}
      {showGreeting && (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-center gap-3 pointer-events-none animate-in slide-in-from-bottom-10 fade-in duration-500">
          <div className="bg-black/80 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full border border-white/10 shadow-lg mb-2">
            正在为您播报每日问候...
          </div>
          <div className="pointer-events-auto">
            <RealtimeVoiceOrb 
              size={64}
              autoConnect={true}
              instructions="你是莓小智，一个专业、友好的AI语音助手。用中文简洁回答问题。"
              initialGreeting={greetingText}
              voice="Cherry"
              onStatusChange={(status) => {
                 if (status === 'error') setShowGreeting(false)
              }}
            />
          </div>
        </div>
      )}

      {/* 设备管理对话框 */}
      <Dialog open={deviceDialogOpen} onOpenChange={setDeviceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>管理环境控制设备</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 已添加的设备 */}
            <div>
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">已添加的设备</h4>
              <div className="space-y-2">
                {environmentControls.length === 0 ? (
                  <p className="text-sm text-slate-400">暂无设备</p>
                ) : (
                  environmentControls.map((ctrl) => {
                    const Icon = ICON_MAP[ctrl.icon] || Droplets
                    return (
                      <div key={ctrl.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-9 h-9 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: ctrl.color.bg, color: ctrl.color.fg }}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">{ctrl.name}</div>
                            <div className="text-xs text-slate-400">Relay {ctrl.relay}</div>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-400 hover:text-red-500"
                          onClick={() => handleRemoveDevice(ctrl.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* 可添加的设备 */}
            <div>
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">可添加的设备</h4>
              <div className="space-y-2">
                {AVAILABLE_DEVICES.filter(d => !environmentControls.find(c => c.id === d.id)).map((device) => {
                  const Icon = ICON_MAP[device.icon] || Droplets
                  return (
                    <div key={device.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-9 h-9 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: device.color.bg, color: device.color.fg }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{device.name}</div>
                          <div className="text-xs text-slate-400">Relay {device.relay}</div>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-emerald-500"
                        onClick={() => handleAddDevice(device)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  )
                })}
                {AVAILABLE_DEVICES.filter(d => !environmentControls.find(c => c.id === d.id)).length === 0 && (
                  <p className="text-sm text-slate-400">所有设备已添加</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 摄像头模态框 */}
      <Dialog open={cameraModalOpen} onOpenChange={setCameraModalOpen}>
        <DialogContent className="sm:max-w-[1400px] p-0 gap-0 overflow-hidden bg-black border-white/10 shadow-2xl rounded-3xl [&>button:last-child]:hidden">
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
                        <Signal className="w-8 h-8 text-zinc-600 animate-pulse" />
                      </div>
                      <p className="text-zinc-400 font-medium">无视频信号</p>
                    </div>
                  </div>
                )}
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 pointer-events-none" />
              </div>

              {/* Top Bar */}
              <div className="absolute top-0 left-0 right-0 z-20 p-6 flex items-start justify-between pointer-events-none">
                 {/* Left: Status */}
                 <div className="flex items-center gap-3 pointer-events-auto">
                    <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-2">
                       <div className={cn("w-2 h-2 rounded-full animate-pulse", selectedCamera?.on ? "bg-red-500" : "bg-zinc-500")} />
                       <span className="text-xs font-bold text-white tracking-wide">{isRecording ? "Recording" : "Live"}</span>
                       <span className="text-[10px] text-white/60 font-mono pl-1 border-l border-white/10 ml-1">430kb/s</span>
                    </div>
                 </div>

                 {/* Center: Title */}
                 <div className="px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 pointer-events-auto">
                    <span className="text-sm font-medium text-white">{selectedCamera?.name || "Smart Camera"}</span>
                 </div>

                 {/* Right: Time & Weather */}
                 <div className="flex items-center gap-3 pointer-events-auto">
                    <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-2 text-white">
                       <CloudSun className="w-4 h-4 text-amber-400" />
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
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white backdrop-blur-md"
                      onClick={() => setCameraSettingsOpen(true)}
                    >
                       <Settings className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white backdrop-blur-md"
                      onClick={() => setCameraModalOpen(false)}
                    >
                       <X className="w-4 h-4" />
                    </Button>
                 </div>
              </div>

              {/* Left Toolbar: Actions */}
              <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-4 pointer-events-none">
                 <div className="flex flex-col gap-3 pointer-events-auto">
                    <Button size="icon" onClick={() => toast.info("警报已触发")} className="h-12 w-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 hover:scale-105 transition-all">
                       <Siren className="w-5 h-5" />
                    </Button>
                    <Button size="icon" onClick={() => toast.info("补光灯已开启")} className="h-12 w-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 hover:scale-105 transition-all">
                       <Lightbulb className="w-5 h-5" />
                    </Button>
                    <Button size="icon" onClick={() => toast.info("通知推送已开启")} className="h-12 w-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 hover:scale-105 transition-all">
                       <Bell className="w-5 h-5" />
                    </Button>
                     <Button size="icon" onClick={() => toast.info("进入监控巡航模式")} className="h-12 w-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 hover:scale-105 transition-all">
                       <Monitor className="w-5 h-5" />
                    </Button>
                 </div>
              </div>
              
              {/* Bottom Left: Zoom */}
              <div className="absolute left-6 bottom-6 z-20 pointer-events-auto">
                 <div className="flex items-center gap-1 p-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                    <Button size="icon" variant="ghost" onClick={() => handleZoom(-0.5)} className="h-8 w-8 rounded-full text-white hover:bg-white/20">
                       <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-xs font-bold text-white px-2 w-8 text-center">{zoomLevel}X</span>
                    <Button size="icon" variant="ghost" onClick={() => handleZoom(0.5)} className="h-8 w-8 rounded-full text-white hover:bg-white/20">
                       <ZoomIn className="w-4 h-4" />
                    </Button>
                 </div>
              </div>

              {/* Right Toolbar: Media & PTZ */}
              <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-8 pointer-events-none">
                 {/* Media Controls */}
                 <div className="flex flex-col gap-3 pointer-events-auto">
                    <Button size="icon" onClick={handleSnapshot} className="h-12 w-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 hover:scale-105 transition-all">
                       <Camera className="w-5 h-5" />
                    </Button>
                    <Button size="icon" onClick={handleRecord} className={cn("h-12 w-12 rounded-full backdrop-blur-md border border-white/10 text-white hover:bg-white/20 hover:scale-105 transition-all", isRecording ? "bg-red-500/50 border-red-500" : "bg-black/30")}>
                       <Disc className={cn("w-5 h-5", isRecording && "animate-spin")} />
                    </Button>
                    <Button size="icon" onClick={() => toast.info("麦克风已开启")} className="h-12 w-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 hover:scale-105 transition-all">
                       <Mic className="w-5 h-5" />
                    </Button>
                 </div>
                 
                 {/* PTZ Controller */}
                 <div className="relative w-48 h-48 rounded-full bg-black/20 backdrop-blur-sm border border-white/5 flex items-center justify-center pointer-events-auto">
                    {/* Direction Buttons */}
                    <Button variant="ghost" size="icon" onClick={() => handlePTZ("up")} className="absolute top-2 left-1/2 -translate-x-1/2 h-10 w-10 rounded-full text-white/70 hover:text-white hover:bg-white/10">
                       <ChevronUp className="w-6 h-6" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handlePTZ("down")} className="absolute bottom-2 left-1/2 -translate-x-1/2 h-10 w-10 rounded-full text-white/70 hover:text-white hover:bg-white/10">
                       <ChevronDown className="w-6 h-6" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handlePTZ("left")} className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full text-white/70 hover:text-white hover:bg-white/10">
                       <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handlePTZ("right")} className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full text-white/70 hover:text-white hover:bg-white/10">
                       <ChevronRight className="w-6 h-6" />
                    </Button>
                    {/* Center Button */}
                    <Button variant="ghost" size="icon" onClick={() => handlePTZ("reset")} className="h-16 w-16 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10">
                       <Circle className="w-6 h-6 fill-current" />
                    </Button>
                 </div>

                 {/* Bottom Actions */}
                 <div className="flex flex-col gap-3 pointer-events-auto">
                    <Button size="icon" onClick={() => setIsMuted(!isMuted)} className="h-12 w-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 hover:scale-105 transition-all">
                       {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </Button>
                    <Button size="icon" onClick={handleFullscreenToggle} className="h-12 w-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 hover:scale-105 transition-all">
                       {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
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
    </div>
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
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              placeholder="输入摄像头名称"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">视频流地址</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              placeholder="rtsp://... 或 http://... 或 onvif://... 或 https://player.xstrive.com/video/live?..."
            />
            <p className="text-xs text-slate-500 mt-1">支持 RTSP、RTMP、HTTP (WHEP/HLS/FLV)、ONVIF，以及 https://player.xstrive.com/video/live?...（右上角可跳转外部播放器）</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">工作时间</label>
            <input
              type="text"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              placeholder="08:00 - 18:00"
            />
          </div>

          {/* ONVIF/RTSP 认证信息 */}
          {(needsAuth || showAuth) && (
            <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                认证信息 (ONVIF/RTSP)
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">用户名</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  placeholder="摄像头用户名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  placeholder="摄像头密码"
                />
              </div>
            </div>
          )}

          {!needsAuth && !showAuth && (
            <button
              type="button"
              onClick={() => setShowAuth(true)}
              className="text-xs text-emerald-500 hover:text-emerald-600"
            >
              + 添加认证信息
            </button>
          )}

          {/* 高级设置：STUN/WebRTC */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <span>{showAdvanced ? "▼" : "▶"}</span>
              高级设置 (WebRTC/STUN)
            </button>
            
            {showAdvanced && (
              <div className="mt-3 space-y-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg animate-in slide-in-from-top-2">
                <p className="text-xs text-slate-500 mb-2">
                  如果使用 WebRTC 直连，请配置 STUN/TURN 服务器以穿透 NAT。
                </p>
                <div>
                  <label className="block text-sm font-medium mb-1">STUN/TURN 地址</label>
                  <input
                    type="text"
                    value={stunUrl}
                    onChange={(e) => setStunUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">密码 (TURN)</label>
                    <input
                      type="password"
                      value={stunPassword}
                      onChange={(e) => setStunPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
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
