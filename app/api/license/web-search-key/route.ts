import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { initDB } from "@/lib/db/database"
import {
  checkLicenseUsable,
  getActivation,
  getLicenseByCode,
  isWellFormedCode,
  normalizeCode,
} from "@/lib/db/desktop-license-service"
import { rateLimit } from "@/lib/rate-limit"

/**
 * 桌面端联网搜索凭据下发。
 *
 * 为什么不在安装包里硬编码 key：
 *   Electron 的 asar 可以被解包，任何内置 key 都能被提取并盗用。所以主 key 只存在于
 *   服务端环境变量里，桌面端每次启动按「授权码 + 设备指纹」换一把可随时吊销的 key。
 *
 * 为什么按设备粘性分配（而不是所有人共用一把）：
 *   一把 key 泄露会让全部客户一起被限流；按设备落到池子里不同 key，泄露能定位到具体机器，
 *   换掉池中一把即可，不影响其他客户。
 *
 * 池子未配置时返回 protocol = "local"：
 *   客户端据此回退到内置本地引擎（进程内聚合 Bing / 360 / DuckDuckGo），
 *   保证「用户打开桌面端就能联网搜索」这个体验不被服务端配置卡住。
 *
 * 环境变量：
 *   STRAVISION_SEARCH_KEYS     逗号分隔的 Exa API Key 池（推荐 ≥ 用户数 / 20 把）
 *   STRAVISION_SEARCH_COUNT     默认返回条数，缺省 8
 */

const bodySchema = z.object({
  code: z.string().trim().min(1).max(64),
  deviceId: z.string().trim().min(8).max(128),
  appVersion: z.string().trim().max(32).optional().default(""),
})

/** 读取 key 池；未配置返回空数组 */
function readKeyPool(): string[] {
  return String(process.env.STRAVISION_SEARCH_KEYS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
}

/**
 * 设备 → key 的稳定映射：同一台机器每次都拿到同一把，
 * 便于按 key 定位泄露来源，也避免频繁换 key 触发上游风控。
 */
function pickKey(pool: string[], deviceId: string): string {
  let hash = 0
  for (let i = 0; i < deviceId.length; i++) {
    hash = (hash * 31 + deviceId.charCodeAt(i)) >>> 0
  }
  return pool[hash % pool.length]
}

/** 只回显前 6 位，便于后台对账时不暴露完整 key */
function hint(key: string): string {
  return key ? `${key.slice(0, 6)}…${key.slice(-4)}` : ""
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60 * 1000 })
  if (!limited.success) {
    return NextResponse.json({ ok: false, error: "请求过于频繁，请稍后再试" }, { status: 429 })
  }

  try {
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0].message }, { status: 400 })
    }
    const { deviceId, appVersion } = parsed.data
    const code = normalizeCode(parsed.data.code)
    if (!isWellFormedCode(code)) {
      return NextResponse.json({ ok: false, error: "授权码格式不正确" }, { status: 400 })
    }

    await initDB()

    const license = await getLicenseByCode(code)
    if (!license) {
      return NextResponse.json({ ok: false, error: "授权码不存在" }, { status: 404 })
    }
    const usable = checkLicenseUsable(license)
    if (!usable.ok) {
      return NextResponse.json({ ok: false, error: usable.reason }, { status: 403 })
    }
    const activation = await getActivation(license.id, deviceId)
    if (!activation || activation.status === "released") {
      return NextResponse.json(
        { ok: false, error: "本机尚未激活或已被解绑", reason: "not_activated" },
        { status: 403 }
      )
    }

    const pool = readKeyPool()
    const countRaw = Number(process.env.STRAVISION_SEARCH_COUNT)
    const defaultCount =
      Number.isFinite(countRaw) && countRaw > 0 ? Math.min(Math.floor(countRaw), 20) : 8

    // 池子没配：明确告诉客户端「用内置本地引擎」，而不是报错 ——
    // 搜索是体验项，不该因为服务端没配 key 就整块不可用。
    if (pool.length === 0) {
      return NextResponse.json({
        ok: true,
        protocol: "local",
        apiKey: "",
        defaultCount,
        reason: "no_key_pool",
        appVersion,
      })
    }

    const key = pickKey(pool, deviceId)
    return NextResponse.json({
      ok: true,
      protocol: "exa",
      apiKey: key,
      keyHint: hint(key),
      defaultCount,
      poolSize: pool.length,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "凭据下发失败"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
