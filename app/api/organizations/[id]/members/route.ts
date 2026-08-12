import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { OrganizationService } from "@/lib/db/organization-service"

interface RouteCtx {
  params: Promise<{ id: string }>
}

/**
 * POST /api/organizations/[id]/members
 * 邀请成员加入组织（仅 admin/super_admin）
 *
 * 副作用：自动授予 deviceControl + 建立 inviter↔invitee 双向 friends
 *
 * Body: { email: string, role?: 'member'|'admin' }
 */
export async function POST(req: NextRequest, { params }: RouteCtx) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 })
    }

    if (user.role !== "admin" && user.role !== "super_admin") {
      return NextResponse.json(
        { error: "没有权限邀请成员（仅管理员可操作）" },
        { status: 403 }
      )
    }

    const { id } = await params
    const orgId = Number(id)
    if (Number.isNaN(orgId) || orgId <= 0) {
      return NextResponse.json({ error: "无效的组织 ID" }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const email = typeof body.email === "string" ? body.email.trim() : ""
    if (!email) {
      return NextResponse.json({ error: "请输入邮箱地址" }, { status: 400 })
    }

    const role =
      body.role === "admin" || body.role === "owner"
        ? body.role
        : "member"

    const result = await OrganizationService.inviteMember({
      orgId,
      email,
      inviterId: user.id,
      role
    })

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json(
      { success: true, message: result.message, userId: result.userId },
      { status: 201 }
    )
  } catch (error) {
    console.error("[api/organizations/[id]/members] POST error:", error)
    return NextResponse.json({ error: "邀请成员失败" }, { status: 500 })
  }
}
