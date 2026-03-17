import { getCurrentUser } from "@/lib/auth"
import { ChatService } from "@/lib/db/chat-service"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const groupId = searchParams.get('groupId')

  if (!groupId) {
    return NextResponse.json({ error: "Group ID is required" }, { status: 400 })
  }

  try {
    const members = await ChatService.getGroupMembers(parseInt(groupId))
    return NextResponse.json({ members })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { groupId, userId, action } = await req.json()
    if (!groupId || !userId || !action) {
      return NextResponse.json({ error: "Group ID, User ID and action are required" }, { status: 400 })
    }

    let result
    if (action === 'add') {
      result = await ChatService.addGroupMember(groupId, user.id, userId)
    } else if (action === 'mute') {
      result = await ChatService.toggleGroupMute(groupId, user.id, userId, true)
    } else if (action === 'unmute') {
      result = await ChatService.toggleGroupMute(groupId, user.id, userId, false)
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({ message: result.message })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const groupId = searchParams.get('groupId')
    const userId = searchParams.get('userId')

    if (!groupId || !userId) {
      return NextResponse.json({ error: "Group ID and User ID are required" }, { status: 400 })
    }

    const result = await ChatService.removeGroupMember(parseInt(groupId), user.id, parseInt(userId))

    if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 403 })
    }

    return NextResponse.json({ message: result.message })
  } catch (error) {
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 })
  }
}
