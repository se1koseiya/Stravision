/**
 * MQTT topic 工具（纯函数，无数据库/网络依赖）
 *
 * 单独成文件的原因：上层路由与单元测试都要用，但不该被迫连带加载 pg / mqtt。
 */

/**
 * topic 通配符匹配：+ 匹配单层，# 匹配剩余所有层。
 * 语义与 broker 一致，避免为了一个匹配函数引入 mqtt-packet。
 */
export function matchTopic(pattern: string, topic: string): boolean {
  const p = String(pattern || '').split('/')
  const t = String(topic || '').split('/')
  for (let i = 0; i < p.length; i++) {
    if (p[i] === '#') return true
    if (i >= t.length) return false
    if (p[i] === '+') continue
    if (p[i] !== t[i]) return false
  }
  return p.length === t.length
}

/**
 * 从订阅 pattern 中提取通配段（+ 位置的实参，# 位置及之后的剩余部分）。
 * 用于一个连接下多台设备共用通配 topic 的场景：sensors/+/data → ['SN1']
 */
export function extractTopicSegments(pattern: string, topic: string): string[] {
  const p = String(pattern || '').split('/')
  const t = String(topic || '').split('/')
  const out: string[] = []
  for (let i = 0; i < p.length; i++) {
    if (p[i] === '#') {
      out.push(t.slice(i).join('/'))
      break
    }
    if (p[i] === '+') out.push(t[i] ?? '')
  }
  return out
}
