"use client"

/**
 * 桌面端原生系统通知（渲染侧入口）。
 *
 * 分工：
 *   - 本模块决定「该不该弹」：是否桌面端、用户是否关了开关、窗口是否在前台。
 *   - 宿主能力（真正弹 toast、闪任务栏、点击拉窗口）在 Electron 主进程
 *     `desktop/lib/notify.js`，经 preload 的 `window.stravisionDesktop.notify` 调用。
 *
 * 默认策略：**只在窗口不在前台时弹**。
 * 用户盯着 AI 助手看的时候不需要系统通知再复述一遍；真正的价值场景是
 * 「让 AI 跑长任务 → 切去别的应用 → 完成了提醒我回来」。失败通知同理，
 * 前台时聊天流里已经显示了错误。
 */

import { IS_DESKTOP_APP } from "@/lib/desktop-mode"

const STORAGE_KEY = "stravision:desktop-notify"
const CHANGE_EVENT = "stravision:desktop-notify-change"

export type DesktopNotifyLevel = "success" | "error" | "info"

export interface DesktopNotifyInput {
  title: string
  body?: string
  /** 点击通知后要跳转的站内路由，例如 "/ai-assistant" */
  route?: string
  /** 同 tag 的通知互相替换（同一会话只留最新一条） */
  tag?: string
  level?: DesktopNotifyLevel
  /** 跳过「窗口在前台就不弹」的判断，强制弹出 */
  force?: boolean
}

/** 用户是否开启了桌面通知（默认开启） */
export function isDesktopNotifyEnabled(): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off"
  } catch {
    return true
  }
}

/** 开关桌面通知，并广播变更（设置页/头像菜单共用同一个开关） */
export function setDesktopNotifyEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off")
  } catch {
    /* localStorage 不可用时退化成"本次会话有效" */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** 订阅开关变化（供 UI 双向绑定） */
export function onDesktopNotifyChange(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  window.addEventListener(CHANGE_EVENT, handler)
  return () => window.removeEventListener(CHANGE_EVENT, handler)
}

/** 应用是否不在前台（最小化 / 被其他窗口盖住 / 用户切到了别的应用） */
export function isAppInBackground(): boolean {
  if (typeof document === "undefined") return false
  if (document.hidden) return true
  try {
    return !document.hasFocus()
  } catch {
    return false
  }
}

/** 把可能很长的 AI 回复压成一行通知正文 */
export function summarizeForNotification(text: string, max = 88): string {
  const flat = String(text || "")
    // 去掉 markdown 结构噪音，通知正文里读不出格式
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*`_~]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  if (flat.length <= max) return flat
  return `${flat.slice(0, max)}…`
}

/**
 * 发一条桌面通知。
 * @returns 是否真的发出去了（非桌面端 / 前台 / 用户关掉开关都会返回 false）
 */
export function notifyDesktop(input: DesktopNotifyInput): boolean {
  if (!IS_DESKTOP_APP) return false
  if (typeof window === "undefined") return false

  const bridge = window.stravisionDesktop
  if (!bridge?.notify) return false

  if (!input.force && !isAppInBackground()) return false
  if (!isDesktopNotifyEnabled()) return false

  const title = String(input.title || "").trim()
  if (!title) return false

  void bridge.notify({
    title,
    body: input.body || "",
    route: input.route,
    tag: input.tag,
    level: input.level || "info",
  })
  return true
}

/** 关闭某个 tag 的通知（例如用户回到前台且已读） */
export function closeDesktopNotification(tag: string): void {
  if (!IS_DESKTOP_APP || typeof window === "undefined") return
  void window.stravisionDesktop?.closeNotification?.(tag)
}

/** 最近一次注册的点击处理器（preload 的 ipcRenderer.on 无法逐个反注册，只绑一次） */
let notificationActivateHandler: ((payload: { route?: string }) => void) | null = null
let notificationActivateBound = false

/**
 * 订阅「用户点了通知」事件。
 * 主进程已把窗口还原并聚焦，这里只负责把页面导航到对应位置。
 *
 * 注意：底层 `ipcRenderer.on` 无法移除单个监听，因此本函数**全局只真正绑定一次**，
 * 后续调用只是替换处理器 —— 否则 React StrictMode 的双次 effect 会导致重复导航。
 */
export function onDesktopNotificationActivate(
  handler: (payload: { route?: string }) => void
): void {
  if (!IS_DESKTOP_APP || typeof window === "undefined") return

  notificationActivateHandler = handler
  if (notificationActivateBound) return

  const bridge = window.stravisionDesktop
  if (!bridge?.onNotificationActivate) return

  notificationActivateBound = true
  bridge.onNotificationActivate((payload) => {
    notificationActivateHandler?.(payload || {})
  })
}
