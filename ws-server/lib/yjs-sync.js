'use strict';

/**
 * Yjs WebSocket 同步协议层（服务端）。
 *
 * ── 为什么不用上游的 setupWSConnection ──────────────────────────────
 * y-websocket 自 2.x 起把服务端工具（旧 `bin/utils.js` 里的 setupWSConnection）
 * 从包里剥离，3.x 只剩客户端 provider。本项目此前
 *   require("y-websocket/bin/utils")
 * 在 3.0.0 下必然抛 ERR_PACKAGE_PATH_NOT_EXPORTED（该包已无 bin/ 目录），
 * 协作服务从来没真正启动过；而且那处调用签名本身也是错的
 * （第三参按官方约定是 `req`，代码里传的是一个 Y.Doc 实例）。
 *
 * 这里用官方的 `y-protocols` + `lib0` 直接实现同一套线协议，语义与
 * y-websocket 1.x 的服务端实现一致 —— 客户端 `WebsocketProvider` 完全兼容。
 * 自己实现的真正理由是**文档生命周期**：本服务需要
 *   「从 kb_yjs_documents 预载状态 → 连接期广播 → 断开落库」
 * 而上游的 getYDoc 会按 docName 自行托管一份**空文档**，预载的状态会被丢掉。
 *
 * ── 线协议 ────────────────────────────────────────────────────────
 * 每条消息 = varUint(type) + varUint8Array(payload)
 *   type 0 = sync      （syncStep1 / syncStep2 / update，见 y-protocols/sync）
 *   type 1 = awareness （光标与在线状态，见 y-protocols/awareness）
 *
 * 与上游实现的三处一致行为（客户端依赖这些，勿改）：
 *   1. 服务端自身不占 awareness 位（setLocalState(null)），否则客户端会看到
 *      一个永不消失的"幽灵协作者"。
 *   2. 连接建立后先发 syncStep1，再补发当前全部 awareness 状态。
 *   3. 连接断开时摘除它控制的 awareness 状态（否则光标永远留在别人屏幕上）。
 *
 * ── entry 契约 ────────────────────────────────────────────────────
 * 本模块不改动 yjs-server.js 原有的文档缓存结构，只要求 entry 具备：
 *   { yDoc, conns: Map<conn, meta>, onChange?: () => void }
 * 调用方负责 entry 的创建 / 淘汰，本模块负责其协议生命周期：
 *   initDoc(entry) → setupConnection(entry, conn) → detachConnection(entry, conn)
 *   → destroyDoc(entry)
 */

const syncProtocol = require('y-protocols/sync');
const awarenessProtocol = require('y-protocols/awareness');
const encoding = require('lib0/encoding');
const decoding = require('lib0/decoding');

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

/** WebSocket.OPEN；用字面量避免依赖 ws 的常量表 */
const WS_OPEN = 1;

/**
 * 初始化文档的协议状态（幂等）。
 * 同一份 yDoc 只挂一次广播监听，避免连接数增长时重复广播。
 */
function initDoc(entry) {
  if (entry.awareness) return entry;

  entry.awareness = new awarenessProtocol.Awareness(entry.yDoc);
  // 服务端不参与在线状态，否则客户端会看到一个永不消失的协作者
  entry.awareness.setLocalState(null);
  /** conn → Set<clientId>：断开时据此精确摘除该连接产生的光标 */
  entry.controlledIds = new Map();

  // 文档内容变化 → 广播给所有连接
  entry.docUpdateHandler = (update) => {
    if (typeof entry.onChange === 'function') entry.onChange();
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    broadcast(entry, encoding.toUint8Array(encoder));
  };
  entry.yDoc.on('update', entry.docUpdateHandler);

  // 在线状态变化 → 广播给所有连接
  entry.awarenessUpdateHandler = ({ added, updated, removed }, origin) => {
    const changedClients = added.concat(updated, removed);
    // 记下每个连接"拥有"哪些 clientId（origin 为 null 表示服务端自身的行为）
    if (origin !== null && entry.controlledIds.has(origin)) {
      const owned = entry.controlledIds.get(origin);
      added.forEach((id) => owned.add(id));
      removed.forEach((id) => owned.delete(id));
    }
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(entry.awareness, changedClients),
    );
    broadcast(entry, encoding.toUint8Array(encoder));
  };
  entry.awareness.on('update', entry.awarenessUpdateHandler);

  return entry;
}

function send(entry, conn, message) {
  if (conn.readyState !== WS_OPEN) {
    // 连接已不可用：关掉它，清理交给 close 事件（单一出口，避免重复摘除 awareness）
    try {
      conn.close();
    } catch {
      /* 已关闭 */
    }
    return;
  }
  try {
    conn.send(message, (err) => {
      if (err) {
        try {
          conn.close();
        } catch {
          /* 已关闭 */
        }
      }
    });
  } catch {
    try {
      conn.close();
    } catch {
      /* 已关闭 */
    }
  }
}

function broadcast(entry, message) {
  for (const conn of entry.conns.keys()) send(entry, conn, message);
}

/**
 * 处理一条来自连接的消息。
 * （从 setupConnection 的闭包里提出来，是为了能重放"缓冲期"收到的消息）
 */
function handleMessage(entry, conn, data) {
  let decoder;
  let messageType;
  try {
    decoder = decoding.createDecoder(new Uint8Array(data));
    messageType = decoding.readVarUint(decoder);
  } catch (err) {
    console.error('[yjs-sync] 无法解析消息头:', err && err.message);
    return;
  }

  try {
    if (messageType === MESSAGE_SYNC) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      // readSyncMessage 会把 syncStep2 里的 update 应用到 entry.yDoc，
      // 应用动作会触发 docUpdateHandler → 广播（含回给本连接，上游亦如此）
      syncProtocol.readSyncMessage(decoder, encoder, entry.yDoc, conn);
      // 除类型位外还有内容 = 需要回包（syncStep2 / update）
      if (encoding.length(encoder) > 1) {
        send(entry, conn, encoding.toUint8Array(encoder));
      }
    } else if (messageType === MESSAGE_AWARENESS) {
      awarenessProtocol.applyAwarenessUpdate(
        entry.awareness,
        decoding.readVarUint8Array(decoder),
        conn,
      );
    }
    // 其它类型（如上游的 auth，本服务用 URL token 鉴权）忽略
  } catch (err) {
    console.error('[yjs-sync] 处理消息失败:', err && err.message);
  }
}

/**
 * 在文档 entry 就绪之前，先把这条连接收到的消息收下来。
 *
 * 🚨 为什么必须有这一步：ws 的 'message' 是 EventEmitter 事件，
 * **没有监听器时消息会被直接丢弃**（不会缓存、不会稍后补发）。
 * 而本服务的 entry 要先查一次数据库（loadDocStateFromDb）才建得出来，
 * 客户端却在 WebSocket 握手完成的那一刻就把 syncStep1 发出来了 —— 这条消息
 * 正好落在"查询窗口"里被丢掉，于是：
 *   · 服务端不会回 syncStep2 → 客户端 provider.synced 永远为 false（它靠这个置位）
 *   · 但之后的增量更新又能正常互传（那时监听器已挂上）
 * 也就是"看着能用、其实根本没握手"的诡异状态，只在带异步初始化的服务端出现，
 * 上游 y-websocket 的服务端因为 getYDoc 是同步的，没有这个问题。
 */
function createPendingBuffer(conn) {
  const messages = [];
  const collector = (data) => messages.push(data);
  conn.on('message', collector);
  return {
    /** 摘下缓冲并取出消息，交给 setupConnection 重放 */
    flush() {
      conn.off('message', collector);
      return messages;
    },
  };
}

/**
 * 接管一条已建立的连接。
 * 调用方需先把 conn 放进 entry.conns（本服务用它做生命周期统计）；
 * 若 entry 是异步建好的，须把 createPendingBuffer() 取到的消息通过 pending 传进来重放。
 *
 * @param {object} entry
 * @param {import('ws').WebSocket} conn
 * @param {{ pending?: unknown[] }} [opts]
 */
function setupConnection(entry, conn, opts = {}) {
  const { pending = [] } = opts;
  initDoc(entry);

  if (!entry.conns.has(conn)) entry.conns.set(conn, {});
  entry.controlledIds.set(conn, new Set());

  conn.binaryType = 'arraybuffer';

  conn.on('message', (data) => handleMessage(entry, conn, data));

  // 1) 先握手：把本地 state vector 交给客户端，由它回 syncStep2
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(encoder, entry.yDoc);
  send(entry, conn, encoding.toUint8Array(encoder));

  // 2) 再把当前已知的在线状态补发给新连接
  const states = entry.awareness.getStates();
  if (states.size > 0) {
    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(entry.awareness, Array.from(states.keys())),
    );
    send(entry, conn, encoding.toUint8Array(awarenessEncoder));
  }

  // 3) 回放缓冲期收到的消息（通常就是那条被丢掉的 syncStep1）
  for (const data of pending) handleMessage(entry, conn, data);
}

/** 摘除一条连接：清理它产生的 awareness 状态（必须在 close 时调用） */
function detachConnection(entry, conn) {
  if (!entry.controlledIds) return;
  const owned = entry.controlledIds.get(conn);
  entry.controlledIds.delete(conn);
  if (owned && owned.size > 0) {
    // origin 传 null：这是服务端的被动清理，不需要再回写控制的 clientId
    awarenessProtocol.removeAwarenessStates(entry.awareness, Array.from(owned), null);
  }
}

/** 文档从缓存淘汰时解绑监听，避免定时器/闭包把整个文档留在内存里 */
function destroyDoc(entry) {
  if (!entry.awareness) return;
  try {
    entry.yDoc.off('update', entry.docUpdateHandler);
    entry.awareness.off('update', entry.awarenessUpdateHandler);
    entry.awareness.destroy();
  } catch {
    /* 忽略：淘汰路径不应因清理失败而中断 */
  }
}

module.exports = {
  MESSAGE_SYNC,
  MESSAGE_AWARENESS,
  initDoc,
  createPendingBuffer,
  setupConnection,
  detachConnection,
  destroyDoc,
};
