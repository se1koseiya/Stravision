import { getCurrentUser } from "@/lib/auth"
import { ChatService } from "@/lib/db/chat-service"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const since = searchParams.get('since')
  const timestamp = since ? parseInt(since) : Date.now()

  try {
    const messages = await ChatService.getNewMessagesForUser(user.id, timestamp)
    return NextResponse.json({ messages, timestamp: Date.now() })
  } catch (error) {
    return NextResponse.json({ error: "Failed to check messages" }, { status: 500 })
  }
}
