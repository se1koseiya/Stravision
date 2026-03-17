import { getCurrentUser } from "@/lib/auth"
import { ChatService } from "@/lib/db/chat-service"
import { NextResponse } from "next/server"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const friends = await ChatService.getFriends(user.id)
    return NextResponse.json({ friends })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch friends" }, { status: 500 })
  }
}
