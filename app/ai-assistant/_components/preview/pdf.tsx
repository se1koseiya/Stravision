"use client"

/**
 * PDF 预览 —— 交给浏览器自带的 PDF 渲染器
 *
 * ## 为什么不引 pdfjs 在 canvas 上重画一遍
 *
 * 服务端 `extract/pdf.ts` 用 pdfjs 是为了**拿文本**（模型要读），那是它不可替代的地方。
 * 而"给人看"这件事，浏览器（含 Electron 内的 Chromium）本来就自带 PDFium：
 * 翻页、缩放、查找、打印全都有，而且是原生渲染，不走 JS 主线程。
 *
 * 换成 canvas 方案要额外付出：打包 worker 文件、处理 cmaps、自己写翻页与缩放，
 * 结果还比原生的差。所以这里只做一件事：让下载接口以 `inline` 方式给出字节。
 *
 * ## `inline` 的意义
 *
 * 默认下载接口是 `Content-Disposition: attachment`（点了就存盘）。
 * 加 `?inline=1` 后浏览器会就地打开 —— 这是能塞进 `<iframe>` 的前提。
 */

import * as React from "react"
import type { PreviewSurfaceProps } from "./types"

export default function PdfPreview({ downloadUrl }: PreviewSurfaceProps) {
  if (!downloadUrl) return null

  const src = downloadUrl.includes("?") ? `${downloadUrl}&inline=1` : `${downloadUrl}?inline=1`

  return (
    <iframe
      data-preview-surface="pdf"
      src={src}
      title="PDF 预览"
      className="h-full min-h-[60vh] w-full border-0 bg-white"
    />
  )
}
