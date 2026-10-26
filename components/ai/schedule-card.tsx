"use client"

import { useState, useEffect, useRef } from "react"
import { Button, Card, Flex, Progress, Space, Tag, Typography, theme } from "antd"
import { toast } from "@/lib/ui/feedback"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import { IconCalendar, IconCheckOne, IconCloseOne, IconLoading, IconTime } from "@/components/icon";

const { Text, Title } = Typography

interface ScheduleData {
  title: string
  cron?: string
  execute_at?: number
  delay_seconds?: number
  task_action: string
  device?: number
  value?: number
  params?: any
}

function CountdownToast({ id, targetTime, title }: { id: string | number; targetTime: number; title: string }) {
  const [remaining, setRemaining] = useState(Math.max(0, Math.ceil((targetTime - Date.now()) / 1000)))
  const totalDuration = useState(remaining)[0]
  const { token } = theme.useToken()

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.ceil((targetTime - Date.now()) / 1000)
      if (diff <= 0) {
        setRemaining(0)
        clearInterval(interval)
        toast.dismiss(id)
        toast.success("任务已执行", { description: title })
      } else setRemaining(diff)
    }, 1000)
    return () => clearInterval(interval)
  }, [targetTime, id, title])

  const percent = Math.max(0, Math.min(100, (remaining / totalDuration) * 100))

  return (
    <Flex vertical gap={8} style={{ width: "100%" }}>
      <Flex justify="space-between" align="center" gap={8}>
        <Flex align="center" gap={8} flex={1} style={{ minWidth: 0 }}>
          <IconTime size={18} style={{ color: token.colorPrimary }} className="animate-pulse" />
          <Text strong style={{ fontSize: 13 }}>任务倒计时</Text>
          <Text type="secondary" style={{ fontSize: 12 }} ellipsis>{title}</Text>
        </Flex>
        <Text strong style={{ fontSize: 18, color: token.colorPrimary, fontFamily: "monospace" }}>
          {remaining}s
        </Text>
      </Flex>
      <Progress percent={percent} showInfo={false} strokeColor={token.colorPrimary} size="small" />
    </Flex>
  )
}

export function ScheduleCard({ data }: { data: ScheduleData }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [autoCreated, setAutoCreated] = useState(false)
  const creatingRef = useRef(false)
  const checkedRef = useRef(false)
  const { token } = theme.useToken()

  const handleConfirm = async () => {
    if (creatingRef.current) return
    creatingRef.current = true
    setStatus("loading")

    try {
      // 字段校验：task_action 必须是有效值，否则 DB 插入会失败
      const validTaskActions = ["toggle_relay", "set_led", "agent_analysis", "user_reminder"]
      if (!data.task_action || !validTaskActions.includes(data.task_action)) {
        console.error("[ScheduleCard] Invalid or missing task_action:", data.task_action)
        setStatus("error")
        toast.error("任务创建失败", { description: `无效的任务类型: ${data.task_action || "缺失"}` })
        creatingRef.current = false
        return
      }

      // 字段校验：title 必须存在
      if (!data.title || typeof data.title !== "string") {
        console.error("[ScheduleCard] Invalid or missing title:", data.title)
        setStatus("error")
        toast.error("任务创建失败", { description: "缺少任务标题" })
        creatingRef.current = false
        return
      }

      // 字段校验：delay_seconds 或 cron 必须提供其一
      if (!data.delay_seconds && !data.cron && !data.execute_at) {
        console.error("[ScheduleCard] Missing time field (delay_seconds/cron/execute_at)")
        setStatus("error")
        toast.error("任务创建失败", { description: "缺少时间参数" })
        creatingRef.current = false
        return
      }

      // 字段校验：toggle_relay 需要 device 和 value
      if (data.task_action === "toggle_relay" && (data.device === undefined || data.value === undefined)) {
        console.error("[ScheduleCard] toggle_relay missing device or value")
        setStatus("error")
        toast.error("任务创建失败", { description: "开关任务缺少设备ID或值" })
        creatingRef.current = false
        return
      }

      let finalExecuteAt = data.execute_at
      if (data.delay_seconds) finalExecuteAt = Date.now() + data.delay_seconds * 1000

      const res = await fetch("/api/scheduler/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          cron_expression: data.cron,
          execute_at: finalExecuteAt,
          action_type:
            data.task_action === "toggle_relay" ? "relay" :
            data.task_action === "set_led" ? "led" :
            data.task_action === "agent_analysis" ? "agent" :
            data.task_action === "user_reminder" ? "reminder" : data.task_action,
          device_id: data.device,
          params: data.params && Object.keys(data.params).length
            ? data.params
            : data.task_action === "toggle_relay" ? { value: data.value } : {},
        }),
      })

      if (!res.ok) throw new Error("Failed")
      setStatus("success")

      if (finalExecuteAt && !data.cron) {
        const delay = finalExecuteAt - Date.now()
        if (delay > 0 && delay <= 300000) {
          toast.custom((id) => <CountdownToast id={id} targetTime={finalExecuteAt!} title={data.title} />, { duration: Infinity })
        }
      }
      toast.success("定时任务已创建", { description: data.title })
    } catch {
      setStatus("error")
      toast.error("创建失败")
      creatingRef.current = false
    }
  }

  // 计算本卡片任务的唯一 signature，用于跨渲染/跨重入去重
  const signature = `${data.title}|${data.cron || ""}|${data.execute_at || ""}|${data.delay_seconds || ""}|${data.task_action}`

  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true
    if (autoCreated || status !== "idle" || creatingRef.current) return

    let cancelled = false

    ;(async () => {
      try {
        // 查询当前任务是否已存在（避免重新进入对话时重复创建）
        const res = await fetch("/api/scheduler/tasks")
        if (!res.ok) {
          if (!cancelled) {
            setAutoCreated(true)
            handleConfirm()
          }
          return
        }
        const json = await res.json()
        const tasks: any[] = Array.isArray(json?.tasks) ? json.tasks : []

        const targetExecuteAt = data.execute_at ?? (data.delay_seconds ? Date.now() + data.delay_seconds * 1000 : null)

        const duplicate = tasks.find((t) => {
          if (t.title !== data.title) return false
          if (data.cron) return t.cron_expression === data.cron
          if (targetExecuteAt && t.execute_at) {
            return Math.abs(Number(t.execute_at) - Number(targetExecuteAt)) < 1000
          }
          return false
        })

        if (!cancelled) {
          if (duplicate) {
            // 已存在，直接标记为成功，不再创建
            setStatus("success")
          } else {
            setAutoCreated(true)
            handleConfirm()
          }
        }
      } catch {
        if (!cancelled) {
          setAutoCreated(true)
          handleConfirm()
        }
      }
    })()

    return () => { cancelled = true }
  }, [signature])

  if (status === "loading") return (
    <Flex align="center" gap={8} style={{ padding: "8px 0" }}>
      <IconLoading size={14} style={{ color: token.colorPrimary }} className="animate-spin" />
      <Text style={{ fontSize: 13, color: token.colorPrimary }}>正在创建定时任务...</Text>
    </Flex>
  )

  if (status === "success") return (
    <Card
      size="small"
      style={{
        background: BERRY_THEME.gradients.cardHero(BERRY_THEME.primary),
        borderColor: `${BERRY_THEME.primary}50`,
        maxWidth: 400,
      }}
    >
      <Flex align="center" gap={12}>
        <Flex align="center" justify="center" style={{
          width: 40, height: 40, borderRadius: 10,
          background: BERRY_THEME.primary,
        }}>
          <IconCalendar size={20} style={{ color: '#fff' }} />
        </Flex>
        <Flex vertical>
          <Text style={{ fontSize: 14, fontWeight: 600, color: token.colorText }}>✅ 定时任务已创建</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{data.title}</Text>
        </Flex>
      </Flex>
    </Card>
  )

  if (status === "error") return (
    <Card size="small" style={{ borderColor: token.colorErrorBorder, background: `${token.colorError}08` }}>
      <Flex align="center" gap={12}>
        <Flex align="center" justify="center" style={{
          width: 40, height: 40, borderRadius: token.borderRadius,
          background: `${token.colorError}15`,
        }}>
          <IconCloseOne size={20} style={{ color: token.colorError }} />
        </Flex>
        <Flex vertical>
          <Title level={5} style={{ margin: 0, color: token.colorError }}>创建失败</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>请稍后重试</Text>
        </Flex>
      </Flex>
    </Card>
  )

  return null
}
