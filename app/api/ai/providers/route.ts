import { NextResponse } from 'next/server'
import { getPublicProviders } from '@/lib/ai/provider-resolver'

/**
 * 公开接口：获取可用 AI 提供商列表（不含敏感信息）
 * 前端 DynamicModelSelector 等组件使用
 */
export async function GET() {
  try {
    const data = await getPublicProviders()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[AI Providers Public] Error:', error)
    return NextResponse.json({ providers: [], defaultModelId: null })
  }
}
