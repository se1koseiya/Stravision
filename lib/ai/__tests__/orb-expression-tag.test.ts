/**
 * GrokBot 显式表情协议（`<EMO:id/>`）解析测试
 *
 * 锁三件事：
 * 1. 标签必须能从正文里剥干净（用户永不看到标签）
 * 2. 白名单外的 id 一律当无效（回落文本推断），但标签照样剥
 * 3. 流式半截标签（`<EMO:hap`）不能漏到屏幕上
 */
import { describe, it, expect } from "vitest"
import {
  ORB_EXPRESSION_IDS,
  ORB_EXPRESSION_PROMPT,
  extractOrbExpression,
  isGrokOrbExpression,
  parseOrbExpressionTag,
  stripOrbExpressionTag,
} from "../orb-expression"
import { GROK_ORB_EXPRESSION_OPTIONS } from "@/components/smoothui/grok-orb-data"

describe("ORB_EXPRESSION_IDS", () => {
  it("与 grok-orb-data 的姿态数据逐项一致", () => {
    const fromData = GROK_ORB_EXPRESSION_OPTIONS.map((o) => o.id).sort()
    expect([...ORB_EXPRESSION_IDS].sort()).toEqual(fromData)
  })

  it("isGrokOrbExpression 只认白名单", () => {
    expect(isGrokOrbExpression("happy")).toBe(true)
    expect(isGrokOrbExpression("HAPPY")).toBe(false)
    expect(isGrokOrbExpression("excited")).toBe(false)
    expect(isGrokOrbExpression(undefined)).toBe(false)
  })
})

describe("parseOrbExpressionTag", () => {
  it("剥离行首标签并取到 id", () => {
    const r = parseOrbExpressionTag("<EMO:happy/>\n太好了，灌溉已完成。")
    expect(r.expression).toBe("happy")
    expect(r.text).toBe("太好了，灌溉已完成。")
  })

  it("兼容小写、中文冒号、非自闭合写法", () => {
    expect(parseOrbExpressionTag("<emo:sad>\n抱歉").expression).toBe("sad")
    expect(parseOrbExpressionTag("<EMO：shy/>\n嗯").expression).toBe("shy")
    const r = parseOrbExpressionTag("<EMO:curious>\n为什么？")
    expect(r.expression).toBe("curious")
    expect(r.text).toBe("为什么？")
  })

  it("无标签 → 正文原样返回、expression 为 null", () => {
    const raw = "3 号棚温度 26.4°C，一切正常。"
    const r = parseOrbExpressionTag(raw)
    expect(r.expression).toBeNull()
    expect(r.text).toBe(raw)
  })

  it("白名单外的 id：标签照剥，但 expression 记 null（交给文本推断）", () => {
    const r = parseOrbExpressionTag("<EMO:excited/>\n好耶")
    expect(r.expression).toBeNull()
    expect(r.text).toBe("好耶")
  })

  it("多个标签取第一个合法的", () => {
    const r = parseOrbExpressionTag("<EMO:happy/>\n正文\n<EMO:angry/>")
    expect(r.expression).toBe("happy")
    expect(r.text).toBe("正文\n")
  })

  it("标签写在正文中间也能剥（模型不听话时兜底）", () => {
    const r = parseOrbExpressionTag("先看一眼。<EMO:focused/>\n再动手。")
    expect(r.expression).toBe("focused")
    expect(r.text).not.toContain("EMO")
  })

  it("流式半截标签被掐掉", () => {
    expect(parseOrbExpressionTag("<EMO:hap", { streaming: true })).toEqual({
      expression: null,
      text: "",
    })
    expect(parseOrbExpressionTag("<EM", { streaming: true }).text).toBe("")
    // 非流式模式不动半截标签（避免误伤正文里的 "<")
    expect(parseOrbExpressionTag("a < b").text).toBe("a < b")
  })

  it("正文里普通的尖括号不误伤", () => {
    const raw = "条件是 a < b 且 c > d。"
    expect(stripOrbExpressionTag(raw)).toBe(raw)
  })
})

describe("extractOrbExpression", () => {
  it("只取 id", () => {
    expect(extractOrbExpression("<EMO:playful/>\n嘿嘿")).toBe("playful")
    expect(extractOrbExpression("没有标签")).toBeNull()
  })
})

describe("ORB_EXPRESSION_PROMPT", () => {
  it("列出了全部 12 个 id，且给出了标签格式", () => {
    for (const id of ORB_EXPRESSION_IDS) {
      expect(ORB_EXPRESSION_PROMPT).toContain(id)
    }
    expect(ORB_EXPRESSION_PROMPT).toContain("<EMO:id/>")
  })
})
