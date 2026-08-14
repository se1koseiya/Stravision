/**
 * Berry Orb 表情系统
 * - OrbExpression: orb 支持的表情类型
 * - detectOrbExpression: 根据 AI 回复文本推断情绪表情（关键词启发式）
 */

export type OrbExpression =
  | "idle"       // 平常/待机
  | "thinking"   // 思考中
  | "working"    // 执行任务中（工具调用、设备控制等）
  | "speaking"   // 正在输出/说话
  | "happy"      // 开心（成功、完成、好消息）
  | "confused"   // 疑惑（不确定、疑问）
  | "angry"      // 生气/严肃（警告、危险、异常）
  | "surprised"; // 惊讶（意外、错误、失败）

/** 按优先级排列的规则：先命中先生效 */
const RULES: Array<{ expression: OrbExpression; pattern: RegExp }> = [
  // 严肃警告类 → 生气（提醒用户重视）
  {
    expression: "angry",
    pattern: /警告|警报|危险|严重|紧急|超标|异常|故障|病虫害|灾害|禁止|千万不/,
  },
  // 意外/失败类 → 惊讶
  {
    expression: "surprised",
    pattern: /哇|竟然|居然|没想到|出乎意料|失败|出错|出错了|无法完成|抱歉|很遗憾|对不起/,
  },
  // 成功/好消息类 → 开心
  {
    expression: "happy",
    pattern: /太好了|成功|已完成|完成了|恭喜|不错|很好|非常好|开心|高兴|顺利|搞定|🎉|✅|👍|😄|😊/,
  },
  // 不确定/疑问类 → 疑惑
  {
    expression: "confused",
    pattern: /不确定|可能|也许|大概|疑似|奇怪|疑惑|不太清楚|没听清|没看懂|你是说|什么意思|\?{2,}|？{2,}/,
  },
];

/**
 * 根据 AI 输出文本推断表情。
 * @param text AI 的回复文本（会自动取尾部片段，流式场景也适用）
 * @param fallback 没有命中任何情绪规则时返回的表情，默认 "idle"
 */
export function detectOrbExpression(
  text: string,
  fallback: OrbExpression = "idle"
): OrbExpression {
  if (!text) return fallback;
  // 只检测尾部片段：情绪通常体现在结论部分，也避免长文本性能损耗
  const tail = text.slice(-400);
  for (const rule of RULES) {
    if (rule.pattern.test(tail)) return rule.expression;
  }
  return fallback;
}
