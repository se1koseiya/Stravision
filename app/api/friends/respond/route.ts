import { getCurrentUser } from "@/lib/auth"
import { ChatService } from "@/lib/db/chat-service"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { requestId, action } = await req.json()
    if (!requestId || !action) {
      return NextResponse.json({ error: "Request ID and action are required" }, { status: 400 })
    }

    let result
    if (action === 'accept') {
      result = await ChatService.acceptFriendRequest(requestId, user.id)
    } else if (action === 'reject') {
      result = await ChatService.rejectFriendRequest(requestId, user.id)
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({ message: result.message })
  } catch (error) {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
