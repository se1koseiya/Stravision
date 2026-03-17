"use client"

import React, { useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DeviceData } from "@/lib/hooks/use-device-data"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SpectralCardProps {
  data: DeviceData | null
}

export function SpectralCard({ data }: SpectralCardProps) {
  const [timeRange, setTimeRange] = useState("1h")

  // Define spectral channels configuration
  const channels = [
    { id: 'channel1', name: '415', label: 'Violet', color: '#8B00FF' },
    { id: 'channel2', name: '445', label: 'Blue', color: '#0000FF' },
    { id: 'channel3', name: '480', label: 'Cyan', color: '#00FFFF' },
    { id: 'channel4', name: '515', label: 'Green', color: '#00FF00' },
    { id: 'channel5', name: '555', label: 'Y-G', color: '#ADFF2F' },
    { id: 'channel6', name: '590', label: 'Yellow', color: '#FFFF00' },
    { id: 'channel7', name: '630', label: 'Orange', color: '#FFA500' },
    { id: 'channel8', name: '680', label: 'Red', color: '#FF0000' },
    { id: 'channel9', name: 'NIR', label: 'NIR', color: '#8B0000' },
    { id: 'channel10', name: 'Clr', label: 'Clear', color: '#E0E0E0' },
    { id: 'channel11', name: 'Fli', label: 'Flicker', color: '#808080' },
  ]

  // Find the channel with max value to display prominently
  const maxChannel = channels.reduce((prev, current) => {
    const prevVal = data ? (data[prev.id as keyof DeviceData] as number) || 0 : 0
    const currVal = data ? (data[current.id as keyof DeviceData] as number) || 0 : 0
    return currVal > prevVal ? current : prev
  })

  const maxValue = data ? (data[maxChannel.id as keyof DeviceData] as number) || 0 : 0

  // Prepare chart option
  const getOption = () => {
    const xAxisData = channels.map(c => c.name)
    const seriesData = channels.map(c => {
      const value = data ? (data[c.id as keyof DeviceData] as number) || 0 : 0
      return {
        value,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: c.color },
              { offset: 1, color: `${c.color}40` } // Fade to transparency
            ]
          },
          borderRadius: [4, 4, 0, 0]
        }
      }
    })

    return {
      grid: {
        top: 5,
        right: 0,
        bottom: 0,
        left: 0,
        containLabel: false
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
            type: 'none' // Hide axis pointer line for cleaner look
        },
        formatter: (params: any) => {
          const param = params[0]
          const channel = channels[param.dataIndex]
          return `
            <div class="font-bold">${channel.label} (${channel.name}nm)</div>
            <div>Value: ${param.value}</div>
          `
        }
      },
      xAxis: {
        type: 'category',
        data: xAxisData,
        show: false, // Hide x axis
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        show: false, // Hide y axis
        splitLine: { show: false }
      },
      series: [
        {
          type: 'bar',
          barWidth: '60%',
          data: seriesData,
          showBackground: true,
          backgroundStyle: {
            color: 'rgba(240, 240, 240, 0.2)',
            borderRadius: [4, 4, 0, 0]
          },
          // Add a smooth line on top for the "trend" look from reference
          // Using a separate line series for the smooth curve effect
        },
        {
            type: 'line',
            data: seriesData.map(d => d.value),
            smooth: true,
            symbol: 'none',
            lineStyle: {
                width: 2,
                color: '#e879f9' // Pinkish purple line
            },
            areaStyle: {
                color: {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                        { offset: 0, color: 'rgba(232, 121, 249, 0.2)' },
                        { offset: 1, color: 'rgba(232, 121, 249, 0.05)' }
                    ]
                }
            }
        }
      ]
    }
  }

  return (
    <Card className="w-full min-w-[300px] max-w-[400px] rounded-3xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-all bg-white">
      <CardContent className="p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-4xl font-bold text-foreground mb-1">
              {maxValue}
              <span className="text-lg font-normal text-muted-foreground ml-1">µmol</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-pink-50/50 text-pink-600 border-pink-100 rounded-full px-2 py-0.5 text-[10px] font-medium">
                Spectral
              </Badge>
              <span className="text-xs text-muted-foreground">实时监测</span>
            </div>
          </div>
          {/* Circular Icon Badge similar to reference */}
          <div className="size-8 rounded-full bg-pink-400 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-pink-400/20">
            S
          </div>
        </div>

        <div className="h-20 w-full relative">
          <ReactECharts 
            option={getOption()} 
            style={{ height: '100%', width: '100%' }} 
            opts={{ renderer: 'svg' }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
