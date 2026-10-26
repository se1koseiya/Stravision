import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth"
import { initDB } from "@/lib/db/database"
import {
  checkLicenseUsable,
  createLicense,
  deleteLicense,
  getLicenseById,
  licenseLeaseClaims,
  listActivations,
  listLicenses,
  registerActivation,
  revokeActivations,
  updateLicense,
} from "@/lib/db/desktop-license-service"
import { signLease } from "@/lib/desktop-license-lease"

/**
 * 管理后台 · 桌面端授权码。
 *
 * 这是"一个码能用多久"的唯一操作面：
 *   - POST   签发新码（可指定到期日 / 有效期天数 / 永久；kind=offline 时直接产出离线授权串）
 *   - PATCH  改到期日、在原到期日基础上续期、置为永久、吊销、改备注、改激活台数、改离线宽限天数
 *   - DELETE 删除（连带清掉激活记录）
 *   - GET    列表（?withActivations=1 时一并返回每码的激活设备，供展开行使用）
 */

const DAY = 24 * 60 * 60 * 1000

async function requireAdmin() {
  const currentUser = await getCurrentUser()
  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super_admin")) {
    return null
  }
  return currentUser
}

const createSchema = z
  .object({
    label: z.string().trim().max(120, "备注过长").optional().default(""),
    maxActivations: z.number().int().min(1, "至少 1 台").max(999, "最多 999 台").optional().default(1),
    /** 到期时间（毫秒时间戳） */
    expiresAt: z.number().int().positive().nullable().optional(),
    /** 有效期天数（从现在起算），与 expiresAt 二选一 */
    durationDays: z.number().int().min(1).max(36500).optional(),
    permanent: z.boolean().optional(),
    /** 离线宽限天数（写进租约的 gd）；不传 = 默认 7 天 */
    graceDays: z.number().int().min(1).max(36500).optional(),
    /** online（默认）= 常规联网授权码；offline = 直接签发离线授权串 */
    kind: z.enum(["online", "offline"]).optional().default("online"),
    /** kind=offline 时必填：目标设备的指纹（客户端激活界面可复制） */
    deviceId: z.string().trim().min(8, "设备指纹非法").max(128).optional(),
    deviceName: z.string().trim().max(120).optional().default(""),
  })
  .refine((v) => v.permanent !== undefined || v.expiresAt !== undefined || v.durationDays !== undefined, {
    message: "请指定有效期",
  })
  .refine((v) => v.kind !== "offline" || !!v.deviceId, {
    message: "离线授权必须提供目标设备指纹",
  })

const updateSchema = z
  .object({
    id: z.number().int().positive(),
    label: z.string().trim().max(120, "备注过长").optional(),
    status: z.enum(["active", "revoked"]).optional(),
    maxActivations: z.number().int().min(1).max(999).optional(),
    /** 直接指定新到期时间 */
    expiresAt: z.number().int().positive().nullable().optional(),
    /** 从现在起 N 天（重置有效期） */
    durationDays: z.number().int().min(1).max(36500).optional(),
    /** 在当前到期日基础上延长 N 天（续期；已过期则从今天起算） */
    extendDays: z.number().int().min(1).max(36500).optional(),
    permanent: z.boolean().optional(),
    /** 离线宽限天数；null = 恢复默认 */
    graceDays: z.number().int().min(1).max(36500).nullable().optional(),
  })
  .refine((v) => v.permanent !== true || (v.expiresAt === undefined && v.durationDays === undefined && v.extendDays === undefined), {
    message: "置为永久时不能同时指定到期日或天数",
  })

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  try {
    await initDB()
    const licenses = await listLicenses()
    const withActivations = new URL(req.url).searchParams.get("withActivations") === "1"
    if (!withActivations) {
      return NextResponse.json({ licenses })
    }
    const activations = await Promise.all(
      licenses.map(async (l) => ({ licenseId: l.id, items: await listActivations(l.id) }))
    )
    return NextResponse.json({
      licenses,
      activations: Object.fromEntries(activations.map((a) => [String(a.licenseId), a.items])),
    })
  } catch (error) {
    console.error("[admin/desktop-licenses] 列表失败:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  try {
    const parsed = createSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    const { label, maxActivations, expiresAt, durationDays, permanent, graceDays, kind, deviceId, deviceName } = parsed.data

    await initDB()

    let resolvedExpiry: number | null
    if (permanent) resolvedExpiry = null
    else if (expiresAt !== undefined) resolvedExpiry = expiresAt
    else resolvedExpiry = Date.now() + (durationDays as number) * DAY

    const license = await createLicense({
      label,
      maxActivations,
      expiresAt: resolvedExpiry,
      graceDays,
      kind,
      createdBy: admin.id,
    })

    if (kind === "offline") {
      // 离线码：直接登记目标设备 + 现签一张租约给管理员带走，客户端粘贴即用，不联网。
      await registerActivation({
        licenseId: license.id,
        deviceId: deviceId as string,
        deviceName: deviceName || "离线预登记设备",
        platform: "offline",
        appVersion: "",
        ip: "offline",
      })
      const lease = signLease({
        v: 1,
        dev: deviceId as string,
        iat: Date.now(),
        ...licenseLeaseClaims(license),
      })
      return NextResponse.json({ license, offline: { lease, deviceId, code: license.code } })
    }

    return NextResponse.json({ license })
  } catch (error) {
    console.error("[admin/desktop-licenses] 签发失败:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  try {
    const parsed = updateSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    const { id, label, status, maxActivations, expiresAt, durationDays, extendDays, permanent, graceDays } = parsed.data

    await initDB()

    const current = await getLicenseById(id)
    if (!current) return NextResponse.json({ error: "授权码不存在" }, { status: 404 })

    // 到期时间的四种写法：永久 / 指定时刻 / 从现在起 N 天 / 原到期日顺延 N 天
    let resolvedExpiry: number | null | undefined
    if (permanent === true) {
      resolvedExpiry = null
    } else if (expiresAt !== undefined) {
      resolvedExpiry = expiresAt
    } else if (durationDays !== undefined) {
      resolvedExpiry = Date.now() + durationDays * DAY
    } else if (extendDays !== undefined) {
      const base = Math.max(Date.now(), current.expiresAt ?? Date.now())
      resolvedExpiry = base + extendDays * DAY
    }

    const license = await updateLicense(id, {
      label,
      status,
      maxActivations,
      expiresAt: resolvedExpiry,
      graceDays,
    })
    if (!license) return NextResponse.json({ error: "授权码不存在" }, { status: 404 })

    // 吊销时连带标记其下设备，后台列表一眼能看出"已停用"
    if (status === "revoked") await revokeActivations(id)

    return NextResponse.json({ license, usable: checkLicenseUsable(license) })
  } catch (error) {
    console.error("[admin/desktop-licenses] 更新失败:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  try {
    const id = Number(new URL(req.url).searchParams.get("id"))
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "无效的 ID" }, { status: 400 })
    }
    await initDB()
    const ok = await deleteLicense(id)
    if (!ok) return NextResponse.json({ error: "授权码不存在" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[admin/desktop-licenses] 删除失败:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
