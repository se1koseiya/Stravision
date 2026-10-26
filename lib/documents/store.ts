/**
 * 文档产物存储
 *
 * ## 设计取舍
 *
 * 1. **不落 public/**。
 *    上传的文件与 AI 生成的产物都可能含用户业务数据（病历、报表），放 public 等于公开可下载。
 *    这里落在站点根下的 `.data/documents`，只经 `/api/documents/[id]/download` 鉴权流出。
 *
 * 2. **原件只读、编辑另存**。
 *    编辑一律产出新 fileId（`origin: 'edited'` + `sourceFileId`），
 *    不做原地覆盖 —— 用户的原始合同/报告被模型改坏是不可接受的损失，而版本链是免费的。
 *
 * 3. **元数据与内容分文件**。
 *    `{fileId}.bin` 是内容、`{fileId}.json` 是元数据。列表/鉴权只读 json，
 *    不需要为了「这个文件叫什么」去 touch 几十 MB 的二进制（本机 IO 有 20~100× 惩罚）。
 *
 * 4. **落盘根目录可配**。
 *    桌面端打包后 cwd 位于安装目录（可能只读），服务器上则是 /app 下。
 *    依次尝试 `BERRY_DOC_DIR` → `cwd/.data/documents` → `~/.berry-realm/documents`。
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import type { ArtifactRef, DocFormat, StoredDocumentMeta } from './types'

/** 单文件上限：50MB（超过的多为视频/超大图集，对话里传不动也不该由模型读） */
export const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024

const DOWNLOAD_BASE = '/api/documents'

let cachedRoot: string | null = null

/** 解析落盘根目录（带可写性探测，一次即可） */
async function resolveRoot(): Promise<string> {
  if (cachedRoot) return cachedRoot
  const candidates = [
    process.env.BERRY_DOC_DIR,
    path.join(process.cwd(), '.data', 'documents'),
    path.join(os.homedir(), '.berry-realm', 'documents'),
  ].filter(Boolean) as string[]

  for (const dir of candidates) {
    try {
      await fs.mkdir(dir, { recursive: true })
      // 真实写一次再删，避免「目录存在但只读」
      const probe = path.join(dir, `.write-probe-${process.pid}`)
      await fs.writeFile(probe, 'ok')
      await fs.unlink(probe)
      cachedRoot = dir
      return dir
    } catch {
      // 换下一个候选
    }
  }
  throw new Error('文档存储目录不可写：请设置 BERRY_DOC_DIR 指向一个可写目录')
}

/** 用户目录（按 uid 分区，天然隔离不同用户） */
async function userDir(userId: number): Promise<string> {
  const root = await resolveRoot()
  const dir = path.join(root, String(userId))
  await fs.mkdir(dir, { recursive: true })
  return dir
}

/**
 * 清洗文件名：只保留可读字符，绝不保留路径分隔符。
 * 中文/空格/括号都保留（用户看得懂才重要），只剔除会破坏路径与响应头的字符。
 */
export function sanitizeFileName(name: string, fallbackExt = ''): string {
  const base = (name || '')
    .replace(/[\\/:*?"<>|\r\n\t]/g, '_')
    .replace(/^\.+/, '')
    .trim()
  const clipped = base.length > 120 ? base.slice(0, 120) : base
  if (!clipped) return `未命名${fallbackExt ? '.' + fallbackExt : ''}`
  return clipped
}

function sha256(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex')
}

/** fileId 必须是 UUID 形状 —— 防止调用方传 `../` 之类的路径穿越 */
const FILE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidFileId(id: string): boolean {
  return FILE_ID_RE.test(String(id || ''))
}

export interface PutDocumentInput {
  buf: Buffer
  fileName: string
  format: DocFormat
  userId: number
  origin: ArtifactRef['origin']
  sourceFileId?: string
  sessionId?: string
  /** 结构化预览模型（我们生成的产物才有） */
  previewModel?: unknown
}

/** 落盘并登记元数据 */
export async function putDocument(input: PutDocumentInput): Promise<StoredDocumentMeta> {
  const { buf, userId, origin } = input
  if (buf.length === 0) throw new Error('文件内容为空，无法保存')
  if (buf.length > MAX_DOCUMENT_BYTES) {
    throw new Error(`文件超过 ${Math.round(MAX_DOCUMENT_BYTES / 1024 / 1024)}MB 上限（当前 ${(buf.length / 1024 / 1024).toFixed(1)}MB）`)
  }

  const dir = await userDir(userId)
  const fileId = crypto.randomUUID()
  const meta: StoredDocumentMeta = {
    fileId,
    userId,
    fileName: sanitizeFileName(input.fileName),
    format: input.format,
    sizeBytes: buf.length,
    origin,
    sourceFileId: input.sourceFileId,
    sessionId: input.sessionId,
    createdAt: Date.now(),
    sha256: sha256(buf),
    previewModel: input.previewModel,
  }

  // 先写内容再写元数据：元数据存在即代表内容已完整落盘（避免列出坏文件）
  await fs.writeFile(path.join(dir, `${fileId}.bin`), buf)
  await fs.writeFile(path.join(dir, `${fileId}.json`), JSON.stringify(meta), 'utf8')
  return meta
}

/** 读元数据；userId 不匹配视同不存在（不泄露「文件存在但不属于你」） */
export async function getDocumentMeta(fileId: string, userId: number): Promise<StoredDocumentMeta | null> {
  if (!isValidFileId(fileId)) return null
  const dir = await userDir(userId)
  try {
    const raw = await fs.readFile(path.join(dir, `${fileId}.json`), 'utf8')
    const meta = JSON.parse(raw) as StoredDocumentMeta
    if (Number(meta.userId) !== Number(userId)) return null
    return meta
  } catch {
    return null
  }
}

/** 读内容 + 元数据 */
export async function readDocument(
  fileId: string,
  userId: number,
): Promise<{ meta: StoredDocumentMeta; buf: Buffer } | null> {
  const meta = await getDocumentMeta(fileId, userId)
  if (!meta) return null
  const dir = await userDir(userId)
  try {
    const buf = await fs.readFile(path.join(dir, `${fileId}.bin`))
    return { meta, buf }
  } catch {
    return null
  }
}

/**
 * 列出会话内的文档（近 N 个）。
 *
 * 用途：模型不记得 fileId 时，`document_read` 不带参 → 列出「这次对话里有哪些文件」，
 * 避免它凭空编造 id（编造 id 是这类工具最常见的坏行为）。
 */
export async function listSessionDocuments(
  userId: number,
  opts: { sessionId?: string; limit?: number } = {},
): Promise<StoredDocumentMeta[]> {
  const dir = await userDir(userId)
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100)
  let names: string[]
  try {
    names = await fs.readdir(dir)
  } catch {
    return []
  }
  const metas: StoredDocumentMeta[] = []
  for (const n of names) {
    if (!n.endsWith('.json')) continue
    try {
      const meta = JSON.parse(await fs.readFile(path.join(dir, n), 'utf8')) as StoredDocumentMeta
      if (opts.sessionId && meta.sessionId !== opts.sessionId) continue
      metas.push(meta)
    } catch {
      // 坏元数据直接跳过，不影响列表
    }
  }
  metas.sort((a, b) => b.createdAt - a.createdAt)
  return metas.slice(0, limit)
}

/** 元数据 → 前端/工具层通用的产物引用 */
export function toArtifactRef(meta: StoredDocumentMeta): ArtifactRef {
  return {
    fileId: meta.fileId,
    fileName: meta.fileName,
    format: meta.format,
    sizeBytes: meta.sizeBytes,
    downloadUrl: `${DOWNLOAD_BASE}/${meta.fileId}/download`,
    origin: meta.origin,
    sourceFileId: meta.sourceFileId,
    createdAt: meta.createdAt,
  }
}

/** 下载响应用的 MIME */
export function mimeOf(format: DocFormat): string {
  switch (format) {
    case 'pdf':
      return 'application/pdf'
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    case 'md':
      return 'text/markdown; charset=utf-8'
    case 'csv':
      return 'text/csv; charset=utf-8'
    case 'json':
      return 'application/json; charset=utf-8'
    case 'html':
      return 'text/html; charset=utf-8'
    default:
      return 'text/plain; charset=utf-8'
  }
}

/** 人可读体积 */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}
