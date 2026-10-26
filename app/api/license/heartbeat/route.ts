import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { initDB } from "@/lib/db/database"
import {
  checkLicenseUsable,
  getActivation,
  getLicenseByCode,
  isWellFormedCode,
  licenseLeaseClaims,
  normalizeCode,
  touchActivation,
} from "@/lib/db/desktop-license-service"
import { signLease } from "@/lib/desktop-license-lease"
import { getClientIp, rateLimit } from "@/lib/rate-limit"

/**
 * 桌面端心跳：确认授权仍然有效，并换发最新租约。
 *
 * 桌面端每次启动 + 每 6 小时调一次。它承担三件事：
 *   1. 让后台改的到期时间 / 吊销状态**尽快生效**（否则客户端只能靠租约里的旧 exp）；
 *   2. 刷新 last_seen_at，后台由此知道哪台设备还在用；
 *   3. 换发新租约，延长/缩短本地离线可用窗口。
 *
 * 失败语义（客户端据此决定"要求联网重新激活"还是"直接拒绝"）：
 *   - not_activated：本机没有该码的激活记录（被后台解绑 / 删除了）→ 需重新激活
 *   - 其余 error 文案直接展示给用户。
 */

const bodySchema = z.object({
  code: z.string().trim().min(1).max(64),
  deviceId: z.string().trim().min(8).max(128),
  appVersion: z.string().trim().max(32).optional().default(""),
})

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60 * 1000 })
  if (!limited.success) {
    return NextResponse.json({ ok: false, error: "请求过于频繁，请稍后再试" }, { status: 429 })
  }

  try {
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0].message }, { status: 400 })
    }
    const { deviceId, appVersion } = parsed.data
    const code = normalizeCode(parsed.data.code)
    if (!isWellFormedCode(code)) {
      return NextResponse.json({ ok: false, error: "授权码格式不正确" }, { status: 400 })
    }

    await initDB()

    const license = await getLicenseByCode(code)
    if (!license) {
      return NextResponse.json({ ok: false, error: "授权码不存在" }, { status: 404 })
    }
    const usable = checkLicenseUsable(license)
    if (!usable.ok) {
      return NextResponse.json({ ok: false, error: usable.reason }, { status: 403 })
    }

    const activation = await getActivation(license.id, deviceId)
    if (!activation || activation.status === "released") {
      return NextResponse.json(
        { ok: false, error: "本机尚未激活或已被解绑", reason: "not_activated" },
        { status: 403 }
      )
    }

    await touchActivation(activation.id, { ip: getClientIp(req), appVersion })

    const lease = signLease({
      v: 1,
      dev: deviceId,
      iat: Date.now(),
      ...licenseLeaseClaims(license),
    })

    return NextResponse.json({
      ok: true,
      lease,
      license: {
        code: license.code,
        label: license.label,
        kind: license.kind,
        expiresAt: license.expiresAt,
        graceDays: license.graceDays,
        maxActivations: license.maxActivations,
      },
    })
  } catch (error) {
    console.error("[license/heartbeat] 校验失败:", error)
    return NextResponse.json({ ok: false, error: "服务器繁忙，请稍后再试" }, { status: 500 })
  }
}
