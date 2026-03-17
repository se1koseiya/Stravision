import { NextRequest } from "next/server"
import { createSession, listSessions } from "../../../lib/server/sessionStore"
import { getCurrentUser } from "@/lib/auth"

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const sessions = await listSessions(user.id)
    return Response.json({ sessions })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    let title = "新会话"
    try {
      const body = await req.json()
      if (body && typeof body.title === "string" && body.title.trim()) title = body.title.trim()
    } catch {}
    const session = await createSession(title, user.id)
    return Response.json(session)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}
