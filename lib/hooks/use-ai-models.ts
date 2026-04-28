import { useState, useEffect } from 'react'

export interface AIModel {
  id: string
  name: string
  description: string
  category: string
  icon: string
  enabled: boolean
  order: number
}

export interface Category {
  id: string
  name: string
  order: number
}

export interface ModelsConfig {
  models: AIModel[]
  categories: Category[]
}

export function useAIModels() {
  const [config, setConfig] = useState<ModelsConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchModels()
  }, [])

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/admin/ai-models')
      if (!res.ok) throw new Error('Failed to fetch models')
      const data = await res.json()
      setConfig(data)
      setError(null)
    } catch (err) {
      console.error('[useAIModels] Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const getEnabledModels = () => {
    if (!config) return []
    return config.models
      .filter(m => m.enabled)
      .sort((a, b) => a.order - b.order)
  }

  const getModelsByCategory = (categoryId: string) => {
    if (!config) return []
    return config.models
      .filter(m => m.enabled && m.category === categoryId)
      .sort((a, b) => a.order - b.order)
  }

  const getCategories = () => {
    if (!config) return []
    return config.categories.sort((a, b) => a.order - b.order)
  }

  return {
    config,
    loading,
    error,
    getEnabledModels,
    getModelsByCategory,
    getCategories,
    refetch: fetchModels
  }
}
