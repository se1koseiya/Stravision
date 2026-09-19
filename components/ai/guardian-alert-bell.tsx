"use client"

import { useEffect, useState, useCallback } from "react"
import { Badge, Dropdown } from "antd"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { IconCheck, IconCheckOne, IconClose, IconCloseWifi, IconDatabaseNetwork, IconRemind } from "@/components/icon";

/**
 * 环境告警铃铛
 *
 * 面板视觉对齐 dynamic-model-selector（飞书式克制风）：
 * - 白底 + 细边框 + 一层轻阴影，rounded-lg
 * - 每条：severity 圆点 + 标题 + 正文，hover 才浮现操作（GitHub 通知式）
 * - 无色条、无填充 chip、无常驻按钮 —— 彩色只保留圆点一个焦点
 *
 * - 自动轮询（30s），每条可"已读" / "忽略"
 */

interface GuardianAlert {
  id: number
  severity: 'critical' | 'warning' | 'info'
  category: 'environment' | 'device' | 'disease' | 'prediction'
  title: string
  message: string
  recommendation?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 传感器快照为动态键值
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

function timeAgo(ts?: string): string {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  return `${Math.floor(diff / 86_400_000)} 天前`
}

const DOT_CLASS: Record<GuardianAlert['severity'], string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-zinc-300 dark:bg-zinc-600',
}

interface GuardianAlertBellProps {
  className?: string
  compact?: boolean
}

export function GuardianAlertBell({ className, compact = true }: GuardianAlertBellProps) {
  // 深色模式下 hover/open 底色要用低透明白，否则 rgba(0,0,0,.05) 在深底上等于"没反应"
  const { resolvedTheme } = useTheme()
  const darkHost = resolvedTheme === "dark"

  const [alerts, setAlerts] = useState<GuardianAlert[]>([])
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatusInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 异步拉取，setState 在 fetch 回调内非同步执行
    fetchAlerts()
    const timer = setInterval(fetchAlerts, 30_000)
    return () => clearInterval(timer)
  }, [fetchAlerts])

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

  const statusText =
    unreadCount > 0 ? `${unreadCount} 条未读`
    : deviceStatus?.status === 'offline' ? '设备离线'
    : deviceStatus?.status === 'no_data' ? '无数据'
    : deviceStatus?.status === 'online' ? '环境正常'
    : '—'

  const panel = (
    <div className="w-[380px] max-w-[92vw] rounded-lg border border-gray-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 shadow-[0_8px_28px_rgba(0,0,0,0.10)] overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 h-11 border-b border-gray-100 dark:border-zinc-800">
        <span className="text-[13px] font-medium text-gray-900 dark:text-zinc-100">环境告警</span>
        <span className="text-[12px] tabular-nums text-gray-400 dark:text-zinc-500">{statusText}</span>
      </div>

      {/* 列表 */}
      <div className="max-h-[380px] overflow-y-auto">
        {loading && alerts.length === 0 ? (
          <div className="py-10 text-center text-[12px] text-gray-400 dark:text-zinc-500">加载中…</div>
        ) : alerts.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-2">
            {deviceStatus?.status === 'offline' ? (
              <IconCloseWifi className="w-5 h-5 text-gray-300 dark:text-zinc-600" strokeWidth={1.5} />
            ) : deviceStatus?.status === 'no_data' ? (
              <IconDatabaseNetwork className="w-5 h-5 text-gray-300 dark:text-zinc-600" strokeWidth={1.5} />
            ) : (
              <IconCheckOne className="w-5 h-5 text-gray-300 dark:text-zinc-600" strokeWidth={1.5} />
            )}
            <p className="text-[12px] text-gray-400 dark:text-zinc-500">
              {deviceStatus?.status === 'offline'
                ? `设备离线，无法获取环境数据${deviceStatus.staleMinutes ? `（${deviceStatus.staleMinutes} 分钟前）` : ''}`
                : deviceStatus?.status === 'no_data'
                  ? '暂无传感器数据'
                  : deviceStatus?.status === 'online'
                    ? '环境指标均在适宜范围内'
                    : '暂未检测到异常'}
            </p>
          </div>
        ) : (
          alerts.map(a => (
            <div
              key={a.id}
              className="group relative flex gap-3 px-4 py-3 border-b border-gray-100/80 dark:border-zinc-800/60 last:border-b-0 hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors"
            >
              {/* severity 圆点：唯一的彩色元素 */}
              <span className={cn('w-1.5 h-1.5 rounded-full mt-[6px] shrink-0', DOT_CLASS[a.severity] || DOT_CLASS.warning)} />

              <div className="flex-1 min-w-0">
                {/* 标题 + 时间（hover 时时间让位给操作按钮） */}
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[13px] font-medium leading-[22px] text-gray-800 dark:text-zinc-200 truncate">
                    {a.title}
                  </span>
                  <span className="shrink-0 text-[11px] leading-[22px] tabular-nums text-gray-400 dark:text-zinc-500 group-hover:opacity-0 transition-opacity">
                    {timeAgo(a.created_at)}
                  </span>
                  {/* hover 操作：已读 / 忽略 */}
                  <span className="absolute right-3 top-2.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      title="标记已读"
                      onClick={() => markRead(a.id)}
                      className="p-1 rounded text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-gray-200/70 dark:hover:bg-zinc-700/70 transition-colors"
                    >
                      <IconCheck className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                    <button
                      title="忽略"
                      onClick={() => dismiss(a.id)}
                      className="p-1 rounded text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-gray-200/70 dark:hover:bg-zinc-700/70 transition-colors"
                    >
                      <IconClose className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  </span>
                </div>

                {/* 正文 */}
                <p className="mt-0.5 text-[12px] leading-[20px] text-gray-500 dark:text-zinc-400 line-clamp-2">
                  {a.message}
                </p>

                {/* 建议 */}
                {a.recommendation && (
                  <p className="mt-1 text-[12px] leading-[20px] text-gray-500 dark:text-zinc-400">
                    <span className="text-gray-400 dark:text-zinc-500">建议 · </span>
                    {a.recommendation}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 底部 */}
      {alerts.length > 0 && (
        <button
          onClick={async () => {
            setLoading(true)
            await Promise.all(alerts.map(a => markRead(a.id)))
            setLoading(false)
          }}
          className="w-full h-9 text-[12px] text-gray-500 dark:text-zinc-400 border-t border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/60 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors"
        >
          全部标记已读
        </button>
      )}
    </div>
  )

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      dropdownRender={() => panel}
      trigger={['click']}
      placement="bottomRight"
    >
      <button
        onClick={() => { if (!open) fetchAlerts() }}
        className={cn(
          // 28px 点击区 + 8px 圆角：与顶栏「返回工作台」、侧栏头部两个图标按钮完全同规格。
          // 此前用 `padding: 4` 包裹图标 —— padding-box 而非固定盒，视觉小一圈，
          // 且 hover 底色的圆角/面积都与其他按钮不一致（用户 2026-09-19 截图反馈）。
          'inline-flex items-center justify-center size-7 rounded-lg border-none cursor-pointer',
          'transition-colors duration-150',
          className
        )}
        title="环境告警"
        aria-label="环境告警"
        style={{
          background: open ? (darkHost ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)') : 'transparent',
          padding: compact ? 0 : '0 10px',
          gap: 6,
        }}
      >
        <Badge
          count={unreadCount}
          size="small"
          overflowCount={99}
          color={criticalCount > 0 ? '#ef4444' : '#a1a1aa'}
          offset={[2, -2]}
        >
          {/* strokeWidth 必须与顶栏 house/plus 一致：项目规范是 16px 用 2（=1.33px 视觉线宽）。
              原来写 1.75 → 1.17px，比 house 细了 12%，并排看"一粗一细"。 */}
          <IconRemind size={16} strokeWidth={2} className="text-gray-500 dark:text-zinc-400" />
        </Badge>
        {!compact && <span className="text-[12px]">告警</span>}
      </button>
    </Dropdown>
  )
}