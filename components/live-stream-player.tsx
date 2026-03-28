"use client"

import { useEffect, useRef, useId, useMemo } from "react"
import Hls from "hls.js"

type TXLivePlayer = {
  setRenderView: (id: string) => void
  startPlay: (url: string) => Promise<void> | void
  stopPlay: () => void
  setObserver?: (obs: { onPlayerEvent?: (event: string, info?: unknown) => void; onStatistics?: (stats: unknown) => void }) => void
  videoView?: HTMLVideoElement
}

type HlsInstance = {
  loadSource: (src: string) => void
  attachMedia: (el: HTMLVideoElement) => void
  destroy: () => void
  on: (eventName: string, handler: (...args: unknown[]) => void) => void
  startLoad?: () => void
  recoverMediaError?: () => void
}
type HlsConstructor = new (config?: Record<string, unknown>) => HlsInstance
type HlsStatic = {
  Events: { ERROR: string; MANIFEST_PARSED: string }
  ErrorTypes: { NETWORK_ERROR: string; MEDIA_ERROR: string }
  isSupported?: () => boolean
}

type FlvPlayerInstance = {
  attachMediaElement: (el: HTMLVideoElement) => void
  load: () => void
  play: () => void
  destroy: () => void
  unload: () => void
  on: (eventName: string, handler: (...args: unknown[]) => void) => void
}
type FlvJS = {
  createPlayer: (opts: { type: string; url: string; isLive?: boolean; cors?: boolean }) => FlvPlayerInstance
  Events: { ERROR: string }
  isSupported?: () => boolean
}

declare global {
  interface Window {
    TXLivePlayer?: new () => TXLivePlayer
    Hls?: HlsConstructor & HlsStatic
    flvjs?: FlvJS
  }
}

 

const scriptLoadPromises = new Map<string, Promise<void>>()

const HLS_SCRIPT_URLS = [
  "https://lib.baomitu.com/hls.js/1.4.12/hls.min.js",
  "https://cdn.bootcdn.net/ajax/libs/hls.js/1.4.12/hls.min.js",
  "https://cdn.jsdelivr.net/npm/hls.js@1.4.12/dist/hls.min.js",
  "https://unpkg.com/hls.js@1.4.12/dist/hls.min.js"
]

const FLV_SCRIPT_URLS = [
  "https://lib.baomitu.com/flv.js/1.6.2/flv.min.js",
  "https://cdn.bootcdn.net/ajax/libs/flv.js/1.6.2/flv.min.js",
  "https://cdn.jsdelivr.net/npm/flv.js@1.6.2/dist/flv.min.js",
  "https://unpkg.com/flv.js@1.6.2/dist/flv.min.js"
]

const moduleLoadPromises = new Map<string, Promise<boolean>>()

function loadScriptOnce(id: string, src: string) {
  if (scriptLoadPromises.has(id)) return scriptLoadPromises.get(id)!

  const promise = new Promise<void>((resolve) => {
    if (document.getElementById(id)) {
      resolve()
      return
    }
    const s = document.createElement("script")
    s.id = id
    s.src = src
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      console.error(`[LiveStreamPlayer] Failed to load script: ${src}`)
      resolve()
    }
    document.body.appendChild(s)
  })
  scriptLoadPromises.set(id, promise)
  return promise
}

async function waitForGlobal(key: string, timeout = 3000): Promise<boolean> {
  if ((window as unknown as Record<string, unknown>)[key]) return true
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if ((window as unknown as Record<string, unknown>)[key]) return true
    await new Promise((r) => setTimeout(r, 100))
  }
  return Boolean((window as unknown as Record<string, unknown>)[key])
}

async function loadScriptWithFallback(id: string, urls: string[]) {
  if (scriptLoadPromises.has(id)) return scriptLoadPromises.get(id)!

  const promise = new Promise<void>(async (resolve) => {
    if (document.getElementById(id)) {
      resolve()
      return
    }
    for (let i = 0; i < urls.length; i++) {
      const src = urls[i]
      try {
        await new Promise<void>((res, rej) => {
          const s = document.createElement("script")
          s.id = id
          s.src = src
          s.async = true
          s.onload = () => res()
          s.onerror = () => {
            try {
              const el = document.getElementById(id)
              if (el) el.remove()
            } catch {}
            rej(new Error("load failed"))
          }
          document.body.appendChild(s)
        })
        resolve()
        return
      } catch {}
    }
    // If all fail, we still resolve to avoid blocking, but log error
    console.error(`[LiveStreamPlayer] All fallbacks failed for ${id}`)
    resolve()
  })
  scriptLoadPromises.set(id, promise)
  return promise
}

async function ensureHlsAvailable(): Promise<boolean> {
  if (window.Hls) return true
  if (moduleLoadPromises.has("hls")) return moduleLoadPromises.get("hls")!

  const promise = (async () => {
    try {
      const candidate = (Hls as unknown as { default?: unknown }).default ?? (Hls as unknown)
      window.Hls = candidate as unknown as Window["Hls"]
      if (window.Hls && typeof (window.Hls as unknown as { Events?: unknown }).Events !== "undefined") return true
    } catch (e) {
      console.error("[LiveStreamPlayer] Failed to import hls.js module:", e)
    }

    await loadScriptWithFallback("hls-js-1", HLS_SCRIPT_URLS)
    return waitForGlobal("Hls")
  })()

  moduleLoadPromises.set("hls", promise)
  return promise
}

async function ensureFlvAvailable(): Promise<boolean> {
  if (window.flvjs) return true
  if (moduleLoadPromises.has("flv")) return moduleLoadPromises.get("flv")!

  const promise = (async () => {
    try {
      const mod = await import("flv.js")
      const candidate = (mod as unknown as { default?: unknown }).default ?? (mod as unknown)
      window.flvjs = candidate as unknown as Window["flvjs"]
      if (window.flvjs && typeof window.flvjs.createPlayer === "function") return true
    } catch (e) {
      console.error("[LiveStreamPlayer] Failed to import flv.js module:", e)
    }

    await loadScriptWithFallback("flv-js-1", FLV_SCRIPT_URLS)
    return waitForGlobal("flvjs")
  })()

  moduleLoadPromises.set("flv", promise)
  return promise
}

export function LiveStreamPlayer({
  sources,
  autoplay = true,
  muted = true,
  controls = true,
  className,
  id,
  poster,
  licenseUrl,
  iceServers
}:{
  sources: Array<string | { src: string }>
  autoplay?: boolean
  muted?: boolean
  controls?: boolean
  className?: string
  id?: string
  poster?: string
  licenseUrl?: string
  iceServers?: RTCIceServer[]
}) {
  const autoId = useId()
  const containerId = useMemo(() => id ?? `tc-player-${autoId}`, [id, autoId])
  const connectTimerRef = useRef<number | null>(null)
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null)
  const webrtcRef = useRef<TXLivePlayer | null>(null)
  const whepRef = useRef<RTCPeerConnection | null>(null)
  const hlsRef = useRef<HlsInstance | null>(null)
  const flvRef = useRef<FlvPlayerInstance | null>(null)
  const playAttemptRef = useRef(0)

  useEffect(() => {
    void licenseUrl
    let cancelled = false
    let removeListeners: (() => void) | null = null
    const run = async () => {
        const resetVideoElement = (videoEl: HTMLVideoElement) => {
          try { videoEl.srcObject = null } catch {}
          try { videoEl.removeAttribute("src") } catch {}
          try { videoEl.load() } catch {}
        }

        const inferStreamType = (inputUrl: string) => {
          let actualUrl = inputUrl
          try {
            const u = new URL(inputUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost")
            if (u.pathname.includes("/api/stream-proxy")) {
              const embedded = u.searchParams.get("url")
              if (embedded) actualUrl = embedded
            }
          } catch {}

          const urlPath = actualUrl.split("?")[0].toLowerCase()
          const isM3U8 = urlPath.endsWith(".m3u8")
          const isFLV = urlPath.endsWith(".flv")
          return isM3U8 ? "hls" : isFLV ? "flv" : "unknown"
        }

        const normalized = sources.map((s) => {
          const obj = typeof s === "string" ? { src: s } : s
          const url = obj.src
          if (typeof url !== "string") return { ...obj, type: "unknown" }
          
          const isWebRTC = url.startsWith("webrtc://") || (iceServers && iceServers.length > 0)
          const inferred = inferStreamType(url)
          
          return isWebRTC ? { ...obj, type: "webrtc" } : { ...obj, type: inferred }
        })

        const types = new Set(normalized.map((n) => (n as { type: string }).type))
        const promises: Promise<unknown>[] = []

        if (types.has("hls")) {
          promises.push(ensureHlsAvailable())
        }

        if (types.has("flv")) {
          promises.push(ensureFlvAvailable())
        }

        if (types.has("webrtc")) {
          promises.push(
            loadScriptWithFallback("txliveplayer-js-1-3-2", [
              "https://video.sdk.qcloud.com/web/TXLivePlayer-1.3.2.min.js",
              "https://web.sdk.qcloud.com/player/TXLivePlayer-1.3.2.min.js"
            ]).then(() => waitForGlobal("TXLivePlayer"))
          )
        }
 
        await Promise.all(promises)
        if (cancelled) return
 
        const sequence = normalized.map((o) => (o as { src: string }).src)
      let nextIndex = 0
      let retryCount = 0
      const maxRetry = 3

      const videoEl = document.getElementById(containerId) as HTMLVideoElement | null
      if (!videoEl) return
      if (muted) videoEl.muted = true
      videoEl.setAttribute("playsinline", "true")
      videoEl.setAttribute("webkit-playsinline", "true")
      videoEl.setAttribute("x5-playsinline", "true")
      videoEl.setAttribute("x5-video-player-type", "h5")

      const playCurrent = async () => {
        const attemptId = ++playAttemptRef.current
        if (sequence.length === 0) return
        const currentUrl = sequence[nextIndex]
        const type = (normalized[nextIndex] as unknown as { type?: string }).type
        if (!currentUrl) return
        
        console.log(`[LiveStreamPlayer] Attempting to play: ${currentUrl} (${type})`)

        // Mixed Content Check
        if (typeof window !== "undefined" && window.location.protocol === "https:" && currentUrl.startsWith("http:")) {
            console.warn("[LiveStreamPlayer] Mixed Content Warning: Trying to load HTTP stream on HTTPS page. This will likely fail.")
        }

        try {
          if (cancelled || attemptId !== playAttemptRef.current) return
          if (type === "webrtc") {
            // Clean up previous players
            webrtcRef.current?.stopPlay(); webrtcRef.current = null
            hlsRef.current?.destroy(); hlsRef.current = null
            flvRef.current?.destroy(); flvRef.current = null
            if (whepRef.current) { whepRef.current.close(); whepRef.current = null }
            resetVideoElement(videoEl)

            // If ICE servers are provided, use native WebRTC (WHEP)
            if (iceServers && iceServers.length > 0) {
              console.log("[LiveStreamPlayer] Starting WHEP playback...")
              const pc = new RTCPeerConnection({ iceServers })
              whepRef.current = pc
              
              pc.addTransceiver('video', { direction: 'recvonly' })
              pc.addTransceiver('audio', { direction: 'recvonly' })

              pc.ontrack = (event) => {
                if (cancelled || attemptId !== playAttemptRef.current) return
                if (videoEl.srcObject !== event.streams[0]) {
                  videoEl.srcObject = event.streams[0]
                  if (autoplay) {
                    try { void videoEl.play() } catch {}
                  }
                }
              }

              pc.onconnectionstatechange = () => console.log(`[LiveStreamPlayer] WHEP Connection State: ${pc.connectionState}`)

              const offer = await pc.createOffer()
              await pc.setLocalDescription(offer)
              if (cancelled || attemptId !== playAttemptRef.current) return

              // WHEP Signaling
              const response = await fetch(currentUrl, {
                method: 'POST',
                body: offer.sdp,
                headers: {
                  'Content-Type': 'application/sdp'
                }
              })

              if (!response.ok) throw new Error(`WHEP connection failed: ${response.status}`)
              
              const answerSdp = await response.text()
              await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
              
            } else if (window.TXLivePlayer) {
              console.log("[LiveStreamPlayer] Starting TXLivePlayer playback...")
              // Use Tencent Player
              webrtcRef.current = new window.TXLivePlayer()
              webrtcRef.current.setRenderView(containerId)
              if (autoplay) {
                try { void videoEl.play() } catch {}
              }
              webrtcRef.current.startPlay(currentUrl)
              webrtcRef.current.setObserver?.({
                onPlayerEvent: (event) => {
                  if (cancelled || attemptId !== playAttemptRef.current) return
                  const s = String(event).toLowerCase()
                  console.log(`[LiveStreamPlayer] TXLivePlayer Event: ${s}`)
                  if (s.includes("disconnect") || s.includes("close") || s.includes("failed")) {
                    const hasNext = nextIndex + 1 < sequence.length
                    nextIndex = hasNext ? nextIndex + 1 : 0
                    setTimeout(() => { void playCurrent() }, 500)
                  }
                }
              })
            }
          } else if (type === "hls" && window.Hls) {
            console.log("[LiveStreamPlayer] Starting HLS playback...")
            webrtcRef.current?.stopPlay(); webrtcRef.current = null
            flvRef.current?.destroy(); flvRef.current = null
            if (whepRef.current) { whepRef.current.close(); whepRef.current = null }
            hlsRef.current?.destroy()
            resetVideoElement(videoEl)

            const hlsSupported = typeof window.Hls.isSupported === "function" ? window.Hls.isSupported() : true
            if (!hlsSupported) {
              const canNativeHls =
                typeof videoEl.canPlayType === "function" &&
                (videoEl.canPlayType("application/vnd.apple.mpegurl") || videoEl.canPlayType("application/x-mpegurl"))
              if (canNativeHls) {
                videoEl.src = currentUrl
                if (autoplay) {
                  try { void videoEl.play() } catch {}
                }
                return
              }

              const hasNext = nextIndex + 1 < sequence.length
              nextIndex = hasNext ? nextIndex + 1 : 0
              setTimeout(() => { void playCurrent() }, 500)
              return
            }

            hlsRef.current = new window.Hls({
                debug: true, // Enable HLS debug logs
                enableWorker: true,
                lowLatencyMode: true,
            })
            
            hlsRef.current.on(window.Hls.Events.ERROR, (_eventName, dataRaw) => {
                if (cancelled || attemptId !== playAttemptRef.current) return
                const data = dataRaw as { fatal?: boolean; type?: string }
                console.error("[LiveStreamPlayer] HLS Error:", dataRaw)
                if (!data?.fatal) return

                try { hlsRef.current?.destroy() } catch {}
                hlsRef.current = null

                const hasNext = nextIndex + 1 < sequence.length
                nextIndex = hasNext ? nextIndex + 1 : 0
                if (retryCount < maxRetry) retryCount += 1
                setTimeout(() => { void playCurrent() }, 800)
            })

            hlsRef.current.loadSource(currentUrl)
            hlsRef.current.attachMedia(videoEl)
            hlsRef.current.on(window.Hls.Events.MANIFEST_PARSED, () => {
                if (cancelled || attemptId !== playAttemptRef.current) return
                console.log("[LiveStreamPlayer] HLS Manifest Parsed, playing...")
                if (autoplay) {
                  queueMicrotask(() => {
                    if (cancelled || attemptId !== playAttemptRef.current) return
                    try { void videoEl.play() } catch {}
                  })
                }
            })
          } else if (type === "flv" && window.flvjs) {
            console.log("[LiveStreamPlayer] Starting FLV playback...")
            webrtcRef.current?.stopPlay(); webrtcRef.current = null
            hlsRef.current?.destroy(); hlsRef.current = null
            if (whepRef.current) { whepRef.current.close(); whepRef.current = null }
            flvRef.current?.destroy()
            resetVideoElement(videoEl)

            if (typeof window.flvjs.isSupported === "function" && !window.flvjs.isSupported()) {
              const hasNext = nextIndex + 1 < sequence.length
              nextIndex = hasNext ? nextIndex + 1 : 0
              setTimeout(() => { void playCurrent() }, 500)
              return
            }

            flvRef.current = window.flvjs.createPlayer({ 
                type: "flv", 
                url: currentUrl,
                isLive: true,
                cors: true
            })
            
            flvRef.current.on(window.flvjs.Events.ERROR, (type, details) => {
                if (cancelled || attemptId !== playAttemptRef.current) return
                console.error("[LiveStreamPlayer] FLV Error:", type, details)
                
                // Fallback to next source on error to prevent being stuck
                const hasNext = nextIndex + 1 < sequence.length
                nextIndex = hasNext ? nextIndex + 1 : 0
                if (retryCount < maxRetry) {
                  retryCount += 1
                  setTimeout(() => { void playCurrent() }, 800)
                }
            })

            flvRef.current.attachMediaElement(videoEl)
            flvRef.current.load()
            try { flvRef.current.play() } catch {}
            if (autoplay) {
              try { void videoEl.play() } catch {}
            }
          } else {
            console.warn(`[LiveStreamPlayer] Unknown stream type or missing library for: ${currentUrl}`)
            console.warn(`[LiveStreamPlayer] Debug info: Type=${type}, Hls=${!!window.Hls}, flvjs=${!!window.flvjs}, TXLivePlayer=${!!window.TXLivePlayer}`)
            const hasNext = nextIndex + 1 < sequence.length
            nextIndex = hasNext ? nextIndex + 1 : 0
            
            // Add delay to prevent stack overflow
            if (retryCount < maxRetry) {
                retryCount += 1
                setTimeout(() => { void playCurrent() }, 1000)
            }
          }
        } catch (e) {
          console.error("[LiveStreamPlayer] Setup Error:", e)
          const hasNext = nextIndex + 1 < sequence.length
          nextIndex = hasNext ? nextIndex + 1 : 0
          if (retryCount < maxRetry) {
            retryCount += 1
            setTimeout(() => { void playCurrent() }, 800)
          }
        }
      }

      // Watchdog for Live Stream
      let lastTime = 0
      let freezeCount = 0
      if (watchdogTimerRef.current) clearInterval(watchdogTimerRef.current)
      watchdogTimerRef.current = setInterval(() => {
        if (videoEl && !videoEl.paused && !videoEl.ended && videoEl.readyState > 2) {
           const currentTime = videoEl.currentTime
           if (currentTime === lastTime) {
             freezeCount++
             // Faster refresh: check every 0.5s, reconnect after 1.5s (3 checks)
             if (freezeCount > 3) { 
                console.log("[LivePlayer] Stream frozen detected, reconnecting...")
                freezeCount = 0
                const hasNext = nextIndex + 1 < sequence.length
                nextIndex = hasNext ? nextIndex + 1 : 0
                void playCurrent()
             }
           } else {
             freezeCount = 0
             lastTime = currentTime
           }
        }
      }, 500) // Check every 500ms instead of 1000ms

      if (connectTimerRef.current) { window.clearTimeout(connectTimerRef.current) }
      connectTimerRef.current = window.setTimeout(() => { void playCurrent() }, 0)

      const onVideoStalled = () => {
        const hasNext = nextIndex + 1 < sequence.length
        nextIndex = hasNext ? nextIndex + 1 : 0
        void playCurrent()
      }
      const onVideoError = () => {
        const hasNext = nextIndex + 1 < sequence.length
        nextIndex = hasNext ? nextIndex + 1 : 0
        void playCurrent()
      }
      const onVisibility = () => {
        if (document.visibilityState !== "visible") return
        if (autoplay) {
          try { void videoEl.play() } catch {}
        }
      }
      const onOnline = () => {
        setTimeout(() => { void playCurrent() }, 500)
      }

      videoEl.addEventListener("stalled", onVideoStalled)
      videoEl.addEventListener("error", onVideoError)
      window.addEventListener("visibilitychange", onVisibility)
      window.addEventListener("online", onOnline)

      removeListeners = () => {
        videoEl.removeEventListener("stalled", onVideoStalled)
        videoEl.removeEventListener("error", onVideoError)
        window.removeEventListener("visibilitychange", onVisibility)
        window.removeEventListener("online", onOnline)
      }
    }
    void run()
    return () => {
      cancelled = true
      removeListeners?.()
      removeListeners = null
      if (connectTimerRef.current) { window.clearTimeout(connectTimerRef.current); connectTimerRef.current = null }
      if (watchdogTimerRef.current) { clearInterval(watchdogTimerRef.current); watchdogTimerRef.current = null }
      
      try { webrtcRef.current?.stopPlay() } catch {}
      webrtcRef.current = null
      hlsRef.current?.destroy(); hlsRef.current = null
      try { flvRef.current?.unload?.() } catch {}
      flvRef.current?.destroy(); flvRef.current = null
    }
  }, [controls, autoplay, muted, poster, sources, containerId, licenseUrl])

  return <video id={containerId} preload="auto" playsInline autoPlay={autoplay} muted={muted} controls={controls} className={className ?? ""} poster={poster} />
}
