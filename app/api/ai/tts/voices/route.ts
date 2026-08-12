import { NextRequest, NextResponse } from "next/server"
import { getVoiceServerConfig, resolveVoiceApiKey } from "@/lib/db/settings-service"

export const runtime = "nodejs"

/**
 * 获取指定模型的音色列表（代理 UnifiedTTS /api/v1/tools/voices/{model}）
 * 查询参数：?model=edge-tts
 * 仅当 providerType === "unifiedtts" 时有效。
 */
export async function GET(req: NextRequest) {
  try {
    const model = req.nextUrl.searchParams.get("model")
    if (!model) {
      return NextResponse.json({ success: false, error: "缺少 model 参数", voices: [] }, { status: 400 })
    }

    const cfg = await getVoiceServerConfig()
    if (cfg.tts.providerType !== "unifiedtts") {
      return NextResponse.json({
        success: false,
        error: "当前 TTS 提供商不支持音色列表查询（仅 UnifiedTTS 支持）",
        voices: [],
      })
    }

    const { apiKey } = await resolveVoiceApiKey(cfg.providerId, "tts")
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "API Key 未配置", voices: [] })
    }

    // UnifiedTTS voices 端点：从 tts.endpoint 推导
    const baseUrl = cfg.tts.endpoint.replace("/common/tts-sync", `/tools/voices/${encodeURIComponent(model)}`)
    const voicesUrl = baseUrl.includes("/tools/voices/")
      ? baseUrl
      : `https://unifiedtts.com/api/v1/tools/voices/${encodeURIComponent(model)}`

    const response = await fetch(voicesUrl, {
      headers: { "X-API-Key": apiKey },
    })

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `获取音色列表失败: ${response.status}`,
        voices: [],
      }, { status: response.status })
    }

    const data = await response.json()
    // UnifiedTTS 返回 { success, data: [{ voiceId, voiceName, language, gender, description }] }
    const rawVoices = Array.isArray(data.data) ? data.data : []

    // 转换为统一格式 { value, label }
    const voices = rawVoices.map((v: { voiceId: string; voiceName?: string; language?: string; gender?: string }) => ({
      value: v.voiceId,
      label: v.voiceName
        ? `${v.voiceName}${v.gender ? ` · ${v.gender}` : ""}${v.language ? ` · ${v.language}` : ""}`
        : v.voiceId,
    }))

    return NextResponse.json({ success: true, voices })
  } catch (error) {
    console.error("[TTS/Voices] Error:", error)
    return NextResponse.json({ success: false, error: "Internal server error", voices: [] }, { status: 500 })
  }
}
