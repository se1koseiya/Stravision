"use client"

import React, { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

interface MermaidChartProps {
  chart: string
}

const MermaidChart: React.FC<MermaidChartProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit',
    })
  }, [])

  useEffect(() => {
    const renderChart = async () => {
      if (!containerRef.current || !chart) return

      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
        const { svg } = await mermaid.render(id, chart)
        setSvg(svg)
      } catch (error) {
        console.error('Mermaid render error:', error)
        setSvg(`<div class="text-red-500 p-2 border border-red-200 rounded bg-red-50 text-sm">Failed to render chart</div>`)
      }
    }

    renderChart()
  }, [chart])

  return (
    <div 
      ref={containerRef}
      className="my-4 w-full overflow-x-auto bg-white rounded-lg p-4 border border-gray-100"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

export default MermaidChart