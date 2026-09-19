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

// dotenv 为可选依赖：容器与桌面端均由外部注入环境变量（.env 文件可能不存在）。
// 若此处不加容错，缺少 dotenv 时会直接抛错导致服务无法启动。
try {
  require("dotenv").config()
} catch {
  // 依赖 process.env
}

const { WebSocketServer } = require("ws")
const Y = require("yjs")
// 同步协议层在本仓库内实现：y-websocket 3.x 已删除 bin/utils，
// 且本服务需要"预载 DB 状态"的生命周期，不能交给上游按 docName 自管空文档。
// 详见 ws-server/lib/yjs-sync.js 顶部说明。
const yjsSync = require("./lib/yjs-sync")
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

// ====== 连接管理 ======
/**
 * 建一份文档并预载数据库里的状态。
 *
 * ⚠️ 并发保护：两个客户端几乎同时连接同一文档时，若各自都 miss 缓存再各自
 * new Y.Doc()，就会得到**两份互不相干的文档**（表现为"两边都连上了但内容永远
 * 不同步"）。所以这里用 pending 表把同一 docName 的首次构造收敛成一个 Promise。
 */
const pending = new Map()

function ensureDoc(docName) {
  const cached = docs.get(docName)
  if (cached) return Promise.resolve(cached)

  const inFlight = pending.get(docName)
  if (inFlight) return inFlight

  const task = createDoc(docName).finally(() => pending.delete(docName))
  pending.set(docName, task)
  return task
}

async function createDoc(docName) {
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
  const entry = {
    yDoc,
    conns: new Map(),
    lastFlush: Date.now(),
    snapshotTimer: null,
    // 内容变更时刷新"最后活跃时间"，供 flush 策略使用
    onChange: () => {
      entry.lastFlush = Date.now()
    },
  }
  yjsSync.initDoc(entry)
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

  // 🚨 先挂上消息缓冲：entry 要等一次数据库查询才建好，而客户端在 WebSocket
  // 握手完成的那一刻就发出 syncStep1 了。ws 的 'message' 没有监听器时**直接丢弃**
  // （不缓存），这条消息一旦失落，服务端就不会回 syncStep2，客户端
  // provider.synced 永远为 false —— 但增量更新又能互传，是"看着能用其实没握手"的假象。
  // 详见 ws-server/lib/yjs-sync.js 的 createPendingBuffer 说明。
  const pending = yjsSync.createPendingBuffer(conn)

  const entry = await ensureDoc(docName)

  // 查询期间客户端可能已经断开：此时再 setup 会留下永远不触发的 close 监听，
  // 该连接就永久留在 entry.conns 里（文档再也不会被淘汰）。
  if (conn.readyState !== 1 /* OPEN */) {
    pending.flush()
    return
  }

  // 注册连接后再接管协议：这样握手期间的广播也能覆盖到它
  entry.conns.set(conn, { userId: null, joinedAt: Date.now() })
  // 协议层负责 sync（syncStep1/2 + update）与 awareness 的收发与广播；
  // 缓冲到的消息在这里重放，补上握手丢失的那条 syncStep1
  yjsSync.setupConnection(entry, conn, { pending: pending.flush() })

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
    // 摘除该连接产生的 awareness 状态（光标/选区），否则会在其他人屏幕上永远残留
    yjsSync.detachConnection(entry, conn)
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
        // 淘汰前解绑监听，否则文档与定时器会被闭包留在内存里
        yjsSync.destroyDoc(entry)
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
