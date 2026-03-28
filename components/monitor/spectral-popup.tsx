"use client"

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false })

interface SpectralPopupProps {
  data: {
    channel1?: number
    channel2?: number
    channel3?: number
    channel4?: number
    channel5?: number
    channel6?: number
    channel7?: number
    channel8?: number
    channel9?: number
    channel10?: number
    channel11?: number
  } | null
}

export function SpectralPopup({ data }: SpectralPopupProps) {
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
    const prevVal = data ? (data[prev.id as keyof typeof data] as number) || 0 : 0
    const currVal = data ? (data[current.id as keyof typeof data] as number) || 0 : 0
    return currVal > prevVal ? current : prev
  })

  const maxValue = data ? (data[maxChannel.id as keyof typeof data] as number) || 0 : 0

  // Check if we have any actual spectral data
  const hasData = channels.some(channel => {
    const value = data ? (data[channel.id as keyof typeof data] as number) : undefined
    return value !== undefined && value > 0
  })

  // Prepare chart option
  const getOption = () => {
    const xAxisData = channels.map(c => c.name)
    const seriesData = channels.map(c => {
      const value = data ? (data[c.id as keyof typeof data] as number) || 0 : 0
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
      animation: false,
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
            <div>数值: ${param.value}</div>
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
    <div className="w-full h-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-white/20 dark:border-slate-700 p-6 backdrop-blur-xl">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
              {hasData ? maxValue : "--"}
              <span className="text-xl font-normal text-slate-500 dark:text-slate-400 ml-1">µmol</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-pink-500/20 text-pink-600 border-pink-500/30 rounded-full px-3">
                光谱分析 (Spectral)
              </Badge>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="h-6 w-[80px] text-xs bg-transparent border-none focus:ring-0 p-0 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                    <SelectValue placeholder="范围" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="1h">1 小时</SelectItem>
                    <SelectItem value="1d">1 天</SelectItem>
                    <SelectItem value="7d">7 天</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Circular Icon Badge */}
          <div className="w-10 h-10 rounded-full bg-pink-400 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-pink-400/30">
            S
          </div>
        </div>

        {/* Chart or No Data Message */}
        <div className="flex-1 w-full relative">
          {hasData ? (
            <ReactECharts 
              option={getOption()} 
              style={{ height: '100%', width: '100%' }} 
              opts={{ renderer: 'svg' }}
              notMerge={true}
              lazyUpdate={false}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-500 dark:text-slate-400">
                <div className="text-2xl mb-2">📊</div>
                <div className="text-sm">暂无光谱数据</div>
                <div className="text-xs mt-1">等待设备连接...</div>
              </div>
            </div>
          )}
        </div>

        {/* Channel Info */}
        <div className="mt-4 grid grid-cols-6 gap-2 text-xs">
          {channels.slice(0, 6).map((channel) => {
            const value = data ? (data[channel.id as keyof typeof data] as number) || 0 : 0
            return (
              <div key={channel.id} className="text-center">
                <div 
                  className="w-3 h-3 rounded-full mx-auto mb-1" 
                  style={{ backgroundColor: channel.color }}
                />
                <div className="text-slate-600 dark:text-slate-400">{channel.name}nm</div>
                <div className="font-mono text-slate-900 dark:text-white">
                  {hasData ? value : "--"}
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-2 grid grid-cols-5 gap-2 text-xs">
          {channels.slice(6).map((channel) => {
            const value = data ? (data[channel.id as keyof typeof data] as number) || 0 : 0
            return (
              <div key={channel.id} className="text-center">
                <div 
                  className="w-3 h-3 rounded-full mx-auto mb-1" 
                  style={{ backgroundColor: channel.color }}
                />
                <div className="text-slate-600 dark:text-slate-400">{channel.name}</div>
                <div className="font-mono text-slate-900 dark:text-white">
                  {hasData ? value : "--"}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}