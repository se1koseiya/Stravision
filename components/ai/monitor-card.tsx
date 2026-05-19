"use client"

import { useState, useEffect, useMemo, memo, useRef } from "react"
import { cn } from "@/lib/utils"
import { LiveStreamPlayer } from "@/components/live-stream-player"
import { Eye, Video, Wifi, WifiOff, Maximize2, Camera, Volume2, VolumeX, X, ZoomIn, ZoomOut } from "lucide-react";
import { RefreshCw } from "@/components/animate-ui/icons/refresh-cw";
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { Dialog, DialogContent, DialogTrigger, DialogClose, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

const MemoizedLiveStreamPlayer = memo(LiveStreamPlayer)

export function MonitorCard() {
  const [date, setDate] = useState("")
  const { connectionStatus } = useDeviceData()
  const [refreshKey, setRefreshKey] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)
  const [cameraUrl, setCameraUrl] = useState("")
  
  // Controls state
  const [isMuted, setIsMuted] = useState(true)
  const [zoomLevel, setZoomLevel] = useState(1)
  const videoContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const now = new Date()
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    }
    setDate(now.toLocaleDateString('zh-CN', options))
  }, [])

  // Helper function to extract playable stream URL
  const getPlayableUrl = (rawUrl: string) => {
    if (!rawUrl) return ""
    const url = rawUrl.trim()
    
    // Handle RTMP protocol → route through FFmpeg proxy
    if (url.startsWith("rtmp://") || url.startsWith("rtmps://")) {
      return `/api/stream-rtmp?url=${encodeURIComponent(url)}`
    }

    // Check if it needs proxying
    if (typeof window !== "undefined") {
      try {
        const u = new URL(url)
        if (u.protocol === "http:" || u.protocol === "https:") {
          // If it's a direct stream URL (m3u8/flv), use proxy if needed or direct
          // But here we'll reuse the proxy logic from monitor page for consistency
          return `/api/stream-proxy?url=${encodeURIComponent(url)}`
        }
      } catch {}
    }
    return url
  }

  // Fetch camera URL
  useEffect(() => {
    const fetchCamera = async () => {
      try {
        const res = await fetch("/api/greenhouse/cameras")
        if (res.ok) {
          const data = await res.json()
          // Prefer Camera A, fallback to B
          // We need to parse the URL similar to monitor page if it's from xstrive player
          // But for simplicity, let's assume the backend returns the raw stream URL or we handle it in getPlayableUrl if it's simple
          // Actually, let's copy the extraction logic if needed, but for now let's assume the stored URL is the stream URL
          // If the stored URL is the player URL (xstrive), we need to extract the videoUrl parameter
          
          let targetUrl = data.cameraAUrl || data.cameraBUrl || ""
          
          if (targetUrl && /player\.xstrive\.com\/video\/live/i.test(targetUrl)) {
             try {
                const u = new URL(targetUrl)
                const videoUrl = u.searchParams.get("videoUrl")
                if (videoUrl) targetUrl = decodeURIComponent(videoUrl)
             } catch {}
          }

          setCameraUrl(targetUrl)
        }
      } catch (e) {
        console.error("Failed to fetch camera url", e)
      }
    }
    fetchCamera()
  }, [])

  const liveSources = useMemo(() => {
    const sources = []
    if (cameraUrl) {
        const playable = getPlayableUrl(cameraUrl)
        if (playable) sources.push(playable)
    }
    return sources
  }, [cameraUrl])

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
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
        link.download = `snapshot-ai-monitor-${new Date().getTime()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success("截图已保存")
      }
    } catch (e) {
      toast.error("截图失败")
    }
  }

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => {
      const next = prev + delta
      return Math.min(Math.max(1, next), 3)
    })
  }

  const renderPlayer = (isFull = false) => {
    return (
      <MemoizedLiveStreamPlayer
        key={`live-${refreshKey}-${isFull ? 'full' : 'mini'}`}
        className="w-full h-full object-cover"
        sources={liveSources}
        autoplay
        muted={!isFull || isMuted}
        controls={false}
      />
    )
  }

  return (
    <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
    <div className="w-full max-w-sm bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-xl rounded-[24px] p-4 border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] my-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black">
            <Eye size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">实时监控</h3>
            <p className="text-xs text-muted-foreground dark:text-muted-foreground font-medium">{date}</p>
          </div>
        </div>
      </div>

      {/* Video Content */}
      <div className="relative w-full aspect-[4/3] bg-black rounded-[20px] overflow-hidden shadow-inner mb-4 group">
        {/* Only render mini player if not expanded to avoid resource conflict */}
        {!isExpanded && renderPlayer(false)}
        
        {/* Overlay Status */}
        <div className="absolute top-3 left-3 px-2 py-1 bg-black/40 backdrop-blur-md rounded-full flex items-center gap-1.5 border border-white/10 z-10">
          <div className="size-1.5 rounded-full animate-pulse bg-red-500"></div>
          <span className="text-[10px] font-medium text-white/90">直播中</span>
        </div>

        {/* Controls (Visible on Hover) */}
        <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
           <DialogTrigger asChild>
              <button 
                className="p-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white/80 hover:text-white border border-white/10 transition-all"
                title="全屏查看"
              >
                  <Maximize2 size={12} />
              </button>
           </DialogTrigger>
           <button 
              onClick={handleRefresh}
              className="p-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white/80 hover:text-white border border-white/10 transition-all"
              title="刷新画面"
           >
              <RefreshCw size={12} />
           </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-[#E8F5E9]/50 dark:bg-white/5 rounded-[18px] p-3 flex items-center justify-between border border-[#E8F5E9] dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black">
            <Video size={14} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">主摄像头</h4>
            <p className="text-[10px] text-muted-foreground dark:text-muted-foreground">高清 • 30fps</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-white/10 rounded-full border border-gray-100 dark:border-white/10 shadow-sm">
            {connectionStatus.connected ? (
                <>
                    <Wifi size={12} className="text-green-500" />
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">在线</span>
                </>
            ) : (
                <>
                    <WifiOff size={12} className="text-red-500" />
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">离线</span>
                </>
            )}
        </div>
      </div>
    </div>

    {/* Expanded View Dialog */}
    <DialogContent className="max-w-[1200px] w-full h-[80vh] p-0 bg-black border-gray-800 overflow-hidden flex flex-col [&>button:last-child]:hidden rounded-3xl">
        <DialogTitle className="sr-only">全屏监控</DialogTitle>
        
        {/* Top Bar */}
        <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none">
            <div className="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full flex items-center gap-2 border border-white/10 pointer-events-auto">
                <div className="size-2 rounded-full animate-pulse bg-red-500"></div>
                <span className="text-xs font-medium text-white/90">直播中</span>
            </div>
            
            <div className="flex items-center gap-2 pointer-events-auto">
                <button 
                   onClick={() => setIsMuted(!isMuted)}
                   className="p-2 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white/80 hover:text-white border border-white/10 transition-all"
                >
                   {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <DialogClose className="p-2 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white/80 hover:text-white border border-white/10 transition-all">
                    <X size={18} />
                </DialogClose>
            </div>
        </div>

        <div ref={videoContainerRef} className="flex-1 w-full h-full relative bg-black flex items-center justify-center overflow-hidden">
             <div className="w-full h-full transition-transform duration-300 ease-out origin-center" style={{ transform: `scale(${zoomLevel})` }}>
                {isExpanded && renderPlayer(true)}
             </div>

             {/* Bottom Controls */}
             <div className="absolute bottom-6 left-0 right-0 flex items-center justify-between px-6 pointer-events-none">
                 {/* Zoom Controls */}
                 <div className="flex items-center gap-1 p-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 pointer-events-auto">
                    <button onClick={() => handleZoom(-0.5)} className="p-2 rounded-full text-white hover:bg-white/20 transition-colors">
                       <ZoomOut className="size-4" />
                    </button>
                    <span className="text-xs font-bold text-white px-2 w-8 text-center">{zoomLevel}x</span>
                    <button onClick={() => handleZoom(0.5)} className="p-2 rounded-full text-white hover:bg-white/20 transition-colors">
                       <ZoomIn className="size-4" />
                    </button>
                 </div>

                 {/* Action Buttons */}
                 <div className="flex items-center gap-3 pointer-events-auto">
                    <button 
                       onClick={handleSnapshot}
                       className="p-3 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 text-white transition-all hover:scale-105 active:scale-95"
                       title="截图"
                    >
                       <Camera className="size-5" />
                    </button>
                 </div>
             </div>
        </div>
    </DialogContent>
    </Dialog>
  )
}
