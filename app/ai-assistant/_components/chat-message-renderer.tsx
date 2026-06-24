"use client"

import React from "react"
import Image from "next/image"
import { ArrowUpRight, Activity, FileText, Library } from "lucide-react"
import { motion } from "framer-motion"
import { Bubble, Think, Sources } from "@ant-design/x"
import XMarkdown, { type ComponentProps } from "@ant-design/x-markdown"
import { toast } from "sonner"
import dynamic from "next/dynamic"

const ChartRenderer = dynamic(() => import("@/components/chart-renderer"), {
  ssr: false,
  loading: () => <div className="p-4 text-xs text-zinc-400">Loading chart...</div>,
})

import type { Message } from "@/app/ai-assistant/types"
import { DynamicTaskPlanner } from "@/app/ai-assistant/_components/dynamic-task-planner"
import { PremiumReportLoader } from "@/app/ai-assistant/_components/premium-report-loader"
import { MonitorCard } from "@/components/ai/monitor-card"
import { DeviceBentoGrid } from "@/components/ai/device-bento-grid"
import { ControlBentoGrid } from "@/components/ai/control-bento-grid"
import { ScheduleCard } from "@/components/ai/schedule-card"
import { SpectralCard } from "@/components/ai/spectral-card"
import { ScheduledTasksList } from "@/components/ai/scheduled-tasks-list"
import { DeviceControlCard } from "@/components/ai/device-control-card"
import { AutomationStrategyCard } from "@/components/automation-strategy-card"
import { CapabilitiesCard } from "@/components/ai/capabilities-card"
import { VisionInspectionCard } from "@/components/ai/vision-inspection-card"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ChatMessageRendererProps {
  msg: Message
  deviceData: any
  autoExecuteCommands: boolean
  assistantMode: string
  enableReasoning: boolean
  isStreaming?: boolean
  onOpenStudio: (title: string, html: string) => void
  onOpenStudioFromTask?: () => void
  onExecuteCommand: (command: any) => Promise<void>
  onRetryCommand: (errorMsg: string) => void
  onSendMessage: (text: string) => void
  onSetInput: (text: string) => void
}

// ---------------------------------------------------------------------------
// XMarkdown custom components
// ---------------------------------------------------------------------------

const ThinkComponent = React.memo((props: ComponentProps) => {
  const [title, setTitle] = React.useState("深度思考中...")
  const [loading, setLoading] = React.useState(true)
  const [expand, setExpand] = React.useState(true)

  React.useEffect(() => {
    if (props.streamStatus === "done") {
      setTitle("思考完成")
      setLoading(false)
      setExpand(false)
    }
  }, [props.streamStatus])

  return (
    <Think title={title} loading={loading} expanded={expand} onClick={() => setExpand(!expand)}>
      {props.children}
    </Think>
  )
})
ThinkComponent.displayName = "ThinkComponent"

// ---------------------------------------------------------------------------
// DeepThinking — 渲染 msg.reasoning 字段（DeepSeek-R1 等思考模型的推理过程）
// ---------------------------------------------------------------------------

function DeepThinking({
  reasoning,
  isStreaming,
}: {
  reasoning?: { text: string; durationMs?: number }
  isStreaming?: boolean
}) {
  const [expanded, setExpanded] = React.useState(true)

  // 流式输出中 → 展开显示；完成后 → 折叠
  React.useEffect(() => {
    if (isStreaming) setExpanded(true)
    else setExpanded(false)
  }, [isStreaming])

  if (!reasoning?.text) return null

  const isDone = !isStreaming && reasoning.text.length > 0
  const title = isDone ? '深度思考完成' : '深度思考中...'
  const duration = reasoning.durationMs ? `${(reasoning.durationMs / 1000).toFixed(1)}s` : null

  return (
    <div className="mb-3">
      <Think
        title={title}
        loading={!isDone}
        expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        {/* 推理内容用 XMarkdown 渲染，支持流式动画 */}
        <XMarkdown
          paragraphTag="div"
          streaming={{
            hasNextChunk: isStreaming ?? false,
            enableAnimation: true,
            tail: { content: '▋' },
          }}
          styles={{ body: { fontSize: 13, lineHeight: 1.7, color: 'var(--ant-color-text-secondary)' } }}
        >
          {reasoning.text}
        </XMarkdown>
        {duration && isDone && (
          <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1">
            思考耗时 <span className="font-mono font-medium">{duration}</span>
          </div>
        )}
      </Think>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sources footer — rendered at the bottom of each assistant message
// ---------------------------------------------------------------------------

function SourcesFooter({ citations }: { citations?: any[] }) {
  if (!citations || citations.length === 0) return null
  const items = citations.map((c: any, i: number) => ({
    title: c.title || `${i + 1}. 来源`,
    url: c.url || "#",
    description: c.description,
    icon: undefined as React.ReactNode | undefined,
  }))
  return (
    <Sources
      title={`引用 ${items.length} 个来源`}
      items={items}
      expandIconPosition="end"
    />
  )
}

// ---------------------------------------------------------------------------
// Special tag splitter — only for non-markdown XML tags
// ---------------------------------------------------------------------------

const TAG_REGEX =
  /(<\s*CHART\s+type="echarts"\s*>[\s\S]*?<\/\s*CHART\s*>|<\s*CHART\s+type="vega-lite"\s*>[\s\S]*?<\/\s*CHART\s*>|<\s*SPECTRAL\s*>[\s\S]*?(?:<\/\s*SPECTRAL\s*>|$)|<\s*MONITOR\s*>[\s\S]*?(?:<\/\s*MONITOR\s*>|$)|<\s*SCHEDULED_TASKS\s*(?:>[\s\S]*?(?:<\/\s*SCHEDULED_TASKS\s*>|$)|(?:\/>))|<\s*DEVICE_BENTO\s*(?:>[\s\S]*?(?:<\/\s*DEVICE_BENTO\s*>|$)|(?:\/>))|<\s*CONTROL_BENTO\s*(?:>[\s\S]*?(?:<\/\s*CONTROL_BENTO\s*>|$)|(?:\/>))|<\s*TOOL_USED\s+[^>]*(?:\/>|>[\s\S]*?<\/\s*TOOL_USED\s*>)|<\s*ACTION_PROMPT\s*>[\s\S]*?<\/\s*ACTION_PROMPT\s*>|<\s*CONTEXT_COMPRESSED\s*\/?>|<\s*CAPABILITIES\s*\/?>|<\s*PAST_MEMORY\s*>[\s\S]*?<\/\s*PAST_MEMORY\s*>|<\s*AUTOMATION_STRATEGY\s*>[\s\S]*?<\/\s*AUTOMATION_STRATEGY\s*>|<\s*REPORT_GENERATING\s*>[\s\S]*?<\/\s*REPORT_GENERATING\s*>|\[REPORT:[^\]]+\][\s\S]*?(?:\[\/REPORT\]|$)|```json\s*[\s\S]*?```)/g

// ---------------------------------------------------------------------------
// renderTaggedContent — handles special XML tags, delegates markdown to XMarkdown
// ---------------------------------------------------------------------------

function renderTaggedContent(
  content: string,
  msg: Message,
  props: ChatMessageRendererProps
): React.ReactNode {
  const {
    deviceData,
    autoExecuteCommands,
    assistantMode,
    onExecuteCommand,
    onRetryCommand,
    onSendMessage,
    onSetInput,
  } = props

  const parts = content.split(TAG_REGEX)

  return (
    <>
      {parts.map((part, index) => {
        // JSON code blocks (IoT commands)
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
                  <div key={index} className="my-3 space-y-2">
                    {commands.map((cmd: any, i: number) =>
                      isIoT(cmd) ? (
                        <DeviceControlCard
                          key={i}
                          command={cmd}
                          status={autoExecuteCommands ? "executed" : "pending"}
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

        // SPECTRAL
        if (part.match(/^<\s*SPECTRAL/))
          return <div key={index} className="flex justify-center my-3"><SpectralCard data={deviceData} /></div>

        // TOOL_USED (security: ignore)
        if (part.match(/^<\s*TOOL_USED/)) return null

        // ACTION_PROMPT
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
                <div className="text-sm font-medium text-gray-700">系统提示：您需要决定下一步操作</div>
                <div className="flex flex-col sm:flex-row gap-2">
                  {actions.map((a, i) => (
                    <button key={i} onClick={() => onSendMessage(a.value)}
                      className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors">
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
            <div key={index} className="my-2 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-500">
              <Activity size={12} className="text-emerald-500" />
              <span>较早的对话历史已自动提炼并压缩</span>
            </div>
          )

        // CAPABILITIES
        if (part.match(/^<\s*CAPABILITIES/))
          return (
            <div key={index} className="flex justify-center my-4">
              <CapabilitiesCard onExampleClick={(ex) => { onSetInput(ex) }} />
            </div>
          )

        // VISION_INSPECTION
        if (part.match(/^<\s*VISION_INSPECTION/))
          return (
            <div key={index} className="flex justify-center my-4">
              <VisionInspectionCard
                onCaptureAndAnalyze={(imageBase64, query) => {
                  // 构造多模态消息并发送给 AI
                  const visionMessage = [
                    { type: "image_url", image_url: { url: imageBase64 } },
                    { type: "text", text: `【视觉巡检截图】${query || '请分析画面内容'}` }
                  ]
                  onSendMessage(JSON.stringify(visionMessage))
                }}
                onCameraControl={async (direction) => {
                  await onExecuteCommand({ action: 'control_camera', direction, pulses: 1600 })
                }}
              />
            </div>
          )

        // REPORT_GENERATING
        if (part.match(/^<\s*REPORT_GENERATING/))
          return (
            <div key={index} className="my-3">
              <PremiumReportLoader
                reportTitle={part.replace(/^<\s*REPORT_GENERATING\s*>/, "").replace(/<\/\s*REPORT_GENERATING\s*>/, "").trim() || "环境监测报告"}
                htmlContent="" isComplete={false}
              />
            </div>
          )

        // REPORT
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
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="group relative bg-gradient-to-r from-emerald-50 to-white rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all border border-gray-200"
                  onClick={() => props.onOpenStudio(title, html)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 truncate">{title}</h3>
                        <p className="text-xs text-gray-500">AI智能生成报告 · 点击查看详情</p>
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 bg-emerald-500 rounded-lg text-white text-xs font-medium">
                      查看报告
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
            <div key={index} className="my-3 p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700 italic">
              <div className="flex items-center gap-2 mb-1 text-xs font-bold uppercase tracking-wide">
                <Activity size={12} /> 历史记忆摘要
              </div>
              {part.replace(/^<\s*PAST_MEMORY\s*>/, "").replace(/<\/\s*PAST_MEMORY\s*>/, "").trim()}
            </div>
          )

        // SCHEDULED_TASKS
        if (part.match(/^<\s*SCHEDULED_TASKS/))
          return <div key={index} className="my-4"><ScheduledTasksList /></div>

        // CONTROL_BENTO
        if (part.match(/^<\s*CONTROL_BENTO/))
          return <div key={index} className="my-4"><ControlBentoGrid /></div>

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

        // DEVICE_BENTO
        if (part.match(/^<\s*DEVICE_BENTO/))
          return <div key={index} className="my-4"><DeviceBentoGrid /></div>

        // MONITOR
        if (part.match(/^<\s*MONITOR/))
          return <div key={index} className="flex justify-center my-3"><MonitorCard /></div>

        // CHART
        if (part.match(/^<\s*CHART/)) {
          try {
            const isVega = part.includes('type="vega-lite"')
            const tagRx = isVega ? /<\s*CHART\s+type="vega-lite"\s*>/ : /<\s*CHART\s+type="echarts"\s*>/
            const jsonStr = part.replace(tagRx, "").replace(/<\/\s*CHART\s*>/, "").trim()
            return (
              <div key={index} className="my-3 w-full min-w-[300px] md:min-w-[600px] h-[320px] rounded-lg overflow-hidden bg-white border border-gray-100">
                <ChartRenderer options={JSON.parse(jsonStr)} type={isVega ? "vega-lite" : "echarts"} style={{ height: "100%", width: "100%" }} />
              </div>
            )
          } catch (e) {
            return <div key={index} className="p-3 bg-red-50 text-red-500 rounded-lg text-xs">Chart Error: {String(e)}</div>
          }
        }

        // REPORT tags not caught by regex
        if (part.includes("[REPORT:") || part.includes("[/REPORT]")) return null

        if (!part.trim()) return null

        // Default: render with XMarkdown (handles <think>, <sup>, markdown)
        return (
          <div key={index}>
            <XMarkdown
              components={{ think: ThinkComponent }}
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
// ChatMessageRenderer — renders a single message
// ---------------------------------------------------------------------------

function ChatMessageRendererBase(props: ChatMessageRendererProps) {
  const { msg, onOpenStudio, onOpenStudioFromTask } = props

  let content: Message["content"] = msg.content

  // 清理工具调用标签（不需要 aiFeatures 过滤）
  if (typeof content === "string") {
    content = content.replace(/<SCHEDULE_TASK>[\s\S]*?<\/SCHEDULE_TASK>/g, "").trim()
    content = content.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "")
    content = content.replace(/```json\s*\{\s*"(?:action|function|name)":\s*"mcp_[^"]*"[\s\S]*?\}\s*```/g, "")
    content = content.replace(/```json\s*\{\s*"(?:action|function)":\s*"(?:scrape|search|find|fetch|get|query|analyze)"[\s\S]*?\}\s*```/g, "")
    content = content.replace(/```json\s*\{[\s\S]*?"tool_calls"[\s\S]*?\}\s*```/g, "")
    content = content.replace(/```json\s*\{[\s\S]*?"function_call"[\s\S]*?\}\s*```/g, "")
    content = content.replace(/```json\s*\{[\s\S]*?"arguments":\s*\{[\s\S]*?\}[\s\S]*?\}\s*```/g, "")
    content = content.replace(/^\s*\{\s*"(?:action|function|name)":\s*"mcp_[^"]*"[\s\S]*?\}\s*$/gm, "")

    // Bare TASK_LIST JSON filter
    if (!/<TASK_LIST>[\s\S]*?<\/TASK_LIST>/.test(content)) {
      content = content.replace(/\{\s*"(?:status|tasks)"[\s\S]*?"(?:tasks|status)"[\s\S]*?\}/g, (m: string) =>
        m.includes('"tasks"') && m.includes('"status"') ? "" : m)
    }
  }

  // Extract TASK_LIST for DynamicTaskPlanner
  let taskContent = ""
  if (typeof content === "string") {
    const m = content.match(/<TASK_LIST>([\s\S]*?)<\/TASK_LIST>/)
    if (m) {
      taskContent = m[0]
      content = content.replace(/<TASK_LIST>[\s\S]*?<\/TASK_LIST>/g, "")
    }
  }

  if (Array.isArray(content)) {
    return (
      <div className="space-y-2">
        {/* 深度思考内容（DeepSeek-R1 等推理模型） */}
        {props.enableReasoning !== false && (
          <DeepThinking reasoning={msg.reasoning} isStreaming={props.isStreaming} />
        )}
        {content.map((part, i) => (
          <div key={i}>
            {part.type === "image_url" && part.image_url && (
              <div className="relative w-full max-w-[300px] rounded-lg overflow-hidden border border-gray-200 my-2">
                <Image src={part.image_url.url} alt="User upload" width={300} height={200} className="object-cover w-full h-auto" />
              </div>
            )}
            {part.type === "text" && part.text && renderTaggedContent(part.text, msg, props)}
          </div>
        ))}
        {taskContent && (
          <DynamicTaskPlanner content={taskContent} onOpenStudio={onOpenStudioFromTask} />
        )}
        <SourcesFooter citations={msg.citations} />
      </div>
    )
  }

  const fullText = typeof content === "string" ? content : ""

  return (
    <>
      {/* 深度思考内容（DeepSeek-R1 等推理模型） */}
      {props.enableReasoning !== false && (
        <DeepThinking reasoning={msg.reasoning} isStreaming={props.isStreaming} />
      )}
      {/* 流式输出等待首chunk时：显示打字光标动画，避免白屏 */}
      {(typeof fullText === "string" && !fullText.trim() && props.isStreaming) ? (
        <span className="inline-block w-1.5 h-4 bg-emerald-500/70 animate-pulse rounded-sm ml-0.5" />
      ) : (
        renderTaggedContent(fullText, msg, props)
      )}
      {taskContent && (
        <DynamicTaskPlanner content={taskContent} onOpenStudio={onOpenStudioFromTask} />
      )}
      <SourcesFooter citations={msg.citations} />
    </>
  )
}

// 流式输出期间不使用 memo，确保每个 chunk 都触发重渲染实现逐字效果
export const ChatMessageRenderer = ChatMessageRendererBase

ChatMessageRenderer.displayName = "ChatMessageRenderer"
