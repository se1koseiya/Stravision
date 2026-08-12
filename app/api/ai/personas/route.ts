import { NextResponse } from 'next/server'
import { listPersonas, getPersonaMeta, DEFAULT_PERSONA } from '@/lib/ai/persona-system'

export const dynamic = 'force-dynamic'

/**
 * GET /api/ai/personas
 * 获取所有可用 persona 列表（供前端切换 UI 使用）
 */
export async function GET() {
  return NextResponse.json({
    personas: listPersonas(),
    default: DEFAULT_PERSONA,
  })
}
