import { useState, useEffect } from 'react'

export interface ProviderModel {
  id: string
  name: string
  description?: string
  icon?: string
  supportsVision: boolean
  supportsReasoning: boolean
}

export interface AIProvider {
  id: string
  name: string
  type: 'openai' | 'dashscope' | 'custom' | 'glm'
  isDefault: boolean
  models: ProviderModel[]
}

export interface AIModel {
  id: string
  name: string
  description: string
  category: string
  icon: string
  enabled: boolean
  order: number
  providerId?: string
  providerName?: string
  supportsVision?: boolean
  supportsReasoning?: boolean
}

export interface Category {
  id: string
  name: string
  order: number
}

export interface ModelsConfig {
  models: AIModel[]
  categories: Category[]
  providers?: AIProvider[]   // 新增：提供商列表
  /** admin 后台配置的默认/自动选择模型 ID（可选） */
  defaultModelId?: string | null
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
      // 并行请求：旧版模型配置 + 新版提供商配置
      const [modelsRes, providersRes] = await Promise.allSettled([
        fetch('/api/admin/ai-models'),
        fetch('/api/ai/providers'),
      ])

      let models: AIModel[] = []
      let categories: Category[] = []
      let providers: AIProvider[] = []
      let defaultModelId: string | null = null

      // 解析旧版模型配置（兼容）
      if (modelsRes.status === 'fulfilled' && modelsRes.value.ok) {
        const data = await modelsRes.value.json()
        models = data.models || []
        categories = data.categories || []
      }

      // 解析新版提供商配置
      if (providersRes.status === 'fulfilled' && providersRes.value.ok) {
        const pData = await providersRes.value.json()
        providers = pData.providers || []
        // admin 配置的默认模型 ID（自动回退到第一个 enabled 模型）
        defaultModelId = pData.defaultModelId ?? null

        // 如果有提供商数据，用提供商的模型补充/覆盖旧模型列表
        if (providers.length > 0) {
          const providerModels: AIModel[] = []
          for (const p of providers) {
            for (const m of p.models) {
              providerModels.push({
                id: m.id,
                name: m.name,
                description: m.description || '',
                category: p.id,       // 用 providerId 作为 category
                icon: m.icon || 'sparkles',
                enabled: true,
                order: 0,
                providerId: p.id,
                providerName: p.name,
                supportsVision: m.supportsVision,
                supportsReasoning: m.supportsReasoning,
              })
            }
          }
          // 合并：优先使用提供商数据，保留旧数据中不在提供商里的模型
          const providerModelIds = new Set(providerModels.map(m => m.id))
          const legacyOnlyModels = models.filter(m => !providerModelIds.has(m.id))
          models = [...providerModels, ...legacyOnlyModels]

          // 从提供商生成 categories
          categories = providers.map((p, i) => ({
            id: p.id,
            name: p.name,
            order: i,
          }))
        }
      }

      setConfig({ models, categories, providers, defaultModelId })
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

  // 新增：按提供商分组获取模型
  const getProviders = () => {
    if (!config?.providers) return []
    return config.providers
  }

  const getModelsByProvider = (providerId: string) => {
    if (!config) return []
    return config.models.filter(
      m => m.enabled && (m.providerId === providerId || m.category === providerId)
    )
  }

  // 获取默认提供商
  const getDefaultProvider = () => {
    return config?.providers?.find(p => p.isDefault) || config?.providers?.[0] || null
  }

  /**
   * 获取 admin 配置的默认/自动选择模型 ID
   * 优先级：admin 配置的 defaultModelId（且在 enabled 列表里） > 第一个 enabled provider 的第一个 enabled model
   * 返回 null 表示没有任何可用的 enabled 模型
   */
  const getDefaultModelId = (): string | null => {
    if (!config) return null
    const enabledIds = new Set(
      config.models.filter(m => m.enabled).map(m => m.id),
    )
    if (config.defaultModelId && enabledIds.has(config.defaultModelId)) {
      return config.defaultModelId
    }
    const first = config.models.find(m => m.enabled)
    return first?.id ?? null
  }

  return {
    config,
    loading,
    error,
    getEnabledModels,
    getModelsByCategory,
    getCategories,
    // 新增方法
    getProviders,
    getModelsByProvider,
    getDefaultProvider,
    getDefaultModelId,
    refetch: fetchModels
  }
}
