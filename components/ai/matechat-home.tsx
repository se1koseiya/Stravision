"use client"

import React, { useState, useRef } from "react"
import { ConfigProvider, theme } from "antd"
import {
  Plus,
  ArrowUp,
  ChevronDown,
  ShieldAlert,
  Shield,
  ShieldCheck,
  Check,
} from "lucide-react"
import dynamic from "next/dynamic"

const BerryOrb = dynamic(() => import("@/components/smoothui/berry-orb"), { ssr: false })

interface MateChatHomeProps {
  onSendMessage: (msg: string) => void
  input: string
  setInput: (value: string) => void
  isLoading: boolean
  darkMode?: boolean
  approvalMode?: "request" | "auto" | "full"
  setApprovalMode?: (mode: "request" | "auto" | "full") => void
}

// 权限模式配置 — 与 chat-sender-input 统一
const APPROVAL_MODES = [
  { key: "request" as const, icon: <ShieldAlert size={14} />, label: "请求批准", desc: "执行设备控制、文件编辑等操作前始终确认" },
  { key: "auto" as const, icon: <Shield size={14} />, label: "替我审批", desc: "仅对高风险操作（如删除文件、修改配置）请求确认" },
  { key: "full" as const, icon: <ShieldCheck size={14} />, label: "完全访问权限", desc: "莓小智可自主执行所有工具操作，无需逐一确认" },
]

export function MateChatHome({ onSendMessage, input, setInput, isLoading, darkMode = false, approvalMode = "request", setApprovalMode }: MateChatHomeProps) {
  const [innerInput, setInnerInput] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const displayValue = input || innerInput
  const [approvalOpen, setApprovalOpen] = useState(false)

  // 当前选中的权限模式信息
  const currentMode = APPROVAL_MODES.find(m => m.key === approvalMode) ?? APPROVAL_MODES[0]

  const handleSend = () => {
    const text = (input || innerInput).trim()
    if (!text || isLoading) return
    onSendMessage(text)
    setInnerInput("")
    setInput?.("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (val: string) => {
    setInnerInput(val)
    setInput?.(val)
  }

  // 自动调整高度
  const adjustHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto"
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px"
    }
  }

  return (
    <ConfigProvider theme={{ algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
      <style>{`
        .home-welcome-textarea:focus,
        .home-welcome-textarea:focus-visible,
        .home-welcome-textarea:focus-within {
          outline: none !important;
          border-color: transparent !important;
          box-shadow: none !important;
        }
        @keyframes approval-panel-in {
          from {
            opacity: 0;
            transform: translateY(-6px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .approval-panel-animate {
          animation: approval-panel-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100%",
        padding: "40px 24px",
        background: darkMode ? "#09090b" : "#fff",
      }}>
        {/* 欢迎标题 */}
        <div style={{ marginBottom: 36 }}>
          <span style={{ fontSize: 24, fontWeight: 600, color: darkMode ? "#fafafa" : "#18181b" }}>
            我们该做什么？
          </span>
        </div>

        {/* 输入容器 — 参考 Codex 风格：圆角大容器，footer 内嵌 */}
        <div style={{ width: "100%", maxWidth: 680 }}>
          {/* 主输入框 */}
          <div
            style={{
              borderRadius: 18,
              padding: "14px 16px 10px",
              background: darkMode ? "#1a1a1d" : "#f9fafb",
              border: darkMode ? "1px solid #2a2a2d" : "1px solid #e5e7eb",
            }}
          >
            {/* 文本输入区 */}
            <textarea
              ref={inputRef}
              className="home-welcome-textarea"
              value={displayValue}
              onChange={(e) => { handleChange(e.target.value); adjustHeight() }}
              onKeyDown={handleKeyDown}
              placeholder="随心输入"
              rows={1}
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                resize: "none",
                fontSize: 15,
                color: darkMode ? "#e4e4e7" : "#374151",
                background: "transparent",
                lineHeight: 1.6,
                fontFamily: "inherit",
                minHeight: 24,
                maxHeight: 120,
                overflowY: "auto",
                padding: "0 4px",
              }}
            />

            {/* 内嵌 Footer 行 */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 8,
              paddingTop: 6,
              borderTop: darkMode ? "1px solid #2a2a2d" : "1px solid #eaeaea",
            }}>
              {/* 左侧：+ 按钮 + 权限模式下拉 */}
              <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                {/* + 按钮 */}
                <button
                  title="更多选项"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 28, height: 28, borderRadius: 6,
                    border: "none", background: "transparent",
                    cursor: "pointer",
                    color: darkMode ? "#71717a" : "#9ca3af",
                    flexShrink: 0,
                  }}
                >
                  <Plus size={16} />
                </button>

                {/* 权限模式下拉面板 */}
                {setApprovalMode && (
                  <div style={{ position: "relative", marginLeft: 2 }}>
                    <button
                      onClick={() => setApprovalOpen(!approvalOpen)}
                      onBlur={() => setTimeout(() => setApprovalOpen(false), 150)}
                      title="应如何批准操作？"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px 10px",
                        borderRadius: 8,
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        color: darkMode ? "#a1a1aa" : "#6b7280",
                        fontSize: 13,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {currentMode.icon}
                      <span>{currentMode.label}</span>
                      <ChevronDown size={12} style={{
                        transition: "transform 0.2s ease",
                        transform: approvalOpen ? "rotate(180deg)" : "rotate(0deg)",
                      }} />
                    </button>

                    {/* 下拉面板 */}
                    {approvalOpen && (
                      <div
                        className="approval-panel-animate"
                        onMouseDown={(e) => e.preventDefault()}
                        style={{
                          position: "absolute",
                          top: "calc(100% + 6px)",
                          left: -8,
                          zIndex: 1000,
                          width: 320,
                          borderRadius: 14,
                          padding: "16px 12px 10px",
                          background: darkMode ? "#27272a" : "#fff",
                          border: darkMode ? "1px solid #3f3f46" : "1px solid #e5e7eb",
                          boxShadow: darkMode
                            ? "0 20px 50px rgba(0,0,0,0.5)"
                            : "0 10px 40px rgba(0,0,0,0.15)",
                          transformOrigin: "top left",
                        }}
                      >
                        {/* 面板标题行 */}
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 14,
                          padding: "0 6px",
                        }}>
                          <span style={{ fontSize: 13.5, fontWeight: 500, color: darkMode ? "#d4d4d8" : "#374151" }}>
                            应如何批准 BerryZ 操作？
                          </span>
                          <button
                            onClick={() => window.open("#", "_blank")}
                            style={{
                              border: "none", background: "transparent", cursor: "pointer",
                              fontSize: 12, color: darkMode ? "#a1a1aa" : "#6b7280",
                              textDecoration: "underline",
                            }}
                          >
                            了解更多
                          </button>
                        </div>

                        {/* 选项列表 */}
                        {APPROVAL_MODES.map((mode) => {
                          const isActive = approvalMode === mode.key
                          return (
                            <button
                              key={mode.key}
                              onClick={() => { setApprovalMode(mode.key); setApprovalOpen(false) }}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 10,
                                width: "100%",
                                padding: "9px 10px",
                                borderRadius: 10,
                                border: "none",
                                background: isActive
                                  ? (darkMode ? "#3f3f46" : "#e5e7eb")
                                  : "transparent",
                                cursor: "pointer",
                                marginBottom: 2,
                                transition: "background 0.2s ease, transform 0.15s ease",
                                transform: isActive ? "scale(1)" : "scale(1)",
                              }}
                              onMouseDown={(e) => {
                                ;(e.currentTarget as HTMLElement).style.transform = "scale(0.97)"
                                ;(e.currentTarget as HTMLElement).style.background = darkMode ? "#3a3a3e" : "#d4d5d9"
                              }}
                              onMouseUp={(e) => {
                                ;(e.currentTarget as HTMLElement).style.transform = "scale(1)"
                                ;(e.currentTarget as HTMLElement).style.background = isActive
                                  ? (darkMode ? "#3f3f46" : "#e5e7eb")
                                  : "transparent"
                              }}
                              onMouseLeave={(e) => {
                                ;(e.currentTarget as HTMLElement).style.transform = "scale(1)"
                                ;(e.currentTarget as HTMLElement).style.background = isActive
                                  ? (darkMode ? "#3f3f46" : "#e5e7eb")
                                  : "transparent"
                              }}
                            >
                              {/* 图标 */}
                              <span style={{ marginTop: 1.5, flexShrink: 0, color: darkMode ? "#a1a1aa" : "#6b7280" }}>
                                {React.cloneElement(mode.icon as React.ReactElement, { size: 17 })}
                              </span>
                              {/* 文字 */}
                              <div style={{ flex: 1, textAlign: "left" }}>
                                <div style={{
                                  fontSize: 13.5, fontWeight: 500,
                                  color: darkMode ? "#e4e4e7" : "#18181b",
                                  lineHeight: 1.35,
                                }}>
                                  {mode.label}
                                </div>
                                <div style={{
                                  fontSize: 11.5, marginTop: 2,
                                  color: darkMode ? "#71717a" : "#6b7280",
                                  lineHeight: 1.4,
                                }}>
                                  {mode.desc}
                                </div>
                              </div>
                              {/* 勾选标记 */}
                              <span style={{
                                flexShrink: 0, marginTop: 2, width: 16,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "opacity 0.2s ease, transform 0.2s ease",
                                opacity: isActive ? 1 : 0,
                                transform: isActive ? "scale(1)" : "scale(0.5)",
                              }}>
                                {isActive && (
                                  <Check size={16} style={{
                                    color: darkMode ? "#e4e4e7" : "#374151",
                                  }} />
                                )}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 右侧：发送按钮 */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                {/* 发送按钮 */}
                <button
                  onClick={handleSend}
                  disabled={!displayValue.trim() || isLoading}
                  title="发送"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 30, height: 30, borderRadius: "50%",
                    border: "none",
                    background: displayValue.trim()
                      ? (darkMode ? "#e4e4e7" : "#27272a")
                      : (darkMode ? "#2a2a2d" : "#e5e7eb"),
                    cursor: displayValue.trim() ? "pointer" : "not-allowed",
                    color: displayValue.trim()
                      ? (darkMode ? "#09090b" : "#fff")
                      : (darkMode ? "#52525b" : "#9ca3af"),
                    transition: "all 0.2s",
                  }}
                >
                  <ArrowUp size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ConfigProvider>
  )
}
