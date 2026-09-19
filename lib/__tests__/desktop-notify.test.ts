/**
 * 桌面端原生通知的**弹出策略**单测。
 *
 * 为什么值得单测：这是"会不会打扰用户"的唯一闸门，而且分支不少 ——
 * 非桌面端 / 没桥 / 用户关掉开关 / 空标题 / 前台不打扰 / 强制弹出。
 * 弹错了（前台还弹）和没弹（后台不提醒）都是真实用户会抱怨的 bug。
 *
 * 注意 `IS_DESKTOP_APP` 是模块加载期读环境变量，所以这里用动态 import
 * 并在 import 前把 `NEXT_PUBLIC_STRAVISION_DESKTOP` 打开。
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest"

type NotifyMod = typeof import("@/lib/desktop-notify")

let mod: NotifyMod

const dispatched: Array<Record<string, unknown>> = []

const bridge = {
  isDesktop: true,
  notifySupported: () => Promise.resolve({ supported: true }),
  notify: (payload: Record<string, unknown>) => {
    dispatched.push(payload)
    return Promise.resolve({ ok: true })
  },
  closeNotification: () => Promise.resolve({ ok: true }),
  onNotificationActivate: () => {},
}

beforeAll(async () => {
  process.env.NEXT_PUBLIC_STRAVISION_DESKTOP = "1"
  ;(globalThis as any).window.stravisionDesktop = bridge
  mod = await import("@/lib/desktop-notify")
})

beforeEach(() => {
  dispatched.length = 0
  window.localStorage.clear()
  // jsdom 默认：页面可见、有焦点（= 前台）
  vi.stubGlobal("document", {
    ...document,
    hidden: false,
    hasFocus: () => true,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function setBackground() {
  vi.stubGlobal("document", {
    ...document,
    hidden: true,
    hasFocus: () => false,
  })
}

describe("summarizeForNotification", () => {
  it("压掉 markdown 噪音并把多行压成一行", () => {
    const md = "# 标题\n\n这是**重点**，请看[链接](https://x.y)。\n\n```js\nconst a = 1\n```"
    expect(mod.summarizeForNotification(md)).toBe("标题 这是重点，请看链接。")
  })

  it("超长内容截断并加省略号", () => {
    const out = mod.summarizeForNotification("啊".repeat(200))
    expect(out.length).toBe(89)
    expect(out.endsWith("…")).toBe(true)
  })
})

describe("notifyDesktop 弹出策略", () => {
  it("窗口在后台 → 弹", () => {
    setBackground()
    expect(
      mod.notifyDesktop({ title: "AI 任务已完成", level: "success" })
    ).toBe(true)
    expect(dispatched).toHaveLength(1)
    expect(dispatched[0].title).toBe("AI 任务已完成")
  })

  it("窗口在前台且未强制 → 不弹（用户看得见结果，别复述）", () => {
    expect(mod.notifyDesktop({ title: "AI 任务已完成" })).toBe(false)
    expect(dispatched).toHaveLength(0)
  })

  it("窗口在前台但 force=true → 弹（后台会话完成 / 测试通知）", () => {
    expect(
      mod.notifyDesktop({ title: "测试通知", force: true })
    ).toBe(true)
    expect(dispatched).toHaveLength(1)
  })

  it("用户关掉开关 → 不弹（即使 force）", () => {
    mod.setDesktopNotifyEnabled(false)
    setBackground()
    expect(
      mod.notifyDesktop({ title: "AI 任务已完成", force: true })
    ).toBe(false)
    expect(dispatched).toHaveLength(0)
    mod.setDesktopNotifyEnabled(true)
  })

  it("空标题不弹（防止 UI 传空串刷出无标题通知）", () => {
    setBackground()
    expect(mod.notifyDesktop({ title: "   " })).toBe(false)
    expect(dispatched).toHaveLength(0)
  })
})
