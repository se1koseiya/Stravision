"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { CalendarClock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { ArrowRight } from "@/components/animate-ui/icons/arrow-right";
import { Timer } from "@/components/animate-ui/icons/timer";
import { X } from "@/components/animate-ui/icons/x";
import { toast } from "sonner"

interface ScheduleData {
  title: string
  cron?: string
  execute_at?: number
  delay_seconds?: number
  task_action: string
  device?: number  // 可选，仅 toggle_relay 需要
  value?: number   // 可选，仅 toggle_relay 需要
  params?: any
}

function CountdownToast({ id, targetTime, title }: { id: string | number, targetTime: number, title: string }) {
  const [remaining, setRemaining] = useState(Math.max(0, Math.ceil((targetTime - Date.now()) / 1000)))
  const totalDuration = useState(remaining)[0] // Store initial duration for progress bar

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.ceil((targetTime - Date.now()) / 1000)
      if (diff <= 0) {
        setRemaining(0)
        clearInterval(interval)
        toast.dismiss(id)
        toast.success("任务已执行", { description: title })
      } else {
        setRemaining(diff)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [targetTime, id, title])

  const progress = Math.max(0, Math.min(100, (remaining / totalDuration) * 100))

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="size-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 animate-pulse">
            <Timer size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">任务倒计时</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{title}</div>
          </div>
        </div>
        <div className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono shrink-0">{remaining}s</div>
      </div>
      
      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 dark:bg-blue-600 transition-all duration-1000 ease-linear" 
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export function ScheduleCard({ data }: { data: ScheduleData }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [autoCreated, setAutoCreated] = useState(false)
  const creatingRef = useRef(false) // 防止并发创建

  const handleConfirm = async () => {
    // 防止重复调用
    if (creatingRef.current) {
      console.log('[ScheduleCard] Already creating, skipping...')
      return
    }
    
    creatingRef.current = true
    setStatus('loading')
    
    console.log('[ScheduleCard] Creating task:', data.title)
    
    try {
      // Calculate final execution time
      let finalExecuteAt = data.execute_at
      
      if (data.delay_seconds) {
        finalExecuteAt = Date.now() + (data.delay_seconds * 1000)
      }

      const getParams = () => {
        if (data.params && Object.keys(data.params).length > 0) return data.params
        
        if (data.task_action === 'toggle_relay') {
          return { value: data.value }
        }
        
        if (data.task_action === 'set_led') {
          const d = data as any
          return { 
            r: d.r ?? 0,
            g: d.g ?? 0,
            b: d.b ?? 0,
            w: d.w ?? 0
          }
        }
        return {}
      }

      const res = await fetch('/api/scheduler/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          cron_expression: data.cron,
          execute_at: finalExecuteAt,
          action_type: data.task_action === 'toggle_relay' ? 'relay' : 
                       data.task_action === 'set_led' ? 'led' : 
                       data.task_action === 'agent_analysis' ? 'agent' : 
                       data.task_action === 'user_reminder' ? 'reminder' : data.task_action,
          device_id: data.device,
          params: getParams()
        })
      })
      
      if (!res.ok) throw new Error("Failed to create task")
      
      console.log('[ScheduleCard] Task created successfully')
      setStatus('success')
      
      // Check if it's a short-term one-time task (e.g., within 5 minutes)
      if (finalExecuteAt && !data.cron) {
        const delay = finalExecuteAt - Date.now()
        // Show countdown for tasks within 5 minutes (300000ms)
        if (delay > 0 && delay <= 300000) {
           toast.custom((id) => (
             <CountdownToast id={id} targetTime={finalExecuteAt!} title={data.title} />
           ), { duration: Infinity }) // Keep open until manually closed or timer ends
        } else {
           toast.success("定时任务已创建", { 
             description: `${data.title}`,
             action: {
               label: "查看列表",
               onClick: () => {
                 // 触发显示任务列表
                 const event = new CustomEvent('show-scheduled-tasks')
                 window.dispatchEvent(event)
               }
             }
           })
        }
      } else {
        toast.success("定时任务已创建", { 
          description: `${data.title}`,
          action: {
            label: "查看列表",
            onClick: () => {
              // 触发显示任务列表
              const event = new CustomEvent('show-scheduled-tasks')
              window.dispatchEvent(event)
            }
          }
        })
      }
      
    } catch (e) {
      console.error('[ScheduleCard] Failed to create task:', e)
      setStatus('error')
      toast.error("创建失败")
      creatingRef.current = false // 失败时重置，允许重试
    }
  }

  // 🔥 自动创建任务：当组件挂载时自动保存到数据库
  useEffect(() => {
    if (!autoCreated && status === 'idle' && !creatingRef.current) {
      console.log('[ScheduleCard] Auto-creating task on mount')
      setAutoCreated(true)
      handleConfirm()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 加载中显示简洁的创建提示
  if (status === 'loading') {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="my-2 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400"
      >
        <Loader2 size={14} className="animate-spin" />
        <span>正在创建定时任务...</span>
      </motion.div>
    )
  }

  if (status === 'success') {
    // 成功后显示简洁的成功提示
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="my-2 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium"
      >
        <CheckCircle2 size={16} />
        <span>✅ 定时任务已创建：{data.title}</span>
      </motion.div>
    )
  }

  // 错误状态才显示提示
  if (status === 'error') {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="my-4 p-5 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-[20px] flex items-center gap-4"
      >
        <div className="size-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0 shadow-sm">
           <XCircle size={24} />
        </div>
        <div>
           <div className="font-bold text-red-900 dark:text-red-100 text-lg">创建失败</div>
           <div className="text-sm text-red-700 dark:text-red-300 opacity-90">请稍后重试</div>
        </div>
      </motion.div>
    )
  }

  // idle 状态也不显示（因为会立即变成 loading）
  return null
}
