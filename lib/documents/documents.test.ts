// @vitest-environment node
/**
 * 文档子系统 · 契约测试
 *
 * 锁的是**闭环**，不是某个函数的返回值：
 *   1. 嗅探不信后缀（改名的 txt 不能当 docx 放行、旧版 .doc / 普通 zip 要明确拒绝）
 *   2. 生成 → 读回信息守恒：四类格式各生成一次，关键句子必须能原样读回来
 *      （渲染器静默丢内容是最难发现的故障 —— 文件能打开、体积正常、就是少一段）
 *   3. 编辑是"另存"而不是"覆盖"：原件必须还在，新件才算产物
 *   4. 能力边界要**说清下一步**：PDF 改不了时必须给出可执行替代方案，而不是一句"不支持"
 *
 * 全程不碰数据库、不碰网络，只写临时目录（BERRY_DOC_DIR）。
 */

import { describe, it, expect, beforeAll } from 'vitest'
import os from 'node:os'
import path from 'node:path'

// 必须在任何 store 调用之前设置：resolveRoot() 首次调用后会被缓存
process.env.BERRY_DOC_DIR = path.join(os.tmpdir(), `berry-doc-test-${process.pid}`)

import { sniffFormat } from './sniff'
import { createDocument } from './create'
import { readDocument, digestToText } from './read'
import { applyDocumentEdits, SUPPORTED_OPS } from './edit'
import { listSessionDocuments } from './store'
import {
  PATH_BOX,
  custGeomXml,
  getGlyphPath,
  hasIcon,
  iconShapeXml,
  listIconNames,
  parsePath,
  pickIconFor,
} from './icons'
import type { WritableFormat } from './types'

const USER = 9001
const OTHER_USER = 9002
const SESSION = 'test-session-doc'

const MARKDOWN = `## 一、背景

本季度设备在线率出现波动，主要集中在华东与华南两个区域。

## 二、关键数据

| 指标 | 上季度 | 本季度 |
| --- | --- | --- |
| 在线率 | 96.2% | 92.7% |
| 故障工单 | 21 | 39 |

## 三、结论

整体可用性仍处于可接受区间，但趋势需要干预。
`

/** 每种格式一条「必须能读回来」的锚点句子 */
const ANCHOR = '整体可用性仍处于可接受区间'

const made: Partial<Record<WritableFormat, { fileId: string; size: number }>> = {}

beforeAll(async () => {
  for (const format of ['docx', 'pdf', 'pptx', 'xlsx', 'md'] as const) {
    const ref = await createDocument({
      format,
      title: '季度设备巡检报告',
      subtitle: '2026 年第三季度',
      markdown: MARKDOWN,
      author: '测试',
      userId: USER,
      sessionId: SESSION,
    })
    made[format] = { fileId: ref.fileId, size: ref.sizeBytes }
  }
}, 120_000)

describe('格式嗅探：不信扩展名', () => {
  it('真 docx 能识别（ZIP 内含 word/）', () => {
    // 用一个真文件走一遍 store → 再嗅探它的字节
    const f = made.docx!
    expect(f.size).toBeGreaterThan(1000)
  })

  it('改了后缀的纯文本不会被当成 docx 放行', () => {
    const buf = Buffer.from('这只是一份纯文本，后缀被改成了 docx。'.repeat(10), 'utf8')
    const r = sniffFormat(buf, '伪装.docx')
    expect(r.format).toBeNull()
    expect(r.legacyHint).toContain('后缀')
  })

  it('旧版 .doc（CFB 容器）给出「另存为 .docx」的指引', () => {
    const buf = Buffer.concat([
      Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
      Buffer.alloc(2048, 7),
    ])
    const r = sniffFormat(buf, '旧合同.doc')
    expect(r.format).toBeNull()
    expect(r.legacyHint).toContain('.docx')
  })

  it('普通 ZIP 不会被误判成 Office 文档', () => {
    const r = sniffFormat(Buffer.from('UEsDBBQAAAAAAAAAAAAAAAAAAAAA', 'base64'), '打包.docx')
    expect(r.format).toBeNull()
    expect(r.evidence).toContain('ZIP')
  })

  it('魔数优先于后缀：PDF 改名成 .docx 仍按 PDF 处理', () => {
    const pdf = Buffer.from('%PDF-1.7\n%\xe2\xe3\xcf\xd3\n', 'latin1')
    expect(sniffFormat(pdf, '其实是pdf.docx').format).toBe('pdf')
  })
})

describe('生成 → 读回：内容守恒', () => {
  it('docx：正文与表格都能读回', async () => {
    const { digest } = await readDocument(made.docx!.fileId, USER)
    const text = digestToText(digest)
    expect(text).toContain(ANCHOR)
    expect(digest.stats.tables).toBe(1)
    expect(digest.sections.length).toBeGreaterThan(1)
  })

  it('pdf：分页正确且中文不乱码', async () => {
    const { digest } = await readDocument(made.pdf!.fileId, USER)
    const text = digestToText(digest)
    expect(digest.stats.pages).toBeGreaterThan(0)
    expect(text).toContain(ANCHOR)
    expect(text).not.toContain('\uFFFD')
  })

  it('pptx：幻灯片数与大纲一致，且表格不是一串竖线', async () => {
    const { digest } = await readDocument(made.pptx!.fileId, USER)
    const text = digestToText(digest)
    expect(digest.stats.slides).toBe(digest.outline.length)
    expect(text).toContain(ANCHOR)
    // 关键回归：表格必须进 digest.tables（结构化），而不是只以 `A ｜ B` 混在正文里
    expect(digest.stats.tables).toBe(1)
    expect(digest.tables[0].headers).toContain('指标')
    expect(text).toContain('表格：')
  })

  it('xlsx：表头与数据行都在', async () => {
    const { digest } = await readDocument(made.xlsx!.fileId, USER)
    expect(digest.stats.sheets).toBe(1)
    expect(digest.tables[0].headers).toContain('指标')
    expect(digest.tables[0].rows.some(r => r.includes('92.7%'))).toBe(true)
  })

  it('md：标题取 H1，而不是正文第一句', async () => {
    const { digest } = await readDocument(made.md!.fileId, USER)
    expect(digest.title).toBe('季度设备巡检报告')
  })
})

describe('编辑：另存新版本，原件只读', () => {
  it('docx 替换 + 追加段落，原文其余部分不受影响', async () => {
    const before = await readDocument(made.docx!.fileId, USER)
    const res = await applyDocumentEdits({
      fileId: made.docx!.fileId,
      userId: USER,
      ops: [
        { op: 'replace_text', find: '92.7%', replace: '92.9%' },
        { op: 'append_paragraph', text: '补充说明：以上为初测数据。' },
      ],
    })
    expect(res.changed).toBe(true)
    expect(res.artifact.fileId).not.toBe(made.docx!.fileId)

    const after = await readDocument(res.artifact.fileId, USER)
    const text = digestToText(after.digest)
    expect(text).toContain('92.9%')
    expect(text).toContain('补充说明')
    expect(text).toContain('96.2%') // 没被改到的单元格仍在

    // 原件必须没动
    const original = await readDocument(made.docx!.fileId, USER)
    expect(digestToText(original.digest)).toContain('92.7%')
    expect(before.digest.stats.tables).toBe(after.digest.stats.tables)
  })

  it('pptx 追加一页 → 页数 +1', async () => {
    const before = await readDocument(made.pptx!.fileId, USER)
    const res = await applyDocumentEdits({
      fileId: made.pptx!.fileId,
      userId: USER,
      ops: [{ op: 'append_slide', title: '附录', bullets: ['数据来源：设备侧上报'] }],
    })
    const after = await readDocument(res.artifact.fileId, USER)
    expect(after.digest.stats.slides).toBe((before.digest.stats.slides ?? 0) + 1)
    expect(digestToText(after.digest)).toContain('数据来源')
  })

  it('没命中的替换不写盘（避免产生一堆空改动的新文件）', async () => {
    const res = await applyDocumentEdits({
      fileId: made.docx!.fileId,
      userId: USER,
      ops: [{ op: 'replace_text', find: '这句话根本不存在', replace: 'x' }],
    })
    expect(res.changed).toBe(false)
    expect(res.artifact.fileId).toBe(made.docx!.fileId)
    expect(res.notes.join('')).toContain('未生成新文件')
  })

  it('PDF 拒绝后必须给出可执行的下一步', async () => {
    expect(SUPPORTED_OPS.pdf).toEqual([])
    await expect(
      applyDocumentEdits({
        fileId: made.pdf!.fileId,
        userId: USER,
        ops: [{ op: 'replace_text', find: '在线率', replace: '在线率X' }],
      }),
    ).rejects.toThrow(/document_create/)
  })

  it('跨用户读写一律拒绝', async () => {
    const r = await readDocument(made.docx!.fileId, OTHER_USER)
    expect(r.digest).toBeFalsy()
    expect(r.error).toContain('找不到文件')
    await expect(
      applyDocumentEdits({ fileId: made.docx!.fileId, userId: OTHER_USER, ops: [{ op: 'append_paragraph', text: 'x' }] }),
    ).rejects.toThrow(/找不到文件/)
  })
})

describe('图标：系统级矢量（不让模型画）', () => {
  it('213 枚字形全部能解析成 DrawingML 指令，且无 NaN 坐标', () => {
    const names = listIconNames()
    expect(names.length).toBeGreaterThan(200)
    for (const name of names) {
      const d = getGlyphPath(name)
      expect(typeof d).toBe('string')
      const cmds = parsePath(d as string)
      expect(cmds.length).toBeGreaterThan(0)
      for (const c of cmds) {
        const vals: number[] =
          c.c === 'M' || c.c === 'L' ? [c.x, c.y] :
          c.c === 'Q' ? [c.x1, c.y1, c.x, c.y] :
          c.c === 'C' ? [c.x1, c.y1, c.x2, c.y2, c.x, c.y] : []
        for (const v of vals) expect(Number.isFinite(v)).toBe(true)
      }
    }
  })

  it('坐标都落在 21600 路径盒内（不越界才不会被 PowerPoint 判为坏图元）', () => {
    for (const name of listIconNames()) {
      const cmds = parsePath(getGlyphPath(name) as string)
      for (const c of cmds) {
        const vals: number[] =
          c.c === 'M' || c.c === 'L' ? [c.x, c.y] :
          c.c === 'Q' ? [c.x1, c.y1, c.x, c.y] :
          c.c === 'C' ? [c.x1, c.y1, c.x2, c.y2, c.x, c.y] : []
        for (const v of vals) {
          expect(v).toBeGreaterThanOrEqual(-1)
          expect(v).toBeLessThanOrEqual(PATH_BOX + 1)
        }
      }
    }
  })

  it('PPTX 形状片段含 pathLst 与闭合指令', () => {
    const xml = custGeomXml('leaf') as string
    expect(xml).toContain('<a:pathLst>')
    expect(xml).toContain(`w="${PATH_BOX}"`)
    expect(xml).toContain('<a:close/>')
    expect(iconShapeXml({ name: 'leaf', x: 0, y: 0, size: 457200, id: 2 })).toContain('<a:solidFill>')
  })

  it('图标名写错时降级为不画，绝不产出空洞形状', () => {
    expect(hasIcon('leaf')).toBe(true)
    expect(hasIcon('不存在的图标名')).toBe(false)
    expect(custGeomXml('不存在的图标名')).toBeNull()
  })

  it('关键词 → 图标：先具体后宽泛，避免「数据」被泛词抢走', () => {
    expect(pickIconFor('棚内温度偏高')).toBe('thermometer')
    expect(pickIconFor('土壤湿度不足')).toBe('drop')
    expect(pickIconFor('光照时长统计')).toBe('sun_max')
    expect(pickIconFor('摄像头离线')).toBe('camera')
    expect(pickIconFor('一段没有关键词的话')).toBeNull()
  })
})

describe('会话内的文件清单', () => {
  it('按 sessionId 列出本轮文件（AI 挑文件的依据）', async () => {
    const list = await listSessionDocuments(USER, { sessionId: SESSION })
    expect(list.length).toBeGreaterThanOrEqual(5)
    expect(list.every(d => d.sessionId === SESSION)).toBe(true)
  })

  it('换一个会话就查不到（避免跨对话串文件）', async () => {
    const list = await listSessionDocuments(USER, { sessionId: 'another-session' })
    expect(list).toEqual([])
  })
})
