import { getCurrentUser } from "@/lib/auth"
import { ChatService } from "@/lib/db/chat-service"
import { NextResponse } from "next/server"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const groups = await ChatService.getUserGroups(user.id)
    return NextResponse.json({ groups })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { name, members } = await req.json()
    if (!name) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 })
    }

    const result = await ChatService.createGroup(user.id, name, members || [])
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({ message: result.message, groupId: result.groupId })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 })
  }
}
