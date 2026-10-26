"use client"

import React from "react"
import Image from "next/image"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import XMarkdown from "@ant-design/x-markdown"
import { MermaidCard } from "@/components/ai/mermaid-card"
import { SvgCard } from "@/components/ai/svg-card"
import { DeviceForgeCard, DeviceForgeSkeleton } from "@/components/ai/device-forge-card"
import { parseDeviceForgeCardData } from "@/lib/state/device-forge-store"
import { IconBrain, IconCalendar, IconCamera, IconChartHistogram, IconChartLine, IconFileText, IconLightning, IconSearch } from "@/components/icon";
// 🍓 `<EMO:id/>` 是 GrokBot 头像的表情指令，不属于正文
import { stripOrbExpressionTag } from "@/lib/ai/orb-expression";

import type { Message } from "@/app/ai-assistant/types"
import { DeviceControlCard } from "@/components/ai/device-control-card"
import { ScheduledTasksList } from "@/components/ai/scheduled-tasks-list"
import { SpectralCard } from "@/components/ai/spectral-card"
import { AutomationStrategyCard } from "@/components/automation-strategy-card"
import { PremiumReportLoader } from "@/app/ai-assistant/_components/premium-report-loader"
import { CheckpointConfirm, parseCheckpointContent, tryParseJsonWithRepair } from "@/components/ai/checkpoint-confirm"
import { SkillForgeCard, parseSkillForgeCardData } from "@/components/ai/skill-forge-card"
import { DiagnosisCard } from "@/components/ai/diagnosis-card"
import { isDiagnosisResult, type DiagnosisResult } from "@/lib/types/vision-diagnosis"
import { parseCompressionStats } from "@/lib/ai/context"
import { ClarifyCard, type ClarifyData } from "@/components/ai/clarify-card"
import { DecisionCard, type DecisionData } from "@/components/ai/decision-card"
import { PlanApprovalCard, type PlanData } from "@/components/ai/plan-approval-card"
import { VisionInspectionCard } from "@/components/ai/vision-inspection-card"

const ChartRenderer = dynamic(() => import("@/components/chart-renderer"), {
  ssr: false,
  loading: () => <div className="p-3 text-xs text-zinc-400">图表加载中...</div>,
})

// 动态加载任务规划器，与 PC 端 chat-message-renderer 保持一致
const DynamicTaskPlanner = dynamic(
  () => import("@/app/ai-assistant/_components/dynamic-task-planner").then((m) => m.DynamicTaskPlanner),
  { ssr: false, loading: () => <div className="p-3 text-xs text-zinc-400">任务规划加载中...</div> }
)

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MobileMessageContentProps {
  content: string
  msg: Message
  deviceData: any
  isStreaming?: boolean
  onExecuteCommand: (command: any) => Promise<void>
  onRetryCommand: (errorMsg: string) => void
  onSendMessage: (text: string) => void
  onSetInput: (text: string) => void
  onOpenStudio?: (title: string, html: string) => void
  /**
   * `<DIAGNOSIS>` 诊断卡的底图 = 用户刚发上来的那张原图。
   * 不传则卡片只有文字结论，`DetectionOverlay` 整块不渲染（用户看不出病在哪）。
   */
  diagnosisImageSrc?: string
  /** 会话 id。临时会话（`__temp__` 前缀）不传，否则病历会落进脏数据 */
  diagnosisSessionId?: string
  /** 本条消息在原始 messages 数组里的下标（当稳定消息键），与 PC 端同口径 */
  diagnosisMessageKey?: string
}

// ---------------------------------------------------------------------------
// 特殊标签正则 — 与 PC 端保持一致
// ---------------------------------------------------------------------------

const TAG_REGEX =
  /(<[^>]*AUTOMATION_STRATEGY[^>]*>[\s\S]*?<\/\s*AUTOMATION_STRATEGY\s*>|<[^>]*AUTOMATION_STRATEGY[^>]*>[\s\S]*$|<\s*CLARIFY\s*>[\s\S]*?(?:<\/\s*CLARIFY\s*>|$)|<\s*DECISION\s*>[\s\S]*?(?:<\/\s*DECISION\s*>|$)|<\s*DIAGNOSIS\s*>[\s\S]*?(?:<\/\s*DIAGNOSIS\s*>|$)|<\s*PLAN\s*>[\s\S]*?(?:<\/\s*PLAN\s*>|$)|<\s*VISION_INSPECTION\s*\/?>|<\s*DEVICE_FORGE\s*>[\s\S]*?(?:<\/\s*DEVICE_FORGE\s*>|$)|<\s*ILLU[^>]*>[\s\S]*?(?:<\/\s*ILLU\s*>|$)|<\s*CHART(?:\s+type="[^"]*")?\s*>[\s\S]*?<\/\s*CHART\s*>|<\s*SPECTRAL\s*>[\s\S]*?(?:<\/\s*SPECTRAL\s*>|$)|<\s*MONITOR\s*>[\s\S]*?(?:<\/\s*MONITOR\s*>|$)|<\s*SKILL_FORGE\s*(?:>[\s\S]*?(?:<\/\s*SKILL_FORGE\s*>|$)|(?:\/>))|<\s*SCHEDULED_TASKS\s*(?:>[\s\S]*?(?:<\/\s*SCHEDULED_TASKS\s*>|$)|(?:\/>))|<\s*DEVICE_BENTO\s*(?:>[\s\S]*?(?:<\/\s*DEVICE_BENTO\s*>|$)|(?:\/>))|<\s*CONTROL_BENTO\s*(?:>[\s\S]*?(?:<\/\s*CONTROL_BENTO\s*>|$)|(?:\/>))|<\s*TOOL_USED\s+[^>]*(?:\/>|>[\s\S]*?<\/\s*TOOL_USED\s*>)|<\s*ACTION_PROMPT\s*>[\s\S]*?<\/\s*ACTION_PROMPT\s*>|<\s*CONTEXT_COMPRESSED\s*>[\s\S]*?(?:<\/\s*CONTEXT_COMPRESSED\s*>|$)|<\s*CONTEXT_COMPRESSED\s*\/>|<\s*CAPABILITIES\s*\/?>|<\s*PAST_MEMORY\s*>[\s\S]*?<\/\s*PAST_MEMORY\s*>|<\s*REPORT_GENERATING\s*>[\s\S]*?<\/\s*REPORT_GENERATING\s*>|<\s*CHECKPOINT\s*>[\s\S]*?(?:<\/\s*CHECKPOINT\s*>|$)|\[REPORT:[^\]]+\][\s\S]*?(?:\[\/REPORT\]|$)|```mermaid\s*[\s\S]*?```|```json\s*[\s\S]*?```)/g

// ---------------------------------------------------------------------------
// 手机端能力卡片（精简版）
// ---------------------------------------------------------------------------

function MobileCapabilitiesCard({ onExampleClick }: { onExampleClick: (ex: string) => void }) {
  const caps = [
    { icon: IconLightning, title: "设备控制", color: "#059669", example: "打开水泵" },
    { icon: IconChartLine, title: "环境监测", color: "#059669", example: "当前环境如何" },
    { icon: IconChartHistogram, title: "光谱分析", color: "#059669", example: "获取光谱数据" },
    { icon: IconCamera, title: "视觉巡检", color: "#52525B", example: "巡检温室" },
    { icon: IconCalendar, title: "定时任务", color: "#eb2f96", example: "每天8点开灯" },
    { icon: IconFileText, title: "报告生成", color: "#52525B", example: "生成环境报告" },
    { icon: IconSearch, title: "知识搜索", color: "#DC2626", example: "白粉病怎么防治" },
    { icon: IconBrain, title: "智能分析", color: "#fa541c", example: "分析生长状态" },
  ]
  return (
    <div className="my-3">
      <div className="text-xs font-semibold text-zinc-500 mb-2 px-1">AI 能力一览</div>
      <div className="grid grid-cols-4 gap-2">
        {caps.map((c, i) => {
          const Icon = c.icon
          return (
            <button
              key={i}
              onClick={() => onExampleClick(c.example)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors active:scale-95"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${c.color}15` }}
              >
                <Icon size={16} style={{ color: c.color }} />
              </div>
              <span className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-tight text-center">{c.title}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// renderTaggedContent — 处理特殊 XML 标签，markdown 委托给 XMarkdown

/** 判定一个对象是否为图表配置（与 PC 端 chat-message-renderer 保持一致） */
function isMobileChartConfig(obj: any): boolean {
  return (
    obj &&
    typeof obj === "object" &&
    !Array.isArray(obj) &&
    typeof obj.type === "string" &&
    ["line", "bar", "area", "pie", "column", "histogram", "scatter"].includes(obj.type.toLowerCase()) &&
    Array.isArray(obj.data) &&
    obj.data.length > 0
  )
}
// ---------------------------------------------------------------------------

function renderTaggedContent(
  content: string,
  msg: Message,
  props: MobileMessageContentProps
): React.ReactNode {
  const {
    deviceData,
    onExecuteCommand,
    onRetryCommand,
    onSendMessage,
    onSetInput,
    onOpenStudio,
  } = props

  // 🍓 兜底剥离表情标签（与 PC 端 chat-message-renderer 同口径）
  const parts = stripOrbExpressionTag(content).split(TAG_REGEX)

  // 🔥 DEVICE_FORGE 去重：同一条消息只渲染第一张设备接入卡（前端直推注入 + 模型复述可能并存）
  let forgeCardRendered = false

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null
        // 🔥 DEVICE_FORGE 设备接入表单卡（与 PC 端同构）
        if (part.match(/^<\s*DEVICE_FORGE/)) {
          const closed = /<\/\s*DEVICE_FORGE\s*>$/.test(part)
          if (!closed) {
            // 未闭合（流式进行中）：若已有真实卡片则忽略残留片段，否则显示骨架
            return forgeCardRendered ? null : <DeviceForgeSkeleton key={index} />
          }
          const inner = part
            .replace(/^<\s*DEVICE_FORGE\s*>/, "")
            .replace(/<\/\s*DEVICE_FORGE\s*>\s*$/, "")
            .trim()
          const forgeData = parseDeviceForgeCardData(inner)
          if (forgeData) {
            if (forgeCardRendered) return null
            forgeCardRendered = true
            return <DeviceForgeCard key={index} data={forgeData} onSendMessage={onSendMessage} />
          }
          return null
        }
        // 🔥 Mermaid 示意图（与 PC 端同构，直接用 mermaid.js 渲染）
        if (part.startsWith("```mermaid")) {
          const code = part.replace(/^```mermaid\s*/, "").replace(/```$/, "").trim()
          return code ? <MermaidCard key={index} code={code} /> : null
        }
        // 🔥 ILLU 创意插画（与 PC 端同构：模型手绘 SVG，sanitize 后渲染）
        if (part.match(/^<\s*ILLU/)) {
          const closed = /<\/\s*ILLU\s*>\s*$/.test(part)
          const svgCode = part
            .replace(/^<\s*ILLU[^>]*>/, "")
            .replace(/<\/\s*ILLU\s*>\s*$/, "")
            .trim()
          return svgCode ? <SvgCard key={index} code={svgCode} streaming={!closed} /> : null
        }
        // ```svg 代码块兜底（与 PC 端一致）
        if (part.startsWith("```svg")) {
          const code = part.replace(/^```svg\s*/, "").replace(/```$/, "").trim()
          return code ? <SvgCard key={index} code={code} /> : null
        }
        // JSON 代码块（IoT 指令 / 图表配置兜底）
        if (part.startsWith("```json")) {
          try {
            const jsonContent = part.replace(/^```json\s*/, "").replace(/```$/, "").trim()
            if (jsonContent.startsWith("{") || jsonContent.startsWith("[")) {
              const parsed = JSON.parse(jsonContent)
              const isIoT = (obj: any) =>
                obj.action &&
                (obj.action === "toggle_relay" ||
                  obj.action === "set_led" ||
                  obj.action === "control_camera" ||
                  obj.action === "reset_camera" ||
                  obj.action === "move_camera_and_look" ||
                  obj.action === "take_camera_snapshot")
              const commands = Array.isArray(parsed) ? parsed : [parsed]
              if (commands.some(isIoT)) {
                return (
                  <div key={index} className="my-2 space-y-2">
                    {commands.map((cmd: any, i: number) =>
                      isIoT(cmd) ? (
                        <DeviceControlCard
                          key={i}
                          command={cmd}
                          status="executed"
                          error={msg?.commandErrors ? msg.commandErrors[i] : undefined}
                          onExecute={async (c) => { await onExecuteCommand(c) }}
                          onRetry={msg ? () => {
                            const errMsg = (msg.commandErrors && msg.commandErrors[i]) || "操作失败"
                            onRetryCommand(errMsg)
                          } : undefined}
                        />
                      ) : null
                    )}
                  </div>
                )
              }
              // 🔥 图表配置兜底：AI 不套 <CHART> 标签直接输出 ```json 图表配置时，
              // 此前被静默吞掉，表现为"说好的图消失"
              if (!Array.isArray(parsed) && isMobileChartConfig(parsed)) {
                return (
                  <div key={index} className="my-3 w-full h-[260px] rounded-xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                    <ChartRenderer options={parsed} style={{ height: "100%", width: "100%" }} />
                  </div>
                )
              }

              // 未识别的 JSON 不再静默吞掉：折叠展示
              return (
                <details key={index} className="my-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs">
                  <summary className="px-3 py-2 text-zinc-500 dark:text-zinc-400 select-none">结构化数据（点击展开）</summary>
                  <pre className="px-3 pb-2 overflow-x-auto text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap break-all">{jsonContent}</pre>
                </details>
              )
            }
            return (
              <details key={index} className="my-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs">
                <summary className="px-3 py-2 text-zinc-500 dark:text-zinc-400 select-none">代码块（点击展开）</summary>
                <pre className="px-3 pb-2 overflow-x-auto text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap break-all">{jsonContent}</pre>
              </details>
            )
          } catch {
            return (
              <details key={index} className="my-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs">
                <summary className="px-3 py-2 text-zinc-500 dark:text-zinc-400 select-none">代码块（解析失败，点击展开）</summary>
                <pre className="px-3 pb-2 overflow-x-auto text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap break-all">{part.replace(/^```json\s*/, "").replace(/```$/, "")}</pre>
              </details>
            )
          }
        }

        // SPECTRAL — 光谱卡片（手机端全宽）
        if (part.match(/^<\s*SPECTRAL/))
          return (
            <div key={index} className="my-3 w-full overflow-hidden">
              <SpectralCard data={deviceData} />
            </div>
          )

        // TOOL_USED（安全：忽略）
        if (part.match(/^<\s*TOOL_USED/)) return null

        // ACTION_PROMPT — 操作确认按钮（手机端纵向排列）
        if (part.match(/^<\s*ACTION_PROMPT/)) {
          try {
            const innerHtml = part.replace(/^<\s*ACTION_PROMPT\s*>/, "").replace(/<\/\s*ACTION_PROMPT\s*>$/, "").trim()
            const actionRegex = /<\s*ACTION\s+value="([^"]+)"\s*>([\s\S]*?)<\/\s*ACTION\s*>/g
            const actions: { value: string; label: string }[] = []
            let m
            while ((m = actionRegex.exec(innerHtml)) !== null)
              actions.push({ value: m[1], label: m[2].trim() })
            return (
              <div key={index} className="my-3 space-y-2">
                <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">系统提示：您需要决定下一步操作</div>
                <div className="flex flex-col gap-2">
                  {actions.map((a, i) => (
                    <button
                      key={i}
                      onClick={() => onSendMessage(a.value)}
                      className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-sm font-medium hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors active:scale-95"
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          } catch { return null }
        }

        // CONTEXT_COMPRESSED —— 与服务端下发的计量对齐（手机端只做一行摘要，详情在 PC 端）
        if (part.match(/^<\s*CONTEXT_COMPRESSED/)) {
          const compression = parseCompressionStats(part)
          return (
            <div key={index} className="my-2 flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 dark:text-zinc-400">
              <IconChartLine size={12} className="text-emerald-500 shrink-0" />
              <span>
                {compression
                  ? `已自动整理上下文：较早的 ${compression.foldedMessages} 条折叠为摘要，保留最近 ${compression.keptMessages} 条原文`
                  : "较早的对话历史已自动提炼并压缩"}
              </span>
            </div>
          )
        }

        // CAPABILITIES — 手机端精简能力卡片
        if (part.match(/^<\s*CAPABILITIES/))
          return <MobileCapabilitiesCard key={index} onExampleClick={(ex) => onSetInput(ex)} />

        // REPORT_GENERATING
        if (part.match(/^<\s*REPORT_GENERATING/))
          return (
            <div key={index} className="my-3">
              <PremiumReportLoader
                reportTitle={part.replace(/^<\s*REPORT_GENERATING\s*>/, "").replace(/<\/\s*REPORT_GENERATING\s*>/, "").trim() || "环境监测报告"}
                htmlContent=""
                isComplete={false}
              />
            </div>
          )

        // REPORT — 完成报告（手机端紧凑卡片）
        if (part.match(/^\[REPORT:/)) {
          try {
            const isComplete = part.endsWith("[/REPORT]")
            const m = part.match(/\[REPORT:([^\]]+)\]([\s\S]*?)(?:\[\/REPORT\]|$)/)
            if (!m) return null
            const title = m[1]
            const html = m[2].trim()
            if (!isComplete)
              return <div key={index} className="my-3"><PremiumReportLoader reportTitle={title} htmlContent={html || ""} isComplete={false} /></div>
            return (
              <div key={index} className="my-3">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group relative bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-500/10 dark:to-zinc-800 rounded-2xl p-3.5 cursor-pointer hover:shadow-sm transition-all border border-zinc-200 dark:border-zinc-700"
                  onClick={() => onOpenStudio?.(title, html)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                      <IconFileText className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{title}</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">AI智能生成报告 · 点击查看</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            )
          } catch { return null }
        }

        // PAST_MEMORY
        if (part.match(/^<\s*PAST_MEMORY/))
          return (
            <div key={index} className="my-3 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl text-sm text-amber-700 dark:text-amber-400 italic">
              <div className="flex items-center gap-2 mb-1 text-xs font-bold uppercase tracking-wide">
                <IconChartLine size={12} /> 历史记忆摘要
              </div>
              {part.replace(/^<\s*PAST_MEMORY\s*>/, "").replace(/<\/\s*PAST_MEMORY\s*>/, "").trim()}
            </div>
          )

        // SCHEDULED_TASKS — 定时任务列表
        if (part.match(/^<\s*SCHEDULED_TASKS/))
          return <div key={index} className="my-3"><ScheduledTasksList /></div>

        // SKILL_FORGE - 技能工坊结果卡片（读文档 → 生成技能 → 自测 → 注册）
        if (part.match(/^<\s*SKILL_FORGE/)) {
          const inner = part.replace(/^<\s*SKILL_FORGE[^>]*>/, "").replace(/<\/\s*SKILL_FORGE\s*>$/, "").trim()
          const cardData = parseSkillForgeCardData(inner)
          if (!cardData) return null
          return <div key={index}><SkillForgeCard data={cardData} onSendMessage={onSendMessage} /></div>
        }

        // AUTOMATION_STRATEGY
        if (part.match(/^<\s*AUTOMATION_STRATEGY/)) {
          try {
            const descMatch = part.match(/^<\s*AUTOMATION_STRATEGY\s+description="([^"]*)"[^>]*>/)
            const desc = descMatch ? descMatch[1] : undefined
            const inner = part.replace(/^<\s*AUTOMATION_STRATEGY[^>]*>/, "").replace(/<\/\s*AUTOMATION_STRATEGY\s*>$/, "").trim()
            const jsonMatch = inner.match(/```json\s*([\s\S]*?)\s*```/)
            if (!jsonMatch) return null
            return <div key={index}><AutomationStrategyCard strategy={JSON.parse(jsonMatch[1])} description={desc} /></div>
          } catch { return null }
        }

        // DIAGNOSIS — 病虫害诊断卡片（与 PC 端同构）
        // 模型按 components/ai/farm-skills.tsx 的契约输出 <DIAGNOSIS>{...}</DIAGNOSIS>。
        // 🚨 移动端此前完全没有这个分支：PC 端能看到诊断卡，手机上只有一坨裸 JSON 或干脆空白。
        // 流式未闭合 / 解析失败时静默留空 + console.warn（高频出现属正常中间态）。
        if (part.match(/^<\s*DIAGNOSIS/)) {
          const jsonText = part
            .replace(/^<\s*DIAGNOSIS\s*>/, "")
            .replace(/<\/\s*DIAGNOSIS\s*>\s*$/, "")
            .trim()
          if (!jsonText) return null
          const diagData = tryParseJsonWithRepair<DiagnosisResult>(jsonText)
          if (!diagData || !isDiagnosisResult(diagData)) {
            // 不静默吞掉：否则排障时只能靠猜「后端发了标签前端为什么没卡」
            console.warn(
              '[DiagnosisCard:mobile] 标签已到达但解析/校验失败，卡片不渲染：',
              diagData ? 'structure-invalid' : 'json-parse-failed',
              'len=' + jsonText.length,
              'head=' + jsonText.slice(0, 60),
            )
            return null
          }
          return (
            <DiagnosisCard
              key={index}
              result={diagData}
              imageSrc={props.diagnosisImageSrc}
              /* 病历自动入档的幂等种子。三者缺一则不入档（无会话上下文的场景）。 */
              archiveKey={
                props.diagnosisSessionId && props.diagnosisMessageKey
                  ? `${props.diagnosisSessionId}:${props.diagnosisMessageKey}:${index}`
                  : undefined
              }
              className="my-3"
            />
          )
        }

        // CLARIFY — 主动澄清（用户必须回话，否则 AI 只能停在那儿）
        if (part.match(/^<\s*CLARIFY/)) {
          const clarifyData = tryParseJsonWithRepair<ClarifyData>(
            part.replace(/^<\s*CLARIFY\s*>/, "").replace(/<\/\s*CLARIFY\s*>/, "").trim()
          )
          if (!clarifyData) return null
          return (
            <div key={index} className="my-3">
              <ClarifyCard data={clarifyData} onReply={(reply) => onSendMessage(`【澄清回复】${reply}`)} />
            </div>
          )
        }

        // DECISION — 可解释 AI 决策卡片
        if (part.match(/^<\s*DECISION/)) {
          const decisionData = tryParseJsonWithRepair<DecisionData>(
            part.replace(/^<\s*DECISION\s*>/, "").replace(/<\/\s*DECISION\s*>/, "").trim()
          )
          if (!decisionData) return null
          return (
            <div key={index} className="my-3">
              <DecisionCard data={decisionData} />
            </div>
          )
        }

        // PLAN — 计划审批（手机端也必须能批准/拒绝，否则 AI 会自己往下跑）
        if (part.match(/^<\s*PLAN/)) {
          const planData = tryParseJsonWithRepair<PlanData>(
            part.replace(/^<\s*PLAN\s*>/, "").replace(/<\/\s*PLAN\s*>/, "").trim()
          )
          if (!planData) return null
          return (
            <div key={index} className="my-3">
              <PlanApprovalCard
                data={planData}
                onApprove={(modified) => {
                  // 用户改过步骤就把改后的明细回灌，否则 AI 照原计划跑 = 白审批
                  const stepsText = (modified.steps || [])
                    .map((s, i) => `${i + 1}. ${s.content}${s.tool ? `（工具：${s.tool}）` : ""}`)
                    .join("\n")
                  const edited =
                    modified.title !== planData.title ||
                    modified.summary !== planData.summary ||
                    JSON.stringify(modified.steps) !== JSON.stringify(planData.steps)
                  onSendMessage(
                    `【计划批准】${modified.title || "执行计划"}\n\n计划摘要：${modified.summary || "（无）"}\n\n执行步骤：\n${stepsText}\n\n请按以上步骤逐步执行。${
                      edited ? "\n\n注意：用户已对计划进行修改，请严格按照修改后的步骤执行。" : ""
                    }`
                  )
                }}
                onReject={() => onSendMessage(`【计划拒绝】${planData.title || "执行计划"}\n请停止当前任务，不要执行。`)}
              />
            </div>
          )
        }

        // VISION_INSPECTION — 视觉巡检取景器
        // 手机上这块反而比 PC 更该有（摄像头就是随身设备），所以同构接过来。
        if (part.match(/^<\s*VISION_INSPECTION/))
          return (
            <div key={index} className="flex justify-center my-3">
              <VisionInspectionCard
                onCaptureAndAnalyze={(imageBase64, query) => {
                  onSendMessage(
                    JSON.stringify([
                      { type: "image_url", image_url: { url: imageBase64 } },
                      { type: "text", text: `【视觉巡检截图】${query || "请分析画面内容"}` },
                    ])
                  )
                }}
                onCameraControl={async (direction) => {
                  await onExecuteCommand({ action: "control_camera", direction, pulses: 1600 })
                }}
              />
            </div>
          )

        // CHART — 图表（手机端自适应宽度）
        if (part.match(/^<\s*CHART/)) {
          try {
            const jsonStr = part.replace(/<\s*CHART(\s+type="[^"]*")?\s*>/, "").replace(/<\/\s*CHART\s*>/, "").trim()
            return (
              <div key={index} className="my-3 w-full h-[260px] rounded-xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                <ChartRenderer options={JSON.parse(jsonStr)} style={{ height: "100%", width: "100%" }} />
              </div>
            )
          } catch (e) {
            return <div key={index} className="p-3 bg-red-50 text-red-500 rounded-lg text-xs">图表渲染失败: {String(e)}</div>
          }
        }

        // CHECKPOINT — 检查点确认（手机端同样需要用户参与关键决策）
        if (part.match(/^<\s*CHECKPOINT/)) {
          const cpData = parseCheckpointContent(part)
          if (!cpData) return null
          return (
            <div key={index} className="my-3">
              <CheckpointConfirm
                data={cpData}
                onChoose={(optionId, optionLabel, data, formData) => {
                  // 记录用户决策到 localStorage 审计日志（与 PC 端一致）
                  try {
                    const logEntry = {
                      checkpoint_id: data.id,
                      type: data.type,
                      title: data.title,
                      chosen_option_id: optionId,
                      chosen_option_label: optionLabel,
                      timestamp: new Date().toISOString(),
                      task_list_ref: data.task_list_ref,
                      form_data: formData,
                      source: "mobile",
                    }
                    const existing = JSON.parse(localStorage.getItem('checkpoint_decisions_log') || '[]')
                    existing.push(logEntry)
                    localStorage.setItem('checkpoint_decisions_log', JSON.stringify(existing.slice(-100)))
                  } catch {}

                  // 根据用户选择构造回复消息（与 PC 端一致）
                  let replyText = ""
                  if (optionId === "CANCEL") {
                    replyText = `【检查点确认】我选择取消操作：${data.title}\n请停止当前任务，不要执行。`
                  } else if (formData && Object.keys(formData).length > 0) {
                    // 有表单数据，构造结构化参数回复（避免用户打字）
                    const paramLines = Object.entries(formData)
                      .filter(([, v]) => v !== undefined && v !== null && v !== "")
                      .map(([k, v]) => {
                        const field = data.param_fields?.find((f) => f.key === k)
                        const label = field?.label || k
                        const unit = field?.unit || ""
                        let valStr = String(v)
                        if (field?.type === "switch") valStr = v ? "是" : "否"
                        return `- ${label}: ${valStr}${unit ? " " + unit : ""}`
                      })
                    if (paramLines.length > 0) {
                      replyText = `【检查点确认】已填写参数：${data.title}\n${paramLines.join("\n")}\n请按这些参数继续执行。`
                    } else {
                      replyText = `【检查点确认】我选择：${optionLabel}\n请根据此选择继续执行。`
                    }
                  } else if (optionId === "PROVIDE_INFO") {
                    replyText = `【检查点确认】我选择提供信息后执行：${data.title}\n请告诉我需要提供哪些具体参数。`
                  } else if (optionId === "USE_DEFAULT") {
                    replyText = `【检查点确认】我选择使用默认值继续：${data.title}\n请根据当前环境数据推断合理参数并继续执行。`
                  } else {
                    replyText = `【检查点确认】我选择：${optionLabel}\n请根据此选择继续执行。`
                  }
                  onSendMessage(replyText)
                }}
              />
            </div>
          )
        }

        // 忽略 DEVICE_BENTO / CONTROL_BENTO / MONITOR（手机端暂不支持复杂 Bento 布局）
        if (part.match(/^<\s*DEVICE_BENTO/) || part.match(/^<\s*CONTROL_BENTO/) || part.match(/^<\s*MONITOR/))
          return null

        // REPORT tags not caught by regex
        if (part.includes("[REPORT:") || part.includes("[/REPORT]")) return null

        if (!part.trim()) return null

        // 默认：XMarkdown 渲染
        return (
          <div key={index}>
            <XMarkdown
              paragraphTag="div"
              streaming={{
                hasNextChunk: props.isStreaming ?? false,
                enableAnimation: true,
                tail: { content: '▋' },
              }}
            >
              {part}
            </XMarkdown>
          </div>
        )
      })}
    </>
  )
}

// ---------------------------------------------------------------------------
// MobileMessageContent — 手机端消息内容渲染主组件
// ---------------------------------------------------------------------------

export function MobileMessageContent(props: MobileMessageContentProps) {
  const { content, msg, isStreaming } = props

  let text: string
  if (typeof content === "string") {
    text = content
  } else if (Array.isArray(content)) {
    // 多模态消息：提取文本部分
    text = content
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("")
  } else {
    text = ""
  }

  // 清理工具调用标签
  text = text
    .replace(/<SCHEDULE_TASK>[\s\S]*?<\/SCHEDULE_TASK>/g, "")
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "")
    .replace(/```json\s*\{\s*"(?:action|function|name)":\s*"mcp_[^"]*"[\s\S]*?\}\s*```/g, "")
    .replace(/```json\s*\{\s*"(?:action|function)":\s*"(?:scrape|search|find|fetch|get|query|analyze)"[\s\S]*?\}\s*```/g, "")
    .replace(/```json\s*\{[\s\S]*?"tool_calls"[\s\S]*?\}\s*```/g, "")
    .replace(/```json\s*\{[\s\S]*?"function_call"[\s\S]*?\}\s*```/g, "")
    .replace(/```json\s*\{[\s\S]*?"arguments":\s*\{[\s\S]*?\}[\s\S]*?\}\s*```/g, "")
    .replace(/^\s*\{\s*"(?:action|function|name)":\s*"mcp_[^"]*"[\s\S]*?\}\s*$/gm, "")
    // 🔥 兜底：模型偶发在正文里"宣布"工具调用（单独一行写工具名，如 automation_strategy_list）。
    // 真正的调用由「调用 xxx」卡片展示，正文里的裸工具名对用户毫无意义，整行剥离。
    .replace(
      /^\s*(?:automation_strategy_\w+|cron_\w+|task_\w+|user_memory_\w+|toggle_relay|set_led|control_camera|reset_camera|list_devices|delete_device|take_camera_snapshot|move_camera_and_look|get_sensor_history|get_all_spectrum|remember_user_info|recall_user_info|update_task|load_skill|deep_research|web_search|ask_user_question|enter_plan_mode|exit_plan_mode|create_skill_from_doc|refine_skill)\s*$/gm,
      ""
    )
    .trim()

  // 提取 TASK_LIST
  let taskContent = ""
  const taskMatch = text.match(/<TASK_LIST>([\s\S]*?)<\/TASK_LIST>/)
  if (taskMatch) {
    taskContent = taskMatch[0]
    text = text.replace(/<TASK_LIST>[\s\S]*?<\/TASK_LIST>/g, "")
  }

  // 渲染多模态图片
  const imageParts = Array.isArray(props.content)
    ? props.content.filter((c: any) => c.type === "image_url" && c.image_url)
    : []

  return (
    <div className="space-y-2">
      {/* 用户上传的图片 —— 手机屏幕更窄，封顶 132px；整张照片可见，不裁切 */}
      {imageParts.map((part: any, i: number) => (
        <div key={`img-${i}`} className="relative my-2 inline-block max-w-[132px] overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
          <Image
            src={part.image_url.url}
            alt="用户上传"
            width={132}
            height={132}
            className="block h-auto max-h-[132px] w-auto max-w-[132px]"
          />
        </div>
      ))}

      {/* 标签化内容渲染 */}
      {text && renderTaggedContent(text, msg, props)}

      {/* 任务列表（暂不渲染 DynamicTaskPlanner，避免手机端过于复杂） */}
      {taskContent && null}
    </div>
  )
}
