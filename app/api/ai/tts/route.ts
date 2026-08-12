import { NextResponse } from "next/server"
import { getVoiceServerConfig, resolveVoiceApiKey } from "@/lib/db/settings-service"

export const runtime = "nodejs"

/**
 * 通用 TTS 接口（多提供商适配）
 * 从 system_settings.voice_config 读取 TTS 参数，API Key 从 AI 提供商配置统一解析。
 *
 * 支持的 providerType：
 * - dashscope: 阿里云，Bearer 认证，JSON {model, input, parameters}，返回 output.audio.url
 * - unifiedtts: UnifiedTTS，X-API-Key 认证，JSON {model, text, voice, format}，返回 data.audio_url
 * - openai: OpenAI 兼容，Bearer 认证，JSON {model, input, voice}，直接返回音频流
 * - baidu: 百度语音，Bearer 认证，form 数据，直接返回音频流
 * - custom: 按 dashscope 兼容处理
 *
 * 请求体：{ text: string, voice?: string, speed?: number }
 * 返回：audio/mpeg（或对应格式）音频流
 */
export async function POST(req: Request) {
  try {
    const { text, voice, speed } = await req.json()
    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    const cfg = await getVoiceServerConfig()
    const tts = cfg.tts
    const { apiKey, providerName, source } = await resolveVoiceApiKey(cfg.providerId, "tts")

    if (!apiKey) {
      return NextResponse.json(
        { error: "AI 提供商 API Key 未配置，请在 AI 提供商管理中设置。" },
        { status: 500 }
      )
    }

    const useVoice = voice || tts.defaultVoice
    console.log(`[TTS] providerType=${tts.providerType}, keySource=${source}, provider=${providerName}, model=${tts.model}, voice=${useVoice}`)

    // 按提供商类型分发请求
    const audioBlob = await synthesizeByProvider(tts.providerType, {
      endpoint: tts.endpoint,
      apiKey,
      model: tts.model,
      text,
      voice: useVoice,
      audioFormat: tts.audioFormat,
      sampleRate: tts.sampleRate,
      speed,
    })

    if (!audioBlob) {
      return NextResponse.json({ error: "Failed to synthesize speech" }, { status: 500 })
    }

    const contentType = audioFormatToContentType(tts.audioFormat)
    return new NextResponse(audioBlob, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    console.error("[TTS] Route Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ===== 各提供商请求适配 =====

interface TtsRequestParams {
  endpoint: string
  apiKey: string
  model: string
  text: string
  voice: string
  audioFormat: string
  sampleRate: number
  speed?: number
}

async function synthesizeByProvider(
  providerType: string,
  params: TtsRequestParams
): Promise<Blob | null> {
  switch (providerType) {
    case "unifiedtts":
      return await synthesizeUnifiedTTS(params)
    case "openai":
      return await synthesizeOpenAI(params)
    case "baidu":
      return await synthesizeBaidu(params)
    case "dashscope":
    case "custom":
    default:
      return await synthesizeDashscope(params)
  }
}

/** DashScope 风格（阿里云 qwen-tts / cosyvoice） */
async function synthesizeDashscope(params: TtsRequestParams): Promise<Blob | null> {
  const payload = {
    model: params.model,
    input: { text: params.text, voice: params.voice },
    parameters: {
      audio_format: params.audioFormat,
      sample_rate: params.sampleRate,
      ...(params.speed ? { speed: params.speed } : {}),
    },
  }

  const response = await fetch(params.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[TTS/Dashscope] API Error:", errorText)
    return null
  }

  return await extractAudioFromResponse(response)
}

/** UnifiedTTS 聚合平台（X-API-Key 认证，flat JSON body） */
async function synthesizeUnifiedTTS(params: TtsRequestParams): Promise<Blob | null> {
  const payload = {
    model: params.model,
    text: params.text,
    voice: params.voice,
    format: params.audioFormat,
    ...(params.speed ? { speed: params.speed } : {}),
  }

  const response = await fetch(params.endpoint, {
    method: "POST",
    headers: {
      "X-API-Key": params.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[TTS/UnifiedTTS] API Error:", errorText)
    return null
  }

  // UnifiedTTS 返回 JSON: { success, data: { audio_url, file_size } }
  const data = await response.json()
  const audioUrl: string | undefined = data?.data?.audio_url
  if (!audioUrl) {
    console.error("[TTS/UnifiedTTS] No audio_url in response:", data)
    return null
  }

  // 下载音频文件
  const audioResponse = await fetch(audioUrl)
  if (!audioResponse.ok) {
    console.error("[TTS/UnifiedTTS] Failed to download audio:", audioResponse.status)
    return null
  }
  return await audioResponse.blob()
}

/** OpenAI 兼容格式（Bearer 认证，直接返回音频流） */
async function synthesizeOpenAI(params: TtsRequestParams): Promise<Blob | null> {
  const payload = {
    model: params.model,
    input: params.text,
    voice: params.voice,
    response_format: params.audioFormat,
    ...(params.speed ? { speed: params.speed } : {}),
  }

  const response = await fetch(params.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[TTS/OpenAI] API Error:", errorText)
    return null
  }

  // OpenAI 直接返回音频流
  const contentType = response.headers.get("content-type") || ""
  if (contentType.startsWith("audio/")) {
    return await response.blob()
  }

  // 某些兼容平台可能返回 JSON
  return await extractAudioFromResponse(response)
}

/** 百度语音 TTS（Bearer 认证，form 数据，直接返回音频流） */
async function synthesizeBaidu(params: TtsRequestParams): Promise<Blob | null> {
  const formBody = new URLSearchParams()
  formBody.append("tex", params.text)
  formBody.append("tok", params.apiKey) // 百度 access_token
  formBody.append("cuid", "berry-realm")
  formBody.append("ctp", "1")
  formBody.append("lan", "zh")
  formBody.append("per", params.voice || "4118")
  formBody.append("aue", params.audioFormat === "wav" ? "6" : params.audioFormat === "pcm" ? "4" : "3")
  if (params.speed) formBody.append("spd", String(Math.round(params.speed * 5)))

  const response = await fetch(params.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody.toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[TTS/Baidu] API Error:", errorText)
    return null
  }

  // 百度成功直接返回音频流，失败返回 JSON
  const contentType = response.headers.get("content-type") || ""
  if (contentType.startsWith("audio/")) {
    return await response.blob()
  }

  console.error("[TTS/Baidu] Non-audio response:", await response.text())
  return null
}

/** 从响应中提取音频（兼容直接流 / JSON 含 URL） */
async function extractAudioFromResponse(response: Response): Promise<Blob | null> {
  const contentType = response.headers.get("content-type") || ""

  // 直接返回音频流
  if (contentType.startsWith("audio/")) {
    return await response.blob()
  }

  // JSON 响应中包含音频 URL（DashScope 风格）
  if (contentType.includes("application/json")) {
    const data = await response.json()
    const audioUrl: string | undefined =
      data?.output?.audio?.url ||
      data?.audio?.url ||
      data?.url ||
      data?.data?.[0]?.url ||
      data?.data?.audio_url
    if (!audioUrl) return null

    const audioResponse = await fetch(audioUrl)
    if (!audioResponse.ok) return null
    return await audioResponse.blob()
  }

  return null
}

function audioFormatToContentType(format: string): string {
  switch (format) {
    case "wav":
      return "audio/wav"
    case "pcm":
      return "audio/pcm"
    case "mp3":
    default:
      return "audio/mpeg"
  }
}
