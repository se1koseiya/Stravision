"use client"

import React from "react"
import Image from "next/image"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import { Activity, FileText, Zap, Calendar, Camera, Search, BarChart3, Brain } from "lucide-react"
import XMarkdown from "@ant-design/x-markdown"

import type { Message } from "@/app/ai-assistant/types"
import { DeviceControlCard } from "@/components/ai/device-control-card"
import { ScheduledTasksList } from "@/components/ai/scheduled-tasks-list"
import { SpectralCard } from "@/components/ai/spectral-card"
import { AutomationStrategyCard } from "@/components/automation-strategy-card"
import { PremiumReportLoader } from "@/app/ai-assistant/_components/premium-report-loader"

const ChartRenderer = dynamic(() => import("@/components/chart-renderer"), {
  ssr: false,
  loading: () => <div className="p-3 text-xs text-zinc-400">图表加载中...</div>,
})

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
}

// ---------------------------------------------------------------------------
// 特殊标签正则 — 与 PC 端保持一致
// ---------------------------------------------------------------------------

const TAG_REGEX =
  /(<\s*CHART\s+type="echarts"\s*>[\s\S]*?<\/\s*CHART\s*>|<\s*CHART\s+type="vega-lite"\s*>[\s\S]*?<\/\s*CHART\s*>|<\s*SPECTRAL\s*>[\s\S]*?(?:<\/\s*SPECTRAL\s*>|$)|<\s*MONITOR\s*>[\s\S]*?(?:<\/\s*MONITOR\s*>|$)|<\s*SCHEDULED_TASKS\s*(?:>[\s\S]*?(?:<\/\s*SCHEDULED_TASKS\s*>|$)|(?:\/>))|<\s*DEVICE_BENTO\s*(?:>[\s\S]*?(?:<\/\s*DEVICE_BENTO\s*>|$)|(?:\/>))|<\s*CONTROL_BENTO\s*(?:>[\s\S]*?(?:<\/\s*CONTROL_BENTO\s*>|$)|(?:\/>))|<\s*TOOL_USED\s+[^>]*(?:\/>|>[\s\S]*?<\/\s*TOOL_USED\s*>)|<\s*ACTION_PROMPT\s*>[\s\S]*?<\/\s*ACTION_PROMPT\s*>|<\s*CONTEXT_COMPRESSED\s*\/?>|<\s*CAPABILITIES\s*\/?>|<\s*PAST_MEMORY\s*>[\s\S]*?<\/\s*PAST_MEMORY\s*>|<\s*AUTOMATION_STRATEGY\s*>[\s\S]*?<\/\s*AUTOMATION_STRATEGY\s*>|<\s*REPORT_GENERATING\s*>[\s\S]*?<\/\s*REPORT_GENERATING\s*>|\[REPORT:[^\]]+\][\s\S]*?(?:\[\/REPORT\]|$)|```json\s*[\s\S]*?```)/g

// ---------------------------------------------------------------------------
// 手机端能力卡片（精简版）
// ---------------------------------------------------------------------------

function MobileCapabilitiesCard({ onExampleClick }: { onExampleClick: (ex: string) => void }) {
  const caps = [
    { icon: Zap, title: "设备控制", color: "#1677ff", example: "打开水泵" },
    { icon: Activity, title: "环境监测", color: "#52c41a", example: "当前环境如何" },
    { icon: BarChart3, title: "光谱分析", color: "#722ed1", example: "获取光谱数据" },
    { icon: Camera, title: "视觉巡检", color: "#fa8c16", example: "巡检温室" },
    { icon: Calendar, title: "定时任务", color: "#eb2f96", example: "每天8点开灯" },
    { icon: FileText, title: "报告生成", color: "#13c2c2", example: "生成环境报告" },
    { icon: Search, title: "知识搜索", color: "#f5222d", example: "白粉病怎么防治" },
    { icon: Brain, title: "智能分析", color: "#fa541c", example: "分析生长状态" },
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
              <span className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-tight text-center">{c.title}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// renderTaggedContent — 处理特殊 XML 标签，markdown 委托给 XMarkdown
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

  const parts = content.split(TAG_REGEX)

  return (
    <>
      {parts.map((part, index) => {
        // JSON 代码块（IoT 指令）
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
              return null
            }
            return null
          } catch { return null }
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

        // CONTEXT_COMPRESSED
        if (part.match(/^<\s*CONTEXT_COMPRESSED/))
          return (
            <div key={index} className="my-2 flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 dark:text-zinc-400">
              <Activity size={12} className="text-emerald-500 shrink-0" />
              <span>较早的对话历史已自动提炼并压缩</span>
            </div>
          )

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
                  className="group relative bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-500/10 dark:to-zinc-800 rounded-2xl p-3.5 cursor-pointer hover:shadow-md transition-all border border-zinc-200 dark:border-zinc-700"
                  onClick={() => onOpenStudio?.(title, html)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-white" />
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
                <Activity size={12} /> 历史记忆摘要
              </div>
              {part.replace(/^<\s*PAST_MEMORY\s*>/, "").replace(/<\/\s*PAST_MEMORY\s*>/, "").trim()}
            </div>
          )

        // SCHEDULED_TASKS — 定时任务列表
        if (part.match(/^<\s*SCHEDULED_TASKS/))
          return <div key={index} className="my-3"><ScheduledTasksList /></div>

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

        // CHART — 图表（手机端自适应宽度）
        if (part.match(/^<\s*CHART/)) {
          try {
            const isVega = part.includes('type="vega-lite"')
            const tagRx = isVega ? /<\s*CHART\s+type="vega-lite"\s*>/ : /<\s*CHART\s+type="echarts"\s*>/
            const jsonStr = part.replace(tagRx, "").replace(/<\/\s*CHART\s*>/, "").trim()
            return (
              <div key={index} className="my-3 w-full h-[260px] rounded-xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                <ChartRenderer options={JSON.parse(jsonStr)} type={isVega ? "vega-lite" : "echarts"} style={{ height: "100%", width: "100%" }} />
              </div>
            )
          } catch (e) {
            return <div key={index} className="p-3 bg-red-50 text-red-500 rounded-lg text-xs">图表渲染失败: {String(e)}</div>
          }
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
      {/* 用户上传的图片 */}
      {imageParts.map((part: any, i: number) => (
        <div key={`img-${i}`} className="relative w-full max-w-[240px] rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 my-2">
          <Image src={part.image_url.url} alt="用户上传" width={240} height={180} className="object-cover w-full h-auto" />
        </div>
      ))}

      {/* 标签化内容渲染 */}
      {text && renderTaggedContent(text, msg, props)}

      {/* 任务列表（暂不渲染 DynamicTaskPlanner，避免手机端过于复杂） */}
      {taskContent && null}
    </div>
  )
}
