import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'
import { getCurrentUser } from '@/lib/auth'
import {
  DEFAULT_KNOWLEDGE_CONFIG,
  type KnowledgeConfig
} from '@/lib/ai/provider-resolver'

const CONFIG_PATH = path.join(process.cwd(), 'data', 'ai-providers-config.json')

// ====== 类型定义 ======

export interface ProviderModel {
  id: string
  name: string
  description?: string
  icon?: string        // qwen, deepseek, openai, xiaomi, sparkles, zhipu 等
  enabled: boolean
  supportsVision: boolean
  supportsReasoning: boolean
  supportsEmbedding?: boolean   // 是否可作为 embedding 模型（可选；不设置则按 id 启发式判断）
  maxTokens?: number
  contextWindow?: number
}

export interface EmbeddingConfig {
  /** 启用的 provider id (来自 providers 列表) */
  providerId: string
  /** 选定的 embedding 模型 id (必须属于上面那个 provider 且 supportsEmbedding=true) */
  model: string
  /** 向量维度（部分模型可选；不指定则使用模型默认） */
  dimension?: number
  /** 是否启用（admin 总开关） */
  enabled: boolean
}

export interface AIProvider {
  id: string                    // 唯一标识，如 "dashscope", "openai", "xiaomi-mimo", "zhipu-glm"
  name: string                  // 显示名称，如 "阿里云百炼 (DashScope)", "OpenAI", "小米 MIMO", "智谱 GLM (BigModel)"
  type: 'openai' | 'dashscope' | 'custom' | 'glm'   // API 协议类型，glm = 智谱 BigModel（OpenAI 兼容但 URL 路径为 /api/paas/v4）
  baseUrl: string               // API 基础 URL（不含 /chat/completions）
  apiKey: string                // API Key
  models: ProviderModel[]       // 该提供商下的模型列表
  enabled: boolean              // 是否启用
  isDefault?: boolean           // 是否为默认提供商
  priority: number              // 优先级，数字越小越优先
  createdAt?: string
  updatedAt?: string
}

export interface ProvidersConfig {
  providers: AIProvider[]
  /** admin 后台配置的默认/自动选择模型 ID（可选） */
  defaultModelId?: string
  /** 知识库 embedding 配置（admin 可选） */
  embeddingConfig?: EmbeddingConfig
  /** 知识库全局配置（admin 可选） */
  knowledgeConfig?: KnowledgeConfig
}

// ====== 默认配置 ======

const DEFAULT_CONFIG: ProvidersConfig = {
  providers: [
    {
      id: 'dashscope',
      name: '阿里云百炼 (DashScope)',
      type: 'dashscope',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      apiKey: '',
      models: [
        { id: 'qwen3.6-plus', name: 'Qwen3.6-Plus', description: '通用增强模型，支持视觉', icon: 'qwen', enabled: true, supportsVision: true, supportsReasoning: false },
        { id: 'qwen-vl-plus', name: 'Qwen-VL-Plus', description: '视觉语言模型', icon: 'qwen', enabled: true, supportsVision: true, supportsReasoning: false },
        { id: 'deepseek-v3.2', name: 'DeepSeek V3.2', description: '推理增强模型', icon: 'deepseek', enabled: true, supportsVision: false, supportsReasoning: true },
        { id: 'qwen-plus', name: 'Qwen-Plus', description: '通用对话模型', icon: 'qwen', enabled: true, supportsVision: false, supportsReasoning: false },
        // Embedding 模型
        { id: 'text-embedding-v3', name: 'Text-Embedding-v3', description: '通义千问文本向量模型，1024 维，多语言', icon: 'qwen', enabled: true, supportsVision: false, supportsReasoning: false, supportsEmbedding: true, contextWindow: 8192 },
        { id: 'text-embedding-v2', name: 'Text-Embedding-v2', description: '通义千问文本向量模型 v2，1536 维', icon: 'qwen', enabled: true, supportsVision: false, supportsReasoning: false, supportsEmbedding: true, contextWindow: 2048 },
      ],
      enabled: true,
      isDefault: true,
      priority: 1,
    },
    {
      // 智谱 AI BigModel 开放平台（OpenAI 兼容，URL 路径 /api/paas/v4）
      // 文档：https://docs.bigmodel.cn/cn/api/introduction
      id: 'zhipu-glm',
      name: '智谱 GLM (BigModel)',
      type: 'glm',
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      apiKey: '',
      models: [
        // 旗舰/通用
        { id: 'glm-4.6',           name: 'GLM-4.6',         description: '最新旗舰，200K 上下文，支持思考模式',          icon: 'zhipu', enabled: true,  supportsVision: false, supportsReasoning: true,  contextWindow: 200000 },
        { id: 'glm-4.5',           name: 'GLM-4.5',         description: '智能体基础模型，128K 上下文',                  icon: 'zhipu', enabled: true,  supportsVision: false, supportsReasoning: true,  contextWindow: 128000 },
        { id: 'glm-4.5-air',       name: 'GLM-4.5-Air',     description: '轻量智能体模型，性价比高',                      icon: 'zhipu', enabled: true,  supportsVision: false, supportsReasoning: true,  contextWindow: 128000 },
        { id: 'glm-4.5-airx',      name: 'GLM-4.5-AirX',    description: 'Air 高速版，更快响应',                          icon: 'zhipu', enabled: true,  supportsVision: false, supportsReasoning: true,  contextWindow: 8000 },
        { id: 'glm-4.5-flash',     name: 'GLM-4.5-Flash',   description: '免费超快模型，适合简单任务',                    icon: 'zhipu', enabled: true,  supportsVision: false, supportsReasoning: false, contextWindow: 128000 },
        { id: 'glm-4-plus',        name: 'GLM-4-Plus',      description: '上一代旗舰，综合能力强',                        icon: 'zhipu', enabled: true,  supportsVision: false, supportsReasoning: false, contextWindow: 128000 },
        { id: 'glm-4-air-250414',  name: 'GLM-4-Air-250414',description: 'Air 最新版本',                                  icon: 'zhipu', enabled: true,  supportsVision: false, supportsReasoning: false, contextWindow: 128000 },
        { id: 'glm-4-airx',        name: 'GLM-4-AirX',      description: 'Air 高速版',                                    icon: 'zhipu', enabled: true,  supportsVision: false, supportsReasoning: false, contextWindow: 8000 },
        { id: 'glm-4-long',        name: 'GLM-4-Long',      description: '超长上下文 1M',                                  icon: 'zhipu', enabled: true,  supportsVision: false, supportsReasoning: false, contextWindow: 1000000 },
        { id: 'glm-4-flash-250414',name: 'GLM-4-Flash-250414',description: '免费快速模型',                                 icon: 'zhipu', enabled: true,  supportsVision: false, supportsReasoning: false, contextWindow: 128000 },
        // 视觉
        { id: 'glm-4v-plus',       name: 'GLM-4V-Plus',     description: '视觉语言模型，支持图像理解',                    icon: 'zhipu', enabled: true,  supportsVision: true,  supportsReasoning: false, contextWindow: 8000 },
        { id: 'glm-4v-flash',      name: 'GLM-4V-Flash',    description: '免费视觉模型',                                  icon: 'zhipu', enabled: true,  supportsVision: true,  supportsReasoning: false, contextWindow: 8000 },
        // 推理 / 思考
        { id: 'glm-zero-preview',  name: 'GLM-Zero-Preview',description: '强化推理模型，复杂任务专用',                    icon: 'zhipu', enabled: true,  supportsVision: false, supportsReasoning: true,  contextWindow: 16000 },
        // Embedding 模型
        { id: 'embedding-2',       name: 'Embedding-2',     description: '智谱文本向量模型，1024 维',                    icon: 'zhipu', enabled: true,  supportsVision: false, supportsReasoning: false, supportsEmbedding: true, contextWindow: 8192 },
        { id: 'embedding-3',       name: 'Embedding-3',     description: '智谱文本向量模型 v3，2048 维，更高精度',        icon: 'zhipu', enabled: true,  supportsVision: false, supportsReasoning: false, supportsEmbedding: true, contextWindow: 8192 },
      ],
      enabled: true,
      isDefault: false,
      priority: 2,
    }
  ],
  // 默认自动选择第一个 provider 的第一个模型
  defaultModelId: 'qwen3.6-plus',
  // 默认 embedding 配置：使用 DashScope 的 text-embedding-v3
  embeddingConfig: {
    providerId: 'dashscope',
    model: 'text-embedding-v3',
    dimension: 1024,
    enabled: true,
  },
  // 默认知识库行为配置
  knowledgeConfig: DEFAULT_KNOWLEDGE_CONFIG,
}

// ====== 工具函数 ======

async function ensureDataDir() {
  const dataDir = path.dirname(CONFIG_PATH)
  await fs.mkdir(dataDir, { recursive: true })
}

async function readConfig(): Promise<ProvidersConfig> {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8')
    return JSON.parse(data)
  } catch {
    return DEFAULT_CONFIG
  }
}

async function saveConfig(config: ProvidersConfig): Promise<void> {
  await ensureDataDir()
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

// ====== 权限检查 ======

async function checkAdminAuth(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return null
  }
  return user
}

// ====== API 路由 ======

// GET - 获取所有提供商配置（脱敏 apiKey）
export async function GET(request: NextRequest) {
  const user = await checkAdminAuth(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const config = await readConfig()

  // 脱敏：隐藏完整 apiKey，只显示前4位和后4位
  const maskedProviders = config.providers.map(p => ({
    ...p,
    apiKey: p.apiKey ? `${p.apiKey.slice(0, 4)}${'*'.repeat(Math.max(0, p.apiKey.length - 8))}${p.apiKey.slice(-4)}` : '',
  }))

  return NextResponse.json({
    providers: maskedProviders,
    defaultModelId: config.defaultModelId ?? null,
    embeddingConfig: config.embeddingConfig ?? null,
    knowledgeConfig: config.knowledgeConfig ?? DEFAULT_KNOWLEDGE_CONFIG,
  })
}

// POST - 创建新提供商
export async function POST(request: NextRequest) {
  const user = await checkAdminAuth(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // 验证必填字段
    if (!body.id || !body.name || !body.baseUrl || !body.models || !Array.isArray(body.models)) {
      return NextResponse.json({ error: 'Missing required fields: id, name, baseUrl, models' }, { status: 400 })
    }

    const config = await readConfig()

    // 检查 ID 是否已存在
    if (config.providers.some(p => p.id === body.id)) {
      return NextResponse.json({ error: `Provider "${body.id}" already exists` }, { status: 409 })
    }

    const newProvider: AIProvider = {
      id: body.id,
      name: body.name,
      type: body.type || 'openai',
      baseUrl: body.baseUrl,
      apiKey: body.apiKey || '',
      models: body.models.map((m: any) => ({
        id: m.id,
        name: m.name,
        description: m.description || '',
        icon: m.icon || 'sparkles',
        enabled: m.enabled !== false,
        supportsVision: !!m.supportsVision,
        supportsReasoning: !!m.supportsReasoning,
        maxTokens: m.maxTokens,
        contextWindow: m.contextWindow,
      })),
      enabled: body.enabled !== false,
      isDefault: body.isDefault || false,
      priority: body.priority ?? config.providers.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // 如果设为默认，取消其他默认
    if (newProvider.isDefault) {
      config.providers.forEach(p => { p.isDefault = false })
    }

    config.providers.push(newProvider)
    await saveConfig(config)

    console.log(`[AI Providers] Created provider: ${newProvider.id} (${newProvider.name})`)
    return NextResponse.json({ success: true, provider: newProvider })
  } catch (error: any) {
    console.error('[AI Providers] POST error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create provider' }, { status: 500 })
  }
}

// PUT - 更新提供商
export async function PUT(request: NextRequest) {
  const user = await checkAdminAuth(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: 'Missing provider id' }, { status: 400 })
    }

    const config = await readConfig()
    const index = config.providers.findIndex(p => p.id === body.id)

    if (index === -1) {
      return NextResponse.json({ error: `Provider "${body.id}" not found` }, { status: 404 })
    }

    const existing = config.providers[index]

    // 合并更新（apiKey 如果传的是脱敏后的值则保留原值）
    const updatedProvider: AIProvider = {
      ...existing,
      ...body,
      // apiKey 只有非脱敏格式才更新（脱敏后包含 ***）
      apiKey: (body.apiKey && !body.apiKey.includes('***')) ? body.apiKey : existing.apiKey,
      models: body.models ? body.models.map((m: any) => ({
        ...existing.models.find(em => em.id === m.id),
        ...m,
      })) : existing.models,
      updatedAt: new Date().toISOString(),
    }

    // 如果设为默认，取消其他默认
    if (updatedProvider.isDefault) {
      config.providers.forEach(p => { p.isDefault = false })
    }

    config.providers[index] = updatedProvider
    await saveConfig(config)

    console.log(`[AI Providers] Updated provider: ${updatedProvider.id}`)
    return NextResponse.json({ success: true, provider: updatedProvider })
  } catch (error: any) {
    console.error('[AI Providers] PUT error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update provider' }, { status: 500 })
  }
}

// DELETE - 删除提供商
export async function DELETE(request: NextRequest) {
  const user = await checkAdminAuth(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing provider id parameter' }, { status: 400 })
    }

    const config = await readConfig()
    const index = config.providers.findIndex(p => p.id === id)

    if (index === -1) {
      return NextResponse.json({ error: `Provider "${id}" not found` }, { status: 404 })
    }

    const removed = config.providers.splice(index, 1)[0]
    await saveConfig(config)

    console.log(`[AI Providers] Deleted provider: ${removed.id} (${removed.name})`)
    return NextResponse.json({ success: true, deleted: removed.id })
  } catch (error: any) {
    console.error('[AI Providers] DELETE error:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete provider' }, { status: 500 })
  }
}

// PATCH - 更新 embedding 配置 / defaultModelId
export async function PATCH(request: NextRequest) {
  const user = await checkAdminAuth(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const config = await readConfig()

    if ('defaultModelId' in body) {
      config.defaultModelId = body.defaultModelId
    }
    if ('embeddingConfig' in body) {
      const ec = body.embeddingConfig
      if (ec === null) {
        config.embeddingConfig = undefined
      } else if (ec && typeof ec === 'object') {
        if (ec.enabled && (!ec.providerId || !ec.model)) {
          return NextResponse.json({ error: 'embeddingConfig.enabled 为 true 时必须提供 providerId 和 model' }, { status: 400 })
        }
        config.embeddingConfig = {
          providerId: String(ec.providerId || ''),
          model: String(ec.model || ''),
          dimension: ec.dimension ? Number(ec.dimension) : undefined,
          enabled: !!ec.enabled
        }
        // 校验：必须能在 providers 中找到
        if (config.embeddingConfig.enabled) {
          const p = config.providers.find(x => x.id === config.embeddingConfig!.providerId)
          if (!p) {
            return NextResponse.json({ error: `Provider "${config.embeddingConfig.providerId}" 不存在` }, { status: 400 })
          }
          if (!p.apiKey) {
            return NextResponse.json({ error: `Provider "${p.name}" 尚未配置 API Key` }, { status: 400 })
          }
          const m = p.models.find(x => x.id === config.embeddingConfig!.model)
          if (!m) {
            return NextResponse.json({ error: `模型 "${config.embeddingConfig.model}" 在 Provider "${p.name}" 中不存在` }, { status: 400 })
          }
        }
      }
    }
    if ('knowledgeConfig' in body) {
      // 知识库配置：深合并到当前配置
      const kc = body.knowledgeConfig
      if (kc === null) {
        config.knowledgeConfig = undefined
      } else if (kc && typeof kc === 'object') {
        const current = config.knowledgeConfig || DEFAULT_KNOWLEDGE_CONFIG
        config.knowledgeConfig = mergeKnowledgeConfig(current, kc)
      }
    }
    await saveConfig(config)
    return NextResponse.json({ success: true, config: {
      defaultModelId: config.defaultModelId,
      embeddingConfig: config.embeddingConfig,
      knowledgeConfig: config.knowledgeConfig || DEFAULT_KNOWLEDGE_CONFIG
    } })
  } catch (error: any) {
    console.error('[AI Providers] PATCH error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update config' }, { status: 500 })
  }
}

function isPlainObject(x: any): x is Record<string, any> {
  return !!x && typeof x === "object" && !Array.isArray(x)
}
function mergeKnowledgeConfig(base: any, override: any): any {
  if (!isPlainObject(override)) return base
  const result: Record<string, any> = { ...base }
  for (const k of Object.keys(override)) {
    const v = override[k]
    if (isPlainObject(v) && isPlainObject(base[k])) {
      result[k] = mergeKnowledgeConfig(base[k], v)
    } else if (v !== undefined && v !== null) {
      result[k] = v
    }
  }
  return result
}
