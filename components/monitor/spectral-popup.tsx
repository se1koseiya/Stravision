"use client"

import React, { useState } from 'react'
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

/** Lightweight SVG spectral chart — no chart library needed */
function SpectralChart({ values, colors, maxValue, height = 200 }: { values: number[]; colors: string[]; maxValue: number; height?: number }) {
  const W = 100, H = height, pad = 2
  const barW = (W - pad * (values.length + 1)) / values.length
  const safeMax = maxValue || 1
  const pts = values.map((v, i) => ({
    x: pad + i * (barW + pad) + barW / 2,
    y: H - (v / safeMax) * (H - 8) - 4,
  }))
  const linePath = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x},${p.y}`
    const prev = pts[i - 1]
    const cx = prev.x + (p.x - prev.x) / 2
    return `${acc} C ${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`
  }, "")
  const areaPath = `${linePath} L ${pts[pts.length - 1].x},${H} L ${pts[0].x},${H} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="spec-area-popup" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(232,121,249,0.2)" />
          <stop offset="100%" stopColor="rgba(232,121,249,0.02)" />
        </linearGradient>
      </defs>
      {pts.map((p, i) => (
        <rect key={i} x={pad + i * (barW + pad)} y={p.y} width={barW} height={H - p.y} rx={2} fill={colors[i]} opacity={0.85} />
      ))}
      <path d={areaPath} fill="url(#spec-area-popup)" />
      <path d={linePath} fill="none" stroke="#e879f9" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function SpectralPopup({ data }: SpectralPopupProps) {
  const [timeRange, setTimeRange] = useState("1h")

  const values = channels.map(c => data ? (data[c.id as keyof typeof data] as number) || 0 : 0)
  const colors = channels.map(c => c.color)
  const maxValue = Math.max(...values, 0)
  const hasData = values.some(v => v > 0)

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
            <SpectralChart values={values} colors={colors} maxValue={maxValue} height={200} />
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