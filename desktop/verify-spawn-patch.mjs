/**
 * 回归探针：验证 lib/spawn-asar-fix.js 的介入时机是否有效。
 *
 * 为什么需要它：embedded-postgres 是 ESM，用 `import { spawn } from 'child_process'`
 * 取 spawn。ESM 的命名绑定在模块求值时拍快照，如果它在补丁之前就被求值，
 * 那么改写 childProcess.spawn 就完全无效（而且不报错，症状与没打补丁一模一样）。
 * 这个探针用"哨兵"直接回答"embedded-postgres 到底用没用到我们改写后的 spawn"。
 *
 * 判据：initialise() 走到 spawn 时必须被哨兵拦下。拦不到 = 补丁形同虚设。
 * 该文件被 win.files 的 `!verify-*` 排除，不会进安装包。
 */
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const childProcess = require('node:child_process');

// 1) 先按生产路径打补丁（main.js 第一条 require 做的事）
require('./lib/spawn-asar-fix').apply();

const patched = ['spawn', 'spawnSync', 'execFile', 'execFileSync', 'fork'].filter(
  (m) => childProcess[m] && childProcess[m].__asarPathPatched,
);
console.log(`[1] 已改写的方法：${patched.join(', ') || '（无 —— 属性不可写？）'}`);
if (patched.length !== 5) {
  console.log('⚠️  部分方法未能改写，child_process 导出可能不可写');
}

// 2) 在补丁之上再盖一层哨兵：只有拿到"改写后的 spawn"才会命中
const realSpawn = childProcess.spawn;
let hit = null;
childProcess.spawn = function sentinel(file, ...rest) {
  if (typeof file === 'string' && /initdb(\.exe)?$/i.test(file)) {
    hit = file;
    throw new Error('SENTINEL_INTERCEPT');
  }
  return realSpawn.call(this, file, ...rest);
};

// 3) 现在才加载 embedded-postgres（模拟 main.js 中 require('./lib/postgres') 的时刻）
const { default: EmbeddedPostgres } = await import('embedded-postgres');

const pg = new EmbeddedPostgres({
  databaseDir: path.join(os.tmpdir(), `stravision-spawn-probe-${Date.now()}`),
  user: 'postgres',
  password: 'probe-only',
  port: 5599,
  persistent: false,
  onLog: () => {},
  onError: () => {},
});

try {
  await pg.initialise();
  console.log('❌ 哨兵未命中：embedded-postgres 持有的是补丁之前的 spawn 快照 → 补丁无效');
  process.exit(1);
} catch (err) {
  const message = String((err && err.message) || err);
  if (message.includes('SENTINEL_INTERCEPT')) {
    console.log(`✅ 哨兵命中：embedded-postgres 确实调用被改写后的 spawn（目标 ${hit}）`);
    console.log('   结论：只要在 require("./lib/postgres") 之前 apply()，路径改写即生效');
    process.exit(0);
  }
  console.log(`⚠️  在到达 spawn 之前失败：${message}`);
  process.exit(2);
}
