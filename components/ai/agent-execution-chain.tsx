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
} from "lucide-react"
import { useState, useEffect, useRef } from "react"

// --- Types ---

export type AgentStepType = "thinking" | "action" | "observation" | "answer"
export type AgentStepStatus = "pending" | "active" | "completed" | "error"

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
}

interface AgentExecutionChainProps {
  steps: AgentStep[]
  className?: string
  /** Whether the entire chain is still in progress */
  isActive?: boolean
}

// --- Helpers ---

const getStepIcon = (type: AgentStepType, toolName?: string) => {
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

export function AgentExecutionChain({ steps, className, isActive }: AgentExecutionChainProps) {
  if (steps.length === 0) return null

  return (
    <div className={cn("w-full my-4", className)}>
      {/* Compact chain: horizontal pills for finished steps, expanded card for active */}
      <div className="flex flex-col gap-0">
        <AnimatePresence initial={false}>
          {steps.map((step, index) => {
            const Icon = getStepIcon(step.type, step.toolName)
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
                    className="absolute left-[11px] top-[24px] bottom-0 w-px bg-zinc-200 dark:bg-zinc-800 origin-top" 
                  />
                )}

                {/* Timeline dot */}
                <div className="relative z-10 mt-0.5 shrink-0 transition-all duration-500">
                  {isActiveStep ? (
                    <motion.div 
                       layoutId={`dot-${step.id}`}
                       className="size-6 rounded-full bg-emerald-500 dark:bg-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                    >
                      <Loader2 className="size-3.5 text-white dark:text-zinc-900 animate-spin" />
                    </motion.div>
                  ) : step.status === "completed" ? (
                    <motion.div 
                       layoutId={`dot-${step.id}`}
                       initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                       className="size-6 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center"
                    >
                      <CheckCircle2 className="size-3.5 text-white dark:text-zinc-900" />
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
                  <div className="flex items-center gap-2 min-h-[24px]">
                    <motion.div
                      animate={isActiveStep ? { 
                        scale: [1, 1.2, 1],
                        rotate: [0, 5, -5, 0]
                      } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Icon className={cn(
                        "size-3.5 shrink-0 transition-colors duration-500",
                        isActiveStep ? "text-emerald-600 dark:text-emerald-400" :
                        step.status === "completed" ? "text-zinc-500 dark:text-zinc-400" :
                        "text-zinc-400 dark:text-zinc-600"
                      )} />
                    </motion.div>
                    
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
                          className="ml-2 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] uppercase tracking-tighter"
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
                              <div className="size-1 rounded-full bg-emerald-500 animate-pulse" />
                              <div className="size-1 rounded-full bg-emerald-500 animate-pulse [animation-delay:0.2s]" />
                              <div className="size-1 rounded-full bg-emerald-500 animate-pulse [animation-delay:0.4s]" />
                           </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default AgentExecutionChain
