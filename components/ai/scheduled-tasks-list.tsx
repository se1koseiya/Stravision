"use client"

import { useEffect, useState } from "react"
import { Calendar, Repeat, PlayCircle, Power, Bell, Loader2 } from "lucide-react";
import { Clock } from "@/components/animate-ui/icons/clock";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

interface ScheduledTask {
  id: number
  title: string
  cron_expression?: string | null
  execute_at?: number | null
  next_run?: number | null
  action_type: 'relay' | 'led' | 'agent' | 'reminder'
  device_id?: number
  params: string
  is_active: number
  created_at: number
}

function Countdown({ targetDate }: { targetDate: number }) {
  const [timeLeft, setTimeLeft] = useState<string>("")

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate - Date.now()
      
      if (difference <= 0) {
        return "执行中..."
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((difference / 1000 / 60) % 60)
      const seconds = Math.floor((difference / 1000) % 60)

      if (days > 0) {
        return `${days}天 ${hours}小时`
      }
      if (hours > 0) {
        return `${hours}小时 ${minutes}分`
      }
      return `${minutes}分 ${seconds}秒`
    }

    setTimeLeft(calculateTimeLeft())
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  return <span className="text-blue-600 font-medium">{timeLeft}</span>
}

export function ScheduledTasksList() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/scheduler/tasks')
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
    // Poll for updates every 5s for immediate visibility
    const interval = setInterval(fetchTasks, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/scheduler/tasks?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== id))
        toast.success("任务已删除")
      } else {
        throw new Error()
      }
    } catch (e) {
      toast.error("删除失败")
    } finally {
      setDeletingId(null)
    }
  }

  const getDeviceName = (id?: number) => {
    switch(id) {
      case 5: return "灌溉水泵"
      case 6: return "通风风扇"
      case 7: return "补光灯"
      case 8: return "白光灯"
      default: return `设备 ${id}`
    }
  }

  const formatTime = (timestamp?: number | null, cron?: string | null) => {
    if (cron) return `Cron: ${cron}`
    if (!timestamp) return "立即执行"
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <Loader2 className="animate-spin mr-2" size={20} />
        <span>加载任务列表...</span>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="my-6 bg-white dark:bg-white/5 rounded-[20px] p-8 border border-zinc-100 dark:border-white/5 flex flex-col items-center justify-center text-center shadow-sm">
        <div className="size-16 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full flex items-center justify-center mb-4 text-blue-500 dark:text-blue-400">
           <Calendar size={28} />
        </div>
        <h3 className="text-zinc-900 dark:text-white font-semibold text-lg mb-2">暂无自动化记录</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
          您可以让 AI 帮您设定设备定时或延时提醒，例如<br/>
          <span className="text-zinc-700 dark:text-zinc-300 font-medium">"每天8点开启水泵"</span> 或 <span className="text-zinc-700 dark:text-zinc-300 font-medium">"10分钟后提醒我分析"</span>
        </p>
      </div>
    )
  }

  return (
    <div className="my-8 space-y-4">
      <div className="flex items-center justify-between px-1 mb-2">
         <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
           <Clock size={16} className="text-blue-500" />
           定时任务列表 ({tasks.length})
         </h3>
      </div>
      
      <AnimatePresence mode="popLayout">
        {tasks.map((task) => {
          const params = JSON.parse(task.params)
          const isRelay = task.action_type === 'relay'
          const isOn = isRelay && params.value === 1
          
          return (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="group relative bg-white dark:bg-zinc-900 rounded-[20px] border border-zinc-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
            >
              <div className="p-5 flex items-center gap-5">
                 {/* Icon with gradient background */}
                 <div className={cn(
                   "size-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                   task.is_active 
                     ? (task.action_type === 'agent' || task.action_type === 'reminder')
                       ? "bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/20"
                       : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20" 
                     : "bg-zinc-100 dark:bg-white/10 text-zinc-400 dark:text-zinc-500"
                 )}>
                    {task.action_type === 'agent' ? <PlayCircle size={20} /> : task.action_type === 'reminder' ? <Bell size={20} /> : task.cron_expression ? <Repeat size={20} /> : <PlayCircle size={20} />}
                 </div>

                 {/* Content */}
                 <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                       <h4 className="font-bold text-base text-zinc-900 dark:text-white truncate pr-2">{task.title}</h4>
                       <span className={cn(
                         "text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide shrink-0 border",
                         task.is_active 
                           ? "bg-emerald-50 dark:bg-emerald-900/20 text-primary dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30" 
                           : "bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-white/10"
                       )}>
                         {task.is_active ? "ACTIVE" : "DONE"}
                       </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                       <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-white/5 px-2 py-1 rounded-md">
                          <Clock size={12} className="text-zinc-400" />
                          <span className="font-mono tracking-tight">
                            {task.is_active ? (
                              (task.next_run || task.execute_at) ? (
                                <>
                                  倒计时: <Countdown targetDate={(task.next_run || task.execute_at)!} />
                                </>
                              ) : (
                                formatTime(task.execute_at, task.cron_expression)
                              )
                            ) : (
                              <span className="text-zinc-400">已完成</span>
                            )}
                          </span>
                       </div>
                       
                       <div className="flex items-center gap-1.5">
                          <Power size={12} className={cn((isOn || task.action_type === 'agent' || task.action_type === 'reminder') ? "text-primary" : "text-rose-500")} />
                          <span className={cn((isOn || task.action_type === 'agent' || task.action_type === 'reminder') ? "text-primary dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                            {task.action_type === 'agent' ? "智能分析" : task.action_type === 'reminder' ? "定时提醒" : isRelay ? (isOn ? "开启" : "关闭") : "调节颜色"}
                          </span>
                       </div>
                    </div>
                 </div>

                 {/* Actions */}
                 <button 
                   onClick={() => handleDelete(task.id)}
                   disabled={deletingId === task.id}
                   className="size-9 flex items-center justify-center text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
                   title="删除任务"
                 >
                    {deletingId === task.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={18} />}
                 </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
