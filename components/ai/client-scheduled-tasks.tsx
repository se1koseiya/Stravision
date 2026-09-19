"use client"

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { clientScheduler, type ClientScheduledTask } from '@/lib/ai/client-scheduler'
import { toast } from 'sonner'
import { IconCalendar, IconCheckOne, IconCloseOne, IconDelete, IconRemind, IconTime } from "@/components/icon";

export function ClientScheduledTasks() {
  const [tasks, setTasks] = useState<ClientScheduledTask[]>([])
  const [notificationEnabled, setNotificationEnabled] = useState(false)

  useEffect(() => {
    // 初始加载
    loadTasks()

    // 每秒更新一次（用于显示倒计时）
    const interval = setInterval(loadTasks, 1000)

    // 检查通知权限
    checkNotificationPermission()

    return () => clearInterval(interval)
  }, [])

  const loadTasks = () => {
    const allTasks = clientScheduler.getAllTasks()
    setTasks(allTasks)
  }

  const checkNotificationPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationEnabled(Notification.permission === 'granted')
    }
  }

  const handleRequestNotification = async () => {
    const granted = await clientScheduler.requestNotificationPermission()
    setNotificationEnabled(granted)
    if (granted) {
      toast.success('通知权限已开启')
    } else {
      toast.error('通知权限被拒绝')
    }
  }

  const handleCancelTask = (taskId: string) => {
    const success = clientScheduler.cancelTask(taskId)
    if (success) {
      toast.success('任务已取消')
      loadTasks()
    }
  }

  const formatTimeRemaining = (scheduledTime: number) => {
    const now = Date.now()
    const diff = scheduledTime - now

    if (diff <= 0) return '即将执行'

    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}天 ${hours % 24}小时`
    if (hours > 0) return `${hours}小时 ${minutes % 60}分钟`
    if (minutes > 0) return `${minutes}分 ${seconds}秒`
    return `${seconds}秒`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <IconTime className="h-4 w-4 text-blue-500" />
      case 'completed':
        return <IconCheckOne className="h-4 w-4 text-green-500" />
      case 'cancelled':
        return <IconCloseOne className="h-4 w-4 text-muted-foreground" />
      default:
        return <IconTime className="h-4 w-4" />
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '等待执行',
      completed: '已完成',
      cancelled: '已取消'
    }
    return statusMap[status] || status
  }

  const pendingTasks = tasks.filter(t => t.status === 'pending')
  const completedTasks = tasks.filter(t => t.status !== 'pending')

  return (
    <div className="space-y-4">
      {/* 通知权限提示 */}
      {!notificationEnabled && pendingTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <IconRemind className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                开启通知提醒
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                允许浏览器通知，任务完成时会及时提醒您
              </p>
              <button
                onClick={handleRequestNotification}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                开启通知
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* 待执行任务 */}
      {pendingTasks.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
            <IconTime className="h-4 w-4" />
            待执行任务 ({pendingTasks.length})
          </h3>
          <div className="space-y-2">
            <AnimatePresence>
              {pendingTasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(task.status)}
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          {getStatusText(task.status)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white mb-2">
                        {task.description}
                      </p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                          <IconCalendar className="h-3 w-3" />
                          {formatTimeRemaining(task.scheduledTime)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                          {task.taskType}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCancelTask(task.id)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                      title="取消任务"
                    >
                      <IconDelete className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* 已完成任务 */}
      {completedTasks.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
            <IconCheckOne className="h-4 w-4" />
            历史记录 ({completedTasks.length})
          </h3>
          <div className="space-y-2">
            {completedTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-3 border border-zinc-100 dark:border-zinc-800"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(task.status)}
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {getStatusText(task.status)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                      {task.description}
                    </p>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                      {new Date(task.scheduledTime).toLocaleString('zh-CN')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {tasks.length === 0 && (
        <div className="text-center p-8 text-zinc-500 dark:text-zinc-400">
          <IconCalendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">暂无定时任务</p>
          <p className="text-xs mt-1">
            对 AI 说"5分钟后提醒我..."即可创建定时任务
          </p>
        </div>
      )}
    </div>
  )
}
