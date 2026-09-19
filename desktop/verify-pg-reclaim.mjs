/**
 * 「内嵌 PostgreSQL 端口回收」回归测试 —— 对应 desktop/lib/pg-guard.js。
 *
 * 复刻的真实故障：
 *   应用被强杀 / 崩溃 / 断电后，内嵌 postgres 会以两种形态把端口 5433 吊住，
 *   导致下次启动 PG 绑不上端口，应用永久停在「正在初始化本地数据库…」：
 *
 *   (a)【孤儿形态，实机实测过】postmaster 被 taskkill /T 直接打死，但它 fork 的
 *      子进程（如 io_worker）继承了监听套接字句柄继续存活 ——
 *      `Get-NetTCPConnection` 报的 OwningProcess 是个查不到的 PID，
 *      所以**按端口反查 PID 抓不到真凶**，只能按进程命令行里的捆绑二进制路径反查。
 *   (b)【僵留形态】postmaster 本身还活着（bootstrap 抛错提前退出、shutdown 没跑完等）。
 *
 * 本测试断言守卫对两种形态都能识别 + 回收，且**绝不误伤**用户自己安装的
 * PostgreSQL（如 C:\Program Files\PostgreSQL\18）。
 *
 * 主断言用的是 (b) 形态：确定性、可复现，而且顺带覆盖 pg_ctl 优雅停止分支；
 * (a) 形态做尽力而为的复刻（打死 postmaster 后看孤儿是否留存），复刻成功才断言。
 *
 * 用法：pnpm desktop:verify:pg-reclaim
 */

import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pgGuard = require('./lib/pg-guard.js');

const PORT = Number(process.env.VERIFY_PG_RECLAIM_PORT || 5433);
const CHILD = path.join(__dirname, 'verify-pg-reclaim-child.mjs');
const log = (...a) => console.log('[pg-reclaim]', ...a);

let failures = 0;
function check(ok, label, detail) {
  console.log(`  ${ok ? '✅' : '❌'} ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isPortOpen(port, host = '127.0.0.1', timeoutMs = 700) {
  return new Promise((resolve) => {
    const s = net.createConnection({ port, host });
    const done = (open) => {
      s.destroy();
      resolve(open);
    };
    s.setTimeout(timeoutMs);
    s.once('connect', () => done(true));
    s.once('timeout', () => done(false));
    s.once('error', () => done(false));
  });
}

async function waitPortFree(port, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await isPortOpen(port))) return true;
    await sleep(500);
  }
  return false;
}

function killPidForce(pid) {
  if (!pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(pid), '/F'], { stdio: 'ignore', windowsHide: true });
  } else {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* ignore */
    }
  }
}

function ps(command) {
  const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', command], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 20000,
  });
  return String(r.stdout || '').trim();
}

/** 谁在监听端口（取第一个 PID） */
function pidListeningOn(port) {
  const out = ps(`Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess`);
  const n = Number(out);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** 某进程的直接子进程里第一个 postgres.exe —— 即 postmaster（embedded-postgres 直接 spawn 它） */
function postmasterPidOf(parentPid) {
  const out = ps(`Get-CimInstance Win32_Process -Filter "ParentProcessId=${parentPid} and Name='postgres.exe'" | Select-Object -First 1 -ExpandProperty ProcessId`);
  const n = Number(out);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** 起一个内嵌库子进程，等它打印 PG_READY */
async function startChild(dataDir) {
  const child = spawn(process.execPath, [CHILD, '--data-dir', dataDir, '--port', String(PORT)], {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  child.stdout.on('data', (c) => (out += c.toString()));
  child.stderr.on('data', (c) => (out += c.toString()));
  const t0 = Date.now();
  while (Date.now() - t0 < 180000) {
    if (out.includes('PG_READY')) return { child, ok: true, secs: ((Date.now() - t0) / 1000).toFixed(1) };
    if (child.exitCode !== null) break;
    await sleep(300);
  }
  return { child, ok: false, secs: ((Date.now() - t0) / 1000).toFixed(1), out };
}

/* ==================== 主流程 ==================== */

log('桌面端内嵌 PG — 端口回收（pg-guard）回归');
log(`端口: ${PORT}\n`);

const binDir = pgGuard.resolveBinDir();
check(!!binDir, '定位随包 postgres 二进制目录', binDir || '未找到');
if (!binDir) process.exit(1);

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stravision-pg-reclaim-'));
log(`数据目录: ${dataDir}\n`);

/* --- 前置：确保起点干净 --- */
if (await isPortOpen(PORT)) {
  log(`起点端口 ${PORT} 被占用，先做一次前置回收…`);
  const pre = await pgGuard.reclaimOwnPostgres({ port: PORT, pgDataDir: dataDir, log: (m) => log('  ·', m) });
  log(`  前置回收: ${pre.status}\n`);
}
check(!(await isPortOpen(PORT)), `起点：端口 ${PORT} 空闲`);

/* --- 1. 起真库 --- */
log('\n[1] 子进程启动内嵌库（扮演 Electron 主进程）…');
let { child, ok, secs, out } = await startChild(dataDir);
check(ok, `内嵌库启动并打印 PG_READY（${secs}s）`, ok ? undefined : String(out).slice(-400));
if (!ok) {
  killPidForce(child.pid);
  process.exit(1);
}

/* --- 2. 识别逻辑 --- */
const found = pgGuard.listOwnPostgresPids(binDir);
check(found.pids.length > 0, '按捆绑二进制路径识别出自家 postgres 进程（≥1）', `pids=[${found.pids.join(', ')}]`);

// 绝不误伤：用户自己安装的 PostgreSQL（5432）不能被算进来
const foreignPid = pidListeningOn(5432);
if (foreignPid) {
  check(
    !found.pids.includes(foreignPid),
    '不把用户自装的 PostgreSQL 算作自家进程（端口 5432）',
    `5432 owner=${foreignPid}`,
  );
} else {
  log('  ℹ️ 本机 5432 上没有其他 PostgreSQL，跳过「不误伤」断言');
}

/* --- 3. 主断言：回收「仍活着」的实例（覆盖 pg_ctl 优雅停止分支） --- */
log('\n[2] 让库保持运行，直接调用守卫回收（= 上次实例僵留占着端口）…');
check(await isPortOpen(PORT), '回收前：端口确实被占用');
const live = await pgGuard.reclaimOwnPostgres({
  port: PORT,
  pgDataDir: dataDir,
  binDir,
  log: (m) => log('  ·', m),
});
log(`  回收结果: ${live.status}${live.pids ? ` (pids=${live.pids.join(', ')})` : ''}`);
check(live.status === 'reclaimed', '守卫识别并回收了僵留实例', `status=${live.status}`);
check(await waitPortFree(PORT, 20000), `端口 ${PORT} 已释放，应用可正常启动`);

/* --- 4. 幂等 --- */
const again = await pgGuard.reclaimOwnPostgres({ port: PORT, pgDataDir: dataDir, binDir, log: () => {} });
check(again.status === 'free', '端口空闲时守卫不做任何动作（幂等）', `status=${again.status}`);

/* --- 5. 尽力复刻「孤儿形态」：只打死 postmaster，看 worker 是否攥住句柄 --- */
log('\n[3] 复刻孤儿形态：重启库后只打死 postmaster（不杀进程树）…');
killPidForce(child.pid);
await sleep(1500);

({ child, ok, secs, out } = await startChild(dataDir));
if (!ok) {
  log(`  ℹ️ 复刻步骤重启失败，跳过（${String(out).slice(-200)}）`);
} else {
  const postmaster = postmasterPidOf(child.pid);
  log(`  · postmaster = ${postmaster ?? '(未找到)'}，父 node = ${child.pid}`);
  if (!postmaster) {
    log('  ℹ️ 未定位到 postmaster，跳过孤儿复刻');
  } else {
    killPidForce(postmaster); // 只打 postmaster，子 worker 若攥着句柄就成孤儿
    await sleep(3000);
    const orphan = await isPortOpen(PORT);
    if (orphan) {
      log(`  · 孤儿复刻成功：postmaster 已死，端口 ${PORT} 仍被 worker 攥住`);
      const rec = await pgGuard.reclaimOwnPostgres({ port: PORT, pgDataDir: dataDir, binDir, log: (m) => log('    ·', m) });
      check(rec.status === 'reclaimed', '孤儿形态也能被守卫回收', `status=${rec.status}`);
      check(await waitPortFree(PORT, 20000), '孤儿回收后端口已释放');
    } else {
      log('  ℹ️ 本次未留存孤儿（worker 随 postmaster 一起退了），跳过该项断言');
    }
    killPidForce(child.pid);
  }
}

killPidForce(child.pid);
console.log(`\n结果：${failures === 0 ? '全部通过 ✅' : `${failures} 项失败 ❌`}`);
console.log(`数据目录保留以便翻查：${dataDir}`);
process.exit(failures === 0 ? 0 : 1);
