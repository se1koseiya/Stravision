'use strict';

/**
 * 内嵌 PostgreSQL 生命周期管理。
 *
 * 选型理由（已核实代码，勿轻易改为 SQLite）：
 * lib/db/database.ts 使用原生 pg（连接池 + BIGSERIAL + RETURNING + ON CONFLICT），
 * 且 20+ 个 service 文件里散落大量 PG 方言 SQL。改 SQLite 需重写上万行 SQL，
 * 风险极高；内嵌真 Postgres 可做到业务代码零改动。
 *
 * 数据目录位于 userData/server-data/pgdata，仅监听 127.0.0.1。
 */

const fs = require('node:fs');
const path = require('node:path');
const logger = require('./logger');
const pgGuard = require('./pg-guard');
const { LOCAL_DB } = require('./config');

let pg = null;
let started = false;

async function resolveEmbeddedPostgres() {
  // embedded-postgres 为 ESM 产物，CJS 主进程需动态 import。
  // 兼容 default 导出与命名导出两种形态。
  const mod = await import('embedded-postgres');
  const Ctor = mod.default || mod.EmbeddedPostgres || mod;
  if (typeof Ctor !== 'function') {
    throw new Error('无法解析 embedded-postgres 构造函数');
  }
  return Ctor;
}

/** initdb 会写入 PG_VERSION，据此判断数据目录是否已初始化（不可重复 initdb） */
function isInitialised(dataDir) {
  return fs.existsSync(path.join(dataDir, 'PG_VERSION'));
}

async function start({ dataDir, port }) {
  if (started) return;

  // 0. 端口回收：应用被强杀（任务管理器结束任务 / 崩溃 / 断电）后，detached 的
  //    postgres 子进程会继承监听句柄变成孤儿，把端口一直吊住；不先回收的话
  //    pg.start() 会以 "Only one usage of each socket address" 失败，应用永久卡在
  //    「正在初始化本地数据库…」。详见 lib/pg-guard.js 顶部注释。
  const guard = await pgGuard.reclaimOwnPostgres({
    port,
    pgDataDir: dataDir,
    log: (msg) => logger.info('postgres', msg),
  });
  if (guard.status === 'reclaimed') {
    logger.warn('postgres', `已回收上次异常退出遗留的数据库进程（PID ${guard.pids.join(', ')}）`);
  } else if (guard.status === 'occupied-by-others') {
    throw new Error(
      `本地数据库端口 ${port} 已被其他程序占用${guard.error ? `（${guard.error}）` : ''}。\n` +
        `占用者不是本应用遗留的进程，因此不会自动结束它。\n` +
        `请关闭占用该端口的程序后重试（常见原因：本机已装过 PostgreSQL 且端口改成了 ${port}）。`
    );
  } else if (guard.status === 'still-busy') {
    throw new Error(
      `本地数据库端口 ${port} 回收失败，仍被遗留进程占用（PID ${guard.pids.join(', ')}）。\n` +
        `请手动结束这些进程或重启电脑后重试。`
    );
  }

  const EmbeddedPostgres = await resolveEmbeddedPostgres();
  const fresh = !isInitialised(dataDir);

  pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: LOCAL_DB.user,
    password: LOCAL_DB.password,
    port,
    persistent: true,
    // Windows 中文环境下 initdb 会继承系统 locale 导致编码回落到 GBK，
    // 与业务侧的 UTF8 数据冲突，故显式锁定编码与 locale。
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    // 仅监听回环地址，桌面端数据库不应被局域网访问
    postgresFlags: ['-c', 'listen_addresses=127.0.0.1'],
    onLog: (msg) => logger.info('postgres', String(msg).trim()),
    onError: (err) => logger.error('postgres', err),
  });

  if (fresh) {
    logger.info('postgres', `首次初始化数据目录 ${dataDir}（需数秒）`);
    await pg.initialise();
    logger.info('postgres', 'initdb 完成');
  }

  await pg.start();
  started = true;
  logger.info('postgres', `服务已启动 127.0.0.1:${port}`);

  // 业务库创建（幂等）：库已存在时 embedded-postgres 会抛错，属预期
  try {
    await pg.createDatabase(LOCAL_DB.database);
    logger.info('postgres', `数据库 ${LOCAL_DB.database} 已创建`);
  } catch (err) {
    logger.info('postgres', `数据库 ${LOCAL_DB.database} 已存在，跳过创建`);
  }
}

async function stop() {
  if (!pg) return;
  try {
    await pg.stop();
    logger.info('postgres', '已停止');
  } catch (err) {
    logger.warn('postgres', `停止异常（忽略）: ${err.message}`);
  }
  pg = null;
  started = false;
}

module.exports = { start, stop, isInitialised };
