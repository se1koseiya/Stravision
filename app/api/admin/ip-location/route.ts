import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getIpLocation } from "@/lib/db/security-service"
import { queryOne, initDB } from "@/lib/db/database"

const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/

export async function GET(req: NextRequest) {
  const currentUser = await getCurrentUser()
  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const ip = (req.nextUrl.searchParams.get("ip") || "").trim()
  if (!ip || !IPV4_REGEX.test(ip)) {
    return NextResponse.json({ error: "无效的 IPv4 地址" }, { status: 400 })
  }

  try {
    const location = await getIpLocation(ip)

    // 该 IP 的近期活动概况
    let activity: {
      last_seen: number | null
      requests_24h: number
      last_user: string | null
      banned: boolean
    } = { last_seen: null, requests_24h: 0, last_user: null, banned: false }

    try {
      await initDB()
      const since = Date.now() - 24 * 60 * 60 * 1000
      const row = await queryOne<{ last_seen: string | number | null; requests: string | number; username: string | null }>(
        `SELECT MAX(created_at) AS last_seen, COUNT(*) AS requests,
                (SELECT u.username FROM access_logs al JOIN users u ON u.id = al.user_id
                 WHERE al.ip = $1 AND al.user_id IS NOT NULL
                 ORDER BY al.created_at DESC LIMIT 1) AS username
         FROM access_logs WHERE ip = $1 AND created_at > $2`,
        [ip, since]
      )
      const ban = await queryOne<{ ip: string }>("SELECT ip FROM banned_ips WHERE ip = $1", [ip])
      activity = {
        last_seen: row?.last_seen ? Number(row.last_seen) : null,
        requests_24h: row ? Number(row.requests) : 0,
        last_user: row?.username ?? null,
        banned: !!ban
      }
    } catch (e) {
      console.warn("Failed to fetch ip activity:", e)
    }

    return NextResponse.json({ ...location, activity })
  } catch (error) {
    console.error("Failed to lookup ip location:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
