/**
 * Yjs WebSocket 协作服务
 *
 * 启动方式：
 *   node ws-server/yjs-server.js
 *
 * 环境变量：
 *   YJS_WS_PORT          端口（默认 1234）
 *   YJS_WS_HOST          监听地址（默认 0.0.0.0）
 *   DATABASE_URL         PostgreSQL 连接字符串（必须）
 *   YJS_AUTH_TOKEN       可选：客户端需在 URL ?token=X 中提供
 *
 * 文档命名空间：
 *   kb-doc-{itemId}       知识库条目协作文档
 *
 * 持久化：
 *   - 客户端断开 5 秒后所有连接清空时，自动 flush 到 kb_yjs_documents 表
 *   - 客户端连接时若数据库已有 doc_state，先广播给新连接的客户端
 *   - 同时支持定期 snapshot（每 30 秒）
 *
 * 客户端通过 y-websocket 连接：
 *   new WebsocketProvider(`ws://${host}:${YJS_WS_PORT}`, `kb-doc-${itemId}`, yDoc)
 */

require("dotenv").config()

const { WebSocketServer } = require("ws")
const Y = require("yjs")
const { setupWSConnection } = require("y-websocket/bin/utils")
const { Pool } = require("pg")

const PORT = Number(process.env.YJS_WS_PORT || 1234)
const HOST = process.env.YJS_WS_HOST || "0.0.0.0"
const AUTH_TOKEN = process.env.YJS_AUTH_TOKEN || ""

if (!process.env.DATABASE_URL) {
  console.error("[yjs-server] FATAL: DATABASE_URL is not set")
  process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// ====== 文档状态缓存（in-memory）======
// docName -> { yDoc, conns: Map<ws, any>, lastFlush }
const docs = new Map()
const FLUSH_INTERVAL_MS = 5000 // 断开 5 秒后无连接则 flush
const SNAPSHOT_INTERVAL_MS = 30000 // 每 30 秒 snapshot

async function loadDocStateFromDb(docName) {
  const itemId = extractItemId(docName)
  if (!itemId) return null
  try {
    const res = await pool.query(
      "SELECT doc_state FROM kb_yjs_documents WHERE item_id = $1",
      [itemId]
    )
    if (res.rows.length === 0 || !res.rows[0].doc_state) return null
    return Buffer.from(res.rows[0].doc_state)
  } catch (e) {
    console.error(`[yjs-server] loadDocStateFromDb(${docName}) error:`, e.message)
    return null
  }
}

async function saveDocStateToDb(docName, docState, editorId) {
  const itemId = extractItemId(docName)
  if (!itemId) return
  try {
    const now = Date.now()
    await pool.query(
      `INSERT INTO kb_yjs_documents
         (item_id, doc_state, last_editor_id, last_edit_at, version, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 1, $4, $4)
       ON CONFLICT (item_id) DO UPDATE
         SET doc_state = EXCLUDED.doc_state,
             last_editor_id = COALESCE(EXCLUDED.last_editor_id, kb_yjs_documents.last_editor_id),
             last_edit_at = EXCLUDED.last_edit_at,
             version = kb_yjs_documents.version + 1,
             updated_at = EXCLUDED.updated_at`,
      [itemId, docState, editorId || null, now]
    )
  } catch (e) {
    console.error(`[yjs-server] saveDocStateToDb(${docName}) error:`, e.message)
  }
}

function extractItemId(docName) {
  // 命名空间：kb-doc-{itemId}
  const m = /^kb-doc-(\d+)$/.exec(docName || "")
  return m ? Number(m[1]) : 0
}

// ====== Yjs persistence callback ======
function persistence(docName, yDoc) {
  // 当 y-websocket 内部需要持久化时调用：把当前 state vector + update 写入数据库
  const state = Y.encodeStateAsUpdate(yDoc)
  return saveDocStateToDb(docName, Buffer.from(state), null)
}

// ====== 连接管理 ======
async function ensureDoc(docName) {
  let entry = docs.get(docName)
  if (entry) return entry
  const yDoc = new Y.Doc()
  // 从数据库加载初始状态
  const existing = await loadDocStateFromDb(docName)
  if (existing && existing.length > 0) {
    try {
      Y.applyUpdate(yDoc, new Uint8Array(existing))
    } catch (e) {
      console.error(`[yjs-server] applyUpdate(${docName}) error:`, e.message)
    }
  }
  entry = { yDoc, conns: new Map(), lastFlush: Date.now(), snapshotTimer: null }
  docs.set(docName, entry)
  return entry
}

async function handleConnection(conn, req) {
  const url = new URL(req.url, "http://localhost")
  const docName = url.pathname.slice(1) // 去掉前导 /
  if (!docName) {
    conn.close(4000, "missing docName")
    return
  }
  // 简单 token 校验
  if (AUTH_TOKEN) {
    const token = url.searchParams.get("token")
    if (token !== AUTH_TOKEN) {
      conn.close(4001, "unauthorized")
      return
    }
  }

  const entry = await ensureDoc(docName)
  // y-websocket 内部会处理 update / awareness 同步
  setupWSConnection(conn, entry.yDoc, {
    // 自定义 callback：当文档变更时定期持久化
    onChange: () => {
      entry.lastFlush = Date.now()
    }
  })

  entry.conns.set(conn, { userId: null, joinedAt: Date.now() })

  // 启动 snapshot 定时器（每个文档一个）
  if (!entry.snapshotTimer) {
    entry.snapshotTimer = setInterval(() => {
      try {
        const state = Y.encodeStateAsUpdate(entry.yDoc)
        saveDocStateToDb(docName, Buffer.from(state), null)
      } catch (e) {
        console.error(`[yjs-server] snapshot(${docName}) error:`, e.message)
      }
    }, SNAPSHOT_INTERVAL_MS)
  }

  conn.on("close", () => {
    entry.conns.delete(conn)
    // 5 秒后若再无连接，flush 并清理
    setTimeout(() => {
      if (entry.conns.size === 0) {
        try {
          const state = Y.encodeStateAsUpdate(entry.yDoc)
          saveDocStateToDb(docName, Buffer.from(state), null)
        } catch (e) {
          console.error(`[yjs-server] flush on close(${docName}) error:`, e.message)
        }
        if (entry.snapshotTimer) {
          clearInterval(entry.snapshotTimer)
          entry.snapshotTimer = null
        }
        docs.delete(docName)
      }
    }, FLUSH_INTERVAL_MS)
  })

  conn.on("error", (err) => {
    console.error(`[yjs-server] conn error:`, err.message)
  })
}

// ====== 启动 WebSocket 服务 ======
const wss = new WebSocketServer({ port: PORT, host: HOST })

wss.on("connection", (conn, req) => {
  handleConnection(conn, req).catch((e) => {
    console.error("[yjs-server] handleConnection error:", e.message)
    try { conn.close(1011, "internal error") } catch (_) {}
  })
})

wss.on("listening", () => {
  console.log(`[yjs-server] Yjs WebSocket server listening on ws://${HOST}:${PORT}`)
})

wss.on("error", (e) => {
  console.error("[yjs-server] WSS error:", e.message)
})

// 优雅退出
process.on("SIGTERM", async () => {
  console.log("[yjs-server] SIGTERM, flushing all docs...")
  for (const [docName, entry] of docs.entries()) {
    try {
      const state = Y.encodeStateAsUpdate(entry.yDoc)
      await saveDocStateToDb(docName, Buffer.from(state), null)
      if (entry.snapshotTimer) clearInterval(entry.snapshotTimer)
    } catch (e) {
      console.error(`[yjs-server] flush on exit(${docName}) error:`, e.message)
    }
  }
  await pool.end()
  process.exit(0)
})

process.on("SIGINT", async () => {
  console.log("[yjs-server] SIGINT, flushing all docs...")
  for (const [docName, entry] of docs.entries()) {
    try {
      const state = Y.encodeStateAsUpdate(entry.yDoc)
      await saveDocStateToDb(docName, Buffer.from(state), null)
      if (entry.snapshotTimer) clearInterval(entry.snapshotTimer)
    } catch (e) {
      console.error(`[yjs-server] flush on exit(${docName}) error:`, e.message)
    }
  }
  await pool.end()
  process.exit(0)
})
