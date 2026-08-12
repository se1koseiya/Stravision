"use client"

import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useDeviceControl } from "@/lib/hooks/use-device-control"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { Card, Switch, Typography, Row, Col, Space, theme } from "antd"
import { Loader2, Droplets, Fan, Zap, Lightbulb } from "lucide-react"
import { BerryXCard } from "@/components/ui/berry-xcard"
import { buildCommands } from "@/lib/a2ui/berry-protocol"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import { DEVICE_IDS } from "@/lib/constants"
import type { A2UICommand_v0_9, ActionPayload } from "@ant-design/x-card"

const { Text, Title } = Typography

interface DeviceMeta {
  id: number
  name: string
  icon: any
  color: string
  relayKey: "relay5" | "relay6" | "relay7" | "relay8"
  action: string
}

const DEVICES: DeviceMeta[] = [
  {
    id: DEVICE_IDS.PUMP,
    name: "灌溉水泵",
    icon: Droplets,
    color: "#3b82f6",
    relayKey: "relay5",
    action: "toggle-device-pump",
  },
  {
    id: DEVICE_IDS.FAN,
    name: "通风风扇",
    icon: Fan,
    color: "#06b6d4",
    relayKey: "relay6",
    action: "toggle-device-fan",
  },
  {
    id: DEVICE_IDS.RGB_LIGHT,
    name: "补光灯",
    icon: Zap,
    color: "#a855f7",
    relayKey: "relay7",
    action: "toggle-device-grow-light",
  },
  {
    id: DEVICE_IDS.WHITE_LIGHT,
    name: "白光照明",
    icon: Lightbulb,
    color: "#f59e0b",
    relayKey: "relay8",
    action: "toggle-device-white-light",
  },
]

/**
 * 🍓 ControlBentoGrid — Ant Design + XCard + A2UI 三件套
 *
 * 1. 视觉层：Ant Design Card / Switch / Row+Col / Typography（语义化 token）
 * 2. 渲染层：XCard.Box（统一入口）+ DeviceToggle 组件
 * 3. 协议层：A2UI v0.9 commands + berry-realm-catalog-v1
 *
 * 排版规则：
 * - 桌面端 xs/sm/md/lg 4 列等分，移动端 2 列
 * - 卡片高度统一 132px，icon + switch + name + status 四层结构
 * - 状态色用色板 token（off = text-tertiary，on = primary）
 */
export function ControlBentoGrid() {
  const { deviceData } = useDeviceData()
  const { toggleRelay } = useDeviceControl()
  const { token } = theme.useToken()
  const [loading, setLoading] = useState<number | null>(null)

  // 兜底数据（设备离线时使用）
  const data = deviceData || {
    relay5: 0,
    relay6: 0,
    relay7: 0,
    relay8: 0,
  } as Record<string, number>

  // ===== 业务逻辑：设备开关 =====
  const handleToggle = async (device: DeviceMeta) => {
    if (loading) return
    const currentState = data[device.relayKey] ?? 0
    setLoading(device.id)
    try {
      const success = await toggleRelay(device.id, currentState)
      if (success) {
        const newState = currentState === 1 ? 0 : 1
        toast.success(`${device.name} 已${newState ? "开启" : "关闭"}`)
      }
    } catch {
      // toast handled in hook
    } finally {
      setLoading(null)
    }
  }

  // ===== 单个设备卡片（Ant Design 直渲） =====
  const renderDeviceCard = (device: DeviceMeta) => {
    const state = data[device.relayKey] ?? 0
    const isOn = state === 1
    const isLoading = loading === device.id
    const Icon = device.icon
    const isFanActive = device.id === DEVICE_IDS.FAN && isOn

    // 状态语义化色板
    const iconBg = isOn ? `${device.color}15` : token.colorFillTertiary
    const iconBorder = isOn ? `${device.color}30` : "transparent"
    const iconColor = isOn ? device.color : token.colorTextQuaternary
    const cardBorder = isOn ? `${BERRY_THEME.primary}50` : token.colorBorderSecondary
    const cardShadow = isOn
      ? `0 6px 20px -8px ${BERRY_THEME.primary}40`
      : token.boxShadowTertiary

    return (
      <Card
        size="small"
        bordered
        hoverable={!isLoading}
        onClick={() => handleToggle(device)}
        style={{
          height: 132,
          background: isOn
            ? `linear-gradient(135deg, ${BERRY_THEME.primary}08 0%, ${device.color}05 100%)`
            : token.colorBgContainer,
          borderColor: cardBorder,
          borderRadius: token.borderRadiusLG,
          boxShadow: cardShadow,
          cursor: isLoading ? "wait" : "pointer",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        styles={{ body: { padding: 16, height: "100%" } }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "100%",
          }}
        >
          {/* Top: icon + switch */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: token.borderRadius,
                background: iconBg,
                border: `1px solid ${iconBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.3s",
              }}
            >
              {isLoading ? (
                <Loader2
                  size={16}
                  strokeWidth={2}
                  style={{ color: BERRY_THEME.primary }}
                  className="animate-spin"
                />
              ) : (
                <Icon
                  size={16}
                  strokeWidth={2}
                  style={{
                    color: iconColor,
                    transition: "color 0.3s",
                    animation: isFanActive ? "spin 2s linear infinite" : undefined,
                  }}
                />
              )}
            </div>

            <div onClick={(e) => e.stopPropagation()}>
              {isLoading ? (
                <div
                  style={{
                    width: 28,
                    height: 16,
                    borderRadius: 999,
                    background: token.colorFillTertiary,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Loader2
                    size={10}
                    style={{ color: BERRY_THEME.primary }}
                    className="animate-spin"
                  />
                </div>
              ) : (
                <Switch
                  size="small"
                  checked={isOn}
                  onChange={() => handleToggle(device)}
                />
              )}
            </div>
          </div>

          {/* Bottom: name + status */}
          <div>
            <Title
              level={5}
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.4,
                fontWeight: 600,
                color: isOn ? token.colorTextHeading : token.colorTextSecondary,
                letterSpacing: 0.2,
              }}
            >
              {device.name}
            </Title>
            <Space size={4} align="center" style={{ marginTop: 2 }}>
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: isOn ? BERRY_THEME.primary : token.colorTextQuaternary,
                  transition: "background 0.3s",
                }}
              />
              <Text
                style={{
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: isOn ? BERRY_THEME.primary : token.colorTextTertiary,
                  fontWeight: isOn ? 500 : 400,
                }}
              >
                {isLoading ? "执行中…" : isOn ? "运行中" : "已关闭"}
              </Text>
            </Space>
          </div>
        </div>
      </Card>
    )
  }

  // ===== A2UI 命令构建（v0.9） =====
  const surfaceId = useMemo(() => `device-grid-${Date.now()}`, [])
  const a2uiCommands: A2UICommand_v0_9[] = useMemo(() => {
    return buildCommands(
      surfaceId,
      [
        // 4 个设备开关（DeviceToggle）
        ...DEVICES.map((device) => ({
          id: `toggle-${device.id}`,
          component: "DeviceToggle",
          deviceId: String(device.id),
          deviceName: device.name,
          isOn: data[device.relayKey] === 1,
          icon: device.icon.name,
        })),
      ],
      DEVICES.map((d) => `toggle-${d.id}`)
    )
  }, [surfaceId, data])

  // ===== A2UI Action 处理 =====
  const handleAction = (payload: ActionPayload) => {
    const device = DEVICES.find((d) => d.action === payload.name)
    if (device) {
      handleToggle(device)
    }
  }

  // ===== 兜底渲染（Ant Design 直渲） =====
  const fallbackUI = (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ width: "100%" }}
    >
      <Row gutter={[12, 12]} wrap>
        {DEVICES.map((device) => (
          <Col key={device.id} xs={12} sm={12} md={6} lg={6} xl={6} flex="1 1 0">
            {renderDeviceCard(device)}
          </Col>
        ))}
      </Row>
    </motion.div>
  )

  return (
    <BerryXCard
      surfaceId={surfaceId}
      commands={a2uiCommands}
      onAction={handleAction}
      components={{}}
      fallback={fallbackUI}
      timeout={400}
    />
  )
}
