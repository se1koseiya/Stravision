import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { OrganizationService } from "@/lib/db/organization-service"

interface RouteCtx {
  params: Promise<{ id: string }>
}

/**
 * POST /api/organizations/[id]/sync-members
 * 把当前 monitor 页面所有大棚成员回填到指定组织节点（仅 admin/super_admin）
 *
 * 用于一次性数据整合：monitor 成员 → 组织架构
 */
export async function POST(_req: NextRequest, { params }: RouteCtx) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    if (user.role !== "admin" && user.role !== "super_admin") {
      return NextResponse.json(
        { error: "没有权限同步成员（仅管理员可操作）" },
        { status: 403 }
      )
    }

    const { id } = await params
    const orgId = Number(id)
    if (Number.isNaN(orgId) || orgId <= 0) {
      return NextResponse.json({ error: "无效的组织 ID" }, { status: 400 })
    }

    const result = await OrganizationService.syncExistingGreenhouseMembers(orgId, user.id)
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      added: result.added,
      skipped: result.skipped
    })
  } catch (error) {
    console.error("[api/organizations/[id]/sync-members] POST error:", error)
    return NextResponse.json({ error: "同步成员失败" }, { status: 500 })
  }
}
