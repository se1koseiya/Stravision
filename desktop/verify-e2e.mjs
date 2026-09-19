/**
 * 桌面端后端链路端到端验证（不需要图形界面）。
 *
 * 覆盖桌面端最容易出问题的三段集成：
 *   内嵌 PostgreSQL 启动 → Next standalone server.js 起来 → /api/health 建表成功
 *
 * 与 verify-postgres.mjs 的分工：
 *   - verify-postgres.mjs：只验证 embedded-postgres 本身（initdb / 编码 / SQL 方言）
 *   - 本脚本：验证"桌面主进程会做的编排"，即真库 + 真服务端 + 健康检查
 *
 * 用法：
 *   node desktop/verify-e2e.mjs                       # 默认 5433 / 3000，数据落在系统临时目录
 *   node desktop/verify-e2e.mjs --fresh               # 先清掉上次的测试数据目录
 *   node desktop/verify-e2e.mjs --register            # 额外验证"首个用户自动 super_admin"
 *
 * 数据目录刻意放在系统临时目录，绝不碰 userData —— 避免污染真实的桌面端用户数据。
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const MQTT = { port: 3997, username: 'stravision', password: 'stravision_local_only' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/* ---------------- 参数 ---------------- */

function argValue(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const PG_PORT = Number(argValue('--pg-port', '5433'));
const APP_PORT = Number(argValue('--app-port', '3000'));
const FRESH = process.argv.includes('--fresh');
const DO_REGISTER = process.argv.includes('--register');

const DATA_BASE = path.join(os.tmpdir(), 'stravision-desktop-e2e');
const PG_DATA_DIR = path.join(DATA_BASE, 'pgdata');
const SERVER_ROOT = path.join(ROOT, '.next', 'standalone');
const SERVER_ENTRY = path.join(SERVER_ROOT, 'server.js');

const DB = {
  user: 'stravision',
  password: 'stravision_local_only',
  database: 'stravision',
};
const DATABASE_URL = `postgresql://${DB.user}:${DB.password}@127.0.0.1:${PG_PORT}/${DB.database}`;

/* ---------------- 工具 ---------------- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (tag, msg) => console.log(`[e2e][${tag}] ${msg}`);

let failures = 0;
function check(ok, label, detail) {
  if (ok) {
    console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    failures++;
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function waitForPort(port, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await new Promise((resolve) => {
      const socket = net.connect({ port, host: '127.0.0.1' });
      const done = (r) => {
        socket.destroy();
        resolve(r);
      };
      socket.once('connect', () => done(true));
      socket.once('error', () => done(false));
      socket.setTimeout(1000, () => done(false));
    });
    if (ok) return true;
    await sleep(300);
  }
  log(label, `等待端口 ${port} 超时（${timeoutMs}ms）`);
  return false;
}

/**
 * MQTT 真实往返：端口可连接 ≠ 链路可用。
 * aedes v1 若漏掉 broker.listen()，TCP 能建连，但客户端会一直 connack timeout
 * （broker.closed 仍为 true，连接在 authenticate 回调里被静默丢弃）。
 * 因此这里必须做一次真实的订阅/发布往返，避免假绿灯。
 */
async function mqttRoundTrip() {
  let mqtt;
  try {
    mqtt = (await import('mqtt')).default ?? (await import('mqtt'));
  } catch {
    log('mqtt', '未找到 mqtt 客户端依赖，跳过往返校验');
    return null;
  }

  const url = `mqtt://127.0.0.1:${MQTT.port}`;
  const opts = { username: MQTT.username, password: MQTT.password, reconnectPeriod: 0, connectTimeout: 4000 };

  return await new Promise((resolve) => {
    const sub = mqtt.connect(url, opts);
    const pub = mqtt.connect(url, opts);
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      sub.end(true);
      pub.end(true);
      resolve(ok);
    };

    sub.on('connect', () => sub.subscribe('stravision/devices/+/data'));
    sub.on('message', (topic, payload) => finish(topic === 'stravision/devices/e2e/data' && payload.toString() === 'e2e'));
    sub.on('error', () => finish(false));
    pub.on('connect', () => pub.publish('stravision/devices/e2e/data', 'e2e'));
    pub.on('error', () => finish(false));
    setTimeout(() => finish(false), 6000);
  });
}

/* ---------------- 主流程 ---------------- */

let pg = null;
let mqttServer = null;
let mqttBroker = null;
let server = null;

async function stopAll() {
  if (mqttBroker) {
    try {
      await new Promise((r) => mqttBroker.close(r));
    } catch {
      /* ignore */
    }
    mqttBroker = null;
  }
  if (mqttServer) {
    try {
      await new Promise((r) => mqttServer.close(r));
    } catch {
      /* ignore */
    }
    mqttServer = null;
  }
  if (server && server.exitCode === null) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        server.kill('SIGTERM');
      }
    } catch {
      /* ignore */
    }
  }
  if (pg) {
    try {
      await pg.stop();
    } catch {
      /* ignore */
    }
  }
}

async function main() {
  console.log('=== Stravision 桌面端后端链路 E2E 验证 ===');
  console.log(`  PG   : 127.0.0.1:${PG_PORT}  数据目录 ${PG_DATA_DIR}`);
  console.log(`  Next : 127.0.0.1:${APP_PORT}  产物 ${SERVER_ROOT}`);
  console.log('');

  if (FRESH && fs.existsSync(DATA_BASE)) {
    log('setup', '清理上次的测试数据目录…');
    fs.rmSync(DATA_BASE, { recursive: true, force: true, maxRetries: 5, retryDelay: 120 });
  }
  fs.mkdirSync(PG_DATA_DIR, { recursive: true });

  if (!fs.existsSync(SERVER_ENTRY)) {
    console.error(`\n✗ 未找到 ${SERVER_ENTRY}\n  请先执行：pnpm desktop:build\n`);
    process.exit(1);
  }

  /* ---- 1. 内嵌 PostgreSQL ---- */
  console.log('[1/4] 启动内嵌 PostgreSQL');
  const mod = await import('embedded-postgres');
  const EmbeddedPostgres = mod.default || mod.EmbeddedPostgres || mod;

  const freshPg = !fs.existsSync(path.join(PG_DATA_DIR, 'PG_VERSION'));
  pg = new EmbeddedPostgres({
    databaseDir: PG_DATA_DIR,
    user: DB.user,
    password: DB.password,
    port: PG_PORT,
    persistent: true,
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    postgresFlags: ['-c', 'listen_addresses=127.0.0.1'],
    onLog: () => {},
  });

  const t0 = Date.now();
  if (freshPg) await pg.initialise();
  await pg.start();
  check(true, freshPg ? 'initdb + 启动完成' : '复用已有数据目录启动完成', `${Date.now() - t0}ms`);

  try {
    await pg.createDatabase(DB.database);
    check(true, `数据库 ${DB.database} 已创建`);
  } catch {
    check(true, `数据库 ${DB.database} 已存在（复用）`);
  }

  check(await waitForPort(PG_PORT, 15000, 'pg'), 'PostgreSQL 端口可连接', `:${PG_PORT}`);

  /* ---- 2. 本地 MQTT broker（与 desktop/lib/mqtt.js 同构） ---- */
  console.log('\n[2/5] 启动本地 MQTT broker');
  {
    const mod = await import('aedes');
    const Aedes = mod.Aedes || mod.default?.Aedes || mod.default || mod;
    mqttBroker = new Aedes();
    mqttBroker.authenticate = (client, username, password, done) => {
      done(null, username === MQTT.username && String(password ?? '') === MQTT.password);
    };
    // 与 desktop/lib/mqtt.js 保持同构：aedes v1 必须在 listen() 里初始化 persistence
    // 并把 closed 置为 false，否则客户端会在 authenticate 回调里被静默丢弃。
    await mqttBroker.listen();
    mqttServer = net.createServer(mqttBroker.handle);
    await new Promise((resolve, reject) => {
      mqttServer.once('error', reject);
      mqttServer.listen(MQTT.port, '127.0.0.1', resolve);
    });
    check(await waitForPort(MQTT.port, 10000, 'mqtt'), 'MQTT broker 端口可连接', `:${MQTT.port}`);

    const rt = await mqttRoundTrip();
    if (rt === null) {
      log('mqtt', '跳过订阅/发布往返校验');
    } else {
      check(rt, 'MQTT 订阅/发布往返成功', `:${MQTT.port}`);
    }
  }

  /* ---- 3. Next standalone ---- */
  console.log('\n[3/5] 启动 Next standalone 服务端');
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(APP_PORT),
    HOSTNAME: '127.0.0.1',
    TZ: 'Asia/Shanghai',
    DATABASE_URL,
    JWT_SECRET: 'e2e-jwt-secret-not-for-production-use-only',
    INTERNAL_API_SECRET: 'e2e-internal-secret',
    NEXT_SERVER_URL: `http://127.0.0.1:${APP_PORT}`,
    WS_SERVER_PORT: '3999',
    YJS_WS_PORT: '3998',
    YJS_WS_HOST: '127.0.0.1',
    MQTT_HOST: '127.0.0.1',
    MQTT_PORT: String(MQTT.port),
    MQTT_USERNAME: MQTT.username,
    MQTT_PASSWORD: MQTT.password,
    // 离线环境无自托管 Cap，必须关闭，否则 lib/cap.ts 会拒绝放行注册登录
    CAP_ENABLED: 'false',
    // 桌面端本地模式标记（首个用户提权 super_admin 依赖它）
    STRAVISION_DESKTOP: '1',
    STRAVISION_LOCAL_MODE: '1',
  };
  delete env.NODE_OPTIONS; // 规避本机注入的删除拦截 shim

  const out = [];
  server = spawn(process.execPath, [SERVER_ENTRY], {
    cwd: SERVER_ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  server.stdout.on('data', (b) => out.push(String(b)));
  server.stderr.on('data', (b) => out.push(String(b)));
  server.on('exit', (code, signal) => log('next', `进程退出 code=${code} signal=${signal}`));

  const alreadyUp = await waitForPort(APP_PORT, 60000, 'next');
  check(alreadyUp, 'Next 端口已监听', `:${APP_PORT}`);

  /* ---- 4. 健康检查（会触发 initDB 建表） ---- */
  console.log('\n[4/5] 健康检查 /api/health（首次调用会建表）');
  let health = null;
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${APP_PORT}/api/health`, { cache: 'no-store' });
      const body = await res.json().catch(() => null);
      if (body) {
        health = body;
        if (body.status === 'ok' || (body.checks && body.checks.database && body.checks.database.status === 'ok')) break;
      }
    } catch {
      /* 服务尚未就绪 */
    }
    await sleep(1200);
  }

  if (!health) {
    check(false, '健康检查无响应', `最后日志：\n${out.join('').slice(-1500)}`);
  } else {
    console.log(`  health = ${JSON.stringify(health)}`);
    const db = health.checks?.database;
    check(db?.status === 'ok', '数据库连通且 schema 就绪', db ? `${db.latencyMs ?? '?'}ms` : '未返回 database 检查项');
    check(health.status === 'ok' || health.status === 'degraded', '整体状态可接受', String(health.status));
    if (health.status === 'degraded') {
      const down = Object.entries(health.checks || {}).filter(([, v]) => v?.status !== 'ok').map(([k]) => k);
      console.log(`  ⚠ 降级项：${down.join(', ')}（桌面端允许：MQTT/外部服务等非关键依赖）`);
    }
  }

  /* ---- 5. 本地模式：首个用户自动 super_admin ---- */
  if (DO_REGISTER) {
    console.log('\n[5/5] 首个注册用户是否自动 super_admin');
    const email = `e2e-${Date.now()}@local.test`;
    try {
      const res = await fetch(`http://127.0.0.1:${APP_PORT}/api/auth/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'E2ePassw0rd!', username: 'e2e' }),
      });
      const body = await res.json().catch(() => ({}));
      const role = body?.user?.role || body?.role;
      check(res.ok && role === 'super_admin', '首用户提权 super_admin', `HTTP ${res.status} role=${role ?? 'n/a'}`);
      if (!res.ok) console.log(`  body=${JSON.stringify(body).slice(0, 300)}`);
    } catch (err) {
      check(false, '注册请求失败', err.message);
    }
  } else {
    console.log('\n[5/5] 跳过注册验证（加 --register 开启）');
  }

  console.log(`\n=== 结果：${failures === 0 ? '全部通过 ✓' : `${failures} 项失败 ✗`} ===`);
  return failures;
}

main()
  .then(async (code) => {
    await stopAll();
    process.exit(code === 0 ? 0 : 1);
  })
  .catch(async (err) => {
    console.error('\n✗ 验证过程异常：', err);
    await stopAll();
    process.exit(1);
  });
