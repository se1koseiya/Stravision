"use client"

import { useEffect, useState } from "react"
import { Empty, theme, Switch, Dropdown, App } from "antd"
import type { MenuProps } from "antd"
import { ManualTaskCreateModal } from "@/components/ai/manual-task-create-modal"
import { DEVICE_IDS } from "@/lib/constants"
import { IconDelete, IconLoading, IconMore, IconPencil, IconPlay, IconTime } from "@/components/icon";

export interface ScheduledTask {
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

interface ScheduledTasksListProps {
  /** 删除任务后回调（用于刷新外部状态） */
  onTasksChange?: () => void
  /** 外部传入的任务列表（如已加载则不再重复请求） */
  tasks?: ScheduledTask[]
  /** 加载状态（外部传入时使用） */
  loading?: boolean
}

const safeParseParams = (params?: string | null): any => {
  if (!params) return {}
  try {
    return typeof params === "string" ? JSON.parse(params) : params
  } catch {
    return {}
  }
}

const DEVICE_NAMES: Record<number, string> = {
  [DEVICE_IDS.PUMP]: "灌溉水泵",
  [DEVICE_IDS.FAN]: "通风风扇",
  [DEVICE_IDS.RGB_LIGHT]: "补光灯",
  [DEVICE_IDS.WHITE_LIGHT]: "白光灯",
}

const getDeviceName = (id?: number) => (id != null ? DEVICE_NAMES[id] || `设备 ${id}` : "")

const formatTimeShort = (timestamp?: number | null) => {
  if (timestamp == null) return ""
  // 🔥 智能单位归一化：毫秒时间戳 < 1e12（11位以下）视为秒级
  const ts = typeof timestamp === "number" && timestamp > 0 && timestamp < 1e12
    ? timestamp * 1000
    : timestamp
  const d = new Date(ts as number)
  if (isNaN(d.getTime())) return ""
  const h = d.getHours().toString().padStart(2, "0")
  const m = d.getMinutes().toString().padStart(2, "0")
  return `${h}:${m}`
}

const formatDateShort = (timestamp?: number | null) => {
  if (timestamp == null) return ""
  // 🔥 智能单位归一化：毫秒时间戳 < 1e12（11位以下）视为秒级
  const ts = typeof timestamp === "number" && timestamp > 0 && timestamp < 1e12
    ? timestamp * 1000
    : timestamp
  const d = new Date(ts as number)
  if (isNaN(d.getTime())) return ""
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

const getActionLabel = (task: ScheduledTask) => {
  const params = safeParseParams(task.params)
  if (task.action_type === "agent") return "智能分析"
  if (task.action_type === "reminder") return "定时提醒"
  if (task.action_type === "relay") {
    const v = params?.value === 1 ? "开启" : "关闭"
    return `${getDeviceName(task.device_id)} · ${v}`
  }
  if (task.action_type === "led") return "调节灯光"
  return "执行任务"
}

/** 解析 cron 表达式为中文自然语言（仅支持 5 段标准） */
const describeCron = (cron: string): string => {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return `Cron: ${cron}`
  const [minute, hour, day, month, weekday] = parts

  // 每天 HH:MM
  if (day === "*" && month === "*" && weekday === "*" && /^\d+$/.test(minute) && /^\d+$/.test(hour)) {
    return `每天 ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`
  }
  // 工作日
  if (day === "*" && month === "*" && weekday === "1-5") {
    return `工作日 ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`
  }
  // 周末
  if (day === "*" && month === "*" && (weekday === "0,6" || weekday === "6,0")) {
    return `周末 ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`
  }
  // 每 N 小时整点
  if (minute === "0" && day === "*" && month === "*" && weekday === "*" && hour.startsWith("*/")) {
    return `每 ${hour.slice(2)} 小时`
  }
  // 每小时整点
  if (minute === "0" && hour === "*" && day === "*" && month === "*" && weekday === "*") {
    return `每小时整点`
  }
  return `Cron: ${cron}`
}

function ScheduleTaskCard({
  task,
  onChanged,
}: {
  task: ScheduledTask
  onChanged: () => void
}) {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const [active, setActive] = useState(task.is_active === 1)
  const [busy, setBusy] = useState<"toggle" | "run" | "delete" | null>(null)
  const [editing, setEditing] = useState(false)

  // 同步外部状态变化
  useEffect(() => { setActive(task.is_active === 1) }, [task.is_active])

  const isCron = !!task.cron_expression
  const nextTime = task.next_run || task.execute_at

  const handleToggle = async (checked: boolean) => {
    if (busy) return
    setBusy("toggle")
    const prev = active
    setActive(checked) // 乐观更新
    try {
      const res = await fetch("/api/scheduler/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, is_active: checked }),
      })
      if (!res.ok) throw new Error()
      message.success(checked ? "已启用" : "已停用")
      onChanged()
    } catch {
      setActive(prev) // 回滚
      message.error("操作失败")
    } finally {
      setBusy(null)
    }
  }

  const handleRunNow = async () => {
    if (busy) return
    setBusy("run")
    try {
      const res = await fetch("/api/scheduler/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, action: "run_now" }),
      })
      if (!res.ok) throw new Error()
      message.success("已立即执行")
    } catch {
      message.error("执行失败")
    } finally {
      setBusy(null)
    }
  }

  const handleDelete = async () => {
    if (busy) return
    setBusy("delete")
    try {
      const res = await fetch(`/api/scheduler/tasks?id=${task.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      message.success("已删除")
      onChanged()
    } catch {
      message.error("删除失败")
    } finally {
      setBusy(null)
    }
  }

  const menuItems: MenuProps["items"] = [
    {
      key: "run",
      label: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <IconPlay size={14} />
          现在运行
        </span>
      ),
      onClick: ({ domEvent }) => { domEvent.stopPropagation(); handleRunNow() },
      disabled: !active || busy !== null,
    },
    {
      key: "edit",
      label: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <IconPencil size={14} />
          编辑
        </span>
      ),
      onClick: ({ domEvent }) => { domEvent.stopPropagation(); setEditing(true) },
    },
    { type: "divider" },
    {
      key: "delete",
      label: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: token.colorError }}>
          <IconDelete size={14} />
          删除
        </span>
      ),
      onClick: ({ domEvent }) => { domEvent.stopPropagation(); handleDelete() },
    },
  ]

  return (
    <>
      <div
        style={{
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: 10,
          padding: "16px 18px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          transition: "all 0.2s",
          opacity: active ? 1 : 0.55,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)"
          e.currentTarget.style.borderColor = token.colorBorder
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.02)"
          e.currentTarget.style.borderColor = token.colorBorderSecondary
        }}
      >
        {/* 顶部行：标题 + 开关 + 更多 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 15,
              fontWeight: 600,
              color: token.colorText,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              {task.title}
            </div>
            <div style={{
              fontSize: 12,
              color: token.colorTextTertiary,
              marginTop: 2,
            }}>
              {getActionLabel(task)}
            </div>
          </div>
          <Switch
            checked={active}
            onChange={handleToggle}
            disabled={busy !== null}
            size="small"
            loading={busy === "toggle"}
          />
          <Dropdown
            menu={{ items: menuItems }}
            trigger={["click"]}
            placement="bottomRight"
          >
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 28, height: 28,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "none",
                background: token.colorFillQuaternary,
                borderRadius: 8,
                cursor: busy ? "not-allowed" : "pointer",
                color: token.colorTextSecondary,
                transition: "all 0.15s",
                flexShrink: 0,
              }}
              disabled={busy !== null}
              onMouseEnter={(e) => { e.currentTarget.style.background = token.colorFillTertiary }}
              onMouseLeave={(e) => { e.currentTarget.style.background = token.colorFillQuaternary }}
            >
              <IconMore size={16} />
            </button>
          </Dropdown>
        </div>

        {/* 分隔线 */}
        <div style={{
          height: 1,
          background: token.colorBorderSecondary,
          margin: "12px 0",
        }} />

        {/* 底部行：重复规则 + 下次执行 */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          fontSize: 12,
          color: token.colorTextSecondary,
        }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <IconTime size={13} style={{ color: token.colorTextTertiary, flexShrink: 0 }} />
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {isCron
                ? describeCron(task.cron_expression!)
                : nextTime
                  ? `${formatDateShort(nextTime)} ${formatTimeShort(nextTime)}`
                  : "单次执行"}
            </span>
          </div>
          {nextTime && (
            <div style={{ fontSize: 12, color: token.colorTextTertiary, whiteSpace: "nowrap", flexShrink: 0 }}>
              下一次执行: {formatDateShort(nextTime)} {formatTimeShort(nextTime)}
            </div>
          )}
        </div>
      </div>

      <ManualTaskCreateModal
        open={editing}
        onClose={() => setEditing(false)}
        onSuccess={onChanged}
        editingTask={{
          id: task.id,
          title: task.title,
          cron_expression: task.cron_expression,
          execute_at: task.execute_at,
          action_type: task.action_type,
          device_id: task.device_id,
          params: safeParseParams(task.params),
        }}
      />
    </>
  )
}

export function ScheduledTasksList({ onTasksChange, tasks: externalTasks, loading: externalLoading }: ScheduledTasksListProps) {
  const { token } = theme.useToken()
  const [internalTasks, setInternalTasks] = useState<ScheduledTask[]>([])
  const [internalLoading, setInternalLoading] = useState(true)

  const useExternal = externalTasks !== undefined
  const tasks = useExternal ? (externalTasks as ScheduledTask[]) : internalTasks
  const loading = useExternal ? !!externalLoading : internalLoading

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/scheduler/tasks')
      if (res.ok) {
        const data = await res.json()
        setInternalTasks(data.tasks || [])
      }
    } catch (e) {
      console.error('[ScheduledTasksList] fetch error:', e)
    } finally {
      setInternalLoading(false)
    }
  }

  useEffect(() => {
    if (useExternal) return
    fetchTasks()
    const interval = setInterval(fetchTasks, 30000)

    // 🔥 监听 AI 对话中创建的定时任务事件，实时刷新
    const onChange = () => { fetchTasks() }
    if (typeof window !== 'undefined') {
      window.addEventListener('scheduler:tasks-changed', onChange)
    }

    return () => {
      clearInterval(interval)
      if (typeof window !== 'undefined') {
        window.removeEventListener('scheduler:tasks-changed', onChange)
      }
    }
  }, [useExternal])

  const handleChanged = () => {
    if (useExternal) onTasksChange?.()
    else fetchTasks()
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 32, color: token.colorTextSecondary }}>
        <IconLoading size={16} style={{ marginRight: 8, animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: 13 }}>加载任务列表...</span>
        <style>{`@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <span style={{ fontSize: 12, color: token.colorTextSecondary }}>
            暂无定时任务
            <br />
            <span style={{ fontSize: 11 }}>可通过对话或手动创建</span>
          </span>
        }
        style={{ margin: "16px 0" }}
      />
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {tasks.map((task) => (
        <ScheduleTaskCard key={task.id} task={task} onChanged={handleChanged} />
      ))}
    </div>
  )
}
