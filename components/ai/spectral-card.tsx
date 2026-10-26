"use client"

import React from "react"
import { Card, Flex, Space, Tag, Typography, theme } from "antd"
import type { DeviceData } from "@/lib/hooks/use-device-data"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import { SPECTRAL_CHANNELS, SpectralChart, spectralValuesFrom } from "@/components/charts/spectral-chart"

const { Text } = Typography

interface SpectralCardProps {
  data: DeviceData | null
}

export function SpectralCard({ data }: SpectralCardProps) {
  const { token } = theme.useToken()

  const values = spectralValuesFrom(data as unknown as Record<string, unknown>)
  const colors = SPECTRAL_CHANNELS.map((c) => c.color)
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
            background: "linear-gradient(135deg, #a1a1aa, #e879f9)",
            color: "#fff", fontWeight: 700, fontSize: 14,
          }}>
            S
          </Flex>
        </Flex>
        <div style={{ height: 80, width: "100%" }}>
          <SpectralChart
            values={values}
            colors={colors}
            maxValue={maxValue}
            height={80}
            rx={1.5}
            gradientId="spec-area-ai"
          />
        </div>
      </Flex>
    </Card>
  )
}
