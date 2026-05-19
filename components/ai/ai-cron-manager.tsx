"use client"

import { useState, useEffect } from 'react'
import { Clock, CheckCircle2, XCircle, Loader2, Trash2, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface AICronJob {
  id: number
  task_type: string
  task_description: string
  scheduled_time: number
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  result?: string
  created_at: number
  executed_at?: number
}

export function AICronManager() {
  const [jobs, setJobs] = useState<AICronJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadJobs()
    // 每30秒刷新一次
    const interval = setInterval(loadJobs, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadJobs = async () => {
    try {
      const res = await fetch('/api/ai/cron')
      if (res.ok) {
        const data = await res.json()
        setJobs(data.jobs || [])
      }
    } catch (error) {
      console.error('Failed to load cron jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const cancelJob = async (jobId: number) => {
    try {
      const res = await fetch(`/api/ai/cron?jobId=${jobId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        loadJobs()
      }
    } catch (error) {
      console.error('Failed to cancel job:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-muted-foreground" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '等待执行',
      running: '执行中',
      completed: '已完成',
      failed: '失败',
      cancelled: '已取消'
    }
    return statusMap[status] || status
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = timestamp - now.getTime()

    if (diff > 0) {
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(minutes / 60)
      const days = Math.floor(hours / 24)

      if (days > 0) return `${days}天后`
      if (hours > 0) return `${hours}小时后`
      if (minutes > 0) return `${minutes}分钟后`
      return '即将执行'
    }

    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const pendingJobs = jobs.filter(j => j.status === 'pending')
  const completedJobs = jobs.filter(j => j.status === 'completed' || j.status === 'failed' || j.status === 'cancelled')

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center p-8 text-zinc-500 dark:text-zinc-400">
        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">暂无定时任务</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 待执行任务 */}
      {pendingJobs.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            待执行任务 ({pendingJobs.length})
          </h3>
          <div className="space-y-2">
            <AnimatePresence>
              {pendingJobs.map((job) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(job.status)}
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          {getStatusText(job.status)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
                        {job.task_description}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatTime(job.scheduled_time)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                          {job.task_type}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => cancelJob(job.id)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                      title="取消任务"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* 已完成任务 */}
      {completedJobs.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            历史记录 ({completedJobs.length})
          </h3>
          <div className="space-y-2">
            {completedJobs.slice(0, 5).map((job) => (
              <div
                key={job.id}
                className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-3 border border-zinc-100 dark:border-zinc-800"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(job.status)}
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {getStatusText(job.status)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                      {job.task_description}
                    </p>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                      {job.executed_at ? formatTime(job.executed_at) : formatTime(job.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
