/**
 * yjs 协作服务同步往返验证（真实客户端 + 真实服务端协议层）。
 *
 * 为什么要有这个脚本：这个服务此前一直"能启动但不工作" —— 它 require 的
 * y-websocket/bin/utils 在 3.x 已被删除，崩在 require 阶段，任何"进程起来了"
 * 的检查都发现不了。所以这里只认**行为**：
 *
 *   1. 服务端预载的文档状态能下发到第一个连上来的客户端
 *      （这正是不能用上游 getYDoc 的原因：它按 docName 自管空文档，会丢掉预载）
 *   2. A 写入 → B 收到（syncStep1/2 + update 广播）
 *   3. B 写入 → A 收到（双向）
 *   4. awareness（光标/在线状态）能互相看到
 *   5. 断开后该连接的 awareness 被摘除（否则是"幽灵协作者"）
 *
 * 🚨 `disableBc: true` 是必须的：两个 provider 在同一进程里，若开启
 * BroadcastChannel，它们会绕过 WebSocket 直接互通 —— 那样即使服务端
 * 完全没工作，测试也会全绿。这是本脚本最容易写出假通过的地方。
 *
 * 🚨 全部依赖必须走 CJS require，不能 `import`：yjs 同时提供 ESM / CJS 两份产物，
 * 若本脚本 import 一份、y-websocket 与 y-protocols require 另一份，就会出现两个
 * 互不相识的 yjs 实例（"Yjs was already imported" 警告），构造检查失效、
 * 同步行为失真。统一 require 才能保证整条链路共用同一个 yjs。
 *
 * 用法：node scripts/test-yjs-sync.mjs
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { WebSocketServer } = require('ws');
const WS = require('ws');
const Y = require('yjs');
const { WebsocketProvider } = require('y-websocket');
const yjsSync = require('../ws-server/lib/yjs-sync.js');

const PRELOAD = '服务端预载内容';

const failures = [];
const ok = (name) => console.log(`  ✅ ${name}`);
const bad = (name, detail) => {
  failures.push(name);
  console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
};

// 看门狗：测试脚本绝不允许挂住（ws 服务端在连接未正常关闭时 close() 不回调，
// 会让整个进程悬住，CI 里表现为"卡死不返回"）。到点直接给出失败结论并退出。
const WATCHDOG_MS = Number(process.env.YJS_TEST_TIMEOUT_MS || 60000);
const watchdog = setTimeout(() => {
  console.error(`\n[watchdog] 超过 ${WATCHDOG_MS}ms 未结束，强制退出 ❌`);
  process.exit(2);
}, WATCHDOG_MS);

function assert(cond, name, detail) {
  if (cond) ok(name);
  else bad(name, detail);
}

/** 轮询等待条件成立；超时返回 false，由调用方断言 */
async function waitFor(fn, { timeout = 5000, interval = 50 } = {}) {
  const deadline = Date.now() + timeout;
  for (;;) {
    let value;
    try {
      value = fn();
    } catch {
      value = false;
    }
    if (value) return true;
    if (Date.now() > deadline) return false;
    await new Promise((r) => setTimeout(r, interval));
  }
}

/* ── 服务端：一份预载了内容的文档，行为与 yjs-server.js 的接线一致 ── */
const serverDoc = new Y.Doc();
serverDoc.getText('content').insert(0, PRELOAD);

const entry = {
  yDoc: serverDoc,
  conns: new Map(),
  onChange: () => {},
};
yjsSync.initDoc(entry);

const wss = new WebSocketServer({ port: 0, host: '127.0.0.1' });
await new Promise((resolve, reject) => {
  wss.once('listening', resolve);
  wss.once('error', reject);
});
const port = wss.address().port;
const url = `ws://127.0.0.1:${port}`;
console.log(`服务端已启动 ${url}\n`);

wss.on('connection', (conn) => {
  entry.conns.set(conn, {});
  yjsSync.setupConnection(entry, conn);
  conn.on('close', () => {
    entry.conns.delete(conn);
    yjsSync.detachConnection(entry, conn);
  });
});

const providerOpts = { WebSocketPolyfill: WS, disableBc: true, connect: true };
const providers = [];
const makeClient = () => {
  const doc = new Y.Doc();
  const provider = new WebsocketProvider(url, 'kb-doc-1', doc, providerOpts);
  providers.push(provider);
  return { doc, provider, text: doc.getText('content') };
};

const cleanup = async () => {
  for (const p of providers) {
    try {
      p.destroy();
    } catch {
      /* 忽略 */
    }
  }
  // wss.close() 要等所有连接断开才回调；连接未干净关闭时会永远悬住，
  // 所以这里只等有限时间，剩下的交给 process.exit 收尾。
  await Promise.race([
    new Promise((r) => wss.close(r)),
    new Promise((r) => setTimeout(r, 2000)),
  ]);
};

/* ── 用例二：entry 异步就绪（真实服务端形态）下的握手 ──
 *
 * 真实 yjs-server.js 的 entry 要先查一次数据库才建得出来，客户端的 syncStep1
 * 恰好落在那个窗口里。ws 的 'message' 没有监听器时会**直接丢弃**，
 * 于是服务端不回 syncStep2、客户端 provider.synced 永远为 false，
 * 但增量更新又能互传 —— 一个"看着能用"的假象。
 * 这里用 300ms 的延迟复刻那个窗口，断言缓冲重放确实把 syncStep1 补了回来。
 */
async function runDeferredInitCase() {
  const delayMs = 300;
  const deferredDoc = new Y.Doc();
  deferredDoc.getText('content').insert(0, '延迟初始化预载');

  const wss2 = new WebSocketServer({ port: 0, host: '127.0.0.1' });
  await new Promise((resolve, reject) => {
    wss2.once('listening', resolve);
    wss2.once('error', reject);
  });
  const port2 = wss2.address().port;

  let entry2 = null;
  wss2.on('connection', async (conn) => {
    // 🚨 与 yjs-server.js 同序：先缓冲，再 await，最后重放
    const pending = yjsSync.createPendingBuffer(conn);
    await new Promise((r) => setTimeout(r, delayMs));
    if (!entry2) {
      entry2 = { yDoc: deferredDoc, conns: new Map(), onChange: () => {} };
      yjsSync.initDoc(entry2);
    }
    entry2.conns.set(conn, {});
    yjsSync.setupConnection(entry2, conn, { pending: pending.flush() });
    conn.on('close', () => {
      entry2.conns.delete(conn);
      yjsSync.detachConnection(entry2, conn);
    });
  });

  const doc = new Y.Doc();
  const provider = new WebsocketProvider(`ws://127.0.0.1:${port2}`, 'kb-doc-1', doc, providerOpts);
  providers.push(provider);

  const synced = await waitFor(() => provider.synced, { timeout: 8000 });
  assert(synced, `异步就绪(延迟 ${delayMs}ms)下客户端仍能完成握手（缓冲重放生效）`);

  const gotPreload = await waitFor(() => doc.getText('content').toString() === '延迟初始化预载');
  assert(gotPreload, '异步就绪下预载状态仍能下发', `实际="${doc.getText('content').toString()}"`);

  await Promise.race([
    new Promise((r) => wss2.close(r)),
    new Promise((r) => setTimeout(r, 2000)),
  ]);
}

try {
  /* 1) 预载状态下发 */
  const A = makeClient();
  const syncedA = await waitFor(() => A.provider.synced, { timeout: 8000 });
  assert(syncedA, '客户端 A 完成初始同步（sync 事件）');
  assert(A.text.toString() === PRELOAD, 'A 收到服务端预载的文档状态', `实际="${A.text.toString()}"`);

  /* 2) A 写入 → B 收到 */
  A.text.insert(A.text.length, '｜A写入');
  const B = makeClient();
  await waitFor(() => B.provider.synced, { timeout: 8000 });
  const gotA = await waitFor(() => B.text.toString().includes('A写入'));
  assert(gotA, 'A 的写入传递给新连接的 B', `B 实际="${B.text.toString()}"`);

  /* 3) B 写入 → A 收到（反向） */
  B.text.insert(B.text.length, '｜B写入');
  const gotB = await waitFor(() => A.text.toString().includes('B写入'));
  assert(gotB, 'B 的写入回传给 A', `A 实际="${A.text.toString()}"`);

  /* 4) awareness 互通 */
  A.provider.awareness.setLocalStateField('user', { name: 'A' });
  const sawAwareness = await waitFor(() =>
    [...B.provider.awareness.getStates().values()].some((s) => s?.user?.name === 'A'),
  );
  assert(sawAwareness, 'B 能看到 A 的 awareness（在线状态）');

  /* 5) 断开后摘除 awareness（幽灵协作者回归） */
  const bClientId = B.provider.awareness.clientID;
  B.provider.destroy();
  const removed = await waitFor(() => !A.provider.awareness.getStates().has(bClientId), {
    timeout: 5000,
  });
  assert(removed, 'B 断开后其 awareness 被服务端摘除');

  /* 6) 同一文档并发首连不产生"两份文档"（ensureDoc 的 pending 收敛） */
  const C = makeClient();
  const D = makeClient();
  await Promise.all([
    waitFor(() => C.provider.synced, { timeout: 8000 }),
    waitFor(() => D.provider.synced, { timeout: 8000 }),
  ]);
  C.text.insert(0, '[C]');
  const dGotC = await waitFor(() => D.text.toString().startsWith('[C]'));
  if (dGotC) ok('并发首连的两个客户端落在同一份文档上');
  else bad('并发首连的两个客户端落在同一份文档上', `D 实际="${D.text.toString()}"`);

  /* 7) 异步就绪（真实服务端形态）下的握手 —— 见 runDeferredInitCase 说明 */
  await runDeferredInitCase();
} catch (err) {
  bad('测试执行异常', err && err.stack ? err.stack.split('\n')[0] : String(err));
} finally {
  await cleanup();
  clearTimeout(watchdog);
}

console.log('');
if (failures.length) {
  console.log(`结果：${failures.length} 项失败 ❌`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('结果：全部通过 ✓');
process.exit(0);
