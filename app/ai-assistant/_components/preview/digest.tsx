"use client"

/**
 * Digest 兜底视图 —— 任何格式都能看
 *
 * ## 它解决什么
 *
 * 用户上传的 .docx / .xlsx / 扫描件 PDF 不是我们生成的，没有 previewModel。
 * 与其在浏览器里再引一套解析库（mammoth ~200KB、SheetJS ~900KB），
 * 不如直接用服务端 `document_read` 已抽好的 DocumentDigest：
 *
 *   · 零新增客户端依赖 —— 解析只在服务端做一次，两端共用；
 *   · 格式无关 —— 新格式只要能抽 Digest 就能预览；
 *   · 诚实 —— 这是"结构视图"不是像素还原，标题里就写清楚。
 *
 * ## 什么时候不用它
 *
 * 我们自己生成的 PPTX 有 previewModel，走 `pptx.tsx` 的幻灯片视图（能看到版式、
 * 图标与图表）；PDF 走 `pdf.tsx` 的浏览器原生渲染。这两条路保真度更高。
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import type { DocumentDigest } from "@/lib/documents/types"
import type { PreviewSurfaceProps } from "./types"

/** 统计行：一眼判断"这是不是我要的那份" */
function StatsRow({ stats }: { stats: DocumentDigest["stats"] }) {
  const items: string[] = []
  if (stats.pages) items.push(`${stats.pages} 页`)
  if (stats.slides) items.push(`${stats.slides} 张幻灯片`)
  if (stats.sheets) items.push(`${stats.sheets} 个工作表`)
  if (stats.paragraphs) items.push(`${stats.paragraphs} 段`)
  items.push(`${stats.chars} 字`)
  if (stats.tables) items.push(`${stats.tables} 张表`)
  if (stats.images) items.push(`${stats.images} 张图`)

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-400 dark:text-zinc-500">
    {items.map((t, i) => (
      <React.Fragment key={t}>
        {i > 0 && <span>·</span>}
        <span>{t}</span>
      </React.Fragment>
    ))}
  </div>
  )
}

/** 大纲：先看地图再决定往哪翻 */
function Outline({ nodes }: { nodes: DocumentDigest["outline"] }) {
  if (!nodes?.length) return null
  return (
    <nav className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50/70 p-3 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="mb-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">目录</p>
      <ul className="flex flex-col gap-1">
        {nodes.slice(0, 40).map((n, i) => (
          <li
            key={i}
            style={{ paddingLeft: Math.max(0, n.level - 1) * 12 }}
            className="truncate text-[12px] text-zinc-600 dark:text-zinc-300"
            title={n.title}
          >
            {n.title}
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** 结构化表格（Digest 里表格已转成二维数组，直接画） */
function DigestTable({ table }: { table: DocumentDigest["tables"][number] }) {
  if (!table.headers?.length) return null
  const rows = (table.rows || []).slice(0, 12)
  return (
    <figure className="my-3">
      <div className="overflow-auto rounded-lg border border-zinc-200 dark:border-white/10">
        <table className="w-full border-collapse text-left text-[12px]">
          <thead>
            <tr className="bg-emerald-50/60 dark:bg-emerald-400/[0.06]">
              {table.headers.map((h, i) => (
                <th
                  key={i}
                  className="whitespace-nowrap border-b border-zinc-200 px-2.5 py-1.5 font-semibold text-zinc-700 dark:border-white/10 dark:text-zinc-200"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {table.headers.map((_, ci) => (
                  <td
                    key={ci}
                    className="whitespace-nowrap border-b border-zinc-100 px-2.5 py-1.5 text-zinc-600 dark:border-white/[0.06] dark:text-zinc-300"
                  >
                    {String(row[ci] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
        {table.label}
        {table.truncatedRows ? ` · 另有 ${table.truncatedRows} 行未列出` : ""}
      </figcaption>
    </figure>
  )
}

export default function DigestPreview({ previewModel }: PreviewSurfaceProps) {
  const digest = previewModel as DocumentDigest

  return (
    <div data-preview-surface="digest" className="px-5 py-4">
      <StatsRow stats={digest.stats} />
      <Outline nodes={digest.outline} />

      {digest.notes?.length ? (
        <ul className="mb-4 flex flex-col gap-1 rounded-lg bg-amber-50/70 p-3 text-[11px] leading-5 text-amber-800 dark:bg-amber-400/[0.07] dark:text-amber-300">
          {digest.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-col gap-4">
        {/* data-doc-anchor：折叠窄条的缩略导航按它跳转（见 document-preview.tsx） */}
        {(digest.sections || []).map(section => (
          <section key={section.index} data-doc-anchor={section.index} className="min-w-0">
            <h3 className="mb-1 flex items-center gap-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              <span className="inline-block h-1 w-4 rounded-full bg-emerald-600/70 dark:bg-emerald-400/70" />
              {section.label}
            </h3>
            {section.text ? (
              <p className="whitespace-pre-wrap break-words text-[13px] leading-[1.8] text-zinc-700 dark:text-zinc-300">
                {section.text}
              </p>
            ) : (
              <p className="text-[12px] italic text-zinc-400 dark:text-zinc-500">
                （这一节没有可提取的文本，可能是图片或扫描内容）
              </p>
            )}

            {(section.tableIndexes || []).map(ti =>
              digest.tables[ti] ? <DigestTable key={ti} table={digest.tables[ti]} /> : null,
            )}
          </section>
        ))}
      </div>

      {digest.truncated ? (
        <p className="mt-4 border-t border-zinc-200 pt-3 text-[11px] text-zinc-400 dark:border-white/10 dark:text-zinc-500">
          内容较长，这里只显示前面的一部分。完整内容请下载文件查看。
        </p>
      ) : null}
    </div>
  )
}
