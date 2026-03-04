import { initDB, queryOne, execute } from "./database"

export interface MaintenanceConfig {
  enabled: boolean
  title: string
  message: string
  allowed_roles: string[] // e.g. ["admin", "super_admin"]
}

export const DEFAULT_MAINTENANCE_CONFIG: MaintenanceConfig = {
  enabled: false,
  title: "System Maintenance",
  message: "We are currently performing scheduled maintenance. We will be back shortly.",
  allowed_roles: ["admin", "super_admin"]
}

export async function getMaintenanceConfig(): Promise<MaintenanceConfig> {
  await initDB()
  const row = await queryOne<{ value: string }>("SELECT value FROM system_settings WHERE key = $1", ["maintenance_config"])
  
  if (!row) return DEFAULT_MAINTENANCE_CONFIG
  try {
    return { ...DEFAULT_MAINTENANCE_CONFIG, ...JSON.parse(row.value) }
  } catch (e) {
    return DEFAULT_MAINTENANCE_CONFIG
  }
}

export async function updateMaintenanceConfig(config: MaintenanceConfig): Promise<void> {
  await initDB()
  const now = Date.now()
  await execute(
    `INSERT INTO system_settings (key, value, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ["maintenance_config", JSON.stringify(config), now]
  )
}
