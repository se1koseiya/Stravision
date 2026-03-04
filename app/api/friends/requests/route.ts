import { getCurrentUser } from "@/lib/auth"
import { ChatService } from "@/lib/db/chat-service"
import { NextResponse } from "next/server"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const requests = await ChatService.getFriendRequests(user.id)
    return NextResponse.json({ requests })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { email, uid } = await req.json()
    const identifier = uid || email;

    if (!identifier) {
      return NextResponse.json({ error: "Email or UID is required" }, { status: 400 })
    }

    const result = await ChatService.sendFriendRequest(user.id, identifier)
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({ message: result.message })
  } catch (error) {
    return NextResponse.json({ error: "Failed to send request" }, { status: 500 })
  }
}
