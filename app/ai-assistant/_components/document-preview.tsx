"use client"

/**
 * 📄 文档预览面板（三段式右侧停靠列）
 *
 * ## 形态（对齐 WorkBuddy 产物面板）
 *
 *   打开态：
 *   ┌───────────────────────────────────────┐
 *   │ [📄 a.docx ×] [📄 b.pptx ×] [🧭 新标… ×] ＋ ⤢ ▣ │
 *   ├───────────────────────────────────────┤
 *   │ 巡检报告.docx                 ⬇        │ ← 文件行（新标签页时隐藏）
 *   ├───────────────────────────────────────┤
 *   │        内容区（唯一滚动）               │
 *   └───────────────────────────────────────┘
 *
 *   ＋ = 打开「新标签页」：不是弹菜单，是一张真正的空态页 ——
 *        上半是几个入口动作，下半是「产物 (N) ∨」可折叠的最近文档列表，
 *        点任意一份 → 变成正式页签。与 WorkBuddy 的新标签页同一套心智。
 *
 *   折叠态（▣）：整列收成一条窄列 —— 顶部「展开」钮 + 缩略导航（一格 = 一节/一张），
 *   点格子直接把内容滚到对应位置。**不多占一列**，对话区拿回几乎全部宽度。
 *
 * ## 三条供给路径（按保真度从高到低）
 *
 *   ┌ pdf ────────────▶ 浏览器原生渲染（iframe + `?inline=1`）
 *   ├ pptx（我们生成）▶ previewModel 幻灯片视图（能看到版式、图标、图表）
 *   └ 其余一切 ──────▶ 服务端 Digest 结构视图（分节文本 + 表格 + 目录）
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import {
  IconApplicationOne,
  IconClose,
  IconDown,
  IconDownload,
  IconFullScreen,
  IconLinkOut,
  IconPlus,
  IconPreviewOpen,
  IconRefresh,
  IconSidebarPanel,
} from "@/components/icon"
import { formatIcon } from "./format-icon"
import type { DocumentRef } from "@/app/ai-assistant/types"
import type { PreviewSurfaceProps } from "./preview/types"
import { PreviewEmpty, PreviewError, PreviewLoading } from "./preview/bits"
import {
  closeDocumentPreview,
  closePreviewNewTab,
  openDocumentPreview,
  openPreviewNewTab,
  setPreviewHostMounted,
  setPreviewTabCount,
  togglePreviewCollapsed,
  useDocumentPreview,
  usePreviewCollapsed,
  usePreviewNewTab,
  usePreviewTabCount,
  type PreviewDocRef,
} from "./preview-bus"

type Renderer = React.ComponentType<PreviewSurfaceProps>

/** 「新标签页」的伪 id —— 只活在页签条里，不对应任何文件 */
const NEW_TAB_ID = "__newtab__"

/** 格式 → 渲染器模块（动态 import，全部按需加载） */
async function loadRenderer(format: string, source?: string): Promise<Renderer | null> {
  // PDF 交给浏览器自带的 PDFium
  if (format === 'pdf') return (await import('./preview/pdf')).default
  // 我们自己生成的 PPTX：用排版时留下的结构画幻灯片
  if (source === 'model' && format === 'pptx') return (await import('./preview/pptx')).default
  // 其余（含用户上传的任何文件）→ 服务端 Digest 结构视图
  return (await import('./preview/digest')).default
}

interface PreviewInfo {
  fileId: string
  fileName: string
  format: string
  sizeBytes: number
  source: 'model' | 'digest' | 'none'
  previewModel?: any
  error?: string
}

interface TabState {
  doc: PreviewDocRef
  status: 'loading' | 'ready' | 'error'
  info: PreviewInfo | null
  error: string | null
  Renderer: Renderer | null
}

/** 页签上限：再多页签条放不下、也记不住了 */
const MAX_TABS = 8

/** 加宽偏好持久化（折叠状态属于顶栏的 ▣，存在 preview-bus 里） */
const LS_WIDE = 'ai-doc-preview-wide'

function readLSBool(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeLS(key: string, v: boolean) {
  try {
    localStorage.setItem(key, v ? '1' : '0')
  } catch {}
}

function usePreviewTabs(requested: PreviewDocRef | null, keepWhenIdle: boolean) {
  const [tabs, setTabs] = React.useState<TabState[]>([])
  const [activeId, setActiveId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!requested) {
      if (!keepWhenIdle) {
        setTabs([])
        setActiveId(null)
      }
      return
    }
    setTabs(prev => {
      if (prev.some(t => t.doc.fileId === requested.fileId)) return prev
      const next = [...prev, { doc: requested, status: 'loading' as const, info: null, error: null, Renderer: null }]
      return next.length > MAX_TABS ? next.slice(next.length - MAX_TABS) : next
    })
    setActiveId(requested.fileId)
  }, [requested, keepWhenIdle])

  // 补齐还在 loading 的页签（每个只跑一次）
  React.useEffect(() => {
    const tab = tabs.find(t => t.status === 'loading' && !t.info && !t.error)
    if (!tab) return

    let alive = true
    const fileId = tab.doc.fileId
    const format = (tab.doc.format || '').toLowerCase()

    ;(async () => {
      const patch = (p: Partial<TabState>) =>
        setTabs(prev => prev.map(t => (t.doc.fileId === fileId ? { ...t, ...p } : t)))

      try {
        const res = await fetch(`/api/documents/${encodeURIComponent(fileId)}/preview`, {
          credentials: 'same-origin',
        })
        const data = (await res.json().catch(() => ({}))) as PreviewInfo & { error?: string }
        if (!alive) return
        if (!res.ok || data.error) throw new Error(data.error || '无法读取这个文件')

        const R = await loadRenderer(format, data.source)
        if (!alive) return
        patch({ info: data, Renderer: R, status: 'ready' })
      } catch (e: any) {
        if (alive) patch({ error: e?.message || '预览失败', status: 'error' })
      }
    })()

    return () => {
      alive = false
    }
  }, [tabs])

  const closeTab = React.useCallback(
    (fileId: string) => {
      setTabs(prev => {
        const idx = prev.findIndex(t => t.doc.fileId === fileId)
        const next = prev.filter(t => t.doc.fileId !== fileId)
        if (fileId === activeId) {
          const fallback = next[Math.min(idx, next.length - 1)]
          setActiveId(fallback?.doc.fileId ?? null)
        }
        return next
      })
    },
    [activeId],
  )

  return { tabs, activeId, setActiveId, closeTab, closeAll: () => { setTabs([]); setActiveId(null) } }
}

interface RecentDoc {
  fileId: string
  fileName: string
  format: string
  sizeText?: string
  downloadUrl: string
  createdAt: number
}

/** 「产物 (N)」列表：独立拉取，新标签页与刷新动作共用 */
function useRecentDocs(enabled: boolean) {
  const [items, setItems] = React.useState<RecentDoc[] | null>(null)

  const reload = React.useCallback(async () => {
    try {
      const res = await fetch('/api/documents/list?limit=12', { credentials: 'same-origin' })
      const data = await res.json()
      if (res.ok) setItems(data.items ?? [])
      else setItems([])
    } catch {
      setItems([])
    }
  }, [])

  React.useEffect(() => {
    if (enabled && items === null) void reload()
  }, [enabled, items, reload])

  return { items, reload }
}

/* ─────────────────────────────────────────────────────────────
   新标签页（空态）
   ───────────────────────────────────────────────────────────── */

function NewTabPage({
  activeDoc,
  onOpenDoc,
}: {
  /** 最近打开过的一份文档（两个动作的作用对象；可能为 null） */
  activeDoc: TabState | null
  onOpenDoc: (doc: RecentDoc) => void
}) {
  const { items, reload } = useRecentDocs(true)
  const [expanded, setExpanded] = React.useState(true)
  const downloadUrl = activeDoc?.doc.downloadUrl

  const rowCls = cn(
    "flex h-[52px] w-full items-center gap-3 px-5 text-left transition-colors",
    "border-b border-zinc-100 dark:border-white/[0.05]",
  )
  const rowIcon = "shrink-0 text-zinc-500 dark:text-zinc-400"

  return (
    <div data-document-preview-newtab className="flex h-full min-h-0 flex-col overflow-y-auto">
      {/* 上半留白：WorkBuddy 的新标签页就是"先呼吸，再入口" */}
      <div className="min-h-[22vh] shrink-0" />

      <div className="mx-4 shrink-0 overflow-hidden rounded-2xl border border-zinc-200/70 dark:border-white/[0.08]">
        {/* 在新窗口打开（对最近一份文档；没有则置灰） */}
        <button
          type="button"
          disabled={!downloadUrl}
          onClick={() => downloadUrl && window.open(`${downloadUrl}${downloadUrl.includes('?') ? '&' : '?'}inline=1`, '_blank')}
          className={cn(rowCls, "hover:bg-zinc-900/[0.03] dark:hover:bg-white/[0.04]", !downloadUrl && "cursor-not-allowed opacity-40")}
          title={downloadUrl ? "在新窗口打开这份文档" : "还没有可打开的文档"}
        >
          <IconLinkOut size={16} className={rowIcon} />
          <span className="text-[13.5px] font-medium text-zinc-700 dark:text-zinc-200">在新窗口打开</span>
        </button>

        {/* 下载 */}
        <button
          type="button"
          disabled={!downloadUrl}
          onClick={() => {
            if (!downloadUrl || !activeDoc) return
            const a = document.createElement('a')
            a.href = downloadUrl
            a.download = activeDoc.doc.fileName
            a.click()
          }}
          className={cn(rowCls, "hover:bg-zinc-900/[0.03] dark:hover:bg-white/[0.04]", !downloadUrl && "cursor-not-allowed opacity-40")}
          title={downloadUrl ? `下载 ${activeDoc.doc.fileName}` : "还没有可下载的文档"}
        >
          <IconDownload size={16} className={rowIcon} />
          <span className="text-[13.5px] font-medium text-zinc-700 dark:text-zinc-200">下载文档</span>
        </button>

        {/* 刷新产物列表 */}
        <button
          type="button"
          onClick={() => void reload()}
          className={cn(rowCls, "hover:bg-zinc-900/[0.03] dark:hover:bg-white/[0.04]")}
        >
          <IconRefresh size={16} className={rowIcon} />
          <span className="text-[13.5px] font-medium text-zinc-700 dark:text-zinc-200">刷新产物列表</span>
        </button>
      </div>

      {/* 产物 (N) ∨ */}
      <div className="mt-6 px-5">
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          data-document-preview-action="toggle-artifacts"
          className="flex items-center gap-1 text-[12px] text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          产物 ({items?.length ?? 0})
          <IconDown
            size={12}
            className={cn("transition-transform", expanded && "rotate-180")}
          />
        </button>

        {expanded ? (
          <div className="mt-1 flex flex-col">
            {items === null ? (
              <p className="px-1 py-3 text-[12.5px] text-zinc-400 dark:text-zinc-500">加载中…</p>
            ) : items.length === 0 ? (
              <p className="px-1 py-3 text-[12.5px] text-zinc-400 dark:text-zinc-500">
                还没有文档。让 AI 生成一份，或直接把文件拖进对话。
              </p>
            ) : (
              items.map(d => {
                const Icon = formatIcon(d.format)
                return (
                  <button
                    key={d.fileId}
                    type="button"
                    onClick={() => onOpenDoc(d)}
                    className={cn(
                      "flex h-10 w-full items-center gap-2.5 rounded-lg px-1 text-left transition-colors",
                      "hover:bg-zinc-900/[0.04] dark:hover:bg-white/[0.05]",
                    )}
                  >
                    <Icon size={15} className="shrink-0 text-blue-500 dark:text-blue-400" />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-700 dark:text-zinc-200">
                      {d.fileName}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        ) : null}
      </div>

      <div className="min-h-[16vh] flex-1" />
    </div>
  )
}

interface PanelProps {
  tabs: TabState[]
  activeId: string | null
  setActiveId: (id: string) => void
  closeTab: (id: string) => void
  onClose: () => void
  className?: string
}

/**
 * 面板本体（浮层兜底用）。停靠列的内联实现见 `DocumentPreviewDock` ——
 * 两者差异在"怎么被摆放"，页签/文件行/内容的样式保持同一套。
 */
function PreviewPanel({ tabs, activeId, setActiveId, closeTab, onClose, className }: PanelProps) {
  const active = tabs.find(t => t.doc.fileId === activeId) ?? null
  const activeFormat = (active?.doc.format || '').toLowerCase()
  const ActiveIcon = formatIcon(activeFormat)

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div
        data-document-preview-tabs
        className="flex h-[52px] shrink-0 items-center gap-1 border-b border-zinc-200/70 px-2.5 dark:border-white/[0.08]"
      >
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {tabs.map(tab => {
            const TabIcon = formatIcon((tab.doc.format || '').toLowerCase())
            const isActive = tab.doc.fileId === activeId
            return (
              <div
                key={tab.doc.fileId}
                role="tab"
                aria-selected={isActive}
                tabIndex={0}
                onClick={() => setActiveId(tab.doc.fileId)}
                className={cn(
                  "group flex h-9 shrink-0 cursor-pointer select-none items-center gap-2 rounded-xl px-3",
                  "transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40",
                  isActive
                    ? "bg-zinc-900/[0.06] text-zinc-800 dark:bg-white/[0.10] dark:text-zinc-100"
                    : "text-zinc-500 hover:bg-zinc-900/[0.04] dark:text-zinc-400 dark:hover:bg-white/[0.06]",
                )}
              >
                <TabIcon size={15} className="shrink-0" />
                <span className="max-w-[160px] truncate text-[13px] font-medium leading-none" title={tab.doc.fileName}>
                  {tab.doc.fileName}
                </span>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    closeTab(tab.doc.fileId)
                  }}
                  title="关闭这个页签"
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
                    "text-zinc-400 transition-colors hover:bg-zinc-900/10 hover:text-zinc-600",
                    "dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-zinc-300",
                  )}
                >
                  <IconClose size={11} />
                </button>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          data-document-preview-action="close"
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500",
            "transition-colors hover:bg-zinc-900/[0.05] hover:text-zinc-700",
            "dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200",
          )}
          title="关闭预览"
        >
          <IconClose size={15} />
        </button>
      </div>

      {active ? (
        <div
          data-document-preview-header
          className="flex h-[52px] shrink-0 items-center gap-2.5 border-b border-zinc-200/70 px-4 dark:border-white/[0.08]"
        >
          <ActiveIcon size={16} className="shrink-0 text-zinc-400 dark:text-zinc-500" />
          <p
            className="min-w-0 flex-1 truncate text-[15px] font-semibold text-zinc-900 dark:text-zinc-50"
            title={active.doc.fileName}
          >
            {active.doc.fileName}
          </p>
          {active.doc.downloadUrl ? (
            <a
              href={active.doc.downloadUrl}
              download={active.doc.fileName}
              data-document-preview-action="download"
              title={`下载 ${active.doc.fileName}`}
              className={cn(
                "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500",
                "transition-colors hover:bg-zinc-900/[0.05] hover:text-zinc-700",
                "dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200",
              )}
            >
              <IconDownload size={15} />
            </a>
          ) : null}
        </div>
      ) : null}

      <div data-document-preview-body className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {tabs.map(tab => {
          const isActive = tab.doc.fileId === activeId
          return (
            <div key={tab.doc.fileId} data-document-preview-pane={tab.doc.fileId} hidden={!isActive}>
              {!isActive ? null : tab.status === 'loading' ? (
                <PreviewLoading label="正在准备预览…" />
              ) : tab.status === 'error' ? (
                <PreviewError message={tab.error || '预览失败'} />
              ) : tab.Renderer && tab.info?.previewModel ? (
                <tab.Renderer
                  previewModel={tab.info.previewModel}
                  downloadUrl={tab.doc.downloadUrl}
                  fileName={tab.doc.fileName}
                  format={(tab.doc.format || '').toLowerCase()}
                />
              ) : (
                <PreviewEmpty message="这份文件没有可预览的内容。" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** 停靠列三档宽度 */
const W_NORMAL = 520
const W_WIDE = 760

/**
 * 🏗️ 停靠面板宿主（AI 助手页三段式的第三段）。
 *
 * 挂在卡片容器的**行方向**上，是对话列的兄弟节点：
 *   · 打开（520）→ 加宽（760）→ 折叠（64 窄条）→ 无页签（0，整列消失）
 * 折叠态**不多占一列**：只留一条窄边，顶部「展开」钮 + 缩略导航。
 */
export function DocumentPreviewDock() {
  const requested = useDocumentPreview()
  const { tabs, activeId, setActiveId, closeTab } = usePreviewTabs(requested, true)

  // 折叠 / 新标签页都走总线：顶栏的 ▣ 与这里共用同一个源
  const collapsed = usePreviewCollapsed()
  const newTab = usePreviewNewTab()
  const [wide, setWide] = React.useState(false)
  const bodyRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setPreviewHostMounted(true)
    return () => setPreviewHostMounted(false)
  }, [])

  React.useEffect(() => {
    setWide(readLSBool(LS_WIDE))
  }, [])

  const toggleWide = React.useCallback(() => {
    setWide(v => {
      writeLS(LS_WIDE, !v)
      return !v
    })
  }, [])

  const closeNewTab = React.useCallback(() => {
    closePreviewNewTab()
    if (activeId === NEW_TAB_ID) {
      const fallback = tabs[tabs.length - 1]
      setActiveId(fallback?.doc.fileId ?? null)
    }
  }, [activeId, tabs, setActiveId])

  const hasTabs = tabs.length > 0 || newTab
  const isNewTabActive = newTab && (activeId === NEW_TAB_ID || !tabs.some(t => t.doc.fileId === activeId))
  // 🚨 折叠 = 列宽直接归 0，**没有**"窄条"中间态 ——
  // 窄条里再放一枚 ▣ 就会出现两个折叠钮，且展开入口被窄条吃掉（自锁）。
  // 唯一的展开入口是顶栏那枚常驻 ▣。
  const isOpen = hasTabs && !collapsed
  const W = wide ? W_WIDE : W_NORMAL

  const activeDoc = tabs.find(t => t.doc.fileId === activeId) ?? null

  // 上报页签数：顶栏 ▣ 的行为据此分叉（0 = 点开新标签页；>0 = 折叠/展开）
  React.useEffect(() => {
    setPreviewTabCount(tabs.length + (newTab ? 1 : 0))
  }, [tabs.length, newTab])

  return (
    <div
      data-document-preview-dock
      data-dock-state={hasTabs ? (collapsed ? 'collapsed' : 'open') : 'closed'}
      aria-hidden={!isOpen}
      style={{
        width: isOpen ? W : 0,
        flexShrink: 0,
        overflow: "hidden",
        transition: "width 240ms cubic-bezier(0.4, 0, 0.2, 1)",
        pointerEvents: isOpen ? "auto" : "none",
      }}
    >
      <div
        style={{ width: W, height: "100%" }}
        className={cn(
          "h-full border-l border-zinc-200/70 bg-white dark:border-white/[0.08] dark:bg-zinc-900",
          !isOpen && "invisible",
        )}
      >
        {collapsed ? null : (
          /* ── 打开态 ── */
          <div className="flex h-full flex-col">
            {/* 页签条：文档页签 + 新标签页 ｜ ＋ ⤢
                🚨 ▣（折叠/展开）**不在这里** —— 它属于顶栏三件套（🔍 ↗ ▣），
                见下方的 `PreviewPanelToggle`。放在页签条里会让顶栏与面板各有一个折叠钮。 */}
            <div
              data-document-preview-tabs
              className="flex h-[52px] shrink-0 items-center gap-1 border-b border-zinc-200/70 px-2.5 dark:border-white/[0.08]"
            >
              <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                {tabs.map(tab => {
                  const TabIcon = formatIcon((tab.doc.format || '').toLowerCase())
                  const isActive = tab.doc.fileId === activeId && !isNewTabActive
                  return (
                    <div
                      key={tab.doc.fileId}
                      role="tab"
                      aria-selected={isActive}
                      tabIndex={0}
                      onClick={() => setActiveId(tab.doc.fileId)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setActiveId(tab.doc.fileId)
                        }
                      }}
                      data-document-preview-tab={tab.doc.fileId}
                      className={cn(
                        "group flex h-9 shrink-0 cursor-pointer select-none items-center gap-2 rounded-xl px-3",
                        "transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40",
                        isActive
                          ? "bg-zinc-900/[0.06] text-zinc-800 dark:bg-white/[0.10] dark:text-zinc-100"
                          : "text-zinc-500 hover:bg-zinc-900/[0.04] dark:text-zinc-400 dark:hover:bg-white/[0.06]",
                      )}
                    >
                      <TabIcon size={15} className="shrink-0" />
                      <span className="max-w-[150px] truncate text-[13px] font-medium leading-none" title={tab.doc.fileName}>
                        {tab.doc.fileName}
                      </span>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          closeTab(tab.doc.fileId)
                        }}
                        title="关闭这个页签"
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
                          "text-zinc-400 transition-colors hover:bg-zinc-900/10 hover:text-zinc-600",
                          "dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-zinc-300",
                        )}
                      >
                        <IconClose size={11} />
                      </button>
                    </div>
                  )
                })}

                {/* 新标签页 */}
                {newTab ? (
                  <div
                    role="tab"
                    aria-selected={isNewTabActive}
                    tabIndex={0}
                    onClick={() => setActiveId(NEW_TAB_ID)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setActiveId(NEW_TAB_ID)
                      }
                    }}
                    data-document-preview-tab="newtab"
                    className={cn(
                      "group flex h-9 shrink-0 cursor-pointer select-none items-center gap-2 rounded-xl px-3",
                      "transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40",
                      isNewTabActive
                        ? "bg-zinc-900/[0.06] text-zinc-800 dark:bg-white/[0.10] dark:text-zinc-100"
                        : "text-zinc-500 hover:bg-zinc-900/[0.04] dark:text-zinc-400 dark:hover:bg-white/[0.06]",
                    )}
                  >
                    <IconApplicationOne size={15} className="shrink-0" />
                    <span className="max-w-[96px] truncate text-[13px] font-medium leading-none">新标签页</span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        closeNewTab()
                      }}
                      title="关闭新标签页"
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
                        "text-zinc-400 transition-colors hover:bg-zinc-900/10 hover:text-zinc-600",
                        "dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-zinc-300",
                      )}
                    >
                      <IconClose size={11} />
                    </button>
                  </div>
                ) : null}
              </div>

              {/* ＋ 新标签页 ｜ ⤢ 加宽 ｜ ▣ 折叠 */}
              <button
                type="button"
                onClick={openPreviewNewTab}
                data-document-preview-action="add"
                title="打开新标签页"
                className={cn(
                  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500",
                  "transition-colors hover:bg-zinc-900/[0.05] hover:text-zinc-700",
                  "dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200",
                )}
              >
                <IconPlus size={16} />
              </button>

              <button
                type="button"
                onClick={toggleWide}
                data-document-preview-action="toggle-wide"
                title={wide ? "恢复宽度" : "加宽预览"}
                className={cn(
                  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500",
                  "transition-colors hover:bg-zinc-900/[0.05] hover:text-zinc-700",
                  "dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200",
                  wide && "text-emerald-600 dark:text-emerald-400",
                )}
              >
                <IconFullScreen size={15} />
              </button>
            </div>

            {/* 文件行（新标签页没有文件行） */}
            {activeDoc && !isNewTabActive ? (
              <div
                data-document-preview-header
                className="flex h-[52px] shrink-0 items-center gap-2.5 border-b border-zinc-200/70 px-4 dark:border-white/[0.08]"
              >
                {(() => {
                  const ActiveIcon = formatIcon((activeDoc.doc.format || '').toLowerCase())
                  return <ActiveIcon size={16} className="shrink-0 text-zinc-400 dark:text-zinc-500" />
                })()}
                <p
                  className="min-w-0 flex-1 truncate text-[15px] font-semibold text-zinc-900 dark:text-zinc-50"
                  title={activeDoc.doc.fileName}
                >
                  {activeDoc.doc.fileName}
                </p>
                {activeDoc.doc.downloadUrl ? (
                  <a
                    href={activeDoc.doc.downloadUrl}
                    download={activeDoc.doc.fileName}
                    data-document-preview-action="download"
                    title={`下载 ${activeDoc.doc.fileName}`}
                    className={cn(
                      "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500",
                      "transition-colors hover:bg-zinc-900/[0.05] hover:text-zinc-700",
                      "dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200",
                    )}
                  >
                    <IconDownload size={15} />
                  </a>
                ) : null}
              </div>
            ) : null}

            {/* 内容区 */}
            <div ref={bodyRef} data-document-preview-body className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {isNewTabActive ? (
                <NewTabPage
                  activeDoc={tabs[tabs.length - 1] ?? null}
                  onOpenDoc={d => {
                    openDocumentPreview({
                      fileId: d.fileId,
                      fileName: d.fileName,
                      format: d.format,
                      sizeText: d.sizeText,
                      downloadUrl: d.downloadUrl,
                      origin: 'generated',
                    })
                  }}
                />
              ) : (
                tabs.map(tab => {
                  const isActive = tab.doc.fileId === activeId
                  return (
                    <div key={tab.doc.fileId} data-document-preview-pane={tab.doc.fileId} hidden={!isActive}>
                      {!isActive ? null : tab.status === 'loading' ? (
                        <PreviewLoading label="正在准备预览…" />
                      ) : tab.status === 'error' ? (
                        <PreviewError message={tab.error || '预览失败'} />
                      ) : tab.Renderer && tab.info?.previewModel ? (
                        <tab.Renderer
                          previewModel={tab.info.previewModel}
                          downloadUrl={tab.doc.downloadUrl}
                          fileName={tab.doc.fileName}
                          format={(tab.doc.format || '').toLowerCase()}
                        />
                      ) : (
                        <PreviewEmpty message="这份文件没有可预览的内容。" />
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 浮层兜底（没有停靠面板的宿主用，如 Copilot 侧栏所在的 monitor 页）。
 *
 * 🚨 层级必须 **> 1290**（Copilot 面板的 z-index）。
 *    这里曾经是 1200 —— 在侧栏里点卡片的「预览」，浮层会整个钻到面板后面，
 *    用户只能看到左半边（面板宽 400px）并且右侧被面板盖住，等同于点不动。
 *    遮罩同理要一起抬：只用 z-50 时点空白处根本关不掉（点击落在面板/页面上）。
 *    分层表（唯一源见 project MEMORY）：1000 Modal · 1100 接入弹窗 · 1280 莓果球
 *    · 1290 Copilot 面板 · 1300 面板内 antd 浮层 · **1400 本浮层** · 3000 sender 自绘 · 5000 选区截图。
 */
export function DocumentPreviewModal({
  doc,
  open,
  onClose,
}: {
  doc: DocumentRef | null
  open: boolean
  onClose: () => void
}) {
  const { tabs, activeId, setActiveId, closeTab } = usePreviewTabs(open ? doc : null, false)

  return (
    <Sheet open={open && tabs.length > 0} onOpenChange={v => (v ? null : onClose())}>
      <SheetContent
        side="right"
        data-document-preview
        overlayClassName="z-[1390] bg-black/20 backdrop-blur-[2px] dark:bg-black/40"
        className={cn(
          "z-[1400] flex w-[min(680px,94vw)] flex-col gap-0 p-0 sm:max-w-none",
          "border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-900",
          "[&>button]:hidden",
        )}
      >
        <SheetTitle className="sr-only">文档预览</SheetTitle>
        <PreviewPanel
          tabs={tabs}
          activeId={activeId}
          setActiveId={setActiveId}
          closeTab={closeTab}
          onClose={onClose}
        />
      </SheetContent>
    </Sheet>
  )
}

/**
 * ▣ 折叠 / 展开预览面板 —— 顶栏三件套的第三件（🔍 搜索 · ↗ 分享 · ▣ 面板）。
 *
 * 两条铁律（都是实测踩出来的）：
 *   1. **常驻**，不随面板消失 —— 折叠钮若跟着面板一起不见，就永远展不开了
 *      （折叠类 UI 的经典自锁 bug）。没点开过文件时点它 = 打开「新标签页」。
 *   2. **它是唯一的折叠/展开入口** —— 面板内部（窄条、页签条）绝不再放第二枚，
 *      否则同屏两枚 ▣，用户分不清谁管谁（实测抓到过）。
 */
export function PreviewPanelToggle() {
  const collapsed = usePreviewCollapsed()
  const tabCount = usePreviewTabCount()
  const panelOpen = tabCount > 0 && !collapsed

  return (
    <button
      type="button"
      onClick={() => (tabCount === 0 ? openPreviewNewTab() : togglePreviewCollapsed())}
      data-document-preview-action="toggle-panel"
      title={panelOpen ? "折叠产物面板" : "打开产物面板"}
      data-panel-open={panelOpen ? '1' : '0'}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg",
        "transition-colors",
        panelOpen
          ? "text-emerald-600 hover:bg-emerald-600/10 dark:text-emerald-400 dark:hover:bg-emerald-400/10"
          : "text-zinc-500 hover:bg-zinc-900/[0.06] hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-white/[0.08] dark:hover:text-zinc-200",
      )}
    >
      <IconSidebarPanel size={16} />
    </button>
  )
}

/**
 * 📎 卡片上的「预览」裸图标按钮
 */
export function PreviewIconButton({ onClick, title = "预览" }: { onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-document-card="preview"
      title={title}
      aria-label={title}
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
        "text-zinc-400 transition-colors",
        "hover:bg-zinc-900/[0.05] hover:text-emerald-600",
        "dark:text-zinc-500 dark:hover:bg-white/[0.06] dark:hover:text-emerald-400",
      )}
    >
      <IconPreviewOpen size={13} />
    </button>
  )
}
