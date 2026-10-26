/**
 * 内置文档工具包（读 / 生成 / 编辑）
 *
 * ## 为什么只有三个工具
 *
 * 「每个格式一个工具」会让模型面对 pdf_read / docx_read / xlsx_read / pptx_read +
 * 四个 write + 四个 edit = 十几个名字，它要花 token 去选，还经常选错。
 * 这里按**动作**收敛成三个，格式只作为参数 —— 模型看到用户上传的 .xlsx，
 * 天然会调 `document_read({file_id})`，不需要知道后面是 SheetJS。
 *
 * ## 返回值的两个口袋
 *
 * - `data.text`：给模型读的内容（digest 文本化），会被 compactToolResult 按预算压缩；
 * - `data.artifacts`：给前端渲染下载卡的结构化引用（fileId / fileName / downloadUrl）。
 *
 * 两者分离是必须的：文件引用一旦被压缩进自然语言，前端就再也拿不到它来画卡片了。
 */

import type { AgentToolContext, ToolCallResult } from './mcp-tool-executor'
import { createDocument } from '../documents/create'
import { readDocument, digestToText } from '../documents/read'
import { applyDocumentEdits, SUPPORTED_OPS, unsupportedEditMessage, type DocumentEditOp } from '../documents/edit'
import { listSessionDocuments, formatBytes, mimeOf } from '../documents/store'
import { makeDescribeImage } from '../documents/multimodal'
import type { SheetSpec } from '../documents/render/xlsx'
import type { WritableFormat } from '../documents/types'

export async function executeDocumentTool(
  functionName: string,
  args: Record<string, any>,
  ctx?: AgentToolContext,
): Promise<ToolCallResult> {
  switch (functionName) {
    case 'document_read':
      return await executeRead(args, ctx)
    case 'document_create':
      return await executeCreate(args, ctx)
    case 'document_edit':
      return await executeEdit(args, ctx)
    default:
      return { success: false, error: `未知的文档工具: ${functionName}` }
  }
}

/** 归一用户 ID（DB 是 BIGSERIAL，pg 运行时返回字符串） */
function uid(ctx?: AgentToolContext): number | null {
  const n = Number(ctx?.userId)
  return Number.isFinite(n) && n > 0 ? n : null
}

// ─────────────────────────────────────────────────────────────
// document_read
// ─────────────────────────────────────────────────────────────

async function executeRead(args: Record<string, any>, ctx?: AgentToolContext): Promise<ToolCallResult> {
  const userId = uid(ctx)
  if (userId === null) return { success: false, error: '当前会话缺少用户上下文，无法读取文件' }

  const fileId = String(args?.file_id ?? '').trim()

  // 不带 file_id：优先回答「本轮用户上传了什么」，其次列出本会话的历史文件。
  // 前者由 /api/chat 从请求体透传，是最准的答案；后者靠磁盘扫描，可能含更早轮次。
  if (!fileId) {
    const attached = ctx?.userDocuments ?? []
    if (attached.length) {
      return {
        success: true,
        data: {
          files: attached.map(d => ({
            file_id: d.fileId,
            file_name: d.fileName,
            format: d.format,
            size: d.sizeText,
            origin: 'uploaded',
          })),
          text: [
            '用户本轮上传的文件：',
            ...attached.map(d => `- ${d.fileName}（${d.format.toUpperCase()}${d.sizeText ? '，' + d.sizeText : ''}）file_id=${d.fileId}`),
            '',
            '下一步：用 document_read 传 file_id 读取内容。不要凭空编造 file_id。',
          ].join('\n'),
        },
      }
    }

    const list = await listSessionDocuments(userId, { sessionId: ctx?.conversationId, limit: 20 })
    if (!list.length) {
      return {
        success: true,
        data: {
          files: [],
          text: '本次对话里还没有文件。请用户先上传 PDF / Word / Excel / PPT，或先用 document_create 生成一份。',
        },
      }
    }
    return {
      success: true,
      data: {
        files: list.map(m => ({
          file_id: m.fileId,
          file_name: m.fileName,
          format: m.format,
          size: formatBytes(m.sizeBytes),
          origin: m.origin,
          created_at: new Date(m.createdAt).toISOString(),
        })),
        text: [
          '本次对话中的文件：',
          ...list.map(m => `- ${m.fileName}（${m.format.toUpperCase()}，${formatBytes(m.sizeBytes)}）file_id=${m.fileId}`),
          '',
          '请用 file_id 指定要读哪一个。',
        ].join('\n'),
      },
    }
  }

  const sections = Array.isArray(args?.sections)
    ? args.sections.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n) && n > 0)
    : undefined
  const maxChars = Number(args?.max_chars) || undefined
  const includeImages = args?.include_images === true

  ctx?.onStage?.(includeImages ? '正在解析文档并理解其中的图片…' : '正在解析文档…')

  const { digest, error } = await readDocument(fileId, userId, {
    sections,
    maxChars,
    includeImages,
    // 只有明确要求看图时才绑定视觉链路：默认让模型先读文本，成本低得多
    describeImage: includeImages ? makeDescribeImage({ model: ctx?.userModel }) : undefined,
  })

  if (!digest) return { success: false, error: error || '读取失败' }

  const text = digestToText(digest)
  return {
    success: true,
    data: {
      file_id: digest.fileId,
      file_name: digest.fileName,
      format: digest.format,
      title: digest.title,
      outline: digest.outline.slice(0, 40),
      stats: digest.stats,
      truncated: digest.truncated,
      notes: digest.notes,
      /** 渲染层用来判断「这是一份被读取的文档」 */
      document: {
        kind: 'read',
        fileId: digest.fileId,
        fileName: digest.fileName,
        format: digest.format,
        size: formatBytes(digest.sizeBytes),
      },
      text,
    },
  }
}

// ─────────────────────────────────────────────────────────────
// document_create
// ─────────────────────────────────────────────────────────────

async function executeCreate(args: Record<string, any>, ctx?: AgentToolContext): Promise<ToolCallResult> {
  const userId = uid(ctx)
  if (userId === null) return { success: false, error: '当前会话缺少用户上下文，无法生成文件' }

  const format = String(args?.format ?? '').toLowerCase() as WritableFormat
  if (!['docx', 'xlsx', 'pptx', 'pdf', 'md'].includes(format)) {
    return { success: false, error: `format 必须是 docx / xlsx / pptx / pdf / md 之一，收到 "${args?.format}"` }
  }

  const title = String(args?.title ?? '').trim()
  const content = String(args?.markdown ?? args?.content ?? '')
  if (!title) return { success: false, error: 'title 不能为空' }
  if (format !== 'xlsx' && !content.trim()) {
    return { success: false, error: 'markdown 内容不能为空（请把要写入文档的正文以 Markdown 形式传入）' }
  }

  const sheets: SheetSpec[] | undefined = Array.isArray(args?.sheets)
    ? args.sheets
        .filter((s: any) => s && Array.isArray(s.rows))
        .map((s: any) => ({
          name: String(s.name ?? 'Sheet1'),
          headers: Array.isArray(s.headers) ? s.headers.map((h: any) => String(h ?? '')) : undefined,
          rows: s.rows.map((r: any) => (Array.isArray(r) ? r.map((c: any) => (c == null ? '' : c)) : [])),
          columnWidths: Array.isArray(s.column_widths) ? s.column_widths.map(Number) : undefined,
        }))
    : undefined

  ctx?.onStage?.(`正在生成 ${format.toUpperCase()} 文件…`)

  try {
    const artifact = await createDocument({
      format,
      title,
      subtitle: args?.subtitle ? String(args.subtitle) : undefined,
      markdown: content,
      sheets,
      author: args?.author ? String(args.author) : undefined,
      cover: args?.cover === false ? false : undefined,
      fileName: args?.file_name ? String(args.file_name) : undefined,
      userId,
      sessionId: ctx?.sessionId,
    })

    return {
      success: true,
      data: {
        artifacts: [artifact],
        document: {
          kind: 'created',
          fileId: artifact.fileId,
          fileName: artifact.fileName,
          format: artifact.format,
          size: formatBytes(artifact.sizeBytes),
          downloadUrl: artifact.downloadUrl,
        },
        text:
          `已生成《${artifact.fileName}》（${artifact.format.toUpperCase()}，${formatBytes(artifact.sizeBytes)}）。` +
          `下载地址：${artifact.downloadUrl}`,
      },
    }
  } catch (e: any) {
    console.error('[document_create] 生成失败:', e)
    return { success: false, error: `生成失败：${e?.message ?? e}` }
  }
}

// ─────────────────────────────────────────────────────────────
// document_edit
// ─────────────────────────────────────────────────────────────

async function executeEdit(args: Record<string, any>, ctx?: AgentToolContext): Promise<ToolCallResult> {
  const userId = uid(ctx)
  if (userId === null) return { success: false, error: '当前会话缺少用户上下文，无法修改文件' }

  const fileId = String(args?.file_id ?? '').trim()
  if (!fileId) return { success: false, error: 'file_id 不能为空（先用 document_read 不带参数列出文件）' }

  const ops = Array.isArray(args?.ops) ? (args.ops as DocumentEditOp[]) : []
  if (!ops.length) {
    return {
      success: false,
      error:
        'ops 不能为空。可用操作：' +
        'replace_text（查找替换）/ append_paragraph（追加段落，docx）/ set_table_cell（改表格单元格，docx）' +
        ' / set_cell（改单元格，xlsx）/ append_rows（追加行，xlsx）/ set_slide_title、append_slide（pptx）',
    }
  }

  ctx?.onStage?.('正在修改文档…')

  try {
    const result = await applyDocumentEdits({
      fileId,
      userId,
      ops,
      sessionId: ctx?.sessionId,
      fileName: args?.file_name ? String(args.file_name) : undefined,
    })

    if (!result.changed) {
      return {
        success: false,
        error:
          '没有任何操作命中，文件未改动。可能原因：目标文字不在正文里（在图片/页眉页脚/备注中），' +
          '或文字被拆散在多个段落。可先用 document_read 确认原文后再试。\n' +
          result.details.map(d => `- ${d.op}: ${d.note ?? '未命中'}`).join('\n'),
      }
    }

    return {
      success: true,
      data: {
        artifacts: [result.artifact],
        document: {
          kind: 'edited',
          fileId: result.artifact.fileId,
          fileName: result.artifact.fileName,
          format: result.artifact.format,
          size: formatBytes(result.artifact.sizeBytes),
          downloadUrl: result.artifact.downloadUrl,
          sourceFileId: result.artifact.sourceFileId,
        },
        details: result.details,
        notes: result.notes,
        text:
          `已修改并另存为《${result.artifact.fileName}》（原件保留）。\n` +
          result.details.map(d => `${d.ok ? '✅' : '❌'} ${d.op}${d.note ? '：' + d.note : ''}`).join('\n') +
          (result.notes.length ? '\n' + result.notes.map(n => `· ${n}`).join('\n') : '') +
          `\n下载地址：${result.artifact.downloadUrl}`,
      },
    }
  } catch (e: any) {
    console.error('[document_edit] 编辑失败:', e)
    return { success: false, error: e?.message ?? String(e) }
  }
}

/** 供工具定义里生成「当前格式支持哪些操作」的说明（避免两处文案漂移） */
export function describeSupportedOps(): string {
  return Object.entries(SUPPORTED_OPS)
    .filter(([, ops]) => ops.length)
    .map(([fmt, ops]) => `${fmt}: ${ops.join(' / ')}`)
    .join('；')
}

export { unsupportedEditMessage, mimeOf }
