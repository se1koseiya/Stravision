"use client"

import React, { useRef, useState, useMemo, useCallback, useEffect } from "react"
import { Sender, Suggestion, Attachments, type AttachmentsProps, type SenderProps } from "@ant-design/x"
import type { GetProp } from "antd"
import { Button, Flex, Divider, Dropdown, Badge } from "antd"
import type { MenuProps } from "antd"
import {
  PaperClipOutlined,
  ApiOutlined,
  AntDesignOutlined,
  CloudUploadOutlined,
  ProfileOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons"
import {
  Brain, Globe, Zap, FileText, Activity, ShieldCheck, ShieldAlert, Shield,
  Plus, ChevronDown, Check, ArrowRight, LayoutGrid, BookOpen, Library
} from "lucide-react"
import type { GetProp } from "antd/es/config-provider/context"
import type { FlexProps } from "antd"
import { toast } from "sonner"
import type { ChatAttachment } from "@/app/ai-assistant/types"

const Switch = Sender.Switch
type SuggestionItems = Exclude<GetProp<typeof Suggestion, "items">, () => void>

// Agent 操作权限模式
export type ApprovalMode = "request" | "auto" | "full"

const APPROVAL_MODES: { key: ApprovalMode; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    key: "request",
    label: "请求批准",
    desc: "执行设备控制、文件编辑等操作前始终确认",
    icon: <ShieldAlert size={14} />,
  },
  {
    key: "auto",
    label: "替我审批",
    desc: "仅对高风险操作（如删除文件、修改配置）请求确认",
    icon: <Shield size={14} />,
  },
  {
    key: "full",
    label: "完全访问权限",
    desc: "莓小智可自主执行所有工具操作，无需逐一确认",
    icon: <ShieldCheck size={14} />,
  },
]

const IconStyle = { fontSize: 16 }

export interface ChatSenderProps {
  input: string
  setInput: (value: string) => void
  onSend: (text: string) => void
  isLoading: boolean
  attachments: ChatAttachment[]
  onSelectFiles: React.ChangeEventHandler<HTMLInputElement>
  onRemoveAttachment: (index: number) => void
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void
  enableReasoning: boolean
  setEnableReasoning: (v: boolean) => void
  enablePlanning: boolean
  setEnablePlanning: (v: boolean) => void
  enableSearch: boolean
  setEnableSearch: (v: boolean) => void
  availableTools: Array<{ name: string; displayName?: string; description?: string; icon?: string; iconBg?: string }>
  onCancel?: () => void
  darkMode?: boolean
  approvalMode?: ApprovalMode
  setApprovalMode?: (mode: ApprovalMode) => void
}

export function ChatSenderInput({
  input,
  setInput,
  onSend,
  isLoading,
  attachments,
  onSelectFiles,
  onRemoveAttachment,
  onPaste,
  enableReasoning,
  setEnableReasoning,
  enablePlanning,
  setEnablePlanning,
  enableSearch,
  setEnableSearch,
  availableTools,
  onCancel,
  darkMode = false,
  approvalMode = "request",
  setApprovalMode,
}: ChatSenderProps) {
  const senderRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachmentOpen, setAttachmentOpen] = useState(false)
  const [activeSkill, setActiveSkill] = useState<SenderProps['skill'] | null>(null)
  const [plusMenuOpen, setPlusMenuOpen] = useState(false)
  const [approvalPanelOpen, setApprovalPanelOpen] = useState(false)
  const [pluginSubOpen, setPluginSubOpen] = useState(false)

  // 知识库集合（个人 + 市场）— 用于 / 命令补全
  const [kbCollections, setKbCollections] = useState<Array<{ id: number; name: string; source: "personal" | "market"; official?: number }>>([])

  // 拉取个人 KB 集合 + AI 可访问的市场 KB 集合
  useEffect(() => {
    let aborted = false
    ;(async () => {
      try {
        const [personalRes, aiRes] = await Promise.all([
          fetch("/api/knowledge/collections?includeArchived=0").then(r => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
          fetch("/api/knowledge/market/ai-collections?limit=200").then(r => r.ok ? r.json() : { list: [] }).catch(() => ({ list: [] }))
        ])
        if (aborted) return
        const personal: Array<{ id: number; name: string; source: "personal" | "market"; official?: number }> = (personalRes?.items || [])
          .filter((c: any) => c && c.name)
          .map((c: any) => ({ id: c.id, name: c.name, source: "personal" as const }))
        const market: Array<{ id: number; name: string; source: "personal" | "market"; official?: number }> = (aiRes?.list || [])
          .filter((c: any) => c && c.name)
          .map((c: any) => ({ id: c.id, name: c.name, source: "market" as const, official: c.official }))
        setKbCollections([...personal, ...market])
      } catch {
        // 静默失败，slash 菜单只显示 4 个默认指令
      }
    })()
    return () => { aborted = true }
  }, [])

  // Convert ChatAttachment[] to Attachments items format
  const attachmentItems: AttachmentsProps["items"] = useMemo(
    () =>
      attachments.map((att, i) => ({
        uid: `att-${i}`,
        name: att.name || `附件 ${i + 1}`,
        status: "done" as const,
        url: att.dataUrl,
        thumbUrl: att.dataUrl,
        type: att.type,
      })),
    [attachments],
  )

  // MCP tool dropdown
  const toolMenuItems: MenuProps["items"] = useMemo(
    () =>
      availableTools.map((t) => ({
        key: t.name,
        icon: <Zap size={14} />,
        label: t.displayName || t.name,
      })),
    [availableTools],
  )

  const handleToolSelect: MenuProps["onClick"] = useCallback(
    (info: any) => {
      const tool = availableTools.find((t) => t.name === info.key)
      const toolName = tool?.displayName || tool?.name || String(info.key || "")
      insertToolTag(toolName, tool?.name || info.key)
    },
    [availableTools],
  )

  // 将工具作为 skill tag 插入输入框
  const insertToolTag = useCallback((displayName: string, name: string) => {
    const skillData: SenderProps['skill'] = {
      value: name,
      title: displayName,
      closable: true,
    }
    setActiveSkill(skillData)
    // 聚焦输入框让用户继续输入
    senderRef.current?.focus?.()
  }, [])

  // 监听探索页面的"在对话中试用"事件，自动插入工具 tag
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.toolName) {
        // 从 availableTools 中查找匹配项
        const tool = availableTools.find(
          t => (t.displayName || t.name) === detail.toolName || t.name === detail.toolName
        )
        const name = tool?.name || detail.toolName.toLowerCase().replace(/\s+/g, '_')
        insertToolTag(detail.toolName, name)
      }
    }
    window.addEventListener('berry:mention-tool', handler)
    return () => window.removeEventListener('berry:mention-tool', handler)
  }, [availableTools, insertToolTag])

  const slashItems: SuggestionItems = useMemo(() => {
    const base: SuggestionItems = [
      { label: "生成报告", value: "/report", icon: <FileText size={14} className="text-[#1677ff]" /> },
      { label: "环境诊断", value: "/diagnose", icon: <Activity size={14} className="text-[#1677ff]" /> },
      { label: "深度推理", value: "/reason", icon: <Brain size={14} className="text-[#1677ff]" /> },
      { label: "全网检索", value: "/search", icon: <Globe size={14} className="text-[#1677ff]" /> },
    ]
    if (kbCollections.length === 0) return base
    const kbItems: SuggestionItems = kbCollections.slice(0, 20).map(c => {
      const tag = c.source === "personal" ? "个人"
        : c.official === 1 ? "官方"
        : "市场"
      return {
        label: `[${tag}] ${c.name}`,
        value: `/${c.name}`,
        icon: c.source === "personal"
          ? <BookOpen size={14} className="text-emerald-600" />
          : c.official === 1
            ? <ShieldCheck size={14} className="text-[#1677ff]" />
            : <Library size={14} className="text-[#722ed1]" />
      }
    })
    return [...base, ...kbItems]
  }, [kbCollections])

  const senderHeader = useMemo(
    () => (
      <Sender.Header
        title={"附件" + (attachments.length > 0 ? ` (${attachments.length})` : "")}
        open={attachmentOpen}
        onOpenChange={setAttachmentOpen}
        styles={{ content: { padding: 0 } }}
      >
        <Attachments
          overflow="scrollX"
          items={attachmentItems}
          onChange={(info) => {
            const newList = info.fileList.filter((f) => f.status !== "removed")
            const removed = newList.length < attachments.length
            if (removed) {
              const removedIdx = attachments.findIndex(
                (_, i) => !newList.some((f) => f.uid === `att-${i}`)
              )
              if (removedIdx !== -1) onRemoveAttachment(removedIdx)
            }
          }}
          beforeUpload={() => false}
          placeholder={{
            icon: <CloudUploadOutlined style={{ fontSize: 24 }} />,
            title: "点击或拖拽文件上传",
            description: "支持图片、视频、音频、文档等文件格式",
          }}
          getDropContainer={() => senderRef.current?.nativeElement}
        />
      </Sender.Header>
    ),
    [attachmentOpen, attachments, attachmentItems, onRemoveAttachment],
  )

  // + 菜单向上弹出动画
  const plusPanelStyle = (
    <style>{`
      @keyframes plus-panel-up {
        from { opacity: 0; transform: translateY(6px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
    `}</style>
  )

  return (
    <div className="w-full px-4 py-4">
      <style>{`
        .no-focus-ring .ant-sender textarea:focus,
        .no-focus-ring .ant-sender textarea:focus-visible,
        .no-focus-ring .ant-sender .ant-input:focus,
        .no-focus-ring .ant-sender .ant-input-outlined:focus,
        .no-focus-ring .ant-sender .ant-input-outlined:focus-within,
        .no-focus-ring .ant-sender textarea.ant-input {
          box-shadow: none !important;
          outline: none !important;
          border-color: transparent !important;
        }
      `}</style>
      {plusPanelStyle}
      <div style={{ maxWidth: 960, margin: "0 auto" }} className="no-focus-ring">
        <Suggestion items={slashItems} onSelect={(val) => setInput(`${val} `)}>
          {({ onTrigger, onKeyDown: onSlashKeyDown }) => (
            <Sender
              ref={senderRef}
              value={input}
              skill={activeSkill || undefined}
              onRemoveSkill={() => setActiveSkill(null)}
              onChange={(nextVal) => {
                if (nextVal.endsWith("/") && (nextVal.length === 1 || /\s\/$/.test(nextVal)))
                  onTrigger()
                else if (!nextVal.startsWith("/")) onTrigger(false)
                setInput(nextVal)
              }}
              onSubmit={(text) => {
                if (!text.trim() && attachments.length === 0) return
                // 将 skill 信息附加到发送内容，供消息气泡渲染标签
                const skillInfo = activeSkill ? ` [tool:${activeSkill.value}]` : ""
                onSend(text + skillInfo)
                // 延迟清除 skill 标签，避免同步 setState 触发无限重渲染
                requestAnimationFrame(() => setActiveSkill(null))
              }}
              onCancel={onCancel}
              loading={isLoading}
              header={senderHeader}
              placeholder="输入 / 获取建议，或发送消息开始对话"
              suffix={false}
              autoSize={{ minRows: 2, maxRows: 6 }}
              onPaste={onPaste as any}
              onKeyDown={(e: React.KeyboardEvent) => onSlashKeyDown(e)}
              className={darkMode ? "bg-zinc-900 border border-zinc-800 rounded-lg shadow-sm" : "bg-white border border-gray-200 rounded-lg shadow-sm"}
              classNames={{ input: "!shadow-none !outline-none" }}
              style={{ boxShadow: "none" }}
              footer={(actionNode) => (
                <Flex justify="space-between" align="center" style={{ position: "relative" }}>
                  {/* 左侧：+ 菜单 + 思考 + 研究 + 权限模式 */}
                  <Flex gap={0} align="center">
                    {/* + 号展开菜单 */}
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={() => setPlusMenuOpen(!plusMenuOpen)}
                        onBlur={() => setTimeout(() => setPlusMenuOpen(false), 200)}
                        title="更多选项"
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: 28, height: 28, borderRadius: 6,
                          border: "none", background: "transparent",
                          cursor: "pointer",
                          color: darkMode ? "#a1a1aa" : "#6b7280",
                        }}
                      >
                        <Plus size={16} />
                      </button>

                      {/* + 展开面板 */}
                      {plusMenuOpen && (
                        <div
                          onMouseDown={(e) => e.preventDefault()}
                          style={{
                            position: "absolute",
                            bottom: "calc(100% + 8px)",
                            left: -4,
                            zIndex: 1000,
                            width: 260,
                            borderRadius: 14,
                            padding: "10px 10px 6px",
                            background: darkMode ? "#27272a" : "#fff",
                            border: darkMode ? "1px solid #3f3f46" : "1px solid #e5e7eb",
                            boxShadow: darkMode
                              ? "0 20px 50px rgba(0,0,0,0.5)"
                              : "0 10px 40px rgba(0,0,0,0.15)",
                            transformOrigin: "bottom left",
                            animation: "plus-panel-up 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
                          }}
                        >
                          {/* 添加照片和文件 */}
                          <button
                            onClick={() => {
                              fileInputRef.current?.click()
                              setPlusMenuOpen(false)
                            }}
                            style={{
                              display: "flex", alignItems: "center", gap: 9,
                              width: "100%", padding: "8px 12px", borderRadius: 10,
                              border: "none", background: "transparent", cursor: "pointer",
                              color: darkMode ? "#d4d4d8" : "#374151",
                              fontSize: 13.5, fontWeight: 500,
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = darkMode ? "#3f3f46" : "#f3f4f6"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                          >
                            <PaperClipOutlined style={{ fontSize: 16 }} />
                            添加照片和文件
                          </button>

                          {/* 计划模式（任务规划） */}
                          <div style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "8px 12px", marginTop: 2,
                          }}>
                            <span style={{ fontSize: 13.5, fontWeight: 500, color: darkMode ? "#d4d4d8" : "#374151" }}>
                              计划模式
                            </span>
                            <button
                              onClick={() => setEnablePlanning(!enablePlanning)}
                              style={{
                                width: 34, height: 20, borderRadius: 20,
                                border: "none", cursor: "pointer",
                                background: enablePlanning ? (darkMode ? "rgba(22,119,255,0.20)" : "rgba(22,119,255,0.18)") : (darkMode ? "#3f3f46" : "#d1d5db"),
                                position: "relative", transition: "background 0.2s",
                                flexShrink: 0,
                              }}
                            >
                              <span style={{
                                position: "absolute", top: 2,
                                left: enablePlanning ? 16 : 2,
                                width: 16, height: 16, borderRadius: "50%",
                                background: "#fff",
                                transition: "left 0.2s ease",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                              }} />
                            </button>
                          </div>

                          {/* 追求目标（联网搜索） */}
                          <div style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "8px 12px", marginTop: 2,
                          }}>
                            <span style={{ fontSize: 13.5, fontWeight: 500, color: darkMode ? "#d4d4d8" : "#374151" }}>
                              追求目标
                            </span>
                            <button
                              onClick={() => {
                                const hasSearchTool = availableTools.some(
                                  (t) => t.name.includes("search") || t.name.includes("exa") || t.name.includes("brave"),
                                )
                                if (!hasSearchTool && !enableSearch) {
                                  toast.error("未安装搜索工具", { description: "请先安装搜索类 MCP 工具" })
                                  return
                                }
                                setEnableSearch(!enableSearch)
                              }}
                              style={{
                                width: 34, height: 20, borderRadius: 20,
                                border: "none", cursor: "pointer",
                                background: enableSearch ? (darkMode ? "rgba(22,119,255,0.20)" : "rgba(22,119,255,0.18)") : (darkMode ? "#3f3f46" : "#d1d5db"),
                                position: "relative", transition: "background 0.2s",
                                flexShrink: 0,
                              }}
                            >
                              <span style={{
                                position: "absolute", top: 2,
                                left: enableSearch ? 16 : 2,
                                width: 16, height: 16, borderRadius: "50%",
                                background: "#fff",
                                transition: "left 0.2s ease",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                              }} />
                            </button>
                          </div>

                          {/* 插件（MCP 工具子菜单） */}
                          {availableTools.length > 0 && (
                            <div style={{ position: "relative" }}>
                              <button
                                onClick={() => setPluginSubOpen(!pluginSubOpen)}
                                style={{
                                  display: "flex", alignItems: "center", justifyContent: "space-between",
                                  width: "100%", padding: "8px 12px", marginTop: 2, marginBottom: 2,
                                  borderRadius: 10, border: "none", background:
                                    pluginSubOpen ? (darkMode ? "#3f3f46" : "#f3f4f6") : "transparent",
                                  cursor: "pointer",
                                  color: darkMode ? "#d4d4d8" : "#374151",
                                  fontSize: 13.5, fontWeight: 500,
                                  transition: "background 0.15s",
                                }}
                                onMouseEnter={(e) => !pluginSubOpen && (e.currentTarget.style.background = darkMode ? "#3f3f46" : "#f3f4f6")}
                                onMouseLeave={(e) => !pluginSubOpen && (e.currentTarget.style.background = "transparent")}
                              >
                                <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                  <LayoutGrid size={16} />
                                  插件
                                </span>
                                <ChevronDown size={13} style={{ opacity: 0.45, transition: "transform 0.2s", transform: pluginSubOpen ? "rotate(180deg)" : "none" }} />
                              </button>

                              {/* 插件子列表 — 向上弹出 */}
                              {pluginSubOpen && (
                                <div
                                  onMouseDown={(e) => e.preventDefault()}
                                  style={{
                                    position: "absolute",
                                    bottom: "calc(100% + 8px)",
                                    left: -4,
                                    zIndex: 1100,
                                    width: 260,
                                    maxHeight: 320,
                                    overflowY: "auto",
                                    borderRadius: 14,
                                    padding: "10px 8px 12px",
                                    background: darkMode ? "#27272a" : "#fff",
                                    border: darkMode ? "1px solid #3f3f46" : "1px solid #e5e7eb",
                                    boxShadow: darkMode
                                      ? "0 20px 50px rgba(0,0,0,0.5)"
                                      : "0 12px 40px rgba(0,0,0,0.15)",
                                    transformOrigin: "bottom left",
                                    animation: "plus-panel-up 0.18s cubic-bezier(0.16, 1, 0.3, 1) both",
                                  }}
                                >
                                  {/* 子列表标题 */}
                                  <Flex align="center" justify="space-between" style={{ padding: "0 10px 6px" }}>
                                    <span style={{ fontSize: 11.5, fontWeight: 600, color: darkMode ? "#a1a1aa" : "#9ca3af" }}>
                                      {availableTools.length} 个已安装插件
                                    </span>
                                  </Flex>

                                  {/* MCP 服务列表 */}
                                  {availableTools.map((tool) => (
                                    <button
                                      key={tool.name}
                                      onClick={() => {
                                        handleToolSelect({ key: tool.name })
                                        setPluginSubOpen(false)
                                        setPlusMenuOpen(false)
                                      }}
                                      style={{
                                        display: "flex", alignItems: "center", gap: 10,
                                        width: "100%", padding: "7px 10px", marginTop: 1,
                                        borderRadius: 8, border: "none", cursor: "pointer",
                                        background: "transparent",
                                        color: darkMode ? "#d4d4d8" : "#374151",
                                        textAlign: "left", transition: "background 0.15s",
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.background = darkMode ? "#3f3f46" : "#f3f4f6"}
                                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                    >
                                      {/* 真实图标 */}
                                      {tool.icon ? (
                                        <img
                                          src={tool.icon}
                                          alt={tool.displayName || tool.name}
                                          style={{
                                            width: 28, height: 28, borderRadius: 7,
                                            objectFit: "cover",
                                            flexShrink: 0,
                                            background: tool.iconBg || (darkMode ? "#3f3f46" : "#f3f4f6"),
                                            padding: tool.icon?.startsWith("http") ? 3 : 0,
                                          }}
                                          onError={(e) => {
                                            ;(e.target as HTMLImageElement).style.display = "none"
                                          }}
                                        />
                                      ) : (
                                        <div style={{
                                          width: 28, height: 28, borderRadius: 7,
                                          display: "flex", alignItems: "center", justifyContent: "center",
                                          background: darkMode ? "#3f3f46" : "#f3f4f6",
                                          flexShrink: 0,
                                        }}>
                                          <Zap size={13} style={{ color: "#1677ff" }} />
                                        </div>
                                      )}
                                      <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 500 }}>{tool.displayName || tool.name}</div>
                                        {tool.description && (
                                          <div style={{ fontSize: 11, opacity: 0.5, lineHeight: 1.35, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {typeof tool.description === "string"
                                              ? tool.description
                                              : tool.description?.[0]?.text || ""}
                                          </div>
                                        )}
                                      </div>
                                    </button>
                                  ))}

                                  {availableTools.length === 0 && (
                                    <div style={{ padding: "20px 12px", textAlign: "center", fontSize: 12.5, opacity: 0.45 }}>
                                      暂无已安装的插件
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => {
                          onSelectFiles(e)
                          setAttachmentOpen(true)
                          setPlusMenuOpen(false)
                        }}
                        className="hidden"
                      />
                    </div>

                    {/* 思考（深度思考）— 内联按钮 */}
                    <button
                      onClick={() => setEnableReasoning(!enableReasoning)}
                      title="深度思考：让模型进行更深入的推理"
                      className="inline-flex items-center gap-1.5"
                      style={{
                        marginLeft: 2,
                        padding: "4px 10px",
                        borderRadius: 8,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 400,
                        whiteSpace: "nowrap",
                        background: enableReasoning
                          ? (darkMode ? "rgba(22,119,255,0.18)" : "rgba(22,119,255,0.10)")
                          : "transparent",
                        color: enableReasoning
                          ? "#1677ff"
                          : (darkMode ? "#a1a1aa" : "#6b7280"),
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (!enableReasoning) e.currentTarget.style.background = darkMode ? "#27272a" : "#f3f4f6"
                      }}
                      onMouseLeave={(e) => {
                        if (!enableReasoning) e.currentTarget.style.background = "transparent"
                      }}
                    >
                      <Brain size={14} strokeWidth={1.75} />
                      <span>思考</span>
                    </button>

                    {/* 研究（联网搜索）— 内联按钮 */}
                    <button
                      onClick={() => {
                        const hasSearchTool = availableTools.some(
                          (t) => t.name.includes("search") || t.name.includes("exa") || t.name.includes("brave"),
                        )
                        if (!hasSearchTool && !enableSearch) {
                          toast.error("未安装搜索工具", { description: "请先安装搜索类 MCP 工具" })
                          return
                        }
                        setEnableSearch(!enableSearch)
                      }}
                      title="联网搜索：让模型检索最新信息"
                      className="inline-flex items-center gap-1.5"
                      style={{
                        padding: "4px 10px",
                        borderRadius: 8,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 400,
                        whiteSpace: "nowrap",
                        background: enableSearch
                          ? (darkMode ? "rgba(22,119,255,0.18)" : "rgba(22,119,255,0.10)")
                          : "transparent",
                        color: enableSearch
                          ? "#1677ff"
                          : (darkMode ? "#a1a1aa" : "#6b7280"),
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (!enableSearch) e.currentTarget.style.background = darkMode ? "#27272a" : "#f3f4f6"
                      }}
                      onMouseLeave={(e) => {
                        if (!enableSearch) e.currentTarget.style.background = "transparent"
                      }}
                    >
                      <Globe size={14} strokeWidth={1.75} />
                      <span>研究</span>
                    </button>

                    {/* 权限模式 — 向上弹出面板 */}
                    {setApprovalMode && (
                      <div style={{ position: "relative" }}>
                        <button
                          onClick={() => { setApprovalPanelOpen(!approvalPanelOpen); setPlusMenuOpen(false) }}
                          onBlur={() => setTimeout(() => setApprovalPanelOpen(false), 200)}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "4px 10px", borderRadius: 8,
                            border: "none", background: "transparent", cursor: "pointer",
                            color: darkMode ? "#a1a1aa" : "#6b7280",
                            fontSize: 13, whiteSpace: "nowrap", marginLeft: 2,
                          }}
                        >
                          <ShieldAlert size={14} />
                          <span>{APPROVAL_MODES.find(m => m.key === approvalMode)?.label || "请求批准"}</span>
                          <ChevronDown size={12} style={{ transition: "transform 0.2s", transform: approvalPanelOpen ? "rotate(180deg)" : "none" }} />
                        </button>

                        {/* 权限模式向上弹出面板 */}
                        {approvalPanelOpen && (
                          <div
                            onMouseDown={(e) => e.preventDefault()}
                            style={{
                              position: "absolute",
                              bottom: "calc(100% + 8px)",
                              left: -8,
                              zIndex: 1000,
                              width: 300,
                              borderRadius: 14,
                              padding: "12px 0 10px",
                              background: darkMode ? "#27272a" : "#fff",
                              border: darkMode ? "1px solid #3f3f46" : "1px solid #e5e7eb",
                              boxShadow: darkMode
                                ? "0 20px 50px rgba(0,0,0,0.5)"
                                : "0 10px 40px rgba(0,0,0,0.15)",
                              transformOrigin: "bottom left",
                              animation: "plus-panel-up 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
                            }}
                          >
                            {/* 标题行 */}
                            <Flex justify="space-between" align="center" style={{ padding: "0 14px 6px" }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: darkMode ? "#d4d4d8" : "#374151" }}>
                                应如何批准 BerryZ 操作？
                              </span>
                              <a
                                href="#"
                                onClick={(e) => e.preventDefault()}
                                style={{ fontSize: 11.5, color: "#1677ff", textDecoration: "underline" }}
                              >
                                了解更多
                              </a>
                            </Flex>

                            {/* 选项列表 */}
                            <div style={{ padding: "2px 8px" }}>
                              {APPROVAL_MODES.map((m) => {
                                const isActive = m.key === approvalMode
                                return (
                                  <button
                                    key={m.key}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => { setApprovalMode(m.key); setApprovalPanelOpen(false) }}
                                    style={{
                                      display: "flex", alignItems: "flex-start", gap: 10,
                                      width: "100%", padding: "9px 12px", marginTop: 2,
                                      borderRadius: 10, border: "none", cursor: "pointer",
                                      background: isActive
                                        ? (darkMode ? "#3f3f46" : "#f3f4f6")
                                        : "transparent",
                                      color: darkMode ? "#d4d4d8" : "#374151",
                                      textAlign: "left", transition: "all 0.2s ease",
                                    }}
                                    onMouseEnter={(e) => !isActive && (e.currentTarget.style.background = darkMode ? "#323232" : "#f9fafb")}
                                    onMouseLeave={(e) => !isActive && (e.currentTarget.style.background = "transparent")}
                                    onMouseDownCapture={(e) => (e.currentTarget.style.background = darkMode ? "#3a3a3e" : "#ececec")}
                                  >
                                    <span style={{ flexShrink: 0, marginTop: 1 }}>{m.icon}</span>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ fontWeight: 500, fontSize: 13.5 }}>{m.label}</span>
                                        {isActive && <Check size={14} strokeWidth={2.5} />}
                                      </div>
                                      <span style={{ fontSize: 11.5, opacity: 0.55, lineHeight: 1.45, marginTop: 2, display: "block" }}>
                                        {m.desc}
                                      </span>
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Flex>

                  {/* 右侧：发送按钮 */}
                  <Flex align="center" gap={10}>
                    {actionNode}
                  </Flex>
                </Flex>
              )}
            />
          )}
        </Suggestion>
      </div>
    </div>
  )
}
