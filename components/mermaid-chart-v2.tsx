"use client"

import React, { useEffect, useRef, useState } from 'react'

interface MermaidChartProps {
  chart: string
}

/**
 * Alternative Mermaid Chart component that uses a more stable approach
 * This version lazy-loads mermaid and handles module resolution issues better
 */
const MermaidChartV2: React.FC<MermaidChartProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    let mounted = true

    const renderChart = async () => {
      if (!containerRef.current || !chart) return

      try {
        // Dynamic import with better error handling
        const mermaidModule = await import('mermaid')
        const mermaid = mermaidModule.default

        // Initialize mermaid with configuration
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'inherit',
          logLevel: 'error',
        })

        // Generate unique ID
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        // Render the chart
        const { svg: renderedSvg } = await mermaid.render(id, chart)
        
        if (mounted) {
          setSvg(renderedSvg)
          setError('')
        }
      } catch (err) {
        console.error('Mermaid render error:', err)
        if (mounted) {
          setError('Failed to render diagram')
          setSvg('')
        }
      }
    }

    renderChart()

    return () => {
      mounted = false
    }
  }, [chart])

  if (error) {
    return (
      <div className="my-4 w-full p-4 border border-red-200 rounded-lg bg-red-50">
        <p className="text-red-600 text-sm font-medium">⚠️ {error}</p>
        <details className="mt-2">
          <summary className="text-xs text-red-500 cursor-pointer">Show diagram code</summary>
          <pre className="mt-2 text-xs text-gray-600 overflow-x-auto">{chart}</pre>
        </details>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className="my-4 w-full p-4 border border-gray-200 rounded-lg bg-gray-50">
        <p className="text-gray-500 text-sm">Loading diagram...</p>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className="my-4 w-full overflow-x-auto bg-white rounded-lg p-4 border border-gray-100"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

export default MermaidChartV2
