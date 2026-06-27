import { NextResponse } from 'next/server'
import { getPublishedMCPServers, seedMCPServers, backfillMCPServerPrompts } from '@/lib/db/mcp-server-service'

export async function GET() {
  try {
    let servers = await getPublishedMCPServers()

    // Seed if empty
    if (servers.length === 0) {
      await seedMCPServers()
      servers = await getPublishedMCPServers()
    } else {
      // 已有数据时回填缺失的 recommended_prompt（仅更新空字段，不覆盖 admin 已编辑）
      await backfillMCPServerPrompts()
    }

    return NextResponse.json(servers)
  } catch (error: any) {
    console.error('[MCPStore API] Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
