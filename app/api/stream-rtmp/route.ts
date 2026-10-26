import { NextRequest, NextResponse } from "next/server"
import { spawn, type ChildProcess } from "node:child_process"
import { getFfmpegStatus, resolveFfmpegBinary, FFMPEG_MISSING_HINT } from "@/lib/media/ffmpeg"

export const runtime = "nodejs"
// RTMP streams are long-living; remove the default 25s edge timeout
export const maxDuration = 300

/**
 * RTMP → HTTP-FLV 转码代理
 *
 * 浏览器无法直接播放 rtmp:// 协议，本 API 使用 FFmpeg 将 RTMP 流
 * 实时转码为 FLV 格式通过 HTTP 响应流式传输给前端 flv.js 播放器。
 *
 * 用法:
 *   GET /api/stream-rtmp?url=rtmp://101.43.28.90:1935/live/camera   实时流
 *   GET /api/stream-rtmp?status=1                                   探测本机 FFmpeg 可用性
 *
 * FFmpeg 缺失（桌面端最常见：用户机器上没装 FFmpeg）时不再抛异常打断响应，
 * 而是返回 503 + 结构化 JSON，前端据此给出明确提示，避免播放器无限重连。
 */

/** Track active FFmpeg processes for cleanup */
const activeProcesses = new Map<string, ChildProcess>()

/** 每路流最长持续时间：超时主动断开，前端 watchdog 会自动重连 */
const MAX_SESSION_MS = 5 * 60 * 1000

interface PlanArgs {
  label: string
  video: string[]
}

/** 优先直拷（CPU 占用最低）；失败再退回软编 H.264（兼容 H.265 摄像头） */
const PLANS: PlanArgs[] = [
  { label: "copy", video: ["-c:v", "copy"] },
  {
    label: "transcode-h264",
    video: [
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-tune", "zerolatency",
      "-pix_fmt", "yuv420p",
      "-g", "50",
    ],
  },
]

/**
 * 摄像头音频时间戳普遍不准（实测某 IPC 的 AAC 时基跳变），
 * 直接重采样会让 muxer 报 "Non-monotonic DTS / Queue input is backward in time"，
 * flv.js 侧表现为卡顿。aresample=async=1 用补静音/压缩的方式把音频对齐到真实时间轴。
 */
const AUDIO_FILTER = "aresample=async=1:first_pts=0"

function buildArgs(rtmpUrl: string, plan: PlanArgs) {
  return [
    "-hide_banner",
    "-loglevel", "warning",
    // 输入选项
    "-rtmp_live", "live",            // 只播当前直播窗口，丢掉积压帧，降低延迟
    "-rw_timeout", "10000000",       // 10s network timeout (microseconds)
    "-analyzeduration", "2000000",   // 2s analyze (faster start)
    "-probesize", "1000000",         // 1MB probe
    "-fflags", "+nobuffer+discardcorrupt",
    "-flags", "low_delay",
    "-i", rtmpUrl,
    // 输出选项 —— FLV 供 flv.js 播放
    ...plan.video,
    "-af", AUDIO_FILTER,
    "-c:a", "aac",                   // Re-encode audio to AAC (FLV compatible)
    "-ar", "44100",
    "-ac", "2",
    "-f", "flv",                     // Output format: FLV
    "-flvflags", "no_duration_filesize",
    "pipe:1",                        // Output to stdout
  ]
}

function jsonError(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: { "cache-control": "no-store" } })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  // —— FFmpeg 可用性探针：给前端在挂载播放器前调用一次 ——
  if (searchParams.get("status") === "1" || searchParams.has("probe")) {
    const status = getFfmpegStatus(searchParams.get("refresh") === "1")
    return NextResponse.json(status, {
      status: 200,
      headers: { "cache-control": "no-store" },
    })
  }

  const rtmpUrl = searchParams.get("url") ?? ""

  if (!rtmpUrl) {
    return jsonError({ error: "Missing url parameter" }, 400)
  }

  // Validate that the URL is an RTMP URL
  if (!rtmpUrl.startsWith("rtmp://") && !rtmpUrl.startsWith("rtmps://")) {
    return jsonError({ error: "Only rtmp:// and rtmps:// protocols are supported" }, 400)
  }

  // Prevent localhost/internal network abuse
  try {
    const parsed = new URL(rtmpUrl)
    const host = parsed.hostname.toLowerCase()
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      return jsonError({ error: "Localhost not allowed" }, 403)
    }
  } catch {
    return jsonError({ error: "Invalid RTMP URL" }, 400)
  }

  // —— 启动 FFmpeg 前预检：缺失时明确报错，而不是让响应体崩在半路 ——
  const ffmpegBinary = resolveFfmpegBinary()
  if (!ffmpegBinary) {
    const status = getFfmpegStatus()
    console.error(`[RTMP Proxy] FFmpeg 不可用，拒绝启动会话：${status.hint}`)
    return jsonError(
      {
        error: "FFmpeg 不可用",
        code: "FFMPEG_NOT_FOUND",
        platformKey: status.platformKey,
        searched: status.searched,
        hint: FFMPEG_MISSING_HINT,
      },
      503,
    )
  }

  const sessionId = `rtmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const startAt = Date.now()

  // Use a ReadableStream to stream FFmpeg output
  const stream = new ReadableStream({
    start(controller) {
      let finished = false
      let aborted = false
      let bytesSent = 0
      let planIndex = 0
      let current: ChildProcess | null = null
      let timeout: ReturnType<typeof setTimeout> | null = null

      const cleanup = () => {
        if (timeout) {
          clearTimeout(timeout)
          timeout = null
        }
        req.signal.removeEventListener("abort", onAbort)
        if (current) {
          activeProcesses.delete(sessionId)
          current = null
        }
      }

      const finish = (error?: Error) => {
        if (finished) return
        finished = true
        cleanup()
        try {
          if (error) controller.error(error)
          else controller.close()
        } catch {
          /* controller 已关闭 */
        }
      }

      const onAbort = () => {
        aborted = true
        console.log(`[RTMP Proxy ${sessionId}] Client disconnected, terminating FFmpeg`)
        current?.kill("SIGTERM")
        finish()
      }

      const launch = () => {
        const plan = PLANS[planIndex]
        const args = buildArgs(rtmpUrl, plan)

        console.log(
          `[RTMP Proxy] Starting FFmpeg session ${sessionId}: ${rtmpUrl} (mode=${plan.label}, bin=${ffmpegBinary.path})`,
        )

        const ffmpeg = spawn(ffmpegBinary.path, args, {
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true,
        })
        current = ffmpeg
        activeProcesses.set(sessionId, ffmpeg)

        ffmpeg.stdout?.on("data", (chunk: Buffer) => {
          bytesSent += chunk.length
          if (finished) return
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
          // 二进制在预检之后被删/被占用时（ENOENT/EACCES）强制重探，丢弃失效缓存，
          // 让下一个请求能拿到 503 或换用新的路径，而不是一直复用坏路径。
          const code = (err as NodeJS.ErrnoException).code
          if (code === "ENOENT" || code === "EACCES" || code === "EPERM") {
            const fresh = resolveFfmpegBinary(true)
            console.warn(
              `[RTMP Proxy ${sessionId}] 重新探测 FFmpeg 结果：${fresh ? fresh.path : "未找到"}`,
            )
          }
          finish(new Error(`FFmpeg 启动失败：${err.message}\n${FFMPEG_MISSING_HINT}`))
        })

        ffmpeg.on("close", (code) => {
          activeProcesses.delete(sessionId)
          if (current === ffmpeg) current = null

          const elapsed = Date.now() - startAt
          console.log(
            `[RTMP Proxy ${sessionId}] FFmpeg exited with code ${code} (mode=${plan.label}, ${bytesSent} bytes, ${elapsed}ms)`,
          )

          if (finished) return

          // 一帧都没吐出来就失败：多半是编码不被 FLV 支持（如 H.265）或上游握手失败，
          // 自动换一个档位重试一次（直拷 → 软编 H.264）。
          const canRetry = !aborted && bytesSent === 0 && planIndex + 1 < PLANS.length
          if (canRetry) {
            planIndex += 1
            console.warn(
              `[RTMP Proxy ${sessionId}] 首帧未产出（code=${code}），改用 ${PLANS[planIndex].label} 重试`,
            )
            setTimeout(() => {
              if (!finished && !aborted) launch()
            }, 300)
            return
          }

          finish()
        })
      }

      // Timeout: kill FFmpeg if stream runs too long（前端会自动重连）
      timeout = setTimeout(() => {
        console.log(`[RTMP Proxy ${sessionId}] Max duration reached, terminating`)
        current?.kill("SIGTERM")
      }, MAX_SESSION_MS)

      req.signal.addEventListener("abort", onAbort)

      if (req.signal.aborted) {
        onAbort()
        return
      }

      launch()
    },

    cancel() {
      const proc = activeProcesses.get(sessionId)
      if (proc) {
        proc.kill("SIGTERM")
        activeProcesses.delete(sessionId)
      }
    },
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
      "x-rtmp-ffmpeg": ffmpegBinary.source,
    },
  })
}
