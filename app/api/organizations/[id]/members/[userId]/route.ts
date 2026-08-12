import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { OrganizationService } from "@/lib/db/organization-service"

interface RouteCtx {
  params: Promise<{ id: string; userId: string }>
}

/**
 * DELETE /api/organizations/[id]/members/[userId]
 * 从组织移除成员（仅 admin/super_admin）
 *
 * 副作用：若该用户在所有组织都不再存在，撤销其 deviceControl（不再是大棚成员）
 */
export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    if (user.role !== "admin" && user.role !== "super_admin") {
      return NextResponse.json(
        { error: "没有权限移除成员（仅管理员可操作）" },
        { status: 403 }
      )
    }

    const { id, userId } = await params
    const orgId = Number(id)
    const targetUserId = Number(userId)
    if (Number.isNaN(orgId) || orgId <= 0) {
      return NextResponse.json({ error: "无效的组织 ID" }, { status: 400 })
    }
    if (Number.isNaN(targetUserId) || targetUserId <= 0) {
      return NextResponse.json({ error: "无效的用户 ID" }, { status: 400 })
    }

    const result = await OrganizationService.removeMember(orgId, targetUserId, user.id)
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: result.message })
  } catch (error) {
    console.error("[api/organizations/[id]/members/[userId]] DELETE error:", error)
    return NextResponse.json({ error: "移除成员失败" }, { status: 500 })
  }
}
