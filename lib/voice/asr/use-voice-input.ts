"use client"

/**
 * 语音输入 · 本地离线识别（sherpa-onnx + Paraformer 中文）· 持续转写
 *
 * ── 为什么不是浏览器原生 ──────────────────────────────────────
 * `SpeechRecognition` 在 Chrome 上走 Google 语音服务，国内直接报 `network`；
 * Edge 能用的代价是把音频发给微软云。这个项目要「轻量 + 准确 + 不出内网」，
 * 所以识别放在自己的 Node 进程里：`/api/ai/asr` 常驻 Paraformer-large（int8，240MB），
 * 实测 5.5s 音频解码 300ms（约 18 倍实时）。
 *
 * ── 交互模型：持续转写（2026-10-24 用户定：跟 WorkBuddy 一样）──────
 * 不是「说一句就结束」，而是：
 *   点一下麦克风 → 一直听 → **每说完一句就自动识别并追加进草稿** → 很久不说话才收尾。
 * 所以人不会被打断：说一句、想两秒、再说一句，都算同一次输入。
 *
 * 实现是「采集 → 静音切句 → 逐句识别 → 顺序追加」：
 *   · 用 Web Audio 自采 PCM（不用 MediaRecorder）—— MediaRecorder 给的是 webm 分片，
 *     分片不能独立解码，没法边录边切句。
 *   · 每句在**句尾静音 700ms** 时切出来单独送识别 —— 句子一出完，1 秒内就上屏。
 *   · 整个会话**静音 10s** 才结束（就是这条需求里「很久没说话才自动结束」）。
 *   · 识别走串行队列，保证文字顺序 = 说话顺序（服务端 recognizer 也不可重入）。
 *
 * ── 为什么不做逐帧流式出字 ───────────────────────────────────
 * 本地模型是非流式的（OfflineRecognizer），逐帧重解会在句边界重复吐词。
 * 按静音切句是这类模型的标准做法：延迟 ~1s、零重复、零错位。
 *
 * ── 草稿合成：往里补，不覆盖 ─────────────────────────────────
 * 每句识别完成时**重新读一次最新草稿**再拼 —— 用户边听边手动改字不会丢。
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { float32ToWavBlob } from "@/lib/voice/voice-utils"
import { isDesktopApp } from "@/lib/desktop-mode"
import { setVoiceInputActive } from "./voice-input-status"

const ENDPOINT = "/api/ai/asr"

/* ── 采集 / 切句参数 ──────────────────────────────────────────
 * 一帧 = ScriptProcessor 的 2048 个采样点（48k 下约 42.7ms，16k 下 128ms）。
 * 阈值与时长都按毫秒算，与设备采样率无关。
 *
 * 🚨 2026-10-24 二改：用户反馈「识别过分敏感，噪音都能被识别成字」。
 *    模型本身对噪声确实会「猜」出文字（Paraformer 的典型幻觉），
 *    所以门槛必须设在**送模型之前**，事后过滤已经晚了。三处收紧：
 *      ① 绝对下限 0.012 → 0.018（键盘、鼠标、桌面碰击大多在 0.01~0.02 档）
 *      ② 自适应乘数 3.5 → 4.0（底噪高的环境抬得更狠）
 *      ③ 新增「发声确认」：要连续 3 帧（≈128ms）超阈值才算开口。
 *         瞬态噪声（敲键盘、放杯子）几乎都在 1~2 帧内衰减完。
 *      ④ 一「句」里真正发声的时长必须 ≥ 180ms，且整段 ≥ 420ms。 */
const FRAME_SIZE = 2048
const PREROLL_MS = 240 // 句首预卷：第一个字别被切掉
const SEGMENT_HANG_MS = 700 // 句尾静音多久算「这句说完了」→ 切句识别
const SESSION_IDLE_MS = 10000 // 整段静音多久算「人不说了」→ 结束本次输入
const MIN_SEGMENT_MS = 420 // 短于这个的碎片不送识别（咳嗽、碰麦、键盘）
const MIN_VOICED_MS = 180 // 一「句」里必须真有声的时长，纯噪声切出来的段直接丢
const MAX_SEGMENT_MS = 20000 // 一句最长 20s：再长就不是句子了（稳态噪声 / 用户忘停）
const DEFAULT_MAX_DURATION = 180 // 单次会话硬上限（秒），防止忘关麦克风

/* 自适应阈值：安静房间别太敏感，吵环境别抬到收不到人声 */
const VAD_CALIBRATE_MS = 760
const VAD_THRESHOLD_MIN = 0.018
const VAD_THRESHOLD_MAX = 0.085
const VAD_NOISE_FACTOR = 4
/** 连续多少帧超阈值才算「真的开口」（帧约 42ms → 3 帧 ≈ 128ms） */
const VAD_CONFIRM_FRAMES = 3

interface UseVoiceInputOptions {
  /** 读取当前草稿（每句识别完成后往它末尾补） */
  getDraft: () => string
  /** 回写全量草稿文本 */
  onDraft: (text: string) => void
  onError?: (message: string) => void
  /** 单次会话最长时长（秒），默认 180 */
  maxDuration?: number
}

export interface VoiceInputState {
  /** 正在采集（麦克风开着） */
  isListening: boolean
  /** 有句子在识别 / 排队识别 */
  isTranscribing: boolean
  /** 后端模型是否就绪：null = 还在探活，true/false = 结论 */
  ready: boolean | null
  /** ready 为 false 时的原因码（MODEL_NOT_INSTALLED / 具体报错） */
  readyReason: string | null
  /** 本次会话已进行时长（秒） */
  elapsed: number
  /** 本次会话已上屏的句数 */
  segmentCount: number
  error: string | null
  start: () => void
  stop: () => void
  toggle: () => void
  /** 提前把 240MB 模型热起来（悬停麦克风时调一次，省掉首次点击的 2~3s 干等） */
  warmup: () => void
}

/* ── 小工具 ───────────────────────────────────────────────── */

/** 拼接时按需补空格：中文直接接，英文单词之间要断开 */
function appendDraft(base: string, addition: string): string {
  if (!addition) return base
  if (!base) return addition
  const last = base[base.length - 1]
  const needsSpace = /[A-Za-z0-9,.;:!?]/.test(last) && /^[A-Za-z0-9]/.test(addition)
  return base + (needsSpace ? " " : "") + addition
}

function canRecord(): boolean {
  if (typeof navigator === "undefined") return false
  if (typeof AudioContext === "undefined") return false
  return Boolean(navigator.mediaDevices?.getUserMedia)
}

/** getUserMedia 的错误 → 人话（这里最容易出的是权限） */
function micErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : ""
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "麦克风权限被拒绝，点地址栏的麦克风图标允许后重试"
    case "NotFoundError":
    case "OverconstrainedError":
      return "没有找到麦克风设备"
    case "NotReadableError":
      return "麦克风被其它程序占用，关掉再试"
    default:
      return "麦克风打开失败，请检查系统权限"
  }
}

function releaseStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

/** 线性插值重采样（ASR 只吃 16k，设备多半是 44.1/48k） */
function resampleLinear(input: Float32Array, from: number, to: number): Float32Array {
  if (from === to || input.length === 0) return input
  const ratio = from / to
  const out = new Float32Array(Math.max(1, Math.round(input.length / ratio)))
  for (let i = 0; i < out.length; i++) {
    const src = i * ratio
    const lo = Math.floor(src)
    const hi = Math.min(lo + 1, input.length - 1)
    const frac = src - lo
    out[i] = input[lo] * (1 - frac) + input[hi] * frac
  }
  return out
}

function concatFrames(frames: Float32Array[]): Float32Array {
  if (frames.length === 0) return new Float32Array(0)
  if (frames.length === 1) return frames[0]
  let total = 0
  for (const f of frames) total += f.length
  const out = new Float32Array(total)
  let offset = 0
  for (const f of frames) {
    out.set(f, offset)
    offset += f.length
  }
  return out
}

function rmsOf(data: Float32Array): number {
  let sum = 0
  for (let i = 0; i < data.length; i++) {
    const v = data[i]
    sum += v * v
  }
  return Math.sqrt(sum / data.length)
}

/* ── 采集图（一次会话一套）──────────────────────────────────── */

interface CaptureGraph {
  /** 拆掉采集：停流、断节点、关 AudioContext */
  dispose: () => void
}

type FrameHandler = (frame: Float32Array, sampleRate: number) => void

/**
 * 建一条「麦克风 → ScriptProcessor」采集链。
 *
 * 🚨 两个必须知道的坑：
 * 1. ScriptProcessorNode **必须**连到 destination 才会被驱动 —— 但直连会把麦克风
 *    原样外放（啸叫）。所以中间串一个 gain=0 的哑节点。
 * 2. onaudioprocess 里的 `inputBuffer.getChannelData(0)` 是**会被复用的缓冲区**，
 *    必须 new Float32Array(...) 复制一份再存，否则存下来的都是同一块内存。
 */
function createCaptureGraph(stream: MediaStream, onFrame: FrameHandler): CaptureGraph | null {
  type AudioCtor = typeof AudioContext
  const w = window as Window & { webkitAudioContext?: AudioCtor }
  const AudioCtx: AudioCtor | undefined = typeof AudioContext !== "undefined" ? AudioContext : w.webkitAudioContext
  if (!AudioCtx) return null

  let ctx: AudioContext
  try {
    ctx = new AudioCtx()
  } catch {
    return null
  }
  // 被自动播放策略挂起时立刻唤醒：此刻在用户点击的手势里，能成功
  if (ctx.state === "suspended") void ctx.resume().catch(() => {})

  const sampleRate = ctx.sampleRate
  const source = ctx.createMediaStreamSource(stream)
  const processor = ctx.createScriptProcessor(FRAME_SIZE, 1, 1)
  const mute = ctx.createGain()
  mute.gain.value = 0

  processor.onaudioprocess = (event) => {
    const channel = event.inputBuffer.getChannelData(0)
    if (!channel || channel.length === 0) return
    onFrame(new Float32Array(channel), sampleRate)
  }

  source.connect(processor)
  processor.connect(mute)
  mute.connect(ctx.destination)

  return {
    dispose: () => {
      try {
        processor.onaudioprocess = null
        source.disconnect()
        processor.disconnect()
        mute.disconnect()
      } catch {
        /* 已经断开 */
      }
      void ctx.close().catch(() => {})
    },
  }
}

/* ── 主 hook ──────────────────────────────────────────────── */

export function useVoiceInput({
  getDraft,
  onDraft,
  onError,
  maxDuration = DEFAULT_MAX_DURATION,
}: UseVoiceInputOptions): VoiceInputState {
  const [isListening, setIsListening] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [ready, setReady] = useState<boolean | null>(null)
  const [readyReason, setReadyReason] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [segmentCount, setSegmentCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  /* 回调走 ref，避免父组件每次 render 都重建 start/stop（录音中重建会打断引用） */
  const getDraftRef = useRef(getDraft)
  const onDraftRef = useRef(onDraft)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    getDraftRef.current = getDraft
    onDraftRef.current = onDraft
    onErrorRef.current = onError
  }, [getDraft, onDraft, onError])

  /* 会话令牌：getUserMedia 是异步的，用户可能在授权弹窗期间就点了取消 */
  const sessionRef = useRef(0)
  const listeningRef = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)
  const graphRef = useRef<CaptureGraph | null>(null)

  /** 本会话的收尾函数（start 里闭包产生，stop 通过它走同一条收尾路径） */
  const finishRef = useRef<((reason: "idle" | "manual") => void) | null>(null)

  /** 串行识别队列：保证上屏顺序 = 说话顺序（服务端 recognizer 也不可重入） */
  const queueRef = useRef<Promise<void>>(Promise.resolve())
  const pendingRef = useRef(0)

  const startedAtRef = useRef(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hardStopRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warmedRef = useRef(false)

  /* ── 探活：只查模型文件在不在（不触发 240MB 加载），挂载后一次 ── */
  useEffect(() => {
    let alive = true
    const controller = new AbortController()
    void (async () => {
      try {
        const res = await fetch(ENDPOINT, { signal: controller.signal })
        const data = (await res.json().catch(() => null)) as { ready?: boolean; reason?: string } | null
        if (!alive) return
        if (data?.ready) {
          setReady(true)
          setReadyReason(null)
        } else {
          setReady(false)
          setReadyReason(data?.reason ?? "MODEL_NOT_INSTALLED")
        }
      } catch {
        if (alive) {
          setReady(false)
          setReadyReason("NETWORK")
        }
      }
    })()
    return () => {
      alive = false
      controller.abort()
    }
  }, [])

  const warmup = useCallback(() => {
    // 结果不用管：热失败时点击仍会走 POST，那里会给出真正的错误。
    // 只发一次 —— hover 与 focus 会接连触发，没必要打两枪。
    if (warmedRef.current) return
    warmedRef.current = true
    void fetch(`${ENDPOINT}?warm=1`, { method: "GET" }).catch(() => {})
  }, [])

  const fail = useCallback((message: string) => {
    if (message) {
      setError(message)
      onErrorRef.current?.(message)
    }
  }, [])

  const clearTimers = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
    if (hardStopRef.current) {
      clearTimeout(hardStopRef.current)
      hardStopRef.current = null
    }
  }, [])

  /** 收摊：停采集、清定时器、复位聆听态。识别队列**不**等（它自己会跑完） */
  const cleanup = useCallback(() => {
    clearTimers()
    finishRef.current = null
    graphRef.current?.dispose()
    graphRef.current = null
    releaseStream(streamRef.current)
    streamRef.current = null
    listeningRef.current = false
    setIsListening(false)
  }, [clearTimers])

  /** 队列空 + 已停采集 → 才算「转写结束」（光晕这时才灭） */
  const settleIfIdle = useCallback(() => {
    if (pendingRef.current === 0 && !listeningRef.current) setIsTranscribing(false)
  }, [])

  /**
   * 识别一句并追加进草稿。
   * 失败不逐句弹 toast（一次会话好几句会连弹），交给调用方按去重逻辑提示。
   */
  const recognizeSegment = useCallback(async (samples: Float32Array, sampleRate: number) => {
    const pcm16k = resampleLinear(samples, sampleRate, 16000)
    // 服务端也查这个，本地先挡一道：省一次白跑的网络往返
    if ((pcm16k.length / 16000) * 1000 < MIN_SEGMENT_MS) return

    const wav = float32ToWavBlob(pcm16k, 16000)
    const form = new FormData()
    form.append("audio", wav, "segment.wav")

    const res = await fetch(ENDPOINT, { method: "POST", body: form })
    const data = (await res.json().catch(() => null)) as
      | { success?: boolean; transcript?: string; error?: string; code?: string }
      | null

    if (res.status === 401) throw new Error("登录已过期，刷新页面后重试")
    if (!res.ok || !data?.success) {
      if (data?.code === "MODEL_NOT_READY") setReady(false)
      // 422 = 这一句确实没内容（纯噪声），跳过不算故障
      if (res.status === 422) return
      throw new Error(data?.error || `语音识别失败（${res.status}）`)
    }

    const transcript = (data.transcript ?? "").trim()
    if (!transcript) return

    // 重新读一次最新草稿再拼 —— 用户边听边手动改的字不能被快照覆盖
    onDraftRef.current(appendDraft(getDraftRef.current(), transcript))
    setError(null)
    setSegmentCount((n) => n + 1)
  }, [])

  /** 把一句塞进串行队列 */
  const enqueueSegment = useCallback(
    (samples: Float32Array, sampleRate: number) => {
      pendingRef.current += 1
      setIsTranscribing(true)

      const run = queueRef.current.then(
        () => recognizeSegment(samples, sampleRate),
        () => recognizeSegment(samples, sampleRate)
      )
      const settled = () => {
        pendingRef.current -= 1
        settleIfIdle()
      }
      queueRef.current = run.then(
        () => settled(),
        (err) => {
          settled()
          const message = err instanceof Error ? err.message : "语音识别失败"
          setError(message)
          onErrorRef.current?.(message)
        }
      )
    },
    [recognizeSegment, settleIfIdle]
  )

  const stop = useCallback(() => {
    if (!listeningRef.current) return
    // 手动停止与自动收尾走同一条路（尾句照样要送出去）
    const finish = finishRef.current
    if (finish) {
      finish("manual")
      return
    }
    cleanup()
    settleIfIdle()
  }, [cleanup, settleIfIdle])

  const start = useCallback(() => {
    if (listeningRef.current) return
    if (!canRecord()) {
      fail("当前环境不支持麦克风录音，请换 Chrome / Edge 浏览器")
      return
    }
    if (ready === false && readyReason === "MODEL_NOT_INSTALLED") {
      fail(
        isDesktopApp()
          ? "语音模型缺失：请重新安装最新版桌面端（模型随安装包分发）"
          : "语音模型未安装：在项目根目录运行 pnpm asr:model"
      )
      return
    }

    const token = ++sessionRef.current
    setError(null)
    setSegmentCount(0)
    setElapsed(0)

    void (async () => {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
      } catch (err) {
        if (token !== sessionRef.current) return
        fail(micErrorMessage(err))
        return
      }

      // 授权弹窗期间用户又点了取消（或切走页面）：立刻松开麦克风
      if (token !== sessionRef.current) {
        releaseStream(stream)
        return
      }

      /* ── 每帧推进的切句状态机 ──────────────────────────────────
       * preroll     最近若干帧（句首预卷，防止切掉第一个字）
       * seg         当前这句的帧缓冲（含句内短停顿）
       * aboveRun    连续超过阈值的帧数（≥ VAD_CONFIRM_FRAMES 才认「开口」）
       * segVoicedMs 本句里真正发声的累计时长（纯噪声段靠它被丢掉）
       * spoke       本次会话是否真的说过话
       */
      let preroll: Float32Array[] = []
      let seg: Float32Array[] = []
      let speaking = false
      let silenceMs = 0
      let aboveRun = 0
      let segVoicedMs = 0
      let spoke = false
      let calibrating = true
      let calibrateMs = 0
      const noise: number[] = []
      let threshold = VAD_THRESHOLD_MIN
      let frameMs = 42.7
      let lastRate = 48000
      let finished = false

      /** 裁掉尾部 ms 毫秒的静音（至少留 1 帧，避免空数组） */
      const dropTail = (frames: Float32Array[], ms: number) =>
        frames.slice(0, Math.max(1, frames.length - Math.round(ms / frameMs)))

      /**
       * 把当前 seg 切成一句送识别。
       * 🚨 两道门槛都过了才送：
       *    · 整段 ≥ MIN_SEGMENT_MS（420ms）
       *    · 其中**真正发声**的时长 ≥ MIN_VOICED_MS（180ms）
       * 第二道是这次「噪音被识别成字」的主要修法 —— 长段底噪被切出来时，
       * 整段虽然够长，但几乎没有一帧真正越过阈值，属于纯噪声，直接丢掉不送模型。
       */
      const cutSegment = (rate: number, hangMs: number) => {
        const usable = dropTail(seg, hangMs)
        const chunk = concatFrames(usable)
        const chunkMs = (chunk.length / rate) * 1000
        if (chunkMs >= MIN_SEGMENT_MS && segVoicedMs >= MIN_VOICED_MS) {
          enqueueSegment(chunk, rate)
        }
        // 尾部静音留作下一句的预卷
        preroll = seg.slice(usable.length)
        seg = []
        segVoicedMs = 0
        speaking = false
        silenceMs = 0
        aboveRun = 0
      }

      const finish = (reason: "idle" | "manual") => {
        if (finished) return
        finished = true

        // 尾句：正在说话时被停止，seg 里的话不能丢（尾部静音按实际静音长度裁）
        if (seg.length > 1) {
          const usable = dropTail(seg, Math.min(silenceMs, SEGMENT_HANG_MS))
          const tail = concatFrames(usable)
          const tailMs = (tail.length / lastRate) * 1000
          if (tailMs >= MIN_SEGMENT_MS && segVoicedMs >= MIN_VOICED_MS) {
            enqueueSegment(tail, lastRate)
          }
        }
        const neverSpoke = !spoke
        seg = []
        preroll = []
        cleanup()

        if (reason === "idle" && neverSpoke) {
          // 10s 一句没说：本地收摊，不浪费一次上传
          fail("没听到声音，点一下麦克风再说一次")
        }
        settleIfIdle()
      }

      const onFrame: FrameHandler = (frame, sampleRate) => {
        if (finished) return
        lastRate = sampleRate
        frameMs = (frame.length / sampleRate) * 1000
        const rms = rmsOf(frame)

        // ① 校准环境底噪（取 25 分位：用户一按就说也不会把阈值抬歪）
        if (calibrating) {
          noise.push(rms)
          calibrateMs += frameMs
          preroll.push(frame)
          const keep = Math.ceil(PREROLL_MS / frameMs) + 2
          if (preroll.length > keep) preroll.shift()
          if (calibrateMs >= VAD_CALIBRATE_MS) {
            const sorted = [...noise].sort((a, b) => a - b)
            const floor = sorted[Math.floor(sorted.length * 0.25)] ?? 0
            threshold = Math.min(VAD_THRESHOLD_MAX, Math.max(VAD_THRESHOLD_MIN, floor * VAD_NOISE_FACTOR))
            calibrating = false
          }
          return
        }

        if (rms > threshold) {
          aboveRun += 1

          if (speaking) {
            seg.push(frame)
            segVoicedMs += frameMs
            silenceMs = 0
          } else if (aboveRun >= VAD_CONFIRM_FRAMES) {
            // ② 连续 3 帧才认「真的开口了」（瞬态噪声活不过 128ms）。
            //    确认期的帧已经在 preroll 里，句首不会丢。
            speaking = true
            seg = [...preroll, frame]
            preroll = []
            segVoicedMs = frameMs * aboveRun
            spoke = true
            silenceMs = 0
          } else {
            // 还没确认：先按静音处理（帧进预卷，确认后可回补）
            preroll.push(frame)
            const keep = Math.ceil(PREROLL_MS / frameMs) + 2
            if (preroll.length > keep) preroll.shift()
            silenceMs += frameMs
          }
        } else {
          aboveRun = 0

          if (speaking) {
            seg.push(frame)
            silenceMs += frameMs
            if (silenceMs >= SEGMENT_HANG_MS) {
              cutSegment(sampleRate, SEGMENT_HANG_MS)
            }
          } else {
            preroll.push(frame)
            const keep = Math.ceil(PREROLL_MS / frameMs) + 2
            if (preroll.length > keep) preroll.shift()
            silenceMs += frameMs
          }
        }

        // ③ 一直不停顿（可能是稳态噪声、也可能是超长句）：到 20s 强制切一段，
        //    交给服务端的能量/密度闸判断，别让 seg 无限长。
        if (speaking && seg.length * frameMs >= MAX_SEGMENT_MS) {
          cutSegment(sampleRate, 0)
        }

        // ④ 很久没说话 → 收尾（这个「很久」是 10s，不是说完一句就切）
        if (silenceMs >= SESSION_IDLE_MS) finish("idle")
      }

      const graph = createCaptureGraph(stream, onFrame)
      if (!graph) {
        releaseStream(stream)
        fail("当前浏览器不支持音频采集，请换 Chrome / Edge")
        return
      }

      streamRef.current = stream
      graphRef.current = graph
      finishRef.current = finish

      listeningRef.current = true
      setIsListening(true)
      startedAtRef.current = Date.now()
      setElapsed(0)

      tickRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000))
      }, 500)

      hardStopRef.current = setTimeout(() => {
        // 硬上限：怕用户忘关麦克风（不是「说完自动停」那条逻辑）
        finish("manual")
      }, maxDuration * 1000)
    })()
  }, [cleanup, enqueueSegment, fail, maxDuration, ready, readyReason, settleIfIdle])

  const toggle = useCallback(() => {
    if (listeningRef.current) stop()
    else start()
  }, [start, stop])

  /* 光晕广播：录音中 or 还有句子在识别，都算「语音正在工作」 */
  useEffect(() => {
    setVoiceInputActive(isListening || isTranscribing)
  }, [isListening, isTranscribing])

  /* 卸载：释放麦克风 + 复位光晕，别让录音会话挂在后台 */
  useEffect(() => {
    const session = sessionRef
    const graphSlot = graphRef
    const streamSlot = streamRef

    return () => {
      session.current++
      clearTimers()
      graphSlot.current?.dispose()
      graphSlot.current = null
      releaseStream(streamSlot.current)
      streamSlot.current = null
      setVoiceInputActive(false)
    }
  }, [clearTimers])

  return {
    isListening,
    isTranscribing,
    ready,
    readyReason,
    elapsed,
    segmentCount,
    error,
    start,
    stop,
    toggle,
    warmup,
  }
}
