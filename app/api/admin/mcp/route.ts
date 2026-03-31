import { NextResponse } from 'next/server'
import { getAllMCPServers, createMCPServer } from '@/lib/db/mcp-server-service'

export async function GET() {
  try {
    const servers = await getAllMCPServers()
    return NextResponse.json(servers)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const server = await createMCPServer(body)
    return NextResponse.json(server)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
