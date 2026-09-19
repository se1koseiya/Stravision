"use client"

import { cn } from "@/lib/utils"
import { useState, useEffect, useRef } from "react"
import { IconBrain, IconCheckOne, IconComment, IconCpu, IconDatabaseNetwork, IconDown, IconGlobe, IconLightning, IconLoading, IconLocalPin, IconPreviewOpen, IconRound, IconSearch, IconSunny, IconTool, IconUp } from "@/components/icon";

// --- Types ---

export type AgentStepType = "thinking" | "action" | "observation" | "answer"
export type AgentStepStatus = "pending" | "active" | "completed" | "error"

export type AgentRole = "planner" | "executor" | "validator" | "coordinator" | "general"

export interface AgentStep {
  id: string
  type: AgentStepType
  status: AgentStepStatus
  title: string
  detail?: string
  toolName?: string
  duration?: number
  startedAt?: number
  agentRole?: AgentRole
  agentName?: string
}

interface AgentExecutionChainProps {
  steps: AgentStep[]
  className?: string
  isActive?: boolean
  autoCollapse?: boolean
}

// --- Helpers ---

const getAgentRoleConfig = (role?: AgentRole) => {
  switch (role) {
    case "planner":
      return {
        label: "规划器",
        color: "text-cyan-600 dark:text-cyan-400",
        bgColor: "bg-cyan-50 dark:bg-cyan-500/10",
        borderColor: "border-cyan-200 dark:border-cyan-500/20",
        glow: "shadow-[0_0_15px_rgba(6,182,212,0.3)] dark:shadow-[0_0_15px_rgba(34,211,238,0.4)]",
        icon: IconBrain,
      }
    case "executor":
      return {
        label: "执行器",
        color: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
        borderColor: "border-emerald-200 dark:border-emerald-500/20",
        glow: "shadow-[0_0_15px_rgba(16,185,129,0.3)] dark:shadow-[0_0_15px_rgba(16,185,129,0.4)]",
        icon: IconLightning,
      }
    case "validator":
      return {
        label: "验证器",
        color: "text-violet-600 dark:text-violet-400",
        bgColor: "bg-violet-50 dark:bg-violet-500/10",
        borderColor: "border-violet-200 dark:border-violet-500/20",
        glow: "shadow-[0_0_15px_rgba(139,92,246,0.3)] dark:shadow-[0_0_15px_rgba(139,92,246,0.4)]",
        icon: IconCheckOne,
      }
    case "coordinator":
      return {
        label: "协调器",
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-50 dark:bg-amber-500/10",
        borderColor: "border-amber-200 dark:border-amber-500/20",
        glow: "shadow-[0_0_15px_rgba(245,158,11,0.3)] dark:shadow-[0_0_15px_rgba(251,191,36,0.4)]",
        icon: IconComment,
      }
    default:
      return {
        label: "通用",
        color: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
        borderColor: "border-emerald-200 dark:border-emerald-500/20",
        glow: "shadow-[0_0_15px_rgba(16,185,129,0.3)] dark:shadow-[0_0_15px_rgba(16,185,129,0.4)]",
        icon: IconCpu,
      }
  }
}

const getStepIcon = (type: AgentStepType, toolName?: string, agentRole?: AgentRole) => {
  if (agentRole) {
    return getAgentRoleConfig(agentRole).icon
  }
  
  if (type === "thinking") return IconBrain
  if (type === "answer") return IconComment
  if (type === "observation") return IconPreviewOpen

  if (toolName) {
    const t = toolName.toLowerCase()
    if (t.includes("weather") || t.includes("天气")) return IconSunny
    if (t.includes("search") || t.includes("搜索") || t.includes("brave") || t.includes("exa")) return IconSearch
    if (t.includes("scrape") || t.includes("抓取") || t.includes("firecrawl")) return IconGlobe
    if (t.includes("spectrum") || t.includes("光谱")) return IconLightning
    if (t.includes("route") || t.includes("路线") || t.includes("amap")) return IconLocalPin
    if (t.includes("device") || t.includes("设备")) return IconCpu
    if (t.includes("data") || t.includes("数据")) return IconDatabaseNetwork
  }
  return IconTool
}

function ElapsedTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setElapsed(Date.now() - startedAt), 100)
    return () => clearInterval(interval)
  }, [startedAt])
  return <span className="tabular-nums">{(elapsed / 1000).toFixed(1)}s</span>
}

import { motion, AnimatePresence } from "framer-motion"

export function AgentExecutionChain({ steps, className, isActive, autoCollapse: autoCollapseProp = false }: AgentExecutionChainProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [autoCollapse, setAutoCollapse] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('agent-execution-chain-auto-collapse')
      return saved === 'true'
    }
    return autoCollapseProp
  })
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('agent-execution-chain-auto-collapse', String(autoCollapse))
    }
  }, [autoCollapse])
  
  if (steps.length === 0) return null

  const agentRoles = steps.filter(s => s.agentRole).map(s => s.agentRole)
  const uniqueRoles = Array.from(new Set(agentRoles))
  const hasMultipleAgents = uniqueRoles.length > 1
  
  const allCompleted = steps.length > 0 && steps.every(s => s.status === 'completed')
  
  useEffect(() => {
    if (autoCollapse && allCompleted && !isActive && !isCollapsed) {
      const timer = setTimeout(() => {
        setIsCollapsed(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [autoCollapse, allCompleted, isActive, isCollapsed])
  
  useEffect(() => {
    if (isActive && isCollapsed) {
      setIsCollapsed(false)
    }
  }, [isActive])
  
  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <div className={cn("w-full my-4", className)}>
      {/* Header with controls */}
      <div className="mb-4 px-4 py-3 rounded-2xl bg-white/80 dark:bg-black/20 backdrop-blur-xl border border-zinc-200 dark:border-white/5 shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)] relative overflow-hidden transition-colors">
        {/* Subtle glow background */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-cyan-500/5 dark:from-emerald-500/10 dark:via-transparent dark:to-cyan-500/5 pointer-events-none" />
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3 text-sm">
            {hasMultipleAgents ? (
              <>
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 shadow-sm dark:shadow-[0_0_10px_rgba(16,185,129,0.2)] transition-colors">
                  <IconCpu className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="font-medium text-zinc-800 dark:text-zinc-100 tracking-wide transition-colors">
                  多 Agent 协作模式
                </span>
                <span className="text-zinc-400 dark:text-zinc-600 transition-colors">·</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 transition-colors">
                  {uniqueRoles.length} 个 Agent 正在协同工作
                </span>
              </>
            ) : (
              <>
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 shadow-sm dark:shadow-[0_0_10px_rgba(16,185,129,0.2)] transition-colors">
                  <IconBrain className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="font-medium text-zinc-800 dark:text-zinc-100 tracking-wide transition-colors">
                  Agent 执行链
                </span>
                <span className="text-zinc-400 dark:text-zinc-600 transition-colors">·</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 transition-colors">
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
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border",
                autoCollapse 
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 dark:shadow-[0_0_10px_rgba(16,185,129,0.15)]" 
                  : "bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200 hover:text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400 dark:border-white/5 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
              )}
              title={autoCollapse ? "已启用自动折叠" : "点击启用自动折叠"}
            >
              {autoCollapse ? <IconCheckOne size={12} /> : <IconRound size={12} />}
              <span>自动折叠</span>
            </button>
            
            {/* 手动折叠按钮 */}
            <button
              onClick={handleToggleCollapse}
              className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-white/10 transition-all border border-transparent hover:border-zinc-300 dark:hover:border-white/10"
              title={isCollapsed ? "展开执行链" : "折叠执行链"}
            >
              {isCollapsed ? <IconDown size={16} className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors" /> : <IconUp size={16} className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors" />}
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
                      roleConfig ? roleConfig.color.replace('text-', 'bg-').replace('dark:text-', 'dark:bg-') + '/20' : "bg-zinc-200 dark:bg-emerald-500/20"
                    )}
                  />
                )}

                {/* Timeline dot */}
                <div className="relative z-10 mt-0.5 shrink-0 transition-all duration-500">
                  {isActiveStep ? (
                    <motion.div 
                       layoutId={`dot-${step.id}`}
                       className={cn(
                         "size-6 rounded-full flex items-center justify-center border",
                         roleConfig ? `${roleConfig.bgColor} ${roleConfig.color} ${roleConfig.borderColor} ${roleConfig.glow}` : "bg-emerald-100 text-emerald-600 border-emerald-200 shadow-sm dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 dark:shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                       )}
                       animate={{ 
                         boxShadow: [
                           roleConfig ? roleConfig.glow.replace('15px', '5px') : "0 0 5px rgba(16,185,129,0.2)", 
                           roleConfig ? roleConfig.glow.replace('15px', '25px') : "0 0 20px rgba(16,185,129,0.5)", 
                           roleConfig ? roleConfig.glow.replace('15px', '5px') : "0 0 5px rgba(16,185,129,0.2)"
                         ] 
                       }}
                       transition={{ duration: 2, repeat: Infinity }}
                    >
                      <IconLoading className={cn("size-3.5 animate-spin", roleConfig ? roleConfig.color : "text-emerald-600 dark:text-emerald-400")} />
                    </motion.div>
                  ) : step.status === "completed" ? (
                    <motion.div 
                       layoutId={`dot-${step.id}`}
                       initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                       className={cn(
                         "size-6 rounded-full flex items-center justify-center border",
                         roleConfig ? `${roleConfig.bgColor} ${roleConfig.color} ${roleConfig.borderColor}` : "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-emerald-500/10 dark:text-emerald-500 dark:border-emerald-500/20"
                       )}
                    >
                      <IconCheckOne className={cn("size-3.5", roleConfig ? roleConfig.color : "text-zinc-500 dark:text-emerald-500")} />
                    </motion.div>
                  ) : step.status === "error" ? (
                    <motion.div 
                       layoutId={`dot-${step.id}`}
                       className="size-6 rounded-full bg-red-100 border border-red-200 shadow-sm dark:bg-red-500/10 dark:border-red-500/30 dark:shadow-[0_0_15px_rgba(239,68,68,0.2)] flex items-center justify-center"
                    >
                      <span className="text-red-600 dark:text-red-400 text-xs font-bold">!</span>
                    </motion.div>
                  ) : (
                    <div className="size-6 rounded-full border border-zinc-200 bg-zinc-50 dark:border-white/5 dark:bg-black/40 transition-colors" />
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <motion.div
                      animate={isActiveStep ? { 
                        scale: [1, 1.2, 1],
                        rotate: [0, 5, -5, 0]
                      } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="flex items-center justify-center"
                    >
                      <Icon className={cn(
                        "size-3.5 shrink-0 transition-colors duration-500",
                        isActiveStep ? (roleConfig ? roleConfig.color : "text-emerald-600 dark:text-emerald-400") :
                        step.status === "completed" ? "text-zinc-500 dark:text-zinc-500" :
                        "text-zinc-400 dark:text-zinc-600"
                      )} />
                    </motion.div>
                    
                    {/* Agent 角色标签 */}
                    {roleConfig && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border flex items-center",
                          roleConfig.bgColor,
                          roleConfig.color,
                          roleConfig.borderColor
                        )}
                      >
                        {step.agentName || roleConfig.label}
                      </motion.span>
                    )}
                    
                    <span className={cn(
                      "text-[13px] font-medium transition-colors duration-500 transition-all flex items-center",
                      isActiveStep ? "text-zinc-900 dark:text-zinc-100 font-bold" :
                      step.status === "completed" ? "text-zinc-600 dark:text-zinc-400" :
                      "text-zinc-400 dark:text-zinc-600"
                    )}>
                      {step.title}
                      {isActiveStep && (
                        <motion.span 
                          initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                          className={cn(
                            "ml-2 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-tighter border inline-flex items-center",
                            roleConfig ? `${roleConfig.bgColor} ${roleConfig.color} ${roleConfig.borderColor}` : "bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
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
                          className="text-[11px] text-zinc-500 font-mono ml-auto transition-colors flex items-center"
                        >
                          {(step.duration / 1000).toFixed(1)}s
                        </motion.span>
                      ) : isActiveStep && step.startedAt ? (
                        <motion.span 
                          key="timer"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="text-[11px] text-zinc-500 font-mono ml-auto transition-colors flex items-center"
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
                            isActiveStep ? "text-zinc-600 dark:text-zinc-400" : "text-zinc-500 dark:text-zinc-600"
                          )}
                        >
                          {step.detail}
                        </p>
                        {isActiveStep && (
                           <div className="mt-2 flex gap-1 items-center">
                              <div className={cn("size-1 rounded-full animate-pulse", roleConfig ? roleConfig.color.replace('text-', 'bg-').replace('dark:text-', 'dark:bg-') : "bg-emerald-500 dark:bg-emerald-400")} />
                              <div className={cn("size-1 rounded-full animate-pulse [animation-delay:0.2s]", roleConfig ? roleConfig.color.replace('text-', 'bg-').replace('dark:text-', 'dark:bg-') : "bg-emerald-500 dark:bg-emerald-400")} />
                              <div className={cn("size-1 rounded-full animate-pulse [animation-delay:0.4s]", roleConfig ? roleConfig.color.replace('text-', 'bg-').replace('dark:text-', 'dark:bg-') : "bg-emerald-500 dark:bg-emerald-400")} />
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
