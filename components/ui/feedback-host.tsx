"use client"

/**
 * 全局提示宿主（2026-10-21）—— antd `message` 的**唯一**实例来源
 *
 * ── 为什么需要它 ──
 *   项目原先**没有全局 ConfigProvider / App**，`<App>` 只在两个 AI 助手页和设置弹窗里各包了一层。
 *   后果：同一个组件（比如上传失败提示）在 AI 助手页里是绿色主题，换到 admin 页面就掉回
 *   antd 默认蓝 —— 因为那里没有 `<App>`，antd 退回静态方法、拿不到 `antdScopeTheme()` 的令牌。
 *   这正是「message 和 toast 混乱」的第二层原因：**不是位置不同，是同一种提示自己都长两副脸**。
 *
 * ── 做法 ──
 *   · `<ConfigProvider theme={antdScopeTheme(isDark)}>` 保证亮/暗两套令牌（emerald 主色、
 *     语义色、字体走 `--font-ui`）与本文件外的一切一致；
 *   · `<App>` 生成 message 实例，`MessageRegistrar` 把它交给 `lib/ui/feedback.ts` 的注册表；
 *   · 之后任何 `import { message } from "@/lib/ui/feedback"` 的命令式调用都拿到**同一份实例**。
 *
 * ── 为什么不包 children ──
 *   刻意不包。包住会让全站 antd 组件的默认主色从 antd 蓝变成 emerald —— 那是一次全局换肤，
 *   属于独立决策，不该夹在「提示分层」里顺手做掉。本组件只负责**提示**这一件事：
 *   它渲染 null 之外几乎不占位，主题只作用于自己生成的 message / notification holder。
 *   （30 处既有 `App.useApp()` 因此保持原样，零影响 —— 它们各自所在的页面本来就有 `<App>`。）
 *
 * ⚠️ message 的 DOM 是 portal 到 body 的，主题靠 antd 注入的 hash 类名生效，
 *   不依赖本组件在 DOM 树里的位置 —— 所以挂在 `LazyProviders` 任意位置都成立。
 */

import { useEffect } from "react"
import { App, ConfigProvider } from "antd"
import { useTheme } from "next-themes"
import { antdScopeTheme } from "@/lib/theme/antd-scope-theme"
import { registerMessageApi } from "@/lib/ui/feedback"

/**
 * 把 `<App>` 生成的 message 实例登记进统一入口。
 * 卸载时置空 —— 避免 HMR / route 切换后全局变量指向已废弃实例（会导致提示再也不出现）。
 */
function MessageRegistrar() {
  const { message } = App.useApp()

  useEffect(() => {
    registerMessageApi(message)
    return () => registerMessageApi(null)
  }, [message])

  return null
}

export function FeedbackHost() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <ConfigProvider theme={antdScopeTheme(isDark)}>
      <App
        /* "div" + display:contents 而不是 component={false}：
           v6 开了 cssVar，component={false} 会让 antd 在 dev 里刷
           「cssVar 必须配有效组件」的警告；contents 不产生布局盒，效果等价。 */
        component="div"
        style={{ display: "contents" }}
        message={{
          /* 顶部居中，与右下角 toast 彻底分屏。safe-area 让灵动岛机型不被压住。 */
          top: "calc(env(safe-area-inset-top, 0px) + 16px)",
          duration: 2.5,
          /* 最多叠三条：全局提示是「系统在说话」，堆多了就变成噪音。 */
          maxCount: 3,
        }}
      >
        <MessageRegistrar />
      </App>
    </ConfigProvider>
  )
}
