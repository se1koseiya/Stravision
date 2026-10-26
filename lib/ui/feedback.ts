"use client"

/**
 * 全站提示（feedback）唯一入口 —— 2026-10-21
 *
 * ── 起因 ──
 *   项目里曾两套提示并存：sonner `toast`（77 文件 / 447 处）与 antd `message`（279 处）。
 *   更致命的是 `ToasterWrapper` 也挂在 `position="top-center"` —— 与 antd message 抢**同一块
 *   屏幕位置**，样式却完全不同（自定义白卡片 vs antd 胶囊）。同一个操作里两个都触发时，
 *   用户会在顶部居中看到两条长得不一样的提示叠在一起，这就是「混乱」的真实来源。
 *
 * ── 分工（位置 + 语义）──
 *   toast    轻提示   ｜ 右下角    ｜ 操作级即时反馈
 *                     复制成功、已保存、已开启、表单校验失败 —— 不打断视线、可堆叠、自动消失
 *   message  全局提示 ｜ 顶部居中  ｜ 系统级 / 跨页面事件
 *                     登录态变化、网络异常、权限不足、后台任务开始/结束 —— 「系统在跟你说话」
 *
 *   判断口径：**这条提示是不是只在当前操作上下文里有意义？**
 *     · 是 → toast（角落里说一句就走）
 *     · 否 → message（哪怕用户已经滚走了/切了标签，他也该看到）
 *
 * ── 用法 ──
 *   import { toast, message } from "@/lib/ui/feedback"
 *
 *   toast.success("已复制")                  // 轻提示，右下角
 *   message.success("登录成功")              // 全局提示，顶部居中
 *   const hide = message.loading("上传中…")  // 返回可调用对象，hide() 关掉
 *
 *   组件内也可用 hook（message 走 antd `<App>` 上下文，主题/字体最可靠）：
 *   const { toast, message } = useFeedback()
 *
 * ⛔ 不要再 `import { toast } from "sonner"` 或 `import { message } from "antd"`。
 *    eslint.config.mjs 已对此加了 no-restricted-imports（暂为 warn，存量清零后改 error）。
 */

import { toast as sonnerToast } from "sonner"
import { App } from "antd"
import type { ArgsProps, MessageInstance, MessageType } from "antd/es/message/interface"

/* ────────────────────────── 轻提示：toast（右下角） ──────────────────────────
 * 直接复用 sonner 单例 —— 它是模块级发布订阅，不依赖 React 上下文，任何地方都能调。
 * 视觉/位置由 `components/toaster-wrapper.tsx` 统一控制（bottom-right），此处不干预，
 * 以保证存量 447 处调用行为完全不变（只换 import 路径即可）。
 */
export const toast = sonnerToast

/* ──────────────────────── 全局提示：message（顶部居中） ───────────────────────
 * antd 的 message 必须在 React 树内由 `<App>` 生成实例，静态调用拿不到主题令牌
 * （会掉回默认蓝、默认字体）。所以这里用「实例注册表」桥接：
 *   ① `components/ui/feedback-host.tsx` 在根布局挂一次 `<App>`；
 *   ② 它通过 `registerMessageApi()` 把实例交给本模块；
 *   ③ 下面的命令式 API 都转发到这个实例。
 * 没注册时**不静默**：开发环境告警 + 降级成 toast，至少让用户看见。
 */

let messageApi: MessageInstance | null = null

/** 由 `<FeedbackHost />` 调用，把 antd `<App>` 生成的 message 实例登记进来。 */
export function registerMessageApi(api: MessageInstance | null) {
  messageApi = api
}

/**
 * 把「关闭函数」包装成 antd 的 MessageType（可调用 + thenable）。
 * 调用点常见写法：`const hide = message.loading("…"); ...; hide()`
 * 以及 `await message.success("…")` —— 两种都必须继续可用。
 */
function toMessageType(hide: () => void): MessageType {
  const fn = hide as unknown as { (): void; then: PromiseLike<boolean>["then"] }
  fn.then = ((onfulfilled: never, onrejected: never) =>
    Promise.resolve(true).then(onfulfilled, onrejected)) as PromiseLike<boolean>["then"]
  return fn as unknown as MessageType
}

function warnUnregistered() {
  if (process.env.NODE_ENV === "production") return
  console.warn(
    "[feedback] 全局 message 实例尚未注册（根布局缺 <FeedbackHost />？）—— 本次已降级为右下角 toast。",
  )
}

/** 未注册时的降级：宁可出现在角落，也不要让用户什么都看不到。 */
function fallback(kind: "success" | "error" | "info" | "warning" | "loading", content: unknown) {
  warnUnregistered()
  const text = typeof content === "string" ? content : undefined
  const show = kind === "loading" ? sonnerToast.loading : sonnerToast[kind]
  const id = show(text ?? String(content ?? ""))
  return toMessageType(() => sonnerToast.dismiss(id))
}

type Kind = "success" | "error" | "info" | "warning" | "loading"

function dispatch(kind: Kind, content: unknown, duration?: number | (() => void)): MessageType {
  const api = messageApi
  if (!api) return fallback(kind, content)
  return api[kind](content as never, duration as never) as MessageType
}

/** 全局提示（顶部居中）。语义见文件头。 */
export const message = {
  success: (content: unknown, duration?: number | (() => void)) =>
    dispatch("success", content, duration),
  error: (content: unknown, duration?: number | (() => void)) =>
    dispatch("error", content, duration),
  warning: (content: unknown, duration?: number | (() => void)) =>
    dispatch("warning", content, duration),
  info: (content: unknown, duration?: number | (() => void)) => dispatch("info", content, duration),
  loading: (content: unknown, duration?: number | (() => void)) =>
    dispatch("loading", content, duration),

  /** 需要自定义 icon / key / onClose 时用它。 */
  open: (args: ArgsProps): MessageType => {
    const api = messageApi
    if (!api) {
      warnUnregistered()
      const id = sonnerToast(String(args.content ?? ""))
      return toMessageType(() => sonnerToast.dismiss(id))
    }
    return api.open(args) as MessageType
  },

  destroy: (key?: React.Key) => {
    messageApi?.destroy(key)
  },
}

/**
 * 组件内推荐写法：message 来自最近的 `<App>`，天然带主题令牌。
 * toast 仍直连 sonner（右下角，与主题无关，样式由 ToasterWrapper 负责）。
 *
 * 🚨 兜底必须判「方法」而不是判空（2026-10-21 探针实测踩到的坑）：
 *    antd v6 的 `AppContext` 默认值是 `{ message: {}, notification: {}, modal: {} }` ——
 *    不在任何 `<App>` 底下时拿到的是**真值的空对象**，`app?.message ?? message` 兜不住，
 *    直接调就会抛 `scoped.message.success is not a function`。
 *    所以这里判 `typeof success === "function"`，不通就回退到命令式单例
 *    （由 `<FeedbackHost />` 注册），功能与位置完全等价。
 */
export function useFeedback() {
  const app = App.useApp()
  const scoped = typeof app?.message?.success === "function" ? app.message : message
  return { toast, message: scoped }
}
