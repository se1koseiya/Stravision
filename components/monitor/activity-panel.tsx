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
  created_at: number | string // 可能是数字或字符串
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
  const [showAllLogs, setShowAllLogs] = useState(true) // 默认显示所有日志

  // 生成本周日历数据
  const startDate = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i))

  const fetchLogs = useCallback(async () => {
    try {
      console.log(`[ActivityPanel] 开始获取日志, showAllLogs=${showAllLogs}, selectedDate=${selectedDate.toLocaleDateString()}`)
      const res = await fetch("/api/device-logs?limit=50")
      if (res.ok) {
        const data = await res.json()
        const dbLogs: DBLog[] = data.logs || []
        
        console.log(`[ActivityPanel] 获取到 ${dbLogs.length} 条日志`)
        console.log(`[ActivityPanel] 前3条日志:`, dbLogs.slice(0, 3))
        
        // 转换为 UI 格式并根据日期过滤
        const formattedLogs: ActivityLog[] = dbLogs
          .filter(log => {
            // 如果显示所有日志，不过滤日期
            if (showAllLogs) {
              console.log(`[ActivityPanel] showAllLogs=true, 接受日志:`, log.id, log.device_name)
              return true
            }
            
            // 确保 created_at 是有效的时间戳，转换为数字
            const timestamp = typeof log.created_at === 'string' ? parseInt(log.created_at, 10) : log.created_at
            const logDate = new Date(timestamp)
            if (isNaN(logDate.getTime())) {
              console.warn("[ActivityPanel] 无效的时间戳:", log)
              return false
            }
            const matches = isSameDay(logDate, selectedDate)
            console.log(`[ActivityPanel] 日志 ${log.id}: ${logDate.toLocaleDateString()} vs ${selectedDate.toLocaleDateString()} = ${matches}`)
            return matches
          })
          .filter(log => {
            // 再次验证时间戳有效性，过滤掉无效的
            const timestamp = typeof log.created_at === 'string' ? parseInt(log.created_at, 10) : log.created_at
            const logDate = new Date(timestamp)
            if (isNaN(logDate.getTime())) {
              console.error("[ActivityPanel] 跳过无效时间戳的日志:", log)
              return false
            }
            return true
          })
          .map(log => {
            const timestamp = typeof log.created_at === 'string' ? parseInt(log.created_at, 10) : log.created_at
            const logDate = new Date(timestamp)
            return {
              id: log.id.toString(),
              time: format(logDate, "HH:mm"),
              device: log.device_name,
              // 如果有 operator 且不是 AI/System，可以显示操作者，这里简化显示 details
              action: log.details || log.action,
              status: (log.action.toLowerCase().includes("error") || log.details?.toLowerCase().includes("error")) 
                ? "error" as const
                : "success" as const
            }
          })
        
        console.log(`[ActivityPanel] 过滤后有 ${formattedLogs.length} 条日志${showAllLogs ? ' (显示全部)' : '匹配选中日期'}`)
        console.log(`[ActivityPanel] 格式化后的日志:`, formattedLogs.slice(0, 3))
        setLogs(formattedLogs)
      } else {
        console.error("[ActivityPanel] 获取日志失败:", res.status, res.statusText)
      }
    } catch (error) {
      console.error("[ActivityPanel] 获取日志异常:", error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedDate, showAllLogs])

  // 初始加载和自动刷新
  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 10000) // 每10秒刷新一次
    return () => clearInterval(interval)
  }, [fetchLogs])

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-muted-foreground dark:text-muted-foreground font-medium">操作日志</h3>
        <button
          onClick={() => setShowAllLogs(!showAllLogs)}
          className="text-xs text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-300 transition-colors"
        >
          {showAllLogs ? "按日期筛选" : "显示全部"}
        </button>
      </div>
      <div className="text-xs text-muted-foreground mb-6">
        {showAllLogs ? "显示所有日志" : format(selectedDate, "yyyy年M月d日", { locale: zhCN })}
      </div>
      
      {/* Calendar Strip - 只在非"显示全部"模式下显示 */}
      {!showAllLogs && (
        <div className="flex justify-between mb-8 text-center">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate)
            const isToday = isSameDay(day, new Date())
            
            return (
              <div 
                key={day.toISOString()} 
                className={cn(
                  "flex flex-col gap-1 cursor-pointer transition-all hover:scale-110",
                  isSelected ? "text-foreground font-bold" : "text-muted-foreground"
                )}
                onClick={() => setSelectedDate(day)}
              >
                <span className="text-xs">{format(day, "d")}</span>
                <span className="text-[10px]">周{WEEKDAY_CN[day.getDay()]}</span>
                {isSelected && <div className="h-1 w-1 bg-primary rounded-full mx-auto mt-1" />}
                {!isSelected && isToday && <div className="h-1 w-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mt-1" />}
              </div>
            )
          })}
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-6 relative pl-4 border-l-2 border-dashed border-border dark:border-white/10 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {logs.map((log, index) => (
          <div key={log.id} className="relative pl-6 animate-in slide-in-from-bottom-2 fade-in duration-500" style={{ animationDelay: `${index * 100}ms` }}>
            <div className={cn(
              "absolute -left-[21px] top-1 h-3 w-3 rounded-full ring-4 ring-white dark:ring-slate-900 transition-colors",
              log.status === "success" ? "bg-slate-900 dark:bg-emerald-400" : 
              log.status === "warning" ? "bg-gray-300 dark:bg-yellow-400" : "bg-red-400"
            )} />
            <div className="text-xs text-muted-foreground font-mono mb-1">{log.time}</div>
            <div className={cn(
              "p-4 rounded-2xl rounded-tl-none transition-colors",
              log.status === "success" ? "bg-[#E0E7FF] dark:bg-indigo-500/20" : "bg-muted dark:bg-slate-800/50"
            )}>
              <div className={cn(
                "font-bold mb-1",
                log.status === "success" ? "text-[#4338CA] dark:text-indigo-300" : "text-gray-900 dark:text-gray-200"
              )}>
                {log.device}
              </div>
              <div className={cn(
                "text-sm",
                log.status === "success" ? "text-[#6366F1] dark:text-indigo-200/70" : "text-muted-foreground dark:text-muted-foreground"
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
          <div className="text-center py-8">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-muted-foreground">加载活动记录</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">无活动记录</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
