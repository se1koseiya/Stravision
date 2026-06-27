"use client"

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import { ThoughtChain } from "@ant-design/x"
import { Flex, Typography } from "antd"
import {
  Brain, Wrench, Eye, MessageSquare, Globe, Search,
  CloudLightning, Zap, MapPin, Cpu, Database, Loader2,
  CheckCircle2, XCircle, ArrowRight, Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

const { Text } = Typography

export type AgentStepType = "thinking" | "action" | "observation" | "answer"
export type AgentStepStatus = "pending" | "active" | "completed" | "error"

export interface AgentStep {
  id: string
  type: AgentStepType
  status: AgentStepStatus
  title: string
  detail?: string
  toolName?: string
  duration?: number
  startedAt?: number
}

// ---------------------------------------------------------------------------
// Icon helpers
// ---------------------------------------------------------------------------

const ACTION_ICON_MAP: Record<string, any> = {
  weather: CloudLightning, 天气: CloudLightning,
  search: Search, 搜索: Search, brave: Search, exa: Search,
  scrape: Globe, 抓取: Globe, firecrawl: Globe,
  spectrum: Zap, 光谱: Zap,
  route: MapPin, 路线: MapPin, amap: MapPin,
  device: Cpu, 设备: Cpu,
  data: Database, 数据: Database,
}

function getIcon(toolName?: string) {
  if (!toolName) return Wrench
  const t = toolName.toLowerCase()
  for (const [key, icon] of Object.entries(ACTION_ICON_MAP)) {
    if (t.includes(key)) return icon
  }
  return Wrench
}

const TYPE_ICONS: Record<AgentStepType, any> = {
  thinking: Brain, action: Wrench, observation: Eye, answer: MessageSquare,
}

const TYPE_LABEL: Record<AgentStepType, string> = {
  thinking: "思考", action: "工具", observation: "反馈", answer: "回复",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface AgentThoughtChainProps {
  steps: AgentStep[]
  isActive?: boolean
  className?: string
}

export function AgentThoughtChain({ steps, isActive, className }: AgentThoughtChainProps) {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  const completedRef = useRef(false)
  const prevIsActiveRef = useRef(isActive)
  // 用 ref 缓存上一次的 steps 引用对应的迭代 key，避免 steps 引用变化时 useEffect 反复触发
  const lastStepsRef = useRef<AgentStep[]>(steps)

  const allDone = steps.length > 0 && steps.every((s) => s.status !== "active")

  // Group steps into iterations: thinking → action → observation is one cycle
  // 🔥 关键修复：先比较 steps 的长度与状态，避免父组件传入新引用但内容相同时重算
  const iterations = useMemo(() => {
    const groups: { key: string; icon: any; label: string; steps: AgentStep[]; status: string }[] = []
    let current: AgentStep[] = []

    for (const step of steps) {
      if (step.type === "thinking" && current.length > 0) {
        groups.push(buildIteration(groups.length, current))
        current = [step]
      } else {
        current.push(step)
      }
    }
    if (current.length > 0) groups.push(buildIteration(groups.length, current))
    lastStepsRef.current = steps
    return groups
    // 🔥 用结构指纹代替 steps 引用作为依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length, steps.map(s => `${s.id}:${s.status}:${s.duration ?? 0}`).join("|")])

  // Auto expand when active; auto collapse 2s after done
  useEffect(() => {
    if (isActive && !prevIsActiveRef.current) {
      completedRef.current = false
      setExpandedKeys(iterations.map((_, i) => `iter-${i}`))
    }
    prevIsActiveRef.current = isActive
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, iterations.length, iterations.map(i => i.status).join(",")])

  useEffect(() => {
    if (allDone && steps.length > 0 && !isActive && !completedRef.current) {
      completedRef.current = true
      const t = setTimeout(() => setExpandedKeys([]), 2500)
      return () => clearTimeout(t)
    }
    if (isActive) completedRef.current = false
  }, [allDone, isActive, steps.length])

  // 🔥 关键修复：所有 hooks 必须在早期 return 之前调用（Rules of Hooks）
  // items 数组稳定化
  const thoughtChainItems = useMemo(
    () =>
      iterations.map((iter, i) => ({
        key: `iter-${i}`,
        title: iter.label,
        collapsible: true,
        icon: false,
        status: iter.status as any,
        content: (
          <Flex gap="small" vertical style={{ margin: 0 }}>
            {iter.steps.map((step) => {
              const RawIcon = step.type === "action" ? getIcon(step.toolName) : TYPE_ICONS[step.type]
              const isActive = step.status === "active"
              return (
                <ThoughtChain.Item
                  key={step.id}
                  variant="solid"
                  status={
                    (isActive ? "loading" :
                    step.status === "completed" ? "success" :
                    step.status === "error" ? "error" : undefined) as any
                  }
                  icon={
                    isActive
                      ? React.createElement(Loader2 as any, { size: 14, className: "animate-spin text-[#1677ff]" })
                      : React.createElement(RawIcon as any, {
                          size: 14,
                          className: cn(
                            step.status === "completed" && "text-[#1677ff]",
                            step.status === "error" && "text-red-500",
                          ),
                        })
                  }
                  title={
                    <span
                      style={{
                        fontSize: 13,
                        color: isActive ? 'transparent' : 'var(--ant-color-text-quaternary, #a0a0a0)',
                        background: isActive
                          ? 'linear-gradient(90deg, #94a3b8 0%, #f8fafc 25%, #1677ff 50%, #f8fafc 75%, #94a3b8 100%)'
                          : undefined,
                        backgroundSize: isActive ? '200% auto' : undefined,
                        WebkitBackgroundClip: isActive ? 'text' : undefined,
                        backgroundClip: isActive ? 'text' : undefined,
                        fontWeight: isActive ? 500 : undefined,
                        animation: isActive ? 'thought-pulse 2.5s linear infinite' : undefined,
                      }}
                    >
                      {step.title}
                      {step.duration != null && !isActive && (
                        <Text type="secondary" style={{ marginLeft: 8, fontSize: 11 }}>
                          {(step.duration / 1000).toFixed(1)}s
                        </Text>
                      )}
                    </span>
                  }
                  description={step.detail || TYPE_LABEL[step.type]}
                  style={isActive ? { opacity: 1 } : undefined}
                />
              )
            })}
          </Flex>
        ),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [iterations]
  )

  // onExpand 回调稳定化
  const handleExpand = useCallback((keys: string[]) => {
    setExpandedKeys(keys)
  }, [])

  if (steps.length === 0) return null

  return (
    <motion.div
      className={cn("mx-4 my-3", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <ThoughtChain
        items={thoughtChainItems}
        expandedKeys={expandedKeys}
        onExpand={handleExpand}
        styles={{
          root: { fontSize: 12, color: 'var(--ant-color-text-quaternary, #b0b0b0)' },
          item: { fontSize: 12, color: 'var(--ant-color-text-quaternary, #b0b0b0)' },
          itemTitle: {
            fontSize: 12,
            color: 'var(--ant-color-text-quaternary, #a0a0a0)',
          },
          itemContent: {
            backgroundColor: "rgba(0,0,0,.01)",
            borderRadius: 8,
            padding: 10,
            marginBlockStart: 8,
            border: "1px solid rgba(0,0,0,.04)",
            color: 'var(--ant-color-text-quaternary, #b0b0b0)',
          },
          itemIcon: {
            fontSize: 14,
            color: 'var(--ant-color-text-quaternary, #999)',
          },
        }}
      />
    </motion.div>
  )
}

function buildIteration(index: number, steps: AgentStep[]) {
  const hasActive = steps.some((s) => s.status === "active")
  const allOk = steps.every((s) => s.status === "completed")
  const hasError = steps.some((s) => s.status === "error")
  const firstThinking = steps.find((s) => s.type === "thinking")

  return {
    key: `iter-${index}`,
    icon: Sparkles,
    label: firstThinking?.title || `第 ${index + 1} 轮`,
    steps,
    status: hasActive ? "loading" : hasError ? "error" : allOk ? "success" : "pending",
  }
}

export default AgentThoughtChain
