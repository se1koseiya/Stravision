import { NextRequest, NextResponse } from "next/server"
import { getInternalApiSecret } from "@/lib/constants"
import { getVoiceServerConfig, resolveVoiceApiKey } from "@/lib/db/settings-service"

export const dynamic = "force-dynamic"

/**
 * 内部接口：供独立 WS 服务（server/ws-server.js /asr）拉取 ASR 架构运行时配置。
 * 通过 x-internal-secret 鉴权，防止外部访问。
 * 返回明文 API Key（仅限同机内部服务调用，不出公网）。
 *
 * 返回 realtime 字段：
 * - endpoint: 实时 ASR WebSocket 端点（如 wss://dashscope.aliyuncs.com/api-ws/v1/inference）
 * - model: 实时 ASR 模型名（如 qwen-audio-3.0-asr-flash-streaming）
 * - apiKey: DashScope API Key
 * - format / sampleRate / language: 音频参数
 * - maxSentenceSilence: VAD 断句静音阈值
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret")
  if (secret !== getInternalApiSecret()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const cfg = await getVoiceServerConfig()
    const { apiKey, providerName, source } = await resolveVoiceApiKey(cfg.providerId, "asr")

    // 实时 ASR 端点：从 asr.realtimeEndpoint 读取，回退到默认 DashScope WS 端点
    const realtimeEndpoint = cfg.asr.realtimeEndpoint ||
      "wss://dashscope.aliyuncs.com/api-ws/v1/inference"
    // 实时 ASR 模型：从 asr.realtimeModel 读取，回退到 asr.model，再回退到默认模型
    const realtimeModel = cfg.asr.realtimeModel || cfg.asr.model ||
      "qwen-audio-3.0-asr-flash-streaming"

    return NextResponse.json({
      endpoint: realtimeEndpoint,
      model: realtimeModel,
      apiKey,
      keySource: providerName,
      keySourceKind: source,
      format: cfg.asr.format || "pcm",
      sampleRate: cfg.asr.sampleRate || 16000,
      language: cfg.asr.defaultLanguage || "zh",
      maxSentenceSilence: cfg.asr.maxSentenceSilence || 500,
    })
  } catch (error) {
    console.error("[Internal AsrConfig] error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
