import { NextResponse } from 'next/server'
import { getAllMCPServers, createMCPServer } from '@/lib/db/mcp-server-service'
import { getCurrentUser } from '@/lib/auth'

// 统一 admin 授权校验：仅 admin / super_admin 可访问
async function requireAdmin() {
  const currentUser = await getCurrentUser()
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
    return null
  }
  return currentUser
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  try {
    const servers = await getAllMCPServers()
    return NextResponse.json(servers)
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch MCP servers' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const server = await createMCPServer(body)
    return NextResponse.json(server)
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create MCP server' }, { status: 500 })
  }
}
