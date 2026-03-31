import { NextRequest } from "next/server"

export const runtime = "nodejs"
// RTMP streams are long-living; remove the default 25s edge timeout
export const maxDuration = 300

/**
 * RTMP → HTTP-FLV 转码代理
 *
 * 浏览器无法直接播放 rtmp:// 协议，本 API 使用 FFmpeg 将 RTMP 流
 * 实时转码为 FLV 格式通过 HTTP 响应流式传输给前端 flv.js 播放器。
 *
 * 用法: GET /api/stream-rtmp?url=rtmp://101.43.28.90:1935/live/camera
 */

import { spawn, type ChildProcess } from "child_process"

// Track active FFmpeg processes for cleanup
const activeProcesses = new Map<string, ChildProcess>()

function findFfmpeg(): string {
  // Try common FFmpeg locations
  const candidates = [
    "ffmpeg",                           // PATH
    "/usr/bin/ffmpeg",                   // Linux
    "/usr/local/bin/ffmpeg",             // macOS / Homebrew
    "C:\\ffmpeg\\bin\\ffmpeg.exe",       // Windows common
  ]
  return candidates[0] // default to PATH lookup
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const rtmpUrl = searchParams.get("url") ?? ""

  if (!rtmpUrl) {
    return new Response(JSON.stringify({ error: "Missing url parameter" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    })
  }

  // Validate that the URL is an RTMP URL
  if (!rtmpUrl.startsWith("rtmp://") && !rtmpUrl.startsWith("rtmps://")) {
    return new Response(JSON.stringify({ error: "Only rtmp:// and rtmps:// protocols are supported" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    })
  }

  // Prevent localhost/internal network abuse
  try {
    const parsed = new URL(rtmpUrl)
    const host = parsed.hostname.toLowerCase()
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      return new Response(JSON.stringify({ error: "Localhost not allowed" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      })
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid RTMP URL" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    })
  }

  const sessionId = `rtmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  // Use a ReadableStream to stream FFmpeg output
  const stream = new ReadableStream({
    start(controller) {
      const ffmpegPath = findFfmpeg()

      // FFmpeg args: read RTMP input → output FLV to stdout
      const args = [
        "-hide_banner",
        "-loglevel", "warning",
        // Input options
        "-rw_timeout", "10000000",       // 10s network timeout (microseconds)
        "-analyzeduration", "2000000",   // 2s analyze (faster start)
        "-probesize", "1000000",         // 1MB probe
        "-fflags", "+nobuffer+discardcorrupt",
        "-flags", "low_delay",
        "-i", rtmpUrl,
        // Output options - transcode to FLV for flv.js
        "-c:v", "copy",                 // Copy video codec (no re-encode for speed)
        "-c:a", "aac",                  // Re-encode audio to AAC (FLV compatible)
        "-ar", "44100",
        "-ac", "2",
        "-f", "flv",                    // Output format: FLV
        "-flvflags", "no_duration_filesize",
        "pipe:1"                         // Output to stdout
      ]

      console.log(`[RTMP Proxy] Starting FFmpeg session ${sessionId}: ${rtmpUrl}`)

      const ffmpeg = spawn(ffmpegPath, args, {
        stdio: ["ignore", "pipe", "pipe"],
      })

      activeProcesses.set(sessionId, ffmpeg)

      ffmpeg.stdout?.on("data", (chunk: Buffer) => {
        try {
          controller.enqueue(new Uint8Array(chunk))
        } catch {
          // Controller closed, kill FFmpeg
          ffmpeg.kill("SIGTERM")
        }
      })

      ffmpeg.stderr?.on("data", (chunk: Buffer) => {
        const msg = chunk.toString().trim()
        if (msg) {
          console.log(`[RTMP Proxy ${sessionId}] FFmpeg: ${msg}`)
        }
      })

      ffmpeg.on("error", (err) => {
        console.error(`[RTMP Proxy ${sessionId}] FFmpeg spawn error:`, err.message)
        activeProcesses.delete(sessionId)
        try {
          controller.error(new Error(`FFmpeg failed: ${err.message}`))
        } catch {}
      })

      ffmpeg.on("close", (code) => {
        console.log(`[RTMP Proxy ${sessionId}] FFmpeg exited with code ${code}`)
        activeProcesses.delete(sessionId)
        try {
          controller.close()
        } catch {}
      })

      // Timeout: kill FFmpeg if stream runs too long (5 minutes max)
      const timeout = setTimeout(() => {
        console.log(`[RTMP Proxy ${sessionId}] Max duration reached, terminating`)
        ffmpeg.kill("SIGTERM")
      }, 5 * 60 * 1000)

      // Clean up on abort (client disconnects)
      req.signal.addEventListener("abort", () => {
        console.log(`[RTMP Proxy ${sessionId}] Client disconnected, terminating FFmpeg`)
        clearTimeout(timeout)
        ffmpeg.kill("SIGTERM")
        activeProcesses.delete(sessionId)
      })
    },

    cancel() {
      const proc = activeProcesses.get(sessionId)
      if (proc) {
        proc.kill("SIGTERM")
        activeProcesses.delete(sessionId)
      }
    }
  })

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "video/x-flv",
      "cache-control": "no-store, no-cache, must-revalidate",
      "connection": "keep-alive",
      "transfer-encoding": "chunked",
      "access-control-allow-origin": "*",
      "x-rtmp-session": sessionId,
    },
  })
}
