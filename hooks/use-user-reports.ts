"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

export interface RemoteSpaceReport {
  id: number
  user_id: number
  source: string
  source_id: string | null
  title: string
  html: string
  summary: string | null
  type: string
  is_favorite: 0 | 1
  created_at: number
}

export interface LocalSpaceReport {
  id: string
  title: string
  type: string
  timestamp: number
  html?: string
  favorite?: boolean
  source?: string
  remoteId?: number
}

/**
 * "我的空间" 报告管理 hook
 *
 * - 启动时调用 GET /api/reports 拉取当前用户全部报告
 * - 暴露 saveReport / deleteReport / toggleFavorite / refresh 四个动作
 * - 订阅 /api/user-events/stream SSE，收到 new_report 时：
 *    1) 自动追加到列表
 *    2) 用 sonner toast 通知用户
 *    3) 触发 onNewReport 回调（用于角标 / 弹窗）
 *
 * 注意：保留了从 localStorage 加载的 fallback 路径，便于未登录或 API 异常时降级。
 */
export function useUserReports(options?: {
  /** 新报告到达时触发，可用于高亮角标 / 自动打开面板 */
  onNewReport?: (report: LocalSpaceReport) => void
  /** 是否启用 SSE 订阅（多面板实例时只让一个监听即可） */
  enableSSE?: boolean
}) {
  const { onNewReport, enableSSE = true } = options || {}
  const [reports, setReports] = useState<LocalSpaceReport[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const lastEventRef = useRef<{ ts: number }>({ ts: 0 })

  // 把后端 RemoteSpaceReport 转为前端用的 LocalSpaceReport
  const fromRemote = useCallback((r: RemoteSpaceReport): LocalSpaceReport => ({
    id: `r-${r.id}`,
    remoteId: r.id,
    title: r.title,
    type: r.type || "report",
    timestamp: r.created_at,
    html: r.html,
    favorite: r.is_favorite === 1,
    source: r.source
  }), [])

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/reports?limit=50", { credentials: "include" })
      if (!res.ok) {
        if (res.status === 401) {
          // 未登录 → 不提示错误
          setReports([])
          return
        }
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json()
      const items: RemoteSpaceReport[] = Array.isArray(data?.items) ? data.items : []
      setReports(items.map(fromRemote))
      const serverTime = typeof data?.serverTime === "number" ? data.serverTime : Date.now()
      lastEventRef.current.ts = serverTime
    } catch (e) {
      console.warn("[useUserReports] refresh failed:", e)
    } finally {
      setLoading(false)
    }
  }, [fromRemote])

  // 启动时拉一次
  useEffect(() => {
    refresh()
  }, [refresh])

  // SSE 订阅
  useEffect(() => {
    if (!enableSSE) return
    if (typeof window === "undefined") return

    let es: EventSource | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let retryDelay = 2000
    let cancelled = false

    const connect = () => {
      if (cancelled) return
      try {
        es = new EventSource("/api/user-events/stream", { withCredentials: true } as any)
      } catch (e) {
        console.warn("[useUserReports] EventSource create failed:", e)
        scheduleRetry()
        return
      }
      es.onopen = () => {
        setConnected(true)
        retryDelay = 2000
      }
      es.onerror = () => {
        setConnected(false)
        if (es) {
          try { es.close() } catch {}
          es = null
        }
        scheduleRetry()
      }
      es.onmessage = (ev) => {
        if (!ev.data) return
        try {
          const payload = JSON.parse(ev.data)
          if (payload?.type === "ready") {
            setConnected(true)
            return
          }
          if (payload?.type === "new_report" && payload.report) {
            // 乐观追加（避免 await 拉详情），再异步校正
            const stub: LocalSpaceReport = {
              id: `r-${payload.report.id}`,
              remoteId: payload.report.id,
              title: payload.report.title || "新简报",
              type: payload.report.type || "report",
              timestamp: payload.report.created_at || Date.now(),
              html: undefined,
              favorite: false,
              source: payload.report.source || "scheduled_task"
            }
            setReports((prev) => {
              if (prev.some((p) => p.remoteId === stub.remoteId)) return prev
              return [stub, ...prev].slice(0, 50)
            })
            toast.success("📥 新的简报已生成", {
              description: stub.title,
              duration: 6000,
              action: {
                label: "查看",
                onClick: () => {
                  try {
                    window.dispatchEvent(new CustomEvent("user-report:focus", { detail: { id: stub.id } }))
                  } catch {}
                }
              }
            })
            try { onNewReport?.(stub) } catch {}
            // 拉详情以补全 html
            fetch(`/api/reports?limit=50`, { credentials: "include" })
              .then((r) => r.ok ? r.json() : null)
              .then((data) => {
                if (!data) return
                const items: RemoteSpaceReport[] = Array.isArray(data?.items) ? data.items : []
                setReports(items.map(fromRemote))
              })
              .catch(() => {})
          }
        } catch (e) {
          // 忽略非 JSON / 心跳注释行
        }
      }
    }

    const scheduleRetry = () => {
      if (cancelled) return
      if (retryTimer) return
      retryTimer = setTimeout(() => {
        retryTimer = null
        retryDelay = Math.min(retryDelay * 2, 30_000)
        connect()
      }, retryDelay)
    }

    connect()

    return () => {
      cancelled = true
      if (retryTimer) {
        clearTimeout(retryTimer)
        retryTimer = null
      }
      if (es) {
        try { es.close() } catch {}
        es = null
      }
    }
  }, [enableSSE, fromRemote, onNewReport])

  const saveReport = useCallback(async (input: {
    title: string
    html: string
    summary?: string
    source?: string
    type?: string
    sourceId?: string
  }): Promise<boolean> => {
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      })
      if (!res.ok) {
        if (res.status === 401) {
          toast.info("请先登录后再保存到我的空间")
          return false
        }
        const data = await res.json().catch(() => ({}))
        toast.error(`保存失败：${data?.error || res.statusText}`)
        return false
      }
      const data = await res.json()
      const newId = data?.id as number | undefined
      if (newId) {
        const local: LocalSpaceReport = {
          id: `r-${newId}`,
          remoteId: newId,
          title: input.title,
          type: input.type || "report",
          timestamp: Date.now(),
          html: input.html,
          favorite: false,
          source: input.source || "manual"
        }
        setReports((prev) => {
          if (prev.some((p) => p.remoteId === newId)) return prev
          return [local, ...prev].slice(0, 50)
        })
        toast.success("已保存到我的空间")
      }
      return true
    } catch (e) {
      console.error("[useUserReports] save failed:", e)
      toast.error("保存失败，请稍后重试")
      return false
    }
  }, [])

  const deleteReport = useCallback(async (localId: string): Promise<boolean> => {
    const target = reports.find((r) => r.id === localId)
    if (!target?.remoteId) {
      // 仅有本地缓存的，乐观删除
      setReports((prev) => prev.filter((r) => r.id !== localId))
      return true
    }
    try {
      const res = await fetch(`/api/reports?id=${target.remoteId}`, {
        method: "DELETE",
        credentials: "include"
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(`删除失败：${data?.error || res.statusText}`)
        return false
      }
      setReports((prev) => prev.filter((r) => r.id !== localId))
      return true
    } catch (e) {
      console.error("[useUserReports] delete failed:", e)
      toast.error("删除失败，请稍后重试")
      return false
    }
  }, [reports])

  const toggleFavorite = useCallback(async (localId: string): Promise<void> => {
    const target = reports.find((r) => r.id === localId)
    if (!target?.remoteId) return
    const nextFav = !target.favorite
    // 乐观更新
    setReports((prev) => prev.map((r) => r.id === localId ? { ...r, favorite: nextFav } : r))
    try {
      const res = await fetch("/api/reports", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: target.remoteId, favorite: nextFav })
      })
      if (!res.ok) {
        // 回滚
        setReports((prev) => prev.map((r) => r.id === localId ? { ...r, favorite: !nextFav } : r))
      }
    } catch {
      setReports((prev) => prev.map((r) => r.id === localId ? { ...r, favorite: !nextFav } : r))
    }
  }, [reports])

  return {
    reports,
    loading,
    connected,
    refresh,
    saveReport,
    deleteReport,
    toggleFavorite
  }
}
