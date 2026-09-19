import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { IS_DESKTOP_APP } from "@/lib/desktop-mode"
import {
  getVoiceServerConfig,
  updateVoiceServerConfig,
  resolveVoiceApiKey,
  DEFAULT_VOICE_SERVER_CONFIG,
  type VoiceServerConfig,
} from "@/lib/db/settings-service"
import { z } from "zod"

const voiceOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
})

/** TTS 专用参数（无 provider/apiKeyEnv，API Key 统一由 AI 提供商管理） */
const ttsSchema = z.object({
  providerType: z.enum(["dashscope", "unifiedtts", "openai", "baidu", "custom"]),
  endpoint: z.string().url(),
  model: z.string().min(1),
  defaultVoice: z.string().min(1),
  voices: z.array(voiceOptionSchema).min(1),
  audioFormat: z.enum(["mp3", "wav", "pcm"]),
  sampleRate: z.number().int().min(8000).max(48000),
})

/** ASR 专用参数 */
const asrSchema = z.object({
  // browser: 浏览器原生 SpeechRecognition（仅客户端，免费零延迟）
  providerType: z.enum(["dashscope", "baidu", "openai", "custom", "browser"]),
  // browser 模式下 endpoint/model 不需要，允许空字符串
  endpoint: z.string().default(""),
  model: z.string().default(""),
  defaultLanguage: z.string().min(1),
  defaultDialect: z.string(),
  // 实时 ASR（asrMode=realtime 时使用）
  realtimeEndpoint: z.string().default(""),
  realtimeModel: z.string().default(""),
  format: z.string().default("pcm"),
  sampleRate: z.number().int().min(8000).max(48000).default(16000),
  maxSentenceSilence: z.number().int().min(300).max(5000).default(500),
})

/** Omni 一体化架构专用参数（WebSocket 实时流式） */
const omniSchema = z.object({
  endpoint: z.string().min(1),
  model: z.string().min(1),
  voice: z.string().min(1),
})

const vadSchema = z.object({
  silenceThreshold: z.number().min(0.001).max(0.5),
  silenceDurationMs: z.number().int().min(300).max(5000),
  speechStartMs: z.number().int().min(100).max(2000),
  maxSegmentMs: z.number().int().min(3000).max(60000),
  minSpeechMs: z.number().int().min(100).max(3000),
  adaptiveNoiseFloor: z.boolean(),
})

/** 完整配置 schema（POST 全量保存）。注意：ttsApiKey/asrApiKey/omniApiKey 不在此处设置，必须通过 /keys 接口。 */
const configSchema = z.object({
  architecture: z.enum(["omni"]),
  providerId: z.string().nullable(),
  tts: ttsSchema,
  asr: asrSchema,
  omni: omniSchema,
  vad: vadSchema,
  readAloud: z.boolean(),
  asrMode: z.enum(["batch", "realtime"]).default("batch"),
})

/** PATCH 部分更新 schema（语音测试页单独保存 TTS/ASR/Omni/架构 参数） */
const patchSchema = z.object({
  architecture: z.enum(["omni"]).optional(),
  tts: ttsSchema.optional(),
  asr: asrSchema.optional(),
  omni: omniSchema.optional(),
  asrMode: z.enum(["batch", "realtime"]).optional(),
})

async function checkAdmin() {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return null
  }
  // 🚨 桌面端放行：本地单用户形态，无平台角色概念（IS_DESKTOP_APP 构建期内联，Web 构建恒 false）
  if (IS_DESKTOP_APP) {
    return currentUser
  }
  if (currentUser.role !== "admin" && currentUser.role !== "super_admin") {
    return null
  }
  return currentUser
}

export async function GET(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  try {
    const config = await getVoiceServerConfig()
    const { apiKey, providerName } = await resolveVoiceApiKey(config.providerId)
    // 剥离加密的 key 字段（不返回密文到前端），通过独立 /keys 接口获取脱敏状态
    const { ttsApiKey, asrApiKey, omniApiKey, ...safeConfig } = config
    const enriched = {
      ...safeConfig,
      apiKeyConfigured: Boolean(apiKey),
      providerName,
    }
    return NextResponse.json(enriched)
  } catch (error) {
    console.error("Failed to fetch voice config:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  try {
    const body = await req.json()
    const result = configSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message, details: result.error.issues },
        { status: 400 }
      )
    }

    await updateVoiceServerConfig(result.data as VoiceServerConfig)
    return NextResponse.json({ success: true, config: result.data })
  } catch (error) {
    console.error("Failed to update voice config:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

/**
 * PATCH：部分更新（语音测试页单独保存 TTS/ASR 参数）。
 * 仅更新传入的字段，保留其他配置不变。
 */
export async function PATCH(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  try {
    const body = await req.json()
    const result = patchSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message, details: result.error.issues },
        { status: 400 }
      )
    }

    const current = await getVoiceServerConfig()
    const merged: VoiceServerConfig = {
      ...current,
      architecture: result.data.architecture ?? current.architecture,
      tts: result.data.tts ? { ...current.tts, ...result.data.tts } : current.tts,
      asr: result.data.asr ? { ...current.asr, ...result.data.asr } : current.asr,
      omni: result.data.omni ? { ...current.omni, ...result.data.omni } : current.omni,
      asrMode: result.data.asrMode ?? current.asrMode ?? "batch",
    }
    await updateVoiceServerConfig(merged)
    return NextResponse.json({ success: true, config: merged })
  } catch (error) {
    console.error("Failed to patch voice config:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

/** 恢复默认配置 */
export async function DELETE(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  try {
    await updateVoiceServerConfig(DEFAULT_VOICE_SERVER_CONFIG)
    return NextResponse.json({ success: true, config: DEFAULT_VOICE_SERVER_CONFIG })
  } catch (error) {
    console.error("Failed to reset voice config:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
