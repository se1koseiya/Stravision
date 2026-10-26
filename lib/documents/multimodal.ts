/**
 * 文档内图片的多模态理解
 *
 * ## 为什么这不是 OCR
 *
 * 传统文档解析链是「图片 → OCR 引擎 → 文本」。它有三个硬伤：
 *   · 扫描件的中文表格识别率低，列错位之后模型读到的是乱码表格；
 *   · 图表（折线/柱状）OCR 只能拿到坐标轴数字，拿不到"趋势"；
 *   · 需要额外常驻一个 OCR 服务/二进制依赖。
 *
 * 而现在的对话模型本身就是多模态的 —— 直接把图片喂给它，让它**理解**而不是**识别**：
 * 扫描页转成带层级的文字、图表转成趋势描述、照片转成客观描述。
 *
 * 这里只负责「把图片变成一段可靠的文字」，不关心它属于哪个文档；
 * 调用点见 extract/pdf.ts（扫描页）、extract/docx.ts、extract/pptx.ts。
 */

import { callVisionModel } from '../ai/vision/vision-gateway'

/** 单次转写的输出上限（扫描页整页文字通常在 800~1500 字） */
const TRANSCRIBE_MAX_TOKENS = 3000

const SYSTEM_PROMPT = `你是文档图像解析器。你的输出会被直接拼进一份文档的文本里，供另一个模型阅读与编辑。

硬性要求：
1. 只输出图片中真实存在的内容，绝不补全、不推测、不添加解释性套话。
2. 保持原文的阅读顺序与层级：标题单独一行，段落之间空一行，列表保留 • 前缀。
3. 图片里如果有表格，必须转成 Markdown 管道表（含表头分隔行），列要对齐。
4. 如果是图表（折线/柱状/饼图等），输出三部分：图表标题、坐标轴含义与单位、关键数据点与趋势结论。
5. 如果是一张照片/示意图，用 2-4 句客观描述画面内容，不要抒情。
6. 无法辨认的字符用 □ 占位，不要猜。整张图确实没有可读内容时只输出：无可读内容。`

export interface DescribeImageOptions {
  /** 用户当前选择的模型（多模态优先用它，保持"界面选的模型"与"实际干活的模型"一致） */
  model?: string
  /** 用户自定义密钥（自定义 provider 场景） */
  apiKey?: string
  apiUrl?: string
  timeoutMs?: number
}

/**
 * 把一张图片转成文字。
 *
 * 失败时返回 null（而不是抛错）：文档读取的主流程不能因为某张图转写失败而中断，
 * 上层会把该图标记为「未转写」并继续。
 */
export async function describeImage(
  dataUrl: string,
  hint: string,
  options: DescribeImageOptions = {},
): Promise<string | null> {
  const res = await callVisionModel({
    images: [dataUrl],
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: `这张图片来自文档《${hint}》。请按系统要求转写其中的全部可读内容。`,
    model: options.model,
    apiKey: options.apiKey,
    apiUrl: options.apiUrl,
    temperature: 0.1,
    maxTokens: TRANSCRIBE_MAX_TOKENS,
    timeoutMs: options.timeoutMs ?? 90_000,
  })

  if (!res.ok || !res.text) {
    console.warn('[documents/multimodal] 图片转写失败:', res.error?.slice(0, 200))
    return null
  }

  const text = res.text.trim()
  if (!text || /^无可读内容[。.]?$/.test(text)) return null
  return text
}

/** 把转写回调绑定到具体的模型/凭据上，交给 extract 层使用 */
export function makeDescribeImage(
  options: DescribeImageOptions = {},
): (dataUrl: string, hint: string) => Promise<string | null> {
  return (dataUrl, hint) => describeImage(dataUrl, hint, options)
}
