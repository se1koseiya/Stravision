import { NextResponse } from "next/server"
import { getPublicVoiceConfig } from "@/lib/db/settings-service"

export const runtime = "nodejs"
export const revalidate = 10 // 10 秒缓存，配置更新后最多 10 秒生效

/**
 * 公开语音配置接口（脱敏）
 * 返回前端运行所需的架构模式、TTS/ASR 参数、VAD 参数。
 * API Key 仅返回是否已配置标志，不暴露密钥本身。
 */
export async function GET() {
  try {
    const config = await getPublicVoiceConfig()
    return NextResponse.json(config, {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
      },
    })
  } catch (error) {
    console.error("Failed to fetch public voice config:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
