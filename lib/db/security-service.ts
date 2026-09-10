import { initDB, query, queryOne, execute } from "./database"

export interface BannedIP {
  id: number
  ip: string
  reason: string | null
  banned_by: string | null
  expires_at: number | null
  created_at: number
}

function isBanEnabled() {
  return process.env.NODE_ENV === "production"
}

export async function getBannedIPs(): Promise<BannedIP[]> {
  if (!isBanEnabled()) return []
  await initDB()
  return query<BannedIP>("SELECT * FROM banned_ips ORDER BY created_at DESC")
}

export async function addBannedIP(ip: string, reason?: string, bannedBy?: string, expiresAt?: number): Promise<void> {
  if (!isBanEnabled()) return
  await initDB()
  const now = Date.now()
  await execute(
    `INSERT INTO banned_ips (ip, reason, banned_by, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [ip, reason || null, bannedBy || "system", expiresAt || null, now]
  )
}

export async function removeBannedIP(ip: string): Promise<void> {
  if (!isBanEnabled()) return
  await initDB()
  await execute("DELETE FROM banned_ips WHERE ip = $1", [ip])
}

export async function isIPBanned(ip: string): Promise<boolean> {
  const details = await getBanDetails(ip)
  return !!details
}

export async function getBanDetails(ip: string): Promise<BannedIP | null> {
  if (!isBanEnabled()) return null
  await initDB()
  const now = Date.now()
  
  // Clean up expired bans first (lazy cleanup)
  await execute("DELETE FROM banned_ips WHERE expires_at IS NOT NULL AND expires_at < $1", [now])
  
  const ban = await queryOne<BannedIP>("SELECT * FROM banned_ips WHERE ip = $1", [ip])
  return ban || null
}

export interface AccessLog {
  id: number
  ip: string
  method: string
  path: string
  status: number
  duration: number
  user_id?: number
  user_agent?: string
  created_at: number
}

export async function recordAccessLog(data: Omit<AccessLog, 'id' | 'created_at'>): Promise<void> {
  // Fire and forget, don't block
  try {
    await initDB()
    const now = Date.now()
    
    await execute(
      `INSERT INTO access_logs (ip, method, path, status, duration, user_id, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        data.ip,
        data.method,
        data.path,
        data.status,
        data.duration,
        data.user_id || null,
        data.user_agent || null,
        now
      ]
    )
  } catch (e) {
    console.error("Failed to record access log:", e)
  }
}

export async function getAccessLogs(limit: number = 100): Promise<AccessLog[]> {
  await initDB()
  return query<AccessLog>("SELECT * FROM access_logs ORDER BY created_at DESC LIMIT $1", [limit])
}

export interface LoginLog {
  id: number
  user_id: number
  ip: string
  country: string | null
  region: string | null
  city: string | null
  user_agent: string | null
  device_type: string | null
  created_at: number
}

export async function fetchIpLocation(ip: string): Promise<{ country: string, region: string, city: string } | null> {
  // 跳过本地 IP
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return null
  }

  // 1. 优先使用腾讯地图 API (如果有配置 Key)
  const tencentKey = process.env.TENCENT_MAP_KEY
  if (tencentKey) {
    try {
      const res = await fetch(`https://apis.map.qq.com/ws/location/v1/ip?ip=${ip}&key=${tencentKey}`)
      if (res.ok) {
        const data = await res.json()
        if (data.status === 0) {
          const adInfo = data.result.ad_info
          return {
            country: adInfo.nation,
            region: adInfo.province,
            city: adInfo.city || adInfo.district || adInfo.province
          }
        } else {
          console.warn(`Tencent Map IP location error: ${data.message} (status: ${data.status})`)
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch location from Tencent Map for IP ${ip}:`, e)
    }
  }

  try {
    // 2. Fallback: 使用 ip-api.com (免费版，非商业用途，有限流)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000) // 2秒超时

    const res = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN`, {
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      if (data.status === 'success') {
        return {
          country: data.country,
          region: data.regionName,
          city: data.city
        }
      }
    }
  } catch (e) {
    // 忽略错误，不阻塞登录
    console.warn(`Failed to fetch location for IP ${ip}:`, e)
  }
  return null
}

export async function recordLoginLog(userId: number, ip: string, userAgent: string, preFetchedLocation?: { country: string, region: string, city: string } | null): Promise<LoginLog> {
  await initDB()
  const now = Date.now()

  // 尝试获取地理位置（如果未预先获取）
  const location = preFetchedLocation !== undefined ? preFetchedLocation : await fetchIpLocation(ip)

  const row = await queryOne<{ id: number }>(
    `INSERT INTO login_logs (user_id, ip, country, region, city, user_agent, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      userId,
      ip,
      location?.country || null,
      location?.region || null,
      location?.city || null,
      userAgent,
      now
    ]
  )
  if (!row) {
    throw new Error("Failed to record login log")
  }

  return {
    id: Number(row.id),
    user_id: userId,
    ip,
    country: location?.country || null,
    region: location?.region || null,
    city: location?.city || null,
    user_agent: userAgent,
    device_type: null, // 可以后续解析 UA
    created_at: now
  }
}

export async function getLastLogin(userId: number): Promise<LoginLog | undefined> {
  await initDB()
  const log = await queryOne<LoginLog>(
    "SELECT * FROM login_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
    [userId]
  )
  return log || undefined
}

// ============ IP 归属地（带缓存） ============

export interface IpLocationInfo {
  ip: string
  country: string | null
  region: string | null
  city: string | null
  is_local?: boolean
}

const IP_LOCATION_CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 天

function isLocalIp(ip: string): boolean {
  return ip === "127.0.0.1" || ip === "::1" || ip === "unknown" ||
    ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.16.") ||
    ip.startsWith("172.17.") || ip.startsWith("172.18.") || ip.startsWith("172.19.") ||
    ip.startsWith("172.2") || ip.startsWith("172.30.") || ip.startsWith("172.31.")
}

/**
 * 查询 IP 归属地。优先级：本地 IP 直接标记 → ip_locations 缓存 → login_logs 历史记录 → 外部 API（结果写回缓存）。
 */
export async function getIpLocation(ip: string): Promise<IpLocationInfo> {
  if (isLocalIp(ip)) {
    return { ip, country: "本地网络", region: null, city: null, is_local: true }
  }

  await initDB()
  const now = Date.now()

  // 1. 缓存表
  const cached = await queryOne<{ ip: string; country: string | null; region: string | null; city: string | null; updated_at: string }>(
    "SELECT * FROM ip_locations WHERE ip = $1 AND updated_at > $2",
    [ip, now - IP_LOCATION_CACHE_TTL]
  )
  if (cached) {
    return { ip, country: cached.country, region: cached.region, city: cached.city }
  }

  // 2. login_logs 历史（登录时已查过归属地）
  const fromLogin = await queryOne<{ country: string | null; region: string | null; city: string | null }>(
    "SELECT country, region, city FROM login_logs WHERE ip = $1 AND country IS NOT NULL ORDER BY created_at DESC LIMIT 1",
    [ip]
  )
  if (fromLogin) {
    await saveIpLocation(ip, fromLogin.country, fromLogin.region, fromLogin.city)
    return { ip, country: fromLogin.country, region: fromLogin.region, city: fromLogin.city }
  }

  // 3. 外部 API
  const location = await fetchIpLocation(ip)
  const info: IpLocationInfo = {
    ip,
    country: location?.country ?? null,
    region: location?.region ?? null,
    city: location?.city ?? null
  }
  if (location) {
    await saveIpLocation(ip, info.country, info.region, info.city)
  } else {
    // 查不到也写入缓存（空结果），避免反复请求外部 API；TTL 由 updated_at 控制
    await saveIpLocation(ip, null, null, null)
  }
  return info
}

async function saveIpLocation(ip: string, country: string | null, region: string | null, city: string | null): Promise<void> {
  try {
    await execute(
      `INSERT INTO ip_locations (ip, country, region, city, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (ip) DO UPDATE SET country = $2, region = $3, city = $4, updated_at = $5`,
      [ip, country, region, city, Date.now()]
    )
  } catch (e) {
    console.warn("Failed to save ip location cache:", e)
  }
}

// ============ 在线用户 ============

export interface OnlineUser {
  user_id: number
  username: string
  email: string | null
  avatar_url: string | null
  role: string
  last_ip: string
  ip_count: number
  requests: number
  last_active: number
  location: IpLocationInfo | null
}

export interface OnlineGuest {
  ip: string
  requests: number
  last_active: number
  location: IpLocationInfo | null
}

export interface OnlineSnapshot {
  window_minutes: number
  generated_at: number
  online_users: OnlineUser[]
  guest_ips: OnlineGuest[]
}

/**
 * 获取在线快照：最近 windowMinutes 分钟内有访问记录的登录用户 + 未登录 IP。
 * 依赖 access_logs（app/layout.tsx 每次页面渲染都会记录 user_id + ip）。
 */
export async function getOnlineSnapshot(windowMinutes: number = 5): Promise<OnlineSnapshot> {
  await initDB()
  const since = Date.now() - windowMinutes * 60 * 1000

  // 登录用户聚合：按 user_id 分组，取最近一次 IP / 时间 + 窗口内请求数与去重 IP 数
  const userRows = await query<{
    user_id: number
    username: string
    email: string | null
    avatar_url: string | null
    role: string
    last_ip: string
    ip_count: string | number
    requests: string | number
    last_active: string | number
  }>(
    `SELECT a.user_id, u.username, u.email, u.avatar_url, u.role,
            (array_agg(a.ip ORDER BY a.created_at DESC))[1] AS last_ip,
            COUNT(DISTINCT a.ip) AS ip_count,
            COUNT(*) AS requests,
            MAX(a.created_at) AS last_active
     FROM access_logs a
     JOIN users u ON u.id = a.user_id
     WHERE a.created_at > $1 AND a.user_id IS NOT NULL
     GROUP BY a.user_id, u.username, u.email, u.avatar_url, u.role
     ORDER BY last_active DESC`,
    [since]
  )

  // 未登录 IP（游客 / 爬虫）
  const guestRows = await query<{ ip: string; requests: string | number; last_active: string | number }>(
    `SELECT ip, COUNT(*) AS requests, MAX(created_at) AS last_active
     FROM access_logs
     WHERE created_at > $1 AND user_id IS NULL
     GROUP BY ip
     ORDER BY last_active DESC
     LIMIT 50`,
    [since]
  )

  // 归属地批量查询（getIpLocation 自带缓存，仅首次会请求外部 API）
  const allIps = Array.from(new Set([...userRows.map((r) => r.last_ip), ...guestRows.map((r) => r.ip)]))
  const locationMap = new Map<string, IpLocationInfo>()
  await Promise.all(
    allIps.map(async (ip) => {
      try {
        locationMap.set(ip, await getIpLocation(ip))
      } catch {
        // 单个 IP 查询失败不影响整体
      }
    })
  )

  return {
    window_minutes: windowMinutes,
    generated_at: Date.now(),
    online_users: userRows.map((r) => ({
      user_id: Number(r.user_id),
      username: r.username,
      email: r.email,
      avatar_url: r.avatar_url,
      role: r.role,
      last_ip: r.last_ip,
      ip_count: Number(r.ip_count),
      requests: Number(r.requests),
      last_active: Number(r.last_active),
      location: locationMap.get(r.last_ip) ?? null
    })),
    guest_ips: guestRows.map((r) => ({
      ip: r.ip,
      requests: Number(r.requests),
      last_active: Number(r.last_active),
      location: locationMap.get(r.ip) ?? null
    }))
  }
}

export async function checkSuspiciousLogin(
  userId: number, 
  currentIp: string, 
  currentRegion: string | null,
  userPermissions?: { ignoreLocationCheck?: boolean }
): Promise<{ isSuspicious: boolean, lastRegion: string | null }> {
  // 如果用户有 ignoreLocationCheck 权限，直接返回不可疑
  if (userPermissions?.ignoreLocationCheck) {
    return { isSuspicious: false, lastRegion: null }
  }

  // 获取上一次登录记录（排除本次，因为本次可能还没存或者刚存）
  // 这里我们需要在 recordLoginLog 之前调用，或者查询 offset 1
  
  // 策略：查询最近的 5 次登录，看是否有相同的 IP 或 地区
  await initDB()
  const logs = await query<LoginLog>(
    "SELECT * FROM login_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5",
    [userId]
  )
  
  if (logs.length === 0) {
    return { isSuspicious: false, lastRegion: null } // 首次登录
  }

  // 如果最近有相同 IP，则不认为异地
  if (logs.some(log => log.ip === currentIp)) {
    return { isSuspicious: false, lastRegion: logs[0].region }
  }

  // 如果 IP 不同，检查地区
  // 假设 currentRegion 已知（通过 fetchIpLocation）
  // 如果 currentRegion 未知，只能基于 IP 字符串判断（不太准），或者保守地只提示“新 IP”
  
  if (!currentRegion) {
    // 只有 IP 不同，且没有地区信息，标记为 New IP
    return { isSuspicious: true, lastRegion: logs[0].region }
  }

  // 检查最近几次登录是否有相同地区
  const hasSameRegion = logs.some(log => log.region === currentRegion)
  
  if (hasSameRegion) {
    return { isSuspicious: false, lastRegion: logs[0].region }
  }

  return { isSuspicious: true, lastRegion: logs[0].region }
}
