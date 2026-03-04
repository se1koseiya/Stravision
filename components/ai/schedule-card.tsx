"use client"

import { useState, useEffect } from "react"
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
  device: number
  value: number
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
    <div className="w-[356px] bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-gray-200 dark:border-white/10 p-4 flex flex-col gap-3 pointer-events-auto relative overflow-hidden">
      <div className="flex items-start justify-between gap-2 relative z-10">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 animate-pulse">
            <Timer size={18} />
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">任务倒计时</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{title}</div>
          </div>
        </div>
        <div className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono w-12 text-right">{remaining}s</div>
      </div>
      
      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden relative z-10">
        <div 
          className="h-full bg-blue-500 dark:bg-blue-600 transition-all duration-1000 ease-linear" 
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Close Button */}
      <button 
        onClick={() => toast.dismiss(id)} 
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/10 dark:hover:text-gray-200 rounded-md transition-colors z-20"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function ScheduleCard({ data }: { data: ScheduleData }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleConfirm = async () => {
    setStatus('loading')
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
          action_type: data.task_action === 'toggle_relay' ? 'relay' : 'led',
          device_id: data.device,
          params: getParams()
        })
      })
      
      if (!res.ok) throw new Error("Failed to create task")
      
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
           toast.success("定时任务已创建")
        }
      } else {
        toast.success("定时任务已创建")
      }
      
    } catch (e) {
      setStatus('error')
      toast.error("创建失败")
    }
  }

  if (status === 'success') {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="my-4 p-5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-[20px] flex items-center gap-4"
      >
        <div className="size-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-sm">
           <CheckCircle2 size={24} />
        </div>
        <div>
           <div className="font-bold text-emerald-900 dark:text-emerald-100 text-lg">任务已设定</div>
           <div className="text-sm text-emerald-700 dark:text-emerald-300 opacity-90">{data.title}</div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-6 bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-100 dark:border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden relative group"
    >
       {/* Decorative background blur */}
       <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors duration-500" />
       
       <div className="p-6 relative z-10">
          <div className="flex items-start justify-between mb-4">
             <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
                   <CalendarClock size={20} />
                </div>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 text-lg">建议定时任务</span>
             </div>
             
             <div className="px-3 py-1 bg-zinc-50 dark:bg-white/5 rounded-full border border-zinc-100 dark:border-white/10 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                AI 推荐
             </div>
          </div>
          
          <div className="mb-6">
             <div className="text-xl font-bold text-zinc-900 dark:text-white mb-2 leading-tight">{data.title}</div>
             <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-white/5 px-2.5 py-1.5 rounded-lg border border-zinc-100 dark:border-white/5">
                   <Timer size={14} className="text-zinc-400" />
                   <span className="text-xs font-mono text-zinc-600 dark:text-zinc-300">
                     {data.cron 
                       ? `Cron: ${data.cron}` 
                       : data.delay_seconds 
                         ? `${data.delay_seconds}秒后执行` 
                         : `${new Date(data.execute_at!).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
                     }
                   </span>
                </div>
                <ArrowRight size={14} className="text-zinc-300" />
                <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-white/5 px-2.5 py-1.5 rounded-lg border border-zinc-100 dark:border-white/5">
                   <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {data.task_action === 'toggle_relay' ? `设备 ${data.device} -> ${data.value ? '开启' : '关闭'}` : '调节灯光'}
                   </span>
                </div>
             </div>
          </div>
          
          <button 
            onClick={handleConfirm}
            disabled={status === 'loading'}
            className="w-full flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-3.5 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-all active:scale-[0.98] font-bold text-sm shadow-lg shadow-zinc-900/10 dark:shadow-none group/btn"
          >
             {status === 'loading' ? (
               <Loader2 size={18} className="animate-spin" />
             ) : (
               <>
                 <CheckCircle2 size={18} className="group-hover/btn:scale-110 transition-transform" />
                 确认创建任务
               </>
             )}
          </button>
       </div>
    </motion.div>
  )
}
