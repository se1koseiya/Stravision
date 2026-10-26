import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { initDB } from "@/lib/db/database"
import {
  checkLicenseUsable,
  countActiveActivations,
  getActivation,
  getLicenseByCode,
  isWellFormedCode,
  licenseLeaseClaims,
  normalizeCode,
  registerActivation,
} from "@/lib/db/desktop-license-service"
import { signLease } from "@/lib/desktop-license-lease"
import { getClientIp, rateLimit } from "@/lib/rate-limit"

/**
 * 桌面端激活：提交授权码 + 设备指纹，换取一张签名租约。
 *
 * 公开路由（桌面端未登录时就要能调），因此防护靠：
 *   1. 授权码格式校验（Crockford Base32，80 bit 随机性）；
 *   2. 按 IP 限流，防在线爆破；
 *   3. 统一的失败文案，不区分"码不存在 / 已吊销 / 已过期"以外的细节。
 */

const bodySchema = z.object({
  code: z.string().trim().min(1, "请填写授权码").max(64),
  deviceId: z.string().trim().min(8, "设备指纹非法").max(128),
  deviceName: z.string().trim().max(120).optional().default(""),
  platform: z.string().trim().max(60).optional().default(""),
  appVersion: z.string().trim().max(32).optional().default(""),
})

/** 授权码当前是否可用（与心跳共用同一判定口径） */
export async function POST(req: NextRequest) {
  // 授权码是低熵输入，必须限流：同一 IP 每分钟 10 次
  const limited = rateLimit(req, { limit: 10, windowMs: 60 * 1000 })
  if (!limited.success) {
    return NextResponse.json({ ok: false, error: "请求过于频繁，请稍后再试" }, { status: 429 })
  }

  try {
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0].message }, { status: 400 })
    }
    const { deviceId, deviceName, platform, appVersion } = parsed.data
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
    // 离线码是「签给某一台指定设备」的，不该被别的机器拿去联网激活占名额
    if (license.kind === "offline") {
      return NextResponse.json(
        { ok: false, error: "该凭据为离线授权，请在激活界面使用「离线授权串」方式导入" },
        { status: 403 }
      )
    }

    const ip = getClientIp(req)
    const existing = await getActivation(license.id, deviceId)
    if (!existing) {
      const used = await countActiveActivations(license.id)
      if (used >= license.maxActivations) {
        return NextResponse.json(
          { ok: false, error: `该授权码已达到激活上限（${license.maxActivations} 台），请先在后台解绑旧设备` },
          { status: 403 }
        )
      }
    }

    const activation = await registerActivation({
      licenseId: license.id,
      deviceId,
      deviceName,
      platform,
      appVersion,
      ip,
    })

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
      activation: { deviceId: activation.deviceId, activatedAt: activation.activatedAt },
    })
  } catch (error) {
    console.error("[license/activate] 激活失败:", error)
    return NextResponse.json({ ok: false, error: "服务器繁忙，请稍后再试" }, { status: 500 })
  }
}
