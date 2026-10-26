/**
 * 文档格式嗅探
 *
 * ## 为什么不信扩展名
 *
 * 用户在对话里上传的「报告.docx」有相当比例其实是：
 *   · WPS 导出的旧版 .doc（CFB 容器，mammoth 根本读不了）
 *   · 改了后缀的 pdf / 图片
 *   · 空文件或下载失败留下的 HTML 错误页
 * 只看后缀会把这些送进正确的解析器再抛一个看不懂的异常。
 *
 * 这里的判定顺序：**魔数 → 容器内部结构 → 扩展名**，后缀只作最后兜底。
 *
 * docx / xlsx / pptx 三者都是 ZIP，光看 `PK\x03\x04` 分不出来，
 * 必须看 ZIP 中央目录里的固定成员：
 *   · docx → `word/document.xml`
 *   · xlsx → `xl/workbook.xml`
 *   · pptx → `ppt/slides/slide1.xml`
 */

import type { DocFormat } from './types'

/** 扩展名 → 候选格式（仅兜底用） */
const EXT_MAP: Record<string, DocFormat> = {
  pdf: 'pdf',
  docx: 'docx',
  xlsx: 'xlsx',
  pptx: 'pptx',
  md: 'md',
  markdown: 'md',
  txt: 'txt',
  log: 'txt',
  csv: 'csv',
  tsv: 'csv',
  json: 'json',
  html: 'html',
  htm: 'html',
}

/**
 * 「容器型」格式：内容必须是二进制结构（魔数或 ZIP 成员）。
 *
 * 这些扩展名**不能**在"内容是纯文本"时被采信 —— 见下面第 5 步的注释：
 * 一个改了后缀的 .txt 如果被当成 docx 放行，用户会看到"上传成功"，
 * 然后 AI 一读就报错，而错误现场已经是几轮之后了。
 */
const CONTAINER_FORMATS: ReadonlySet<DocFormat> = new Set<DocFormat>(['pdf', 'docx', 'xlsx', 'pptx'])

/** 旧版 Office 二进制容器（CFB / OLE2）魔数 —— 明确报错而不是含糊失败 */
const CFB_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]

export interface SniffResult {
  format: DocFormat | null
  /** 嗅探依据，便于排障与向用户解释 */
  evidence: string
  /** 旧版 Office 格式的提示（含建议） */
  legacyHint?: string
}

function startsWith(buf: Buffer, bytes: number[]): boolean {
  if (buf.length < bytes.length) return false
  return bytes.every((b, i) => buf[i] === b)
}

/**
 * 只读 ZIP 中央目录里的文件名，不解压任何内容。
 *
 * 为什么不用 JSZip.loadAsync：那会把整个包解压建索引，50MB 的 pptx 要几百毫秒到数秒，
 * 而我们只需要知道「这是 docx 还是 xlsx」。中央目录本身就在文件末尾，读几百字节即可。
 */
export function listZipEntries(buf: Buffer, limit = 4000): string[] {
  const names: string[] = []
  // 找 EOCD（0x06054b50），从尾部往前扫（最大注释 65535 字节）
  const minEocd = Math.max(0, buf.length - 65557)
  let eocd = -1
  for (let i = buf.length - 22; i >= minEocd; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) return names

  let cdOffset = buf.readUInt32LE(eocd + 16)
  const total = buf.readUInt16LE(eocd + 10)
  // ZIP64：偏移饱和成 0xFFFFFFFF，此处直接放弃（Office 文档几乎不会超过 4GB）
  if (cdOffset === 0xffffffff) return names

  for (let n = 0; n < total && names.length < limit; n++) {
    if (cdOffset + 46 > buf.length || buf.readUInt32LE(cdOffset) !== 0x02014b50) break
    const nameLen = buf.readUInt16LE(cdOffset + 28)
    const extraLen = buf.readUInt16LE(cdOffset + 30)
    const commentLen = buf.readUInt16LE(cdOffset + 32)
    const nameStart = cdOffset + 46
    if (nameStart + nameLen > buf.length) break
    names.push(buf.toString('utf8', nameStart, nameStart + nameLen))
    cdOffset = nameStart + nameLen + extraLen + commentLen
  }
  return names
}

/**
 * 嗅探格式。
 *
 * @param buf 文件内容
 * @param fileName 原始文件名（只用于兜底与错误提示）
 */
export function sniffFormat(buf: Buffer, fileName: string): SniffResult {
  const ext = (fileName.split('.').pop() || '').toLowerCase()

  if (buf.length === 0) {
    return { format: null, evidence: '文件为空（0 字节）' }
  }

  // 1) PDF
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { format: 'pdf', evidence: '魔数 %PDF-' }
  }

  // 2) 旧版 Office（doc/xls/ppt）—— CFB 容器
  if (startsWith(buf, CFB_MAGIC)) {
    const legacy = ext === 'xls' ? 'xlsx' : ext === 'ppt' ? 'pptx' : 'docx'
    return {
      format: null,
      evidence: 'OLE2/CFB 旧版 Office 容器',
      legacyHint:
        `这是旧版 Office 二进制格式（.${ext || 'doc/xls/ppt'}），无法直接解析。` +
        `请用 Word/WPS 打开后「另存为 .${legacy}」再上传。`,
    }
  }

  // 3) ZIP 家族（OpenXML / ODF / 普通压缩包）
  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04]) || startsWith(buf, [0x50, 0x4b, 0x05, 0x06])) {
    const entries = listZipEntries(buf)
    // 用最长公共前缀判断，避免 `word/document.xml` 这种精确匹配被 WPS 的变体漏掉
    if (entries.some(e => e === 'word/document.xml' || e.startsWith('word/'))) {
      return { format: 'docx', evidence: 'ZIP 内含 word/' }
    }
    if (entries.some(e => e === 'xl/workbook.xml' || e.startsWith('xl/'))) {
      return { format: 'xlsx', evidence: 'ZIP 内含 xl/' }
    }
    if (entries.some(e => e.startsWith('ppt/slides/') || e === 'ppt/presentation.xml')) {
      return { format: 'pptx', evidence: 'ZIP 内含 ppt/slides/' }
    }
    if (entries.includes('mimetype') && (ext === 'odt' || ext === 'ods' || ext === 'odp')) {
      return {
        format: null,
        evidence: 'ODF 开放文档格式',
        legacyHint: '暂不支持 ODF（.odt/.ods/.odp），请另存为对应的 OOXML 格式（.docx/.xlsx/.pptx）。',
      }
    }
    return {
      format: null,
      evidence: '普通 ZIP 压缩包',
      legacyHint: '这是一个压缩包，不是 Office 文档。请先解压，再上传其中的文件。',
    }
  }

  // 4) 图片（模型可直接看，交给视觉链路而不是文档解析）
  const imgMagic: Array<[DocFormat | null, number[], string]> = [
    [null, [0x89, 0x50, 0x4e, 0x47], 'PNG 图片'],
    [null, [0xff, 0xd8, 0xff], 'JPEG 图片'],
    [null, [0x47, 0x49, 0x46, 0x38], 'GIF 图片'],
  ]
  for (const [, magic, label] of imgMagic) {
    if (startsWith(buf, magic)) {
      return { format: null, evidence: label, legacyHint: `${label}无需文档解析，可直接作为图片理解。` }
    }
  }

  // 5) 文本类 —— 二进制探测 + 扩展名
  if (EXT_MAP[ext]) {
    const sample = buf.subarray(0, 4096)
    // 含 NUL 字节基本可以断定不是文本（UTF-16 除外，但 Office 文本极少）
    const hasNul = sample.includes(0)
    if (!hasNul) {
      const declared = EXT_MAP[ext]
      // 走到这里说明上面所有魔数都没命中。若后缀声称是 docx/xlsx/pptx/pdf，
      // 而内容是一段干净文本 —— 那是改了后缀，不是 Office 文档。
      // 放行的后果特别隐蔽：上传成功（200），预览解析失败（静默 null），
      // 直到 AI 真正要读时才报错，用户已经不知道是哪一步坏了。
      if (CONTAINER_FORMATS.has(declared)) {
        return {
          format: null,
          evidence: `内容与后缀不符（实际是纯文本，后缀却是 .${ext}）`,
          legacyHint:
            `这个文件里没有 ${declared.toUpperCase()} 的结构，只有纯文本 —— 后缀可能被改过。` +
            `按文本上传请改名为 .txt；确实要 ${declared.toUpperCase()}，请用原始软件另存为 .${declared}。`,
        }
      }
      return { format: declared, evidence: `文本内容 + 扩展名 .${ext}` }
    }
  }

  // 6) 无扩展名但内容明显是文本
  const sample = buf.subarray(0, 4096)
  if (!sample.includes(0)) {
    const text = sample.toString('utf8')
    if (/^\s*[{[<]/.test(text)) {
      return { format: 'json', evidence: '无扩展名，内容以括号开头' }
    }
    return { format: 'txt', evidence: '无扩展名，内容为纯文本' }
  }

  return {
    format: null,
    evidence: `无法识别（扩展名 .${ext || '无'}，前 8 字节 ${buf.subarray(0, 8).toString('hex')}）`,
  }
}

/** 供工具层使用的友好报错文案 */
export function unsupportedFormatMessage(r: SniffResult, fileName: string): string {
  const base = `无法识别「${fileName}」的格式：${r.evidence}`
  return r.legacyHint ? `${base}。${r.legacyHint}` : `${base}。支持 pdf / docx / xlsx / pptx / md / txt / csv / json / html。`
}
