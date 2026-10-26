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
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h3 className="mon-group-title text-zinc-500 dark:text-zinc-400">操作日志</h3>
        <button
          onClick={() => setShowAllLogs(!showAllLogs)}
          className="dc-ctrl--press dc-ctrl--sm text-xs text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
        >
          {showAllLogs ? "按日期筛选" : "显示全部"}
        </button>
      </div>
      <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mb-4 shrink-0">
        {showAllLogs ? "显示所有日志" : format(selectedDate, "yyyy年M月d日", { locale: zhCN })}
      </div>
      
      {/* Calendar Strip - 只在非"显示全部"模式下显示 */}
      {!showAllLogs && (
        <div className="flex justify-between mb-5 text-center shrink-0">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate)
            const isToday = isSameDay(day, new Date())
            
            return (
              <div 
                key={day.toISOString()} 
                className={cn(
                  "dc-ctrl--press dc-ctrl--sm flex flex-col gap-1 cursor-pointer transition-colors",
                  isSelected ? "text-zinc-900 dark:text-zinc-100 font-bold" : "text-zinc-400 dark:text-zinc-500"
                )}
                onClick={() => setSelectedDate(day)}
              >
                <span className="text-xs">{format(day, "d")}</span>
                <span className="text-[11px]">周{WEEKDAY_CN[day.getDay()]}</span>
                {/* 选中/今天标记也是「元素」（1×1 点），不是填充块 */}
                {isSelected && <div className="h-1 w-1 bg-primary rounded-full mx-auto mt-1" />}
                {!isSelected && isToday && <div className="h-1 w-1 bg-zinc-300 dark:bg-zinc-600 rounded-full mx-auto mt-1" />}
              </div>
            )
          })}
        </div>
      )}

      {/* Timeline
          ——「一层容器」原则：日志每条**不再**是一张带填充色的圆角卡。
          以前是 卡片(32) → 日记卡(16, 靛蓝底) → 进度条，三层圆角矩形套在一起；
          现在改成一条 1px 竖 hairline + 状态圆点 + 三段文字层级（时间 / 设备 / 动作），
          状态只由圆点颜色承载 —— 这正是 HDS「用分隔线与字阶立层级、不用色块」的做法。
          另外：圆点不再用 ring 遮线（ring 是 box-shadow，在玻璃上会留一圈实心圆盘），
          1px 细线从圆点背后穿过本来就看不出来，不需要遮。 */}
      <div className="relative flex-1 overflow-y-auto pr-1 custom-scrollbar pl-4 min-h-0">
        <div className="absolute left-[3px] top-1.5 bottom-1.5 w-px bg-zinc-900/8 dark:bg-white/10" aria-hidden />
        <div className="space-y-5">
          {logs.map((log, index) => (
            <div
              key={log.id}
              className="relative animate-in fade-in duration-500"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <span className={cn(
                "absolute -left-4 top-[5px] h-[7px] w-[7px] rounded-full",
                log.status === "success" ? "bg-primary"
                  : log.status === "warning" ? "bg-amber-400"
                  : "bg-red-500"
              )} />
              <div className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 tabular-nums">{log.time}</div>
              <div className="mt-0.5 text-sm font-semibold text-zinc-800 dark:text-zinc-100 leading-snug">{log.device}</div>
              <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{log.action}</div>
            </div>
          ))}
        </div>
        {logs.length === 0 && (
          <div className="text-center py-8">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">加载活动记录</span>
              </div>
            ) : (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">无活动记录</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
