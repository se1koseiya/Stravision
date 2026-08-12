import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { OrganizationService } from "@/lib/db/organization-service"

interface RouteCtx {
  params: Promise<{ id: string }>
}

/**
 * GET /api/organizations/[id]
 * 获取单个组织节点（含成员、子组织）
 */
export async function GET(_req: NextRequest, { params }: RouteCtx) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    const { id } = await params
    const orgId = Number(id)
    if (Number.isNaN(orgId) || orgId <= 0) {
      return NextResponse.json({ error: "无效的组织 ID" }, { status: 400 })
    }

    const [organization, members] = await Promise.all([
      OrganizationService.getOrganization(orgId),
      OrganizationService.listMembers(orgId)
    ])

    if (!organization) {
      return NextResponse.json({ error: "组织不存在" }, { status: 404 })
    }

    return NextResponse.json({ organization, members })
  } catch (error) {
    console.error("[api/organizations/[id]] GET error:", error)
    return NextResponse.json({ error: "获取组织详情失败" }, { status: 500 })
  }
}

/**
 * PATCH /api/organizations/[id]
 * 更新组织节点基本信息（仅 admin/super_admin）
 *
 * Body: { name?: string, parentId?: number|null, description?: string|null }
 */
export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    if (user.role !== "admin" && user.role !== "super_admin") {
      return NextResponse.json(
        { error: "没有权限修改组织架构" },
        { status: 403 }
      )
    }

    const { id } = await params
    const orgId = Number(id)
    if (Number.isNaN(orgId) || orgId <= 0) {
      return NextResponse.json({ error: "无效的组织 ID" }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const input: {
      name?: string
      parentId?: number | null
      description?: string | null
    } = {}

    if (typeof body.name === "string") input.name = body.name
    if (body.parentId === null) {
      input.parentId = null
    } else if (typeof body.parentId === "number") {
      input.parentId = body.parentId
    } else if (typeof body.parentId === "string" && body.parentId) {
      const parsed = Number(body.parentId)
      if (!Number.isNaN(parsed)) input.parentId = parsed
    }
    if (typeof body.description === "string" || body.description === null) {
      input.description = body.description
    }

    const result = await OrganizationService.updateOrganization(orgId, input)
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: result.message })
  } catch (error) {
    console.error("[api/organizations/[id]] PATCH error:", error)
    return NextResponse.json({ error: "更新组织失败" }, { status: 500 })
  }
}

/**
 * DELETE /api/organizations/[id]
 * 删除组织节点（连同子组织和成员关系一并删除）
 * 仅 admin/super_admin 可操作
 */
export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    if (user.role !== "admin" && user.role !== "super_admin") {
      return NextResponse.json(
        { error: "没有权限删除组织架构" },
        { status: 403 }
      )
    }

    const { id } = await params
    const orgId = Number(id)
    if (Number.isNaN(orgId) || orgId <= 0) {
      return NextResponse.json({ error: "无效的组织 ID" }, { status: 400 })
    }

    const result = await OrganizationService.deleteOrganization(orgId)
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: result.message })
  } catch (error) {
    console.error("[api/organizations/[id]] DELETE error:", error)
    return NextResponse.json({ error: "删除组织失败" }, { status: 500 })
  }
}
