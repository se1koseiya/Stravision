import { NextResponse } from 'next/server'
import { updateMCPServer, deleteMCPServer } from '@/lib/db/mcp-server-service'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const updated = await updateMCPServer(params.id, body)
    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const deleted = await deleteMCPServer(params.id)
    return NextResponse.json({ success: deleted })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
