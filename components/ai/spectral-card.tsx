"use client"

import React from "react"
import ReactECharts from "echarts-for-react"
import { Card, Flex, Space, Tag, Typography, theme } from "antd"
import type { DeviceData } from "@/lib/hooks/use-device-data"

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

export function SpectralCard({ data }: SpectralCardProps) {
  const { token } = theme.useToken()

  const maxChannel = channels.reduce((prev, curr) =>
    ((data?.[curr.id as keyof DeviceData] as number) || 0) > ((data?.[prev.id as keyof DeviceData] as number) || 0) ? curr : prev
  )
  const maxValue = (data?.[maxChannel.id as keyof DeviceData] as number) || 0

  const getOption = () => {
    const seriesData = channels.map((c) => ({
      value: (data?.[c.id as keyof DeviceData] as number) || 0,
      itemStyle: {
        color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: c.color }, { offset: 1, color: `${c.color}40` }] },
        borderRadius: [4, 4, 0, 0],
      },
    }))

    return {
      animation: false,
      grid: { top: 5, right: 0, bottom: 0, left: 0, containLabel: false },
      tooltip: { trigger: "axis", axisPointer: { type: "none" } },
      xAxis: { type: "category", data: channels.map((c) => c.name), show: false },
      yAxis: { type: "value", show: false },
      series: [
        { type: "bar", barWidth: "60%", data: seriesData, showBackground: true, backgroundStyle: { color: "rgba(240,240,240,0.2)", borderRadius: [4, 4, 0, 0] } },
        {
          type: "line", data: seriesData.map((d) => d.value), smooth: true, symbol: "none",
          lineStyle: { width: 2, color: "#e879f9" },
          areaStyle: {
            color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(232,121,249,0.2)" }, { offset: 1, color: "rgba(232,121,249,0.05)" }] },
          },
        },
      ],
    }
  }

  return (
    <Card style={{ width: "100%", maxWidth: 400 }}>
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
          <ReactECharts option={getOption()} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} notMerge lazyUpdate={false} />
        </div>
      </Flex>
    </Card>
  )
}
