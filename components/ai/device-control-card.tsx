"use client"

import { cn } from "@/lib/utils"
import { CheckCircle2, Droplets, Fan, Lightbulb, Loader2, XCircle, Power, ArrowRight, RotateCcw } from "lucide-react"
import { Button, Card, Flex, Space, Tag, Typography, theme } from "antd"

const { Text, Title } = Typography

interface DeviceControlCardProps {
  command: any
  status?: "pending" | "executed" | "failed" | "loading"
  error?: string
  className?: string
  onExecute?: (command: any) => void
  onRetry?: () => void
}

function getDeviceMeta(command: any) {
  const deviceId = command.device
  let name = command.deviceName || "智能指令"

  if (deviceId === 5) name = "灌溉水泵"
  if (deviceId === 6) name = "环境风扇"
  if (deviceId === 7) name = "植物全光谱补光灯"
  if (deviceId === 8) name = "光照植物补光灯"

  if (command.action === "set_led") {
    return {
      name: "补光色温阵列",
      label: "光谱控制",
      desc: `RGB: ${command.r}, ${command.g}, ${command.b}`,
      icon: Lightbulb,
      color: "#f59e0b",
      isOn: true,
    }
  }

  const isOn = command.value === 1

  if (name.includes("水泵"))
    return { name, label: "流体动力", desc: isOn ? "启动水利循环" : "切断水源供应", icon: Droplets, color: "#3b82f6", isOn }
  if (name.includes("风扇"))
    return { name, label: "空气调节", desc: isOn ? "启动大气循环" : "关闭通风系统", icon: Fan, color: "#06b6d4", isOn }
  if (name.includes("补光灯"))
    return { name, label: "植物光照", desc: isOn ? "光合作用增强" : "进入休眠模式", icon: Lightbulb, color: "#f59e0b", isOn }
  if (name.includes("云台") || name.includes("摄像头") || command.action === "control_camera" || command.action === "move_camera_and_look") {
    const direction = command.direction === 1 ? "左移" : command.direction === 2 ? "右移" : "控制"
    const distance = command.distance_mm || (command.pulses ? (command.pulses / 160).toFixed(1) : "未知")
    if (command.action === "move_camera_and_look")
      return { name: "AI视觉巡检", label: "智能巡检系统", desc: `${direction} ${distance}mm 并拍摄分析`, icon: Power, color: "#a855f7", isOn: true }
    return { name: name.includes("云台") ? name : "摄像头云台", label: "位置移动控制", desc: `${direction} ${distance}mm`, icon: Power, color: "#a855f7", isOn: true }
  }

  return { name, label: "控制单元", desc: isOn ? "电源接通" : "电源断开", icon: Power, color: "#10b981", isOn }
}

export function DeviceControlCard({
  command,
  status = "executed",
  error,
  className,
  onExecute,
  onRetry,
}: DeviceControlCardProps) {
  const { token } = theme.useToken()
  const meta = getDeviceMeta(command)
  const Icon = meta.icon
  const isExecuting = status === "loading"
  const isBoundaryError = error && (error.includes("已经到达") || error.includes("原点") || error.includes("边界") || error.includes("limit"))

  const statusConfig: Record<string, { color: string; label: string }> = {
    loading: { color: "#faad14", label: "执行中" },
    pending: { color: "#1677ff", label: "等待确认" },
    executed: { color: meta.isOn ? "#10b981" : "#8c8c8c", label: meta.isOn ? "已完成" : "已关闭" },
    failed: { color: "#ff4d4f", label: "失败" },
  }

  return (
    <Card
      className={cn("w-full", className)}
      styles={{ body: { padding: 16 } }}
      bordered
      hoverable={false}
    >
      <Flex gap={12} align="center">
        {/* Left icon */}
        <Flex
          align="center"
          justify="center"
          style={{
            width: 48,
            height: 48,
            borderRadius: token.borderRadiusLG,
            background: `linear-gradient(135deg, ${meta.color}20, ${meta.color}08)`,
            border: `1px solid ${meta.color}25`,
            flexShrink: 0,
          }}
        >
          {isExecuting ? (
            <Loader2 size={20} style={{ color: meta.color }} className="animate-spin" />
          ) : (
            <Icon size={20} style={{ color: meta.color, opacity: meta.isOn ? 1 : 0.5 }} />
          )}
        </Flex>

        {/* Middle content */}
        <Flex vertical flex={1} style={{ minWidth: 0 }}>
          <Space size={6}>
            <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {meta.label}
            </Text>
            <Tag color={statusConfig[status]?.color} style={{ margin: 0, fontSize: 10, lineHeight: "18px" }}>
              {statusConfig[status]?.label}
            </Tag>
          </Space>
          <Title level={5} style={{ margin: "2px 0 0", fontSize: 15 }}>
            {meta.name}
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {meta.desc}
          </Text>
        </Flex>

        {/* Right action */}
        <Flex vertical align="center" style={{ flexShrink: 0, minWidth: 56 }}>
          {status === "pending" || status === undefined ? (
            <Button type="primary" size="small" icon={<ArrowRight size={14} />} onClick={() => onExecute?.(command)}>
              执行
            </Button>
          ) : status === "loading" ? (
            <Tag color="processing" style={{ margin: 0 }}>执行中</Tag>
          ) : status === "executed" ? (
            <Flex align="center" gap={4}>
              <CheckCircle2 size={14} style={{ color: "#10b981" }} />
              <Text style={{ fontSize: 11, fontWeight: 700, color: "#10b981", textTransform: "uppercase" }}>
                {meta.isOn ? "ON" : "OFF"}
              </Text>
            </Flex>
          ) : (
            <Tag color="error" style={{ margin: 0 }}>失败</Tag>
          )}
        </Flex>
      </Flex>

      {/* Error section */}
      {status === "failed" && error && (
        <Flex
          vertical
          gap={4}
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: token.borderRadius,
            background: isBoundaryError ? `${token.colorError}10` : token.colorFillQuaternary,
            border: `1px solid ${isBoundaryError ? `${token.colorError}30` : token.colorBorderSecondary}`,
          }}
        >
          <Flex gap={8} align="flex-start">
            <XCircle size={16} style={{ color: token.colorError, marginTop: 2 }} />
            <Text style={{ fontSize: 12, color: token.colorError }}>{error}</Text>
          </Flex>
          {isBoundaryError && onRetry && (
            <Button danger size="small" icon={<RotateCcw size={12} />} onClick={onRetry} block>
              让AI重新规划方向
            </Button>
          )}
        </Flex>
      )}
    </Card>
  )
}
