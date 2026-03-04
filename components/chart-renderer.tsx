"use client"

import React, { useEffect, useRef, useState } from 'react'
import ReactECharts from 'echarts-for-react'
// Dynamic import for Vega-Lite to avoid SSR issues and reduce initial bundle size
import dynamic from 'next/dynamic'

// Create a dynamic component for Vega Lite
const VegaLiteChart = dynamic(() => import('./vega-chart'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading chart...</div>
})

interface ChartRendererProps {
  options: any
  type?: 'echarts' | 'vega-lite'
  style?: React.CSSProperties
  className?: string
}

export default function ChartRenderer({ options, type = 'echarts', style, className }: ChartRendererProps) {
  
  if (type === 'vega-lite') {
    return (
      <div className={className} style={{ width: '100%', height: '400px', ...style }}>
         <VegaLiteChart spec={options} />
      </div>
    )
  }

  return (
    <div className={className} style={{ width: '100%', height: '400px', ...style }}>
      <ReactECharts 
        option={options} 
        style={{ width: '100%', height: '100%' }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  )
}
