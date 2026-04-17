"use client"

import { cn } from "@/lib/utils"
import {
  Brain,
  Wrench,
  Eye,
  MessageSquare,
  CheckCircle2,
  Loader2,
  Globe,
  Search,
  CloudLightning,
  Zap,
  Database,
  MapPin,
  Cpu,
  ChevronDown,
  ChevronUp,
  Circle,
} from "lucide-react"
import { useState, useEffect, useRef } from "react"

// --- Types ---

export type AgentStepType = "thinking" | "action" | "observation" | "answer"
export type AgentStepStatus = "pending" | "active" | "completed" | "error"

// 新增：Agent 角色类型
export type AgentRole = "planner" | "executor" | "validator" | "coordinator" | "general"

export interface AgentStep {
  id: string
  type: AgentStepType
  status: AgentStepStatus
  title: string
  detail?: string
  toolName?: string
  /** ms elapsed */
  duration?: number
  /** timestamp when started */
  startedAt?: number
  /** 新增：Agent 角色 */
  agentRole?: AgentRole
  /** 新增：Agent 名称 */
  agentName?: string
}

interface AgentExecutionChainProps {
  steps: AgentStep[]
  className?: string
  /** Whether the entire chain is still in progress */
  isActive?: boolean
  /** Auto-collapse when all steps are completed */
  autoCollapse?: boolean
}

// --- Helpers ---

// 根据 Agent 角色获取配置
const getAgentRoleConfig = (role?: AgentRole) => {
  switch (role) {
    case "planner":
      return {
        label: "规划器",
        color: "text-blue-500 dark:text-blue-400",
        bgColor: "bg-blue-500/10",
        icon: Brain,
      }
    case "executor":
      return {
        label: "执行器",
        color: "text-green-500 dark:text-green-400",
        bgColor: "bg-green-500/10",
        icon: Zap,
      }
    case "validator":
      return {
        label: "验证器",
        color: "text-purple-500 dark:text-purple-400",
        bgColor: "bg-purple-500/10",
        icon: CheckCircle2,
      }
    case "coordinator":
      return {
        label: "协调器",
        color: "text-orange-500 dark:text-orange-400",
        bgColor: "bg-orange-500/10",
        icon: MessageSquare,
      }
    default:
      return {
        label: "通用",
        color: "text-zinc-500 dark:text-zinc-400",
        bgColor: "bg-zinc-500/10",
        icon: Cpu,
      }
  }
}

const getStepIcon = (type: AgentStepType, toolName?: string, agentRole?: AgentRole) => {
  // 如果指定了 Agent 角色，优先使用角色图标
  if (agentRole) {
    return getAgentRoleConfig(agentRole).icon
  }
  
  if (type === "thinking") return Brain
  if (type === "answer") return MessageSquare
  if (type === "observation") return Eye

  // Action: pick icon based on tool name
  if (toolName) {
    const t = toolName.toLowerCase()
    if (t.includes("weather") || t.includes("天气")) return CloudLightning
    if (t.includes("search") || t.includes("搜索") || t.includes("brave") || t.includes("exa")) return Search
    if (t.includes("scrape") || t.includes("抓取") || t.includes("firecrawl")) return Globe
    if (t.includes("spectrum") || t.includes("光谱")) return Zap
    if (t.includes("route") || t.includes("路线") || t.includes("amap")) return MapPin
    if (t.includes("device") || t.includes("设备")) return Cpu
    if (t.includes("data") || t.includes("数据")) return Database
  }
  return Wrench
}


// --- Animated elapsed timer ---
function ElapsedTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setElapsed(Date.now() - startedAt), 100)
    return () => clearInterval(interval)
  }, [startedAt])
  return <span className="tabular-nums">{(elapsed / 1000).toFixed(1)}s</span>
}

// --- Main Component ---

import { motion, AnimatePresence } from "framer-motion"

export function AgentExecutionChain({ steps, className, isActive, autoCollapse: autoCollapseProp = false }: AgentExecutionChainProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [autoCollapse, setAutoCollapse] = useState(() => {
    // 从 localStorage 读取用户的自动折叠偏好
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('agent-execution-chain-auto-collapse')
      return saved === 'true'
    }
    return autoCollapseProp
  })
  
  // 持久化 autoCollapse 状态到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('agent-execution-chain-auto-collapse', String(autoCollapse))
    }
  }, [autoCollapse])
  
  if (steps.length === 0) return null

  // 统计不同角色的 Agent
  const agentRoles = steps.filter(s => s.agentRole).map(s => s.agentRole)
  const uniqueRoles = Array.from(new Set(agentRoles))
  const hasMultipleAgents = uniqueRoles.length > 1
  
  // 检查是否所有步骤都已完成
  const allCompleted = steps.length > 0 && steps.every(s => s.status === 'completed')
  
  // 自动折叠逻辑：当所有步骤完成且启用自动折叠时
  useEffect(() => {
    if (autoCollapse && allCompleted && !isActive && !isCollapsed) {
      const timer = setTimeout(() => {
        console.log('[AgentExecutionChain] Auto-collapsing...')
        setIsCollapsed(true)
      }, 2000) // 2秒后自动折叠
      return () => clearTimeout(timer)
    }
  }, [autoCollapse, allCompleted, isActive, isCollapsed])
  
  // 当有新步骤开始时，自动展开（独立的 effect）
  useEffect(() => {
    if (isActive && isCollapsed) {
      console.log('[AgentExecutionChain] Auto-expanding because agent is active...')
      setIsCollapsed(false)
    }
  }, [isActive]) // 只依赖 isActive，避免循环
  
  // 手动折叠处理
  const handleToggleCollapse = () => {
    console.log('[AgentExecutionChain] Manual toggle, current:', isCollapsed, '-> new:', !isCollapsed)
    setIsCollapsed(!isCollapsed)
  }

  return (
    <div className={cn("w-full my-4", className)}>
      {/* Header with controls */}
      <div className="mb-3 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-100 dark:border-blue-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {hasMultipleAgents ? (
              <>
                <Cpu className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  多 Agent 协作模式
                </span>
                <span className="text-blue-600 dark:text-blue-400">·</span>
                <span className="text-xs text-blue-700 dark:text-blue-300">
                  {uniqueRoles.length} 个 Agent 正在协同工作
                </span>
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  Agent 执行链
                </span>
                <span className="text-blue-600 dark:text-blue-400">·</span>
                <span className="text-xs text-blue-700 dark:text-blue-300">
                  {allCompleted ? '已完成' : isActive ? '执行中' : '待处理'}
                </span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* 自动折叠开关 */}
            <button
              onClick={() => setAutoCollapse(!autoCollapse)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all",
                autoCollapse 
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" 
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              )}
              title={autoCollapse ? "已启用自动折叠" : "点击启用自动折叠"}
            >
              {autoCollapse ? <CheckCircle2 size={12} /> : <Circle size={12} />}
              <span>自动折叠</span>
            </button>
            
            {/* 手动折叠按钮 */}
            <button
              onClick={handleToggleCollapse}
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              title={isCollapsed ? "展开执行链" : "折叠执行链"}
            >
              {isCollapsed ? <ChevronDown size={16} className="text-zinc-600 dark:text-zinc-400" /> : <ChevronUp size={16} className="text-zinc-600 dark:text-zinc-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Compact chain: horizontal pills for finished steps, expanded card for active */}
      <div 
        className={cn(
          "flex flex-col gap-0 transition-all duration-300 ease-in-out overflow-hidden",
          isCollapsed ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"
        )}
      >
        {steps.map((step, index) => {
            const Icon = getStepIcon(step.type, step.toolName, step.agentRole)
            const roleConfig = step.agentRole ? getAgentRoleConfig(step.agentRole) : null
            const isLast = index === steps.length - 1
            const isActiveStep = step.status === "active"

            return (
              <motion.div
                key={step.id}
                layout
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="relative flex items-start gap-3 origin-top"
              >
                {/* Timeline line */}
                {!isLast && (
                  <motion.div 
                    layout
                    className={cn(
                      "absolute left-[11px] top-[24px] bottom-0 w-px origin-top transition-colors",
                      roleConfig ? roleConfig.color.replace('text-', 'bg-').replace('dark:text-', 'dark:bg-') + '/20' : "bg-zinc-200 dark:bg-zinc-800"
                    )}
                  />
                )}

                {/* Timeline dot */}
                <div className="relative z-10 mt-0.5 shrink-0 transition-all duration-500">
                  {isActiveStep ? (
                    <motion.div 
                       layoutId={`dot-${step.id}`}
                       className={cn(
                         "size-6 rounded-full flex items-center justify-center shadow-lg",
                         roleConfig ? roleConfig.bgColor + " " + roleConfig.color : "bg-emerald-500 dark:bg-emerald-400"
                       )}
                       animate={{ boxShadow: ["0 0 0 0 rgba(16,185,129,0.4)", "0 0 0 8px rgba(16,185,129,0)", "0 0 0 0 rgba(16,185,129,0)"] }}
                       transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Loader2 className={cn("size-3.5 animate-spin", roleConfig ? roleConfig.color : "text-white dark:text-zinc-900")} />
                    </motion.div>
                  ) : step.status === "completed" ? (
                    <motion.div 
                       layoutId={`dot-${step.id}`}
                       initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                       className={cn(
                         "size-6 rounded-full flex items-center justify-center",
                         roleConfig ? roleConfig.bgColor + " " + roleConfig.color : "bg-zinc-900 dark:bg-zinc-100"
                       )}
                    >
                      <CheckCircle2 className={cn("size-3.5", roleConfig ? roleConfig.color : "text-white dark:text-zinc-900")} />
                    </motion.div>
                  ) : step.status === "error" ? (
                    <motion.div 
                       layoutId={`dot-${step.id}`}
                       className="size-6 rounded-full bg-red-500 flex items-center justify-center"
                    >
                      <span className="text-white text-xs font-bold">!</span>
                    </motion.div>
                  ) : (
                    <div className="size-6 rounded-full border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900" />
                  )}
                </div>

                {/* Content */}
                <motion.div 
                  layout
                  className={cn(
                    "flex-1 pb-5 min-w-0 transition-all duration-500",
                    isActiveStep ? "pb-6" : ""
                  )}
                >
                  <div className="flex items-center gap-2 min-h-[24px] flex-wrap">
                    <motion.div
                      animate={isActiveStep ? { 
                        scale: [1, 1.2, 1],
                        rotate: [0, 5, -5, 0]
                      } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Icon className={cn(
                        "size-3.5 shrink-0 transition-colors duration-500",
                        isActiveStep ? (roleConfig ? roleConfig.color : "text-emerald-600 dark:text-emerald-400") :
                        step.status === "completed" ? "text-zinc-500 dark:text-zinc-400" :
                        "text-zinc-400 dark:text-zinc-600"
                      )} />
                    </motion.div>
                    
                    {/* Agent 角色标签 */}
                    {roleConfig && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                          roleConfig.bgColor,
                          roleConfig.color
                        )}
                      >
                        {step.agentName || roleConfig.label}
                      </motion.span>
                    )}
                    
                    <span className={cn(
                      "text-[13px] font-medium transition-colors duration-500 transition-all",
                      isActiveStep ? "text-zinc-900 dark:text-zinc-100 font-bold" :
                      step.status === "completed" ? "text-zinc-600 dark:text-zinc-400" :
                      "text-zinc-400 dark:text-zinc-600"
                    )}>
                      {step.title}
                      {isActiveStep && (
                        <motion.span 
                          initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                          className={cn(
                            "ml-2 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-tighter",
                            roleConfig ? roleConfig.bgColor + " " + roleConfig.color : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          正在处理
                        </motion.span>
                      )}
                    </span>

                    {/* Duration or timer */}
                    <AnimatePresence mode="wait">
                      {step.status === "completed" && step.duration ? (
                        <motion.span 
                          key="duration"
                          initial={{ opacity: 0, filter: "blur(4px)" }} animate={{ opacity: 1, filter: "blur(0px)" }}
                          className="text-[11px] text-zinc-400 dark:text-zinc-600 font-mono ml-auto"
                        >
                          {(step.duration / 1000).toFixed(1)}s
                        </motion.span>
                      ) : isActiveStep && step.startedAt ? (
                        <motion.span 
                          key="timer"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="text-[11px] text-zinc-400 dark:text-zinc-600 font-mono ml-auto"
                        >
                          <ElapsedTimer startedAt={step.startedAt} />
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </div>

                  {/* Detail text for active or recently completed action/observation steps */}
                  <AnimatePresence>
                    {step.detail && (isActiveStep || step.status === "completed") && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <p className={cn(
                            "text-[12px] mt-1 leading-relaxed transition-colors duration-500",
                            isActiveStep ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-400 dark:text-zinc-600"
                          )}
                        >
                          {step.detail}
                        </p>
                        {isActiveStep && (
                           <div className="mt-2 flex gap-1 items-center">
                              <div className={cn("size-1 rounded-full animate-pulse", roleConfig ? roleConfig.color.replace('text-', 'bg-') : "bg-emerald-500")} />
                              <div className={cn("size-1 rounded-full animate-pulse [animation-delay:0.2s]", roleConfig ? roleConfig.color.replace('text-', 'bg-') : "bg-emerald-500")} />
                              <div className={cn("size-1 rounded-full animate-pulse [animation-delay:0.4s]", roleConfig ? roleConfig.color.replace('text-', 'bg-') : "bg-emerald-500")} />
                           </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )
          })}
      </div>
    </div>
  )
}

export default AgentExecutionChain
