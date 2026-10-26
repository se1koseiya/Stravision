/**
 * useCopilotChat · HITL（ask_user_question / CHECKPOINT / CLARIFY）回归测试
 *
 * 覆盖的线上 bug：Copilot 侧栏里 AI 调 `ask_user_question` 提问，用户答完表单后
 * AI 再也不回复。原因有三处叠加，本用例逐条钉死：
 *
 *  ① Copilot 的 SSE 解析**完全没处理** `user_input_required` → 前端不知道
 *    `checkpoint_id`，也就无从 POST /api/chat/respond；
 *  ② `rendererProps` 没给 `onRespondToCheckpoint` → 澄清卡提交被降级成
 *    `onSendMessage`（chat-bubble-list 里那个稳定转发函数恒存在，缺了只会变成空操作）；
 *  ③ 即便走到 `send()`，等待期间 `isLoading` 恒为 true，闸门直接 return。
 *    ⇒ 后端那条 SSE 只能挂到 5 分钟超时。
 *
 * 判定：提交后必须真的发出 POST /api/chat/respond（带正确 checkpoint_id），
 * 且同一条流继续推进来的内容要渲染进**原来那个** AI 气泡。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { useCopilotChat } from "./use-copilot-chat"

/* toast 走 sonner（需要真实 DOM 挂载），单测里换成空实现 */
vi.mock("@/lib/ui/feedback", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
  }),
}))

/* 会话标题总结会额外打模型，与本用例无关 */
vi.mock("@/lib/ai/conversation-title", () => ({
  summarizeConversationTitle: vi.fn(async () => null),
  fallbackConversationTitle: (text: string) => String(text).slice(0, 20),
}))

const CHECKPOINT_ID = "cp_test_hitl"

const sse = (obj: unknown) => `data: ${JSON.stringify(obj)}\n\n`
const textChunk = (text: string) =>
  sse({ choices: [{ delta: { content: text }, index: 0, finish_reason: null }] })

const CLARIFY_TAG = `<CLARIFY>${JSON.stringify({
  questions: [
    { title: "这次要种什么作物？", options: [{ id: "tomato", label: "番茄" }] },
  ],
})}</CLARIFY>`

/** /api/chat 的假响应（hook 只读 ok / status / body，不需要真 Response） */
const chatResponse = (body: ReadableStream<Uint8Array>) =>
  ({ ok: true, status: 200, body, json: async () => ({}), text: async () => "" }) as unknown as Response

const jsonResponse = (data: unknown, status = 200) =>
  ({ ok: status < 300, status, body: null, json: async () => data, text: async () => "" }) as unknown as Response

/** 普通一轮回答：一段正文 + 结束（用于「无挂起点时降级」用例） */
function plainStream(): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(new TextEncoder().encode(textChunk("普通回答") + "data: [DONE]\n\n"))
      c.close()
    },
  })
}

describe("useCopilotChat · HITL 恢复", () => {
  let makeChatStream: () => ReadableStream<Uint8Array>
  let respondCalls: Array<{ checkpoint_id?: string; reply?: string }>
  let chatCalls: number
  let hangingCtrl: ReadableStreamDefaultController<Uint8Array> | null

  beforeEach(() => {
    chatCalls = 0
    respondCalls = []
    hangingCtrl = null
    makeChatStream = plainStream

    localStorage.clear()
    localStorage.setItem(
      "ai-settings",
      JSON.stringify({ apiKey: "test-key", apiUrl: "http://localhost/v1", model: "test-model" })
    )

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown, init?: { body?: string }) => {
        const url = typeof input === "string" ? input : String((input as { url?: string })?.url || "")

        if (url.includes("/api/chat/respond")) {
          respondCalls.push(JSON.parse(init?.body || "{}"))
          return jsonResponse({ success: true })
        }
        if (url.includes("/api/chat")) {
          chatCalls += 1
          return chatResponse(makeChatStream())
        }
        if (url.includes("/api/sessions")) {
          return jsonResponse({ id: "session-4-1" })
        }
        return jsonResponse({})
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("收到 user_input_required 后提交答复 → 发 respond（带 checkpoint_id）→ 同一条流继续渲染", async () => {
    // 一条「挂起中」的流：先推正文 + CLARIFY 标签 + user_input_required，然后**不关闭**
    makeChatStream = () =>
      new ReadableStream<Uint8Array>({
        start(c) {
          hangingCtrl = c
          c.enqueue(
            new TextEncoder().encode(
              textChunk(`好的，先确认一下：\n${CLARIFY_TAG}`) +
                sse({
                  user_input_required: {
                    type: "clarify",
                    checkpoint_id: CHECKPOINT_ID,
                    title: "需要用户澄清",
                    timeout_ms: 300000,
                  },
                })
            )
          )
        },
      })

    const { result } = renderHook(() => useCopilotChat({ restoreSession: false }))

    act(() => {
      void result.current.send("帮我准备育苗方案")
    })

    // ① 事件被识别：awaitingInput 置位（缺这条分支时永远是 false）
    await waitFor(() => expect(result.current.awaitingInput).toBe(true), { timeout: 4000 })

    // ② 答复走恢复通道
    await act(async () => {
      await result.current.respondToInput("番茄", { echo: true })
    })

    expect(respondCalls).toHaveLength(1)
    expect(respondCalls[0].checkpoint_id).toBe(CHECKPOINT_ID)
    expect(respondCalls[0].reply).toBe("番茄")
    // 不能新开一轮
    expect(chatCalls).toBe(1)

    // 用户气泡插在 AI 气泡**之前**：AI 必须仍是最后一条，流式写入靠 last 定位
    const afterReply = result.current.messages
    expect(afterReply[afterReply.length - 1].role).toBe("assistant")
    expect(afterReply[afterReply.length - 2].role).toBe("user")
    expect(String(afterReply[afterReply.length - 2].content)).toBe("番茄")

    // ③ 后端在同一 SSE 上继续推 → 渲染进原来那个气泡
    await act(async () => {
      hangingCtrl!.enqueue(
        new TextEncoder().encode(textChunk("收到，就按番茄来准备。") + "data: [DONE]\n\n")
      )
      hangingCtrl!.close()
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 4000 })
    const last = result.current.messages[result.current.messages.length - 1]
    expect(String(last.content)).toContain("收到，就按番茄来准备。")
    expect(result.current.awaitingInput).toBe(false)
  })

  it("卡片提交（不回声）不额外插入用户气泡", async () => {
    makeChatStream = () =>
      new ReadableStream<Uint8Array>({
        start(c) {
          hangingCtrl = c
          c.enqueue(
            new TextEncoder().encode(
              textChunk(CLARIFY_TAG) +
                sse({
                  user_input_required: {
                    type: "clarify",
                    checkpoint_id: CHECKPOINT_ID,
                    title: "需要用户澄清",
                  },
                })
            )
          )
        },
      })

    const { result } = renderHook(() => useCopilotChat({ restoreSession: false }))
    act(() => {
      void result.current.send("帮我准备育苗方案")
    })
    await waitFor(() => expect(result.current.awaitingInput).toBe(true), { timeout: 4000 })

    await act(async () => {
      await result.current.respondToInput("【澄清回复】- 作物: 番茄")
    })

    expect(respondCalls).toHaveLength(1)
    // 只应有：用户原消息 + AI 气泡（卡片自己折叠成摘要，不补第二条用户气泡）
    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[1].role).toBe("assistant")

    await act(async () => {
      hangingCtrl!.enqueue(new TextEncoder().encode("data: [DONE]\n\n"))
      hangingCtrl!.close()
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 4000 })
  })

  it("没有挂起点时提交答复 → 降级为新一轮对话，不吞掉用户的话", async () => {
    const { result } = renderHook(() => useCopilotChat({ restoreSession: false }))

    await act(async () => {
      await result.current.respondToInput("没有挂起点时说的话")
    })

    // 走了 /api/chat（新开一轮），而不是 respond
    expect(respondCalls).toHaveLength(0)
    expect(chatCalls).toBe(1)
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 4000 })
    const userBubbles = result.current.messages.filter((m) => m.role === "user")
    expect(userBubbles).toHaveLength(1)
    expect(String(userBubbles[0].content)).toBe("没有挂起点时说的话")
  })
})

/**
 * 📎 文档产物：Copilot 侧栏的下载卡
 *
 * 覆盖的线上 bug：`document_create` 在主助手里有卡，在侧栏里什么都没有 ——
 * 侧栏的 SSE 解析从未读 `tool_result.result.artifacts`，落库又把消息重建成
 * `{role, content}` 把 `documents` 削掉。用户看到的是「AI 说文件已生成」+ 空白。
 */
describe("useCopilotChat · 文档产物", () => {
  const FILE_ID = "0f9a1c2d3e4b5a69788796a5b4c3d2e1" // 32 位，与服务端白名单一致
  const ARTIFACT = {
    fileId: FILE_ID,
    fileName: "草莓大棚巡检报告.docx",
    format: "docx",
    sizeBytes: 20480,
    downloadUrl: `/api/documents/${FILE_ID}/download`,
    origin: "generated",
  }

  let putBodies: Array<{ messages?: Array<Record<string, unknown>> }>
  let chatBody: Record<string, unknown> | null

  const stubFetch = (stream: () => ReadableStream<Uint8Array>) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown, init?: { method?: string; body?: string }) => {
        const url = typeof input === "string" ? input : String((input as { url?: string })?.url || "")
        if (url.includes("/api/sessions") && init?.method === "PUT") {
          putBodies.push(JSON.parse(init.body || "{}"))
          return jsonResponse({ ok: true })
        }
        if (url.includes("/api/sessions")) return jsonResponse({ id: "session-doc-1" })
        if (url.includes("/api/chat")) {
          chatBody = JSON.parse(init?.body || "{}")
          return chatResponse(stream())
        }
        return jsonResponse({})
      })
    )
  }

  /** 一轮「调 document_create 产出文件 + 说一句话」的流 */
  const documentStream = () =>
    new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(
          new TextEncoder().encode(
            sse({
              tool_call: { name: "document_create", arguments: { format: "docx" } },
            }) +
              sse({
                tool_result: {
                  name: "document_create",
                  args: { format: "docx" },
                  result: { success: true, artifacts: [ARTIFACT] },
                },
              }) +
              textChunk("报告已生成，可直接下载。") +
              "data: [DONE]\n\n"
          )
        )
        c.close()
      },
    })

  beforeEach(() => {
    putBodies = []
    chatBody = null
    localStorage.clear()
    localStorage.setItem(
      "ai-settings",
      JSON.stringify({ apiKey: "test-key", apiUrl: "http://localhost/v1", model: "test-model" })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("tool_result 带 artifacts → 助手消息挂上 documents（能画下载卡）", async () => {
    stubFetch(documentStream)
    const { result } = renderHook(() => useCopilotChat({ restoreSession: false }))

    await act(async () => {
      await result.current.send("生成一份巡检报告")
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 4000 })

    const last = result.current.messages[result.current.messages.length - 1]
    expect(last.role).toBe("assistant")
    expect(last.documents).toHaveLength(1)
    expect(last.documents?.[0]).toMatchObject({
      fileId: FILE_ID,
      fileName: "草莓大棚巡检报告.docx",
      format: "docx",
      downloadUrl: `/api/documents/${FILE_ID}/download`,
      origin: "generated",
      sizeText: "20.0 KB",
    })

    // 落库也必须带上 documents —— 否则刷新/切会话回来卡就没了
    await waitFor(() => expect(putBodies.length).toBeGreaterThan(0), { timeout: 4000 })
    const saved = putBodies[putBodies.length - 1].messages || []
    const savedAssistant = saved[saved.length - 1] as { role?: string; documents?: unknown[] }
    expect(savedAssistant.role).toBe("assistant")
    expect(savedAssistant.documents).toHaveLength(1)
  })

  it("用户上传的文档走 documents 引用，而不是塞进 image_url", async () => {
    stubFetch(() => plainStream())
    const { result } = renderHook(() => useCopilotChat({ restoreSession: false }))

    await act(async () => {
      await result.current.send("帮我看看这份合同", [
        {
          name: "合同.pdf",
          type: "application/pdf",
          dataUrl: "", // 文档附件没有 dataURL，只有 fileId
          fileId: FILE_ID,
          format: "pdf",
          sizeText: "1.2 MB",
          status: "ready",
        },
      ])
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 4000 })

    // 用户消息：正文是纯文本（不升级成多模态数组）+ documents
    const user = result.current.messages.find(m => m.role === "user")
    expect(user?.content).toBe("帮我看看这份合同")
    expect(user?.documents?.[0]).toMatchObject({ fileId: FILE_ID, origin: "uploaded" })

    // 请求体里 documents 让服务端知道「有哪些文件」，正文由 document_read 按需读
    expect(Array.isArray(chatBody?.documents)).toBe(true)
    expect((chatBody?.documents as Array<{ fileId?: string }>)[0]?.fileId).toBe(FILE_ID)
  })

  it("文档还在上传时拦截发送（不让模型看到半截文件）", async () => {
    stubFetch(() => plainStream())
    const { result } = renderHook(() => useCopilotChat({ restoreSession: false }))

    await act(async () => {
      await result.current.send("这个文件怎么样", [
        { name: "a.docx", type: "", dataUrl: "", fileId: FILE_ID, format: "docx", status: "uploading" },
      ])
    })

    // 没有发起请求，也没有生成气泡
    expect(chatBody).toBeNull()
    expect(result.current.messages).toHaveLength(0)
  })
})
