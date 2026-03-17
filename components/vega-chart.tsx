"use client"

import React, { useEffect, useRef } from 'react'
import embed from 'vega-embed'

interface VegaChartProps {
  spec: any
}

export default function VegaChart({ spec }: VegaChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current && spec) {
      // Clone spec to avoid mutation issues
      const specClone = JSON.parse(JSON.stringify(spec))
      
      // Ensure schema is correct for vega-lite
      if (!specClone.$schema) {
        specClone.$schema = "https://vega.github.io/schema/vega-lite/v5.json"
      }

      // Embed the chart
      embed(containerRef.current, specClone, {
        mode: 'vega-lite',
        actions: false, // Hide "Open in Vega Editor" actions
        renderer: 'svg' // Use SVG for better scaling
      }).catch(err => {
        console.error('Vega Embed Error:', err)
      })
    }
  }, [spec])

  return <div ref={containerRef} className="w-full h-full flex items-center justify-center" />
}