"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import React from "react"
import { motion } from "framer-motion"
import { XCard, registerCatalog } from "@ant-design/x-card"
import type { A2UICommand_v0_9, ActionPayload, Catalog } from "@ant-design/x-card"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { IconBrain, IconCheck, IconCpu, IconDown, IconLightning, IconLinkOut, IconLoading, IconPlay, IconRemind, IconSave, IconUp } from "@/components/icon";

interface AutomationStrategyCardProps {
  strategy: { nodes: any[]; edges: any[] }
  description?: string
  onSave?: (ruleId: string) => void
}

// ---------------------------------------------------------------------------
// 主题（统一 Ant Design 蓝 #1677ff）
// ---------------------------------------------------------------------------
const PRIMARY = BERRY_THEME.primary
const PRIMARY_BG = `${PRIMARY}0a`
const PRIMARY_BORDER = `${PRIMARY}30`
const SUCCESS = BERRY_THEME.status.success

// ---------------------------------------------------------------------------
// A2UI Catalog
// ---------------------------------------------------------------------------
const CATALOG_ID = "berry-automation-strategy-catalog-v1"

const catalog: Catalog = {
  catalogId: CATALOG_ID,
  components: {
    Column: { type: "object", properties: {}, required: [] as string[] },
    CardHeader: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        stats: { type: "string" },
        collapsible: { type: "boolean" },
        collapsed: { type: "boolean" },
      },
      required: ["title"] as string[],
    },
    NodeFlow: {
      type: "object",
      properties: { nodes: { type: "array", items: { type: "object" } } },
      required: ["nodes"] as string[],
    },
    NodeItem: {
      type: "object",
      properties: {
        index: { type: "number" },
        title: { type: "string" },
        nodeType: { type: "string" },
        description: { type: "string" },
        isLast: { type: "boolean" },
      },
      required: ["title", "nodeType"] as string[],
    },
    Actions: {
      type: "object",
      properties: {
        saved: { type: "boolean" },
        saving: { type: "boolean" },
        executing: { type: "boolean" },
      },
      required: [] as string[],
    },
  },
}
registerCatalog(catalog)

// ---------------------------------------------------------------------------
// 类型映射
// ---------------------------------------------------------------------------
const NODE_TYPE_CONFIG: Record<string, { icon: any; label: string; color: string; bg: string; border: string }> = {
  triggerNode: { icon: IconRemind,    label: "触发", color: PRIMARY, bg: `${PRIMARY}14`,  border: `${PRIMARY}40` },
  logicNode:   { icon: IconBrain,   label: "判断", color: "#722ed1", bg: "#722ed114", border: "#722ed140" },
  actionNode:  { icon: IconCpu,     label: "动作", color: SUCCESS, bg: `${SUCCESS}14`, border: `${SUCCESS}40` },
}

function getNodeConfig(type: string) {
  return NODE_TYPE_CONFIG[type] || { icon: IconLightning, label: "节点", color: "#6b7280", bg: "#9ca3af14", border: "#9ca3af40" }
}

// ---------------------------------------------------------------------------
// 节点元数据提取
// ---------------------------------------------------------------------------
function getNodeMeta(node: any): { title: string; description?: string } {
  const data = node?.data || {}
  return {
    title: data.label || data.type || node?.type || "未命名节点",
    description: data.description || data.config?.description || undefined,
  }
}

// ---------------------------------------------------------------------------
// A2UI 组件实现
// ---------------------------------------------------------------------------
function Column({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <div className={className || "flex flex-col"}>{children}</div>
}

function CardHeaderComponent({
  title,
  description,
  stats,
  collapsible,
  collapsed,
  onToggleCollapsed,
}: {
  title?: string
  description?: string
  stats?: string
  collapsible?: boolean
  collapsed?: boolean
  onToggleCollapsed?: () => void
}) {
  return (
    <div className="px-3.5 pt-3 pb-2.5">
      <div className="flex items-start gap-2.5">
        {/* 图标 */}
        <span
          className="flex items-center justify-center shrink-0 w-7 h-7 rounded-md"
          style={{ background: PRIMARY_BG, border: `1px solid ${PRIMARY_BORDER}` }}
        >
          <IconLightning size={14} style={{ color: PRIMARY }} />
        </span>

        {/* 标题与描述 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold text-gray-900 dark:text-white">
              {title || "自动化策略"}
            </span>
            {stats && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none"
                style={{ background: `${PRIMARY}14`, color: PRIMARY }}
              >
                {stats}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">
              {description}
            </p>
          )}
        </div>

        {collapsible && (
          <button
            onClick={onToggleCollapsed}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
          >
            {collapsed ? <IconDown size={14} /> : <IconUp size={14} />}
          </button>
        )}
      </div>
    </div>
  )
}

function NodeItemComponent({
  index,
  title,
  nodeType,
  description,
  isLast,
}: {
  index?: number
  title?: string
  nodeType?: string
  description?: string
  isLast?: boolean
}) {
  const cfg = getNodeConfig(nodeType || "")
  const Icon = cfg.icon
  return (
    <div className="relative flex gap-2.5 pl-1.5 pr-1.5 pb-3 last:pb-0">
      {/* 左侧：图标 + 时间线 */}
      <div className="flex flex-col items-center shrink-0">
        <span
          className="relative z-10 flex items-center justify-center w-5 h-5 rounded-md shrink-0"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
        >
          <Icon size={11} style={{ color: cfg.color }} strokeWidth={2.2} />
        </span>
        {!isLast && (
          <span
            className="flex-1 w-px mt-1"
            style={{ background: "linear-gradient(to bottom, #e5e7eb, #e5e7eb)" }}
          />
        )}
      </div>

      {/* 右侧：内容 */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-1.5">
          {typeof index === "number" && (
            <span className="text-[10px] font-mono tabular-nums text-gray-400">
              {String(index + 1).padStart(2, "0")}
            </span>
          )}
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            {cfg.label}
          </span>
          <span className="text-[12.5px] font-medium text-gray-800 dark:text-gray-200 truncate">
            {title}
          </span>
        </div>
        {description && (
          <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

function NodeFlowComponent({ nodes }: { nodes?: any[] }) {
  if (!nodes || nodes.length === 0) return null
  return (
    <div className="px-3.5 py-2">
      {nodes.map((node, idx) => {
        const meta = getNodeMeta(node)
        return (
          <NodeItemComponent
            key={node?.id || idx}
            index={idx}
            title={meta.title}
            nodeType={node?.type}
            description={meta.description}
            isLast={idx === nodes.length - 1}
          />
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 兜底直接渲染（不依赖 x-card 命令管道）
// ---------------------------------------------------------------------------
function DirectRenderFallback({
  strategy,
  description,
  saved,
  isSaving,
  isExecuting,
  onSave,
  onExecute,
  onViewDetail,
}: {
  strategy: { nodes: any[]; edges: any[] }
  description?: string
  saved: boolean
  isSaving: boolean
  isExecuting: boolean
  onSave: () => void
  onExecute: () => void
  onViewDetail: () => void
}) {
  const nodes = strategy?.nodes || []
  const triggerCount = nodes.filter((n: any) => n.type === "triggerNode").length
  const logicCount = nodes.filter((n: any) => n.type === "logicNode").length
  const actionCount = nodes.filter((n: any) => n.type === "actionNode").length
  const statsText = `${nodes.length} 节点 · ${triggerCount} 触发${logicCount ? ` · ${logicCount} 判断` : ""} · ${actionCount} 动作`

  return (
    <div
      className="my-3 rounded-lg overflow-hidden bg-white dark:bg-zinc-900"
      style={{ border: `1px solid ${PRIMARY_BORDER}` }}
    >
      <CardHeaderComponent title="自动化策略" description={description} stats={statsText} />
      <NodeFlowComponent nodes={nodes} />
      <div
        className="flex items-center gap-1.5 px-3.5 py-2.5"
        style={{ borderTop: `1px solid ${PRIMARY_BORDER}`, background: `${PRIMARY}05` }}
      >
        {saved ? (
          <button
            onClick={onViewDetail}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-7 rounded-md text-[12px] font-medium transition-colors"
            style={{ background: `${PRIMARY}14`, color: PRIMARY }}
          >
            <IconCheck size={12} />
            已保存 · 查看详情
            <IconLinkOut size={11} />
          </button>
        ) : (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-7 rounded-md text-[12px] font-medium text-white transition-colors disabled:opacity-50"
            style={{ background: PRIMARY }}
          >
            {isSaving ? <IconLoading size={12} className="animate-spin" /> : <IconSave size={12} />}
            保存策略
          </button>
        )}
        <button
          onClick={onExecute}
          disabled={isExecuting}
          className="inline-flex items-center justify-center gap-1.5 h-7 px-3 rounded-md text-[12px] font-medium transition-colors disabled:opacity-50"
          style={{
            background: "transparent",
            color: "#374151",
            border: "1px solid #d1d5db",
          }}
        >
          {isExecuting ? <IconLoading size={12} className="animate-spin" /> : <IconPlay size={12} />}
          测试运行
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 主组件
// ---------------------------------------------------------------------------
/**
 * AutomationStrategyCard — 自动化策略卡片（XCard / A2UI 协议 + Ant Design 极简版式）
 *
 * 优化点：
 * 1. 节点流用时间线样式 + 单色描边，取代厚重 Tag 堆叠
 * 2. 状态徽章 10px 极简风，统一 Ant Design 蓝 #1677ff，零渐变
 * 3. 顶栏布局：图标 + 标题 + 统计徽章 + 折叠
 * 4. 底部操作区：单行（主操作铺满 + 次操作边框按钮）
 * 5. 优先 A2UI 协议渲染，500ms 超时自动切换直接渲染兜底
 */
export function AutomationStrategyCard({ strategy, description, onSave }: AutomationStrategyCardProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [ruleId, setRuleId] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [useDirectMode, setUseDirectMode] = useState(false)
  const boxMountedRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const nodes = strategy?.nodes || []
  const triggerCount = useMemo(() => nodes.filter((n: any) => n.type === "triggerNode").length, [nodes])
  const logicCount = useMemo(() => nodes.filter((n: any) => n.type === "logicNode").length, [nodes])
  const actionCount = useMemo(() => nodes.filter((n: any) => n.type === "actionNode").length, [nodes])
  const statsText = `${nodes.length} 节点 · ${triggerCount} 触发${logicCount ? ` · ${logicCount} 判断` : ""} · ${actionCount} 动作`

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/automation/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: description || "由 AI 助手生成的自动化策略",
          description: description || "",
          graph_data: strategy,
          trigger_type: nodes.find((n: any) => n.type === "triggerNode")?.data?.type || "manual",
          is_active: true,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "保存失败")
      setSaved(true)
      setRuleId(data.data.id)
      toast.success("自动化策略已保存")
      onSave?.(data.data.id)
    } catch (error) {
      toast.error("保存失败", { description: error instanceof Error ? error.message : "未知错误" })
    } finally {
      setIsSaving(false)
    }
  }, [description, strategy, nodes, onSave])

  const handleExecute = useCallback(async () => {
    setIsExecuting(true)
    try {
      const res = await fetch("/api/automation/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graph_data: strategy, force: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "执行失败")
      const count = data.actions?.length || 0
      toast.success(count > 0 ? `已执行 ${count} 个动作` : "执行完成")
    } catch (error) {
      toast.error("执行失败", { description: error instanceof Error ? error.message : "未知错误" })
    } finally {
      setIsExecuting(false)
    }
  }, [strategy])

  const handleViewDetail = useCallback(() => {
    if (ruleId) router.push(`/automation/editor?id=${ruleId}`)
    else router.push("/automation/editor?from=ai-assistant")
  }, [router, ruleId])

  const handleAction = useCallback((_payload: ActionPayload) => {
    boxMountedRef.current = true
  }, [])

  // x-card 挂载超时检测
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      if (!boxMountedRef.current) setUseDirectMode(true)
    }, 500)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  // 构建 A2UI 命令
  const commands: A2UICommand_v0_9[] = useMemo(
    () => [
      { version: "v0.9", createSurface: { surfaceId: "auto-strategy", catalogId: CATALOG_ID } },
      {
        version: "v0.9",
        updateComponents: {
          surfaceId: "auto-strategy",
          components: [
            { id: "root", component: "Column", children: ["header", "flow", "actions"] },
            {
              id: "header",
              component: "CardHeader",
              title: "自动化策略",
              description,
              stats: statsText,
              collapsible: true,
              collapsed: isCollapsed,
            },
            {
              id: "flow",
              component: "NodeFlow",
              nodes: nodes.map((n: any) => ({ ...n, ...getNodeMeta(n) })),
            },
            {
              id: "actions",
              component: "Actions",
              saved,
              saving: isSaving,
              executing: isExecuting,
            },
          ],
        },
      },
    ],
    [description, statsText, isCollapsed, nodes, saved, isSaving, isExecuting]
  )

  if (!nodes || nodes.length === 0) return null

  if (useDirectMode) {
    return (
      <DirectRenderFallback
        strategy={strategy}
        description={description}
        saved={saved}
        isSaving={isSaving}
        isExecuting={isExecuting}
        onSave={handleSave}
        onExecute={handleExecute}
        onViewDetail={handleViewDetail}
      />
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="my-3 w-full"
    >
      <XCard.Box
        commands={commands}
        onAction={handleAction}
        style={{
          border: `1px solid ${PRIMARY_BORDER}`,
          borderRadius: 8,
          background: "#fff",
          overflow: "hidden",
        }}
      >
        <XCard.Card id="auto-strategy" />
      </XCard.Box>
    </motion.div>
  )
}

export default AutomationStrategyCard
