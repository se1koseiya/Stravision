import { initDB, queryOne, execute } from "./database"

export interface RateLimitConfig {
  limit: number
  windowMs: number
  violationLimit: number // Before auto-ban
  banDuration: number // ms
}

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  limit: 300,
  windowMs: 60 * 1000,
  violationLimit: 20,
  banDuration: 15 * 60 * 1000 // 15 minutes
}

export async function getRateLimitConfig(): Promise<RateLimitConfig> {
  await initDB()
  const row = await queryOne<{ value: string }>("SELECT value FROM system_settings WHERE key = $1", ["rate_limit_config"])
  
  if (!row) return DEFAULT_RATE_LIMIT_CONFIG
  try {
    return JSON.parse(row.value)
  } catch (e) {
    return DEFAULT_RATE_LIMIT_CONFIG
  }
}

export async function updateRateLimitConfig(config: RateLimitConfig): Promise<void> {
  await initDB()
  const now = Date.now()
  await execute(
    `INSERT INTO system_settings (key, value, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ["rate_limit_config", JSON.stringify(config), now]
  )
}

export interface GreenhouseCameraUrls {
  cameraAUrl: string
  cameraBUrl: string
}

export const DEFAULT_GREENHOUSE_CAMERA_URLS: GreenhouseCameraUrls = {
  cameraAUrl: "",
  cameraBUrl: ""
}

export async function getGreenhouseCameraUrls(): Promise<GreenhouseCameraUrls> {
  await initDB()
  const row = await queryOne<{ value: string }>("SELECT value FROM system_settings WHERE key = $1", ["greenhouse_camera_urls"])

  if (!row) return DEFAULT_GREENHOUSE_CAMERA_URLS
  try {
    const parsed = JSON.parse(row.value) as Partial<GreenhouseCameraUrls>
    return {
      cameraAUrl: typeof parsed.cameraAUrl === "string" ? parsed.cameraAUrl : "",
      cameraBUrl: typeof parsed.cameraBUrl === "string" ? parsed.cameraBUrl : ""
    }
  } catch {
    return DEFAULT_GREENHOUSE_CAMERA_URLS
  }
}

export async function updateGreenhouseCameraUrls(urls: GreenhouseCameraUrls): Promise<void> {
  await initDB()
  const now = Date.now()
  await execute(
    `INSERT INTO system_settings (key, value, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ["greenhouse_camera_urls", JSON.stringify(urls), now]
  )
}
