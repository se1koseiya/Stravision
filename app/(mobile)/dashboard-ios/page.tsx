"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import Image from "next/image"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useDeviceControl } from "@/lib/hooks/use-device-control"
import { MobileBackground } from "@/components/mobile-background"
import { LiveStreamPlayer } from "@/components/live-stream-player"
import type { UserPublic } from "@/lib/db/user-service"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import { useDraggableScroll } from "@/lib/hooks/use-draggable-scroll"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { IconChartLine, IconCloudy, IconFan, IconFire, IconFullScreenOne, IconHamburgerButton, IconLight, IconLock, IconMedicineChest, IconOffScreenOne, IconSave, IconSeedling, IconSettingOne, IconSun, IconThunderbolt, IconUnlock, IconVideoOne, IconWater, IconZoomIn, IconZoomOut } from "@/components/icon";
// Constants from monitor page
const AVAILABLE_DEVICES = [
  { id: "relay5", name: "水泵/灌溉", relay: 5 as const, icon: "Droplets", color: { bg: "#E0F2F1", fg: "#009688", gradFrom: "#A7F3D0", gradTo: "#10B981" } },
  { id: "relay6", name: "风扇/通风", relay: 6 as const, icon: "Fan", color: { bg: "#E3F2FD", fg: "#2196F3", gradFrom: "#C7D2FE", gradTo: "#6366F1" } },
  { id: "relay7", name: "植物全光谱补光灯", relay: 7 as const, icon: "Lightbulb", color: { bg: "#FEF3C7", fg: "#F59E0B", gradFrom: "#FDE68A", gradTo: "#F59E0B" } },
  { id: "relay8", name: "光照植物补光灯", relay: 8 as const, icon: "Sun", color: { bg: "#F3E8FF", fg: "#8B5CF6", gradFrom: "#DDD6FE", gradTo: "#8B5CF6" } },
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

function RoomTabs({ selected, onSelect }: { selected: string; onSelect: (room: string) => void }) {
  const rooms = ["常用", "种植区A", "种植区B", "控制室"]
  const scrollRef = useDraggableScroll<HTMLDivElement>()
  return (
    <div ref={scrollRef} className="flex items-center gap-3 overflow-x-auto px-6 py-2 scrollbar-hide">
      {rooms.map((room) => {
        const isSelected = selected === room
        return (
          <button
            key={room}
            onClick={() => onSelect(room)}
            className={cn(
              "px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap border",
              isSelected
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-lg shadow-slate-900/20"
                : "bg-white/55 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-white/60 dark:border-white/10 hover:bg-white/70 dark:hover:bg-white/10 backdrop-blur-xl"
            )}
          >
            {room}
          </button>
        )
      })}
      <button className="p-2.5 rounded-full bg-white/55 dark:bg-white/5 backdrop-blur-xl border border-white/60 dark:border-white/10 text-slate-500 dark:text-slate-400 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
        <IconHamburgerButton className="size-5" />
      </button>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, unit, color, bg }: { icon: React.ComponentType<{ className?: string; size?: number | string }>; label: string; value: string | number; unit?: string; color: string; bg: string }) {
  return (
    <div className="group relative rounded-[2rem] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] flex flex-col justify-between h-[120px] transition-all duration-300 bg-white/55 dark:bg-white/5 backdrop-blur-2xl border border-white/60 dark:border-white/10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="flex items-start justify-between relative z-10">
        <div className={cn("size-10 rounded-2xl flex items-center justify-center transition-colors", bg)}>
          <Icon size={20} className={color} />
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold tracking-wide">{label}</span>
      </div>
      
      <div className="flex items-end justify-between relative z-10">
        <div className="text-2xl font-bold text-slate-900 dark:text-white font-jinbuti">
          {value}{unit ? <span className="text-xs font-bold text-slate-400 ml-1 font-sans">{unit}</span> : null}
        </div>
      </div>
    </div>
  )
}

export default function DashboardIOSPage() {
  const { deviceData, connectionStatus } = useDeviceData()
  const { toggleRelay } = useDeviceControl()
  const { weatherData } = useWeatherContext()
  const [user, setUser] = useState<UserPublic | null>(null)
  const [selectedRoom, setSelectedRoom] = useState("常用")
  const mainScrollRef = useDraggableScroll<HTMLDivElement>()
  const controlsScrollRef = useDraggableScroll<HTMLDivElement>()

  // Monitor State
  const [cameras, setCameras] = useState([
    { id: 1, name: "温室摄像头 A", time: "08:00 - 18:00", on: true, url: "", username: "", password: "", stunUrl: "", stunUsername: "", stunPassword: "" },
    { id: 2, name: "温室摄像头 B", time: "08:00 - 18:00", on: true, url: "", username: "", password: "", stunUrl: "", stunUsername: "", stunPassword: "" },
  ])
  const [selectedCamera, setSelectedCamera] = useState<typeof cameras[0] | null>(null)
  const [environmentControls, setEnvironmentControls] = useState<EnvironmentControl[]>([])
  const [lockedControls, setLockedControls] = useState<Record<number, boolean>>({})

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [editForm, setEditForm] = useState({ id: 0, url: "", name: "" })

  // Zoom State
  const [zoomLevel, setZoomLevel] = useState(1)

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false)
  const videoContainerRef = useRef<HTMLDivElement>(null)

  // Initialize selected camera
  useEffect(() => {
    if (cameras.length > 0 && !selectedCamera) {
      setSelectedCamera(cameras[0])
      setZoomLevel(1) // Reset zoom when camera changes
    }
  }, [cameras, selectedCamera])

  // Handle Fullscreen Change
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

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      videoContainerRef.current?.requestFullscreen().catch((err) => {
        toast.error("无法进入全屏模式")
      })
    } else {
      document.exitFullscreen()
    }
  }

  // Monitor Logic: Stream URL Proxy
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

  // Load/Save Configs
  useEffect(() => {
    const savedControls = localStorage.getItem("monitor-environment-controls")
    if (savedControls) {
      try {
        setEnvironmentControls(JSON.parse(savedControls))
      } catch {
        // Defaults
        setEnvironmentControls([
          { id: "relay5", name: "自动灌溉系统", relay: 5, icon: "Droplets", color: { bg: "#E0F2F1", fg: "#009688", gradFrom: "#A7F3D0", gradTo: "#10B981" }, battery: 80 },
          { id: "relay6", name: "智能通风系统", relay: 6, icon: "Fan", color: { bg: "#E3F2FD", fg: "#2196F3", gradFrom: "#C7D2FE", gradTo: "#6366F1" }, battery: 90 },
        ])
      }
    } else {
      setEnvironmentControls([
        { id: "relay5", name: "自动灌溉系统", relay: 5, icon: "Droplets", color: { bg: "#E0F2F1", fg: "#009688", gradFrom: "#A7F3D0", gradTo: "#10B981" }, battery: 80 },
        { id: "relay6", name: "智能通风系统", relay: 6, icon: "Fan", color: { bg: "#E3F2FD", fg: "#2196F3", gradFrom: "#C7D2FE", gradTo: "#6366F1" }, battery: 90 },
      ])
    }

    const savedCameras = localStorage.getItem("monitor-cameras")
    if (savedCameras) {
      try {
        setCameras(JSON.parse(savedCameras))
      } catch {}
    }
  }, [])

  // Sync Cameras with API
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch("/api/greenhouse/cameras")
        if (!res.ok) return
        const data = (await res.json()) as { cameraAUrl?: string; cameraBUrl?: string }
        if (cancelled) return
        setCameras((current) => {
          const next = current.map((cam) => {
            if (cam.id === 1) {
              const mergedUrl = cam.url?.trim() ? cam.url : (typeof data.cameraAUrl === "string" ? data.cameraAUrl : "")
              return { ...cam, url: mergedUrl }
            }
            if (cam.id === 2) {
              const mergedUrl = cam.url?.trim() ? cam.url : (typeof data.cameraBUrl === "string" ? data.cameraBUrl : "")
              return { ...cam, url: mergedUrl }
            }
            return cam
          })
          try {
            localStorage.setItem("monitor-cameras", JSON.stringify(next))
          } catch {}
          return next
        })
      } catch {}
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  // Control Handlers
  const isRelayOn = (relayNum: 5 | 6 | 7 | 8) => {
    return deviceData?.[`relay${relayNum}`] === 1
  }

  const handleToggle = (relayNum: 5 | 6 | 7 | 8) => {
    if (lockedControls[relayNum]) return
    if (!deviceData) return
    const current = deviceData[`relay${relayNum}`]
    toggleRelay(relayNum, current)
  }

  const toggleLock = (relay: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setLockedControls(prev => ({ ...prev, [relay]: !prev[relay] }))
  }

  // Settings Handlers
  const handleOpenSettings = (camera: typeof cameras[0]) => {
    setEditForm({ id: camera.id, url: camera.url || "", name: camera.name })
    setIsSettingsOpen(true)
  }

  const handleSaveSettings = () => {
    const updatedCameras = cameras.map(cam => {
      if (cam.id === editForm.id) {
        return { ...cam, url: editForm.url, name: editForm.name }
      }
      return cam
    })
    
    setCameras(updatedCameras)
    localStorage.setItem("monitor-cameras", JSON.stringify(updatedCameras))
    
    // Update selected camera if it's the one being edited
    if (selectedCamera?.id === editForm.id) {
      setSelectedCamera(updatedCameras.find(c => c.id === editForm.id) || null)
    }
    
    setIsSettingsOpen(false)
    toast.success("摄像头配置已保存")
  }

  // Spectral Analysis Logic
  const channels = [
    { id: 'channel1', name: '415', label: 'Violet' },
    { id: 'channel2', name: '445', label: 'Blue' },
    { id: 'channel3', name: '480', label: 'Cyan' },
    { id: 'channel4', name: '515', label: 'Green' },
    { id: 'channel5', name: '555', label: 'Y-G' },
    { id: 'channel6', name: '590', label: 'Yellow' },
    { id: 'channel7', name: '630', label: 'Orange' },
    { id: 'channel8', name: '680', label: 'Red' },
    { id: 'channel9', name: 'NIR', label: 'NIR' },
    { id: 'channel10', name: 'Clr', label: 'Clear' },
    { id: 'channel11', name: 'Fli', label: 'Flicker' },
  ]

  let maxChannel = channels[0]
  let spectralValue = 0

  if (deviceData) {
    maxChannel = channels.reduce((prev, current) => {
      // @ts-ignore
      const prevVal = (deviceData[prev.id] as number) || 0
      // @ts-ignore
      const currVal = (deviceData[current.id] as number) || 0
      return currVal > prevVal ? current : prev
    }, channels[0])
    // @ts-ignore
    spectralValue = deviceData[maxChannel.id] || 0
  }

  // Rainfall
  const todayPrecip = weatherData?.forecast?.forecastday?.[0]?.day?.totalprecip_mm || 0

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/auth/me")
        const data = await res.json()
        if (data?.authenticated && data?.user) setUser(data.user as UserPublic)
      } catch {}
    })()
  }, [])

  return (
    <div className="min-h-screen w-screen bg-transparent dark:bg-[#0B1121] text-foreground font-sans transition-colors duration-500 overflow-x-hidden">
      <MobileBackground />
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <div className="px-6 pt-16 pb-6">
          <div className="flex justify-between items-center mb-8">
            <div className="bg-white/55 dark:bg-white/5 backdrop-blur-2xl px-5 py-3 rounded-[2rem] border border-white/60 dark:border-white/10 shadow-[0_12px_36px_rgba(15,23,42,0.10)] flex items-center gap-3">
               <div className="flex flex-col">
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight" style={{ fontFamily: 'var(--font-jinbuti)' }}>
                    {user?.username ? `${user.username}的大棚` : '我的大棚'}
                  </h1>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn("size-1.5 rounded-full animate-pulse", connectionStatus.connected ? "bg-green-500" : "bg-red-500")} />
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {connectionStatus.connected ? '设备在线' : '设备离线'}
                    </span>
                  </div>
               </div>
            </div>

            <div className="relative size-12 bg-white/55 dark:bg-white/5 backdrop-blur-2xl rounded-full border border-white/60 dark:border-white/10 shadow-[0_12px_36px_rgba(15,23,42,0.10)] flex items-center justify-center overflow-visible animate-[breathe_4s_ease-in-out_infinite]">
               <div className="absolute bottom-0 w-16 h-16 transition-transform hover:scale-110 duration-300">
                  <Image 
                    src="/ip/智慧农业3D图标-数据监测-细线版.png" 
                    alt="IP" 
                    fill 
                    className="object-contain drop-shadow-md scale-125 -translate-y-2"
                  />
               </div>
             </div>
          </div>

          {/* Weather Widget */}
          <div className="bg-white/55 dark:bg-white/5 backdrop-blur-2xl rounded-[2rem] p-6 border border-white/60 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-center px-2">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <div className="p-2 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-500">
                     <IconFire className="size-5" />
                  </div>
                  <span className="text-2xl font-bold font-jinbuti">{weatherData?.current?.temp_c ? Math.round(weatherData.current.temp_c) : 24}°</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wider">{weatherData?.location?.name || '上城区'}</span>
              </div>
              <div className="w-px h-10 bg-gradient-to-b from-transparent via-slate-200 dark:via-white/10 to-transparent" />
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                   <div className="p-2 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-500">
                      <IconMedicineChest className="size-5" />
                   </div>
                  <span className="text-2xl font-bold font-jinbuti">{weatherData?.current?.humidity || 67}%</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wider">湿度</span>
              </div>
              <div className="w-px h-10 bg-gradient-to-b from-transparent via-slate-200 dark:via-white/10 to-transparent" />
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                   <div className="p-2 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-500">
                      <IconThunderbolt className="size-5" />
                   </div>
                  <span className="text-lg font-bold">优</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wider">PM2.5</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Stream */}
        <div className="px-6 mb-6">
          <div 
            ref={videoContainerRef}
            className={cn(
              "relative bg-black overflow-hidden shadow-2xl ring-1 ring-white/10 group transition-all duration-300",
              isFullscreen ? "rounded-none" : "rounded-[2rem] aspect-video"
            )}
          >
            <div 
              className="absolute inset-0 transition-transform duration-300 ease-out origin-center" 
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {selectedCamera?.url ? (
                <LiveStreamPlayer
                  sources={cameraPlayerSources}
                  licenseUrl={process.env.NEXT_PUBLIC_TCPLAYER_LICENSE_URL}
                  autoplay
                  muted
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
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                  <div className="text-center space-y-4">
                      <div className="w-16 h-16 mx-auto rounded-full bg-zinc-800/50 flex items-center justify-center border border-white/5">
                        <IconVideoOne size={32} className="text-zinc-600" />
                      </div>
                      <p className="text-zinc-400 text-sm font-medium">无信号</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-white/20 z-20">
              <span className={cn("size-2 rounded-full bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]", !selectedCamera?.url && "bg-gray-400 animate-none")} />
              <span className="text-white text-[10px] font-bold tracking-wide uppercase">{selectedCamera?.url ? "Live" : "Offline"}</span>
              {zoomLevel > 1 && (
                <span className="text-white/80 text-[10px] font-jinbuti border-l border-white/20 pl-2 ml-1">
                  {zoomLevel.toFixed(1)}x
                </span>
              )}
            </div>

            {/* Controls Overlay */}
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
              <button 
                onClick={() => selectedCamera && handleOpenSettings(selectedCamera)}
                className="size-9 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:bg-black/50 transition-colors shadow-sm"
              >
                <IconSettingOne size={16} />
              </button>
              
              <button 
                onClick={handleFullscreenToggle}
                className="size-9 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:bg-black/50 transition-colors shadow-sm"
              >
                {isFullscreen ? <IconOffScreenOne size={16} /> : <IconFullScreenOne size={16} />}
              </button>
              
              <div className="flex flex-col gap-1 bg-black/30 backdrop-blur-md border border-white/10 rounded-full p-1 shadow-sm mt-2">
                <button 
                  onClick={() => handleZoom(0.5)}
                  disabled={zoomLevel >= 3}
                  className="size-8 rounded-full flex items-center justify-center text-white/90 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <IconZoomIn size={16} />
                </button>
                <div className="h-px w-4 bg-white/10 mx-auto" />
                <button 
                  onClick={() => handleZoom(-0.5)}
                  disabled={zoomLevel <= 1}
                  className="size-8 rounded-full flex items-center justify-center text-white/90 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <IconZoomOut size={16} />
                </button>
              </div>
            </div>
            
            {/* Camera Switcher Overlay */}
            <div className={cn(
              "absolute left-0 right-0 flex justify-center gap-2 px-4 z-20 transition-all duration-300",
              isFullscreen ? "bottom-8" : "bottom-4"
            )}>
              {cameras.map((cam) => (
                <button
                  key={cam.id}
                  onClick={() => setSelectedCamera(cam)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300 backdrop-blur-md shadow-sm",
                    selectedCamera?.id === cam.id ? "w-8 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
                  )}
                />
              ))}
            </div>

            {/* Glass Overlay for depth */}
            <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-[2rem] pointer-events-none z-10" />
          </div>
          
          <div className="flex items-center justify-between px-2 mt-3">
             <h3 className="text-sm font-bold text-slate-900 dark:text-white ml-1">{selectedCamera?.name || "监控设备"}</h3>
             <div className="text-xs text-slate-400 font-jinbuti">{selectedCamera?.time}</div>
          </div>
        </div>

        <RoomTabs selected={selectedRoom} onSelect={setSelectedRoom} />

        <div ref={mainScrollRef} className="px-6 pb-32 pt-4 space-y-6">
          
          {/* Environment Controls */}
          {environmentControls.length > 0 && (
            <div className="space-y-3">
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">设备控制</h3>
               <div ref={controlsScrollRef} className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
                  {environmentControls.map((ctrl) => {
                    const Icon = ICON_MAP[ctrl.icon] || IconWater
                    const on = isRelayOn(ctrl.relay)
                    const isLocked = lockedControls[ctrl.relay]
                    
                    return (
                      <div
                        key={ctrl.id}
                        className={cn(
                          "shrink-0 w-[160px] p-4 rounded-[1.5rem] bg-white/55 dark:bg-white/5 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-sm transition-all active:scale-95",
                          on && "ring-1 ring-emerald-500/50 bg-emerald-50/50 dark:bg-primary/10"
                        )}
                        onClick={() => handleToggle(ctrl.relay)}
                      >
                         <div className="flex justify-between items-start mb-3">
                            <div 
                              className={cn(
                                "size-10 rounded-xl flex items-center justify-center transition-colors",
                                on ? "bg-primary text-white shadow-lg shadow-emerald-500/20" : "bg-slate-100 dark:bg-white/10 text-slate-500"
                              )}
                              style={!on ? { backgroundColor: ctrl.color.bg, color: ctrl.color.fg } : undefined}
                            >
                               <Icon className={cn("size-5", ctrl.relay === 6 && on && "animate-spin")} />
                            </div>
                            <button 
                              onClick={(e) => toggleLock(ctrl.relay, e)}
                              className={cn(
                                "size-8 rounded-full flex items-center justify-center transition-colors",
                                isLocked ? "text-primary bg-emerald-100 dark:bg-primary/20" : "text-slate-300 dark:text-slate-600"
                              )}
                            >
                               {isLocked ? <IconLock size={12} /> : <IconUnlock size={12} />}
                            </button>
                         </div>
                         <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm truncate">{ctrl.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                               <span className={cn("size-1.5 rounded-full", on ? "bg-primary" : "bg-slate-300")} />
                               <span className="text-[10px] text-slate-500 font-medium">{on ? "运行中" : "已停止"}</span>
                            </div>
                         </div>
                      </div>
                    )
                  })}
                  
                  {/* Add Button */}
                  <div className="shrink-0 w-[60px] flex items-center justify-center rounded-[1.5rem] bg-white/30 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/10">
                     <IconSettingOne size={24} className="text-slate-400" />
                  </div>
               </div>
            </div>
          )}

          {/* Sensor Stats */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">环境数据</h3>
            <div className="grid grid-cols-2 gap-4">
              <StatCard icon={IconFire} label="温度" value={deviceData ? (deviceData.temperature / 10).toFixed(1) : '--'} unit="°C" color="text-orange-500" bg="bg-orange-50 dark:bg-orange-500/10" />
              <StatCard icon={IconMedicineChest} label="湿度" value={deviceData ? (deviceData.humidity / 10).toFixed(1) : '--'} unit="%" color="text-blue-500" bg="bg-blue-50 dark:bg-blue-500/10" />
              <StatCard icon={IconSun} label="光照" value={deviceData ? deviceData.light : '--'} unit="lux" color="text-yellow-500" bg="bg-yellow-50 dark:bg-yellow-500/10" />
              <StatCard icon={IconCloudy} label="CO₂" value={deviceData ? deviceData.co2 : '--'} unit="ppm" color="text-teal-500" bg="bg-teal-50 dark:bg-teal-500/10" />
              <StatCard icon={IconThunderbolt} label="土壤电导" value={deviceData ? deviceData.earth_ec : '--'} unit="μS/cm" color="text-purple-500" bg="bg-purple-50 dark:bg-purple-500/10" />
              <StatCard icon={IconMedicineChest} label="土壤水分" value={deviceData ? deviceData.earth_water.toFixed(1) : '--'} unit="%" color="text-green-500" bg="bg-green-50 dark:bg-green-500/10" />
              <StatCard icon={IconFire} label="土壤温度" value={deviceData ? deviceData.earth_temp.toFixed(1) : '--'} unit="°C" color="text-rose-500" bg="bg-rose-50 dark:bg-rose-500/10" />
              
              <StatCard icon={IconSeedling} label="氮含量 (N)" value={deviceData ? deviceData.earth_n : '--'} unit="mg/kg" color="text-purple-500" bg="bg-purple-50 dark:bg-purple-500/10" />
              <StatCard icon={IconSeedling} label="磷含量 (P)" value={deviceData ? deviceData.earth_p : '--'} unit="mg/kg" color="text-pink-500" bg="bg-pink-50 dark:bg-pink-500/10" />
              <StatCard icon={IconSeedling} label="钾含量 (K)" value={deviceData ? deviceData.earth_k : '--'} unit="mg/kg" color="text-amber-500" bg="bg-amber-50 dark:bg-amber-500/10" />
              
              <StatCard 
                icon={IconChartLine} 
                label="光谱峰值" 
                value={deviceData ? `${maxChannel.label}` : '--'} 
                unit={deviceData ? `${spectralValue.toFixed(0)}` : ''} 
                color="text-indigo-500" 
                bg="bg-indigo-50 dark:bg-indigo-500/10" 
              />
              
              <StatCard 
                icon={IconWater} 
                label="今日降雨" 
                value={todayPrecip.toFixed(1)} 
                unit="mm" 
                color="text-cyan-500" 
                bg="bg-cyan-50 dark:bg-cyan-500/10" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-md w-[90%] rounded-[2rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-center text-xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'var(--font-jinbuti)' }}>
              配置监控地址
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="camera-name" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                摄像头名称
              </Label>
              <div className="relative">
                <Input
                  id="camera-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="给摄像头起个名字..."
                  className="h-12 rounded-2xl bg-slate-100/50 dark:bg-white/5 border-0 focus-visible:ring-2 focus-visible:ring-emerald-500/50 text-base px-4 placeholder:text-slate-400"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="camera-url" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                直播流地址
              </Label>
              <div className="relative">
                <Input
                  id="camera-url"
                  value={editForm.url}
                  onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                  placeholder="rtmp://... 或 http://..."
                  className="h-12 rounded-2xl bg-slate-100/50 dark:bg-white/5 border-0 focus-visible:ring-2 focus-visible:ring-emerald-500/50 text-base px-4 placeholder:text-slate-400 font-mono text-sm"
                />
              </div>
              <p className="text-[10px] text-slate-400 px-1">
                支持 FLV, HLS (m3u8), RTMP, WebRTC 协议
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col gap-3 mt-8 sm:flex-col sm:space-x-0">
            <Button 
              onClick={handleSaveSettings} 
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/20 text-base font-bold transition-all active:scale-95"
            >
              <IconSave size={20} className="mr-2" />
              保存配置
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setIsSettingsOpen(false)}
              className="w-full h-12 rounded-2xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
            >
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
