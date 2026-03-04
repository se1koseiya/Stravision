"use client"

import { useEffect, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { format, addDays, startOfWeek, isSameDay } from "date-fns"
import { zhCN } from "date-fns/locale"

// 数据库日志类型
interface DBLog {
  id: number
  device_name: string
  action: string
  operator: string
  details: string
  created_at: number
}

// UI 展示用的日志类型
interface ActivityLog {
  id: string
  time: string
  device: string
  action: string
  status: "success" | "warning" | "error"
}

// 星期中文映射
const WEEKDAY_CN = ["日", "一", "二", "三", "四", "五", "六"]

export function ActivityPanel() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 生成本周日历数据
  const startDate = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i))

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/device-logs?limit=50")
      if (res.ok) {
        const data = await res.json()
        const dbLogs: DBLog[] = data.logs || []
        
        // 转换为 UI 格式并根据日期过滤
        const formattedLogs: ActivityLog[] = dbLogs
          .filter(log => isSameDay(new Date(log.created_at), selectedDate))
          .map(log => ({
            id: log.id.toString(),
            time: format(new Date(log.created_at), "HH:mm"),
            device: log.device_name,
            // 如果有 operator 且不是 AI/System，可以显示操作者，这里简化显示 details
            action: log.details || log.action,
            status: (log.action.toLowerCase().includes("error") || log.details?.toLowerCase().includes("error")) 
              ? "error" as const
              : "success" as const
          }))
        
        setLogs(formattedLogs)
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedDate])

  // 初始加载和自动刷新
  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 10000) // 每10秒刷新一次
    return () => clearInterval(interval)
  }, [fetchLogs])

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <h3 className="text-gray-500 dark:text-gray-400 font-medium mb-4">操作日志</h3>
      <div className="text-xs text-gray-400 mb-6">
        {format(new Date(), "yyyy年M月d日", { locale: zhCN })}
      </div>
      
      {/* Calendar Strip */}
      <div className="flex justify-between mb-8 text-center">
        {weekDays.map((day) => {
          const isSelected = isSameDay(day, selectedDate)
          const isToday = isSameDay(day, new Date())
          
          return (
            <div 
              key={day.toISOString()} 
              className={cn(
                "flex flex-col gap-1 cursor-pointer transition-all hover:scale-110",
                isSelected ? "text-foreground font-bold" : "text-gray-400"
              )}
              onClick={() => setSelectedDate(day)}
            >
              <span className="text-xs">{format(day, "d")}</span>
              <span className="text-[10px]">周{WEEKDAY_CN[day.getDay()]}</span>
              {isSelected && <div className="h-1 w-1 bg-emerald-500 rounded-full mx-auto mt-1" />}
              {!isSelected && isToday && <div className="h-1 w-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mt-1" />}
            </div>
          )
        })}
      </div>

      {/* Timeline */}
      <div className="space-y-6 relative pl-4 border-l-2 border-dashed border-gray-200 dark:border-white/10 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {logs.map((log, index) => (
          <div key={log.id} className="relative pl-6 animate-in slide-in-from-bottom-2 fade-in duration-500" style={{ animationDelay: `${index * 100}ms` }}>
            <div className={cn(
              "absolute -left-[21px] top-1 h-3 w-3 rounded-full ring-4 ring-white dark:ring-slate-900 transition-colors",
              log.status === "success" ? "bg-slate-900 dark:bg-emerald-400" : 
              log.status === "warning" ? "bg-gray-300 dark:bg-yellow-400" : "bg-red-400"
            )} />
            <div className="text-xs text-gray-400 font-mono mb-1">{log.time}</div>
            <div className={cn(
              "p-4 rounded-2xl rounded-tl-none transition-colors",
              log.status === "success" ? "bg-[#E0E7FF] dark:bg-indigo-500/20" : "bg-gray-100 dark:bg-slate-800/50"
            )}>
              <div className={cn(
                "font-bold mb-1",
                log.status === "success" ? "text-[#4338CA] dark:text-indigo-300" : "text-gray-900 dark:text-gray-200"
              )}>
                {log.device}
              </div>
              <div className={cn(
                "text-sm",
                log.status === "success" ? "text-[#6366F1] dark:text-indigo-200/70" : "text-gray-500 dark:text-gray-400"
              )}>
                {log.action}
              </div>
              {log.status === "success" && (
                <div className="mt-3 h-1 w-full bg-white/50 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#4338CA] dark:bg-indigo-400 w-full animate-progress-indeterminate" />
                </div>
              )}
            </div>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="text-center text-xs text-gray-400 py-8">
            {isLoading ? "加载中..." : "无活动记录"}
          </div>
        )}
      </div>
    </div>
  )
}
