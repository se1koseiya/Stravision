import { NextRequest } from "next/server"
import { deleteSession, getMessages, saveMessages, type ChatMessage, type ChatContentPart, updateSessionTitle } from "../../../../lib/server/sessionStore"
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

/**
 * 落库前规范化消息内容。
 *
 * 🚨 修复（2026-10-04）：此前是 `String(m?.content ?? "")` ——
 * 带图消息的 content 是**多模态数组**（[{type:'image_url'…},{type:'text'…}]），
 * 一拍平就成了 `"[object Object],[object Object]"`。
 * 后果：刷新或切换会话后**用户上传的图全部丢失**，
 * 诊断卡追溯底图时拿到 undefined → 永远只显示文字结论。
 *
 * 现在按结构保留（图片 url 本身是 data URL，所以历史里能真正回看原图）。
 * 注意体积：data URL 会随图片大小增长，这是"历史可回看"的必要代价。
 */
function normalizeStoredContent(input: unknown): ChatMessage["content"] {
  if (typeof input === "string") return input
  if (!Array.isArray(input)) return ""
  const parts: ChatContentPart[] = []
  for (const p of input as any[]) {
    if (!p || typeof p !== "object") continue
    if (p.type === "image_url" && typeof p?.image_url?.url === "string") {
      parts.push({ type: "image_url", image_url: { url: p.image_url.url } })
    } else if (typeof p.text === "string") {
      parts.push({ type: "text", text: p.text })
    }
  }
  return parts.length > 0 ? parts : ""
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
    /**
     * 🚨 这里是消息落库的**字段白名单**：列表里没有的字段，刷新后就永久丢了。
     *
     * 踩过的坑（2026-10-16）：「摄像头快照投递」把画面作为一条 assistant 消息写进历史，
     * 标记放在 `snapshot` 上；而本白名单只保留 role/content/citations/reasoning/tasks
     * → 内存里卡片正常、**一刷新就退化成 168px 小预览**（看起来就是"图没了"），
     * 且回传上游时 `downgradeAssistantImages()` 认不出它 → 又会踩 assistant 图片 400。
     * 新增任何「渲染层/上游层要读」的自定义消息字段，都必须同步加到这里。
     */
    const messages: ChatMessage[] = raw.map((m: any) => ({
      role: m?.role === "user" ? "user" : "assistant",
      content: normalizeStoredContent(m?.content),
      citations: Array.isArray(m?.citations) ? m.citations : undefined,
      reasoning: m?.reasoning && typeof m.reasoning === "object" ? { text: String(m.reasoning.text ?? ""), durationMs: typeof m.reasoning.durationMs === "number" ? m.reasoning.durationMs : undefined } : undefined,
      tasks: Array.isArray(m?.tasks) ? m.tasks : undefined,
      snapshot:
        m?.snapshot && typeof m.snapshot === "object" && (m.snapshot.camera === "a" || m.snapshot.camera === "b")
          ? {
              camera: m.snapshot.camera,
              capturedAt: typeof m.snapshot.capturedAt === "number" ? m.snapshot.capturedAt : undefined,
            }
          : undefined,
      /**
       * 📎 文档引用（用户上传件 / AI 产物）。
       *
       * 与 snapshot 同理必须进白名单：渲染层要靠 fileId + downloadUrl 画文件行与下载卡，
       * 丢了这个字段，刷新后 AI 说"已生成，可下载"，界面上却一片空白。
       * 只保留渲染必需的字段（含 downloadUrl），避免把任意客户端对象写进库。
       */
      documents: Array.isArray(m?.documents)
        ? m.documents
            .filter((d: any) => d && typeof d.fileId === "string" && d.fileId.length >= 32)
            .slice(0, 12)
            .map((d: any) => ({
              fileId: String(d.fileId),
              fileName: String(d.fileName || "未命名文件").slice(0, 200),
              format: String(d.format || "bin").toLowerCase().slice(0, 10),
              sizeText: typeof d.sizeText === "string" ? d.sizeText.slice(0, 32) : undefined,
              downloadUrl: typeof d.downloadUrl === "string" && d.downloadUrl.startsWith("/api/documents/")
                ? d.downloadUrl
                : undefined,
              origin:
                d.origin === "generated" || d.origin === "edited" || d.origin === "uploaded"
                  ? d.origin
                  : undefined,
            }))
        : undefined,
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
