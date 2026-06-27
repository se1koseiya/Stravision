"use client"

import React from "react"
import Image from "next/image"
import { ArrowUpRight, Activity, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { FileTextOutlined, ArrowRightOutlined } from "@ant-design/icons"
import { motion } from "framer-motion"
import { Bubble, Think, Sources } from "@ant-design/x"
import XMarkdown, { type ComponentProps } from "@ant-design/x-markdown"
import { Card, Flex, Typography, Button } from "antd"
import { BerryXCard } from "@/components/ui/berry-xcard"
import { buildCommands } from "@/lib/a2ui/berry-protocol"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import type { A2UICommand_v0_9, ActionPayload } from "@ant-design/x-card"
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
import { useMemo } from "react"
import { SpectralCard } from "@/components/ai/spectral-card"
import { ScheduledTasksList } from "@/components/ai/scheduled-tasks-list"
import { DeviceControlCard } from "@/components/ai/device-control-card"
import { AutomationStrategyCard } from "@/components/automation-strategy-card"
import { CapabilitiesCard } from "@/components/ai/capabilities-card"
import { VisionInspectionCard } from "@/components/ai/vision-inspection-card"

const { Text } = Typography

// ---------------------------------------------------------------------------
// 报告完成态小卡 — Ant Design + XCard + A2UI 协议
// 颜色统一 BERRY_THEME.primary (#1677ff)
// ---------------------------------------------------------------------------
function ReportCompleteCard({ title, html, onOpen }: { title: string; html: string; onOpen: () => void }) {
  const surfaceId = `report-complete-${Date.now()}`
  const a2uiCommands: A2UICommand_v0_9[] = useMemo(() => buildCommands(
    surfaceId,
    [
      { id: 'header', component: 'CardHeader', title, icon: 'FileTextOutlined', status: 'success' },
      { id: 'subtitle', component: 'Metric', title: 'AI智能生成报告', value: '可查看', color: BERRY_THEME.primary },
      { id: 'open', component: 'ActionButton', label: '查看报告', action: 'open-report', type: 'primary', icon: 'ArrowRightOutlined' },
    ],
    ['header', 'subtitle', 'open']
  ), [surfaceId, title])

  const handleAction = (payload: ActionPayload) => {
    if (payload.name === 'open-report') onOpen()
  }

  const fallback = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        size="small"
        hoverable
        bordered
        onClick={onOpen}
        style={{
          background: BERRY_THEME.gradients.cardHero(BERRY_THEME.primary),
          borderColor: `${BERRY_THEME.primary}30`,
          borderRadius: BERRY_THEME.radius.lg,
          boxShadow: BERRY_THEME.shadow.sm,
        }}
        styles={{ body: { padding: 14 } }}
      >
        <Flex align="center" justify="space-between" gap={12}>
          <Flex align="center" gap={12} style={{ minWidth: 0, flex: 1 }}>
            <Flex
              align="center"
              justify="center"
              style={{
                width: 40, height: 40, borderRadius: 10,
                background: BERRY_THEME.primary, flexShrink: 0,
              }}
            >
              <FileTextOutlined style={{ color: '#fff', fontSize: 20 }} />
            </Flex>
            <Flex vertical gap={2} style={{ minWidth: 0, flex: 1 }}>
              <Text strong style={{ fontSize: 14, lineHeight: 1.4 }} ellipsis>
                {title}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                AI 智能生成报告 · 点击查看详情
              </Text>
            </Flex>
          </Flex>
          <Button
            type="primary"
            size="small"
            icon={<ArrowRightOutlined />}
            onClick={(e) => { e.stopPropagation(); onOpen() }}
          >
            查看报告
          </Button>
        </Flex>
      </Card>
    </motion.div>
  )

  return (
    <BerryXCard
      surfaceId={surfaceId}
      commands={a2uiCommands}
      onAction={handleAction}
      components={{}}
      fallback={fallback}
      timeout={400}
    />
  )
}

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
// CollapsibleCodeBlock — 长代码块自动折叠（流式结束后折叠，点击展开/收起）
// ---------------------------------------------------------------------------

const CODE_COLLAPSE_LINES = 15
const CODE_COLLAPSE_CHARS = 800
const CODE_COLLAPSED_MAX_HEIGHT = 260

// 递归提取 React 节点中的纯文本，用于衡量代码块长度
function getNodeText(node: React.ReactNode): string {
  if (node == null || node === false) return ""
  if (typeof node === "string") return node
  if (typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(getNodeText).join("")
  if (React.isValidElement(node)) {
    return getNodeText((node.props as any).children)
  }
  return ""
}

const CollapsibleCodeBlock = React.memo((props: ComponentProps) => {
  const { children, streamStatus, className, style, domNode, ...rest } = props
  const [expanded, setExpanded] = React.useState(false)

  const text = React.useMemo(() => getNodeText(children), [children])
  const lineCount = React.useMemo(
    () => text.split("\n").filter((l) => l.trim()).length,
    [text]
  )
  const isLong = lineCount > CODE_COLLAPSE_LINES || text.length > CODE_COLLAPSE_CHARS
  // 流式输出时保持展开；输出完成且内容较长时折叠
  const collapsed = !expanded && streamStatus === "done" && isLong

  return (
    <div className="relative my-3">
      <pre
        className={className}
        style={{
          ...(style as React.CSSProperties),
          maxHeight: collapsed ? CODE_COLLAPSED_MAX_HEIGHT : undefined,
          overflow: collapsed ? "hidden" : undefined,
          transition: "max-height .3s ease",
        }}
        {...rest}
      >
        {children}
      </pre>
      {collapsed && (
        <>
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 rounded-b-lg bg-gradient-to-t from-white via-white/85 to-transparent dark:from-zinc-900 dark:via-zinc-900/85" />
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md hover:scale-105 transition-transform"
          >
            <ChevronDown size={12} /> 展开代码 · {lineCount} 行
          </button>
        </>
      )}
      {expanded && isLong && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-2 flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <ChevronUp size={12} /> 收起
        </button>
      )}
    </div>
  )
})
CollapsibleCodeBlock.displayName = "CollapsibleCodeBlock"

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
    <div
      className="berry-sources-footer"
      style={{
        marginTop: 8,
        paddingTop: 8,
        borderTop: "1px dashed var(--ant-color-border-secondary, rgba(0,0,0,0.06))",
        opacity: 0.78,
      }}
    >
      <Sources
        title={`引用 ${items.length} 个来源`}
        items={items}
        expandIconPosition="end"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// extractSourcesFromContent — 从 AI 输出中提取散落的引用 JSON 数组
//
// 修复 bug：AI 偶发把引用信息直接以原始 JSON 字符串形式写到正文里（不是写在 citations 字段），
// 导致 Sources 组件拿不到数据，正文里出现一大坨 JSON 文本。
// 解决：扫描所有文本内容，匹配形如 [{"number": 1, "title": "...", "url": "...", ...}, ...] 的 JSON 数组，
// 解析后合并到 citations 里，并把 JSON 原文从正文中移除。
// ---------------------------------------------------------------------------

function extractSourcesFromText(text: string): any[] {
  const sources: any[] = []
  const regex = /\[\s*\{[^[\]]*"(?:url|URL)"[^[\]]*\}(?:\s*,\s*\{[^[\]]*"(?:url|URL)"[^[\]]*\})*\s*\]/g
  let m
  while ((m = regex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(m[0])
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0] && (parsed[0].url || parsed[0].URL)) {
        sources.push(...parsed)
      }
    } catch {
      // ignore parse errors
    }
  }
  return sources
}

function stripSourcesJsonFromText(text: string): string {
  return text.replace(
    /\[(?:\s*\{[^[\]]*"(?:url|URL)"[^[\]]*\}[,\s]*)+\s*\]/g,
    (m) => {
      try {
        const parsed = JSON.parse(m)
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0] && (parsed[0].url || parsed[0].URL)) {
          return '' // 从正文中剔除
        }
      } catch { /* keep original */ }
      return m
    }
  )
}

// ---------------------------------------------------------------------------
// extractBareTaskArray — 从文本中提取任务数组 JSON
// 兼容 3 种形态：
//   1) [{"id":...,"title":...,...},{...},...]
//   2) "tasks":[{...},{...},...]   （对象值形式）
//   3) {"status":"...","tasks":[{...}]}  （完整对象，但没包 <TASK_LIST>）
// 用深度计数法处理嵌套的 [] 和 {}，避免 items 字段里的子数组干扰匹配
// ---------------------------------------------------------------------------
function extractBareTaskArray(content: string): { match: string; json: string } | null {
  // 🔥 关键修复：如果是 automation strategy JSON（有 nodes/edges 包裹），直接跳过
  // 否则会被误识别为 task array 渲染为任务规划器
  if (
    content.includes('"nodes"') &&
    (content.includes('"triggerNode"') || content.includes('"logicNode"') || content.includes('"actionNode"'))
  ) {
    return null
  }

  // 先尝试完整对象形式：{"status":..., "tasks":[...]}
  const objectMatch = content.match(/\{\s*"(?:status|tasks)"[\s\S]*?"tasks"\s*:\s*\[/)
  if (objectMatch && objectMatch.index !== undefined) {
    const start = objectMatch.index
    // 从 start 开始找匹配的 }
    const result = extractBalanced(content, start, "{", "}")
    if (result) {
      return { match: result.text, json: result.text }
    }
  }

  // 然后找数组形式：可能带冒号前缀 :[ 也可能裸 [
  // 扫描每一个 [，向前看是否是 "id" 开头
  for (let i = 0; i < content.length; i++) {
    if (content[i] !== "[") continue
    // 向后看一个空白后是否是 { "id"
    const preview = content.slice(i, i + 50)
    if (!/\[\s*\{\s*"id"/.test(preview)) continue
    // 找到 [ 后做平衡匹配
    const result = extractBalanced(content, i, "[", "]")
    if (!result) continue
    // 验证：解析后确实是任务数组
    try {
      const parsed = JSON.parse(result.text)
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.id) {
        // 🔥 二次防御：如果是 automation strategy 的 nodes 数组（节点含 triggerNode/logicNode/actionNode），
        // 不要当作 task array 包装，应留给 AutomationStrategyCard 处理
        const isAutomationNodes =
          parsed.length > 0 &&
          parsed[0]?.type &&
          ['triggerNode', 'logicNode', 'actionNode'].includes(parsed[0].type)
        if (isAutomationNodes) {
          return null
        }
        // 把匹配起点往前扩展到冒号（如果有），让 strip 得更干净
        let matchStart = i
        if (matchStart > 0 && content[matchStart - 1] === ":") matchStart--
        // 顺便把前面的换行/空白也吃一点
        while (matchStart > 0 && /\s/.test(content[matchStart - 1])) matchStart--
        return {
          match: content.slice(matchStart, i + result.text.length),
          json: result.text,
        }
      }
    } catch {
      continue
    }
  }
  return null
}

// 平衡匹配：给定起点和开闭符号，返回从 start 开始到匹配的闭符号为止的子串
function extractBalanced(
  text: string,
  start: number,
  open: string,
  close: string
): { text: string; end: number } | null {
  if (text[start] !== open) return null
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (escape) {
      escape = false
      continue
    }
    if (inString) {
      if (ch === "\\") {
        escape = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) {
        return { text: text.slice(start, i + 1), end: i + 1 }
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// MarkdownPart — 稳定包装 XMarkdown，避免 components / streaming prop 引用变化触发无限渲染
// ---------------------------------------------------------------------------

const MarkdownComponents = { think: ThinkComponent, pre: CollapsibleCodeBlock }

const MarkdownPart = React.memo(function MarkdownPart({
  content,
  isStreaming,
}: {
  content: string
  isStreaming: boolean
}) {
  // 用 useMemo 稳定 streaming 对象引用，避免 XMarkdown 因 prop 引用变化触发无限渲染
  const streaming = React.useMemo(
    () => ({
      hasNextChunk: isStreaming,
      enableAnimation: false, // 🔥 关闭动画，避免 XMarkdown 内部循环触发 setState 导致 Maximum update depth
      tail: { content: '▋' as const },
    }),
    [isStreaming]
  )

  // 🔥 关键修复：流式过程中如果内容以未闭合的 fence 结尾（```json 但没看到 ```），
  // 暂时不要传 content 给 XMarkdown，否则 markdown 解析器会因不闭合而内部重试
  const safeContent = isStreaming && /```(?:json|html)?\s*[\s\S]*$/.test(content) && !/```\s*$/.test(content)
    ? content + "\n```"
    : content

  return (
    <XMarkdown
      components={MarkdownComponents}
      paragraphTag="div"
      streaming={streaming}
    >
      {safeContent}
    </XMarkdown>
  )
})
MarkdownPart.displayName = "MarkdownPart"

const TAG_REGEX =
  /(<[^>]*AUTOMATION_STRATEGY[^>]*>[\s\S]*?<\/\s*AUTOMATION_STRATEGY\s*>|<[^>]*AUTOMATION_STRATEGY[^>]*>[\s\S]*$|<\s*CHART\s+type="echarts"[^>]*>[\s\S]*?<\/\s*CHART\s*>|<\s*CHART\s+type="vega-lite"[^>]*>[\s\S]*?<\/\s*CHART\s*>|<\s*SPECTRAL\s*>[\s\S]*?(?:<\/\s*SPECTRAL\s*>|$)|<\s*MONITOR\s*>[\s\S]*?(?:<\/\s*MONITOR\s*>|$)|<\s*SCHEDULED_TASKS\s*(?:>[\s\S]*?(?:<\/\s*SCHEDULED_TASKS\s*>|$)|(?:\/>))|<\s*DEVICE_BENTO\s*(?:>[\s\S]*?(?:<\/\s*DEVICE_BENTO\s*>|$)|(?:\/>))|<\s*CONTROL_BENTO\s*(?:>[\s\S]*?(?:<\/\s*CONTROL_BENTO\s*>|$)|(?:\/>))|<\s*TOOL_USED\s+[^>]*(?:\/>|>[\s\S]*?<\/\s*TOOL_USED\s*>)|<\s*ACTION_PROMPT\s*>[\s\S]*?<\/\s*ACTION_PROMPT\s*>|<\s*CONTEXT_COMPRESSED\s*\/?>|<\s*CAPABILITIES\s*\/?>|<\s*PAST_MEMORY\s*>[\s\S]*?<\/\s*PAST_MEMORY\s*>|<\s*REPORT_GENERATING\s*>[\s\S]*?<\/\s*REPORT_GENERATING\s*>|\[REPORT:[^\]]+\][\s\S]*?(?:\[\/REPORT\]|$)|```json\s*[\s\S]*?```)/g

// ---------------------------------------------------------------------------
// renderTaggedContent — handles special XML tags, delegates markdown to XMarkdown
// ---------------------------------------------------------------------------

/**
 * 🔥 parseStrategyFromText — 兜底解析器
 * AI 有时把策略写成了 markdown 文本（不输出 JSON 代码块），这种情况把文本解析成简易 strategy
 * 解析 触发条件 / 诊断逻辑 / 动作执行 / 联动 / 控制 段，每段创建一个或多个对应类型的节点
 */
function parseStrategyFromText(text: string): { nodes: any[]; edges: any[]; description: string } | null {
  if (!text || !text.trim()) return null

  // 🔥 提取 JSON-like 内容中的节点（支持 aiNode 等 4 种类型）
  const extractFromJsonLike = (raw: string): { nodes: any[]; edges: any[] } | null => {
    // 匹配 "type": "triggerNode"|"logicNode"|"aiNode"|"actionNode" 附近 的 "label": "xxx" 或 "description": "xxx"
    const nodePattern = /\{\s*(?:"[^"]*"\s*:\s*"[^"]*"\s*,\s*)*"type"\s*:\s*"(triggerNode|logicNode|aiNode|actionNode)"\s*(?:,[^}]*)?\}/g
    const nodes: any[] = []
    let nm: RegExpExecArray | null
    while ((nm = nodePattern.exec(raw)) !== null) {
      const nodeText = nm[0]
      const nodeType = nm[1] as "triggerNode" | "logicNode" | "aiNode" | "actionNode"
      // 提取 label 或 description
      const labelMatch = nodeText.match(/"label"\s*:\s*"([^"]*)"/) 
        || nodeText.match(/"description"\s*:\s*"([^"]*)"/)
        || nodeText.match(/"text"\s*:\s*"([^"]*)"/)
        || nodeText.match(/"name"\s*:\s*"([^"]*)"/)
      const defaultLabel = nodeType === "triggerNode" ? "触发条件" 
        : nodeType === "logicNode" ? "判断逻辑" 
        : nodeType === "aiNode" ? "AI 智能分析"
        : "执行动作"
      const label = labelMatch ? labelMatch[1] : defaultLabel
      // 提取 subType
      const subTypeMatch = nodeText.match(/"data"\s*:\s*\{[^}]*"type"\s*:\s*"([^"]+)"/) 
        || nodeText.match(/"subType"\s*:\s*"([^"]+)"/)
      const subType = subTypeMatch ? subTypeMatch[1] : (
        nodeType === "triggerNode" ? "sensor" :
        nodeType === "logicNode" ? "compare" :
        nodeType === "aiNode" ? "llm" : "device"
      )
      nodes.push({
        id: "tmp",
        type: nodeType,
        data: { label, description: label, type: subType },
      })
    }
    if (nodes.length === 0) return null
    // 重新分配 id
    let tIdx = 0, lIdx = 0, aiIdx = 0, aIdx = 0
    nodes.forEach(n => {
      if (n.type === "triggerNode") n.id = `T${++tIdx}`
      else if (n.type === "logicNode") n.id = `L${++lIdx}`
      else if (n.type === "aiNode") n.id = `AN${++aiIdx}`
      else if (n.type === "actionNode") n.id = `A${++aIdx}`
    })
    // 构建 edges：trigger → [logic → ai →] action，按拓扑顺序
    const edges: any[] = []
    const triggerIds = nodes.filter(n => n.type === "triggerNode").map(n => n.id)
    const logicIds = nodes.filter(n => n.type === "logicNode").map(n => n.id)
    const aiIds = nodes.filter(n => n.type === "aiNode").map(n => n.id)
    const actionIds = nodes.filter(n => n.type === "actionNode").map(n => n.id)

    // 所有触发器 → 第一个非触发节点
    const firstNonTrigger = logicIds[0] || aiIds[0] || actionIds[0]
    if (triggerIds.length > 0 && firstNonTrigger) {
      for (const t of triggerIds) edges.push({ id: `e_${t}_${firstNonTrigger}`, source: t, target: firstNonTrigger })
    }
    // logic 链 + logic → 第一个 ai/action
    if (logicIds.length > 1) {
      for (let i = 0; i < logicIds.length - 1; i++) {
        edges.push({ id: `e_${logicIds[i]}_${logicIds[i + 1]}`, source: logicIds[i], target: logicIds[i + 1] })
      }
    }
    // 最后一个 logic → 第一个 ai/action
    if (logicIds.length > 0) {
      const lastLogic = logicIds[logicIds.length - 1]
      const nextAfterLogic = aiIds[0] || (actionIds[0] && !aiIds.length ? actionIds[0] : null)
      if (nextAfterLogic) edges.push({ id: `e_${lastLogic}_${nextAfterLogic}`, source: lastLogic, target: nextAfterLogic })
    }
    // ai 链 + ai → action
    if (aiIds.length > 1) {
      for (let i = 0; i < aiIds.length - 1; i++) {
        edges.push({ id: `e_${aiIds[i]}_${aiIds[i + 1]}`, source: aiIds[i], target: aiIds[i + 1] })
      }
    }
    if (aiIds.length > 0 && actionIds.length > 0) {
      const lastAi = aiIds[aiIds.length - 1]
      for (const a of actionIds) edges.push({ id: `e_${lastAi}_${a}`, source: lastAi, target: a })
    } else if (triggerIds.length === 0 && logicIds.length === 0 && aiIds.length > 0 && actionIds.length > 0) {
      for (const an of aiIds) for (const a of actionIds) edges.push({ id: `e_${an}_${a}`, source: an, target: a })
    }
    // 兜底：没有任何连接器时，trigger 直接接 action
    if (edges.length === 0 && triggerIds.length > 0 && actionIds.length > 0 && logicIds.length === 0 && aiIds.length === 0) {
      for (const t of triggerIds) for (const a of actionIds) edges.push({ id: `e_${t}_${a}`, source: t, target: a })
    }
    return { nodes, edges }
  }

  // 优先尝试从 JSON-like 内容中提取节点
  const jsonLikeResult = extractFromJsonLike(text)
  if (jsonLikeResult && jsonLikeResult.nodes.length > 0) {
    // 提取描述
    const descMatch = text.match(/"description"\s*:\s*"([^"]{2,60})"/)
    const description = descMatch ? descMatch[1] : "AI 生成的自动化策略"
    return { ...jsonLikeResult, description }
  }

  const stripped = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/<[^>]+>/g, "")
    .trim()
  if (!stripped) return null

  // 必须含至少一个策略特征词，否则不当作 strategy
  const hasStrategyKeyword =
    /触发|监测|诊断|判断|逻辑|动作|执行|联动|控制|策略|方案|自动/.test(stripped)
  if (!hasStrategyKeyword) return null

  // 段头正则：策略说明/触发/诊断/动作/联动/控制 段
  // 🔥 宽容匹配：允许 emoji 前缀（🎯/⚙️/📊 等）、括号说明、冒号/换行后内容
  // 段头新增 "AI 智能处理"/"AI 诊断"/"智能分析" 等 → aiNode
  const sectionRegex =
    /(?:^|\n)\s*(?:[^\u4e00-\u9fa5a-zA-Z#*\s]{0,3}\s*)?(?:#{1,6}\s*|\*\*)?\s*(策略说明|触发条件|触发|监测条件|诊断逻辑|诊断|判断条件|判断|条件|逻辑判断|逻辑|AI\s*智能处理|AI\s*诊断|AI\s*分析|AI\s*预测|智能处理|智能诊断|智能分析|智能预测|AI\s*决策|动作执行|执行动作|动作|联动控制|联动|控制步骤|控制|响应措施|响应|输出|干预)\s*(?:[:：]|\(|\（|\n|$)/g
  type SectionType = "triggerNode" | "logicNode" | "aiNode" | "actionNode"
  type Section = { type: SectionType; title: string; items: string[] }
  const sections: Section[] = []
  let match: RegExpExecArray | null
  const sectionMatches: { idx: number; end: number; title: string; type: Section["type"] }[] = []
  while ((match = sectionRegex.exec(stripped)) !== null) {
    const raw = match[1]
    const idx = match.index
    const end = match.index + match[0].length
    let type: Section["type"] = "logicNode"
    if (/触发|监测/.test(raw)) type = "triggerNode"
    else if (/AI|智能|llm|诊断|分析|预测|决策/.test(raw)) type = "aiNode"
    else if (/动作|执行|联动|控制|响应|输出|干预/.test(raw)) type = "actionNode"
    sectionMatches.push({ idx, end, title: raw, type })
  }
  for (let i = 0; i < sectionMatches.length; i++) {
    const cur = sectionMatches[i]
    const next = sectionMatches[i + 1]
    const block = stripped.substring(cur.end, next ? next.idx : undefined).trim()
    // 提取列表项：1. xxx / - xxx / • xxx / * xxx / 直接行
    // 🔥 放宽长度限制到 500 字符；超长段落按句号拆分
    const rawItems = block
      .split(/\n+/)
      .map(l => l.replace(/^\s*(?:[-*•·]|\d+[.、)])\s*/, "").replace(/\*\*/g, "").trim())
      .filter(l => l.length > 0)
    // 对超长行进一步按句号拆分
    const items: string[] = []
    for (const item of rawItems) {
      if (item.length <= 500) {
        items.push(item)
      } else {
        // 按句号/分号拆分超长段落
        const subItems = item.split(/[。；;！!？?\n]/).map(s => s.trim()).filter(s => s.length > 0 && s.length <= 500)
        items.push(...subItems)
      }
    }
    if (items.length > 0) {
      sections.push({ type: cur.type, title: cur.title, items })
    }
  }

  // 没有任何分段：尝试把整个文本按句子拆分作为 logicNode
  if (sections.length === 0) {
    const sentences = stripped
      .split(/(?<=[。！？!?\n])/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.length <= 500)
    if (sentences.length === 0) return null
    sections.push({ type: "logicNode", title: "策略描述", items: sentences.slice(0, 8) })
  }

  // 提取描述（第一句或第一段）
  const descMatch = stripped.match(/(?:策略说明|这是一个?|针对|关于)?\s*[：:]?\s*([^\n。！？!?]{4,60})[。！？!?\n]?/)
  const description = descMatch ? descMatch[1].trim() : stripped.substring(0, 30).trim()

  // 构建 nodes/edges
  const nodes: any[] = []
  const edges: any[] = []

  // 顺序：先 triggers → logic → AI → actions
  const orderedTypes: SectionType[] = ["triggerNode", "logicNode", "aiNode", "actionNode"]
  for (const t of orderedTypes) {
    const secs = sections.filter(s => s.type === t)
    for (const sec of secs) {
      for (const item of sec.items) {
        const subType = t === "triggerNode" ? "sensor"
          : t === "logicNode" ? "compare"
          : t === "aiNode" ? "llm"
          : "device"
        nodes.push({
          id: "tmp", // 占位，后面会重新分配
          type: t,
          data: { label: item, description: item, type: subType },
        })
      }
    }
  }

  // 重新分配 id（T/AN/L/A 形式，按类型计数）
  let tIdx = 0, lIdx = 0, aiIdx = 0, aIdx = 0
  nodes.forEach(n => {
    if (n.type === "triggerNode") n.id = `T${++tIdx}`
    else if (n.type === "logicNode") n.id = `L${++lIdx}`
    else if (n.type === "aiNode") n.id = `AN${++aiIdx}`
    else if (n.type === "actionNode") n.id = `A${++aIdx}`
  })

  // 构建 edges：拓扑顺序 trigger → logic → ai → action
  const triggerIds = nodes.filter(n => n.type === "triggerNode").map(n => n.id)
  const logicIds = nodes.filter(n => n.type === "logicNode").map(n => n.id)
  const aiIds = nodes.filter(n => n.type === "aiNode").map(n => n.id)
  const actionIds = nodes.filter(n => n.type === "actionNode").map(n => n.id)

  // 所有 triggers → 第一个非触发节点
  const firstNonTrigger = logicIds[0] || aiIds[0] || actionIds[0]
  if (triggerIds.length > 0 && firstNonTrigger) {
    for (const t of triggerIds) {
      edges.push({ id: `e_${t}_${firstNonTrigger}`, source: t, target: firstNonTrigger })
    }
  }
  // logic 链
  if (logicIds.length > 1) {
    for (let i = 0; i < logicIds.length - 1; i++) {
      edges.push({ id: `e_${logicIds[i]}_${logicIds[i + 1]}`, source: logicIds[i], target: logicIds[i + 1] })
    }
  }
  // 最后一个 logic → 第一个 ai/action
  if (logicIds.length > 0) {
    const lastLogic = logicIds[logicIds.length - 1]
    const nextAfterLogic = aiIds[0] || (actionIds[0] && !aiIds.length ? actionIds[0] : null)
    if (nextAfterLogic) {
      edges.push({ id: `e_${lastLogic}_${nextAfterLogic}`, source: lastLogic, target: nextAfterLogic })
    }
  }
  // ai 链
  if (aiIds.length > 1) {
    for (let i = 0; i < aiIds.length - 1; i++) {
      edges.push({ id: `e_${aiIds[i]}_${aiIds[i + 1]}`, source: aiIds[i], target: aiIds[i + 1] })
    }
  }
  // 最后一个 ai → 所有 actions
  if (aiIds.length > 0 && actionIds.length > 0) {
    const lastAi = aiIds[aiIds.length - 1]
    for (const a of actionIds) {
      edges.push({ id: `e_${lastAi}_${a}`, source: lastAi, target: a })
    }
  } else if (logicIds.length === 0 && aiIds.length === 0 && triggerIds.length > 0 && actionIds.length > 0) {
    // 只有 trigger 和 action：直接相连
    for (const t of triggerIds) {
      for (const a of actionIds) {
        edges.push({ id: `e_${t}_${a}`, source: t, target: a })
      }
    }
  } else if (logicIds.length === 0 && aiIds.length > 0 && actionIds.length > 0 && triggerIds.length === 0) {
    // 没有 trigger 和 logic：ai → action
    for (const an of aiIds) {
      for (const a of actionIds) {
        edges.push({ id: `e_${an}_${a}`, source: an, target: a })
      }
    }
  }

  return { nodes, edges, description }
}

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

  // 去重：同一消息中只要有真实 [REPORT:...] 内容块，就隐藏 <REPORT_GENERATING> 占位符
  // 占位符只在"还没有任何真实报告内容"时才有意义；一旦真实内容出现，占位符变成冗余 UI
  const hasRealReport = parts.some((p) => /^\[REPORT:/.test(p))

  return (
    <>
      {parts.map((part, index) => {
        // JSON code blocks (IoT commands & schedule_task & automation strategy)
        if (part.startsWith("```json")) {
          try {
            const jsonContent = part.replace(/^```json\s*/, "").replace(/```$/, "").trim()
            if (jsonContent.startsWith("{") || jsonContent.startsWith("[")) {
              const parsed = JSON.parse(jsonContent)

              // schedule_task: 渲染为 ScheduleCard 自动创建任务
              const isScheduleTask = (obj: any) => obj && obj.action === "schedule_task"
              const scheduleCmds = (Array.isArray(parsed) ? parsed : [parsed]).filter(isScheduleTask)
              if (scheduleCmds.length > 0) {
                return (
                  <div key={index} className="my-3 space-y-2">
                    {scheduleCmds.map((cmd: any, i: number) => (
                      <ScheduleCard key={i} data={cmd} />
                    ))}
                  </div>
                )
              }

              // 🔥 自动化策略：检测 { nodes: [...], edges: [...] } 格式
              // 兼容 nodes 节点中含 triggerNode / logicNode / actionNode 的图结构
              // 注意：edges 缺失时用空数组兜底，避免 AI 输出 { nodes: [...] } 时被误判
              const isAutomationStrategy = (obj: any) =>
                obj && Array.isArray(obj.nodes) &&
                obj.nodes.length > 0 &&
                obj.nodes.some((n: any) =>
                  n && typeof n === "object" &&
                  (n.type === "triggerNode" || n.type === "logicNode" || n.type === "actionNode")
                )
              const strategyObj = Array.isArray(parsed)
                ? parsed.find(isAutomationStrategy)
                : isAutomationStrategy(parsed)
                  ? parsed
                  : null
              if (strategyObj) {
                return (
                  <div key={index} className="my-3">
                    <AutomationStrategyCard
                      strategy={{
                        nodes: strategyObj.nodes,
                        edges: Array.isArray(strategyObj.edges) ? strategyObj.edges : [],
                      }}
                    />
                  </div>
                )
              }

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

        // REPORT_GENERATING — 仅在没有真实 [REPORT:...] 内容时才渲染（避免与下方报告卡重复）
        if (part.match(/^<\s*REPORT_GENERATING/))
          return hasRealReport
            ? null
            : (
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
                <ReportCompleteCard title={title} html={html} onOpen={() => props.onOpenStudio(title, html)} />
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
            const isStreaming = props.isStreaming

            // 骨架占位组件（仅流式过程中使用）
            const Skeleton = () => (
              <div key={index} className="my-3 rounded-lg border border-[#1677ff30] bg-white dark:bg-zinc-900 p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={14} style={{ color: "#1677ff" }} />
                  <span className="text-[13px] text-gray-500 dark:text-gray-400">
                    {desc ? `正在生成策略：${desc}` : "正在生成自动化策略…"}
                  </span>
                </div>
              </div>
            )

            // 🔥 流结束后所有解析失败时的兜底组件：把内容当 markdown 渲染（不再永久骨架）
            const Fallback = () => {
              // 去掉 ```json fence 但保留内容，便于用户看到 AI 输出的策略描述
              const displayContent = inner
                .replace(/^```json\s*/, "")
                .replace(/```\s*$/, "")
                .trim()
              return (
                <div key={index} className="my-3">
                  {desc && (
                    <div className="mb-2 px-3 py-2 rounded-lg bg-[#1677ff08] border border-[#1677ff20] text-[13px] text-[#1677ff] font-medium">
                      策略：{desc}
                    </div>
                  )}
                  <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-[13px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                    {displayContent || "（策略内容为空）"}
                  </div>
                </div>
              )
            }

            // 尝试渲染策略卡片
            const tryRenderCard = (strategy: { nodes: any[]; edges: any[] }) => {
              if (strategy.nodes.length === 0) return null
              return (
                <div key={index}>
                  <AutomationStrategyCard
                    strategy={strategy}
                    description={desc}
                  />
                </div>
              )
            }

            // 🔥 鲁棒匹配：兼容流式中 JSON 还未完全闭合（无 ``` 收尾）
            const jsonMatch = inner.match(/```json\s*([\s\S]*?)(?:\s*```|$)/)

            // 没有 JSON 代码块 → 尝试文本兜底解析
            if (!jsonMatch || !jsonMatch[1].trim()) {
              const fallback = parseStrategyFromText(inner)
              if (fallback && fallback.nodes.length > 0) {
                return tryRenderCard(fallback)
              }
              // 流式中：显示骨架；流结束：显示兜底内容（避免永久骨架）
              return isStreaming ? <Skeleton /> : <Fallback />
            }

            // 验证 JSON 是否平衡（流式过程中可能还是不完整 JSON）
            const bodyText = jsonMatch[1]
            let braceDepth = 0
            let inStr = false
            let esc = false
            let balanced = false
            for (let i = 0; i < bodyText.length; i++) {
              const ch = bodyText[i]
              if (esc) { esc = false; continue }
              if (inStr) {
                if (ch === '\\') esc = true
                else if (ch === '"') inStr = false
                continue
              }
              if (ch === '"') { inStr = true; continue }
              if (ch === '{') braceDepth++
              else if (ch === '}') {
                braceDepth--
                if (braceDepth === 0) {
                  balanced = i === bodyText.length - 1 || /^\s*$/.test(bodyText.substring(i + 1))
                  break
                }
              }
            }

            if (!balanced) {
              // JSON 未闭合
              if (isStreaming) return <Skeleton /> // 流式中：等更多数据
              // 流已结束但 JSON 不平衡 → 尝试文本兜底（含从畸形 JSON 提取节点）
              const fallback = parseStrategyFromText(inner)
              if (fallback && fallback.nodes.length > 0) {
                return tryRenderCard(fallback)
              }
              // 所有解析失败 → 显示原始内容
              return <Fallback />
            }

            let strategy
            try {
              strategy = JSON.parse(bodyText)
            } catch {
              // JSON.parse 失败
              if (isStreaming) return <Skeleton /> // 流式中：等更多数据
              // 流已结束但解析失败 → 尝试文本兜底
              const fallback = parseStrategyFromText(inner)
              if (fallback && fallback.nodes.length > 0) {
                return tryRenderCard(fallback)
              }
              return <Fallback />
            }

            // 🔥 JSON 解析成功但可能不是策略格式 → 检查是否有 nodes
            if (!strategy.nodes || !Array.isArray(strategy.nodes) || strategy.nodes.length === 0) {
              // 不是策略 JSON → 尝试文本兜底
              const fallback = parseStrategyFromText(inner)
              if (fallback && fallback.nodes.length > 0) {
                return tryRenderCard(fallback)
              }
              return <Fallback />
            }

            return tryRenderCard({ nodes: strategy.nodes || [], edges: strategy.edges || [] })
          } catch (err) {
            console.warn('[AutomationStrategy] Parse failed:', err)
            return null
          }
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
            <MarkdownPart content={part} isStreaming={props.isStreaming ?? false} />
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
  }

  // Extract TASK_LIST for DynamicTaskPlanner
  let taskContent = ""
  if (typeof content === "string") {
    const m = content.match(/<TASK_LIST>([\s\S]*?)<\/TASK_LIST>/)
    if (m) {
      taskContent = m[0]
      content = content.replace(/<TASK_LIST>[\s\S]*?<\/TASK_LIST>/g, "")
    } else {
      // 兜底修复：AI 偶发输出裸任务 JSON（不带 <TASK_LIST> 包裹），自动识别并包装
      // 兼容 3 种形态：
      //  1) {"status":"...","tasks":[{...},{...},...]}  完整对象
      //  2) :[{"id":...},{...},...]  对象值（被截断的形如 "tasks":[{...}]）
      //  3) [{"id":...},{...},...]   裸数组
      // 关键：用括号/方括号深度匹配，兼容 items 字段里嵌套的 [] 和 {}
      // 🔥 关键保护：不要从已经是 AUTOMATION_STRATEGY 标签内的 JSON 中提任务数组
      // 否则 page.tsx 流结束后的自动包裹会与这里的 task array 提取冲突
      const hasAutoTag = content.includes('<AUTOMATION_STRATEGY')
      if (!hasAutoTag) {
        const extracted = extractBareTaskArray(content)
        if (extracted) {
          try {
            const parsed = JSON.parse(extracted.json)
            // parsed 可能是裸数组（形态 2/3），也可能是带 .tasks 字段的完整对象（形态 1）
            const tasksArray: any[] | null = Array.isArray(parsed)
              ? parsed
              : (parsed && Array.isArray((parsed as any).tasks) ? (parsed as any).tasks : null)

            if (tasksArray && tasksArray.length >= 2) {
              // 补全外层对象
              taskContent = `<TASK_LIST>${JSON.stringify({ status: "in_progress", tasks: tasksArray })}</TASK_LIST>`
              content = content.replace(extracted.match, "")
            } else {
              // 形状不符，剔除原文
              content = content.replace(extracted.match, "")
            }
          } catch {
            // 解析失败则静默剔除
            content = content.replace(extracted.match, "")
          }
        }
      }
    }
  }

  // 修复引用 JSON 散落在正文里的 bug：
  // 1) 从字符串/数组内容中提取引用 JSON 数组
  // 2) 合并到 msg.citations
  // 3) 把 JSON 原文从正文中剔除
  const extractedFromText: any[] = []
  if (typeof content === "string") {
    const sources = extractSourcesFromText(content)
    if (sources.length > 0) {
      extractedFromText.push(...sources)
      content = stripSourcesJsonFromText(content as string)
    }
  } else if (Array.isArray(content)) {
    content = content.map((part: any) => {
      if (part && part.type === "text" && typeof part.text === "string") {
        const sources = extractSourcesFromText(part.text)
        if (sources.length > 0) {
          extractedFromText.push(...sources)
          return { ...part, text: stripSourcesJsonFromText(part.text) }
        }
      }
      return part
    })
  }
  const mergedCitations =
    extractedFromText.length > 0
      ? [...(msg.citations || []), ...extractedFromText]
      : msg.citations

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
        <SourcesFooter citations={mergedCitations} />
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
      <SourcesFooter citations={mergedCitations} />
    </>
  )
}

// 流式输出期间不使用 memo，确保每个 chunk 都触发重渲染实现逐字效果
export const ChatMessageRenderer = ChatMessageRendererBase

ChatMessageRenderer.displayName = "ChatMessageRenderer"
