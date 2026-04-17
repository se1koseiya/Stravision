import { useState, useEffect } from "react"

export interface AIFeatureConfig {
  enableTaskList: boolean
  enableDeviceBento: boolean
  enableControlBento: boolean
  enableMonitor: boolean
  enableScheduledTasks: boolean
  enableChart: boolean
  enableSpectral: boolean
  enableReasoning: boolean
  enableSources: boolean
  enableToolUsed: boolean
  enableScheduleTask: boolean
  enableDeviceControl: boolean
  enableVisionInspection: boolean
  enableHTMLPreview: boolean
  enableWebPreview: boolean
}

const DEFAULT_CONFIG: AIFeatureConfig = {
  enableTaskList: true,
  enableDeviceBento: true,
  enableControlBento: true,
  enableMonitor: true,
  enableScheduledTasks: true,
  enableChart: true,
  enableSpectral: true,
  enableReasoning: true,
  enableSources: true,
  enableToolUsed: true,
  enableScheduleTask: true,
  enableDeviceControl: true,
  enableVisionInspection: true,
  enableHTMLPreview: true,
  enableWebPreview: true,
}

export function useAIFeatures() {
  const [config, setConfig] = useState<AIFeatureConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/ai-features")
      if (res.ok) {
        const data = await res.json()
        setConfig({ ...DEFAULT_CONFIG, ...data })
      }
    } catch (error) {
      console.error("Failed to fetch AI features config:", error)
    } finally {
      setLoading(false)
    }
  }

  return { config, loading, refetch: fetchConfig }
}
