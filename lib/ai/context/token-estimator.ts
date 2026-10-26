/**
 * 上下文工程层 · 统一 Token 估算
 *
 * 现状问题（本文件要解决的）：
 *   - `lib/db/credit-service.ts#estimateTokens`：用于**计费**，口径偏保守（other*0.3）。
 *   - `lib/ai/prompt-templates.ts#estimateTokenCount`：用于**提示词**，口径是
 *     「中文 /1.5 + 其他 /4」，与上面不一致 —— 同一个字符串两处算出两个数。
 *   - `app/api/chat/route.ts` 的压缩判断更直接用 `String.length`（字符数）当阈值，
 *     与 token 完全脱钩：纯英文历史能被压得很早，纯中文历史却压得太晚。
 *
 * 本模块提供**单一真相源**：估算口径按「模型分词器的经验近似」分字符类加权，
 * 并对 base64 / dataURL 做统一剥离（它们不占真实语义 token，但会让字符数爆炸）。
 *
 * 注意：这是**估算**，不追求与具体模型分词器逐字一致；它的一致性和单调性
 * （同一文本任何调用点结果相同、文本变长 token 必增）比绝对值更重要 ——
 * 预算分配与压缩触发都建立在这个性质上。
 */

/** 估算口径的参数（集中在此，便于按模型族微调） */
export interface TokenEstimateOptions {
  /** CJK 汉字：约 1 字 ≈ 1 token（DeepSeek/Qwen 系实测接近 1，保守取 1） */
  cjkPerChar?: number
  /** 日文假名 / 全角标点：约 1 字 ≈ 0.8 token */
  wideSymbolPerChar?: number
  /** ASCII / 拉丁字母：约 4 字符 ≈ 1 token */
  latinPerChar?: number
  /** emoji 与其它符号：往往 2~3 token 一个，取 1.5 保守 */
  emojiPerChar?: number
}

const DEFAULT_ESTIMATE: Required<TokenEstimateOptions> = {
  cjkPerChar: 1,
  wideSymbolPerChar: 0.8,
  latinPerChar: 0.28,
  emojiPerChar: 1.5,
}

/**
 * 剥离 dataURL 与长 base64 块，替换为等长的占位标记。
 *
 * 为什么必须做：视觉巡检工具（take_camera_snapshot）会把整张图的 base64
 * 塞进 tool 消息，单张可达数兆字符。若按原样估算，一个请求的"输入 token"
 * 会被算成数万 —— 历史上出现过 `13376.21` 这类异常扣费就是这么来的。
 */
export function stripBinaryPayload(text: string): string {
  if (!text) return ''
  // 先剥 dataURL（形态明确，绝不会误伤自然语言）
  const withoutDataUrl = text.replace(
    /data:[a-zA-Z0-9+\-./]+;base64,([A-Za-z0-9+/=]+)/g,
    (_m, b64: string) => `<bin:${b64.length}>`,
  )
  // 再剥「裸 base64 长串」，但必须要求串内**同时出现大小写**（真实 base64 的统计特征）。
  // 否则 'A'.repeat(50000) 这种合法文本（重复字符、自然语言、测试数据）会被误判成
  // base64 整段吞掉 —— 实测会把 50000 字符算成 4 token，估算严重失真。
  return withoutDataUrl.replace(/[A-Za-z0-9+/]{96,}={0,2}/g, (m) => {
    if (!/[a-z]/.test(m) || !/[A-Z]/.test(m)) return m
    return `<bin:${m.length}>`
  })
}

/** 字符分类计数（单次遍历，避免多次正则扫描大字符串） */
function classify(text: string): { cjk: number; wide: number; emoji: number; latin: number } {
  let cjk = 0
  let wide = 0
  let emoji = 0
  let latin = 0
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    if (
      (code >= 0x4e00 && code <= 0x9fff) || // CJK 统一表意
      (code >= 0x3400 && code <= 0x4dbf) || // CJK 扩展 A
      (code >= 0xf900 && code <= 0xfaff) // CJK 兼容表意
    ) {
      cjk++
    } else if (
      (code >= 0x3000 && code <= 0x303f) || // CJK 标点
      (code >= 0xff00 && code <= 0xffef) || // 全角字符
      (code >= 0x3040 && code <= 0x30ff) // 平假名 / 片假名
    ) {
      wide++
    } else if (code >= 0x1f300 && code <= 0x1faff) {
      // emoji 与扩展符号平面
      emoji++
    } else {
      latin++
    }
  }
  return { cjk, wide, emoji, latin }
}

/**
 * 估算文本 token。
 *
 * @param input 任意输入（字符串 / 对象 / null）。对象会 JSON 化后估算。
 * @param options 口径覆盖（一般不用传）
 */
export function estimateContextTokens(
  input: unknown,
  options?: TokenEstimateOptions,
): number {
  const opt = { ...DEFAULT_ESTIMATE, ...options }
  if (input == null) return 0
  const raw = typeof input === 'string' ? input : safeStringify(input)
  if (!raw) return 0
  const text = stripBinaryPayload(raw)
  const { cjk, wide, emoji, latin } = classify(text)
  const tokens =
    cjk * opt.cjkPerChar +
    wide * opt.wideSymbolPerChar +
    emoji * opt.emojiPerChar +
    latin * opt.latinPerChar
  return Math.ceil(tokens)
}

/** 消息数组的 token 估算（只取语言文本，跳过 base64 图片本体） */
export function estimateMessagesTokens(messages: unknown[]): number {
  if (!Array.isArray(messages)) return 0
  let total = 0
  for (const m of messages) {
    if (!m || typeof m !== 'object') continue
    const msg = m as {
      content?: string | Array<{ type?: string; text?: string }>
      tool_calls?: Array<{ function?: { name?: string; arguments?: string } }>
      /** thinking 模式的推理字段（回传给上游，同样占输入 token） */
      reasoning_content?: string | unknown[]
      reasoning?: string | unknown[]
    }
    const c = msg.content
    if (typeof c === 'string') {
      total += estimateContextTokens(c)
    } else if (Array.isArray(c)) {
      for (const part of c) {
        if (!part || typeof part !== 'object') continue
        // 只计文本部分；image_url 的 base64 本体不计（模型按图块计费，与文本不同量纲）
        if (part.type === 'text' && typeof part.text === 'string') {
          total += estimateContextTokens(part.text)
        }
      }
    }
    if (Array.isArray(msg.tool_calls)) {
      for (const tc of msg.tool_calls) {
        if (tc?.function?.arguments) total += estimateContextTokens(String(tc.function.arguments))
        if (tc?.function?.name) total += estimateContextTokens(String(tc.function.name))
      }
    }
    // 🧠 thinking 模式的推理字段（DeepSeek / Kimi K3）会随 assistant 消息回传给上游，
    // 实测按输入计费 —— 必须计入预算，否则「每轮回灌推理」会让真实占用悄悄越过窗口。
    total += estimateContextTokens(msg.reasoning_content)
    total += estimateContextTokens(msg.reasoning)
    // 每条消息的固定开销（role / 分隔符）
    total += 4
  }
  return total
}

function safeStringify(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value) ?? ''
  } catch {
    return String(value)
  }
}
