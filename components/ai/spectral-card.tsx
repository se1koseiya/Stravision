"use client"

import React from "react"
import { Card, Flex, Space, Tag, Typography, theme } from "antd"
import type { DeviceData } from "@/lib/hooks/use-device-data"
import { BERRY_THEME } from "@/lib/ui/berry-theme"

const { Text, Title } = Typography

interface SpectralCardProps {
  data: DeviceData | null
}

const channels = [
  { id: "channel1", name: "415", label: "Violet", color: "#8B00FF" },
  { id: "channel2", name: "445", label: "Blue", color: "#0000FF" },
  { id: "channel3", name: "480", label: "Cyan", color: "#00FFFF" },
  { id: "channel4", name: "515", label: "Green", color: "#00FF00" },
  { id: "channel5", name: "555", label: "Y-G", color: "#ADFF2F" },
  { id: "channel6", name: "590", label: "Yellow", color: "#FFFF00" },
  { id: "channel7", name: "630", label: "Orange", color: "#FFA500" },
  { id: "channel8", name: "680", label: "Red", color: "#FF0000" },
  { id: "channel9", name: "NIR", label: "NIR", color: "#8B0000" },
  { id: "channel10", name: "Clr", label: "Clear", color: "#E0E0E0" },
  { id: "channel11", name: "Fli", label: "Flicker", color: "#808080" },
]

/** Lightweight SVG spectral chart — no chart library needed */
function SpectralChart({ values, colors, maxValue }: { values: number[]; colors: string[]; maxValue: number }) {
  const W = 100, H = 80, pad = 2
  const barW = (W - pad * (values.length + 1)) / values.length
  const safeMax = maxValue || 1
  const pts = values.map((v, i) => ({
    x: pad + i * (barW + pad) + barW / 2,
    y: H - (v / safeMax) * (H - 8) - 4,
  }))
  // Smooth bezier path through points
  const linePath = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x},${p.y}`
    const prev = pts[i - 1]
    const cx1 = prev.x + (p.x - prev.x) / 2
    const cx2 = prev.x + (p.x - prev.x) / 2
    return `${acc} C ${cx1},${prev.y} ${cx2},${p.y} ${p.x},${p.y}`
  }, "")
  const areaPath = `${linePath} L ${pts[pts.length - 1].x},${H} L ${pts[0].x},${H} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="spec-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(232,121,249,0.2)" />
          <stop offset="100%" stopColor="rgba(232,121,249,0.02)" />
        </linearGradient>
      </defs>
      {pts.map((p, i) => (
        <rect key={i} x={pad + i * (barW + pad)} y={p.y} width={barW} height={H - p.y} rx={1.5} fill={colors[i]} opacity={0.85} />
      ))}
      <path d={areaPath} fill="url(#spec-area)" />
      <path d={linePath} fill="none" stroke="#e879f9" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function SpectralCard({ data }: SpectralCardProps) {
  const { token } = theme.useToken()

  const values = channels.map((c) => (data?.[c.id as keyof DeviceData] as number) || 0)
  const colors = channels.map((c) => c.color)
  const maxValue = Math.max(...values, 0)

  return (
    <Card
      style={{
        width: "100%",
        maxWidth: 400,
        background: BERRY_THEME.gradients.cardHero(BERRY_THEME.primary),
        borderColor: `${BERRY_THEME.primary}30`,
      }}
    >
      <Flex vertical gap={12}>
        <Flex justify="space-between" align="flex-start">
          <Flex vertical gap={2}>
            <Space align="baseline">
              <Text style={{ fontSize: 36, fontWeight: 700 }}>{maxValue}</Text>
              <Text type="secondary" style={{ fontSize: 16 }}>µmol</Text>
            </Space>
            <Space size={4}>
              <Tag color="pink" style={{ margin: 0 }}>Spectral</Tag>
              <Text type="secondary" style={{ fontSize: 11 }}>实时监测</Text>
            </Space>
          </Flex>
          <Flex align="center" justify="center" style={{
            width: 32, height: 32, borderRadius: token.borderRadius,
            background: "linear-gradient(135deg, #f472b6, #e879f9)",
            color: "#fff", fontWeight: 700, fontSize: 14,
          }}>
            S
          </Flex>
        </Flex>
        <div style={{ height: 80, width: "100%" }}>
          <SpectralChart values={values} colors={colors} maxValue={maxValue} />
        </div>
      </Flex>
    </Card>
  )
}
