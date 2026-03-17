"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useDeviceControl } from "@/lib/hooks/use-device-control"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

type AlertType = 'temp_high' | 'humidity_high' | 'humidity_low' | 'co2_high' | 'light_low'

interface AlertConfig {
  type: AlertType
  title: string
  description: string
  actionLabel: string
  action: () => Promise<boolean>
}

interface ActiveAlert {
  id: string
  config: AlertConfig
  countdown: number
  loading: boolean
  expanded: boolean
  animationPhase: 'entering' | 'pill' | 'expanded' | 'exiting' // 动画阶段
}

const STORAGE_KEY = 'environment_alert_expirations'
const ALERT_COUNTDOWN = 10 // 10秒倒计时

// 从localStorage读取忽略设置
function getStoredExpirations(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // 清理已过期的条目
      const now = Date.now()
      const cleaned: Record<string, number> = {}
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'number' && value > now) {
          cleaned[key] = value
        }
      }
      return cleaned
    }
  } catch {}
  return {}
}

// 保存忽略设置到localStorage
function saveExpirations(expirations: Record<string, number>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expirations))
  } catch {}
}

// 清除所有忽略设置（用于profile页面重置）
export function clearAlertExpirations() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

// 获取当前被忽略的告警类型
export function getIgnoredAlerts(): { type: string; expiry: number }[] {
  const expirations = getStoredExpirations()
  const now = Date.now()
  return Object.entries(expirations)
    .filter(([_, expiry]) => expiry > now)
    .map(([type, expiry]) => ({ type, expiry }))
}

export function EnvironmentAlert() {
  const { deviceData } = useDeviceData()
  const { toggleRelay } = useDeviceControl()
  const pathname = usePathname()
  const [alertsEnabled, setAlertsEnabled] = useState(true)
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([])
  const alertExpirationsRef = useRef<Record<string, number>>(getStoredExpirations())
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // 倒计时逻辑
  useEffect(() => {
    if (activeAlerts.length === 0) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
      return
    }

    countdownIntervalRef.current = setInterval(() => {
      setActiveAlerts(prev => {
        const updated = prev.map(alert => ({
          ...alert,
          countdown: Math.max(0, alert.countdown - 1)
        })).filter(alert => alert.countdown > 0 || alert.loading)
        return updated
      })
    }, 1000)

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [activeAlerts.length])

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/auth/me")
        if (!res.ok) return
        const data = await res.json()
        if (data?.authenticated && data?.user?.notification_settings?.alerts !== undefined) {
          setAlertsEnabled(!!data.user.notification_settings.alerts)
        }
      } catch {}
    }

    if (pathname === "/" || pathname === "/login" || pathname === "/register") return
    fetchSettings()
    
    // 加载持久化的忽略设置
    alertExpirationsRef.current = getStoredExpirations()
  }, [pathname])

  const dismissAlert = useCallback((alertId: string) => {
    setActiveAlerts(prev => prev.filter(a => a.id !== alertId))
  }, [])

  const handleAction = useCallback(async (alertId: string, action: () => Promise<boolean>) => {
    setActiveAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, loading: true } : a
    ))
    
    try {
      const success = await action()
      if (success) {
        setActiveAlerts(prev => prev.filter(a => a.id !== alertId))
      } else {
        setActiveAlerts(prev => prev.map(a => 
          a.id === alertId ? { ...a, loading: false } : a
        ))
      }
    } catch {
      setActiveAlerts(prev => prev.map(a => 
        a.id === alertId ? { ...a, loading: false } : a
      ))
    }
  }, [])

  const handleIgnore = useCallback((alertType: AlertType, duration: number) => {
    const expiry = duration === Infinity ? Date.now() + 365 * 24 * 60 * 60 * 1000 : Date.now() + duration
    alertExpirationsRef.current[alertType] = expiry
    saveExpirations(alertExpirationsRef.current)
    setActiveAlerts(prev => prev.filter(a => a.config.type !== alertType))
  }, [])

  const toggleExpanded = useCallback((alertId: string) => {
    setActiveAlerts(prev => prev.map(a => 
      a.id === alertId ? { 
        ...a, 
        expanded: !a.expanded,
        animationPhase: !a.expanded ? 'expanded' : 'pill'
      } : a
    ))
  }, [])

  useEffect(() => {
    if (pathname === '/' || pathname === '/login' || pathname === '/register' || !deviceData || !alertsEnabled) return

    const checkAndTrigger = (condition: boolean, config: AlertConfig) => {
      const now = Date.now()
      const expiryTime = alertExpirationsRef.current[config.type] || 0

      if (condition && now > expiryTime) {
        // 检查是否已经有相同类型的告警在显示
        const existing = activeAlerts.find(a => a.config.type === config.type)
        if (existing) return false

        // 设置短暂冷却防止重复触发
        alertExpirationsRef.current[config.type] = now + 60 * 1000
        
        const alertId = `${config.type}-${now}`
        const newAlert: ActiveAlert = {
          id: alertId,
          config,
          countdown: ALERT_COUNTDOWN,
          loading: false,
          expanded: false,
          animationPhase: 'entering'
        }
        setActiveAlerts(prev => [...prev, newAlert])
        
        // 动画序列：entering -> pill
        setTimeout(() => {
          setActiveAlerts(prev => prev.map(a => 
            a.id === alertId ? { ...a, animationPhase: 'pill' } : a
          ))
        }, 150)
        
        return true
      }
      return false
    }

    // Temperature High (> 30) -> Turn on Fan (Relay 6)
    if (checkAndTrigger(
      deviceData.temperature > 30 && deviceData.relay6 === 0,
      {
        type: 'temp_high',
        title: '高温预警',
        description: `当前温度 ${deviceData.temperature}°C 过高`,
        actionLabel: '开启风扇',
        action: () => toggleRelay(6, 0)
      }
    )) return

    // Humidity High (> 80) -> Turn on Fan (Relay 6)
    if (checkAndTrigger(
      deviceData.humidity > 80 && deviceData.relay6 === 0,
      {
        type: 'humidity_high',
        title: '高湿预警',
        description: `当前湿度 ${deviceData.humidity}% 过高`,
        actionLabel: '开启风扇',
        action: () => toggleRelay(6, 0)
      }
    )) return

    // CO2 High (> 1000) -> Turn on Fan (Relay 6)
    if (checkAndTrigger(
      deviceData.co2 > 1000 && deviceData.relay6 === 0,
      {
        type: 'co2_high',
        title: 'CO2浓度预警',
        description: `当前CO2浓度 ${deviceData.co2}ppm 过高`,
        actionLabel: '开启风扇',
        action: () => toggleRelay(6, 0)
      }
    )) return

    // Light Low (< 1000) -> Turn on Grow Light (Relay 7)
    if (checkAndTrigger(
      deviceData.light < 1000 && deviceData.relay7 === 0,
      {
        type: 'light_low',
        title: '光照不足预警',
        description: `当前光照 ${deviceData.light} Lux 不足`,
        actionLabel: '开启补光灯',
        action: () => toggleRelay(7, 0)
      }
    )) return

  }, [deviceData, toggleRelay, alertsEnabled, pathname, activeAlerts])

  if (activeAlerts.length === 0) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2">
      {activeAlerts.map(alert => {
        const isEntering = alert.animationPhase === 'entering'
        const isPill = alert.animationPhase === 'pill'
        const isExpanded = alert.animationPhase === 'expanded' || alert.expanded
        
        return (
          <div 
            key={alert.id}
            onClick={() => toggleExpanded(alert.id)}
            style={{
              width: isEntering ? 40 : (isExpanded ? 400 : 200),
              height: isEntering ? 40 : 'auto',
              minHeight: isEntering ? 40 : 44,
              borderRadius: isEntering ? 20 : (isExpanded ? 24 : 22),
              transform: isEntering ? 'translateY(-20px)' : 'translateY(0)',
              opacity: isEntering ? 0.8 : 1,
              transition: `
                all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
                width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                border-radius 0.3s ease
              `,
            }}
            className={cn(
              "pointer-events-auto bg-black cursor-pointer overflow-hidden",
              "shadow-[0_8px_32px_rgba(0,0,0,0.3)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
              "border border-white/10 dark:border-white/5"
            )}
          >
            {/* 进入动画时的小圆点 */}
            <div 
              style={{
                opacity: isEntering ? 1 : 0,
                height: isEntering ? 40 : 0,
                transition: 'opacity 0.2s ease, height 0.2s ease',
              }}
              className="flex items-center justify-center"
            >
              <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
            </div>

            {/* 收缩状态（胶囊） */}
            <div 
              style={{
                height: (!isEntering && !isExpanded) ? 44 : 0,
                opacity: (!isEntering && !isExpanded) ? 1 : 0,
                padding: (!isEntering && !isExpanded) ? '0 12px' : '0 12px',
                transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
              className="flex items-center gap-3 overflow-hidden"
            >
              {/* 倒计时圆环 */}
              <div className="relative size-8 shrink-0">
                <svg className="size-8 -rotate-90" viewBox="0 0 32 32">
                  <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
                  <circle
                    cx="16" cy="16" r="13" fill="none" stroke="#f59e0b" strokeWidth="2.5"
                    strokeLinecap="round" strokeDasharray={2 * Math.PI * 13}
                    strokeDashoffset={2 * Math.PI * 13 * (1 - alert.countdown / ALERT_COUNTDOWN)}
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-amber-400">
                  {alert.countdown}
                </span>
              </div>
              {/* 标题 */}
              <span className="text-white text-sm font-medium truncate flex-1">{alert.config.title}</span>
            </div>

            {/* 展开状态 */}
            <div 
              style={{
                maxHeight: isExpanded ? 250 : 0,
                opacity: isExpanded ? 1 : 0,
                padding: isExpanded ? 16 : 0,
                transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
              className="overflow-hidden"
            >
              <div className="flex items-start gap-4">
                {/* 大倒计时圆环 */}
                <div className="relative size-14 shrink-0">
                  <svg className="size-14 -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                    <circle
                      cx="28" cy="28" r="24" fill="none" stroke="#f59e0b" strokeWidth="4"
                      strokeLinecap="round" strokeDasharray={2 * Math.PI * 24}
                      strokeDashoffset={2 * Math.PI * 24 * (1 - alert.countdown / ALERT_COUNTDOWN)}
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-amber-400">
                    {alert.countdown}s
                  </span>
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0 pt-1">
                  <h3 className="font-semibold text-white text-base">{alert.config.title}</h3>
                  <p className="text-sm text-gray-400 mt-1">{alert.config.description}</p>
                </div>

                {/* 操作按钮 */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleAction(alert.id, alert.config.action); }}
                  disabled={alert.loading}
                  className={cn(
                    "px-4 py-2 rounded-full font-medium text-sm transition-all shrink-0",
                    alert.loading 
                      ? "bg-gray-700 text-gray-400 cursor-wait"
                      : "bg-amber-500 text-black hover:bg-amber-400"
                  )}
                >
                  {alert.loading ? "执行中..." : alert.config.actionLabel}
                </button>

                {/* 关闭按钮 */}
                <button
                  onClick={(e) => { e.stopPropagation(); dismissAlert(alert.id); }}
                  className="p-1.5 rounded-full text-gray-500 hover:text-white hover:bg-white/10 transition-colors shrink-0 -mt-1"
                >
                  <X size={16} />
                </button>
              </div>

              {/* 忽略选项 */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
                <span className="text-xs text-gray-500">忽略:</span>
                {[
                  { label: '1小时', duration: 60 * 60 * 1000 },
                  { label: '4小时', duration: 4 * 60 * 60 * 1000 },
                  { label: '24小时', duration: 24 * 60 * 60 * 1000 },
                  { label: '永久', duration: Infinity },
                ].map(opt => (
                  <button
                    key={opt.label}
                    onClick={(e) => { e.stopPropagation(); handleIgnore(alert.config.type, opt.duration); }}
                    className="px-2.5 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
