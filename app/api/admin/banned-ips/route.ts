import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getBannedIPs, addBannedIP, removeBannedIP } from "@/lib/db/security-service"
import { z } from "zod"

const banIpSchema = z.object({
  // 支持 IPv4 和 IPv6
  ip: z.string().refine((val) => {
    // 简单的 IPv4 检查
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    // 简单的 IPv6 检查 (允许压缩格式 ::)
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])$/;
    
    return ipv4Regex.test(val) || ipv6Regex.test(val);
  }, { message: "无效的 IP 地址 (支持 IPv4 和 IPv6)" }),
  reason: z.string().optional(),
})

export async function GET() {
  const currentUser = await getCurrentUser()
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const ips = await getBannedIPs()
    return NextResponse.json(ips)
  } catch (error) {
    console.error("Failed to fetch banned IPs:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser()
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const result = banIpSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { ip, reason } = result.data
    await addBannedIP(ip, reason, currentUser.username)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
       return NextResponse.json({ error: "该 IP 已在封禁列表中" }, { status: 409 })
    }
    console.error("Failed to ban IP:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const currentUser = await getCurrentUser()
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const ip = searchParams.get('ip')
    
    if (!ip) {
      return NextResponse.json({ error: "IP address is required" }, { status: 400 })
    }

    await removeBannedIP(ip)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to unban IP:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
