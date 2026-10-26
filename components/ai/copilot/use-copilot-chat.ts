"use client"

/**
 * useCopilotChat —— Copilot 侧栏的薄逻辑层
 *
 * 只做四件事（其余全部复用现有能力）：
 *  1. 消息 state 管理（Message 类型与 ai-assistant 完全一致）
 *  2. /api/chat 请求体构造 —— 对齐 app/ai-assistant/page.tsx 的 handleSend
 *     （模型/Key 从 localStorage "ai-settings" 读，MCP 配置读取逻辑同源）
 *  3. 精简 SSE 解析（content delta / error / tool_call / tool_result / [DONE]）
 *  4. 会话协议复用：ai-last-session-id + /api/sessions PUT 落库
 *
 * UI 层不在这里 —— ChatBubbleList / ChatSenderInput / ChatMessageRenderer
 * 直接复用 app/ai-assistant/_components 现成组件。
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "@/lib/ui/feedback"
import type { Message, ChatAttachment, DocumentRef } from "@/app/ai-assistant/types"
import type { AgentStep } from "@/app/ai-assistant/_components/agent-thought-chain"
import { getPageActionLabels } from "@/lib/ai/page-action-tools"
import { summarizeConversationTitle, fallbackConversationTitle } from "@/lib/ai/conversation-title"
import { collectDocumentRefs, mergeDocumentRefs, normalizeDocumentRefs } from "@/lib/ai/document-artifact"
import { toDocumentRefs } from "@/app/ai-assistant/_utils/upload-document"
import { PAGE_CONTEXT_KEY } from "./page-context"

const LAST_SESSION_KEY = "ai-last-session-id"

/**
 * 前端工具动效节奏（2026-09-21 用户反馈「消失得太快，还没看到就没了」）
 *
 * 背景：改画布这类前端工具执行只要 0.3~0.6s，原先「执行完再停 800ms」就到头了，
 * 整个光效寿命 ≈1.3s，肉眼只能瞥见一下。现在拆成「进行中 → 已完成」两段：
 *   亮起 → 至少保持 RUNNING_MIN（保证"正在做事"被看见）
 *        → 切「已完成」文案 → 再保持 DONE_HOLD（让用户确认结果）
 *        → 光效淡出（CanvasActivityGlow 内部还有 minVisibleMs 兜底 + 450ms 退场）
 */
const CLIENT_TOOL_RUNNING_MIN_MS = 900
const CLIENT_TOOL_DONE_HOLD_MS = 2000

/**
 * 前端工具（client tool）宿主约定
 *
 * 有些能力只能在浏览器里执行 —— 典型是「修改画布」：ReactFlow 的节点/边是编辑器本地
 * state，服务端看不到也改不了。宿主页在这里登记：① 声明自己支持的前端能力
 * ② 提供各工具的执行函数（返回结构化结果，会回灌给模型）③ 进行中文案（驱动屏幕光效）。
 */
export interface CopilotClientTools {
  /** 前端能力标识，会随请求发给 /api/chat，决定后端注入哪些前端工具 */
  capabilities: string[]
  /** 工具名 → 执行器。参数即模型给的 arguments，返回任意 JSON */
  handlers: Record<string, (args: any) => Promise<unknown> | unknown>
  /** 工具名 → 进行中文案（如「莓小智正在修改画布…」） */
  labels?: Record<string, string>
  /**
   * 工具名 → **完成**文案（如「画布已更新 · 3 处改动」）。
   * 模型执行往往只要 0.3~0.6s，若只在"进行中"停一下就消失，用户根本来不及看到，
   * 所以完成后再保持一段时间并显示这条文案，让整个动效有始有终。
   * 传字符串用固定文案；传函数可读执行结果生成动态文案（如改动处数）。
   */
  doneLabels?: Record<string, string | ((result: unknown) => string)>
  /** 该工具失败时是否用 toast 显性提示（默认 false，仅回传结果给模型） */
  toastOnError?: boolean
}

/**
 * 后端 Agent Loop 挂起等待用户输入的上下文（`user_input_required` 事件带来）
 *
 * 命中场景：模型调用 `ask_user_question` 工具、或输出 `<CHECKPOINT>` / `<CLARIFY>`。
 * 此时后端**不结束 SSE 流**，而是 await 挂起；前端把 `checkpoint_id` 记下来，
 * 用户填完表必须 POST /api/chat/respond 把答案送回**同一条流**，Agent Loop 才会继续。
 * 少了这一步，用户看到的正是「表单提交完，AI 再也没说话」。
 */
interface PendingCopilotInput {
  checkpointId: string
  type: "checkpoint" | "clarify"
  title: string
  timeoutMs: number
  startedAt: number
}

export interface UseCopilotChatOptions {
  /** 页面上下文提供器：每次发消息时实时取快照注入 systemPrompt */
  contextProvider?: () => string | null | undefined
  /** 业务页实时设备数据（对齐主页面 deviceData 注入，AI 工具链可用） */
  deviceData?: Record<string, unknown> | null
  /** 设备是否在线 */
  deviceOnline?: boolean
  /** 打开侧栏时自动恢复上次会话 */
  restoreSession?: boolean
  /** 模型覆盖（动态模型选择器选中值）；custom- 前缀模型请同步传 customModel */
  model?: string
  /** 自定义模型的凭据（选择 custom- 模型时由侧栏从 localStorage 读出传入） */
  customModel?: { apiKey?: string; apiUrl?: string; modelId?: string } | null
  /** 前端工具宿主（不传则该页不支持任何前端工具） */
  clientTools?: CopilotClientTools
}

export function useCopilotChat(options: UseCopilotChatOptions = {}) {
  const { contextProvider, deviceData, deviceOnline = true, restoreSession = true } = options

  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  /**
   * 🚨 isLoading 的**同步镜像**，所有「能不能发」的闸门判断都读它。
   *
   * 成因（本次修复的核心之一）：`send` 是 useCallback，闭包里的 `isLoading` 停在上一次
   * 渲染的值；而「等用户输入」期间 isLoading 必须保持 true（SSE 还开着），
   * 用 state 判断就会把用户的答复也一起挡掉 —— 表现就是「点提交毫无反应」。
   */
  const isLoadingRef = useRef(false)
  const applyLoading = useCallback((next: boolean) => {
    isLoadingRef.current = next
    setIsLoading(next)
  }, [])
  /**
   * 后端挂起中的用户输入请求（CHECKPOINT / CLARIFY）。
   * 有值时 = SSE 还开着、Agent Loop 在等服务端的 `user_input_received`；
   * 此期间用户的任何发送都必须走 /api/chat/respond（恢复同一条流），⛔ 不能新开一轮。
   */
  const pendingInputRef = useRef<PendingCopilotInput | null>(null)
  /** 暴露给 UI：正在等用户填表（sender 文案 / 卡片态用） */
  const [awaitingInput, setAwaitingInput] = useState(false)
  /** 本次请求里「作为答复提交」的文本，落库时补回消息序列 */
  const replyEchoRef = useRef<string[]>([])
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([])
  const [agentStatus, setAgentStatus] = useState("")
  const [sessionId, setSessionId] = useState<string | null>(null)
  /**
   * 页面流光进行中状态（驱动屏幕边缘光效 + 状态胶囊）。
   * seq 用于「后到的完成回调不要误清掉新一次调用」。
   *
   * kind 决定光效色调：
   *  - canvas = 前端工具在改画布（思维蓝紫粉，见 CanvasActivityGlow 默认色调）
   *  - device = 服务端在控制设备（电光青蓝渐变；**刻意不用品牌绿**，绿光扫在绿主场的
   *             设备页上会糊掉，用户 2026-09-25 两次反馈后定的终版）
   */
  const [clientToolActivity, setClientToolActivity] = useState<{
    name: string
    label: string
    seq: number
    /** running = 正在执行；done = 已执行完（光效还留着让用户看清结果） */
    phase: "running" | "done"
    kind: "canvas" | "device"
  } | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const sessionRef = useRef<string | null>(null)
  const activitySeqRef = useRef(0)
  /**
   * 正在执行的「页面动作」工具（服务端设备控制类）：
   *   tool_call  → 点亮流光，把工具名放进 names
   *   tool_result → 从 names 移出；全部做完才收尾（同一轮可能并行调多个设备工具）
   * 用 ref 而非 state：SSE 回调里要读写，且不需要触发重渲染。
   */
  const pageActionRef = useRef<{ seq: number; startedAt: number; names: Set<string> } | null>(null)
  const deviceDataRef = useRef(deviceData)
  deviceDataRef.current = deviceData
  const ctxRef = useRef(contextProvider)
  ctxRef.current = contextProvider
  /** 前端工具宿主：每次渲染都刷新，保证宿主页 setState 后的最新闭包被用上 */
  const clientToolsRef = useRef<CopilotClientTools | undefined>(options.clientTools)
  clientToolsRef.current = options.clientTools
  /** 最新模型选择（选择器每次切换都会变，用 ref 避免闭包旧值） */
  const modelRef = useRef<{ model?: string; custom?: { apiKey?: string; apiUrl?: string; modelId?: string } | null }>({})
  modelRef.current = { model: options.model, custom: options.customModel ?? null }

  /** 读取 AI 设置（与主助手同源：localStorage "ai-settings"） */
  const readAiSettings = useCallback(() => {
    try {
      const raw = localStorage.getItem("ai-settings")
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [])

  /**
   * 恢复上次会话（复用 ai-last-session-id 协议）
   *
   * 🚨 必须**原样保留渲染层要读的字段**（至少 `documents`）。
   *    这里曾经只取 `{ role, content }` 重建对象 —— 后果：侧栏里 AI 生成的文档卡
   *    在刷新 / 重开侧栏后集体消失（内存里明明有卡），用户会以为文件没生成。
   *    落库白名单的唯一源在服务端 `app/api/sessions/[id]/route.ts`，前端不必再筛一遍。
   */
  useEffect(() => {
    if (!restoreSession) return
    let cancelled = false
    ;(async () => {
      const stored = localStorage.getItem(LAST_SESSION_KEY)
      if (!stored) return
      try {
        const res = await fetch(`/api/sessions/${encodeURIComponent(stored)}`)
        if (!res.ok) return
        const data = await res.json()
        const rawList: unknown[] = Array.isArray(data?.messages) ? data.messages : []
        const list: Message[] = rawList
          .map((raw): Message | null => {
            if (!raw || typeof raw !== "object") return null
            const m = raw as Record<string, unknown>
            const msg: Message = {
              role: m.role === "assistant" ? "assistant" : "user",
              content: typeof m.content === "string" ? m.content : "",
            }
            // 📎 文档引用（AI 产物 / 用户上传件）—— 丢了就没有下载卡
            const docs = normalizeDocumentRefs(m.documents)
            if (docs.length) msg.documents = docs
            // 🧠 思考面板：历史消息也保留（否则重开侧栏后思考链凭空消失）
            const reasoning = m.reasoning as { text?: unknown; durationMs?: unknown } | undefined
            if (reasoning && typeof reasoning.text === "string" && reasoning.text.trim()) {
              msg.reasoning = {
                text: reasoning.text,
                durationMs: typeof reasoning.durationMs === "number" ? reasoning.durationMs : undefined,
              }
            }
            const snapshot = m.snapshot as { camera?: unknown; capturedAt?: unknown } | undefined
            if (snapshot && (snapshot.camera === "a" || snapshot.camera === "b")) {
              msg.snapshot = {
                camera: snapshot.camera,
                capturedAt: typeof snapshot.capturedAt === "number" ? snapshot.capturedAt : undefined,
              }
            }
            if (Array.isArray(m.citations) && m.citations.length) msg.citations = m.citations as Message["citations"]
            if (Array.isArray(m.tasks) && m.tasks.length) msg.tasks = m.tasks as Message["tasks"]
            return msg
          })
          .filter((m): m is Message => !!m && !m.isSilent)
        if (!cancelled && list.length) {
          setMessages(list)
          setSessionId(stored)
          sessionRef.current = stored
        }
      } catch {
        /* 静默 */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [restoreSession])

  /** 确保会话存在（首条消息时惰性创建，写回共享 key） */
  const ensureSession = useCallback(async (firstText: string): Promise<string | null> => {
    if (sessionRef.current) return sessionRef.current
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 先用截断标题占位；紧接着下面会用模型总结出正式标题（PATCH 覆盖）
        body: JSON.stringify({ title: fallbackConversationTitle(firstText, 30) }),
      })
      if (res.ok) {
        const data = await res.json()
        const id = String(data?.id ?? data?.session?.id ?? "")
        if (id) {
          sessionRef.current = id
          setSessionId(id)
          localStorage.setItem(LAST_SESSION_KEY, id)
          /* 🏷️ 对话总结（= 标题）：与 app/ai-assistant 同一条链路 —— 用**用户当前选择的模型**
             把这次意图压成一句话。工作台侧栏产生的会话同样会出现在主助手的「最近对话」列表里，
             所以标题机制必须一致，否则同一个会话在两处叫不同名字。
             刻意不 await：总结要一次模型请求，不拖慢下面的主对话。 */
          void (async () => {
            try {
              const settings = readAiSettings()
              const sel = modelRef.current
              const isCustom = !!sel.model?.startsWith("custom-")
              const model = sel.model
                ? isCustom
                  ? sel.custom?.modelId || settings?.model
                  : sel.model
                : settings?.model
              const title = await summarizeConversationTitle([{ role: "user", content: firstText }], {
                model,
                apiKey: isCustom && sel.custom?.apiKey ? sel.custom.apiKey : settings?.apiKey,
                apiUrl: isCustom && sel.custom?.apiUrl ? sel.custom.apiUrl : settings?.apiUrl,
              })
              if (!title) return
              await fetch(`/api/sessions/${encodeURIComponent(id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title }),
              })
            } catch {
              /* 标题生成失败：保留占位标题，不影响对话 */
            }
          })()
          return id
        }
      }
    } catch {
      /* 落库失败降级为内存会话 */
    }
    return null
  }, [readAiSettings])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    applyLoading(false)
    setAgentStatus("")
    pageActionRef.current = null
    setClientToolActivity(null)
    /* 流已中止 → 后端的挂起点会被 req.signal 一并 reject，本地不能再留着它 */
    pendingInputRef.current = null
    setAwaitingInput(false)
  }, [applyLoading])

  /** 新对话：清空状态（不删服务端会话） */
  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setMessages([])
    setAgentSteps([])
    setAgentStatus("")
    pageActionRef.current = null
    setClientToolActivity(null)
    applyLoading(false)
    pendingInputRef.current = null
    setAwaitingInput(false)
    replyEchoRef.current = []
    sessionRef.current = null
    setSessionId(null)
  }, [applyLoading])

  /** MCP 配置读取（与主页面同源逻辑） */
  const readMcpConfigs = useCallback(() => {
    if (localStorage.getItem("mcp-enabled") !== "true") return []
    try {
      const serverIds: string[] = JSON.parse(localStorage.getItem("mcp-installed-servers") || "[]")
      return serverIds
        .map((id: string) => {
          const configStr = localStorage.getItem(`mcp-config-${id}`)
          const enabled = localStorage.getItem(`mcp-enabled-${id}`) !== "false"
          if (configStr && enabled) {
            const config = JSON.parse(configStr)
            const apiKey = config.envVars ? Object.values(config.envVars)[0] : null
            return {
              id: config.id,
              name: config.name,
              displayName: config.displayName || config.name,
              enabled: true,
              apiKey,
              description: config.description || "",
            }
          }
          return null
        })
        .filter(Boolean)
    } catch {
      return []
    }
  }, [])

  /**
   * ===== 屏幕边缘流光的「两段式」编排（2026-09-25 抽出，画布与设备共用）=====
   * 亮起 → 至少保持 RUNNING_MIN（保证"正在做事"被看见）
   *      → 切「已完成」文案 → 再保持 DONE_HOLD（让用户确认结果）
   *      → 光效淡出（CanvasActivityGlow 内部还有 minVisibleMs 兜底 + 450ms 退场）
   */
  /** 点亮流光，返回本次调用的序号与起始时刻（收尾时要用） */
  const beginActivity = useCallback(
    (name: string, label: string, kind: "canvas" | "device") => {
      const seq = ++activitySeqRef.current
      setClientToolActivity({ name, label, seq, phase: "running", kind })
      return { seq, startedAt: Date.now() }
    },
    []
  )

  /** 收尾：补足最短可见时长 → 切 done 文案 → 保持 DONE_HOLD → 清空 */
  const endActivity = useCallback((seq: number, startedAt: number, doneLabel: string) => {
    const toDoneDelay = Math.max(0, CLIENT_TOOL_RUNNING_MIN_MS - (Date.now() - startedAt))
    setTimeout(() => {
      setClientToolActivity(prev =>
        prev && prev.seq === seq ? { ...prev, phase: "done", label: doneLabel } : prev
      )
      setTimeout(() => {
        setClientToolActivity(prev => (prev && prev.seq === seq ? null : prev))
      }, CLIENT_TOOL_DONE_HOLD_MS)
    }, toDoneDelay)
  }, [])

  /**
   * 「发送」的转发槽。
   * respondToInput 在恢复失败时要降级成「新开一轮」，而 send 定义在它后面 ——
   * 用 ref 解开这个循环依赖（不用 useEffect，避免多渲染一帧的空窗）。
   */
  const sendRef = useRef<
    ((text: string, attachments?: ChatAttachment[], opts?: { force?: boolean }) => Promise<void>) | null
  >(null)

  /**
   * 把用户答复送回**挂起中的 Agent Loop**（POST /api/chat/respond）
   *
   * 这是 Copilot 之前完全缺失的一环：澄清卡提交只会走到 onSendMessage → send()，
   * 而 send() 的 isLoading 闸门（等待期间必须为 true）直接 return，
   * 后端那条 SSE 就一直挂到 5 分钟超时 —— 用户看到的就是
   * 「需求答完了，AI 再也没有下文」。
   *
   * @param opts.echo 是否在对话流里补一条「用户气泡」。
   *   卡片提交 = false —— 澄清卡自己已经折叠成「已确认需求」摘要，再补一条会重复；
   *   输入框直接打字回答 = true —— 否则用户说完的话在界面上凭空消失（与主助手一致）。
   *
   * @returns true = 已恢复同一条流；false = 无挂起点 / 失败后降级为新对话
   */
  const respondToInput = useCallback(async (rawReply: string, opts?: { echo?: boolean }): Promise<boolean> => {
    const reply = rawReply.trim()
    if (!reply) return false
    const pending = pendingInputRef.current

    // 没有挂起点（SSE 已结束 / 已超时 / 侧栏重开过）→ 当作普通消息发出去，别让答复凭空消失
    if (!pending) {
      await sendRef.current?.(reply, undefined, { force: true })
      return false
    }

    // 先收掉挂起态：① 防连点重复 POST（第二次必然 404，会把答复重复发成新对话）
    //              ② 失败降级时 send({force:true}) 不会又绕回这里形成死循环
    pendingInputRef.current = null
    setAwaitingInput(false)
    setAgentStatus("AI 思考中…")

    try {
      const res = await fetch("/api/chat/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkpoint_id: pending.checkpointId, reply }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data?.error || `提交失败（${res.status}）`)
      }

      // 送达后才上屏（卡片提交不补气泡，见 opts.echo 说明）。
      // ⚠️ 用户气泡必须插在 AI 气泡**之前** —— AI 气泡要永远待在数组末尾，
      //    流式写入靠 `prev[len-1]` 定位（flushAssistant），插到最后会被下一段正文覆盖。
      if (opts?.echo) {
        setMessages(prev => {
          if (!prev.length) return [...prev, { role: "user", content: reply } as Message]
          const tail = prev[prev.length - 1]
          if (tail.role !== "assistant") return [...prev, { role: "user", content: reply } as Message]
          return [...prev.slice(0, -1), { role: "user", content: reply } as Message, tail]
        })
      }
      replyEchoRef.current.push(reply)
      return true
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e)
      console.warn("[Copilot] respond failed, falling back to new turn:", reason)
      toast.error("答复未送达，已作为新消息发送", { description: reason })
      await sendRef.current?.(reply, undefined, { force: true })
      return false
    }
  }, [])

  /**
   * 发送。
   *
   * `attachments` 是可选的多模态附件（截图 / 选图 → dataURL）：
   * 有附件时把用户消息的 `content` 从字符串升级为多模态数组，
   * 结构与主助手 `app/ai-assistant/page.tsx#handleSend` **对齐** ——
   * /api/chat 的多模态识别靠 `content.some(p => p.type === "image_url")` 判定，
   * 两边结构不一致就会出现「主助手能看图、侧栏看不见」的诡异差异。
   * （唯一有意的差别：无文字时不放空 text 块，见下。）
   *
   * 同时放开了「只有图、没有字」的发送（用户截完图直接发是常态）。
   */
  const send = useCallback(
    async (text: string, attachments?: ChatAttachment[], opts?: { force?: boolean }) => {
      const trimmed = text.trim()
      /* 🖼 图片：必须带 dataURL（走 image_url 多模态）；
         📎 文档：dataUrl 为空、只有 fileId —— 它们**绝不能**当图片发（上游会 400），
            而是作为 `documents` 引用随请求带上，正文由 `document_read` 按需读取。
         上传未完成的文档先不发（否则模型只能看到"有个文件"却读不到内容）。 */
      const uploading = (attachments ?? []).some(a => a.status === "uploading")
      const atts = (attachments ?? []).filter(a => (a?.dataUrl || "").startsWith("data:image/"))
      const docRefs = toDocumentRefs(attachments ?? [])
      if (!trimmed && atts.length === 0 && docRefs.length === 0) return
      if (uploading) {
        toast.info("文档还在上传", { description: "上传完成后即可发送" })
        return
      }
      /* 🔥 后端正在等用户输入 → 这段话就是给他的答复，必须走「恢复同一条流」的通道。
         ⛔ 不能新开一轮：那会让挂起的那个请求原地干等到 5 分钟超时，
         而且新一轮不带上一轮的 tool_call 上下文，模型会从头再问一遍。 */
      if (!opts?.force && pendingInputRef.current) {
        await respondToInput(trimmed || "（已收到附件）", { echo: true })
        return
      }
      if (isLoadingRef.current && !opts?.force) return

      replyEchoRef.current = []

      const userMsg: Message = {
        role: "user",
        content: atts.length
          ? [
              /* 没文字就**不放**空 text 块：上游各家对空文本块的处理不一致
                 （有的直接 400），只带 image_url 是完全合法的多模态消息。 */
              ...(trimmed ? [{ type: "text" as const, text: trimmed }] : []),
              ...atts.map(a => ({
                type: "image_url" as const,
                image_url: { url: a.dataUrl },
              })),
            ]
          : trimmed,
        // 📎 本轮用户上传的文档（对话里显示文件行，服务端据此让模型 document_read）
        ...(docRefs.length
          ? { documents: docRefs.map(d => ({ ...d, origin: "uploaded" as const })) }
          : {}),
      }
      const assistantMsg: Message = { role: "assistant", content: "" }
      const history = [...messages, userMsg]

      /**
       * 📎 本轮 AI 产出/修改的文档（`document_create` / `document_edit` 的 artifacts）。
       *
       * 与主助手 `app/ai-assistant/page.tsx#__flushDocArtifacts` 的区别：那边必须
       * 「先入队、流收尾再挂」（它的流式写入是整体重建 `messages[last]`，中途改动会被覆盖）；
       * 这里 `flushAssistant` 是 `{...assistantMsg}` 展开，documents 挂上就跟着走，
       * 所以**收到即可上屏** —— 文件生成完立刻出现下载卡，不必等模型把话说完。
       */
      const createdDocs: DocumentRef[] = []

      setMessages([...history, assistantMsg])
      applyLoading(true)
      setAgentSteps([])
      setAgentStatus("正在思考…")

      const controller = new AbortController()
      abortRef.current = controller

      // 页面上下文快照注入
      let contextBlock = ""
      try {
        const ctx = ctxRef.current?.()
        if (ctx?.trim()) contextBlock = `\n\n【当前页面实时上下文（用户刚从工作台页面进入对话）】\n${ctx.trim()}`
        else {
          // 兜底：悬浮球跳转时写入的快照（用完即删）
          const stored = sessionStorage.getItem(PAGE_CONTEXT_KEY)
          if (stored?.trim()) {
            contextBlock = `\n\n【当前页面实时上下文（用户刚从工作台页面进入对话）】\n${stored.trim()}`
            sessionStorage.removeItem(PAGE_CONTEXT_KEY)
          }
        }
      } catch {
        /* ignore */
      }

      const aiSettings = readAiSettings()
      /* 只发图不写字也要有个标题：firstText 同时喂给兜底标题与模型总结 */
      const sid = await ensureSession(trimmed || "图片消息")

      // 模型解析优先级：选择器覆盖 > custom- 凭据 > ai-settings
      const sel = modelRef.current
      const isCustom = !!sel.model?.startsWith("custom-")
      const effectiveModel = sel.model
        ? isCustom
          ? sel.custom?.modelId || aiSettings?.model
          : sel.model
        : aiSettings?.model
      const effectiveApiKey = isCustom && sel.custom?.apiKey ? sel.custom.apiKey : aiSettings?.apiKey
      const effectiveApiUrl = isCustom && sel.custom?.apiUrl ? sel.custom.apiUrl : aiSettings?.apiUrl

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            messages: history,
            model: effectiveModel,
            apiKey: effectiveApiKey,
            apiUrl: effectiveApiUrl,
            systemPrompt:
              (aiSettings?.systemPrompt || "") + contextBlock,
            sessionId: sid ?? undefined,
            enableSearch: false,
            enableReasoning: false,
            deviceData: deviceDataRef.current ?? undefined,
            deviceOnline,
            mcpConfigs: readMcpConfigs(),
            approvalMode: "request",
            // 🔥 前端能力声明：后端据此决定是否注入「前端工具」（如 automation_canvas_apply）
            clientCapabilities: clientToolsRef.current?.capabilities ?? [],
            /* 📎 本轮附带的文档（只传引用，不传内容）：服务端据此把「有哪些文件」注入
               上下文，正文由 `document_read` 工具按需分段读取。
               与主助手 app/ai-assistant/page.tsx#handleSend 同一字段、同一语义。 */
            documents: docRefs.length ? docRefs : undefined,
          }),
        })

        if (!res.ok || !res.body) {
          const errorText = await res.text().catch(() => "")
          let errMsg = `请求失败 (${res.status})`
          try {
            const j = JSON.parse(errorText)
            errMsg = typeof j.error === "string" ? j.error : errMsg
          } catch { /* keep default */ }
          throw new Error(errMsg)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        const flushAssistant = () => {
          setMessages(prev => {
            const next = [...prev]
            next[next.length - 1] = { ...assistantMsg }
            return next
          })
        }

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            const trimmedLine = line.trim()
            if (!trimmedLine) continue
            if (trimmedLine === "data: [DONE]") {
              applyLoading(false)
              setAgentStatus("")
              pageActionRef.current = null
              setClientToolActivity(null)
              /* 流已收尾 → 不可能再有挂起点（异常路径下后端可能没补 user_input_timeout） */
              pendingInputRef.current = null
              setAwaitingInput(false)
              continue
            }
            if (!trimmedLine.startsWith("data: ")) continue

            try {
              const data = JSON.parse(trimmedLine.slice(6))

              if (data.error) {
                assistantMsg.content =
                  typeof data.error === "object"
                    ? JSON.stringify(data.error)
                    : String(data.error)
                flushAssistant()
                applyLoading(false)
                setAgentStatus("")
                pageActionRef.current = null
                setClientToolActivity(null)
                pendingInputRef.current = null
                setAwaitingInput(false)
                break
              }

              /* ============================================================
               * 🛑 HITL：后端挂起等用户输入（ask_user_question / CHECKPOINT / CLARIFY）
               *
               * 协议与主助手 app/ai-assistant/page.tsx 完全一致，三件套：
               *   user_input_required  → 记下 checkpoint_id，等用户填表
               *   user_input_received  → 答复已送达，Agent Loop 继续（清挂起态）
               *   user_input_timeout   → 5 分钟没人答，后端已退出（清挂起态 + 提示）
               *
               * ⚠️ 事件里的 checkpoint_id 才是 /api/chat/respond 的钥匙。
               *    缺了这三条分支，前端拿不到 id → 卡片提交只能走「发新消息」→
               *    被 isLoading 挡住 → 用户观感就是「回答完需求后 AI 再也不说话」。
               * ============================================================ */
              if (data.user_input_required) {
                const { type, checkpoint_id, title, timeout_ms } = data.user_input_required as {
                  type?: "checkpoint" | "clarify"
                  checkpoint_id: string
                  title?: string
                  timeout_ms?: number
                }
                if (checkpoint_id) {
                  pendingInputRef.current = {
                    checkpointId: String(checkpoint_id),
                    type: type === "clarify" ? "clarify" : "checkpoint",
                    title: title || "等待你的回复",
                    timeoutMs: timeout_ms || 5 * 60 * 1000,
                    startedAt: Date.now(),
                  }
                  setAwaitingInput(true)
                  setAgentStatus(`等待你的回复：${title || "请填写表单"}`)
                }
                continue
              }

              if (data.user_input_received) {
                pendingInputRef.current = null
                setAwaitingInput(false)
                setAgentStatus("AI 思考中…")
                continue
              }

              if (data.user_input_timeout) {
                pendingInputRef.current = null
                setAwaitingInput(false)
                setAgentStatus("")
                toast.warning("⏰ 等待超时", {
                  description: "5 分钟内未收到你的回复，本轮对话已结束。重新提问即可继续。",
                })
                continue
              }

              // 🔥 前端工具调用（如改画布）：必须在浏览器里执行 ——
              // 执行 → 回传结果给挂起的 Agent Loop → 屏幕边缘光效在此期间保持点亮。
              if (data.client_tool_call?.id) {
                const ct = data.client_tool_call as {
                  id: string
                  name: string
                  arguments?: Record<string, unknown>
                }
                const host = clientToolsRef.current
                const label = host?.labels?.[ct.name] || `莓小智正在执行 ${ct.name}…`
                const { seq, startedAt } = beginActivity(ct.name, label, "canvas")

                setAgentStatus(label)
                setAgentSteps(prev => [
                  ...prev,
                  {
                    id: `ct-${ct.id}`,
                    kind: "task",
                    status: "active",
                    toolName: ct.name,
                    title: ct.name,
                    startedAt: Date.now(),
                  },
                ])

                let result: unknown
                let failed = false
                try {
                  const handler = host?.handlers?.[ct.name]
                  result = handler
                    ? await handler(ct.arguments ?? {})
                    : { success: false, error: `当前页面未提供 ${ct.name} 的执行器` }
                } catch (e) {
                  result = { success: false, error: e instanceof Error ? e.message : String(e) }
                  failed = true
                  if (host?.toastOnError) toast.error(`${ct.name} 执行失败`)
                }

                // 回传结果（Agent Loop 在等这个；失败也不阻断，服务端有超时兜底）
                try {
                  await fetch("/api/chat/client-tool-result", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ client_tool_id: ct.id, result }),
                  })
                } catch {
                  /* 网络异常：交给服务端超时处理 */
                }

                setAgentSteps(prev => {
                  const idx = prev.findIndex(
                    s => s.kind === "task" && s.toolName === ct.name && s.status === "active"
                  )
                  if (idx === -1) return prev
                  const next = [...prev]
                  next[idx] = {
                    ...next[idx],
                    status: (result as { success?: boolean } | null)?.success === false ? "error" : "completed",
                    duration: Date.now() - (next[idx].startedAt || Date.now()),
                  }
                  return next
                })
                setAgentStatus("")

                // ⏱ 两段式收尾（用户反馈「消失得太快」）：
                // ① 先把「进行中」补足到最短可感知时长 —— 模型执行常常只要 0.3~0.6s，不补足就是闪一下
                // ② 再切「已完成」文案并保持 DONE_HOLD，让用户确认结果后光效才淡出
                // 只拉伸视觉节奏，**不影响回传时序**（上面的 POST 已经发出，Agent Loop 不等这个）。
                let doneLabel = failed ? `${ct.name} 执行失败` : `${ct.name} 已完成`
                const dl = host?.doneLabels?.[ct.name]
                if (dl) {
                  try {
                    doneLabel = typeof dl === "function" ? dl(result) : dl
                  } catch {
                    /* 文案函数抛错不影响主流程 */
                  }
                }

                endActivity(seq, startedAt, doneLabel)
                continue
              }

              // 工具调用开始 → 思考链加一步
              if (data.tool_call?.name) {
                const toolName = String(data.tool_call.name)
                setAgentStatus(`正在调用 ${toolName}…`)
                setAgentSteps(prev => [
                  ...prev,
                  {
                    id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    kind: "task",
                    status: "active",
                    toolName,
                    title: toolName,
                    startedAt: Date.now(),
                  },
                ])

                /* 🔥 页面动作（设备控制类**服务端**工具）：用户当前所在的页面也要亮流光。
                   光效组件挂在当前页的 CopilotSidebar 上，所以这里点亮 = 本页全屏边缘流光。
                   同一轮可能并行调用多个设备工具 → 共用一个 seq，全部 result 回来才收尾。 */
                const pageAction = getPageActionLabels(toolName)
                if (pageAction) {
                  if (pageActionRef.current) {
                    pageActionRef.current.names.add(toolName)
                  } else {
                    const run = beginActivity(toolName, pageAction.running, "device")
                    pageActionRef.current = { ...run, names: new Set([toolName]) }
                  }
                }
                continue
              }

              // 工具结果 → 标记完成
              if (data.tool_result?.name) {
                const toolName = String(data.tool_result.name)
                const result = data.tool_result.result
                const hasError = result?.error

                /* 📎 文档产物：`document_create` / `document_edit` 的结果里带 artifacts，
                   这是渲染层画下载卡的唯一凭据（见 lib/ai/document-artifact.ts）。
                   判据只看**结果里真有 artifacts**，不按工具名硬编码 —— 将来任何产出
                   文件的工具都能自动获得下载卡。
                   🚨 漏了这段 = 侧栏里「AI 说文件已生成，对话里什么都没有」。 */
                const refs = collectDocumentRefs(result?.artifacts, createdDocs)
                if (refs.length > 0) {
                  createdDocs.push(...refs)
                  assistantMsg.documents = mergeDocumentRefs(assistantMsg.documents, refs)
                  flushAssistant()
                  console.log(`[Copilot] document artifact(s) delivered: ${refs.map(r => r.fileName).join(', ')}`)
                }

                setAgentSteps(prev => {
                  const idx = prev.findIndex(
                    s => s.kind === "task" && s.status === "active" && s.toolName === toolName
                  )
                  if (idx !== -1) {
                    const next = [...prev]
                    next[idx] = {
                      ...next[idx],
                      status: hasError ? "error" : "completed",
                      duration: Date.now() - (next[idx].startedAt || Date.now()),
                    }
                    return next
                  }
                  return prev
                })
                setAgentStatus("")

                /* 页面动作收尾：等这一轮里所有设备工具都回来，再切「已完成」并淡出 */
                const pageAction = getPageActionLabels(toolName)
                const pendingAction = pageActionRef.current
                if (pageAction && pendingAction && pendingAction.names.has(toolName)) {
                  pendingAction.names.delete(toolName)
                  if (pendingAction.names.size === 0) {
                    pageActionRef.current = null
                    endActivity(
                      pendingAction.seq,
                      pendingAction.startedAt,
                      hasError ? pageAction.fail : pageAction.done
                    )
                  }
                }
                continue
              }

              // 文本 delta（与主页面同一格式）
              const content = data.choices?.[0]?.delta?.content ?? data.content
              if (typeof content === "string" && content) {
                if (agentStatus) setAgentStatus("")
                if (typeof assistantMsg.content === "string") {
                  assistantMsg.content += content
                  flushAssistant()
                }
              }
            } catch {
              /* 非 JSON 行忽略 */
            }
          }
        }

        // 流结束兜底
        applyLoading(false)
        setAgentStatus("")
        pendingInputRef.current = null
        setAwaitingInput(false)
        // 模型可能全程只调工具、没吐一个字（「生成完文档就结束」很常见）→ 补一次
        // flush，保证 documents 已落进 messages（否则界面看不出任何变化）。
        if (assistantMsg.documents?.length) flushAssistant()

        // 落库（对齐主页面：PUT /api/sessions/:id）
        // 落库序列 = 本轮提问 + 中途作为答复提交的文本（respondToInput 记在 replyEchoRef）+ 助手正文。
        // ⛔ 不要用 messages 闭包重建：它停在发请求那一刻，等待期间的答复会整段丢失。
        //
        // 🚨 这里**不能**只挑 role/content 重建对象：`documents` 一旦被削掉，
        //    刷新或切会话回来就只剩一段"已生成，可下载"的空话（同 2026-10-16 图片事故）。
        //    字段白名单的唯一源在服务端 `app/api/sessions/[id]/route.ts`，前端原样透传即可。
        const hasAssistantOutput =
          (typeof assistantMsg.content === "string" && !!assistantMsg.content) ||
          !!assistantMsg.documents?.length
        if (sid && hasAssistantOutput) {
          const assistantToSave: Message = {
            role: "assistant",
            content: typeof assistantMsg.content === "string" ? assistantMsg.content : "",
            ...(assistantMsg.documents?.length ? { documents: assistantMsg.documents } : {}),
          }
          void fetch(`/api/sessions/${encodeURIComponent(sid)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [
                ...history.map(m => ({
                  role: m.role,
                  content: m.content,
                  ...(m.documents?.length ? { documents: m.documents } : {}),
                })),
                ...replyEchoRef.current.map(reply => ({ role: "user", content: reply })),
                assistantToSave,
              ],
            }),
          }).catch(() => {})
        }
      } catch (e) {
        const err = e as Error
        if (err.name !== "AbortError") {
          assistantMsg.content = assistantMsg.content || `⚠️ ${err.message}`
          setMessages(prev => {
            const next = [...prev]
            next[next.length - 1] = { ...assistantMsg }
            return next
          })
        }
        applyLoading(false)
        setAgentStatus("")
        pageActionRef.current = null
        setClientToolActivity(null)
        pendingInputRef.current = null
        setAwaitingInput(false)
      } finally {
        abortRef.current = null
      }
    },
    [
      messages,
      ensureSession,
      readAiSettings,
      readMcpConfigs,
      deviceOnline,
      agentStatus,
      beginActivity,
      endActivity,
      applyLoading,
      respondToInput,
    ]
  )

  /** send 自身回填到转发槽：respondToInput 的降级路径要用（见其定义处注释） */
  sendRef.current = send

  useEffect(() => () => abortRef.current?.abort(), [])

  /** 删除单条消息（气泡动作行「更多 → 删除」用，参数是原始 messages 下标） */
  const removeMessage = useCallback((index: number) => {
    setMessages(prev => prev.filter((_, i) => i !== index))
  }, [])

  /**
   * 追加外部产生的消息（语音通话记录回写用）并落库到当前会话。
   * 这样「打电话」和「打字」是同一条会话：挂断后继续用文字聊，上下文不断。
   */
  const appendMessages = useCallback(
    async (msgs: Message[]) => {
      if (!msgs.length) return
      setMessages(prev => [...prev, ...msgs])
      try {
        const sid = sessionRef.current ?? (await ensureSession(String(msgs[0]?.content ?? "语音通话").slice(0, 30)))
        if (!sid) return
        const all = [...messages, ...msgs]
        await fetch(`/api/sessions/${encodeURIComponent(sid)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // 同样原样透传 documents（见 send 里落库处的说明，别只挑 role/content）
            messages: all.map(m => ({
              role: m.role,
              content: m.content,
              ...(m.documents?.length ? { documents: m.documents } : {}),
            })),
          }),
        })
      } catch {
        /* 落库失败不影响本地展示 */
      }
    },
    [messages, ensureSession]
  )

  return {
    messages,
    isLoading,
    agentSteps,
    agentStatus,
    sessionId,
    /** 前端工具（画布操作等）进行中状态：null = 空闲。驱动屏幕边缘光效 */
    clientToolActivity,
    /**
     * 后端正在等用户填表（ask_user_question / CHECKPOINT / CLARIFY）。
     * 为 true 时输入框的发送应改走 `respondToInput`（恢复同一条 SSE），⛔ 不能新开一轮。
     */
    awaitingInput,
    /**
     * 把答复送回挂起中的 Agent Loop（POST /api/chat/respond）。
     * 无挂起点或送达失败时自动降级为新一轮对话，不会让用户的话石沉大海。
     */
    respondToInput,
    send,
    stop,
    reset,
    removeMessage,
    /** 追加外部消息（通话记录回写），与打字共用同一会话 */
    appendMessages,
    /** 兼容 ChatSenderInput 的 loading 语义 */
  }
}
