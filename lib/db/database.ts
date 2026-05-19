if (typeof process !== "undefined" && process.env.NEXT_RUNTIME === "edge") {
  throw new Error("Database module cannot run in Edge runtime")
}

import path from "path"
import { promises as fs } from "fs"
import { Pool, PoolClient } from "pg"

let pool: Pool | null = null
let initPromise: Promise<void> | null = null

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL is not set")
  }
  return url
}

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: getDatabaseUrl() })
  }
  return pool
}

// Export getPool for use in other modules
export { getPool };

export async function initDB(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const p = getPool()
      const statements = [
        `CREATE TABLE IF NOT EXISTS users (
          id BIGSERIAL PRIMARY KEY,
          uid TEXT UNIQUE,
          email TEXT UNIQUE,
          password_hash TEXT,
          username TEXT NOT NULL,
          avatar_url TEXT,
          role TEXT DEFAULT 'user',
          permissions TEXT DEFAULT '{}',
          wechat_openid TEXT UNIQUE,
          wechat_unionid TEXT,
          wework_userid TEXT,
          qq_openid TEXT UNIQUE,
          alipay_user_id TEXT UNIQUE,
          notification_settings TEXT DEFAULT '{}',
          daily_ai_limit INTEGER DEFAULT 10,
          daily_ai_usage INTEGER DEFAULT 0,
          last_ai_usage_date TEXT,
          ai_balance INTEGER DEFAULT 0,
          daily_report_quota INTEGER DEFAULT 5,
          daily_report_usage INTEGER DEFAULT 0,
          last_report_usage_date TEXT,
          email_verified INTEGER DEFAULT 0,
          email_verified_at BIGINT,
          public_key TEXT,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS email_verifications (
          id BIGSERIAL PRIMARY KEY,
          email TEXT NOT NULL,
          code TEXT NOT NULL,
          expires_at BIGINT NOT NULL,
          used INTEGER DEFAULT 0,
          created_at BIGINT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS scheduled_tasks (
          id BIGSERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          cron_expression TEXT,
          execute_at BIGINT,
          action_type TEXT NOT NULL,
          device_id INTEGER,
          params TEXT NOT NULL,
          is_active INTEGER DEFAULT 1,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS login_logs (
          id BIGSERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          ip TEXT NOT NULL,
          country TEXT,
          region TEXT,
          city TEXT,
          user_agent TEXT,
          device_type TEXT,
          created_at BIGINT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS banned_ips (
          id BIGSERIAL PRIMARY KEY,
          ip TEXT UNIQUE NOT NULL,
          reason TEXT,
          banned_by TEXT,
          expires_at BIGINT,
          created_at BIGINT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS access_logs (
          id BIGSERIAL PRIMARY KEY,
          ip TEXT NOT NULL,
          method TEXT,
          path TEXT,
          status INTEGER,
          duration INTEGER,
          user_id INTEGER,
          user_agent TEXT,
          created_at BIGINT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS device_logs (
          id BIGSERIAL PRIMARY KEY,
          device_name TEXT NOT NULL,
          action TEXT NOT NULL,
          operator TEXT NOT NULL,
          details TEXT,
          created_at BIGINT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS sensor_readings (
          id BIGSERIAL PRIMARY KEY,
          device_id TEXT DEFAULT 'default',
          temperature DOUBLE PRECISION,
          humidity DOUBLE PRECISION,
          light DOUBLE PRECISION,
          co2 DOUBLE PRECISION,
          soil_moisture DOUBLE PRECISION,
          earth_n DOUBLE PRECISION,
          earth_p DOUBLE PRECISION,
          earth_k DOUBLE PRECISION,
          rainfall DOUBLE PRECISION,
          created_at BIGINT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS login_tickets (
          ticket TEXT PRIMARY KEY,
          jwt TEXT,
          created_at BIGINT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS system_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at BIGINT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS friend_requests (
          id BIGSERIAL PRIMARY KEY,
          requester_id INTEGER NOT NULL,
          addressee_id INTEGER NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL,
          UNIQUE(requester_id, addressee_id)
        )`,
        `CREATE TABLE IF NOT EXISTS friends (
          id BIGSERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          friend_id INTEGER NOT NULL,
          created_at BIGINT NOT NULL,
          is_blocked INTEGER DEFAULT 0,
          UNIQUE(user_id, friend_id)
        )`,
        `CREATE TABLE IF NOT EXISTS messages (
          id BIGSERIAL PRIMARY KEY,
          sender_id INTEGER NOT NULL,
          receiver_id INTEGER NOT NULL,
          group_id INTEGER,
          content TEXT,
          type TEXT DEFAULT 'text',
          file_url TEXT,
          read_at BIGINT,
          created_at BIGINT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS groups (
          id BIGSERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          owner_id INTEGER NOT NULL,
          avatar_url TEXT,
          created_at BIGINT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS group_members (
          id BIGSERIAL PRIMARY KEY,
          group_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          role TEXT DEFAULT 'member',
          is_muted INTEGER DEFAULT 0,
          joined_at BIGINT NOT NULL,
          last_read_at BIGINT DEFAULT 0,
          UNIQUE(group_id, user_id)
        )`,
        `CREATE TABLE IF NOT EXISTS automation_rules (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          is_active INTEGER DEFAULT 1,
          graph_data TEXT NOT NULL,
          trigger_type TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          last_triggered_at TEXT,
          execution_count INTEGER DEFAULT 0
        )`,
        // Agent 长期记忆表
        `CREATE TABLE IF NOT EXISTS user_preferences (
          id BIGSERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          preference_key TEXT NOT NULL,
          preference_value TEXT NOT NULL,
          confidence REAL DEFAULT 0.5,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL,
          UNIQUE(user_id, preference_key)
        )`,
        `CREATE TABLE IF NOT EXISTS device_patterns (
          id BIGSERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          device_id INTEGER NOT NULL,
          pattern_type TEXT NOT NULL,
          pattern_data TEXT NOT NULL,
          confidence REAL DEFAULT 0.5,
          success_count INTEGER DEFAULT 0,
          total_count INTEGER DEFAULT 0,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS successful_strategies (
          id BIGSERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          goal TEXT NOT NULL,
          steps TEXT NOT NULL,
          success_rate REAL DEFAULT 0.0,
          avg_execution_time INTEGER DEFAULT 0,
          conditions TEXT,
          use_count INTEGER DEFAULT 0,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS agent_execution_logs (
          id BIGSERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          session_id TEXT NOT NULL,
          action_type TEXT NOT NULL,
          action_params TEXT,
          result TEXT,
          status TEXT NOT NULL,
          execution_time INTEGER,
          error_message TEXT,
          created_at BIGINT NOT NULL
        )`,
        // AI Cron Jobs 表 - 用于 AI 安排的延迟任务
        `CREATE TABLE IF NOT EXISTS ai_cron_jobs (
          id BIGSERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          session_id TEXT NOT NULL,
          task_type TEXT NOT NULL,
          task_description TEXT NOT NULL,
          scheduled_time BIGINT NOT NULL,
          payload TEXT NOT NULL,
          status TEXT NOT NULL,
          result TEXT,
          created_at BIGINT NOT NULL,
          executed_at BIGINT
        )`
      ]

      for (const statement of statements) {
        try {
          await p.query(statement)
        } catch (error: any) {
          // 忽略表已存在的错误
          if (error.code !== '42P07') { // 42P07 = duplicate_table
            console.error('Error creating table:', error.message)
          }
        }
      }

      const indexStatements = [
        "CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email)",
        "CREATE INDEX IF NOT EXISTS idx_ai_cron_jobs_status_time ON ai_cron_jobs(status, scheduled_time)",
        "CREATE INDEX IF NOT EXISTS idx_ai_cron_jobs_user ON ai_cron_jobs(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at ON email_verifications(expires_at)",
        "CREATE INDEX IF NOT EXISTS idx_sensor_readings_created_at ON sensor_readings(created_at)",
        "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
        "CREATE INDEX IF NOT EXISTS idx_users_wechat_openid ON users(wechat_openid)",
        "CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid)",
        "CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id)",
        "CREATE INDEX IF NOT EXISTS idx_messages_receiver_read ON messages(receiver_id, read_at)",
        "CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages(group_id)",
        // Agent 记忆系统索引
        "CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_device_patterns_user_device ON device_patterns(user_id, device_id)",
        "CREATE INDEX IF NOT EXISTS idx_successful_strategies_user_id ON successful_strategies(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_agent_execution_logs_user_session ON agent_execution_logs(user_id, session_id)",
        "CREATE INDEX IF NOT EXISTS idx_agent_execution_logs_created_at ON agent_execution_logs(created_at)"
      ]

      for (const statement of indexStatements) {
        try {
          await p.query(statement)
        } catch (error: any) {
          // 忽略索引已存在的错误
          if (error.code !== '42P07') { // 42P07 = duplicate_object
            console.error('Error creating index:', error.message)
          }
        }
      }

      try {
        await p.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS membership TEXT DEFAULT 'free'")
      } catch (error: any) {
        if (error.code !== '42701') console.error('Error adding membership:', error.message)
      }

      try {
        await p.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified INTEGER DEFAULT 0")
      } catch (error: any) {
        // 忽略列已存在的错误
        if (error.code !== '42701') { // 42701 = duplicate_column
          console.error('Error adding column:', error.message)
        }
      }
      try {
        await p.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at BIGINT")
      } catch (error: any) {
        if (error.code !== '42701') console.error('Error adding email_verified_at:', error.message)
      }
      
      try {
        await p.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS uid TEXT")
      } catch (error: any) {
        if (error.code !== '42701') console.error('Error adding uid:', error.message)
      }
      
      try {
        await p.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS wechat_openid TEXT")
      } catch (error: any) {
        if (error.code !== '42701') console.error('Error adding wechat_openid:', error.message)
      }
      
      try {
        await p.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS wechat_unionid TEXT")
      } catch (error: any) {
        if (error.code !== '42701') console.error('Error adding wechat_unionid:', error.message)
      }
      
      try {
        await p.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS wework_userid TEXT")
      } catch (error: any) {
        if (error.code !== '42701') console.error('Error adding wework_userid:', error.message)
      }
      
      try {
        await p.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS qq_openid TEXT")
      } catch (error: any) {
        if (error.code !== '42701') console.error('Error adding qq_openid:', error.message)
      }
      
      try {
        await p.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS alipay_user_id TEXT")
      } catch (error: any) {
        if (error.code !== '42701') console.error('Error adding alipay_user_id:', error.message)
      }
      
      try {
        await p.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS public_key TEXT")
      } catch (error: any) {
        if (error.code !== '42701') console.error('Error adding public_key:', error.message)
      }

      const missingUids = await p.query<{ id: number }>("SELECT id FROM users WHERE uid IS NULL")
      if (missingUids.rows.length > 0) {
        for (const user of missingUids.rows) {
          let uid = generateUid()
          let updated = false
          for (let attempt = 0; attempt < 2 && !updated; attempt++) {
            const res = await p.query("UPDATE users SET uid = $1 WHERE id = $2 AND uid IS NULL", [uid, user.id])
            if (res.rowCount && res.rowCount > 0) {
              updated = true
            } else {
              uid = generateUid()
            }
          }
        }
      }

      const now = Date.now()
      await p.query("UPDATE users SET avatar_url = $1 WHERE email = $2", ["/ip/sit.png", "bot@stravision.ai"])
      await p.query(
        "INSERT INTO users (email, password_hash, username, avatar_url, role, created_at, updated_at, uid) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (email) DO NOTHING",
        ["bot@stravision.ai", "", "莓小智", "/ip/sit.png", "admin", now, now, "bot_001"]
      )

      await migrateFromJSON()
    })()
  }
  return initPromise
}

export async function query<T>(sql: string, params: any[] = []): Promise<T[]> {
  await initDB()
  const result = await getPool().query(sql, params)
  return result.rows as T[]
}

export async function queryOne<T>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}

export async function execute(sql: string, params: any[] = []): Promise<{ rowCount: number; rows: any[] }> {
  await initDB()
  const result = await getPool().query(sql, params)
  return { rowCount: result.rowCount ?? 0, rows: result.rows as any[] }
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await initDB()
  const client = await getPool().connect()
  try {
    await client.query("BEGIN")
    const result = await fn(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

export async function closeDB(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
  initPromise = null
}

async function migrateFromJSON(): Promise<void> {
  const jsonPath = path.join(process.cwd(), "data", "users.json")

  try {
    await fs.access(jsonPath)
  } catch {
    return
  }

  try {
    const jsonContent = await fs.readFile(jsonPath, "utf-8")
    const users = JSON.parse(jsonContent) as Array<{
      email: string
      hash: string
      createdAt?: number
    }>

    if (!users || users.length === 0) {
      await fs.rename(jsonPath, jsonPath + ".migrated")
      return
    }

    const now = Date.now()
    await withTransaction(async (client) => {
      for (const user of users) {
        const username = user.email.split("@")[0]
        const createdAt = user.createdAt || now
        await client.query(
          "INSERT INTO users (email, password_hash, username, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING",
          [user.email, user.hash, username, createdAt, now]
        )
      }
    })

    await fs.rename(jsonPath, jsonPath + ".migrated")
  } catch (error) {
    console.error("Error during migration:", error)
  }
}

function generateUid(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
