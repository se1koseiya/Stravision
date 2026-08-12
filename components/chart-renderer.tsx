"use client"

import React from 'react'
import dynamic from 'next/dynamic'

/**
 * ChartRenderer — renders AI-generated charts using @ant-design/plots.
 *
 * Expected option format (simple, declarative):
 * {
 *   type: 'line' | 'bar' | 'area' | 'pie',
 *   data: [{ name: '...', value: 0 }, ...],
 *   xField?: 'name',   // defaults to 'name'
 *   yField?: 'value',  // defaults to 'value'
 *   colorField?: 'category',  // for grouped/pie charts
 *   title?: '可选标题'
 * }
 *
 * Legacy echarts option objects are auto-detected and best-effort converted.
 */

const LineChart  = dynamic(() => import('@ant-design/plots').then(m => m.Line),  { ssr: false })
const AreaChart  = dynamic(() => import('@ant-design/plots').then(m => m.Area),  { ssr: false })
const BarChart   = dynamic(() => import('@ant-design/plots').then(m => m.Column), { ssr: false })
const PieChart   = dynamic(() => import('@ant-design/plots').then(m => m.Pie),   { ssr: false })

interface ChartRendererProps {
  options: any
  type?: 'echarts' | 'vega-lite' // legacy — ignored, auto-detected
  style?: React.CSSProperties
  className?: string
}

/** Convert legacy echarts option to plots format */
function convertEchartsOption(opt: any): { type: string; data: any[]; xField?: string; yField?: string; colorField?: string } {
  // Already in plots format
  if (opt.type && opt.data) return opt

  const series = opt.series?.[0]
  if (!series) return { type: 'bar', data: [] }

  const xData = opt.xAxis?.data || []
  const yData = series.data || []
  const type = series.type === 'line' ? 'line' : series.type === 'pie' ? 'pie' : 'bar'
  const data = xData.map((x: any, i: number) => ({ name: x, value: yData[i] }))

  return { type, data, xField: 'name', yField: 'value' }
}

export default function ChartRenderer({ options, style, className }: ChartRendererProps) {
  const config = convertEchartsOption(options)
  const { type, data, xField = 'name', yField = 'value', colorField } = config

  const containerStyle = { width: '100%', height: '400px', ...style }

  if (!data || data.length === 0) {
    return <div className={className} style={containerStyle} />
  }

  if (type === 'pie') {
    return (
      <div className={className} style={containerStyle}>
        <PieChart
          data={data}
          colorField={colorField || 'name'}
          angleField={yField}
          autoFit
        />
      </div>
    )
  }

  if (type === 'area') {
    return (
      <div className={className} style={containerStyle}>
        <AreaChart
          data={data}
          xField={xField}
          yField={yField}
          shape="smooth"
          autoFit
        />
      </div>
    )
  }

  if (type === 'line') {
    return (
      <div className={className} style={containerStyle}>
        <LineChart
          data={data}
          xField={xField}
          yField={yField}
          shape="smooth"
          point={{ style: { fill: '#1677ff', r: 3 } }}
          autoFit
        />
      </div>
    )
  }

  // default: bar (Column)
  return (
    <div className={className} style={containerStyle}>
      <BarChart
        data={data}
        xField={xField}
        yField={yField}
        autoFit
      />
    </div>
  )
}
