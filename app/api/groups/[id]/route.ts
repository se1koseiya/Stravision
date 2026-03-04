import { getCurrentUser } from "@/lib/auth"
import { ChatService } from "@/lib/db/chat-service"
import { NextResponse } from "next/server"

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const groupId = parseInt(id)

  if (isNaN(groupId)) {
    return NextResponse.json({ error: "Invalid Group ID" }, { status: 400 })
  }

  try {
    const result = await ChatService.deleteGroup(groupId, user.id)
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 403 })
    }
    return NextResponse.json({ message: result.message })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 })
  }
}
