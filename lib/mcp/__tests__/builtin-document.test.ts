// @vitest-environment node
/**
 * 内置文档工具（AI 的调用面）· 契约测试
 *
 * 这一层是**模型真正看到的接口**，所以要锁的不是一个函数的返回值，而是
 * 「模型会怎么用它、用错了会得到什么」：
 *   1. 不给 file_id 时返回本轮上传清单，并且**明确要求下一步带 file_id**
 *      （模型最容易犯的错就是凭空编一个 file_id 出来）
 *   2. 给错 file_id 时返回可执行的纠错提示，而不是抛异常炸掉整轮对话
 *   3. 产物一定带 `artifacts`（前端靠它画下载卡）—— 这是「AI 说已生成但界面一片空白」
 *      这类事故的唯一防线
 *   4. 越权（跨用户 / 无上下文）一律拒绝
 *   5. 参数错误要当场说清，而不是等渲染阶段才炸
 */

import { describe, it, expect, vi } from 'vitest'
import os from 'node:os'
import path from 'node:path'

// 视觉链路不参与本次校验：只走文本路径，避免测试依赖模型与密钥
vi.mock('@/lib/documents/multimodal', () => ({
  makeDescribeImage: vi.fn(() => async () => null),
  describeImage: vi.fn(async () => null),
}))

process.env.BERRY_DOC_DIR = path.join(os.tmpdir(), `berry-doc-tool-test-${process.pid}`)

import { executeDocumentTool } from '../builtin-document'

const USER = 9101
const CTX = { userId: USER, sessionId: 'tool-test-session' } as any

const MARKDOWN = `## 一、背景

本季度设备在线率出现波动。

| 指标 | 上季度 | 本季度 |
| --- | --- | --- |
| 在线率 | 96.2% | 92.7% |

## 二、结论

整体可用性仍处于可接受区间。
`
const ANCHOR = '整体可用性仍处于可接受区间'

describe('document_read', () => {
  it('不带 file_id：返回本轮上传清单 + 要求下一步带 file_id', async () => {
    const r = await executeDocumentTool('document_read', {}, {
      ...CTX,
      userDocuments: [{ fileId: 'f'.repeat(36), fileName: '报告.docx', format: 'docx', sizeText: '10.8 KB' }],
    })
    expect(r.success).toBe(true)
    expect((r as any).data.text).toContain('报告.docx')
    expect((r as any).data.text).toContain('f'.repeat(36))
    expect((r as any).data.text).toContain('不要凭空编造 file_id')
  })

  it('不带 file_id 且没有文件：说清「还没有」并给出两条出路', async () => {
    const r = await executeDocumentTool('document_read', {}, { ...CTX, conversationId: 'empty-session' })
    expect(r.success).toBe(true)
    expect((r as any).data.files).toEqual([])
    expect((r as any).data.text).toContain('还没有文件')
  })

  it('带 file_id：正文能原样读回', async () => {
    const created = await executeDocumentTool('document_create', {
      format: 'docx',
      title: '季度设备巡检报告',
      markdown: MARKDOWN,
    }, CTX)
    const fileId = (created as any).data.artifacts[0].fileId as string

    const r = await executeDocumentTool('document_read', { file_id: fileId }, CTX)
    expect(r.success).toBe(true)
    expect((r as any).data.text).toContain(ANCHOR)
    expect((r as any).data.stats.tables).toBe(1)
  })

  it('错误的 file_id：失败但给出纠错指引（不抛异常）', async () => {
    const r = await executeDocumentTool('document_read', { file_id: 'nope' }, CTX)
    expect(r.success).toBe(false)
    expect(r.error).toContain('找不到文件')
  })

  it('无用户上下文：拒绝而不是越权读取', async () => {
    const r = await executeDocumentTool('document_read', {}, undefined)
    expect(r.success).toBe(false)
    expect(r.error).toContain('缺少用户上下文')
  })
})

describe('document_create', () => {
  it('未知格式：明确列出可选值', async () => {
    const r = await executeDocumentTool('document_create', { format: 'pages', title: 'x', markdown: 'y' }, CTX)
    expect(r.success).toBe(false)
    expect(r.error).toContain('docx / xlsx / pptx / pdf / md')
  })

  it('缺 title：拦在生成之前', async () => {
    const r = await executeDocumentTool('document_create', { format: 'docx', markdown: 'y' }, CTX)
    expect(r.success).toBe(false)
    expect(r.error).toContain('title')
  })

  it('成功时同时给模型摘要和给前端的 artifacts', async () => {
    const r = await executeDocumentTool('document_create', {
      format: 'pptx',
      title: '季度设备巡检报告',
      markdown: MARKDOWN,
    }, CTX)
    const data = (r as any).data
    expect(r.success).toBe(true)
    expect(data.artifacts).toHaveLength(1)
    expect(data.artifacts[0].downloadUrl).toMatch(/^\/api\/documents\/.+\/download$/)
    expect(data.text).toContain('已生成')
    expect(data.document.kind).toBe('created')
  })
})

describe('document_edit', () => {
  it('缺少 file_id：提示先用 document_read 列文件', async () => {
    const r = await executeDocumentTool('document_edit', { ops: [{ op: 'replace_text', find: 'a', replace: 'b' }] }, CTX)
    expect(r.success).toBe(false)
    expect(r.error).toContain('document_read')
  })

  it('空 ops：把可用操作写在错误里', async () => {
    const r = await executeDocumentTool('document_edit', { file_id: 'f'.repeat(36), ops: [] }, CTX)
    expect(r.success).toBe(false)
    expect(r.error).toContain('replace_text')
  })

  it('PDF：拒绝并给出「读取后重新生成」的替代路径', async () => {
    const created = await executeDocumentTool('document_create', {
      format: 'pdf',
      title: '季度设备巡检报告',
      markdown: MARKDOWN,
    }, CTX)
    const fileId = (created as any).data.artifacts[0].fileId as string

    const r = await executeDocumentTool('document_edit', {
      file_id: fileId,
      ops: [{ op: 'replace_text', find: '在线率', replace: '在线率X' }],
    }, CTX)
    expect(r.success).toBe(false)
    expect(r.error).toContain('document_create')
  })

  it('改完是新文件，原件内容不受影响', async () => {
    const created = await executeDocumentTool('document_create', {
      format: 'docx',
      title: '季度设备巡检报告',
      markdown: MARKDOWN,
    }, CTX)
    const fileId = (created as any).data.artifacts[0].fileId as string

    const r = await executeDocumentTool('document_edit', {
      file_id: fileId,
      ops: [{ op: 'replace_text', find: '96.2%', replace: '96.4%' }],
    }, CTX)
    expect(r.success).toBe(true)
    const artifact = (r as any).data.artifacts[0]
    expect(artifact.fileId).not.toBe(fileId)

    const reread = await executeDocumentTool('document_read', { file_id: artifact.fileId }, CTX)
    expect((reread as any).data.text).toContain('96.4%')
    const original = await executeDocumentTool('document_read', { file_id: fileId }, CTX)
    expect((original as any).data.text).toContain('96.2%')
  })
})

describe('兜底', () => {
  it('未知工具名：直接报错而不是返回空成功', async () => {
    const r = await executeDocumentTool('document_wat', {}, CTX)
    expect(r.success).toBe(false)
    expect(r.error).toContain('未知的文档工具')
  })
})
