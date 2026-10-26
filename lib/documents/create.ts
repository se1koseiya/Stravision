/**
 * 生成统一入口
 *
 * 工具层调用 `createDocument({ format, title, markdown, ... })` 拿到 ArtifactRef，
 * 不关心渲染细节。四种格式的差异全部收敛在这里。
 */

import { parseMarkdown, splitChapters } from './render/markdown'
import { renderDocx } from './render/docx'
import { renderXlsx, type SheetSpec } from './render/xlsx'
import { renderPptx } from './render/pptx'
import { renderPdf } from './render/pdf'
import { putDocument, sanitizeFileName, toArtifactRef } from './store'
import type { ArtifactRef, WritableFormat } from './types'

export interface CreateDocumentInput {
  format: WritableFormat
  /** 文档标题（也用作文件名与封面标题） */
  title: string
  subtitle?: string
  /** 正文（Markdown）。docx / pptx / pdf / md 使用 */
  markdown?: string
  /** 表格数据（xlsx 使用；不给则尝试从 markdown 里取第一张表） */
  sheets?: SheetSpec[]
  author?: string
  /** 是否生成封面页（docx/pdf），pptx 恒有封面 */
  cover?: boolean
  fileName?: string
  userId: number
  sessionId?: string
}

const EXT: Record<WritableFormat, string> = {
  docx: 'docx',
  xlsx: 'xlsx',
  pptx: 'pptx',
  pdf: 'pdf',
  md: 'md',
}

export async function createDocument(input: CreateDocumentInput): Promise<ArtifactRef> {
  const format = input.format
  if (!EXT[format]) throw new Error(`不支持生成 ${format} 格式`)

  const title = (input.title || '').trim() || '未命名文档'
  const markdown = input.markdown ?? ''
  const blocks = parseMarkdown(markdown)

  let buf: Buffer
  // 预览模型：PPTX 走结构化模型（浏览器没有 pptx 渲染器），
  // 其余格式前端直接解析二进制，不需要服务端额外留一份。
  let previewModel: unknown
  switch (format) {
    case 'docx':
      buf = await renderDocx(blocks, {
        title,
        subtitle: input.subtitle,
        author: input.author,
        cover: input.cover,
      })
      break

    case 'pdf':
      buf = await renderPdf(blocks, {
        title,
        subtitle: input.subtitle,
        author: input.author,
        cover: input.cover,
      })
      break

    case 'pptx': {
      const chapters = splitChapters(blocks, title)
      const res = await renderPptx(blocks, chapters, { title, subtitle: input.subtitle, author: input.author })
      buf = res.buf
      previewModel = res.preview
      break
    }

    case 'xlsx': {
      const sheets = input.sheets?.length ? input.sheets : sheetsFromMarkdown(blocks, title)
      buf = await renderXlsx(sheets, { title, author: input.author })
      break
    }

    case 'md':
      buf = Buffer.from(`# ${title}\n\n${markdown}`.trim() + '\n', 'utf8')
      break

    default:
      throw new Error(`不支持生成 ${format} 格式`)
  }

  const fileName = sanitizeFileName(input.fileName || `${title}.${EXT[format]}`)
  // 用户给的 fileName 可能没有（或写错）扩展名，这里强制对齐格式
  const withExt = /\.[a-z0-9]{2,5}$/i.test(fileName) ? fileName : `${fileName}.${EXT[format]}`

  const meta = await putDocument({
    buf,
    fileName: withExt,
    format,
    userId: input.userId,
    origin: 'generated',
    sessionId: input.sessionId,
    previewModel,
  })

  return toArtifactRef(meta)
}

/**
 * 从 Markdown 里提炼表格数据。
 *
 * 模型经常只给 markdown 正文就要求出 Excel。这时最合理的降级是：
 * 把正文里每张表变成一个工作表；一张表都没有，则把「二级标题 + 段落」排成两列表格。
 */
function sheetsFromMarkdown(blocks: ReturnType<typeof parseMarkdown>, title: string): SheetSpec[] {
  const tables = blocks.filter(b => b.type === 'table')
  if (tables.length) {
    return tables.map((t, i) => {
      if (t.type !== 'table') throw new Error('unreachable')
      return {
        name: t.headers[0] ? `${i + 1}-${t.headers[0]}`.slice(0, 28) : `Sheet${i + 1}`,
        headers: t.headers,
        rows: t.rows,
      }
    })
  }

  // 没有表格：按标题 + 段落成立两列
  const rows: Array<[string, string]> = []
  let currentHeading = ''
  for (const b of blocks) {
    if (b.type === 'heading') currentHeading = b.text
    else if (b.type === 'paragraph') rows.push([currentHeading || title, b.text.slice(0, 200)])
  }
  return [
    {
      name: '内容',
      headers: ['章节', '内容'],
      rows: rows.length ? rows : [['内容', '（原始内容无表格结构，已按章节整理）']],
    },
  ]
}
