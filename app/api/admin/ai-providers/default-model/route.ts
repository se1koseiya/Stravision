import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'
import { getCurrentUser } from '@/lib/auth'
import { readProvidersConfig, resolveDefaultModelId } from '@/lib/ai/provider-resolver'
import type { ProvidersConfig } from '@/app/api/admin/ai-providers/route'

export const dynamic = 'force-dynamic'

const CONFIG_PATH = path.join(process.cwd(), 'data', 'ai-providers-config.json')

async function readFullConfig(): Promise<ProvidersConfig> {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8')
    return JSON.parse(data) as ProvidersConfig
  } catch {
    return { providers: [] }
  }
}

async function writeFullConfig(config: ProvidersConfig): Promise<void> {
  const dir = path.dirname(CONFIG_PATH)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

/**
 * GET /api/admin/ai-providers/default-model
 * 读取 admin 配置的默认模型 ID（自动回退到第一个 enabled 模型）
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const config = await readProvidersConfig()
  const resolved = resolveDefaultModelId(config)

  return NextResponse.json({
    configuredDefaultModelId: config.defaultModelId ?? null,
    effectiveDefaultModelId: resolved,
  })
}

/**
 * PUT /api/admin/ai-providers/default-model
 * 更新 admin 配置的默认模型 ID
 * body: { modelId: string | null }
 * - modelId 为 null 或空字符串表示清除配置（回退到自动）
 * - 验证 modelId 必须是某个 enabled provider 下的 enabled model
 */
export async function PUT(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const raw = (body?.modelId ?? '').toString()
    const modelId = raw.trim() === '' ? null : raw

    if (modelId) {
      // 校验：必须是某个 enabled provider 下的 enabled model
      const providers = await readProvidersConfig()
      const valid = providers.providers.some(
        p => p.enabled && p.models.some(m => m.id === modelId && m.enabled),
      )
      if (!valid) {
        return NextResponse.json(
          { error: `Model "${modelId}" is not in any enabled provider/model` },
          { status: 400 },
        )
      }
    }

    const config = await readFullConfig()
    config.defaultModelId = modelId || undefined
    await writeFullConfig(config)

    console.log(`[AI Providers] Updated defaultModelId = ${modelId || '(auto)'}`)
    return NextResponse.json({
      success: true,
      configuredDefaultModelId: config.defaultModelId ?? null,
      effectiveDefaultModelId: resolveDefaultModelId(config),
    })
  } catch (error: any) {
    console.error('[AI Providers] PUT default-model error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update default model' }, { status: 500 })
  }
}
