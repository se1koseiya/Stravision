import { randomBytes } from "node:crypto"
import { execute, query, queryOne } from "./database"

/* -------------------------------------------------------------------------- */
/* 桌面端授权码（desktop_licenses / desktop_license_activations）               */
/*                                                                            */
/* 用途：桌面端（离线全栈应用）启动时的授权关卡。                                 */
/*   - 授权码由管理后台签发，一个码默认绑定一台设备（首次激活时写入设备指纹）；       */
/*   - 到期时间 expires_at 由后台随时可改（续期 / 缩短 / 置为永久）；              */
/*   - 吊销 = status 置 revoked，桌面端下次联网校验即被拒绝。                     */
/*                                                                            */
/* 时间统一用 BIGINT 毫秒时间戳，与本项目其余表（changelog / credit_logs）一致。   */
/* -------------------------------------------------------------------------- */

/**
 * Crockford Base32 字符表：剔除 I / L / O / U，
 * 避免用户念码时把 0 念成 O、1 念成 I。
 */
const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
/** 用户误输入的易混字符归一化 */
const CODE_ALIAS: Record<string, string> = { O: "0", I: "1", L: "1" }
const CODE_PREFIX = "STV"
const CODE_GROUP_LEN = 4
/** STV-XXXX-XXXX-XXXX-XXXX = 16 个有效字符 ≈ 80 bit 随机性 */
const CODE_GROUPS = 4

export type LicenseStatus = "active" | "revoked"
export type ActivationStatus = "active" | "released" | "revoked"
/**
 * 授权码来源类型：
 *   - online  —— 常规码，客户端联网激活 + 心跳续期（可远程改期/吊销）；
 *   - offline —— 离线授权串，管理员用本机私钥签发给指定设备指纹，
 *                客户端粘贴即用、不联网、跳过心跳（服务器存亡不影响它）。
 */
export type LicenseKind = "online" | "offline"

/** 离线宽限默认天数（与桌面端 desktop/lib/license.js 的 GRACE_DAYS 必须一致） */
export const DEFAULT_GRACE_DAYS = 7

export interface DesktopLicense {
  id: number
  code: string
  /** 备注（客户名 / 用途），便于客服定位 */
  label: string
  status: LicenseStatus
  kind: LicenseKind
  /** 允许激活的设备台数 */
  maxActivations: number
  /** 授权到期时间（毫秒时间戳）；null = 永久有效 */
  expiresAt: number | null
  /** 离线宽限天数（写入租约的 gd 字段）；null = 用默认值 */
  graceDays: number | null
  createdBy: number | null
  createdAt: number
  updatedAt: number
  /** 当前处于 active 的激活设备数（列表展示用，非表字段） */
  activeCount: number
}

export interface DesktopActivation {
  id: number
  licenseId: number
  deviceId: string
  deviceName: string
  platform: string
  appVersion: string
  status: ActivationStatus
  ip: string
  activatedAt: number
  lastSeenAt: number
}

interface LicenseRow {
  id: number | string
  code: string
  label: string | null
  status: string
  kind: string | null
  max_activations: number | string
  expires_at: number | string | null
  grace_days: number | string | null
  created_by: number | string | null
  created_at: number | string
  updated_at: number | string
  active_count?: number | string | null
}

interface ActivationRow {
  id: number | string
  license_id: number | string
  device_id: string
  device_name: string | null
  platform: string | null
  app_version: string | null
  status: string
  ip: string | null
  activated_at: number | string
  last_seen_at: number | string
}

function toLicense(r: LicenseRow): DesktopLicense {
  return {
    id: Number(r.id),
    code: r.code,
    label: r.label ?? "",
    status: (r.status === "revoked" ? "revoked" : "active") as LicenseStatus,
    kind: (r.kind === "offline" ? "offline" : "online") as LicenseKind,
    maxActivations: Math.max(1, Number(r.max_activations) || 1),
    expiresAt: r.expires_at == null ? null : Number(r.expires_at),
    graceDays: r.grace_days == null ? null : Math.max(1, Number(r.grace_days) || DEFAULT_GRACE_DAYS),
    createdBy: r.created_by == null ? null : Number(r.created_by),
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
    activeCount: Number(r.active_count ?? 0),
  }
}

function toActivation(r: ActivationRow): DesktopActivation {
  const status = String(r.status)
  return {
    id: Number(r.id),
    licenseId: Number(r.license_id),
    deviceId: r.device_id,
    deviceName: r.device_name ?? "",
    platform: r.platform ?? "",
    appVersion: r.app_version ?? "",
    status: (status === "released" || status === "revoked" ? status : "active") as ActivationStatus,
    ip: r.ip ?? "",
    activatedAt: Number(r.activated_at),
    lastSeenAt: Number(r.last_seen_at),
  }
}

/* ------------------------------------------------------------------ */
/* 授权可用性判定（激活与心跳共用同一口径）                              */
/* ------------------------------------------------------------------ */

/**
 * 授权码在给定时刻是否可用。
 * 注意：设备绑定名额不在这里判定（激活时才需要区分"已绑定"与"名额已满"）。
 */
export function checkLicenseUsable(license: DesktopLicense, now = Date.now()): { ok: boolean; reason?: string } {
  if (license.status === "revoked") return { ok: false, reason: "授权码已被停用" }
  if (license.expiresAt != null && license.expiresAt <= now) return { ok: false, reason: "授权码已过期" }
  return { ok: true }
}

/**
 * 把授权码映射成租约 payload 里「可下发」的那部分字段。
 *
 * 单独抽出来是为了让 activate / heartbeat / 离线签发三条链路**用同一份口径**，
 * 避免出现"某条链路忘了带 gd 导致宽限退化成默认值"这种跨端不一致。
 */
export function licenseLeaseClaims(license: DesktopLicense): {
  code: string
  exp: number
  gd: number
  lbl?: string
} {
  return {
    code: license.code,
    exp: license.expiresAt ?? 0,
    gd: license.graceDays ?? DEFAULT_GRACE_DAYS,
    ...(license.label ? { lbl: license.label } : {}),
  }
}

/* ------------------------------------------------------------------ */
/* 授权码格式                                                          */
/* ------------------------------------------------------------------ */

function randomCode(): string {
  // 256 % 32 === 0 → 取模不会有分布偏差
  const bytes = randomBytes(CODE_GROUPS * CODE_GROUP_LEN)
  let body = ""
  for (let i = 0; i < bytes.length; i++) {
    if (i > 0 && i % CODE_GROUP_LEN === 0) body += "-"
    body += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  }
  return `${CODE_PREFIX}-${body}`
}

/**
 * 归一化用户输入的授权码：大写、剔除易混字符与分隔符，再按 4 位重新分组。
 * 允许用户漏打 `STV-` 前缀（手动输入时很容易漏）。
 */
export function normalizeCode(input: string): string {
  const raw = String(input ?? "")
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .split("")
    .map((c) => CODE_ALIAS[c] ?? c)
    .join("")
  const body = raw.startsWith(CODE_PREFIX) ? raw.slice(CODE_PREFIX.length) : raw
  const groups = body.match(new RegExp(`.{1,${CODE_GROUP_LEN}}`, "g"))
  return groups ? `${CODE_PREFIX}-${groups.join("-")}` : ""
}

/** 授权码是否格式合法（不含数据库查询） */
export function isWellFormedCode(code: string): boolean {
  const m = /^STV-(?:[0-9A-HJKMNP-TV-Z]{4}-){3}[0-9A-HJKMNP-TV-Z]{4}$/.exec(code)
  return !!m
}

/* ------------------------------------------------------------------ */
/* 读                                                                  */
/* ------------------------------------------------------------------ */

/** 管理列表（含激活设备计数与已激活设备，供后台一次渲染） */
export async function listLicenses(): Promise<DesktopLicense[]> {
  const rows = await query<LicenseRow>(
    `SELECT l.*, (
       SELECT COUNT(*)::int FROM desktop_license_activations a
       WHERE a.license_id = l.id AND a.status = 'active'
     ) AS active_count
     FROM desktop_licenses l
     ORDER BY l.created_at DESC`
  )
  return rows.map(toLicense)
}

export async function getLicenseById(id: number): Promise<DesktopLicense | null> {
  const row = await queryOne<LicenseRow>(
    `SELECT l.*, (
       SELECT COUNT(*)::int FROM desktop_license_activations a
       WHERE a.license_id = l.id AND a.status = 'active'
     ) AS active_count
     FROM desktop_licenses l WHERE l.id = $1`,
    [id]
  )
  return row ? toLicense(row) : null
}

/** 按授权码精确查找（调用方需先 normalizeCode） */
export async function getLicenseByCode(code: string): Promise<DesktopLicense | null> {
  const row = await queryOne<LicenseRow>(
    `SELECT l.*, (
       SELECT COUNT(*)::int FROM desktop_license_activations a
       WHERE a.license_id = l.id AND a.status = 'active'
     ) AS active_count
     FROM desktop_licenses l WHERE l.code = $1`,
    [code]
  )
  return row ? toLicense(row) : null
}

export async function listActivations(licenseId: number): Promise<DesktopActivation[]> {
  const rows = await query<ActivationRow>(
    "SELECT * FROM desktop_license_activations WHERE license_id = $1 ORDER BY last_seen_at DESC",
    [licenseId]
  )
  return rows.map(toActivation)
}

export async function getActivation(licenseId: number, deviceId: string): Promise<DesktopActivation | null> {
  const row = await queryOne<ActivationRow>(
    "SELECT * FROM desktop_license_activations WHERE license_id = $1 AND device_id = $2",
    [licenseId, deviceId]
  )
  return row ? toActivation(row) : null
}

/** 当前活跃设备数 */
export async function countActiveActivations(licenseId: number): Promise<number> {
  const row = await queryOne<{ n: number | string }>(
    "SELECT COUNT(*)::int AS n FROM desktop_license_activations WHERE license_id = $1 AND status = 'active'",
    [licenseId]
  )
  return Number(row?.n ?? 0)
}

/* ------------------------------------------------------------------ */
/* 写：授权码                                                          */
/* ------------------------------------------------------------------ */

export interface CreateLicenseInput {
  label?: string
  /** 毫秒时间戳；null / undefined = 永久有效 */
  expiresAt?: number | null
  maxActivations?: number
  kind?: LicenseKind
  /** 离线宽限天数；null / undefined = 用默认值（DEFAULT_GRACE_DAYS） */
  graceDays?: number | null
  createdBy?: number | null
}

/** 宽限天数规整：1 ~ 36500（≈100 年，用于「装完就断网」的客户） */
function normalizeGraceDays(value: number | null | undefined): number | null {
  if (value == null) return null
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n)) return null
  return Math.min(36500, Math.max(1, n))
}

export async function createLicense(input: CreateLicenseInput = {}): Promise<DesktopLicense> {
  const now = Date.now()
  const label = (input.label ?? "").trim().slice(0, 120)
  const kind: LicenseKind = input.kind === "offline" ? "offline" : "online"
  const maxActivations = Math.min(999, Math.max(1, Math.floor(input.maxActivations ?? 1)))
  const expiresAt = input.expiresAt == null ? null : Math.floor(input.expiresAt)
  const graceDays = normalizeGraceDays(input.graceDays)
  const createdBy = input.createdBy == null ? null : Number(input.createdBy)

  // 唯一冲突（理论概率极低）时重试几次，避免把 500 抛给用户
  let lastError: unknown = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode()
    try {
      const row = await queryOne<LicenseRow>(
        `INSERT INTO desktop_licenses (code, label, status, kind, max_activations, expires_at, grace_days, created_by, created_at, updated_at)
         VALUES ($1,$2,'active',$3,$4,$5,$6,$7,$8,$8) RETURNING *, 0 AS active_count`,
        [code, label, kind, maxActivations, expiresAt, graceDays, createdBy, now]
      )
      if (row) return toLicense(row)
    } catch (error: any) {
      lastError = error
      if (error?.code !== "23505") throw error // 23505 = unique_violation
    }
  }
  throw new Error(`授权码生成失败：${(lastError as any)?.message ?? "重复冲突"}`)
}

export interface UpdateLicenseInput {
  label?: string
  status?: LicenseStatus
  /** 毫秒时间戳；null = 永久有效 */
  expiresAt?: number | null
  maxActivations?: number
  /** 离线宽限天数；null = 恢复默认 */
  graceDays?: number | null
}

/** 局部更新：只改传入的字段（改期 / 续期 / 吊销 / 改备注 / 改离线宽限） */
export async function updateLicense(id: number, patch: UpdateLicenseInput): Promise<DesktopLicense | null> {
  const sets: string[] = []
  const params: unknown[] = [id]

  if (patch.label !== undefined) {
    params.push(String(patch.label).trim().slice(0, 120))
    sets.push(`label = $${params.length}`)
  }
  if (patch.status !== undefined) {
    params.push(patch.status === "revoked" ? "revoked" : "active")
    sets.push(`status = $${params.length}`)
  }
  if (patch.expiresAt !== undefined) {
    params.push(patch.expiresAt == null ? null : Math.floor(patch.expiresAt))
    sets.push(`expires_at = $${params.length}`)
  }
  if (patch.maxActivations !== undefined) {
    params.push(Math.min(999, Math.max(1, Math.floor(patch.maxActivations))))
    sets.push(`max_activations = $${params.length}`)
  }
  if (patch.graceDays !== undefined) {
    params.push(normalizeGraceDays(patch.graceDays))
    sets.push(`grace_days = $${params.length}`)
  }

  if (!sets.length) return getLicenseById(id)

  params.push(Date.now())
  sets.push(`updated_at = $${params.length}`)

  await execute(`UPDATE desktop_licenses SET ${sets.join(", ")} WHERE id = $1`, params)
  return getLicenseById(id)
}

/** 删除授权码及其全部激活记录 */
export async function deleteLicense(id: number): Promise<boolean> {
  const res = await execute("DELETE FROM desktop_licenses WHERE id = $1", [id])
  if (res.rowCount > 0) {
    await execute("DELETE FROM desktop_license_activations WHERE license_id = $1", [id])
    return true
  }
  return false
}

/* ------------------------------------------------------------------ */
/* 写：设备激活                                                        */
/* ------------------------------------------------------------------ */

export interface RegisterActivationInput {
  licenseId: number
  deviceId: string
  deviceName?: string
  platform?: string
  appVersion?: string
  ip?: string
}

/**
 * 记录 / 刷新一次激活。
 * 同一 (license_id, device_id) 已存在时走 upsert —— 重复激活视为「同一台机器再次启动」，
 * 只刷新 last_seen_at 与元信息，不会占用新的激活名额。
 */
export async function registerActivation(input: RegisterActivationInput): Promise<DesktopActivation> {
  const now = Date.now()
  const row = await queryOne<ActivationRow>(
    `INSERT INTO desktop_license_activations
       (license_id, device_id, device_name, platform, app_version, status, ip, activated_at, last_seen_at)
     VALUES ($1,$2,$3,$4,$5,'active',$6,$7,$7)
     ON CONFLICT (license_id, device_id) DO UPDATE SET
       device_name = EXCLUDED.device_name,
       platform    = EXCLUDED.platform,
       app_version = EXCLUDED.app_version,
       ip          = EXCLUDED.ip,
       status      = 'active',
       last_seen_at = EXCLUDED.last_seen_at
     RETURNING *`,
    [
      input.licenseId,
      input.deviceId,
      (input.deviceName ?? "").slice(0, 120),
      (input.platform ?? "").slice(0, 60),
      (input.appVersion ?? "").slice(0, 32),
      (input.ip ?? "").slice(0, 64),
      now,
    ]
  )
  return toActivation(row as ActivationRow)
}

/** 心跳：仅刷新 last_seen_at / ip / 版本 */
export async function touchActivation(id: number, patch: { ip?: string; appVersion?: string } = {}): Promise<void> {
  const sets = ["last_seen_at = $2"]
  const params: unknown[] = [id, Date.now()]
  if (patch.ip !== undefined) {
    params.push(String(patch.ip).slice(0, 64))
    sets.push(`ip = $${params.length}`)
  }
  if (patch.appVersion !== undefined) {
    params.push(String(patch.appVersion).slice(0, 32))
    sets.push(`app_version = $${params.length}`)
  }
  await execute(`UPDATE desktop_license_activations SET ${sets.join(", ")} WHERE id = $1`, params)
}

/** 解绑（后台操作）：把某台设备踢出，空出激活名额 */
export async function releaseActivation(activationId: number): Promise<boolean> {
  const res = await execute(
    "UPDATE desktop_license_activations SET status = 'released', last_seen_at = $2 WHERE id = $1",
    [activationId, Date.now()]
  )
  return res.rowCount > 0
}

/** 授权码被吊销时，连带把其下所有激活设备标记为 revoked（仅用于展示，判定以 license 为准） */
export async function revokeActivations(licenseId: number): Promise<void> {
  await execute(
    "UPDATE desktop_license_activations SET status = 'revoked', last_seen_at = $2 WHERE license_id = $1 AND status = 'active'",
    [licenseId, Date.now()]
  )
}
