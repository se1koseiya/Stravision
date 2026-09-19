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
import type { Message } from "@/app/ai-assistant/types"
import type { AgentStep } from "@/app/ai-assistant/_components/agent-thought-chain"
import { PAGE_CONTEXT_KEY } from "./page-context"

const LAST_SESSION_KEY = "ai-last-session-id"

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
}

export function useCopilotChat(options: UseCopilotChatOptions = {}) {
  const { contextProvider, deviceData, deviceOnline = true, restoreSession = true } = options

  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([])
  const [agentStatus, setAgentStatus] = useState("")
  const [sessionId, setSessionId] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const sessionRef = useRef<string | null>(null)
  const deviceDataRef = useRef(deviceData)
  deviceDataRef.current = deviceData
  const ctxRef = useRef(contextProvider)
  ctxRef.current = contextProvider
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

  /** 恢复上次会话（复用 ai-last-session-id 协议） */
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
        const list: Message[] = (data?.messages ?? []).map(
          (m: { role?: string; content?: unknown }, i: number) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content:
              typeof m.content === "string" ? m.content : (m.content ?? ""),
            // 兼容 ChatBubbleList 需要的可选字段
          }) as unknown as Message
        ).filter((m: Message) => !m.isSilent)
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
        body: JSON.stringify({ title: firstText.slice(0, 30) || "工作台对话" }),
      })
      if (res.ok) {
        const data = await res.json()
        const id = String(data?.id ?? data?.session?.id ?? "")
        if (id) {
          sessionRef.current = id
          setSessionId(id)
          localStorage.setItem(LAST_SESSION_KEY, id)
          return id
        }
      }
    } catch {
      /* 落库失败降级为内存会话 */
    }
    return null
  }, [])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsLoading(false)
    setAgentStatus("")
  }, [])

  /** 新对话：清空状态（不删服务端会话） */
  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setMessages([])
    setAgentSteps([])
    setAgentStatus("")
    setIsLoading(false)
    sessionRef.current = null
    setSessionId(null)
  }, [])

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

  /** 发送 */
  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      const userMsg: Message = { role: "user", content: trimmed }
      const assistantMsg: Message = { role: "assistant", content: "" }
      const history = [...messages, userMsg]

      setMessages([...history, assistantMsg])
      setIsLoading(true)
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
      const sid = await ensureSession(trimmed)

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
              setIsLoading(false)
              setAgentStatus("")
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
                setIsLoading(false)
                setAgentStatus("")
                break
              }

              // 工具调用开始 → 思考链加一步
              if (data.tool_call?.name) {
                setAgentStatus(`正在调用 ${data.tool_call.name}…`)
                setAgentSteps(prev => [
                  ...prev,
                  {
                    id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    kind: "task",
                    status: "active",
                    toolName: data.tool_call.name,
                    title: data.tool_call.name,
                    startedAt: Date.now(),
                  },
                ])
                continue
              }

              // 工具结果 → 标记完成
              if (data.tool_result?.name) {
                const hasError = data.tool_result.result?.error
                setAgentSteps(prev => {
                  const idx = prev.findIndex(
                    s => s.kind === "task" && s.status === "active" && s.toolName === data.tool_result.name
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
        setIsLoading(false)
        setAgentStatus("")

        // 落库（对齐主页面：PUT /api/sessions/:id）
        if (sid && typeof assistantMsg.content === "string" && assistantMsg.content) {
          void fetch(`/api/sessions/${encodeURIComponent(sid)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [
                ...history.map(m => ({ role: m.role, content: m.content })),
                { role: "assistant", content: assistantMsg.content },
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
        setIsLoading(false)
        setAgentStatus("")
      } finally {
        abortRef.current = null
      }
    },
    [messages, isLoading, ensureSession, readAiSettings, readMcpConfigs, deviceOnline, agentStatus]
  )

  useEffect(() => () => abortRef.current?.abort(), [])

  /** 删除单条消息（气泡动作行「更多 → 删除」用，参数是原始 messages 下标） */
  const removeMessage = useCallback((index: number) => {
    setMessages(prev => prev.filter((_, i) => i !== index))
  }, [])

  return {
    messages,
    isLoading,
    agentSteps,
    agentStatus,
    sessionId,
    send,
    stop,
    reset,
    removeMessage,
    /** 兼容 ChatSenderInput 的 loading 语义 */
  }
}
