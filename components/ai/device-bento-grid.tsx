"use client"

import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useMemo } from "react"
import { motion } from "framer-motion"
import { Card, Row, Col, Typography, Space, theme } from "antd"
import { BerryXCard } from "@/components/ui/berry-xcard"
import { buildCommands } from "@/lib/a2ui/berry-protocol"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import type { A2UICommand_v0_9 } from "@ant-design/x-card"
import { IconChartLine, IconLightning, IconSeedling, IconSun, IconThermometer, IconWater, IconWaves, IconWind } from "@/components/icon";

const { Text, Title } = Typography

interface MetricMeta {
  id: string
  title: string
  key: "temperature" | "humidity" | "light" | "co2" | "earth_temp" | "earth_water" | "earth_ec" | "earth_n"
  unit: string
  icon: any
  color: string
  precision?: number
}

const METRICS: MetricMeta[] = [
  { id: "m1", title: "空气温度", key: "temperature", unit: "°C", icon: IconThermometer, color: "#f97316" },
  { id: "m2", title: "空气湿度", key: "humidity", unit: "%", icon: IconWater, color: "#3b82f6" },
  { id: "m3", title: "光照强度", key: "light", unit: "Lux", icon: IconSun, color: "#f59e0b" },
  { id: "m4", title: "CO2 浓度", key: "co2", unit: "ppm", icon: IconWind, color: BERRY_THEME.primary },
  { id: "m5", title: "土壤温度", key: "earth_temp", unit: "°C", icon: IconThermometer, color: "#f43f5e" },
  { id: "m6", title: "土壤水分", key: "earth_water", unit: "%", icon: IconWaves, color: "#06b6d4", precision: 1 },
  { id: "m7", title: "土壤 EC", key: "earth_ec", unit: "μS/cm", icon: IconLightning, color: "#a855f7" },
  { id: "m8", title: "综合肥力(N)", key: "earth_n", unit: "mg/kg", icon: IconSeedling, color: "#6366f1" },
]

/**
 * 🍓 DeviceBentoGrid — Ant Design + XCard + A2UI 三件套
 *
 * 1. 视觉层：Ant Design Card / Row+Col / Typography（语义化 token）
 * 2. 渲染层：XCard.Box（统一入口）+ Metric / CardHeader 组件
 * 3. 协议层：A2UI v0.9 commands + berry-realm-catalog-v1
 *
 * 排版规则：
 * - 4×2 数据栅格，移动端 2×4，桌面端 4×2
 * - Header 左侧标题 + 右侧设备状态指示
 * - 单元格：icon + 标题（小字） + 大数值 + 单位
 * - 颜色统一 BERRY_THEME.primary (#1677ff)，与 AI 助手主对话流一致
 */
export function DeviceBentoGrid() {
  const { deviceData, connectionStatus } = useDeviceData()
  const { token } = theme.useToken()

  // 兜底数据（设备离线时使用 0 占位）
  const data = deviceData || {
    temperature: 0,
    humidity: 0,
    light: 0,
    co2: 0,
    earth_temp: 0,
    earth_water: 0,
    earth_ec: 0,
    earth_n: 0,
  }

  const isOnline = connectionStatus?.connected ?? false

  // ===== 单个指标单元格 =====
  const renderMetricCell = (metric: MetricMeta) => {
    const raw = (data as any)[metric.key] ?? 0
    const value = metric.precision != null ? Number(raw).toFixed(metric.precision) : raw
    const Icon = metric.icon

    return (
      <div
        style={{
          padding: 16,
          background: token.colorBgContainer,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          minHeight: 90,
          transition: "background 0.2s",
        }}
      >
        <Space size={6} align="center" style={{ marginBottom: 8 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: metric.color,
            }}
          >
            <Icon size={14} strokeWidth={2.25} />
          </span>
          <Text
            style={{
              fontSize: 12,
              lineHeight: 1.5,
              color: token.colorTextSecondary,
              fontWeight: 500,
            }}
          >
            {metric.title}
          </Text>
        </Space>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span
            style={{
              fontSize: 24,
              lineHeight: 1.1,
              fontWeight: 700,
              color: token.colorTextHeading,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: -0.3,
            }}
          >
            {value}
          </span>
          <Text
            style={{
              fontSize: 11,
              lineHeight: 1.5,
              color: token.colorTextTertiary,
              fontWeight: 500,
            }}
          >
            {metric.unit}
          </Text>
        </div>
      </div>
    )
  }

  // ===== Header =====
  const renderHeader = () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 16px",
        background: token.colorFillQuaternary,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Title
        level={5}
        style={{
          margin: 0,
          fontSize: 14,
          lineHeight: 1.5,
          fontWeight: 600,
          color: token.colorTextHeading,
        }}
      >
        <Space size={6} align="center">
          <IconChartLine size={15} strokeWidth={2.25} style={{ color: BERRY_THEME.primary }} />
          环境状态概览
        </Space>
      </Title>
      <Space size={6} align="center">
        <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
          {isOnline && (
            <span
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: BERRY_THEME.primary,
                opacity: 0.5,
                animation: "ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite",
              }}
            />
          )}
          <span
            style={{
              position: "relative",
              display: "inline-flex",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: isOnline ? BERRY_THEME.primary : token.colorError,
            }}
          />
        </span>
        <Text
          style={{
            fontSize: 12,
            lineHeight: 1.5,
            color: isOnline ? BERRY_THEME.primary : token.colorError,
            fontWeight: 500,
          }}
        >
          {isOnline ? "设备在线" : "设备离线"}
        </Text>
      </Space>
    </div>
  )

  // ===== A2UI 命令构建（v0.9） =====
  const surfaceId = useMemo(() => `device-bento-${Date.now()}`, [])
  const a2uiCommands: A2UICommand_v0_9[] = useMemo(() => {
    return buildCommands(
      surfaceId,
      [
        // 头部
        {
          id: "header",
          component: "CardHeader",
          title: "环境状态概览",
          subtitle: isOnline ? "设备在线 · 实时数据" : "设备离线 · 数据为占位值",
          icon: "Activity",
          status: isOnline ? "success" : "error",
        },
        // 8 个指标
        ...METRICS.map((m) => ({
          id: m.id,
          component: "Metric",
          title: m.title,
          value: String(
            m.precision != null
              ? Number((data as any)[m.key] ?? 0).toFixed(m.precision)
              : (data as any)[m.key] ?? 0
          ),
          unit: m.unit,
          icon: m.icon.name,
          color: m.color,
        })),
      ],
      ["header", ...METRICS.map((m) => m.id)]
    )
  }, [surfaceId, data, isOnline])

  // ===== 兜底渲染（Ant Design 直渲） =====
  const fallbackUI = (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ width: "100%" }}
    >
      <Card
        size="small"
        bordered
        style={{
          background: BERRY_THEME.gradients.cardHero(BERRY_THEME.primary),
          borderColor: `${BERRY_THEME.primary}30`,
          borderRadius: token.borderRadiusLG,
          boxShadow: BERRY_THEME.shadow.sm,
          overflow: "hidden",
        }}
        styles={{ body: { padding: 0 } }}
      >
        {renderHeader()}
        <Row gutter={0} style={{ background: token.colorBorderSecondary }}>
          {METRICS.map((m, idx) => (
            <Col
              key={m.id}
              xs={12}
              sm={12}
              md={6}
              lg={6}
              xl={6}
              style={{
                borderRight:
                  (idx + 1) % 4 === 0 ? "none" : `1px solid ${token.colorBorderSecondary}`,
                borderBottom: idx < 4 ? `1px solid ${token.colorBorderSecondary}` : "none",
              }}
            >
              {renderMetricCell(m)}
            </Col>
          ))}
        </Row>
      </Card>
    </motion.div>
  )

  return (
    <BerryXCard
      surfaceId={surfaceId}
      commands={a2uiCommands}
      onAction={() => {}}
      components={{}}
      fallback={fallbackUI}
      timeout={400}
    />
  )
}
