import dns from "dns/promises"
import net from "net"

/**
 * SSRF 防护工具集
 *
 * 阻止服务端发起指向内部网络/元数据端点的请求，防止：
 *  - 云元数据端点泄露（如 AWS/GCE/Azure 的 169.254.169.254）
 *  - 内网服务探测（127.0.0.1, 10.x, 172.16-31.x, 192.168.x）
 *  - IPv6 本地与唯一本地地址（::1, fc00::/7）
 *  - 链路本地地址（169.254.0.0/16, fe80::/10）
 */

// 私有/保留 IPv4 网段（CIDR → 起始/结束整数）
const PRIVATE_IPV4_RANGES: Array<{ start: number; end: number }> = [
  toRange("0.0.0.0", "0.255.255.255"), // 本网
  toRange("10.0.0.0", "10.255.255.255"), // RFC1918
  toRange("100.64.0.0", "100.127.255.255"), // 运营商级 NAT
  toRange("127.0.0.0", "127.255.255.255"), // 环回
  toRange("169.254.0.0", "169.254.255.255"), // 链路本地（含云元数据 169.254.169.254）
  toRange("172.16.0.0", "172.31.255.255"), // RFC1918
  toRange("192.0.0.0", "192.0.0.255"), // IETF 协议分配
  toRange("192.0.2.0", "192.0.2.255"), // TEST-NET-1
  toRange("192.168.0.0", "192.168.255.255"), // RFC1918
  toRange("198.18.0.0", "198.19.255.255"), // 基准测试
  toRange("198.51.100.0", "198.51.100.255"), // TEST-NET-2
  toRange("203.0.113.0", "203.0.113.255"), // TEST-NET-3
  toRange("224.0.0.0", "239.255.255.255"), // 组播
  toRange("240.0.0.0", "255.255.255.255"), // 保留
]

function toRange(start: string, end: string) {
  return { start: ipv4ToInt(start), end: ipv4ToInt(end) }
}

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map(Number)
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    throw new Error(`Invalid IPv4: ${ip}`)
  }
  // 使用无符号 32 位算术
  return (((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0
}

/**
 * 判断 IPv4 字符串是否属于私有/保留网段
 */
export function isPrivateIPv4(ip: string): boolean {
  let n: number
  try {
    n = ipv4ToInt(ip)
  } catch {
    return true // 无法解析的 IP 一律视为不安全
  }
  return PRIVATE_IPV4_RANGES.some((r) => n >= r.start && n <= r.end)
}

/**
 * 判断 IPv6 字符串是否属于私有/保留/环回/链路本地/唯一本地地址
 */
export function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  if (lower === "::1") return true // 环回
  if (lower.startsWith("fe80:")) return true // 链路本地
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true // 唯一本地地址 fc00::/7
  if (lower.startsWith("ff")) return true // 组播
  if (lower === "::") return true // 未指定
  if (lower.startsWith("::ffff:")) {
    // IPv4 映射地址，提取 IPv4 部分校验
    const v4 = lower.slice("::ffff:".length)
    if (net.isIPv4(v4)) return isPrivateIPv4(v4)
  }
  return false
}

/**
 * 判断任意 IP 字符串是否属于私有/保留网段
 */
export function isPrivateIP(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip)
  if (net.isIPv6(ip)) return isPrivateIPv6(ip)
  return true // 未知类型视为不安全
}

export interface AssertUrlOptions {
  /** 允许的协议白名单，默认 ["http:", "https:"] */
  allowedProtocols?: string[]
  /** 主机名白名单（小写）。提供时仅允许这些主机；不提供则允许所有非内网主机 */
  allowedHosts?: string[]
  /** 是否在 DNS 解析后校验 IP。默认 true */
  resolveDNS?: boolean
}

export interface AssertUrlResult {
  ok: boolean
  /** 拒绝原因 */
  reason?: string
  /** 解析后的目标 IP 列表（resolveDNS=true 时填充） */
  resolvedIps?: string[]
}

/**
 * 校验 URL 是否安全可发起服务端请求。
 *
 * 检查项：
 * 1. 协议必须在白名单内（默认 http/https，禁止 file:/data:/gopher: 等）
 * 2. 主机名若在 allowedHosts 白名单中直接放行（信任域）
 * 3. 否则解析主机名 DNS，校验所有解析结果 IP 均非私有/保留地址
 *
 * 注意：DNS rebinding 攻击仍可能在解析后、fetch 前切换 IP。
 * 对极敏感场景应在 fetch 层绑定已校验的 IP。本工具提供基础防护。
 */
export async function assertSafeUrl(
  rawUrl: string,
  options: AssertUrlOptions = {}
): Promise<AssertUrlResult> {
  const { allowedProtocols = ["http:", "https:"], allowedHosts, resolveDNS = true } = options

  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return { ok: false, reason: "Invalid URL" }
  }

  if (!allowedProtocols.includes(url.protocol)) {
    return { ok: false, reason: `Protocol ${url.protocol} not allowed` }
  }

  const hostname = url.hostname.toLowerCase()

  // 主机名白名单优先放行（信任域，如已知 AI 提供商）
  if (allowedHosts && allowedHosts.length > 0) {
    if (allowedHosts.includes(hostname)) {
      return { ok: true }
    }
  }

  // 如果主机名本身就是 IP，直接校验
  if (net.isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      return { ok: false, reason: `Target IP ${hostname} is private/reserved` }
    }
    return { ok: true, resolvedIps: [hostname] }
  }

  // 阻止明显可疑的主机名（如 "0" 这类会被某些解析器当作 0.0.0.0）
  if (hostname === "0" || hostname === "[::]" || hostname === "") {
    return { ok: false, reason: "Suspicious hostname" }
  }

  if (!resolveDNS) {
    return { ok: true }
  }

  // DNS 解析，校验所有 A / AAAA 记录
  let addrs: string[]
  try {
    const lookupResult = await dns.lookup(hostname, { all: true, verbatim: true })
    addrs = lookupResult.map((r) => r.address)
  } catch {
    return { ok: false, reason: "DNS resolution failed" }
  }

  if (addrs.length === 0) {
    return { ok: false, reason: "DNS returned no addresses" }
  }

  for (const addr of addrs) {
    if (isPrivateIP(addr)) {
      return { ok: false, reason: `Resolved IP ${addr} is private/reserved` }
    }
  }

  return { ok: true, resolvedIps: addrs }
}
