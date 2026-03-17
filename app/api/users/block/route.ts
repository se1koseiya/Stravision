import { getCurrentUser } from "@/lib/auth"
import { ChatService } from "@/lib/db/chat-service"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { friendId, block } = await req.json()
    if (!friendId || block === undefined) {
      return NextResponse.json({ error: "Friend ID and block status are required" }, { status: 400 })
    }

    const result = await ChatService.toggleBlockUser(user.id, friendId, block)
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({ message: result.message })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update block status" }, { status: 500 })
  }
}
