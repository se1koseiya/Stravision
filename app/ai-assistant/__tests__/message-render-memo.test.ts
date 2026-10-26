/**
 * 消息渲染记忆化判定（message-render-memo.ts）的回归测试
 *
 * 锁定的是一条**事故**：`ChatMessageRenderer` 的 React.memo 比较器曾是正向白名单，
 * `documents` 字段没登记 → AI 生成文档后，收尾把文档挂到消息上的那次 setMessages
 * 被判定为「没变化」而跳过渲染 → 对话里没有文档卡，用户得再发一句话才冒出来。
 *
 * 所以这里断言的不是「某些字段要比较」，而是**口径**：
 *   · 引用相同的消息 ⇒ 等价（否则流式期间会持续重渲染）；
 *   · 任何未登记字段发生变化 ⇒ 不等价（fail-open）；
 *   · 只有显式登记为「渲染器不消费」的字段可以跳过。
 */

import { describe, expect, it } from "vitest"
import { areMessageFieldsEqual, RENDERER_IGNORED_MESSAGE_KEYS } from "../_components/message-render-memo"

const base = (): Record<string, unknown> => ({
  role: "assistant",
  content: "已为你生成《巡检报告.docx》",
})

describe("areMessageFieldsEqual", () => {
  it("同一引用视为等价（流式期间父级重渲染的快捷路径）", () => {
    const m = base()
    expect(areMessageFieldsEqual(m, m)).toBe(true)
  })

  it("内容没变但字段都没变 ⇒ 等价（保持 memo 切断副作用级联的初衷）", () => {
    expect(areMessageFieldsEqual(base(), base())).toBe(true)
  })

  it("documents 变化 ⇒ 不等价（2026-10-23 文档卡不显示的根因）", () => {
    const prev = base()
    const next = {
      ...prev,
      documents: [{ fileId: "f1", fileName: "巡检报告.docx", format: "docx", downloadUrl: "/api/documents/f1/download" }],
    }
    expect(areMessageFieldsEqual(prev, next)).toBe(false)
  })

  it("已登记的「渲染器不消费」字段不算变化（liveCredits）", () => {
    expect(RENDERER_IGNORED_MESSAGE_KEYS.has("liveCredits")).toBe(true)
    const prev = { ...base(), liveCredits: 1.2 }
    const next = { ...base(), liveCredits: 2.7 }
    expect(areMessageFieldsEqual(prev, next)).toBe(true)
  })

  it("未来新增的任意字段都算变化（fail-open，防止再漏登记）", () => {
    const prev = base()
    const next = { ...prev, someFutureField: { a: 1 } }
    expect(areMessageFieldsEqual(prev, next)).toBe(false)
  })

  it("字段被删掉也算变化（例如产物被清空）", () => {
    const prev = { ...base(), documents: [{ fileId: "f1" }] }
    const next = base()
    expect(areMessageFieldsEqual(prev, next)).toBe(false)
  })
})
