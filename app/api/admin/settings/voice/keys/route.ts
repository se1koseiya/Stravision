import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getVoiceKeyStatus, saveVoiceApiKey } from "@/lib/db/settings-service"
import { z } from "zod"

/**
 * 语音模块独立 API Key 安全管理接口
 *
 * GET  /api/admin/settings/voice/keys        → 获取 TTS & ASR & Omni key 脱敏状态
 * POST /api/admin/settings/voice/keys        → 保存/更新 key（明文写入，后端加密存储）
 * DELETE /api/admin/settings/voice/keys?scope=tts → 清除指定 key
 *
 * 安全策略：
 * - 仅 admin/super_admin 可访问
 * - GET 永不返回明文，仅返回 { configured, masked }
 * - POST 接受明文 → 服务端 AES-256-GCM 加密后存储
 * - 明文不会出现在任何日志或响应中
 */

async function checkAdmin() {
  const currentUser = await getCurrentUser()
  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super_admin")) {
    return null
  }
  return currentUser
}

/** GET：返回脱敏状态 */
export async function GET(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  try {
    const [tts, asr, omni] = await Promise.all([
      getVoiceKeyStatus("tts"),
      getVoiceKeyStatus("asr"),
      getVoiceKeyStatus("omni"),
    ])
    return NextResponse.json({ tts, asr, omni })
  } catch (error) {
    console.error("[VoiceKeys] GET error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

const saveKeySchema = z.object({
  scope: z.enum(["tts", "asr", "omni"]),
  apiKey: z.string().min(1, "API Key 不能为空"),
})

/** POST：保存/更新 key（明文 → 加密存储） */
export async function POST(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  try {
    const body = await req.json()
    const result = saveKeySchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { scope, apiKey } = result.data
    await saveVoiceApiKey(scope, apiKey)

    // 返回脱敏状态（不返回明文）
    const status = await getVoiceKeyStatus(scope)
    console.log(`[VoiceKeys] ${scope} key updated by user ${user.id}`)
    return NextResponse.json({ success: true, scope, ...status })
  } catch (error) {
    console.error("[VoiceKeys] POST error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

/** DELETE：清除 key（?scope=tts|asr|omni） */
export async function DELETE(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  try {
    const scope = req.nextUrl.searchParams.get("scope")
    if (scope !== "tts" && scope !== "asr" && scope !== "omni") {
      return NextResponse.json({ error: "scope 参数必须为 tts、asr 或 omni" }, { status: 400 })
    }

    await saveVoiceApiKey(scope, "")
    console.log(`[VoiceKeys] ${scope} key cleared by user ${user.id}`)
    return NextResponse.json({ success: true, scope, configured: false, masked: "" })
  } catch (error) {
    console.error("[VoiceKeys] DELETE error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
