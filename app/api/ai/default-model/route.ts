import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { readProvidersConfig, resolveDefaultModelId } from '@/lib/ai/provider-resolver'

export const dynamic = 'force-dynamic'

/**
 * GET /api/ai/default-model
 * 任意已登录用户可读：返回 adminUI 配置的默认模型 + 可用模型列表
 * - modelId: 解析后的有效默认模型 ID（admin 设的或自动选的）
 * - models: admin 启用的 provider 下的启用模型（id/label/providerName）
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const config = await readProvidersConfig()
  const modelId = resolveDefaultModelId(config)

  // 构建安全的模型列表（不暴露 baseUrl/apiKey）
  const models = config.providers.flatMap((p) =>
    p.enabled
      ? p.models
          .filter((m) => m.enabled)
          .map((m) => ({
            id: m.id,
            label: m.name || m.id,
            providerName: p.name,
          }))
      : []
  )

  return NextResponse.json({ modelId, models })
}
