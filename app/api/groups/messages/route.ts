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
    const messages = await ChatService.getMessages(user.id, parseInt(groupId), true)
    return NextResponse.json({ messages })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { groupId, content, type, fileUrl } = await req.json()
    if (!groupId || !content) {
      return NextResponse.json({ error: "Group ID and content are required" }, { status: 400 })
    }

    const result = await ChatService.sendMessage(user.id, null, content, type || 'text', fileUrl, parseInt(groupId))
    
    if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ message: result.message })
  } catch (error) {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}
