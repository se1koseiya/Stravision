"use client"

import { useState, useEffect, useRef } from "react"
import { CalendarClock, CheckCircle2, XCircle, Loader2, Clock } from "lucide-react"
import { Button, Card, Flex, Progress, Space, Tag, Typography, theme } from "antd"
import { toast } from "sonner"

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
          <Clock size={18} style={{ color: token.colorPrimary }} className="animate-pulse" />
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
  const { token } = theme.useToken()

  const handleConfirm = async () => {
    if (creatingRef.current) return
    creatingRef.current = true
    setStatus("loading")

    try {
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

  useEffect(() => {
    if (!autoCreated && status === "idle" && !creatingRef.current) {
      setAutoCreated(true)
      handleConfirm()
    }
  }, [])

  if (status === "loading") return (
    <Flex align="center" gap={8} style={{ padding: "8px 0" }}>
      <Loader2 size={14} style={{ color: token.colorPrimary }} className="animate-spin" />
      <Text style={{ fontSize: 13, color: token.colorPrimary }}>正在创建定时任务...</Text>
    </Flex>
  )

  if (status === "success") return (
    <Flex align="center" gap={8} style={{ padding: "8px 0" }}>
      <CheckCircle2 size={16} style={{ color: token.colorSuccess }} />
      <Text style={{ fontSize: 13, color: token.colorSuccess }}>✅ 定时任务已创建：{data.title}</Text>
    </Flex>
  )

  if (status === "error") return (
    <Card size="small" style={{ borderColor: token.colorErrorBorder, background: `${token.colorError}08` }}>
      <Flex align="center" gap={12}>
        <Flex align="center" justify="center" style={{
          width: 40, height: 40, borderRadius: token.borderRadius,
          background: `${token.colorError}15`,
        }}>
          <XCircle size={20} style={{ color: token.colorError }} />
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
