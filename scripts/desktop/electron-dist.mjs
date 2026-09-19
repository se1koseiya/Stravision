/**
 * 常驻的「已解压 Electron 运行时」缓存。
 *
 * 为什么需要它（不是过度设计）：
 *   electron-builder 的默认流程是 download → 解压到 `<appOutDir>.tmp` → `fs.rename` 成
 *   `<appOutDir>`。本机（Windows + 火绒）在解压出上千个文件后**紧接着**做这个 rename，
 *   会被实时扫描占住句柄而抛 `EPERM: operation not permitted, rename`，
 *   实测 3 次里失败 2 次；而且**重试也会重新解压**，等于每次重试都重新进入同一个风暴窗口，
 *   靠重试根本治不好。
 *
 *   把 `electronDist` 指向一个已解压好的目录，electron-builder 会走
 *   `fs.emptyDir(appOutDir)` + `copyDir(...)` 分支（见 app-builder-lib/out/electron/
 *   ElectronFramework.js 的 unpack()），**完全没有 rename 大目录这一步**，
 *   顺带每次打包省掉 158MB 的解压开销。
 *
 * 目录布局：
 *   .cache/electron-dist/
 *     electron-v44.3.0-win32-x64.zip        ← 从 @electron/get 缓存里复用，或按镜像下载
 *     v44.3.0-win32-x64/                    ← electronDist 指向这里（含 electron.exe）
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** 各平台解压后用来判定"这是一个可用的 Electron 发行版"的标志文件 */
const LAUNCHER = {
  win32: 'electron.exe',
  darwin: path.join('Electron.app', 'Contents', 'MacOS', 'Electron'),
  linux: 'electron',
};

/** @electron/get 的缓存根目录（各平台默认位置） */
function electronGetCacheRoots() {
  if (process.platform === 'win32') {
    return [path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'electron', 'Cache')];
  }
  if (process.platform === 'darwin') {
    return [path.join(os.homedir(), 'Library', 'Caches', 'electron')];
  }
  return [path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'electron')];
}

/** 在 @electron/get 的缓存里递归找一个指定文件名的 zip（避免复刻它的 URL 哈希算法） */
function findCachedZip(zipName) {
  for (const root of electronGetCacheRoots()) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root)) {
      const candidate = path.join(root, entry, zipName);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

/** 用 yauzl 解压（不依赖外部 unzip 命令，macOS / Linux 同样可用） */
function extractZip(zipPath, destDir) {
  let yauzl;
  try {
    yauzl = require('yauzl');
  } catch {
    throw new Error(
      '解压 Electron 需要 yauzl 模块（electron-builder 的传递依赖里通常已有）。\n' +
        '若缺失请执行：pnpm add -D yauzl'
    );
  }

  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zip) => {
      if (err) return reject(err);
      zip.on('entry', (entry) => {
        const target = path.join(destDir, entry.fileName);
        // zip-slip 防护：拒绝逃出目标目录的条目
        if (target !== destDir && !target.startsWith(destDir + path.sep)) {
          return zip.readEntry();
        }
        if (entry.fileName.endsWith('/')) {
          fs.mkdirSync(target, { recursive: true });
          return zip.readEntry();
        }
        fs.mkdirSync(path.dirname(target), { recursive: true });
        zip.openReadStream(entry, (streamErr, readStream) => {
          if (streamErr) return reject(streamErr);
          const writeStream = fs.createWriteStream(target);
          readStream.pipe(writeStream);
          writeStream.on('close', () => zip.readEntry());
          writeStream.on('error', reject);
        });
      });
      zip.on('end', resolve);
      zip.on('error', reject);
      // lazyEntries 模式下必须由调用方踢第一脚，否则永远不会触发 entry 事件，
      // 事件循环直接空转（表现为 "unsettled top-level await"）
      zip.readEntry();
    });
  });
}

/** 按镜像地址下载 zip（无 @electron/get 缓存时的兜底；实测 npmmirror 约 12MB/s） */
async function downloadZip(url, destPath) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`下载 Electron 失败：HTTP ${res.status} ${url}`);
  const total = Number(res.headers.get('content-length') || 0);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buffer);
  return `${(buffer.length / 1024 / 1024).toFixed(1)} MB${total ? '' : '（未知总长）'}`;
}

/**
 * 确保存在一份可用的已解压 Electron 运行时，返回其绝对路径（供 `--config.electronDist=` 使用）。
 *
 * @param {object} opts
 * @param {string} opts.root     仓库根目录
 * @param {string} opts.version  Electron 精确版本，如 44.3.0
 * @param {string} [opts.platform] 默认当前平台
 * @param {string} [opts.arch]     默认当前架构（用 process.arch，Electron 只认 x64/arm64）
 * @param {string} [opts.mirror]   下载镜像前缀（形如 https://npmmirror.com/mirrors/electron/）
 * @param {(msg: string) => void} [opts.log]
 */
export async function ensureElectronDist({ root, version, platform, arch, mirror, log = console.log }) {
  const plat = platform || process.platform;
  const targetArch = arch || process.arch;
  const zipName = `electron-v${version}-${plat}-${targetArch}.zip`;

  const cacheRoot = path.join(root, '.cache', 'electron-dist');
  const distDir = path.join(cacheRoot, `v${version}-${plat}-${targetArch}`);
  const zipPath = path.join(cacheRoot, zipName);
  const launcher = path.join(distDir, LAUNCHER[plat] || 'electron');
  // 完成标记刻意放在 distDir 之外：distDir 会被整体拷进 appOutDir，不能混入额外文件
  const readyMarker = path.join(cacheRoot, `v${version}-${plat}-${targetArch}.ok`);

  if (fs.existsSync(launcher) && fs.existsSync(readyMarker)) {
    log(`[electron-dist] 复用已解压运行时：${path.relative(root, distDir)}`);
    return distDir;
  }

  // 准备 zip：优先复用 @electron/get 已有的缓存，避免重复下载
  if (!fs.existsSync(zipPath)) {
    const cached = findCachedZip(zipName);
    if (cached) {
      fs.mkdirSync(cacheRoot, { recursive: true });
      fs.copyFileSync(cached, zipPath);
      log(`[electron-dist] 复用 electron 缓存件：${zipName}`);
    } else if (mirror) {
      const url = `${mirror.replace(/\/$/, '')}/${version}/${zipName}`;
      log(`[electron-dist] 下载 ${zipName} …`);
      const size = await downloadZip(url, zipPath);
      log(`[electron-dist] 下载完成（${size}）`);
    } else {
      throw new Error(
        `未找到 Electron 压缩包 ${zipName}，且未配置镜像。\n` +
          `请先让 electron-builder 下载一次，或设置 ELECTRON_MIRROR。`
      );
    }
  }

  // 直接解压到最终目录，**不做“解压到 .tmp 再改名”**：
  // 本机实测「刚写完上千个文件就 rename 该目录」必被安全软件挡下（EPERM，等几十秒后才放行）。
  // 反复重试只会重新解压、重新进入同一个锁定窗口，所以改成幂等覆盖解压 + 完成标记：
  // 中途失败下次重跑会原地覆盖补齐，launcher + .ok 双条件保证不会把半成品当成品用。
  fs.mkdirSync(distDir, { recursive: true });
  log(`[electron-dist] 解压 ${zipName} → ${path.relative(root, distDir)}`);
  await extractZip(zipPath, distDir);

  if (!fs.existsSync(launcher)) {
    throw new Error(`解压后未找到 ${LAUNCHER[plat]}，压缩包可能损坏：${zipPath}`);
  }

  // electron-builder 只在"自己解压"时才会清理这两个文件（cleanupAfterUnpack 的 isFullCleanup
  // 对自定义 electronDist 为 false），所以我们自己清：
  //   resources/default_app.asar —— Electron 的默认应用，留着会被打进包，且 app.asar 缺失时会被加载
  //   version                     —— 无用的版本戳
  for (const stale of [path.join(distDir, 'resources', 'default_app.asar'), path.join(distDir, 'version')]) {
    try {
      fs.unlinkSync(stale);
    } catch {
      /* 不存在就算了 */
    }
  }

  fs.writeFileSync(readyMarker, `${zipName}\n`);
  log(`[electron-dist] 就绪（${fs.readdirSync(distDir).length} 个顶层条目）`);
  return distDir;
}
