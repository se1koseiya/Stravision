import { NextResponse } from 'next/server'
import { getPublishedMCPServers, seedMCPServers } from '@/lib/db/mcp-server-service'

export async function GET() {
  try {
    let servers = await getPublishedMCPServers()
    
    // Seed if empty
    if (servers.length === 0) {
      await seedMCPServers()
      servers = await getPublishedMCPServers()
    }
    
    return NextResponse.json(servers)
  } catch (error: any) {
    console.error('[MCPStore API] Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
