import { getCurrentUser } from "@/lib/auth"
import { ChatService } from "@/lib/db/chat-service"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { friendId } = await req.json()
    if (!friendId) {
      return NextResponse.json({ error: "Friend ID is required" }, { status: 400 })
    }

    const result = await ChatService.clearMessages(user.id, friendId)

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({ message: result.message })
  } catch (error) {
    return NextResponse.json({ error: "Failed to clear messages" }, { status: 500 })
  }
}
