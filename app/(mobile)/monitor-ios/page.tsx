"use client"

import { useEffect, useState, type ElementType, useCallback, useMemo, useRef } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useDeviceControl } from "@/lib/hooks/use-device-control"
import type { UserPublic } from "@/lib/db/user-service"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import { LiveStreamPlayer } from "@/components/live-stream-player"
import { MobileBackground } from "@/components/mobile-background"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useDraggableScroll } from "@/lib/hooks/use-draggable-scroll"
import { IconAlarmClock, IconCamera, IconCd, IconClose, IconCloudy, IconDown, IconFan, IconFire, IconFullScreen, IconFullScreenOne, IconHamburgerButton, IconLeft, IconLight, IconMedicineChest, IconMicrophone, IconMonitor, IconOffScreen, IconPlay, IconPlus, IconRemind, IconRight, IconRotate, IconRound, IconSetting, IconSun, IconThunderbolt, IconUp, IconVideocamera, IconVolumeMute, IconVolumeNotice, IconZoomIn, IconZoomOut } from "@/components/icon";
// --- Components ---


function RoomTabs({ selected, onSelect }: { selected: string; onSelect: (room: string) => void }) {
  const rooms = ["常用", "种植区A", "种植区B", "控制室"]
  const scrollRef = useDraggableScroll<HTMLDivElement>()

  return (
    <div ref={scrollRef} className="flex items-center gap-3 overflow-x-auto px-4 py-2 scrollbar-hide">
      {rooms.map((room) => {
        const isSelected = selected === room
        return (
          <button
            key={room}
            onClick={() => onSelect(room)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-300 ${isSelected
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105"
              : "bg-white/60 dark:bg-white/5 text-foreground/70 hover:bg-white/80"
              }`}
          >
            {room}
          </button>
        )
      })}
      <button className="p-2 rounded-full bg-white/60 dark:bg-white/5 text-foreground/70">
        <IconHamburgerButton className="size-5" />
      </button>
    </div>
  )
}

function DeviceCard({
  title,
  subtitle,
  icon: Icon,
  isOn,
  onToggle,
  room,
  className = "",
  disabled = false
}: {
  title: string;
  subtitle: string;
  icon: any;
  isOn: boolean;
  onToggle?: () => void;
  room: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className={`relative rounded-[2rem] p-5 shadow-sm flex flex-col justify-between h-[160px] transition-all duration-300 ${isOn
      ? 'bg-[#2c3e50] dark:bg-[#1e2936]'
      : 'bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl border border-white/20 dark:border-white/5'
      } ${className}`}>
      <div className="flex justify-between items-start">
        <div className={`size-12 rounded-full flex items-center justify-center transition-colors duration-300 ${isOn
          ? 'bg-blue-500/20 text-blue-300'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
          <Icon className="size-7" />
        </div>
        <span className={`text-xs font-medium ${isOn ? 'text-blue-200/70' : 'text-slate-400'}`}>{room}</span>
      </div>

      <div>
        <h3 className={`text-base font-bold mb-1 ${isOn ? 'text-white' : 'text-foreground'}`}>{title}</h3>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium transition-colors duration-300 ${isOn ? 'text-blue-200/80' : 'text-slate-400'
            }`}>
            {subtitle}
          </span>

          {onToggle && (
            <button
              onClick={(e) => { e.stopPropagation(); if (!disabled) onToggle(); }}
              disabled={disabled}
              className={`w-12 h-7 rounded-full relative transition-colors duration-300 ${isOn ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`absolute top-1 size-5 rounded-full transition-all duration-300 ${isOn ? 'left-[22px] bg-white' : 'left-1 bg-white'
                }`} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MonitorIOSPage() {
  const { deviceData, connectionStatus } = useDeviceData()
  const { status: controlStatus, toggleRelay } = useDeviceControl()
  const { weatherData } = useWeatherContext()
  const [user, setUser] = useState<UserPublic | null>(null)
  const [selectedRoom, setSelectedRoom] = useState("常用")
  
  // Camera State
  const [cameras, setCameras] = useState([
    { id: 1, name: "温室摄像头 A", time: "08:00 - 18:00", on: true, url: "", username: "", password: "", stunUrl: "", stunUsername: "", stunPassword: "" },
    { id: 2, name: "温室摄像头 B", time: "08:00 - 18:00", on: true, url: "", username: "", password: "", stunUrl: "", stunUsername: "", stunPassword: "" },
  ])
  const [selectedCameraId, setSelectedCameraId] = useState(1)
  const selectedCamera = useMemo(() => cameras.find(c => c.id === selectedCameraId) || cameras[0], [cameras, selectedCameraId])
  
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isRecording, setIsRecording] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showPTZ, setShowPTZ] = useState(false)
  const videoContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ; (async () => {
      try {
        const res = await fetch("/api/auth/me")
        const data = await res.json()
        if (data?.authenticated && data?.user) setUser(data.user as UserPublic)
      } catch { }
    })()
  }, [])

  // Load cameras from API/LocalStorage
  useEffect(() => {
    const savedCameras = localStorage.getItem("monitor-cameras")
    if (savedCameras) {
      try {
        setCameras(JSON.parse(savedCameras))
      } catch {}
    }
  }, [])

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

  // Camera URL logic
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
  
  const quickActionsRef = useDraggableScroll<HTMLDivElement>()
  const mainScrollRef = useDraggableScroll<HTMLDivElement>()

  const handleRelayToggle = async (relayNum: number) => {
    if (!deviceData) return
    const currentState = (deviceData[`relay${relayNum}` as keyof typeof deviceData] as number) || 0
    await toggleRelay(relayNum, currentState)
  }

  // Camera Controls
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

  const handlePTZ = (action: string) => {
    toast.info(`云台指令发送: ${action}`)
    // In real implementation, this would call an API
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

  // Count active devices
  const activeCount = [
    deviceData?.relay5,
    deviceData?.relay6,
    deviceData?.relay7,
    deviceData?.relay8
  ].filter(state => state === 1).length

  return (
    <div className="min-h-screen w-screen bg-slate-50 dark:bg-[#0B1121] text-foreground overflow-hidden font-sans transition-colors duration-500">
      <MobileBackground />
      
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="px-6 pt-12 pb-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-jinbuti)' }}>{user?.username ? `${user.username}的大棚` : '我的大棚'}</h1>
                <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                  <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                    {connectionStatus.connected ? '设备在线' : '设备离线'}
                  </span>
                </div>
              </div>
            </div>
            <div className="relative size-16 animate-[breathe_4s_ease-in-out_infinite]">
              <Image src="/logo.png" alt="logo" fill className="object-contain" />
            </div>
          </div>
        </div>

        {/* Video Player Section (Prominent) */}
        <div className="px-4 mb-4">
          <div className="relative bg-black rounded-[2rem] overflow-hidden aspect-[4/3] shadow-xl group" id="mobile-video-player" ref={videoContainerRef}>
            <div className="absolute inset-0 w-full h-full transition-transform duration-300 ease-out origin-center" style={{ transform: `scale(${zoomLevel})` }}>
                <LiveStreamPlayer
                sources={cameraPlayerSources}
                licenseUrl={process.env.NEXT_PUBLIC_TCPLAYER_LICENSE_URL}
                autoplay
                muted={isMuted}
                controls={false}
                className="w-full h-full object-cover"
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
            </div>

            {/* Top Overlay: Status & Camera Select */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto">
                    <div className="flex items-center gap-2 bg-red-500/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
                        <span className="size-2 rounded-full bg-white animate-pulse" />
                        <span className="text-white text-xs font-bold">{isRecording ? "REC" : "Live"}</span>
                    </div>
                    {cameras.length > 1 && (
                        <div className="bg-black/40 backdrop-blur-md rounded-full flex p-1 border border-white/10">
                            {cameras.map(cam => (
                                <button
                                    key={cam.id}
                                    onClick={() => setSelectedCameraId(cam.id)}
                                    className={cn(
                                        "px-3 py-1 rounded-full text-xs font-medium transition-all",
                                        selectedCameraId === cam.id ? "bg-white text-black" : "text-white/70 hover:text-white"
                                    )}
                                >
                                    {cam.id === 1 ? "A" : "B"}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="flex gap-2 pointer-events-auto">
                    <button 
                        onClick={() => setIsMuted(!isMuted)}
                        className="size-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/90 border border-white/10"
                    >
                        {isMuted ? <IconVolumeMute className="size-4" /> : <IconVolumeNotice className="size-4" />}
                    </button>
                     <button 
                        onClick={handleFullscreenToggle}
                        className="size-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/90 border border-white/10"
                    >
                        {isFullscreen ? <IconOffScreen className="size-4" /> : <IconFullScreen className="size-4" />}
                    </button>
                </div>
            </div>

            {/* Bottom Overlay: Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-none flex items-end justify-between">
                {/* Left: Zoom */}
                <div className="flex items-center gap-2 pointer-events-auto bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/10">
                    <button onClick={() => handleZoom(-0.5)} className="p-1.5 text-white/80 hover:text-white"><IconZoomOut className="size-4" /></button>
                    <span className="text-xs font-mono text-white min-w-[20px] text-center">{zoomLevel}x</span>
                    <button onClick={() => handleZoom(0.5)} className="p-1.5 text-white/80 hover:text-white"><IconZoomIn className="size-4" /></button>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3 pointer-events-auto">
                     <button 
                        onClick={() => setShowPTZ(!showPTZ)}
                        className={cn(
                            "size-10 rounded-full flex items-center justify-center transition-all border",
                            showPTZ ? "bg-blue-600 border-blue-500 text-white" : "bg-white/10 backdrop-blur-md border-white/10 text-white hover:bg-white/20"
                        )}
                    >
                        <IconSetting className="size-5" />
                    </button>
                    <button 
                        onClick={handleSnapshot}
                        className="size-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 text-white"
                    >
                        <IconCamera className="size-5" />
                    </button>
                     <button 
                        onClick={handleRecord}
                        className={cn(
                            "size-10 rounded-full flex items-center justify-center transition-all border",
                            isRecording ? "bg-red-500 border-red-400 text-white" : "bg-white/10 backdrop-blur-md border-white/10 text-white hover:bg-white/20"
                        )}
                    >
                        <IconCd className={cn("size-5", isRecording && "animate-spin")} />
                    </button>
                </div>
            </div>
            
            {/* PTZ Overlay (Conditional) */}
            {showPTZ && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in-95 pointer-events-auto">
                    <button 
                        onClick={() => setShowPTZ(false)}
                        className="absolute top-4 right-4 text-white/70 hover:text-white"
                    >
                        <IconClose className="size-6" />
                    </button>
                    
                    <div className="relative size-48 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <button onClick={() => handlePTZ("up")} className="absolute top-2 left-1/2 -translate-x-1/2 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full"><IconUp className="size-8" /></button>
                        <button onClick={() => handlePTZ("down")} className="absolute bottom-2 left-1/2 -translate-x-1/2 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full"><IconDown className="size-8" /></button>
                        <button onClick={() => handlePTZ("left")} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full"><IconLeft className="size-8" /></button>
                        <button onClick={() => handlePTZ("right")} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full"><IconRight className="size-8" /></button>
                        <button onClick={() => handlePTZ("reset")} className="size-16 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 flex items-center justify-center">
                            <div className="text-xs font-bold">RESET</div>
                        </button>
                    </div>
                </div>
            )}
          </div>
        </div>

        {/* Quick Actions Bar (New) */}
        <div ref={quickActionsRef} className="px-4 mb-4 flex gap-3 overflow-x-auto scrollbar-hide">
             <button onClick={() => toast.info("警报已触发")} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm whitespace-nowrap">
                <IconAlarmClock className="size-4 text-red-500" />
                <span className="text-xs font-medium">一键警报</span>
             </button>
             <button onClick={() => toast.info("补光灯已开启")} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm whitespace-nowrap">
                <IconLight className="size-4 text-amber-500" />
                <span className="text-xs font-medium">开启补光</span>
             </button>
              <button onClick={() => toast.info("麦克风已开启")} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm whitespace-nowrap">
                <IconMicrophone className="size-4 text-blue-500" />
                <span className="text-xs font-medium">双向通话</span>
             </button>
        </div>

        {/* Room Tabs */}
        <div id="mobile-room-tabs">
            <RoomTabs selected={selectedRoom} onSelect={setSelectedRoom} />
        </div>

        {/* Execution Devices Section */}
        <div className="px-4 py-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-foreground">执行设备 <span className="text-sm text-slate-400">({activeCount}台设备运行中)</span></h2>
            <button className="text-blue-600 text-sm font-medium">+</button>
          </div>
        </div>

        {/* Device Grid */}
        <div ref={mainScrollRef} className="flex-1 overflow-y-auto px-4 pb-32 scrollbar-hide" id="mobile-device-grid">
          <div className="grid grid-cols-2 gap-4">

            {/* Relay 5: Water Pump */}
            <DeviceCard
              title="水泵"
              subtitle={deviceData?.relay5 === 1 ? "运行中" : "已停止"}
              icon={IconMedicineChest}
              isOn={deviceData?.relay5 === 1}
              onToggle={() => handleRelayToggle(5)}
              room="种植区"
              disabled={controlStatus.loading || !connectionStatus.connected}
            />

            {/* Relay 6: IconFan */}
            <DeviceCard
              title="风扇"
              subtitle={deviceData?.relay6 === 1 ? "运行中" : "已停止"}
              icon={IconRotate}
              isOn={deviceData?.relay6 === 1}
              onToggle={() => handleRelayToggle(6)}
              room="种植区"
              disabled={controlStatus.loading || !connectionStatus.connected}
            />

            {/* Relay 7: Grow Light */}
            <DeviceCard
              title="补光灯"
              subtitle={deviceData?.relay7 === 1 ? "ON" : "OFF"}
              icon={IconThunderbolt}
              isOn={deviceData?.relay7 === 1}
              onToggle={() => handleRelayToggle(7)}
              room="种植区"
              disabled={controlStatus.loading || !connectionStatus.connected}
            />

            {/* Relay 8: White Light */}
            <DeviceCard
              title="光照植物补光灯"
              subtitle={deviceData?.relay8 === 1 ? "ON" : "OFF"}
              icon={IconSun}
              isOn={deviceData?.relay8 === 1}
              onToggle={() => handleRelayToggle(8)}
              room="控制室"
              disabled={controlStatus.loading || !connectionStatus.connected}
            />

          </div>
        </div>
      </div>
    </div>
  )
}
