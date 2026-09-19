/**
 * 「崩溃遗留孤儿回收」回归测试的**子进程**。
 *
 * 角色：扮演 Electron 主进程 —— 用 embedded-postgres 在 5433 上真起一个内嵌库，
 * 然后就挂着不动，等父测试脚本把**它自己**杀掉（只杀它，不杀进程树）。
 * 于是 postgres 就成了「父进程已死、句柄还在」的孤儿，
 * 与用户「任务管理器结束任务 / 应用崩溃 / 断电」之后的现场完全一致。
 *
 * 参数：
 *   --data-dir <path>   数据目录
 *   --port <n>          监听端口
 * 输出：
 *   PRINT "PG_READY"     一行，父脚本据此判断可以动手了
 *
 * ⚠️ 本文件是 verify-* 前缀，electron-builder 的 files 排除项 `!verify-*` 会把它
 *    挡在安装包之外（与 verify-postgres.mjs 同理）。
 */

import path from 'node:path';
import fs from 'node:fs';
import EmbeddedPostgres from 'embedded-postgres';

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const dataDir = argOf('--data-dir', path.join(process.cwd(), 'tmp-pg-reclaim-child'));
const port = Number(argOf('--port', '5433'));

fs.mkdirSync(dataDir, { recursive: true });

// 参数与 desktop/lib/postgres.js 保持一致，保证测的是同一条路径
const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'stravision',
  password: 'stravision_local_only',
  port,
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  postgresFlags: ['-c', 'listen_addresses=127.0.0.1'],
  onLog: () => {},
  onError: () => {},
});

if (!fs.existsSync(path.join(dataDir, 'PG_VERSION'))) {
  await pg.initialise();
}
await pg.start();
try {
  await pg.createDatabase('stravision');
} catch {
  /* 已存在 */
}

console.log('PG_READY');
// 挂住不退出（父脚本用 /F 强杀，不会有任何清理机会）
setInterval(() => {}, 1 << 30);
