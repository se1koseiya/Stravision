import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { OrganizationService } from "@/lib/db/organization-service"

/**
 * GET /api/organizations
 * 列出全部组织节点（任何登录用户都可查看）
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const organizations = await OrganizationService.listOrganizations()
    return NextResponse.json({ organizations })
  } catch (error) {
    console.error("[api/organizations] GET error:", error)
    return NextResponse.json({ error: "获取组织列表失败" }, { status: 500 })
  }
}

/**
 * POST /api/organizations
 * 创建组织节点（仅 admin/super_admin）
 *
 * Body: { name: string, parentId?: number|null, description?: string }
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    // 权限验证：仅管理员可以创建组织架构
    if (user.role !== "admin" && user.role !== "super_admin") {
      return NextResponse.json(
        { error: "没有权限创建组织架构（仅管理员可操作）" },
        { status: 403 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const name = typeof body.name === "string" ? body.name : ""
    const parentId =
      body.parentId === null || body.parentId === undefined
        ? null
        : Number(body.parentId)
    const description =
      typeof body.description === "string" ? body.description : null

    if (!name.trim()) {
      return NextResponse.json({ error: "组织名称不能为空" }, { status: 400 })
    }
    if (parentId !== null && (Number.isNaN(parentId) || parentId <= 0)) {
      return NextResponse.json({ error: "无效的上级组织 ID" }, { status: 400 })
    }

    const result = await OrganizationService.createOrganization({
      name,
      parentId,
      ownerId: user.id,
      description
    })

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json(
      { success: true, organizationId: result.organizationId, message: result.message },
      { status: 201 }
    )
  } catch (error) {
    console.error("[api/organizations] POST error:", error)
    return NextResponse.json({ error: "创建组织失败" }, { status: 500 })
  }
}
