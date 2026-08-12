import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { OrganizationService } from "@/lib/db/organization-service"

interface RouteCtx {
  params: Promise<{ id: string }>
}

/**
 * POST /api/organizations/[id]/sync-friends
 * 将组织内所有成员（除自己外）与当前用户建立双向 friends 关系
 *
 * 用于：用户查看组织详情时自动把组织成员加入通讯录，使其可直达 /chat 发消息。
 * 任何登录用户均可调用（不限于 admin），因为只是建立自己的 friends 关系。
 */
export async function POST(_req: NextRequest, { params }: RouteCtx) {
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

    const result = await OrganizationService.ensureMembersAsFriends(orgId, user.id)
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
    console.error("[api/organizations/[id]/sync-friends] POST error:", error)
    return NextResponse.json({ error: "同步通讯录失败" }, { status: 500 })
  }
}
