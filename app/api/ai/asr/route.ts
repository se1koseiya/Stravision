import { NextResponse } from "next/server"
import { existsSync } from "node:fs"
import path from "node:path"
import { getCurrentUser } from "@/lib/auth"

export const runtime = "nodejs"
export const maxDuration = 120

/**
 * 语音输入 · 本地 ASR（sherpa-onnx + Paraformer 中文）
 *
 * ── 为什么是本地 ─────────────────────────────────────────────
 * 浏览器原生 `SpeechRecognition` 在 Chrome 上走 Google 语音服务，国内必失败；
 * 云端 ASR 要按次计费、音频外发。这里用 k2-fsa 的 sherpa-onnx 离线推理（Apache-2.0）：
 * 模型常驻内存，中文 Paraformer-large 实测 5.5s 音频解码 300ms（约 18 倍实时），
 * 音频不出内网。
 *
 * ── 模型从 ModelScope 来 ─────────────────────────────────────
 * 官方打包版只在 GitHub Releases / HF（国内都拿不到），所以改用 ModelScope 上
 * FunASR 官方的 ONNX 导出（`iic/speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8404-onnx`），
 * 再用 `scripts/asr/append-onnx-metadata.mjs` 补 CMVN / LFR / vocab 元数据。
 * 一键准备：`pnpm asr:model`。
 *
 * 请求：multipart/form-data { audio: WAV(16k/mono/PCM16) }
 * 返回：{ success, transcript, elapsedMs }
 */

/**
 * 模型目录解析 —— 必须多候选，不能钉死 `cwd/data`。
 *
 * 🚨 2026-10-27 桌面端「语音模型未安装」事故：
 *   模型是**只读随包资源**，却一度被放进 `data/`，而桌面端 `data/` 是**可写数据目录**
 *   （desktop/lib/links.js 把它重定向成 → %APPDATA%\...\server-data\data 的目录联接）。
 *   老用户升级时那个目标目录早已非空，首次运行的「迁移随包数据」整段跳过，
 *   238MB 模型只留在安装目录的 `data.__bundled__/` 里 ——
 *   `cwd/data/models/asr` 永远不存在，/api/ai/asr 一律 MODEL_NOT_INSTALLED。
 *
 *   所以：打包时模型改放 `serverRoot/models/asr`（不经任何目录联接），
 *   其余候选只是兼容 dev 与历史安装，探测顺序即优先级。
 */
const MODEL_SUBDIR = path.join("models", "asr", "funasr-paraformer")

function modelDirCandidates(): string[] {
  const cwd = process.cwd()
  const list: string[] = []

  // 1) 显式覆盖（排障用）
  if (process.env.SHERPA_ASR_MODEL_DIR) list.push(path.resolve(process.env.SHERPA_ASR_MODEL_DIR))
  // 2) 桌面端打包产物：随包只读资源，不经目录联接，永远可见
  list.push(path.join(cwd, MODEL_SUBDIR))
  // 3) 开发态 / `pnpm asr:model` 的默认落点
  list.push(path.join(cwd, "data", MODEL_SUBDIR))
  // 4) 桌面端 userData 数据根（Launcher 通过 STRAVISION_DATA_ROOT 注入）
  if (process.env.STRAVISION_DATA_ROOT) {
    list.push(path.join(process.env.STRAVISION_DATA_ROOT, "data", MODEL_SUBDIR))
  }
  // 5) 历史安装包兜底：首次运行把随包 data 改名成 data.__bundled__，模型被遗留在此
  list.push(path.join(cwd, "data.__bundled__", MODEL_SUBDIR))

  return list
}

/** 该目录里能否找到一组可用模型（onnx + tokens.txt） */
function findModelFiles(dir: string): { model: string; tokens: string } | null {
  const tokens = path.join(dir, "tokens.txt")
  if (!existsSync(tokens)) return null
  for (const name of ["model.int8.onnx", "model.onnx", "model_quant.onnx"]) {
    const model = path.join(dir, name)
    if (existsSync(model)) return { model, tokens }
  }
  return null
}

/** 命中过的目录缓存起来：探活接口每次挂载都会调，没必要反复 stat 五个路径 */
let resolvedDir: string | null = null

/** 返回可用模型所在目录；全部落空时返回首选候选（供报错信息展示） */
function resolveModelDir(): string {
  if (resolvedDir && findModelFiles(resolvedDir)) return resolvedDir
  const candidates = modelDirCandidates()
  for (const dir of candidates) {
    if (findModelFiles(dir)) {
      resolvedDir = dir
      return dir
    }
  }
  resolvedDir = null
  return candidates[1]
}

type Recognizer = {
  createStream: () => { acceptWaveform: (o: { samples: Float32Array; sampleRate: number }) => void }
  decodeAsync: (stream: unknown) => Promise<void>
  getResult: (stream: unknown) => { text?: string }
}

/* 进程级单例：模型首次加载约 2~3s，之后常驻。挂 globalThis 是因为 Next dev
   热重载会重新执行本模块，但进程内存还在 —— 不挂全局就会每次改代码都重载 240MB。 */
const g = globalThis as typeof globalThis & {
  __berryAsr?: { model: Promise<Recognizer> | null; chain: Promise<unknown> }
}
const cache = g.__berryAsr ?? (g.__berryAsr = { model: null, chain: Promise.resolve() })

async function loadModel(): Promise<Recognizer> {
  const dir = resolveModelDir()
  const files = findModelFiles(dir)
  if (!files) {
    const searched = modelDirCandidates()
      .map((p) => `  - ${p}`)
      .join("\n")
    throw new Error(
      `语音模型未安装（已查找以下目录，均缺 model.int8.onnx 或 tokens.txt）：\n${searched}`
    )
  }

  const sherpa = await import("sherpa-onnx-node")
  const recognizer = new sherpa.OfflineRecognizer({
    featConfig: { sampleRate: 16000, featureDim: 80 },
    modelConfig: {
      paraformer: { model: files.model },
      tokens: files.tokens,
      numThreads: Number(process.env.SHERPA_ASR_THREADS ?? 2),
      provider: "cpu",
      debug: 0,
    },
  }) as unknown as Recognizer

  console.log(`[ASR] 模型已加载：${dir}`)
  return recognizer
}

function ensureModel(): Promise<Recognizer> {
  if (!cache.model) {
    cache.model = loadModel().catch((err) => {
      cache.model = null // 失败不缓存，下次可重试（比如用户刚跑完 pnpm asr:model）
      throw err
    })
  }
  return cache.model
}

/** recognizer 不可重入 —— 用串行链保护，避免并发请求踩坏内部状态 */
function serialize<T>(task: () => Promise<T>): Promise<T> {
  const run = cache.chain.then(task, task)
  cache.chain = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let recognizer: Recognizer
  try {
    recognizer = await ensureModel()
  } catch (err) {
    const message = err instanceof Error ? err.message : "语音模型加载失败"
    console.error("[ASR] 模型加载失败:", message)
    return NextResponse.json({ error: message, code: "MODEL_NOT_READY" }, { status: 503 })
  }

  try {
    const form = await req.formData()
    const audio = form.get("audio")
    if (!(audio instanceof Blob) || audio.size === 0) {
      return NextResponse.json({ error: "缺少音频数据" }, { status: 400 })
    }
    if (audio.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "录音过长（上限 25MB）" }, { status: 413 })
    }

    const wav = decodeWavPcm16(Buffer.from(await audio.arrayBuffer()))
    if (!wav) {
      return NextResponse.json({ error: "音频格式不支持（需要 16kHz 单声道 PCM16 WAV）" }, { status: 415 })
    }
    if (wav.samples.length < 1600) {
      return NextResponse.json({ error: "录音太短，说完一句再停" }, { status: 422 })
    }

    /* 闸 1：能量门。
       Paraformer 这类模型对**纯噪声也会「猜」出文字**（"嗯""好的""谢谢"是经典幻觉），
       事后过滤已经晚了 —— 所以先看这段音频里到底有没有人声。
       前端已经用同样思路筛过一遍，这里是兜底（比如环境吵到前端阈值失灵）。 */
    const level = analyzeLevel(wav.samples, wav.sampleRate)
    if (!level.ok) {
      return NextResponse.json(
        { error: "这段没听到说话声", code: "SILENT" },
        { status: 422 }
      )
    }

    const started = Date.now()
    const raw = await serialize(async () => {
      const stream = recognizer.createStream()
      stream.acceptWaveform({ samples: wav.samples, sampleRate: wav.sampleRate })
      await recognizer.decodeAsync(stream)
      return recognizer.getResult(stream).text ?? ""
    })

    const transcript = tidy(raw)
    if (!transcript) {
      return NextResponse.json({ error: "没听清，再说一遍？" }, { status: 422 })
    }

    const audioSec = wav.samples.length / wav.sampleRate

    /* 闸 2：文字密度门。
       真人说话再慢也有 ~1 字/秒（含停顿），噪声幻觉的典型形态是
       「3 秒底噪只蹦出两个字」。密度过低直接当没听清，不往草稿里写。 */
    if (!isPlausibleSpeech(transcript, audioSec)) {
      console.log(
        `[ASR] 丢弃可疑结果：${audioSec.toFixed(1)}s → ${transcript.length} 字（密度 ${(
          transcript.replace(/\s/g, "").length / audioSec
        ).toFixed(2)} 字/秒）「${transcript}」`
      )
      return NextResponse.json({ error: "没听清，再说一遍？", code: "LOW_DENSITY" }, { status: 422 })
    }

    const elapsedMs = Date.now() - started
    console.log(
      `[ASR] ${audioSec.toFixed(1)}s 音频 → ${transcript.length} 字，${elapsedMs}ms` +
        `（peak=${level.peak.toFixed(3)} voiced=${(level.voicedRatio * 100).toFixed(0)}%）`
    )

    return NextResponse.json({ success: true, transcript, elapsedMs })
  } catch (err) {
    console.error("[ASR] 识别失败:", err)
    return NextResponse.json({ error: err instanceof Error ? err.message : "语音识别失败" }, { status: 500 })
  }
}

/**
 * 音频能量分析（20ms 一帧）。
 *
 * 判「有人声」的两个条件同时满足：
 *   · peak ≥ 0.02          —— 整段最大帧能量得够，纯底噪达不到
 *   · voicedRatio ≥ 0.08   —— 至少 8% 的帧越过「底噪 × 4」这条线
 *
 * 阈值刻意比前端宽一点：前端负责省流量，这里负责兜底，宁可放过也别把
 * 一句轻声的话判死（判死的代价是用户说了一遍没反应，比多识别一次难受得多）。
 */
function analyzeLevel(samples: Float32Array, sampleRate: number) {
  const frameLen = Math.max(1, Math.round(sampleRate * 0.02))
  const rmsList: number[] = []
  for (let i = 0; i + frameLen <= samples.length; i += frameLen) {
    let sum = 0
    for (let j = 0; j < frameLen; j++) {
      const v = samples[i + j]
      sum += v * v
    }
    rmsList.push(Math.sqrt(sum / frameLen))
  }
  if (rmsList.length === 0) return { ok: false, peak: 0, voicedRatio: 0 }

  const sorted = [...rmsList].sort((a, b) => a - b)
  const floor = sorted[Math.floor(sorted.length * 0.2)] ?? 0
  const peak = sorted[sorted.length - 1] ?? 0
  const gate = Math.max(0.016, floor * 4)
  const voiced = rmsList.reduce((n, v) => (v > gate ? n + 1 : n), 0)
  const voicedRatio = voiced / rmsList.length

  return { ok: peak >= 0.02 && voicedRatio >= 0.08, peak, voicedRatio }
}

/**
 * 结果可信度：字数 / 时长 的密度。
 *
 * 中文正常语速 3~5 字/秒，放慢、带停顿也很少低于 1.5。定 0.9 是留了余量
 * （包含"嗯……那个"这种大量填充词的情况），主要拦「几秒音频只出两个字」的幻觉。
 */
function isPlausibleSpeech(transcript: string, audioSec: number): boolean {
  const chars = transcript.replace(/\s/g, "").length
  if (chars === 0) return false
  // 太短的音频不按密度判（0.3s 出 1 个字就是 3.3 字/秒，没意义）
  if (audioSec < 0.8) return true
  return chars / audioSec >= 0.9
}

/**
 * GET：探活（默认）/ 预热（?warm=1）。
 *
 * 探活只做两次 existsSync —— 不能顺手加载模型：发送框在每个会话页都会挂载，
 * 让从不说话的用户白背 240MB 内存是不可接受的。
 * 真正的预热挂在「鼠标移到麦克风上」这一刻（?warm=1），
 * 用户在犹豫的那 1~2 秒里模型就开始加载，等真按下时已经热好了。
 */
export async function GET(req: Request) {
  const installed = findModelFiles(resolveModelDir()) !== null
  if (!installed) {
    return NextResponse.json({
      ready: false,
      reason: "MODEL_NOT_INSTALLED",
      // 探活返回候选路径：桌面端排障时不用再猜模型到底该放哪
      searched: modelDirCandidates(),
    })
  }

  const warm = new URL(req.url).searchParams.get("warm") === "1"
  if (!warm) return NextResponse.json({ ready: true })

  try {
    const t0 = Date.now()
    await ensureModel()
    return NextResponse.json({ ready: true, warmupMs: Date.now() - t0 })
  } catch (err) {
    return NextResponse.json({
      ready: false,
      reason: err instanceof Error ? err.message : "模型加载失败",
    })
  }
}

/* ── WAV 解析（只吃 PCM16，正是 audioBufferToWavBlob 的产物）────────── */

function decodeWavPcm16(buf: Buffer): { samples: Float32Array; sampleRate: number } | null {
  if (buf.length < 44) return null
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") return null

  let sampleRate = 16000
  let channels = 1
  let bitsPerSample = 16
  let audioFormat = 1
  let dataOffset = -1
  let dataLength = 0

  let offset = 12
  while (offset + 8 <= buf.length) {
    const chunkId = buf.toString("ascii", offset, offset + 4)
    const chunkSize = buf.readUInt32LE(offset + 4)
    const body = offset + 8

    if (chunkId === "fmt ") {
      audioFormat = buf.readUInt16LE(body)
      channels = buf.readUInt16LE(body + 2)
      sampleRate = buf.readUInt32LE(body + 4)
      bitsPerSample = buf.readUInt16LE(body + 14)
    } else if (chunkId === "data") {
      dataOffset = body
      dataLength = Math.min(chunkSize, buf.length - body)
      break
    }
    offset = body + chunkSize + (chunkSize % 2)
  }

  if (dataOffset < 0 || audioFormat !== 1 || bitsPerSample !== 16) return null

  const bytesPerFrame = 2 * channels
  const frames = Math.floor(dataLength / bytesPerFrame)
  const samples = new Float32Array(frames)
  for (let i = 0; i < frames; i++) {
    const v = buf.readInt16LE(dataOffset + i * bytesPerFrame)
    samples[i] = v < 0 ? v / 0x8000 : v / 0x7fff
  }
  return { samples, sampleRate }
}

/** 中文模型偶尔按字吐空格，收一下；英文单词间保留 */
function tidy(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/([\u4e00-\u9fa5]) (?=[\u4e00-\u9fa5])/g, "$1")
    .trim()
}
