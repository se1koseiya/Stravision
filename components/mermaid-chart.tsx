"use client"

import React, { useEffect, useRef, useState } from 'react'

interface MermaidChartProps {
  chart: string
}

const MermaidChart: React.FC<MermaidChartProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [mermaidInstance, setMermaidInstance] = useState<any>(null)

  useEffect(() => {
    // Dynamically import mermaid only on the client
    const initMermaid = async () => {
      const { default: mermaid } = await import('mermaid')
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'strict',
        fontFamily: 'inherit',
      })
      setMermaidInstance(mermaid)
    }

    initMermaid()
  }, [])

  useEffect(() => {
    const renderChart = async () => {
      if (!containerRef.current || !chart || !mermaidInstance) return

      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
        const { svg } = await mermaidInstance.render(id, chart)
        setSvg(svg)
      } catch (error) {
        console.error('Mermaid render error:', error)
        setSvg(`<div class="text-red-500 p-2 border border-red-200 rounded bg-red-50 text-sm">Failed to render chart</div>`)
      }
    }

    renderChart()
  }, [chart, mermaidInstance])

  return (
    <div 
      ref={containerRef}
      className="my-4 w-full overflow-x-auto bg-white rounded-lg p-4 border border-gray-100"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

export default MermaidChart