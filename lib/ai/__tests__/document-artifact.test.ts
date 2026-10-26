/**
 * 文档产物引用（lib/ai/document-artifact.ts）的回归测试
 *
 * 这个模块存在的唯一理由：同一份 artifacts 数据在**主助手**和 **Copilot 侧栏**两个
 * SSE 解析器里各拼一遍对象，口径一漂移就出现「主助手有卡、侧栏没有」的诡异差异。
 * 所以这里锁的是「转换规则本身」，两个调用方共用同一套断言即可。
 */

import { describe, expect, it } from "vitest"
import {
  collectDocumentRefs,
  formatSizeText,
  mergeDocumentRefs,
  normalizeDocumentRefs,
  toDocumentRef,
} from "@/lib/ai/document-artifact"

const FILE_ID = "0f9a1c2d3e4b5a69788796a5b4c3d2e1"

describe("formatSizeText", () => {
  it("按 B / KB / MB 分档，非法值返回 undefined", () => {
    expect(formatSizeText(512)).toBe("512 B")
    expect(formatSizeText(20480)).toBe("20.0 KB")
    expect(formatSizeText(3 * 1024 * 1024)).toBe("3.00 MB")
    expect(formatSizeText(undefined)).toBeUndefined()
    expect(formatSizeText(-1)).toBeUndefined()
    expect(formatSizeText(Number.NaN)).toBeUndefined()
  })
})

describe("toDocumentRef", () => {
  it("完整 artifact 正常转换", () => {
    expect(
      toDocumentRef({
        fileId: FILE_ID,
        fileName: "巡检报告.docx",
        format: "docx",
        sizeBytes: 20480,
        downloadUrl: `/api/documents/${FILE_ID}/download`,
        origin: "edited",
      })
    ).toEqual({
      fileId: FILE_ID,
      fileName: "巡检报告.docx",
      format: "docx",
      sizeText: "20.0 KB",
      downloadUrl: `/api/documents/${FILE_ID}/download`,
      origin: "edited",
    })
  })

  it("缺 fileId 或 downloadUrl 一律拒绝（点不动的文件卡比不显示更糟）", () => {
    expect(toDocumentRef({ fileName: "a.docx", downloadUrl: "/api/documents/x/download" })).toBeNull()
    expect(toDocumentRef({ fileId: FILE_ID, fileName: "a.docx" })).toBeNull()
    expect(toDocumentRef(null)).toBeNull()
    expect(toDocumentRef("not-an-object")).toBeNull()
  })

  it("未知 origin 落成 generated（卡片文案「已生成」）", () => {
    const ref = toDocumentRef({ fileId: FILE_ID, fileName: "a", downloadUrl: "/api/documents/x/download" })
    expect(ref?.origin).toBe("generated")
    expect(ref?.format).toBe("bin")
  })
})

describe("collectDocumentRefs", () => {
  it("按 fileId 与已有列表去重（同一轮重复调工具不重复出卡）", () => {
    const existing = [{ fileId: FILE_ID, fileName: "a", format: "docx" }]
    const out = collectDocumentRefs(
      [
        { fileId: FILE_ID, fileName: "a", downloadUrl: `/api/documents/${FILE_ID}/download` },
        { fileId: "b".repeat(32), fileName: "b.docx", downloadUrl: "/api/documents/b/download" },
        { fileName: "脏数据，没有 fileId" },
      ],
      existing
    )
    expect(out).toHaveLength(1)
    expect(out[0].fileName).toBe("b.docx")
  })

  it("非数组 / 空数组 ⇒ 空结果", () => {
    expect(collectDocumentRefs(undefined)).toEqual([])
    expect(collectDocumentRefs(null)).toEqual([])
    expect(collectDocumentRefs([])).toEqual([])
    expect(collectDocumentRefs({ artifacts: 1 })).toEqual([])
  })
})

describe("mergeDocumentRefs", () => {
  it("合并不覆盖、同 id 用新值（改文件后元信息刷新）", () => {
    const prev = [
      { fileId: "a".repeat(32), fileName: "旧名字.docx", format: "docx" },
      { fileId: "b".repeat(32), fileName: "b.pdf", format: "pdf" },
    ]
    const next = [{ fileId: "a".repeat(32), fileName: "新名字.docx", format: "docx" }]
    const out = mergeDocumentRefs(prev, next)
    expect(out).toHaveLength(2)
    expect(out[0].fileName).toBe("新名字.docx")
    expect(out[1].fileName).toBe("b.pdf")
  })
})

describe("normalizeDocumentRefs（会话历史回放）", () => {
  it("保留 sizeText、允许无 downloadUrl（用户上传件本来就没有）", () => {
    const out = normalizeDocumentRefs([
      { fileId: FILE_ID, fileName: "合同.pdf", format: "pdf", sizeText: "1.2 MB", origin: "uploaded" },
    ])
    expect(out).toHaveLength(1)
    expect(out[0].downloadUrl).toBeUndefined()
    expect(out[0].sizeText).toBe("1.2 MB")
    expect(out[0].origin).toBe("uploaded")
  })

  it("去重 + 丢弃无 fileId 的脏数据", () => {
    const out = normalizeDocumentRefs([
      { fileId: FILE_ID, fileName: "a.docx", format: "docx" },
      { fileId: FILE_ID, fileName: "a 副本.docx", format: "docx" },
      { fileName: "无 id" },
      null,
    ])
    expect(out).toHaveLength(1)
    expect(out[0].fileName).toBe("a.docx")
  })
})
