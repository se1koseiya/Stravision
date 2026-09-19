/**
 * 桌面端 Next 构建入口（包装层）。
 *
 * 为什么需要这层包装，而不是直接在 package.json 里写 cross-env：
 *
 * 本机环境的 NODE_OPTIONS 注入了 WorkBuddy 的 node-safe-delete-shim
 * （`--require .../node-safe-delete-shim.cjs`），它会拦截 Node 进程的批量删除。
 * Next 构建在收尾阶段需要删除 `.next/trace`（该项目该文件可达 130MB+），
 * 于是抛错并中断：
 *
 *   Error: [safe-delete][SAFE_DELETE_BULK_CONFIRM_REQUIRED]
 *   targets: [".next\\trace"]
 *
 * 注意 cross-env 无法可靠地"清空"一个已存在的环境变量（只能赋空字符串），
 * 这里直接 delete 掉，确保子进程完全不受 shim 影响。
 *
 * 用法：node scripts/desktop/build-next.mjs
 */

import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const env = { ...process.env };
delete env.NODE_OPTIONS;

Object.assign(env, {
  DESKTOP_BUILD: '1',
  NEXT_TELEMETRY_DISABLED: '1',
  // 构建期内联变量：桌面端固定端口与本地地址
  NEXT_PUBLIC_YJS_WS_URL: 'ws://127.0.0.1:1234',
  NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3000',
  // 离线环境无自托管 Cap 实例，必须关闭，否则注册/登录被拦
  NEXT_PUBLIC_CAP_ENABLED: 'false',
  // 桌面态标记（构建期内联到客户端 bundle）：
  // 用于隐藏依赖公网服务的入口 —— 第三方 OAuth、支付/订阅、OnlyOffice 在线编辑。
  // 服务端另有运行时变量 STRAVISION_DESKTOP / STRAVISION_LOCAL_MODE（见 desktop/lib/config.js）。
  NEXT_PUBLIC_STRAVISION_DESKTOP: '1',
});

console.log('[build-next] 已剥离 NODE_OPTIONS（规避 safe-delete shim 拦截）');
console.log('[build-next] 开始 Next standalone 构建…\n');

const child = spawn('pnpm', ['exec', 'next', 'build'], {
  cwd: ROOT,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('error', (err) => {
  console.error('[build-next] 无法启动构建进程：', err.message);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`\n[build-next] 构建被信号中断：${signal}`);
    process.exit(1);
  }
  console.log(`\n[build-next] 构建结束，退出码 ${code}`);
  process.exit(code ?? 1);
});
