#!/usr/bin/env node
/**
 * 上传桌面端更新产物到 stravision.site（在线更新分发目录）。
 *
 * 用法：pnpm desktop:upload [版本号]
 *   - 版本号缺省取 desktop/package.json 的 version
 *   - 需要 release/ 里已有 latest.yml + Stravision-<版本>-win-x64.exe(+.blockmap)
 *     （由 pnpm desktop:pack:win 产出）
 *   - 通过 scp 上传，会提示输入服务器密码（未配 SSH 免密）
 *
 * 服务器侧 nginx 已把 /downloads/desktop/ 映射到该目录（见 docs/DESKTOP.md）。
 * 已装用户的应用启动时会自动检查并后台下载，退出时自动安装。
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..', '..');
const REL = path.join(ROOT, 'release');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'desktop', 'package.json'), 'utf8'));
const version = process.argv[2] || pkg.version;
const host = process.env.STRAVISION_DEPLOY_HOST || 'ubuntu@118.25.157.77';
const destDir = process.env.STRAVISION_DEPLOY_DIR || '/home/ubuntu/berry-realm-v4.0/nginx/html/downloads/desktop';

const files = [
  `Stravision-${version}-win-x64.exe`,
  `Stravision-${version}-win-x64.exe.blockmap`,
  'latest.yml',
];
const missing = files.filter((f) => !fs.existsSync(path.join(REL, f)));
if (missing.length) {
  console.error(`[upload] ❌ release/ 缺少产物: ${missing.join(', ')}`);
  console.error('[upload]    先执行 pnpm desktop:pack:win');
  process.exit(1);
}

console.log(`[upload] v${version} -> ${host}:${destDir}`);
console.log('[upload] 上传完成后，已装用户将在下次启动时自动获取更新。');
const r = spawnSync('scp', [...files.map((f) => path.join(REL, f)), `${host}:${destDir}/`], {
  stdio: 'inherit',
});
process.exit(r.status ?? 1);
