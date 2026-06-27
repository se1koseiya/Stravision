import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { getCurrentUser } from '@/lib/auth'

const CONFIG_PATH = path.join(process.cwd(), 'data', 'ai-providers-config.json')

// ====== 类型定义 ======

export interface ProviderModel {
  id: string
  name: string
  description?: string
  icon?: string        // qwen, deepseek, openai, xiaomi, sparkles 等
  enabled: boolean
  supportsVision: boolean
  supportsReasoning: boolean
  maxTokens?: number
  contextWindow?: number
}

export interface AIProvider {
  id: string                    // 唯一标识，如 "dashscope", "openai", "xiaomi-mimo"
  name: string                  // 显示名称，如 "阿里云百炼 (DashScope)", "OpenAI", "小米 MIMO"
  type: 'openai' | 'dashscope' | 'custom'   // API 协议类型
  baseUrl: string               // API 基础 URL（不含 /v1/chat/completions）
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
      ],
      enabled: true,
      isDefault: true,
      priority: 1,
    }
  ],
  // 默认自动选择第一个 provider 的第一个模型
  defaultModelId: 'qwen3.6-plus',
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
