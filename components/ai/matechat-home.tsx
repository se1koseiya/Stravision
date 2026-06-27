"use client"

import React, { useState, useRef, useEffect } from "react"
import { ConfigProvider, theme } from "antd"
import {
  Plus,
  ArrowUp,
  ChevronDown,
  ShieldAlert,
  Shield,
  ShieldCheck,
  Check,
  Brain,
  Globe,
  Mic,
  ScanSearch,
  Bug,
  LineChart,
  Sprout,
  MoreHorizontal,
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
  /** 深度思考模式 */
  enableReasoning?: boolean
  setEnableReasoning?: (v: boolean) => void
  /** 联网搜索模式 */
  enableSearch?: boolean
  setEnableSearch?: (v: boolean) => void
  /** 当前是否具备联网搜索工具 */
  hasSearchTool?: boolean
}

// 权限模式配置 — 与 chat-sender-input 统一
const APPROVAL_MODES = [
  { key: "request" as const, icon: <ShieldAlert size={14} />, label: "请求批准", desc: "执行设备控制、文件编辑等操作前始终确认" },
  { key: "auto" as const, icon: <Shield size={14} />, label: "替我审批", desc: "仅对高风险操作（如删除文件、修改配置）请求确认" },
  { key: "full" as const, icon: <ShieldCheck size={14} />, label: "完全访问权限", desc: "莓小智可自主执行所有工具操作，无需逐一确认" },
]

// 快捷指令 — 围绕莓小智的种植管理核心能力
const QUICK_ACTIONS: { key: string; label: string; prompt: string; icon: React.ReactNode }[] = [
  {
    key: "inspect",
    label: "巡检分析",
    icon: <ScanSearch size={14} />,
    prompt: `请基于设备上传的巡检数据，对当前草莓大棚执行一次完整巡检分析，按以下结构输出：

1. 【核心指标速览】当前温度、湿度、CO₂、光照、土壤含水率、NDVI 健康指数，对比标准范围（白天 20-25℃ / 夜间 10-15℃ / 湿度 60-80% / CO₂ 800-1200ppm / 光照 30000-50000lux / NDVI 0.6-0.8），用 ✅/⚠️/❌ 标注每一项。
2. 【异常定位】找出偏离阈值的指标，定位可能的发生位置（几号棚 / 哪一垄 / 哪个时段）。
3. 【风险预警】结合近 24h 趋势，预测未来 6-12h 可能放大的问题（如连续高湿 → 白粉病风险、连续高温干旱 → 红蜘蛛风险）。
4. 【处置建议】按「紧急 / 重要 / 一般」三档给出可执行措施，并标注每项预估耗时与人力。
5. 【复核点位】列出建议人工复核的 1-3 个具体位置，方便巡检员二次确认。

请开始：`,
  },
  {
    key: "disease",
    label: "病虫害识别",
    icon: <Bug size={14} />,
    prompt: `请以草莓病虫害专家身份协助识别当前问题。请按以下流程处理：

【第一步：信息采集】请先问我（必要时主动获取）以下信息——
- 受害部位：叶面 / 叶背 / 果实 / 茎秆 / 根部
- 症状形态：白粉 / 灰霉 / 褐色斑点 / 凹陷病斑 / 黄化 / 拉丝 / 虫体
- 受害比例：单株 / 连片 / 整棚
- 当前环境：温度、湿度、近 7 日天气（连阴/雨/晴）
- 是否已用药：药名、剂量、上次用药时间

【第二步：诊断】对照以下常见病害做鉴别——
• 白粉病（叶背白粉，15-25℃ 高湿诱发）
• 灰霉病（褐色水渍 + 灰霉层，RH>90%）
• 炭疽病（梭形黑褐病斑，28-32℃ 高温高湿）
• 红蜘蛛（叶面小白点 + 背面红点 + 结网，干旱环境）
• 蚜虫（嫩叶皱缩 + 蜜露煤污）

【第三步：方案】按「环境调控 → 物理防治 → 生物天敌 → 化学药剂」优先级输出 4 级方案，明确每项的触发条件、操作方法与安全间隔期（优先绿色防控）。

请先输出第 1 步的信息采集问题清单，等我回复后继续诊断。`,
  },
  {
    key: "env",
    label: "环境监测",
    icon: <LineChart size={14} />,
    prompt: `请汇总当前草莓大棚环境监测数据，并生成可直接交给种植户的简报：

【实时数据】
- 空气温度（℃） / 空气湿度（%）
- 土壤温度（℃） / 土壤含水率（%）
- CO₂ 浓度（ppm） / 光照强度（lux） / 累计光合有效辐射 J/cm²
- 近 1h / 24h / 7d 趋势对比

【分项评估】对每一项指标输出：当前值 | 标准范围 | 偏差 | 评级（优/良/中/差）。

【调控动作清单】仅列出当前需要立即触发的项，格式：
- [设备名] [动作] [目标值] [建议时长] [预期效果]

【异常告警】用一句大白话告诉种植户"现在该不该担心"——比如"温度 32℃ 已超阈值，建议 10 分钟内开启 1、2 号风机"。

【次日展望】结合近 3 日数据，预测明早 6-10 点可能出现的风险（高湿/低温/光照不足），并给出今夜 22:00-明早 6:00 的预防性调控建议。

请开始汇总：`,
  },
  {
    key: "strategy",
    label: "种植策略",
    icon: <Sprout size={14} />,
    prompt: `请以莓小智种植策略师身份，基于当前环境与生育期，给出接下来 7 天的精准调控策略：

【先确认生育期】——如果我还告诉你品种（红颜 / 甜查理 / 章姬 / 圣诞红等），请自行结合品种特性。

【一、环境策略（按生育期）】给出每天的：
- 白天温度区间、夜间温度区间、湿度区间
- 通风时段、加湿/除湿触发条件
- CO₂ 释放窗口与目标浓度
- 补光时长（如需要）与推荐光谱配比
  - 营养生长期：蓝光为主（R:50 G:100 B:255）
  - 花果期：红光为主（R:255 G:100 B:50）
  - 平衡期：R:200 G:50 B:150

【二、水肥策略】
- 灌溉频次、每次时长、EC/pH 目标区间
- 关键生育期重点元素（花期偏磷钾、果实膨大期偏钾）

【三、农事操作】按日期给出 7 天任务表：摘老叶、疏花疏果、授粉、采收、防病节点等。

【四、风险预案】列出本周最可能的 2 类风险及应对 SOP。

请先读取我当前大棚的实时数据，再输出策略。`,
  },
  {
    key: "more",
    label: "更多",
    icon: <MoreHorizontal size={14} />,
    prompt: "",
  },
]

export function MateChatHome({ onSendMessage, input, setInput, isLoading, darkMode = false, approvalMode = "request", setApprovalMode, enableReasoning = false, setEnableReasoning, enableSearch = false, setEnableSearch, hasSearchTool = true }: MateChatHomeProps) {
  const [innerInput, setInnerInput] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const displayValue = input || innerInput
  const [approvalOpen, setApprovalOpen] = useState(false)
  // 顶部 IP 动图 — 每次页面刷新都换一张（避免 SSR/CSR 水合不一致）
  const [ipGif, setIpGif] = useState<"eat" | "watch">("eat")
  useEffect(() => {
    setIpGif(Math.random() < 0.5 ? "watch" : "eat")
  }, [])

  // 招呼语打字机效果
  const GREETING = "莓园今天怎么样？我来帮你打理。"
  const [typed, setTyped] = useState("")
  const [typingDone, setTypingDone] = useState(false)
  useEffect(() => {
    setTyped("")
    setTypingDone(false)
    let i = 0
    const id = setInterval(() => {
      i += 1
      setTyped(GREETING.slice(0, i))
      if (i >= GREETING.length) {
        clearInterval(id)
        setTypingDone(true)
      }
    }, 90)
    return () => clearInterval(id)
  }, [])

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

  // 点击底部快捷指令胶囊：把提示词注入输入框并获得焦点
  const handleQuickAction = (action: typeof QUICK_ACTIONS[number]) => {
    if (action.key === "more") {
      inputRef.current?.focus()
      return
    }
    handleChange(action.prompt)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      // 把光标移到末尾
      const el = inputRef.current
      if (el) {
        const len = el.value.length
        el.setSelectionRange(len, len)
      }
    })
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
        @keyframes type-blink {
          0%, 50% { opacity: 1; }
          50.01%, 100% { opacity: 0; }
        }
      `}</style>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "center",
        minHeight: "100%",
        padding: "40px 32px 56px",
        background: darkMode ? "#09090b" : "#fff",
      }}>
        <div style={{ width: "100%", maxWidth: 760, margin: "0 auto" }}>
          {/* 顶部：招呼语 + 右侧 IP 动图 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 18,
            }}
          >
            <h1 style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: -0.3,
              color: darkMode ? "#fafafa" : "#18181b",
              lineHeight: 1.35,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              minHeight: 40,
              minWidth: 0,
              flex: 1,
            }}>
              {typed}
              {/* 打字光标 — 完成时自动消失 */}
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: 2,
                  height: "1em",
                  marginLeft: 2,
                  verticalAlign: "-0.15em",
                  background: darkMode ? "#fafafa" : "#18181b",
                  animation: typingDone ? "none" : "type-blink 0.9s steps(1) infinite",
                  opacity: typingDone ? 0 : 1,
                }}
              />
            </h1>
            {/* 右侧 IP 形象动图 — 紧贴招呼语末尾 */}
            <div
              aria-hidden
              style={{
                flexShrink: 0,
                width: 72,
                height: 72,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                filter: darkMode ? "brightness(0.95)" : undefined,
              }}
            >
              <img
                key={ipGif}
                src={`/AI-gif/${ipGif}.gif`}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </div>
          </div>

          {/* 输入容器 — 极简胶囊：左侧 mic/plus，右侧 思考/发送 */}
          <div
            style={{
              borderRadius: 22,
              padding: "12px 14px",
              background: darkMode ? "#16161a" : "#ffffff",
              border: darkMode ? "1px solid #27272a" : "1px solid #e5e7eb",
              boxShadow: darkMode
                ? "0 1px 0 rgba(255,255,255,0.04) inset"
                : "0 1px 2px rgba(15,23,42,0.04)",
            }}
          >
            {/* 文本输入区 */}
            <textarea
              ref={inputRef}
              className="home-welcome-textarea"
              value={displayValue}
              onChange={(e) => { handleChange(e.target.value); adjustHeight() }}
              onKeyDown={handleKeyDown}
              placeholder="和我聊聊吧"
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
                minHeight: 28,
                maxHeight: 120,
                overflowY: "auto",
                padding: "6px 6px 4px",
              }}
            />

            {/* Footer 行：左侧 mic+plus，右侧 思考/研究/权限 + 发送 */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 4,
            }}>
              {/* 左侧图标按钮组 */}
              <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                <button
                  title="语音输入"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 32, height: 32, borderRadius: 10,
                    border: "none", background: "transparent",
                    cursor: "pointer",
                    color: darkMode ? "#a1a1aa" : "#6b7280",
                    flexShrink: 0,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#27272a" : "#f3f4f6" }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
                >
                  <Mic size={16} />
                </button>
                <button
                  title="更多选项"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 32, height: 32, borderRadius: 10,
                    border: "none", background: "transparent",
                    cursor: "pointer",
                    color: darkMode ? "#a1a1aa" : "#6b7280",
                    flexShrink: 0,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = darkMode ? "#27272a" : "#f3f4f6" }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* 右侧：思考/研究/权限 + 发送 */}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {/* 思考（深度思考） */}
                {setEnableReasoning && (
                  <button
                    onClick={() => setEnableReasoning(!enableReasoning)}
                    title="深度思考：让模型进行更深入的推理"
                    className="inline-flex items-center gap-1"
                    style={{
                      padding: "5px 10px",
                      borderRadius: 10,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      background: enableReasoning
                        ? (darkMode ? "rgba(22,119,255,0.18)" : "rgba(22,119,255,0.10)")
                        : "transparent",
                      color: enableReasoning
                        ? "#1677ff"
                        : (darkMode ? "#a1a1aa" : "#6b7280"),
                      transition: "all 0.2s",
                    }}
                  >
                    <Brain size={14} strokeWidth={1.75} />
                    <span>思考</span>
                    <ChevronDown size={12} />
                  </button>
                )}

                {/* 研究（联网搜索） */}
                {setEnableSearch && (
                  <button
                    onClick={() => {
                      if (!hasSearchTool && !enableSearch) {
                        alert("未安装搜索工具")
                        return
                      }
                      setEnableSearch(!enableSearch)
                    }}
                    title="联网搜索：让模型检索最新信息"
                    className="inline-flex items-center gap-1"
                    style={{
                      padding: "5px 10px",
                      borderRadius: 10,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      background: enableSearch
                        ? (darkMode ? "rgba(22,119,255,0.18)" : "rgba(22,119,255,0.10)")
                        : "transparent",
                      color: enableSearch
                        ? "#1677ff"
                        : (darkMode ? "#a1a1aa" : "#6b7280"),
                      transition: "all 0.2s",
                    }}
                  >
                    <Globe size={14} strokeWidth={1.75} />
                    <span>研究</span>
                  </button>
                )}

                {/* 权限模式入口（点击展开面板） */}
                {setApprovalMode && (
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={() => setApprovalOpen(!approvalOpen)}
                      title="应如何批准操作？"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "5px 8px 5px 10px",
                        borderRadius: 10,
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        color: darkMode ? "#a1a1aa" : "#6b7280",
                        fontSize: 13,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {currentMode.icon}
                      <ChevronDown size={12} style={{
                        transition: "transform 0.2s ease",
                        transform: approvalOpen ? "rotate(180deg)" : "rotate(0deg)",
                      }} />
                    </button>
                    {approvalOpen && (
                      <div
                        className="approval-panel-animate"
                        onMouseDown={(e) => e.preventDefault()}
                        style={{
                          position: "absolute",
                          top: "calc(100% + 6px)",
                          right: 0,
                          zIndex: 1000,
                          width: 320,
                          borderRadius: 14,
                          padding: "16px 12px 10px",
                          background: darkMode ? "#27272a" : "#fff",
                          border: darkMode ? "1px solid #3f3f46" : "1px solid #e5e7eb",
                          boxShadow: darkMode
                            ? "0 20px 50px rgba(0,0,0,0.5)"
                            : "0 10px 40px rgba(0,0,0,0.15)",
                          transformOrigin: "top right",
                        }}
                      >
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
                                transition: "background 0.2s ease",
                              }}
                            >
                              <span style={{ marginTop: 1.5, flexShrink: 0, color: darkMode ? "#a1a1aa" : "#6b7280" }}>
                                {React.cloneElement(mode.icon as React.ReactElement, { size: 17 })}
                              </span>
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
                              <span style={{
                                flexShrink: 0, marginTop: 2, width: 16,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                opacity: isActive ? 1 : 0,
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

                {/* 发送按钮 */}
                <button
                  onClick={handleSend}
                  disabled={!displayValue.trim() || isLoading}
                  title="发送"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 32, height: 32, borderRadius: "50%",
                    border: "none",
                    marginLeft: 4,
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

          {/* 底部：5 个快捷指令胶囊 */}
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 10,
            marginTop: 22,
          }}>
            {QUICK_ACTIONS.map((action) => {
              const hasDropdown = action.key === "more"
              return (
                <button
                  key={action.key}
                  onClick={() => handleQuickAction(action)}
                  className="inline-flex items-center gap-1.5"
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    border: darkMode ? "1px solid #2a2a2d" : "1px solid #e5e7eb",
                    background: darkMode ? "#16161a" : "#f9fafb",
                    color: darkMode ? "#d4d4d8" : "#4b5563",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = darkMode ? "#27272a" : "#f3f4f6"
                    e.currentTarget.style.borderColor = darkMode ? "#3f3f46" : "#d1d5db"
                    e.currentTarget.style.transform = "translateY(-1px)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = darkMode ? "#16161a" : "#f9fafb"
                    e.currentTarget.style.borderColor = darkMode ? "#2a2a2d" : "#e5e7eb"
                    e.currentTarget.style.transform = "translateY(0)"
                  }}
                >
                  <span style={{ display: "inline-flex", opacity: 0.85 }}>{action.icon}</span>
                  <span>{action.label}</span>
                  {hasDropdown && <ChevronDown size={12} style={{ opacity: 0.7 }} />}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </ConfigProvider>
  )
}
