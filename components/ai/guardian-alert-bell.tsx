"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Bell, Thermometer, Plug, Leaf, TrendingUp, Lightbulb, CheckCircle2, WifiOff, Database } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * AI 主动守护通知铃铛
 *
 * - 顶部铃铛图标 + 未读计数
 * - 点击展开通知列表（severity 颜色分级）
 * - 每条通知可"已读" / "忽略"
 * - 自动轮询（30s）
 */

interface GuardianAlert {
  id: number
  severity: 'critical' | 'warning' | 'info'
  category: 'environment' | 'device' | 'disease' | 'prediction'
  title: string
  message: string
  recommendation?: string
  data_snapshot?: Record<string, any>
  created_at?: string
  read: boolean
  dismissed: boolean
}

interface DeviceStatusInfo {
  status: 'online' | 'offline' | 'no_data'
  lastSeenAt: number | null
  staleMinutes: number | null
}

const severityStyles: Record<string, { dot: string; chip: string; row: string; label: string }> = {
  critical: {
    dot: 'bg-red-500',
    chip: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
    row: 'border-l-2 border-red-500',
    label: '紧急',
  },
  warning: {
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    row: 'border-l-2 border-amber-500',
    label: '预警',
  },
  info: {
    dot: 'bg-sky-500',
    chip: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900',
    row: 'border-l-2 border-sky-500',
    label: '提示',
  },
}

const categoryIconMap: Record<string, typeof Bell> = {
  environment: Thermometer,
  device: Plug,
  disease: Leaf,
  prediction: TrendingUp,
}

function timeAgo(ts?: string): string {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  return `${Math.floor(diff / 86_400_000)} 天前`
}

/**
 * 空状态三态渲染（alerts.length === 0 时）
 * - online：设备在线且无异常 → "环境指标均在适宜范围内"
 * - offline：设备离线 → "设备离线，最后数据：X分钟前"（不再误报"正常"）
 * - no_data：从未收到数据 → "暂无传感器数据"
 * - null（API 降级/加载中）：中性文案，不暗示环境正常
 */
function renderEmptyState(deviceStatus: DeviceStatusInfo | null) {
  if (deviceStatus?.status === 'offline') {
    const mins = deviceStatus.staleMinutes ?? 0
    const lastText = mins > 0 ? `，最后数据：${mins} 分钟前` : ''
    return (
      <div className="px-3 py-8 text-center text-xs text-amber-600 dark:text-amber-400">
        <WifiOff size={24} strokeWidth={1.5} className="mx-auto mb-1.5 text-amber-500" />
        设备离线，无法获取环境数据{lastText}
      </div>
    )
  }
  if (deviceStatus?.status === 'no_data') {
    return (
      <div className="px-3 py-8 text-center text-xs text-zinc-500">
        <Database size={24} strokeWidth={1.5} className="mx-auto mb-1.5 text-zinc-400" />
        暂无传感器数据
      </div>
    )
  }
  if (deviceStatus?.status === 'online') {
    return (
      <div className="px-3 py-8 text-center text-xs text-zinc-500">
        <CheckCircle2 size={24} strokeWidth={1.5} className="mx-auto mb-1.5 text-zinc-400" />
        当前环境指标均在适宜范围内
      </div>
    )
  }
  // deviceStatus 为 null：API 降级或加载中，用中性文案避免误导
  return (
    <div className="px-3 py-8 text-center text-xs text-zinc-500">
      <CheckCircle2 size={24} strokeWidth={1.5} className="mx-auto mb-1.5 text-zinc-400" />
      暂未检测到异常
    </div>
  )
}

interface GuardianAlertBellProps {
  className?: string
  /** 紧凑模式：仅图标 + 角标，点击下拉；默认 true */
  compact?: boolean
}

export function GuardianAlertBell({ className, compact = true }: GuardianAlertBellProps) {
  const [alerts, setAlerts] = useState<GuardianAlert[]>([])
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatusInfo | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/guardian-alerts?limit=20', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setAlerts(data.alerts || [])
      setDeviceStatus(data.deviceStatus ?? null)
    } catch {
      // 静默失败，不打扰用户
    }
  }, [])

  // 初次加载 + 30s 轮询
  useEffect(() => {
    fetchAlerts()
    const timer = setInterval(fetchAlerts, 30_000)
    return () => clearInterval(timer)
  }, [fetchAlerts])

  // 点击外部关闭
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const markRead = useCallback(async (id: number) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
    try {
      await fetch(`/api/ai/guardian-alerts?id=${id}`, { method: 'PATCH' })
    } catch {
      // 静默
    }
  }, [])

  const dismiss = useCallback(async (id: number) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
    try {
      await fetch(`/api/ai/guardian-alerts?id=${id}&action=dismiss`, { method: 'POST' })
    } catch {
      // 静默
    }
  }, [])

  const unreadCount = alerts.length
  const criticalCount = alerts.filter(a => a.severity === 'critical').length

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        onClick={() => { setOpen(v => !v); if (!open) fetchAlerts() }}
        className={cn(
          "relative inline-flex items-center justify-center rounded-lg transition-colors",
          compact ? "size-8 hover:bg-zinc-100 dark:hover:bg-zinc-800" : "h-8 px-3 gap-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800",
          open && "bg-zinc-100 dark:bg-zinc-800"
        )}
        title="AI 守护通知"
        aria-label="AI 守护通知"
      >
        <Bell size={16} strokeWidth={1.75} className="text-zinc-600 dark:text-zinc-300" />
        {!compact && <span className="text-xs font-normal">守护</span>}
        {unreadCount > 0 && (
          <span className={cn(
            "absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-medium flex items-center justify-center text-white",
            criticalCount > 0 ? "bg-red-500" : "bg-zinc-500"
          )}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={cn(
          "absolute right-0 top-full mt-1 w-[340px] max-h-[460px] flex flex-col rounded-xl border bg-white dark:bg-zinc-900 z-50",
          "border-zinc-200 dark:border-zinc-800 shadow-sm"
        )}>
          {/* 头部 */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
            <div className="text-sm font-medium">AI 守护通知</div>
            <div className="text-[11px] text-zinc-500">
              {unreadCount > 0
                ? `${unreadCount} 条未读`
                : deviceStatus?.status === 'offline'
                  ? '设备离线'
                  : deviceStatus?.status === 'no_data'
                    ? '无数据'
                    : deviceStatus?.status === 'online'
                      ? '环境正常'
                      : '—'}
            </div>
          </div>

          {/* 列表 */}
          <div className="flex-1 overflow-y-auto">
            {loading && alerts.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-zinc-500">加载中...</div>
            ) : alerts.length === 0 ? (
              renderEmptyState(deviceStatus)
            ) : (
              <div className="py-1">
                {alerts.map(a => {
                  const style = severityStyles[a.severity] || severityStyles.warning
                  const CategoryIcon = categoryIconMap[a.category] || Bell
                  return (
                    <div key={a.id} className={cn("px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50", style.row)}>
                      <div className="flex items-start gap-2">
                        <CategoryIcon size={14} strokeWidth={1.75} className="text-zinc-500 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", style.chip)}>
                              {style.label}
                            </span>
                            <span className="text-xs font-medium truncate">{a.title}</span>
                          </div>
                          <div className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            {a.message}
                          </div>
                          {a.recommendation && (
                            <div className="mt-1 flex items-start gap-1 text-[11px] text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/60 rounded px-1.5 py-1">
                              <Lightbulb size={11} strokeWidth={1.75} className="text-amber-500 mt-0.5 shrink-0" />
                              <span>{a.recommendation}</span>
                            </div>
                          )}
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-[10px] text-zinc-400">{timeAgo(a.created_at)}</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => markRead(a.id)}
                                className="text-[10px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 px-1.5 py-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700"
                              >
                                已读
                              </button>
                              <button
                                onClick={() => dismiss(a.id)}
                                className="text-[10px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 px-1.5 py-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700"
                              >
                                忽略
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 底部 */}
          {alerts.length > 0 && (
            <div className="border-t border-zinc-100 dark:border-zinc-800 px-3 py-1.5 text-center">
              <button
                onClick={async () => {
                  setLoading(true)
                  await Promise.all(alerts.map(a => markRead(a.id)))
                  setLoading(false)
                }}
                className="text-[11px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                全部标记已读
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
