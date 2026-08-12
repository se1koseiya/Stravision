import { NextResponse } from "next/server"
import { getVoiceServerConfig, resolveVoiceApiKey } from "@/lib/db/settings-service"

export const runtime = "nodejs"

/**
 * 获取 TTS 模型列表（代理 UnifiedTTS /api/v1/tools/models）
 * 仅当 providerType === "unifiedtts" 时有效。
 */
export async function GET() {
  try {
    const cfg = await getVoiceServerConfig()
    if (cfg.tts.providerType !== "unifiedtts") {
      return NextResponse.json({
        success: false,
        error: "当前 TTS 提供商不支持模型列表查询（仅 UnifiedTTS 支持）",
        models: [],
      })
    }

    const { apiKey } = await resolveVoiceApiKey(cfg.providerId, "tts")
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "API Key 未配置",
        models: [],
      })
    }

    // UnifiedTTS models 端点：从 tts.endpoint 推导 base URL
    // tts.endpoint = https://unifiedtts.com/api/v1/common/tts-sync
    // models 端点 = https://unifiedtts.com/api/v1/tools/models
    const baseUrl = cfg.tts.endpoint.replace("/common/tts-sync", "/tools/models")
    const modelsUrl = baseUrl.includes("/tools/models") ? baseUrl : "https://unifiedtts.com/api/v1/tools/models"

    const response = await fetch(modelsUrl, {
      headers: { "X-API-Key": apiKey },
    })

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `获取模型列表失败: ${response.status}`,
        models: [],
      }, { status: response.status })
    }

    const data = await response.json()
    // UnifiedTTS 返回 { success, data: ["edge-tts", ...] }
    const models: string[] = Array.isArray(data.data) ? data.data : []
    return NextResponse.json({ success: true, models })
  } catch (error) {
    console.error("[TTS/Models] Error:", error)
    return NextResponse.json({ success: false, error: "Internal server error", models: [] }, { status: 500 })
  }
}
