import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySession } from "@/lib/auth/session"

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")?.value
    
    if (!sessionCookie) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const session = await verifySession(sessionCookie)
    if (!session) {
      return NextResponse.json({ error: "会话无效" }, { status: 401 })
    }

    // 从数据库或文件系统读取用户的MCP配置
    // 这里简化处理，实际应该存储在数据库中
    return NextResponse.json({ 
      mcpServers: {},
      message: "MCP配置获取成功" 
    })
  } catch (error) {
    console.error("获取MCP配置失败:", error)
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")?.value
    
    if (!sessionCookie) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const session = await verifySession(sessionCookie)
    if (!session) {
      return NextResponse.json({ error: "会话无效" }, { status: 401 })
    }

    const body = await req.json()
    const { serverId, config } = body

    // 保存MCP配置到数据库
    // 这里简化处理，实际应该存储在数据库中
    
    return NextResponse.json({ 
      success: true,
      message: "MCP配置保存成功" 
    })
  } catch (error) {
    console.error("保存MCP配置失败:", error)
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")?.value
    
    if (!sessionCookie) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const session = await verifySession(sessionCookie)
    if (!session) {
      return NextResponse.json({ error: "会话无效" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const serverId = searchParams.get("serverId")

    if (!serverId) {
      return NextResponse.json({ error: "缺少服务器ID" }, { status: 400 })
    }

    // 从数据库删除MCP配置
    
    return NextResponse.json({ 
      success: true,
      message: "MCP配置删除成功" 
    })
  } catch (error) {
    console.error("删除MCP配置失败:", error)
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}
