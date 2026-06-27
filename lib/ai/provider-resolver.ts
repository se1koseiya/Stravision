/**
 * AI 提供商解析器
 * 供 /api/chat/route.ts 等后端使用
 * 根据模型 ID 或提供商 ID 解析出对应的 baseUrl、apiKey 等信息
 */

import fs from 'fs/promises'
import path from 'path'
import type { AIProvider, ProviderModel } from '@/app/api/admin/ai-providers/route'

const CONFIG_PATH = path.join(process.cwd(), 'data', 'ai-providers-config.json')

// ====== 内部类型 ======

export interface ResolvedProvider {
  providerId: string
  providerName: string
  type: AIProvider['type']
  baseUrl: string        // 已处理过的完整 URL（含 /v1/chat/completions）
  apiKey: string         // 完整 apiKey（仅服务端使用）
  model: string          // 最终使用的 model ID
  modelInfo: ProviderModel | undefined
}

// ====== 读取配置（内部使用，返回完整信息含 apiKey）======

// 扩展配置：包含 admin 设置的默认模型 ID
export interface ProvidersConfig {
  providers: AIProvider[]
  /** admin 后台配置的默认/自动选择模型 ID（可选） */
  defaultModelId?: string
}

export async function readProvidersConfig(): Promise<ProvidersConfig> {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8')
    const parsed = JSON.parse(data) as ProvidersConfig
    // 兼容老配置：未设置 defaultModelId 时不抛错
    return parsed
  } catch {
    // 返回空配置
    return { providers: [] }
  }
}

/**
 * 解析默认/自动选择的模型 ID
 * 优先级：admin 配置 > 默认 provider 的第一个 enabled 模型 > 第一个 enabled 模型的 ID
 * 若配置无效（model 不存在或被禁用）则回退到下一级
 */
export function resolveDefaultModelId(config: ProvidersConfig): string | null {
  // 1) admin 配置的 defaultModelId
  if (config.defaultModelId) {
    for (const p of config.providers) {
      if (!p.enabled) continue
      for (const m of p.models) {
        if (m.id === config.defaultModelId && m.enabled) {
          return m.id
        }
      }
    }
  }

  // 2) 默认 provider 的第一个 enabled 模型
  const sorted = [...config.providers].sort((a, b) => a.priority - b.priority)
  for (const p of sorted) {
    if (!p.enabled) continue
    for (const m of p.models) {
      if (m.enabled) return m.id
    }
  }
  return null
}

/**
 * 根据模型 ID 查找所属提供商并解析连接信息
 *
 * @param modelId - 用户选择的模型 ID（如 "qwen3.6-plus", "gpt-4o"）
 * @param userApiKey - 用户自定义的 API Key（可选）
 * @param userApiUrl - 用户自定义的 API URL（可选）
 */
export async function resolveProvider(
  modelId: string,
  userApiKey?: string,
  userApiUrl?: string,
): Promise<ResolvedProvider | null> {
  const config = await readProvidersConfig()

  // 1. 如果用户提供了自定义 apiKey/apiUrl，直接使用（原有逻辑）
  if (userApiKey || userApiUrl) {
    return resolveFromUserConfig(modelId, userApiKey, userApiUrl)
  }

  // 2. 从已配置的提供商中查找该模型
  for (const provider of config.providers.sort((a, b) => a.priority - b.priority)) {
    if (!provider.enabled || !provider.apiKey) continue

    const foundModel = provider.models.find(m => m.id === modelId && m.enabled)
    if (foundModel) {
      const baseUrl = normalizeBaseUrl(provider.baseUrl, provider.type)
      return {
        providerId: provider.id,
        providerName: provider.name,
        type: provider.type,
        baseUrl,
        apiKey: provider.apiKey,
        model: modelId,
        modelInfo: foundModel,
      }
    }
  }

  // 3. 未找到匹配 → 回退到系统环境变量（SYSTEM_OPENAI_*）
  const systemKey = process.env.SYSTEM_OPENAI_API_KEY || ''
  const systemBase = process.env.SYSTEM_OPENAI_BASE_URL || ''
  if (systemKey && systemBase) {
    return {
      providerId: 'system',
      providerName: '系统默认',
      type: 'openai',
      baseUrl: normalizeBaseUrl(systemBase, 'openai'),
      apiKey: systemKey,
      model: modelId,
      modelInfo: undefined,
    }
  }

  return null
}

/**
 * 使用用户自配置的 apiKey/apiUrl 解析
 */
function resolveFromUserConfig(
  modelId: string,
  userApiKey?: string,
  userApiUrl?: string,
): ResolvedProvider | null {
  if (!userApiKey) return null

  let url = normalizeOpenAIChatCompletionsUrl(userApiUrl)

  // 如果用户只给了 key 没 url，尝试用系统默认
  if (!url) {
    const systemBase = process.env.SYSTEM_OPENAI_BASE_URL || ''
    url = normalizeBaseUrl(systemBase, 'openai')
  }

  if (!url) return null

  return {
    providerId: 'user-custom',
    providerName: '用户自定义',
    type: detectTypeFromUrl(url),
    baseUrl: url,
    apiKey: userApiKey,
    model: modelId,
    modelInfo: undefined,
  }
}

/**
 * 规范化 URL：确保以 /v1/chat/completions 结尾
 */
export function normalizeBaseUrl(rawUrl: string, type: AIProvider['type']): string {
  let s = (rawUrl || '').trim()
  if (!s) return s

  // 去除尾部斜杠
  s = s.replace(/\/+$/, '')

  // DashScope 类型默认用 compatible-mode
  if (type === 'dashscope' && !s.includes('compatible-mode')) {
    if (/\/v1$/.test(s)) {
      return `${s}/chat/completions`
    }
    return `${s}/v1/chat/completions`
  }

  // OpenAI 兼容格式
  if (/\/chat\/completions$/.test(s)) return s
  if (/\/v1$/.test(s)) return `${s}/chat/completions`
  if (/^https?:\/\/[\w.-]+(?::\d+)?$/.test(s)) return `${s}/v1/chat/completions`
  return s
}

/** 兼容旧版 stripWrappingQuotes + normalize */
export function normalizeOpenAIChatCompletionsUrl(value: unknown): string {
  let s = String(value ?? '').trim()
  if (!s) return ''

  // 去除首尾引号/反引号
  s = s.replace(/^[`"']+/, '').replace(/[`"']+$/, '').trim()
  if (!s) return ''

  // 分离 query/hash
  const qIdx = s.indexOf('?')
  const hIdx = s.indexOf('#')
  const cut = qIdx === -1 ? hIdx : (hIdx === -1 ? qIdx : Math.min(qIdx, hIdx))
  const suffix = cut === -1 ? '' : s.slice(cut)
  s = cut === -1 ? s : s.slice(0, cut)

  s = s.replace(/\/+$/, '')
  if (/\/chat\/completions$/.test(s)) return s + suffix
  if (/\/v1$/.test(s)) return `${s}/chat/completions${suffix}`
  if (/^https?:\/\/[\w.-]+(?::\d+)?$/.test(s)) return `${s}/v1/chat/completions${suffix}`
  return s + suffix
}

/**
 * 从 URL 推断提供商类型
 */
function detectTypeFromUrl(url: string): AIProvider['type'] {
  if (url.includes('dashscope.aliyuncs.com')) return 'dashscope'
  return 'openai'
}

/**
 * 获取所有可用提供商的公开信息（不含 apiKey），用于前端展示
 */
export async function getPublicProviders() {
  const config = await readProvidersConfig()
  const defaultModelId = resolveDefaultModelId(config)

  return {
    providers: config.providers
      .filter(p => p.enabled)
      .map(p => ({
        id: p.id,
        name: p.name,
        type: p.type,
        isDefault: p.isDefault || false,
        models: p.models.filter(m => m.enabled).map(m => ({
          id: m.id,
          name: m.name,
          description: m.description,
          icon: m.icon,
          supportsVision: m.supportsVision,
          supportsReasoning: m.supportsReasoning,
        })),
      })),
    // admin 配置的默认模型 ID（如果配置无效则自动回退到第一个 enabled 模型）
    defaultModelId,
  }
}
