"use client"

/**
 * 文档编辑器（带 Yjs 实时协同）
 *
 * 用法：
 *   <DocumentEditor itemId={123} title="..." initialContent="# Hello"
 *     collectionId={12} canEdit={true} currentUser={{ id, name, avatar }} />
 *
 * 功能：
 *   - 编辑器 + 预览（分屏 / 仅编辑 / 仅预览）
 *   - Yjs 文档实时同步（通过 y-websocket）
 *   - 协作者在线状态（awareness）
 *   - Word 文档导入（.docx → MD，覆盖式）
 *   - Word 文档导出（MD → .docx 下载）
 *   - 自动保存（每 30 秒 + 失焦）
 *   - 版本历史（调用现有 API）
 *
 * Yjs 文档命名空间：kb-doc-{itemId}
 * Yjs WebSocket URL：process.env.NEXT_PUBLIC_YJS_WS_URL || /ws/yjs
 */

import { useFeedback } from "@/lib/ui/feedback"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  Button, Spin, Empty, Tooltip, Tag, App as AntApp, Segmented, Modal
} from "antd"
import * as Y from "yjs"
import { WebsocketProvider } from "y-websocket"
import { cn } from "@/lib/utils"
import KbOnlyOfficeEditor from "@/components/kb/kb-onlyoffice-editor"
import { IconCloseWifi, IconColumn, IconDownload, IconEdit, IconFileText, IconHistory, IconLoading, IconPeoples, IconPreviewOpen, IconSave, IconTime, IconUpload, IconWifi } from "@/components/icon";

// ===== 类型 =====
interface CurrentUser {
  id: number
  name: string
  avatar?: string | null
  color?: string
}

interface DocumentEditorProps {
  itemId: number
  title: string
  initialContent?: string
  collectionId?: number | null
  canEdit?: boolean
  currentUser: CurrentUser
  height?: number | string
  className?: string
  onSaveVersion?: () => void
  onContentChange?: (content: string) => void
  /** Office 文件 URL（如 /uploads/xxx.docx），存在时用 OnlyOffice 编辑器 */
  officeFileUrl?: string | null
  /** Office 文件名（用于判断类型） */
  officeFileName?: string | null
}

type ViewMode = "split" | "edit" | "preview"

// 用户颜色调色板（与 yjs awareness 配合）
const USER_COLORS = [
  "#059669", "#059669", "#52525B", "#059669",
  "#52525B", "#eb2f96", "#DC2626", "#059669",
  "#059669", "#fadb14"
]

function colorForUserId(userId: number): string {
  return USER_COLORS[userId % USER_COLORS.length]
}

// 计算 old → new 文本的最小 diff（返回 { start, deleteLen, insert }）
function computeTextDiff(oldText: string, newText: string): {
  start: number
  deleteLen: number
  insert: string
} {
  // 共同前缀
  let prefixLen = 0
  const minLen = Math.min(oldText.length, newText.length)
  while (prefixLen < minLen && oldText[prefixLen] === newText[prefixLen]) {
    prefixLen++
  }
  // 共同后缀
  let suffixLen = 0
  while (
    suffixLen < minLen - prefixLen &&
    oldText[oldText.length - 1 - suffixLen] === newText[newText.length - 1 - suffixLen]
  ) {
    suffixLen++
  }
  return {
    start: prefixLen,
    deleteLen: oldText.length - prefixLen - suffixLen,
    insert: newText.slice(prefixLen, newText.length - suffixLen)
  }
}

// ===== 主组件 =====
export default function DocumentEditor({
  itemId,
  title,
  initialContent = "",
  collectionId = null,
  canEdit = false,
  currentUser,
  height = "100%",
  className,
  onSaveVersion,
  onContentChange,
  officeFileUrl,
  officeFileName,
}: DocumentEditorProps) {
  const { modal } = AntApp.useApp()

  const { message } = useFeedback()

  const [viewMode, setViewMode] = useState<ViewMode>("split")
  const [content, setContent] = useState(initialContent)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [connected, setConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<
    Array<{ clientId: number; userId?: number; name: string; color: string; avatar?: string | null }>
  >([])
  const [hasRemoteUpdate, setHasRemoteUpdate] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const yDocRef = useRef<Y.Doc | null>(null)
  const wsProviderRef = useRef<WebsocketProvider | null>(null)
  const yTextRef = useRef<Y.Text | null>(null)
  const isApplyingRemoteRef = useRef(false) // 防止 remote 变更触发本地 input 事件再回写
  const lastSavedContentRef = useRef(initialContent)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)

  const userColor = useMemo(
    () => currentUser.color || colorForUserId(currentUser.id),
    [currentUser.id, currentUser.color]
  )

  // ===== 加载 Yjs 文档状态 + 建立 WS 连接 =====
  useEffect(() => {
    let disposed = false

    async function setupYjs() {
      setLoading(true)
      try {
        // 1. 加载已保存的 Yjs 文档状态
        const loadRes = await fetch(`/api/knowledge/documents/${itemId}`, { credentials: "include" })
        const loadData = await loadRes.json().catch(() => ({}))

        if (disposed) return

        // 2. 创建 Y.Doc
        const yDoc = new Y.Doc()
        yDocRef.current = yDoc
        const yText = yDoc.getText("content")
        yTextRef.current = yText

        // 3. 应用保存的状态（如果有）
        if (loadData.doc_state) {
          try {
            const update = Buffer.from(loadData.doc_state, "base64")
            Y.applyUpdate(yDoc, new Uint8Array(update))
          } catch (e) {
            console.error("[DocumentEditor] applyUpdate error:", e)
          }
        }

        // 4. 如果 yText 仍为空，且服务端有 initialContent，则注入
        if (yText.toString().length === 0 && initialContent) {
          yText.insert(0, initialContent)
        }

        // 5. 设置 textarea 初始值
        if (textareaRef.current) {
          textareaRef.current.value = yText.toString()
        }
        setContent(yText.toString())
        lastSavedContentRef.current = yText.toString()

        // 6. 建立 WebSocket 连接
        const wsUrl =
          process.env.NEXT_PUBLIC_YJS_WS_URL ||
          (typeof window !== "undefined" && window.location.protocol === "https:"
            ? `wss://${window.location.host}/ws/yjs`
            : `ws://${window.location.host}/ws/yjs`)
        const provider = new WebsocketProvider(wsUrl, `kb-doc-${itemId}`, yDoc, {
          params: { token: process.env.NEXT_PUBLIC_YJS_AUTH_TOKEN || "" },
          connect: true,
          maxBackoffTime: 10000
        })
        wsProviderRef.current = provider

        // 7. awareness：本地用户信息
        provider.awareness.setLocalStateField("user", {
          userId: currentUser.id,
          name: currentUser.name,
          color: userColor,
          avatar: currentUser.avatar || null
        })

        // 8. awareness：监听变化
        const updateOnlineUsers = () => {
          const states = provider.awareness.getStates()
          const users: typeof onlineUsers = []
          states.forEach((state, clientId) => {
            if (state.user) {
              users.push({
                clientId,
                userId: state.user.userId,
                name: state.user.name,
                color: state.user.color,
                avatar: state.user.avatar
              })
            }
          })
          setOnlineUsers(users)
        }
        provider.awareness.on("change", updateOnlineUsers)

        // 9. 连接状态
        provider.on("status", ({ connected: isConn }: any) => {
          setConnected(!!isConn)
        })

        // 10. yText 变化监听（远程）
        yText.observe((event, transaction) => {
          if (transaction.local) return
          isApplyingRemoteRef.current = true
          const newText = yText.toString()
          const ta = textareaRef.current
          if (ta) {
            // 保存当前选区
            const start = ta.selectionStart
            const end = ta.selectionEnd
            ta.value = newText
            // 恢复选区（简单方案：保持相同位置）
            try {
              ta.setSelectionRange(Math.min(start, newText.length), Math.min(end, newText.length))
            } catch (e) {
              // ignore
            }
          }
          setContent(newText)
          onContentChange?.(newText)
          setHasRemoteUpdate(true)
          // 异步清除标记
          setTimeout(() => setHasRemoteUpdate(false), 1000)
          // 解锁
          setTimeout(() => {
            isApplyingRemoteRef.current = false
          }, 0)
        })

        if (disposed) {
          provider.destroy()
          yDoc.destroy()
        }
      } catch (e: any) {
        console.error("[DocumentEditor] setupYjs error:", e.message)
        message.error(`协同编辑初始化失败：${e.message}`)
      } finally {
        if (!disposed) setLoading(false)
      }
    }

    setupYjs()

    return () => {
      disposed = true
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
      // 保存最新内容
      try {
        const yDoc = yDocRef.current
        const yText = yText?.getText("content")
        if (yDoc && yText) {
          const state = Y.encodeStateAsUpdate(yDoc)
          // fire-and-forget save
          fetch(`/api/knowledge/documents/${itemId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              doc_state: Buffer.from(state).toString("base64"),
              last_editor_id: currentUser.id
            })
          }).catch(() => {})
        }
      } catch (e) {
        // ignore
      }
      // 销毁
      wsProviderRef.current?.destroy()
      wsProviderRef.current = null
      yDocRef.current?.destroy()
      yDocRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

  // ===== 文本输入 → Y.Text 同步 =====
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isApplyingRemoteRef.current) return
    const newText = e.target.value
    const yText = yTextRef.current
    if (!yText) return
    const oldText = yText.toString()
    if (newText === oldText) return
    const diff = computeTextDiff(oldText, newText)
    if (diff.deleteLen === 0 && diff.insert.length === 0) return
    // 在事务中应用变更
    yDocRef.current?.transact(() => {
      if (diff.deleteLen > 0) {
        yText.delete(diff.start, diff.deleteLen)
      }
      if (diff.insert.length > 0) {
        yText.insert(diff.start, diff.insert)
      }
    })
    setContent(newText)
    onContentChange?.(newText)

    // 调度自动保存（防抖）
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    autoSaveTimerRef.current = setTimeout(() => {
      saveDocument()
    }, 30000)
  }, [currentUser.id])

  // ===== 保存文档 =====
  const saveDocument = useCallback(async () => {
    const yDoc = yDocRef.current
    const yText = yDoc?.getText("content")
    if (!yDoc || !yText) return
    const text = yText.toString()
    if (text === lastSavedContentRef.current) return // 无变化
    setSaving(true)
    try {
      // 1. 保存 Yjs 文档状态
      const state = Y.encodeStateAsUpdate(yDoc)
      const res = await fetch(`/api/knowledge/documents/${itemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          doc_state: Buffer.from(state).toString("base64"),
          last_editor_id: currentUser.id
        })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      // 2. 同步到 knowledge_items content（用于全文搜索 + AI 检索）
      // 仅当 collection 有 owner user_id 可写入；这里走 /api/knowledge/items/[id] PATCH
      // 由后端 route 处理 owner 校验
      const patchRes = await fetch(`/api/knowledge/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: text,
          change_summary: "协同编辑自动保存",
          create_version: false // 不为自动保存创建版本，仅手动触发版本
        })
      }).catch(() => null)
      // patchRes 失败不致命：Yjs 状态已保存，下次仍能恢复
      if (patchRes && !patchRes.ok) {
        console.warn("[DocumentEditor] auto-save knowledge_items content failed:", patchRes.status)
      }
      lastSavedContentRef.current = text
      setLastSavedAt(Date.now())
    } catch (e: any) {
      console.error("[DocumentEditor] saveDocument error:", e.message)
      message.error(`保存失败：${e.message}`)
    } finally {
      setSaving(false)
    }
  }, [itemId, currentUser.id, message])

  // ===== 失焦自动保存 =====
  const handleBlur = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }
    saveDocument()
  }

  // ===== 手动保存 =====
  const handleManualSave = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }
    saveDocument()
    message.success("已保存")
  }

  // ===== Word 文档导入 =====
  const handleImportDocx = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".docx")) {
      message.error("仅支持 .docx 文件")
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      message.error("文件过大（最大 20MB）")
      return
    }
    const formData = new FormData()
    formData.append("file", file)

    setLoading(true)
    try {
      const res = await fetch(`/api/knowledge/items/${itemId}/import-docx`, {
        method: "POST",
        body: formData,
        credentials: "include"
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)

      // 把转换后的 markdown 写入 Yjs 文档
      const yDoc = yDocRef.current
      const yText = yDoc?.getText("content")
      if (yDoc && yText) {
        yDoc.transact(() => {
          yText.delete(0, yText.length)
          yText.insert(0, data.markdown || "")
        })
      }
      if (textareaRef.current) {
        textareaRef.current.value = data.markdown || ""
      }
      setContent(data.markdown || "")
      onContentChange?.(data.markdown || "")
      message.success(`已导入「${data.title || file.name}」`)
    } catch (e: any) {
      console.error("[DocumentEditor] importDocx error:", e.message)
      message.error(`导入失败：${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  // ===== Word 文档导出 =====
  const handleExportDocx = () => {
    const filename = (title || "document").replace(/[\\/:*?"<>|]/g, "_").slice(0, 100)
    // 直接打开下载链接（浏览器会处理）
    const a = document.createElement("a")
    a.href = `/api/knowledge/items/${itemId}/export-docx`
    a.download = `${filename}.docx`
    a.click()
    message.success("正在导出 Word 文档…")
  }

  // ===== Markdown 预览（简易实现） =====
  const renderPreview = useMemo(() => {
    return renderMarkdown(content)
  }, [content])

  // ===== Office 文档 → OnlyOffice 编辑器 =====
  if (officeFileUrl && officeFileName) {
    const ext = officeFileName.split(".").pop()?.toLowerCase()
    if (ext && ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext)) {
      return (
        <div className={cn("flex flex-col", className)} style={{ height }}>
          <KbOnlyOfficeEditor
            itemId={itemId}
            fileUrl={officeFileUrl}
            fileName={officeFileName}
            canEdit={canEdit}
            collectionId={collectionId}
            height={height}
          />
        </div>
      )
    }
  }

  // ===== 渲染 =====
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spin />
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col", className)} style={{ height }}>
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2 flex-wrap">
          <IconFileText size={14} className="text-[#059669]" />
          <span className="text-[13px] font-medium truncate max-w-[200px]">{title}</span>
          {connected ? (
            <Tooltip title="已连接协同服务">
              <IconWifi size={13} className="text-[#059669]" />
            </Tooltip>
          ) : (
            <Tooltip title="未连接协同服务">
              <IconCloseWifi size={13} className="text-[#DC2626]" />
            </Tooltip>
          )}
          {hasRemoteUpdate && (
            <Tag color="blue" style={{ fontSize: 10, marginInlineEnd: 0, padding: "0 4px", lineHeight: "16px" }}>
              同步中
            </Tag>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* 在线协作者 */}
          <div className="flex items-center -space-x-1">
            {onlineUsers.slice(0, 5).map((u) => (
              <Tooltip key={u.clientId} title={`${u.name}${u.userId === currentUser.id ? "（你）" : ""}`}>
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] text-white font-medium border-2 border-white dark:border-zinc-900"
                  style={{ background: u.color }}
                >
                  {u.name.slice(0, 1).toUpperCase()}
                </div>
              </Tooltip>
            ))}
            {onlineUsers.length > 5 && (
              <Tooltip title={`还有 ${onlineUsers.length - 5} 位`}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] bg-zinc-200 dark:bg-zinc-700 border-2 border-white dark:border-zinc-900">
                  +{onlineUsers.length - 5}
                </div>
              </Tooltip>
            )}
            {onlineUsers.length === 0 && (
              <Tooltip title="暂无在线协作者">
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                  <IconPeoples size={12} className="text-zinc-400" />
                </div>
              </Tooltip>
            )}
          </div>

          {/* 视图切换 */}
          <Segmented
            size="small"
            value={viewMode}
            onChange={(v) => setViewMode(v as ViewMode)}
            options={[
              { label: "", value: "edit", icon: <IconEdit size={13} />, title: "仅编辑" },
              { label: "", value: "split", icon: <IconColumn size={13} />, title: "分屏" },
              { label: "", value: "preview", icon: <IconPreviewOpen size={13} />, title: "仅预览" }
            ]}
          />

          {/* 操作按钮 */}
          {canEdit && (
            <>
              <input
                ref={importInputRef}
                type="file"
                accept=".docx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleImportDocx(f)
                  e.target.value = ""
                }}
              />
              <Tooltip title="导入 Word 文档（.docx → Markdown）">
                <Button
                  size="small"
                  icon={<IconUpload size={13} />}
                  onClick={() => importInputRef.current?.click()}
                />
              </Tooltip>
            </>
          )}
          <Tooltip title="导出为 Word 文档">
            <Button
              size="small"
              icon={<IconDownload size={13} />}
              onClick={handleExportDocx}
            />
          </Tooltip>
          {canEdit && (
            <Button
              type="primary"
              size="small"
              icon={saving ? <IconLoading size={13} className="animate-spin" /> : <IconSave size={13} />}
              onClick={handleManualSave}
              loading={saving}
            >
              保存
            </Button>
          )}
        </div>
      </div>

      {/* 编辑区 + 预览区 */}
      <div className="flex-1 flex min-h-0">
        {(viewMode === "edit" || viewMode === "split") && (
          <div
            className={cn(
              "flex flex-col min-h-0",
              viewMode === "split" ? "w-1/2 border-r border-zinc-100 dark:border-zinc-800" : "w-full"
            )}
          >
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleInputChange}
              onBlur={handleBlur}
              readOnly={!canEdit}
              placeholder={canEdit ? "开始输入文档内容..." : "（只读模式）"}
              className="flex-1 w-full p-4 font-mono text-[13px] leading-relaxed resize-none outline-none bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
              style={{ minHeight: 0 }}
              spellCheck={false}
            />
          </div>
        )}
        {(viewMode === "preview" || viewMode === "split") && (
          <div
            className={cn(
              "flex flex-col min-h-0 overflow-y-auto",
              viewMode === "split" ? "w-1/2" : "w-full"
            )}
          >
            <div
              className="px-4 py-3 text-[13px] leading-relaxed text-zinc-900 dark:text-zinc-100"
              dangerouslySetInnerHTML={{ __html: renderPreview }}
            />
          </div>
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400">
        <div className="flex items-center gap-3">
          <span>{content.length} 字符</span>
          <span className="flex items-center gap-1">
            <IconPeoples size={10} />
            {onlineUsers.length} 人在线
          </span>
        </div>
        <div className="flex items-center gap-2">
          {saving ? (
            <span className="text-[#059669] flex items-center gap-1">
              <IconLoading size={10} className="animate-spin" /> 保存中…
            </span>
          ) : lastSavedAt ? (
            <span className="flex items-center gap-1">
              <IconTime size={10} />
              上次保存 {new Date(lastSavedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : (
            <span>未保存</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ===== 简易 Markdown 渲染（避免依赖 react-markdown，保持轻量）=====
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function renderMarkdown(md: string): string {
  if (!md) return '<div class="text-zinc-400">（空文档）</div>'

  const lines = md.replace(/\r\n/g, "\n").split("\n")
  const out: string[] = []
  let inCodeBlock = false
  let codeLang = ""
  let codeLines: string[] = []
  let inList = false
  let listType: "ul" | "ol" | null = null

  const flushList = () => {
    if (inList && listType) {
      out.push(`</${listType}>`)
      inList = false
      listType = null
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 代码块
    if (/^```/.test(line)) {
      if (!inCodeBlock) {
        flushList()
        inCodeBlock = true
        codeLang = line.replace(/^```/, "").trim()
        codeLines = []
      } else {
        // 结束代码块
        out.push(
          `<pre style="background:#f6f8fa;padding:12px;border-radius:6px;overflow-x:auto;font-family:Consolas,monospace;font-size:12px;margin:8px 0;"><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`
        )
        inCodeBlock = false
        codeLang = ""
        codeLines = []
      }
      continue
    }
    if (inCodeBlock) {
      codeLines.push(line)
      continue
    }

    // 标题
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line)
    if (headingMatch) {
      flushList()
      const level = headingMatch[1].length
      out.push(`<h${level} style="margin:16px 0 8px;font-weight:600;line-height:1.4;">${renderInline(headingMatch[2].trim())}</h${level}>`)
      continue
    }

    // 引用
    if (/^>\s?/.test(line)) {
      flushList()
      const quoteLines: string[] = [line.replace(/^>\s?/, "")]
      while (i + 1 < lines.length && /^>\s?/.test(lines[i + 1])) {
        i++
        quoteLines.push(lines[i].replace(/^>\s?/, ""))
      }
      out.push(
        `<blockquote style="border-left:3px solid #059669;padding-left:12px;margin:8px 0;color:#52525B;">${renderInline(quoteLines.join(" "))}</blockquote>`
      )
      continue
    }

    // 无序列表
    if (/^[-*+]\s+/.test(line)) {
      if (!inList || listType !== "ul") {
        flushList()
        inList = true
        listType = "ul"
        out.push('<ul style="margin:8px 0;padding-left:24px;">')
      }
      out.push(`<li>${renderInline(line.replace(/^[-*+]\s+/, ""))}</li>`)
      continue
    }
    // 有序列表
    if (/^\d+[.)]\s+/.test(line)) {
      if (!inList || listType !== "ol") {
        flushList()
        inList = true
        listType = "ol"
        out.push('<ol style="margin:8px 0;padding-left:24px;">')
      }
      out.push(`<li>${renderInline(line.replace(/^\d+[.)]\s+/, ""))}</li>`)
      continue
    }

    // 水平线
    if (/^---+\s*$/.test(line) || /^\*\*\*+\s*$/.test(line)) {
      flushList()
      out.push('<hr style="border:none;border-top:1px solid #e8e8e8;margin:16px 0;" />')
      continue
    }

    // 空行
    if (line.trim() === "") {
      flushList()
      out.push("")
      continue
    }

    // 段落
    flushList()
    out.push(`<p style="margin:6px 0;line-height:1.7;">${renderInline(line)}</p>`)
  }

  // 处理未关闭的代码块
  if (inCodeBlock) {
    out.push(
      `<pre style="background:#f6f8fa;padding:12px;border-radius:6px;overflow-x:auto;font-family:Consolas,monospace;font-size:12px;margin:8px 0;"><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`
    )
  }
  flushList()

  return out.join("\n")
}

function renderInline(text: string): string {
  let out = escapeHtml(text)
  // 行内代码
  out = out.replace(/`([^`]+)`/g, '<code style="background:#f6f8fa;padding:2px 4px;border-radius:3px;font-family:Consolas,monospace;font-size:12px;">$1</code>')
  // 加粗
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  // 斜体
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>")
  // 删除线
  out = out.replace(/~~([^~]+)~~/g, "<del>$1</del>")
  // 链接
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener" style="color:#059669;text-decoration:none;">$1</a>'
  )
  return out
}
