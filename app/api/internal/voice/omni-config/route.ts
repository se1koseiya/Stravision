import { NextRequest, NextResponse } from "next/server"
import { getInternalApiSecret } from "@/lib/constants"
import { getVoiceServerConfig, resolveVoiceApiKey } from "@/lib/db/settings-service"

export const dynamic = "force-dynamic"

/**
 * 内部接口：供独立 WS 服务（server/ws-server.js）拉取 Omni 架构运行时配置。
 * 通过 x-internal-secret 鉴权，防止外部访问。
 * 返回明文 API Key（仅限同机内部服务调用，不出公网）。
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret")
  if (secret !== getInternalApiSecret()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const cfg = await getVoiceServerConfig()
    const { apiKey, providerName, source } = await resolveVoiceApiKey(cfg.providerId, "omni")
    return NextResponse.json({
      endpoint: cfg.omni.endpoint,
      model: cfg.omni.model,
      voice: cfg.omni.voice,
      apiKey,
      keySource: providerName,
      keySourceKind: source,
    })
  } catch (error) {
    console.error("[Internal OmniConfig] error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
