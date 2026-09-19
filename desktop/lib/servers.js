'use strict';

/**
 * 子进程编排：Next 服务端 + 语音 WebSocket 服务 + Yjs 协作服务。
 *
 * 关键设计：用 Electron 自带的 Node 运行这些服务（ELECTRON_RUN_AS_NODE=1），
 * 而不是系统 Node —— 离线桌面端不能假设用户装过 Node。
 * 这样也保证运行环境与 Electron 内置版本一致，避免版本漂移。
 */

const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const logger = require('./logger');

/** 已纳管的子进程 */
const managed = [];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function launch({ name, script, cwd, env, onExit }) {
  const child = spawn(process.execPath, [script], {
    cwd,
    env: { ...process.env, ...env, ELECTRON_RUN_AS_NODE: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  const record = { name, child, exited: false, script };
  managed.push(record);

  const forward = (isErr) => (buf) => {
    const text = String(buf).replace(/\s+$/, '');
    if (!text) return;
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      if (isErr) logger.warn(name, line);
      else logger.info(name, line);
    }
  };

  child.stdout.on('data', forward(false));
  child.stderr.on('data', forward(true));

  child.on('error', (err) => {
    logger.error(name, `子进程启动失败: ${err.message}`);
  });

  child.on('exit', (code, signal) => {
    record.exited = true;
    logger.warn(name, `进程退出 code=${code} signal=${signal}`);
    if (onExit) onExit(code, signal);
  });

  logger.info(name, `已启动 pid=${child.pid} (${path.basename(script)})`);
  return child;
}

/** HTTP 健康检查轮询，返回 true 或抛出带最后错误信息的异常 */
async function waitForHttp(url, { timeoutMs = 240000, intervalMs = 800, label } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError = '未收到响应';

  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        logger.info(label || 'health', `${url} 就绪`);
        return true;
      }
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err.message;
    }
    await delay(intervalMs);
  }

  throw new Error(`等待 ${url} 超时（${Math.round(timeoutMs / 1000)}s），最后错误：${lastError}`);
}

/** TCP 端口探测：Yjs 服务没有 HTTP 健康端点，用端口存活判断 */
async function waitForPort(port, { timeoutMs = 30000, intervalMs = 300, label } = {}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const reachable = await new Promise((resolve) => {
      const socket = net.connect({ port, host: '127.0.0.1' });
      const done = (result) => {
        socket.destroy();
        resolve(result);
      };
      socket.once('connect', () => done(true));
      socket.once('error', () => done(false));
      socket.setTimeout(1200, () => done(false));
    });

    if (reachable) {
      logger.info(label || 'port', `端口 ${port} 已就绪`);
      return true;
    }
    await delay(intervalMs);
  }

  throw new Error(`等待端口 ${port} 超时`);
}

/**
 * 启动全部子进程。
 * 调用前 Postgres 必须已就绪 —— Next 启动期会连接数据库建表。
 */
function startAll({ serverRoot, env, onFatal }) {
  const onUnexpectedExit = (name) => (code, signal) => {
    // 主动关闭阶段的退出不算异常；此处仅纳管运行期崩溃
    if (signal === 'SIGTERM' || code === 0) return;
    if (onFatal) onFatal(name, code);
  };

  launch({
    name: 'next',
    script: path.join(serverRoot, 'server.js'),
    cwd: serverRoot,
    env,
    onExit: onUnexpectedExit('next'),
  });

  launch({
    name: 'ws-voice',
    script: path.join(serverRoot, 'server', 'ws-server.js'),
    cwd: serverRoot,
    env,
    onExit: onUnexpectedExit('ws-voice'),
  });

  launch({
    name: 'yjs',
    script: path.join(serverRoot, 'ws-server', 'yjs-server.js'),
    cwd: serverRoot,
    env,
    onExit: onUnexpectedExit('yjs'),
  });
}

function killTree(child) {
  if (!child || child.exitCode !== null || child.killed) return;

  if (process.platform === 'win32') {
    // Windows 下 child.kill() 不保证终止孙进程，用 taskkill 按进程树终止
    try {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      return;
    } catch {
      /* 降级到 child.kill */
    }
  }

  try {
    child.kill('SIGTERM');
  } catch {
    /* ignore */
  }
}

async function stopAll({ graceMs = 5000 } = {}) {
  const targets = managed.splice(0, managed.length);
  if (!targets.length) return;

  logger.info('servers', `正在停止 ${targets.length} 个子进程`);

  for (const record of targets) killTree(record.child);

  const deadline = Date.now() + graceMs;
  while (Date.now() < deadline && targets.some((r) => !r.exited)) {
    await delay(200);
  }

  for (const record of targets) {
    if (!record.exited) {
      logger.warn(record.name, '未在宽限期内退出，强制终止');
      try {
        record.child.kill('SIGKILL');
      } catch {
        /* ignore */
      }
    }
  }
}

module.exports = { startAll, stopAll, waitForHttp, waitForPort, killTree };
