"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { Card, Tag, Space, Empty, theme as antdTheme } from "antd"
import { cn } from "@/lib/utils"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import { IconAiming, IconCheckOne, IconCompression, IconDown, IconLight, IconSchedule, IconThunderbolt, IconTime, IconTool, IconUp } from "@/components/icon";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StructuredMemory {
  timeframe?: string
  user_intent?: string
  key_facts?: string[]
  actions_taken?: string[]
  decisions?: string[]
  pending_tasks?: string[]
  current_state?: string
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * 从 <PAST_MEMORY>...</PAST_MEMORY> 包裹的内容中解析出结构化记忆
 */
export function parseStructuredMemory(content: string): StructuredMemory | null {
  if (!content) return null

  // 先尝试从 PAST_MEMORY 标签中抽取
  let payload = content
  const tagMatch = content.match(/<PAST_MEMORY>([\s\S]*?)<\/PAST_MEMORY>/)
  if (tagMatch) {
    payload = tagMatch[1].trim()
  }

  // 尝试解析为 JSON
  if (payload.startsWith("{")) {
    try {
      const parsed = JSON.parse(payload)
      if (parsed && typeof parsed === "object") return parsed as StructuredMemory
    } catch {
      // 尝试抽取 JSON 块
      const m = payload.match(/\{[\s\S]*\}/)
      if (m) {
        try {
          return JSON.parse(m[0]) as StructuredMemory
        } catch {
          /* fallthrough */
        }
      }
    }
  }

  // 回退：把整个 payload 当作纯文本，包装为兼容结构
  return {
    timeframe: "历史对话",
    current_state: payload.slice(0, 200),
  }
}

// ---------------------------------------------------------------------------
// Sub-section
// ---------------------------------------------------------------------------

function SummarySection({
  icon,
  title,
  items,
  color,
  emptyHint,
}: {
  icon: React.ReactNode
  title: string
  items?: string[]
  color: string
  emptyHint?: string
}) {
  if (!items || items.length === 0) return null
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
        {icon}
        <span>{title}</span>
      </div>
      <ul className="space-y-1 pl-1">
        {items.map((it, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300"
          >
            <span
              className="mt-1.5 inline-block h-1 w-1 flex-shrink-0 rounded-full"
              style={{ background: color }}
            />
            <span className="flex-1">{it}</span>
          </li>
        ))}
      </ul>
      {emptyHint && items.length === 0 && (
        <div className="text-xs text-zinc-400 italic pl-1">{emptyHint}</div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export interface MemorySummaryCardProps {
  content: string
  className?: string
  defaultExpanded?: boolean
}

export function MemorySummaryCard({
  content,
  className,
  defaultExpanded = true,
}: MemorySummaryCardProps) {
  const { token } = antdTheme.useToken()
  const [expanded, setExpanded] = useState(defaultExpanded)

  const memory = parseStructuredMemory(content)
  if (!memory) return null

  const hasContent =
    (memory.key_facts?.length ?? 0) +
      (memory.actions_taken?.length ?? 0) +
      (memory.decisions?.length ?? 0) +
      (memory.pending_tasks?.length ?? 0) >
    0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn("w-full", className)}
    >
      <Card
        size="small"
        bordered
        style={{
          background: BERRY_THEME.gradients.cardHero(BERRY_THEME.primary),
          borderColor: BERRY_THEME.primaryBorder,
          borderRadius: 10,
        }}
        bodyStyle={{ padding: 14 }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between cursor-pointer select-none"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{
                background: token.colorPrimaryBg,
                color: token.colorPrimary,
              }}
            >
              <IconCompression style={{ fontSize: 14 }} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                  历史记忆摘要
                </span>
                <Tag color="processing" style={{ margin: 0, fontSize: 10, lineHeight: "16px" }}>
                  AI 提炼
                </Tag>
              </div>
              {memory.timeframe && (
                <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <IconTime style={{ fontSize: 10 }} />
                  <span>{memory.timeframe}</span>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label={expanded ? "收起" : "展开"}
          >
            {expanded ? <IconUp style={{ fontSize: 11 }} /> : <IconDown style={{ fontSize: 11 }} />}
          </button>
        </div>

        {/* Body */}
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mt-3 space-y-3 overflow-hidden"
          >
            {/* User intent highlight */}
            {memory.user_intent && (
              <div
                className="rounded-lg px-3 py-2 text-[13px] leading-relaxed"
                style={{
                  background: token.colorPrimaryBgHover,
                  color: token.colorPrimaryText,
                  border: `1px dashed ${token.colorPrimaryBorder}`,
                }}
              >
                <Space size={6} align="center" className="mb-1">
                  <IconAiming style={{ fontSize: 12, color: token.colorPrimary }} />
                  <span className="text-xs font-semibold" style={{ color: token.colorPrimary }}>
                    用户意图
                  </span>
                </Space>
                <div>{memory.user_intent}</div>
              </div>
            )}

            {!hasContent && !memory.user_intent && !memory.current_state ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无提炼内容"
                style={{ margin: "12px 0" }}
              />
            ) : (
              <>
                <SummarySection
                  icon={<IconCheckOne />}
                  title="核心事实"
                  items={memory.key_facts}
                  color={token.colorInfo}
                />
                <SummarySection
                  icon={<IconTool />}
                  title="已执行行动"
                  items={memory.actions_taken}
                  color={token.colorSuccess}
                />
                <SummarySection
                  icon={<IconLight />}
                  title="关键决策"
                  items={memory.decisions}
                  color="#71717a"
                />
                <SummarySection
                  icon={<IconSchedule />}
                  title="待办事项"
                  items={memory.pending_tasks}
                  color={token.colorWarning}
                />
              </>
            )}

            {/* Current state footer */}
            {memory.current_state && (
              <div
                className="mt-1 rounded-lg px-3 py-2 text-[12px] leading-relaxed"
                style={{
                  background: token.colorFillTertiary,
                  color: token.colorTextSecondary,
                }}
              >
                <Space size={6} align="center" className="mb-1">
                  <IconThunderbolt style={{ fontSize: 11, color: token.colorPrimary }} />
                  <span className="text-[11px] font-semibold">当前状态</span>
                </Space>
                <div>{memory.current_state}</div>
              </div>
            )}
          </motion.div>
        )}
      </Card>
    </motion.div>
  )
}

export default MemorySummaryCard
