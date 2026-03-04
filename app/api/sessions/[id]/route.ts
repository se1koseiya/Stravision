import { NextRequest } from "next/server"
import { deleteSession, getMessages, saveMessages, ChatMessage, updateSessionTitle } from "../../../../lib/server/sessionStore"
import { getCurrentUser } from "@/lib/auth"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const messages = await getMessages(id, user.id)
    
    if (messages === null) {
      return Response.json({ error: "Session not found or unauthorized" }, { status: 404 })
    }

    return Response.json({ messages })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const raw = Array.isArray(body?.messages) ? body.messages : []
    const messages: ChatMessage[] = raw.map((m: any) => ({
      role: m?.role === "user" ? "user" : "assistant",
      content: String(m?.content ?? ""),
      citations: Array.isArray(m?.citations) ? m.citations : undefined,
      reasoning: m?.reasoning && typeof m.reasoning === "object" ? { text: String(m.reasoning.text ?? ""), durationMs: typeof m.reasoning.durationMs === "number" ? m.reasoning.durationMs : undefined } : undefined,
      tasks: Array.isArray(m?.tasks) ? m.tasks : undefined,
    }))
    await saveMessages(id, messages, user.id)
    return Response.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes("Unauthorized")) {
      return Response.json({ error: msg }, { status: 403 })
    }
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    await deleteSession(id, user.id)
    return Response.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes("Unauthorized")) {
      return Response.json({ error: msg }, { status: 403 })
    }
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const title = typeof body?.title === "string" ? body.title : ""
    await updateSessionTitle(id, title, user.id)
    return Response.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes("Unauthorized")) {
      return Response.json({ error: msg }, { status: 403 })
    }
    return Response.json({ error: msg }, { status: 500 })
  }
}
