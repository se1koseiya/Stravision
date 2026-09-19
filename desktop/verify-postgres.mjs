/**
 * 内嵌 Postgres 冒烟验证（不依赖 Electron）。
 *
 * 用途：在接入 Electron 主进程之前，先独立确认
 * "平台二进制可用 → initdb → 起库 → 建库 → 建表 → 查询 → 停止" 这条链路通畅。
 * 这是整个离线桌面方案风险最高的一环（业务层有上万行 PG 方言 SQL，
 * 若内嵌库不可用则方案不成立）。
 *
 * 用法：cd desktop && node verify-postgres.mjs
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';

const PORT = Number(process.env.VERIFY_PG_PORT || 55432);
const DB = { user: 'stravision', password: 'stravision_local_only', database: 'stravision' };
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stravision-pg-verify-'));

const log = (...args) => console.log('[verify]', ...args);
const mb = (b) => `${(b / 1024 / 1024).toFixed(1)} MB`;

function dirSize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) total += dirSize(full);
    else total += fs.statSync(full).size;
  }
  return total;
}

async function main() {
  log(`数据目录 ${dataDir}`);
  log(`目标端口 ${PORT}`);

  const t0 = Date.now();

  const pgInstance = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: DB.user,
    password: DB.password,
    port: PORT,
    persistent: true,
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    postgresFlags: ['-c', 'listen_addresses=127.0.0.1'],
    onLog: () => {},
    onError: (err) => console.error('[verify][pg-error]', err?.message || err),
  });

  log('① initdb …');
  const tInit = Date.now();
  await pgInstance.initialise();
  log(`   initdb 完成，耗时 ${((Date.now() - tInit) / 1000).toFixed(1)}s，数据目录 ${mb(dirSize(dataDir))}`);

  log('② 启动 Postgres …');
  const tStart = Date.now();
  await pgInstance.start();
  log(`   启动完成，耗时 ${((Date.now() - tStart) / 1000).toFixed(1)}s`);

  log('③ 创建业务库 …');
  try {
    await pgInstance.createDatabase(DB.database);
    log('   已创建');
  } catch (err) {
    log(`   跳过（可能已存在）：${err.message}`);
  }

  log('④ 连接并验证（含业务层用到的 PG 方言）…');
  const client = new pg.Client({
    host: '127.0.0.1',
    port: PORT,
    user: DB.user,
    password: DB.password,
    database: DB.database,
  });
  await client.connect();

  const version = await client.query('SELECT version()');
  log(`   ${version.rows[0].version.split(',')[0]}`);

  // 复刻 lib/db/database.ts 的关键用法：BIGSERIAL + ON CONFLICT + RETURNING
  await client.query(`
    CREATE TABLE IF NOT EXISTS __verify (
      id BIGSERIAL PRIMARY KEY,
      uid TEXT UNIQUE,
      payload TEXT DEFAULT '{}',
      created_at BIGINT NOT NULL
    )
  `);

  const inserted = await client.query(
    `INSERT INTO __verify (uid, created_at) VALUES ($1, $2)
     ON CONFLICT (uid) DO UPDATE SET created_at = EXCLUDED.created_at
     RETURNING id, uid`,
    ['smoke-test', Date.now()],
  );
  log(`   INSERT … ON CONFLICT … RETURNING → id=${inserted.rows[0].id} uid=${inserted.rows[0].uid}`);

  const utf8 = await client.query('SELECT $1::text AS echo', ['中文编码校验 ✓']);
  log(`   UTF8 往返 → ${utf8.rows[0].echo}`);

  await client.query('DROP TABLE __verify');
  await client.end();

  log('⑤ 停止 Postgres …');
  await pgInstance.stop();

  const total = ((Date.now() - t0) / 1000).toFixed(1);
  log(`\n✓ 全部通过，总耗时 ${total}s`);
  log(`  数据目录体积 ${mb(dirSize(dataDir))}（安装包需计入压缩后的体积）`);

  fs.rmSync(dataDir, { recursive: true, force: true });
  log('已清理临时数据目录');
  process.exit(0);
}

main().catch(async (err) => {
  console.error('\n✗ 验证失败：', err?.message || err);
  console.error(err?.stack || '');
  try {
    fs.rmSync(dataDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  process.exit(1);
});
