/**
 * 消息渲染的记忆化判定 —— 唯一源
 *
 * ## 为什么单独成文件
 *
 * `ChatMessageRenderer` 是 `React.memo` 包着的：父级（Bubble.List）每次渲染都会重建
 * items / contentRender，不挡就会把整条消息子树带着重渲染，触发子组件 useEffect
 * 级联（React 19 下直接 `Maximum update depth exceeded`）。所以必须有一个
 * 「这条消息到底变没变」的判定。
 *
 * 但这个判定一旦写错，症状极其难查：**界面看起来没更新，其实是渲染被跳过了**。
 * 2026-10-23 的事故就是它（`documents` 字段没登记 → AI 生成的文档卡要等下一句话才出现）。
 * 抽成纯函数 + 单测锁定，比留在 2500 行的渲染器里靠肉眼维护靠谱。
 *
 * ## 判定口径：fail-open（反向白名单）
 *
 * 只登记「渲染器不消费」的字段，其余**任何**字段变化都算「变了」：
 * 未知字段 ⇒ 重渲染。宁可多渲染一次，也不要静默吞掉一次。
 *
 * ⛔ 别退回到「列举要比较的字段」——那等于要求每个新增 Message 字段的开发者
 *    都记得来这里登记，漏一个就是一个静默 bug。
 */

/** 渲染器**不消费**的消息字段（只在对话流外层读取，如气泡动作条 / 积分行） */
export const RENDERER_IGNORED_MESSAGE_KEYS: ReadonlySet<string> = new Set<string>([
  /** 流式积分估算：由 chat-bubble-list 自己的积分行渲染，渲染器内部不读 */
  "liveCredits",
])

/**
 * 两条消息在「渲染器眼里」是否等价。
 *
 * - 引用相同 ⇒ 等价（流式期间父级重渲染走的就是这条快捷路径）；
 * - 否则逐字段按引用比较：内容字符串按值、数组/对象按引用（上游每次产生新引用
 *   恰恰意味着有新数据，重渲染是对的）。
 */
export function areMessageFieldsEqual(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
): boolean {
  if (prev === next) return true
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)])
  for (const key of keys) {
    if (RENDERER_IGNORED_MESSAGE_KEYS.has(key)) continue
    if (prev[key] !== next[key]) return false
  }
  return true
}
