"use client"

/**
 * 文档预览面板 · 页面级总线
 *
 * ## 为什么不把 open 状态放在卡片里
 *
 * 预览面板是**页面级布局的一部分**（AI 助手页的三段式：侧栏 / 对话 / 产物预览），
 * 而触发入口（📎 文档卡）埋在对话气泡最深处 —— 状态放卡片里就只能在气泡里弹浮层，
 * 放页面里就得从 7500 行的 page.tsx 一路把回调穿到 chat-bubble-list 再到卡片。
 *
 * 用一个极小的外部 store（useSyncExternalStore）把两边接起来：
 * 卡片只管 `openDocumentPreview(doc)`，面板自己订阅。谁也不认识谁。
 *
 * ## 为什么还要 `setPreviewHostMounted`
 *
 * 同一个 `chat-bubble-list` 会在两种宿主里跑：
 *   · AI 助手页 —— 挂了停靠面板，点卡片应该**展开第三列**；
 *   · Copilot 侧栏（monitor 等页）—— 没有第三列可占，点卡片只能退回浮层。
 * 宿主挂载时报到，卡片在点击瞬间问一句「有没有面板可停靠」——
 * 有就走总线，没有就自己弹 Sheet。两种宿主零配置，也不用传 prop。
 */

import { useSyncExternalStore } from "react"

/** 与 app/ai-assistant/types.ts 的 DocumentRef 结构兼容（避免 lib ← app 的反向依赖） */
export interface PreviewDocRef {
  fileId: string
  fileName: string
  format: string
  sizeText?: string
  downloadUrl?: string
  origin?: "uploaded" | "generated" | "edited"
}

type Listener = () => void

let current: PreviewDocRef | null = null
let isOpen = false
let hostMounted = false

/**
 * 折叠状态（▣）与「新标签页」。
 *
 * 这两个必须住在总线上，因为「▣」按钮在**顶栏**（和 🔍 搜索、↗ 分享并排），
 * 而面板在卡片容器的另一列里 —— 状态放任何一方，另一方都拿不到。
 *
 * 语义约定（踩过坑之后定死的）：
 *   · collapsed=true ⇒ 列宽归 0，**不存在**"窄条"形态 ——
 *     窄条里再放一枚 ▣ 就会出现两个折叠钮（用户实测抓到），而且顶栏那枚
 *     才是唯一的展开入口（折叠钮跟着面板消失 = 永远展不开的自锁 bug）。
 *   · openDocumentPreview 一律顺手把 collapsed 清掉 —— 用户点了某份文件的
 *     「预览」，结果面板还是收着的，看起来就像"眼睛坏了"。
 *   · ▣ 在没有任何页签时点击 = 打开「新标签页」（WorkBuddy 同款：
 *     面板常驻顶栏，点了总有东西给你看）。
 */
const LS_COLLAPSED = 'ai-doc-preview-collapsed'

let collapsed = (() => {
  try {
    return localStorage.getItem(LS_COLLAPSED) === '1'
  } catch {
    return false
  }
})()
let tabCount = 0
let newTabOpen = false

const listeners = new Set<Listener>()

function emit() {
  listeners.forEach(l => l())
}

/** 打开（或激活）一份文档的预览 —— 面板必须同时展开，否则像「点了没反应」 */
export function openDocumentPreview(doc: PreviewDocRef) {
  current = doc
  isOpen = true
  if (collapsed) {
    collapsed = false
    try {
      localStorage.setItem(LS_COLLAPSED, '0')
    } catch {}
  }
  emit()
}

/** 打开「新标签页」（空态：入口动作 + 最近产物列表） */
export function openPreviewNewTab() {
  newTabOpen = true
  if (collapsed) {
    collapsed = false
    try {
      localStorage.setItem(LS_COLLAPSED, '0')
    } catch {}
  }
  emit()
}

export function closePreviewNewTab() {
  if (!newTabOpen) return
  newTabOpen = false
  emit()
}

export function closeDocumentPreview() {
  isOpen = false
  emit()
}

/** 宿主（停靠面板）挂载/卸载时报到 */
export function setPreviewHostMounted(mounted: boolean) {
  if (hostMounted === mounted) return
  hostMounted = mounted
  emit()
}

/** 卡片在点击瞬间问：这个页面有没有面板可停靠？ */
export function hasPreviewHost(): boolean {
  return hostMounted
}

/** 折叠 / 展开（▣）。偏好写 localStorage，下次进来还是用户上次的样子 */
export function togglePreviewCollapsed() {
  collapsed = !collapsed
  try {
    localStorage.setItem(LS_COLLAPSED, collapsed ? '1' : '0')
  } catch {}
  emit()
}

export function setPreviewCollapsed(v: boolean) {
  if (collapsed === v) return
  collapsed = v
  try {
    localStorage.setItem(LS_COLLAPSED, v ? '1' : '0')
  } catch {}
  emit()
}

/** 面板上报页签数 → ▣ 据此决定显隐 */
export function setPreviewTabCount(n: number) {
  if (tabCount === n) return
  tabCount = n
  emit()
}

export function subscribePreview(cb: Listener): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

/** 当前请求（open 时非 null）。引用稳定，可直接做 useSyncExternalStore 的快照 */
export function getPreviewSnapshot(): PreviewDocRef | null {
  return isOpen ? current : null
}

export function useDocumentPreview(): PreviewDocRef | null {
  return useSyncExternalStore(subscribePreview, getPreviewSnapshot, getPreviewSnapshot)
}

export function usePreviewCollapsed(): boolean {
  return useSyncExternalStore(subscribePreview, () => collapsed, () => false)
}

export function usePreviewTabCount(): number {
  return useSyncExternalStore(subscribePreview, () => tabCount, () => 0)
}

export function usePreviewNewTab(): boolean {
  return useSyncExternalStore(subscribePreview, () => newTabOpen, () => false)
}
