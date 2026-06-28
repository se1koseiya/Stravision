import { NextResponse } from 'next/server'
import { updateMCPServer, deleteMCPServer } from '@/lib/db/mcp-server-service'
import { getCurrentUser } from '@/lib/auth'

// 统一 admin 授权校验：仅 admin / super_admin 可访问
async function requireAdmin() {
  const currentUser = await getCurrentUser()
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
    return null
  }
  return currentUser
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const updated = await updateMCPServer(params.id, body)
    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update MCP server' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  try {
    const deleted = await deleteMCPServer(params.id)
    return NextResponse.json({ success: deleted })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete MCP server' }, { status: 500 })
  }
}
