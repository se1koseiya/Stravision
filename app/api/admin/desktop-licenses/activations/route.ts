import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth"
import { initDB } from "@/lib/db/database"
import { listActivations, releaseActivation } from "@/lib/db/desktop-license-service"

/**
 * 管理后台 · 授权码的激活设备。
 *
 * GET  ?licenseId=   查看某码已绑定的设备（含最后活跃时间）
 * POST { activationId } 解绑某台设备 → 空出激活名额，该设备下次启动需重新激活
 */

async function requireAdmin() {
  const currentUser = await getCurrentUser()
  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super_admin")) {
    return null
  }
  return currentUser
}

const releaseSchema = z.object({
  activationId: z.number().int().positive(),
})

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  try {
    const licenseId = Number(new URL(req.url).searchParams.get("licenseId"))
    if (!Number.isFinite(licenseId) || licenseId <= 0) {
      return NextResponse.json({ error: "无效的 licenseId" }, { status: 400 })
    }
    await initDB()
    const activations = await listActivations(licenseId)
    return NextResponse.json({ activations })
  } catch (error) {
    console.error("[admin/desktop-licenses/activations] 查询失败:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  try {
    const parsed = releaseSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    await initDB()
    const ok = await releaseActivation(parsed.data.activationId)
    if (!ok) return NextResponse.json({ error: "激活记录不存在" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[admin/desktop-licenses/activations] 解绑失败:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
