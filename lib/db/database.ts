if (typeof process !== "undefined" && process.env.NEXT_RUNTIME === "edge") {
  throw new Error("Database module cannot run in Edge runtime")
}

import path from "node:path"
import { promises as fs } from "node:fs"
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
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      // 连接池调优：默认 max=10 在 IoT 高并发（SSE 长连接 + 每条 MQTT 消息写库 + 聊天多次查询）下易耗尽
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      // 单个连接最大使用次数，避免长连接导致的内存泄漏/状态积累
      maxUses: 1000,
    })
    // 兜底：连接池级错误（如 idle 连接被服务端断开）不应使进程崩溃
    pool.on("error", (err) => {
      console.error("[PG Pool] unexpected idle client error:", err)
    })
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
        `CREATE TABLE IF NOT EXISTS ip_locations (
          ip TEXT PRIMARY KEY,
          country TEXT,
          region TEXT,
          city TEXT,
          updated_at BIGINT NOT NULL
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
        )`,
        // 用户简报/我的空间存储 - 关联 user_id，支持跨设备同步
        `CREATE TABLE IF NOT EXISTS user_reports (
          id BIGSERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          source TEXT NOT NULL DEFAULT 'manual',
          source_id TEXT,
          title TEXT NOT NULL,
          html TEXT NOT NULL,
          summary TEXT,
          type TEXT NOT NULL DEFAULT 'report',
          is_favorite INTEGER NOT NULL DEFAULT 0,
          created_at BIGINT NOT NULL
        )`,
        // 知识库 - 集合（顶层分类/文件夹）
        `CREATE TABLE IF NOT EXISTS knowledge_collections (
          id BIGSERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          parent_id BIGINT,
          color TEXT DEFAULT '#1677ff',
          icon TEXT DEFAULT 'folder',
          sort_order INTEGER DEFAULT 0,
          is_archived INTEGER DEFAULT 0,
          item_count INTEGER DEFAULT 0,
          -- ========== 知识库市场扩展字段（is_marketplace=1 时生效）==========
          is_marketplace INTEGER NOT NULL DEFAULT 0,
          category TEXT DEFAULT 'general',
          cover_image TEXT,
          popularity INTEGER NOT NULL DEFAULT 0,
          official INTEGER NOT NULL DEFAULT 0,
          publisher_id INTEGER,
          published_at BIGINT,
          -- =============================================
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL
        )`,
        // 知识库 - 市场订阅记录（虚拟订阅：原 items 仍属 publisher，订阅用户可读）
        `CREATE TABLE IF NOT EXISTS knowledge_market_subscriptions (
          id BIGSERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          collection_id BIGINT NOT NULL,
          created_at BIGINT NOT NULL,
          UNIQUE(user_id, collection_id)
        )`,
        // 知识库 - 标签
        `CREATE TABLE IF NOT EXISTS knowledge_tags (
          id BIGSERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          color TEXT DEFAULT '#1677ff',
          usage_count INTEGER DEFAULT 0,
          created_at BIGINT NOT NULL,
          UNIQUE(user_id, name)
        )`,
        // 知识库 - 知识条目
        `CREATE TABLE IF NOT EXISTS knowledge_items (
          id BIGSERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          collection_id BIGINT,
          title TEXT NOT NULL,
          content TEXT,
          content_type TEXT NOT NULL DEFAULT 'note',
          file_url TEXT,
          file_size BIGINT DEFAULT 0,
          mime_type TEXT,
          source_url TEXT,
          source_metadata TEXT,
          summary TEXT,
          tags_cache TEXT DEFAULT '',
          is_favorite INTEGER DEFAULT 0,
          is_archived INTEGER DEFAULT 0,
          access_level TEXT DEFAULT 'private',
          current_version INTEGER DEFAULT 1,
          view_count INTEGER DEFAULT 0,
          search_count INTEGER DEFAULT 0,
          last_accessed_at BIGINT,
          embedding_model TEXT,
          embedding_status TEXT DEFAULT 'pending',
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL
        )`,
        // 知识库 - 条目标签关联
        `CREATE TABLE IF NOT EXISTS knowledge_item_tags (
          item_id BIGINT NOT NULL,
          tag_id BIGINT NOT NULL,
          PRIMARY KEY (item_id, tag_id)
        )`,
        // 知识库 - 历史版本
        `CREATE TABLE IF NOT EXISTS knowledge_versions (
          id BIGSERIAL PRIMARY KEY,
          item_id BIGINT NOT NULL,
          version_number INTEGER NOT NULL,
          title TEXT NOT NULL,
          content TEXT,
          file_url TEXT,
          change_summary TEXT,
          change_type TEXT DEFAULT 'edit',
          created_by INTEGER,
          created_at BIGINT NOT NULL,
          UNIQUE(item_id, version_number)
        )`,
        // 知识库 - 文本分块（用于检索）
        `CREATE TABLE IF NOT EXISTS knowledge_chunks (
          id BIGSERIAL PRIMARY KEY,
          item_id BIGINT NOT NULL,
          version_id BIGINT,
          chunk_index INTEGER NOT NULL,
          content TEXT NOT NULL,
          content_hash TEXT,
          token_count INTEGER DEFAULT 0,
          start_offset INTEGER DEFAULT 0,
          end_offset INTEGER DEFAULT 0,
          metadata TEXT,
          embedding TEXT,
          embedding_model TEXT,
          created_at BIGINT NOT NULL
        )`,
        // 知识库 - 权限/共享
        `CREATE TABLE IF NOT EXISTS knowledge_permissions (
          id BIGSERIAL PRIMARY KEY,
          item_id BIGINT,
          collection_id BIGINT,
          user_id INTEGER NOT NULL,
          grantee_user_id INTEGER NOT NULL,
          permission TEXT NOT NULL DEFAULT 'read',
          granted_by INTEGER NOT NULL,
          expires_at BIGINT,
          created_at BIGINT NOT NULL
        )`,
        // 知识库 - 查询日志（用于推荐）
        `CREATE TABLE IF NOT EXISTS knowledge_query_log (
          id BIGSERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          session_id TEXT,
          query TEXT NOT NULL,
          query_type TEXT DEFAULT 'keyword',
          results_count INTEGER DEFAULT 0,
          clicked_item_id BIGINT,
          clicked_chunk_id BIGINT,
          created_at BIGINT NOT NULL
        )`,
        // 知识库 - 备份记录
        `CREATE TABLE IF NOT EXISTS knowledge_backups (
          id BIGSERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          backup_type TEXT NOT NULL DEFAULT 'full',
          name TEXT,
          item_count INTEGER DEFAULT 0,
          file_path TEXT,
          file_size BIGINT DEFAULT 0,
          status TEXT DEFAULT 'pending',
          include_files INTEGER DEFAULT 1,
          metadata TEXT,
          error_message TEXT,
          created_at BIGINT NOT NULL,
          completed_at BIGINT
        )`,
        // 知识库 - 推荐缓存
        `CREATE TABLE IF NOT EXISTS knowledge_recommendations (
          id BIGSERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          item_id BIGINT NOT NULL,
          score REAL DEFAULT 0,
          reason TEXT,
          reason_type TEXT DEFAULT 'history',
          expires_at BIGINT,
          created_at BIGINT NOT NULL
        )`,
        // ========== 文档协同模块扩展 ==========
        // 知识库 - 协作者（collection 与 user 多对多，附带角色）
        `CREATE TABLE IF NOT EXISTS kb_collaborators (
          id BIGSERIAL PRIMARY KEY,
          collection_id BIGINT NOT NULL,
          user_id INTEGER NOT NULL,
          role TEXT NOT NULL DEFAULT 'viewer',
          invited_by INTEGER,
          joined_at BIGINT NOT NULL,
          created_at BIGINT NOT NULL,
          UNIQUE(collection_id, user_id)
        )`,
        // 知识库 - 协作邀请
        `CREATE TABLE IF NOT EXISTS kb_invitations (
          id BIGSERIAL PRIMARY KEY,
          collection_id BIGINT NOT NULL,
          inviter_id INTEGER NOT NULL,
          invitee_id INTEGER NOT NULL,
          role TEXT NOT NULL DEFAULT 'editor',
          status TEXT NOT NULL DEFAULT 'pending',
          message TEXT,
          expires_at BIGINT,
          created_at BIGINT NOT NULL,
          responded_at BIGINT
        )`,
        // 知识库 - 操作日志/活动流
        `CREATE TABLE IF NOT EXISTS kb_operation_logs (
          id BIGSERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          collection_id BIGINT,
          item_id BIGINT,
          action TEXT NOT NULL,
          target_type TEXT,
          target_id BIGINT,
          metadata TEXT,
          ip TEXT,
          user_agent TEXT,
          visibility TEXT DEFAULT 'collection',
          created_at BIGINT NOT NULL
        )`,
        // 知识库 - Yjs 文档状态（按 item 持久化二进制 update）
        `CREATE TABLE IF NOT EXISTS kb_yjs_documents (
          id BIGSERIAL PRIMARY KEY,
          item_id BIGINT NOT NULL UNIQUE,
          doc_state BYTEA,
          snapshot TEXT,
          last_editor_id INTEGER,
          last_edit_at BIGINT,
          version INTEGER DEFAULT 1,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL
        )`,
        // ========== 设备注册表 ==========
        // 统一管理所有 IoT 设备（继电器/传感器/摄像头/步进电机），替代 constants.ts 硬编码
        `CREATE TABLE IF NOT EXISTS devices (
          id BIGSERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('relay', 'sensor', 'camera', 'stepper')),
          category TEXT DEFAULT 'general',
          subscribe_topic TEXT,
          publish_topic TEXT,
          node_id TEXT,
          icon TEXT DEFAULT 'Cpu',
          color TEXT DEFAULT '#1677ff',
          config JSONB DEFAULT '{}',
          is_critical BOOLEAN DEFAULT FALSE,
          is_enabled BOOLEAN DEFAULT TRUE,
          sort_order INTEGER DEFAULT 0,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL
        )`,
        // 自定义传感器的灵活数据存储（device_id 关联 devices 表）
        `CREATE TABLE IF NOT EXISTS device_sensor_data (
          id BIGSERIAL PRIMARY KEY,
          device_id BIGINT NOT NULL,
          metrics JSONB NOT NULL,
          created_at BIGINT NOT NULL
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

      // 幂等添加 knowledge_collections 市场相关列（已存在的库也能平滑升级）
      const kbAlterStatements = [
        `ALTER TABLE knowledge_collections ADD COLUMN IF NOT EXISTS is_marketplace INTEGER NOT NULL DEFAULT 0`,
        `ALTER TABLE knowledge_collections ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general'`,
        `ALTER TABLE knowledge_collections ADD COLUMN IF NOT EXISTS cover_image TEXT`,
        `ALTER TABLE knowledge_collections ADD COLUMN IF NOT EXISTS popularity INTEGER NOT NULL DEFAULT 0`,
        `ALTER TABLE knowledge_collections ADD COLUMN IF NOT EXISTS official INTEGER NOT NULL DEFAULT 0`,
        `ALTER TABLE knowledge_collections ADD COLUMN IF NOT EXISTS publisher_id INTEGER`,
        `ALTER TABLE knowledge_collections ADD COLUMN IF NOT EXISTS published_at BIGINT`,
      ]
      for (const stmt of kbAlterStatements) {
        try { await p.query(stmt) } catch (e: any) {
          // 已添加或类型冲突忽略（IF NOT EXISTS 已经处理大部分）
        }
      }

      const indexStatements = [
        // 知识库邀请：同一 (collection, invitee) 只允许一个 pending 邀请（部分唯一索引）
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_kb_invitations_pending ON kb_invitations(collection_id, invitee_id, status) WHERE status = 'pending'",
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
        // 🔥 记忆系统 upsert 依赖的唯一索引：相同 (用户, 设备, 模式类型) 只保留一行
        // 避免重复保存导致数据膨胀 + 让 ON CONFLICT upsert 生效
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_device_patterns_user_device_type ON device_patterns(user_id, device_id, pattern_type)",
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_successful_strategies_user_goal ON successful_strategies(user_id, goal)",
        "CREATE INDEX IF NOT EXISTS idx_agent_execution_logs_user_session ON agent_execution_logs(user_id, session_id)",
        "CREATE INDEX IF NOT EXISTS idx_agent_execution_logs_created_at ON agent_execution_logs(created_at)",
        "CREATE INDEX IF NOT EXISTS idx_user_reports_user_created ON user_reports(user_id, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_user_reports_user_favorite ON user_reports(user_id, is_favorite)",
        // 知识库索引
        "CREATE INDEX IF NOT EXISTS idx_kb_collections_user ON knowledge_collections(user_id, parent_id, sort_order)",
        "CREATE INDEX IF NOT EXISTS idx_kb_tags_user ON knowledge_tags(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_kb_items_user_updated ON knowledge_items(user_id, updated_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_kb_items_user_collection ON knowledge_items(user_id, collection_id)",
        "CREATE INDEX IF NOT EXISTS idx_kb_items_user_favorite ON knowledge_items(user_id, is_favorite)",
        "CREATE INDEX IF NOT EXISTS idx_kb_items_user_archived ON knowledge_items(user_id, is_archived)",
        "CREATE INDEX IF NOT EXISTS idx_kb_items_user_type ON knowledge_items(user_id, content_type)",
        "CREATE INDEX IF NOT EXISTS idx_kb_items_embedding_status ON knowledge_items(user_id, embedding_status)",
        "CREATE INDEX IF NOT EXISTS idx_kb_item_tags_tag ON knowledge_item_tags(tag_id)",
        "CREATE INDEX IF NOT EXISTS idx_kb_versions_item ON knowledge_versions(item_id, version_number DESC)",
        "CREATE INDEX IF NOT EXISTS idx_kb_chunks_item ON knowledge_chunks(item_id, chunk_index)",
        "CREATE INDEX IF NOT EXISTS idx_kb_chunks_hash ON knowledge_chunks(content_hash)",
        "CREATE INDEX IF NOT EXISTS idx_kb_perms_grantee ON knowledge_permissions(grantee_user_id, permission)",
        "CREATE INDEX IF NOT EXISTS idx_kb_perms_item ON knowledge_permissions(item_id)",
        "CREATE INDEX IF NOT EXISTS idx_kb_query_log_user_time ON knowledge_query_log(user_id, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_kb_backups_user_time ON knowledge_backups(user_id, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_kb_recommendations_user_score ON knowledge_recommendations(user_id, score DESC)",
        // 知识库市场索引
        "CREATE INDEX IF NOT EXISTS idx_kb_collections_market ON knowledge_collections(is_marketplace, category, popularity DESC, published_at DESC) WHERE is_marketplace = 1",
        "CREATE INDEX IF NOT EXISTS idx_kb_collections_publisher ON knowledge_collections(publisher_id) WHERE publisher_id IS NOT NULL",
        "CREATE INDEX IF NOT EXISTS idx_kb_market_subs_user ON knowledge_market_subscriptions(user_id, collection_id)",
        "CREATE INDEX IF NOT EXISTS idx_kb_market_subs_collection ON knowledge_market_subscriptions(collection_id)",
        // 知识库全文搜索索引（PostgreSQL tsvector）
        "CREATE INDEX IF NOT EXISTS idx_kb_items_fts ON knowledge_items USING gin(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, '')))",
        // ========== 文档协同模块索引 ==========
        "CREATE INDEX IF NOT EXISTS idx_kb_collaborators_collection ON kb_collaborators(collection_id)",
        "CREATE INDEX IF NOT EXISTS idx_kb_collaborators_user ON kb_collaborators(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_kb_invitations_invitee_status ON kb_invitations(invitee_id, status, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_kb_invitations_collection ON kb_invitations(collection_id)",
        "CREATE INDEX IF NOT EXISTS idx_kb_op_logs_user_time ON kb_operation_logs(user_id, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_kb_op_logs_collection_time ON kb_operation_logs(collection_id, created_at DESC) WHERE collection_id IS NOT NULL",
        "CREATE INDEX IF NOT EXISTS idx_kb_op_logs_time ON kb_operation_logs(created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_kb_op_logs_action ON kb_operation_logs(action, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_kb_yjs_doc_item ON kb_yjs_documents(item_id)",
        // ========== 设备注册表索引 ==========
        "CREATE INDEX IF NOT EXISTS idx_devices_type_enabled ON devices(type, is_enabled, sort_order)",
        "CREATE INDEX IF NOT EXISTS idx_device_sensor_data_device_time ON device_sensor_data(device_id, created_at DESC)"
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

      // ===== AI 助手积分制度（token 计费 × 模型倍率 × 全局倍率） =====
      // 积分充值余额：与旧 ai_balance 复用同一列（INTEGER → 兼容小数积分，PG INTEGER 列做 UPDATE a-b 仍可用整数近似；
      // 为支持 0.01 精度，改用新 NUMERIC 列 credit_balance，旧 ai_balance 仅作展示兼容）
      try {
        await p.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_credit_quota NUMERIC(12,2) DEFAULT 0")
      } catch (error: any) {
        if (error.code !== '42701') console.error('Error adding monthly_credit_quota:', error.message)
      }
      try {
        await p.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_credit_used NUMERIC(12,2) DEFAULT 0")
      } catch (error: any) {
        if (error.code !== '42701') console.error('Error adding monthly_credit_used:', error.message)
      }
      try {
        await p.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS credit_cycle_date TEXT")
      } catch (error: any) {
        if (error.code !== '42701') console.error('Error adding credit_cycle_date:', error.message)
      }
      try {
        await p.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS credit_balance NUMERIC(12,2) DEFAULT 0")
      } catch (error: any) {
        if (error.code !== '42701') console.error('Error adding credit_balance:', error.message)
      }
      // 消耗日志表
      try {
        await p.query(`CREATE TABLE IF NOT EXISTS ai_credit_logs (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL,
          model_id TEXT,
          input_tokens INTEGER DEFAULT 0,
          output_tokens INTEGER DEFAULT 0,
          credits NUMERIC(12,2) NOT NULL,
          model_rate NUMERIC(8,2) DEFAULT 1,
          global_multiplier NUMERIC(8,2) DEFAULT 1,
          estimated INTEGER DEFAULT 0,
          created_at BIGINT NOT NULL
        )`)
        await p.query("CREATE INDEX IF NOT EXISTS idx_ai_credit_logs_user ON ai_credit_logs(user_id, created_at DESC)")
      } catch (error: any) {
        console.error('Error creating ai_credit_logs:', error.message)
      }

      // ===== 产品更新日志（公开 changelog 页 + admin 管理） =====
      try {
        await p.query(`CREATE TABLE IF NOT EXISTS changelog_entries (
          id BIGSERIAL PRIMARY KEY,
          version TEXT NOT NULL,
          title TEXT DEFAULT '',
          summary TEXT DEFAULT '',
          released_at TEXT NOT NULL,
          items JSONB NOT NULL DEFAULT '[]'::jsonb,
          published INTEGER NOT NULL DEFAULT 1,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL
        )`)
        await p.query("CREATE INDEX IF NOT EXISTS idx_changelog_released ON changelog_entries(released_at DESC, version DESC)")
        // 首次建表时种子数据（仅表为空时插入；内容为本项目真实更新历史，时间跨度大二上→现在）
        const seedCheck = await p.query("SELECT COUNT(*)::int AS n FROM changelog_entries")
        if (seedCheck.rows[0]?.n === 0) {
          const now = Date.now()
          const seeds = [
            {
              version: "3.6.0", title: "大棚监控底座：让数据先上线", summary: "项目起点：先把大棚的实时数据搬进浏览器，打稳设备接入与账号体系两块地基。",
              released_at: "2025-12-26",
              items: [
                { tag: "new", text: "实时监控卡：温湿光、土壤含水率等环境指标接入，MQTT 秒级推送" },
                { tag: "new", text: "用户系统：注册登录、多角色权限与个人中心" },
                { tag: "improve", text: "仪表盘基础布局与暗色主题适配" },
              ],
            },
            {
              version: "3.7.0", title: "莓小智上线：会聊天的农事助手", summary: "AI 对话能力落地，流式思维链 + 知识库问答，种草莓的问题可以直接问了。",
              released_at: "2026-03-20",
              items: [
                { tag: "new", text: "对话助手：流式输出与思维链展示，支持多模型切换" },
                { tag: "new", text: "知识库问答：上传种植资料即可定向提问" },
                { tag: "fix", text: "修复 SSE 断线重连导致的回复丢失" },
              ],
            },
            {
              version: "3.8.0", title: "积分与订阅体系", summary: "给 AI 能力加上计量与商业化底座，套餐、用量、兑换码一步到位。",
              released_at: "2026-06-05",
              items: [
                { tag: "new", text: "积分计费：按模型倍率 × 全局倍率结算，月度额度自动刷新" },
                { tag: "new", text: "兑换码体系：激活 Plus 会员与加量积分" },
                { tag: "improve", text: "订阅管理页上线，用量与余额一目了然" },
              ],
            },
            {
              version: "3.9.0", title: "设备调控闭环：从对话到执行留痕", summary: "莓小智现在可以直接控制大棚设备，每一次操作都可回溯。",
              released_at: "2026-08-28",
              items: [
                { tag: "new", text: "设备控制卡：对话里直接开关风机、水泵等继电器设备" },
                { tag: "new", text: "操作留痕：所有设备指令记录执行状态，支持失败重试" },
                { tag: "improve", text: "实时监控卡接入 MQTT 推送，环境数据秒级刷新" },
              ],
            },
            {
              version: "4.0.0", title: "莓界 4.0：会主动打理大棚的农事 AI", summary: "本次更新重塑了产品门户，并带来深度研究、记忆档案与设备调控三大场景能力。",
              released_at: "2026-09-04",
              items: [
                { tag: "new", text: "全新官网门户：首屏对话演示、真实组件场景卡与 3D 角色工牌" },
                { tag: "new", text: "深度研究：多轮检索 + 引用溯源，研究结论一键存入知识库" },
                { tag: "new", text: "记忆档案：莓小智记住你的称呼、大棚、品种与关注重点，跨设备同步" },
                { tag: "improve", text: "订阅管理页全面改版，套餐、用量与兑换卡一目了然" },
                { tag: "fix", text: "修复应用图标更新后浏览器长期缓存不刷新的问题" },
              ],
            },
            {
              version: "4.1.0", title: "技能工坊：对话里把文档变成技能", summary: "本次更新带来了全新的技能工坊，粘贴技术文档即可自动生成可复用的 AI 技能。",
              released_at: "2026-09-10",
              items: [
                { tag: "new", text: "技能工坊：对话中粘贴技术文档，自动走「分析 → 生成 → 校验 → 自测 → 发布」管线产出技能" },
                { tag: "new", text: "技能商店：内置技能全量上架，用户可一键安装到自己的莓小智" },
                { tag: "new", text: "产品更新日志页上线，版本变化集中呈现" },
                { tag: "improve", text: "长耗时工具统一双层超时防护，深度研究与技能锻造不再被网关掐断" },
              ],
            },
          ]
          for (const s of seeds) {
            await p.query(
              "INSERT INTO changelog_entries (version, title, summary, released_at, items, published, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,1,$6,$6)",
              [s.version, s.title, s.summary, s.released_at, JSON.stringify(s.items), now]
            )
          }
        }
      } catch (error: any) {
        console.error('Error creating changelog_entries:', error.message)
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

      // scheduled_tasks: 失败任务保留记录（不删除），新增失败状态与最后执行时间字段
      try {
        await p.query("ALTER TABLE scheduled_tasks ADD COLUMN IF NOT EXISTS last_error TEXT")
      } catch (error: any) {
        if (error.code !== '42701') console.error('Error adding scheduled_tasks.last_error:', error.message)
      }
      try {
        await p.query("ALTER TABLE scheduled_tasks ADD COLUMN IF NOT EXISTS last_run_at BIGINT")
      } catch (error: any) {
        if (error.code !== '42701') console.error('Error adding scheduled_tasks.last_run_at:', error.message)
      }
      try {
        await p.query("ALTER TABLE scheduled_tasks ADD COLUMN IF NOT EXISTS run_status TEXT")
      } catch (error: any) {
        if (error.code !== '42701') console.error('Error adding scheduled_tasks.run_status:', error.message)
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
  await initPromise
  // 增量 migration：确保协作/邀请/操作日志/Yjs 文档表存在
  // 自带缓存，但 hot-reload 后模块重新加载会重置，能修复"表不存在"问题
  await ensureKbCollaborationTables()
  // 增量 migration：确保组织架构相关表存在
  await ensureOrganizationTables()
  return
}

// 是否已确保协作相关 4 张表存在（进程内缓存，hot-reload 后会重置）
let kbCollabTablesEnsured = false

async function ensureKbCollaborationTables(): Promise<void> {
  if (kbCollabTablesEnsured) return
  const p = getPool()

  const tables = [
    `CREATE TABLE IF NOT EXISTS kb_collaborators (
      id BIGSERIAL PRIMARY KEY,
      collection_id BIGINT NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      invited_by INTEGER,
      joined_at BIGINT,
      created_at BIGINT NOT NULL,
      UNIQUE(collection_id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS kb_invitations (
      id BIGSERIAL PRIMARY KEY,
      collection_id BIGINT NOT NULL,
      inviter_id INTEGER NOT NULL,
      invitee_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'editor',
      status TEXT NOT NULL DEFAULT 'pending',
      message TEXT,
      expires_at BIGINT,
      created_at BIGINT NOT NULL,
      responded_at BIGINT
    )`,
    `CREATE TABLE IF NOT EXISTS kb_operation_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      collection_id BIGINT,
      item_id BIGINT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id BIGINT,
      metadata TEXT,
      ip TEXT,
      user_agent TEXT,
      visibility TEXT DEFAULT 'collection',
      created_at BIGINT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS kb_yjs_documents (
      id BIGSERIAL PRIMARY KEY,
      item_id BIGINT NOT NULL UNIQUE,
      doc_state BYTEA,
      snapshot TEXT,
      last_editor_id INTEGER,
      last_edit_at BIGINT,
      version INTEGER DEFAULT 1,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )`
  ]

  for (const sql of tables) {
    try {
      await p.query(sql)
    } catch (error: any) {
      // 42P07 = duplicate_object（表已存在），忽略
      if (error.code !== '42P07') {
        console.error('[ensureKbCollaborationTables] error:', error.message)
      }
    }
  }

  // 索引（全部 IF NOT EXISTS，幂等）
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_kb_collaborators_collection ON kb_collaborators(collection_id)",
    "CREATE INDEX IF NOT EXISTS idx_kb_collaborators_user ON kb_collaborators(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_kb_invitations_invitee_status ON kb_invitations(invitee_id, status, created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_kb_invitations_collection ON kb_invitations(collection_id)",
    "CREATE INDEX IF NOT EXISTS idx_kb_op_logs_user_time ON kb_operation_logs(user_id, created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_kb_op_logs_collection_time ON kb_operation_logs(collection_id, created_at DESC) WHERE collection_id IS NOT NULL",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_kb_invitations_unique_pending ON kb_invitations(collection_id, invitee_id) WHERE status = 'pending'",
    "CREATE INDEX IF NOT EXISTS idx_kb_op_logs_visibility_time ON kb_operation_logs(visibility, created_at DESC) WHERE visibility = 'public'",
    "CREATE INDEX IF NOT EXISTS idx_kb_yjs_documents_item ON kb_yjs_documents(item_id)"
  ]
  for (const sql of indexes) {
    try {
      await p.query(sql)
    } catch (error: any) {
      if (error.code !== '42P07') {
        console.error('[ensureKbCollaborationTables] index error:', error.message)
      }
    }
  }

  // 给 kb_invitations 加 UNIQUE 约束（如果旧表没有）
  try {
    await p.query(
      `ALTER TABLE kb_invitations DROP CONSTRAINT IF EXISTS kb_invitations_collection_invitee_unique_pending`
    )
    await p.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_kb_invitations_unique_pending
       ON kb_invitations(collection_id, invitee_id)
       WHERE status = 'pending'`
    )
  } catch (error: any) {
    console.error('[ensureKbCollaborationTables] unique index error:', error.message)
  }

  kbCollabTablesEnsured = true
}

// 是否已确保组织架构相关 2 张表存在（进程内缓存，hot-reload 后会重置）
let organizationTablesEnsured = false

async function ensureOrganizationTables(): Promise<void> {
  if (organizationTablesEnsured) return
  const p = getPool()

  const tables = [
    // 组织架构节点（支持层级关系）
    `CREATE TABLE IF NOT EXISTS organizations (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id BIGINT,
      owner_id INTEGER NOT NULL,
      description TEXT,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )`,
    // 组织架构成员
    `CREATE TABLE IF NOT EXISTS organization_members (
      id BIGSERIAL PRIMARY KEY,
      org_id BIGINT NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      invited_by INTEGER,
      joined_at BIGINT NOT NULL,
      UNIQUE(org_id, user_id)
    )`
  ]

  for (const sql of tables) {
    try {
      await p.query(sql)
    } catch (error: any) {
      if (error.code !== '42P07') {
        console.error('[ensureOrganizationTables] error:', error.message)
      }
    }
  }

  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_organizations_parent ON organizations(parent_id)",
    "CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id)",
    "CREATE INDEX IF NOT EXISTS idx_organization_members_org ON organization_members(org_id)",
    "CREATE INDEX IF NOT EXISTS idx_organization_members_user ON organization_members(user_id)"
  ]
  for (const sql of indexes) {
    try {
      await p.query(sql)
    } catch (error: any) {
      if (error.code !== '42P07') {
        console.error('[ensureOrganizationTables] index error:', error.message)
      }
    }
  }

  organizationTablesEnsured = true
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
