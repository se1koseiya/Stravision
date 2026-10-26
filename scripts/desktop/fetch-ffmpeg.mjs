#!/usr/bin/env node
/**
 * 下载 FFmpeg 静态二进制，落到 .cache/ffmpeg/<platform-arch>/，供桌面端打包内置。
 *
 * 为什么需要它：
 *   桌面端在本机起 Next 服务，RTMP 摄像头预览（/api/stream-rtmp）与 AI 抓帧
 *   （take_camera_snapshot）都要 spawn ffmpeg。用户机器上大概率没装 FFmpeg，
 *   所以必须由安装包自带 —— 这一份就是被打进 resources/ffmpeg/ 的产物。
 *
 * 为什么不用 npm 的 ffmpeg-static 包：
 *   它的 postinstall 从 GitHub Releases 拉二进制，国内直连基本拉不动（实测超时），
 *   装不上就把整个 install 流程拖死。这里改成构建期显式下载，源可换、可缓存、可跳过。
 *
 * 用法：
 *   node scripts/desktop/fetch-ffmpeg.mjs                     # 当前平台
 *   node scripts/desktop/fetch-ffmpeg.mjs --platform=darwin-arm64
 *   node scripts/desktop/fetch-ffmpeg.mjs --force             # 已存在也重下
 *   node scripts/desktop/fetch-ffmpeg.mjs --with-ffprobe      # 顺带下 ffprobe
 *   DESKTOP_FFMPEG_MIRROR=<base-url> node scripts/desktop/fetch-ffmpeg.mjs
 */

import { createWriteStream } from 'node:fs';
import { chmod, mkdir, open, rename, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CACHE_ROOT = path.join(REPO_ROOT, '.cache', 'ffmpeg');

/** 版本号与镜像目录对应（npmmirror 的 ffmpeg-static 镜像按 release tag 分目录） */
const RELEASE_TAG = process.env.DESKTOP_FFMPEG_TAG || 'b6.1.1';

/** 每个平台对应的产物名 + 落地文件名 */
const TARGETS = {
  'win32-x64': { asset: 'ffmpeg-win32-x64', dest: 'ffmpeg.exe' },
  'darwin-x64': { asset: 'ffmpeg-darwin-x64', dest: 'ffmpeg' },
  'darwin-arm64': { asset: 'ffmpeg-darwin-arm64', dest: 'ffmpeg' },
  'linux-x64': { asset: 'ffmpeg-linux-x64', dest: 'ffmpeg' },
  'linux-arm64': { asset: 'ffmpeg-linux-arm64', dest: 'ffmpeg' },
  'linux-arm': { asset: 'ffmpeg-linux-arm', dest: 'ffmpeg' },
};

const PROBE_TARGETS = {
  'win32-x64': { asset: 'ffprobe-win32-x64', dest: 'ffprobe.exe' },
  'darwin-x64': { asset: 'ffprobe-darwin-x64', dest: 'ffprobe' },
  'darwin-arm64': { asset: 'ffprobe-darwin-arm64', dest: 'ffprobe' },
  'linux-x64': { asset: 'ffprobe-linux-x64', dest: 'ffprobe' },
  'linux-arm64': { asset: 'ffprobe-linux-arm64', dest: 'ffprobe' },
  'linux-arm': { asset: 'ffprobe-linux-arm', dest: 'ffprobe' },
};

/** 源（按顺序尝试）。npmmirror 是 ffmpeg-static releases 的国内镜像。 */
function buildSources(asset) {
  const custom = process.env.DESKTOP_FFMPEG_MIRROR?.trim();
  const list = [];
  if (custom) list.push(`${custom.replace(/\/$/, '')}/${asset}`);
  list.push(`https://registry.npmmirror.com/-/binary/ffmpeg-static/${RELEASE_TAG}/${asset}`);
  list.push(`https://github.com/eugeneware/ffmpeg-static/releases/download/${RELEASE_TAG}/${asset}`);
  return list;
}

function parseArgs(argv) {
  const options = { platform: `${process.platform}-${process.arch}`, force: false, withProbe: false };
  for (const arg of argv) {
    if (arg.startsWith('--platform=')) options.platform = arg.slice('--platform='.length);
    else if (arg === '--force') options.force = true;
    else if (arg === '--with-ffprobe') options.withProbe = true;
  }
  return options;
}

async function fileSize(file) {
  try {
    const info = await stat(file);
    return info.size;
  } catch {
    return 0;
  }
}

async function download(url, destPath, asset) {
  const res = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(15 * 60 * 1000),
    headers: { 'user-agent': 'stravision-desktop-build' },
  });
  if (!res.ok || !res.body) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const total = Number(res.headers.get('content-length') || 0);
  let received = 0;
  let lastLogged = 0;

  // ⚠️ 进度统计必须用 Transform 夹在管道中间：
  //    直接对可读流 addListener('data') 会把它切成 flowing 模式，与 pipeline 抢数据，
  //    实测丢包（下载 79MB 少 34KB，PE 头 MZ 缺失 → spawn ENOEXEC）。
  const counter = new Transform({
    transform(chunk, _encoding, callback) {
      received += chunk.length;
      const pct = total ? Math.round((received / total) * 100) : 0;
      if (pct >= lastLogged + 10 || (total && received === total)) {
        lastLogged = pct;
        process.stdout.write(
          `\r    下载中 ${pct}%（${(received / 1048576).toFixed(1)}/${(total / 1048576).toFixed(1)} MB）`,
        );
      }
      callback(null, chunk);
    },
  });

  const tmpPath = `${destPath}.part`;
  await mkdir(path.dirname(destPath), { recursive: true });
  await pipeline(Readable.fromWeb(res.body), counter, createWriteStream(tmpPath));

  if (total && received !== total) {
    await rm(tmpPath, { force: true }).catch(() => {});
    throw new Error(`字节数不符（收到 ${received} / 期望 ${total}），下载不完整`);
  }

  // 可执行文件魔数校验：Windows=MZ，Linux=ELF，macOS=Mach-O（含 universal）
  if (asset.includes('ffmpeg') || asset.includes('ffprobe')) {
    const handle = await open(tmpPath, 'r');
    const head = Buffer.alloc(4);
    await handle.read(head, 0, 4, 0);
    await handle.close();
    const magic = head.toString('latin1');
    const isWindows = magic.startsWith('MZ');
    const isElf = magic === '\x7fELF';
    const isMachO = [0xfeedface, 0xfeedfacf, 0xcafebabe, 0xbebafeca].includes(head.readUInt32BE(0));
    if (!isWindows && !isElf && !isMachO) {
      await rm(tmpPath, { force: true }).catch(() => {});
      throw new Error(`产物不是可执行文件（魔数 ${JSON.stringify(magic)}），疑似错误响应`);
    }
  }

  await rename(tmpPath, destPath);
  process.stdout.write('\r\x1b[K');
  return received;
}

/** 只在本机平台验证可执行（跨平台产物无法在本机跑） */
function verifyBinary(file) {
  // 🚨 stdio 必须显式给 stdin='ignore'，不能依赖默认值（默认是 pipe）：
  //   在部分宿主环境（如被守护进程/工具链接管的 shell）下，Node 为子进程「创建 stdin 管道」
  //   这一步会失败并抛 EBUSY（ERROR_PIPE_BUSY），表现为「产物无法在本机执行」——
  //   而该二进制其实完好（魔数正确、shell 里能直接跑）。
  //   同一坑在 scripts/desktop/pack.mjs 里也踩过（electron-builder 子进程用 stdio:[ 'inherit', ... ]）。
  const res = spawnSync(file, ['-version'], {
    encoding: 'utf8',
    timeout: 10000,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (res.error || res.status !== 0) return null;
  return String(res.stdout || '').split(/\r?\n/)[0].trim() || null;
}

async function fetchOne(asset, destPath, { force, minBytes = 5 * 1024 * 1024 }) {
  const existing = await fileSize(destPath);
  if (existing >= minBytes && !force) {
    console.log(
      `⏭  已存在，跳过：${path.relative(REPO_ROOT, destPath)}（${(existing / 1048576).toFixed(1)} MB）`,
    );
    return true;
  }

  const errors = [];
  for (const url of buildSources(asset)) {
    try {
      console.log(`⬇  ${asset} ← ${url}`);
      const bytes = await download(url, destPath, asset);
      // 校验：可执行格式的产物不会小于 5MB，太小说明拿到的是错误页
      if (bytes < minBytes) {
        throw new Error(`产物过小（${bytes} 字节），疑似错误响应`);
      }
      if (process.platform !== 'win32') await chmod(destPath, 0o755);
      console.log(`✅ ${asset} 下载完成（${(bytes / 1048576).toFixed(1)} MB）`);
      return true;
    } catch (err) {
      await rm(`${destPath}.part`, { force: true }).catch(() => {});
      errors.push(`${url} → ${err.message}`);
    }
  }

  console.error(`❌ ${asset} 全部数据源失败：`);
  for (const line of errors) console.error(`   · ${line}`);
  return false;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  // 允许显式跳过（例：只改前端 UI、无网环境做一次快速打包）
  if (process.env.DESKTOP_SKIP_FFMPEG === '1') {
    console.warn('⚠️  DESKTOP_SKIP_FFMPEG=1，跳过 FFmpeg 下载（打包产物将缺少实时视频能力）');
    return;
  }

  const target = TARGETS[options.platform];
  if (!target) {
    console.error(`❌ 不支持的平台：${options.platform}（可用：${Object.keys(TARGETS).join(', ')}）`);
    process.exit(1);
  }
  if (process.platform !== 'win32' && process.platform !== 'darwin' && process.platform !== 'linux') {
    console.warn(`⚠️  未识别的宿主平台 ${process.platform}，仅下载产物不做本机校验`);
  }

  const outDir = path.join(CACHE_ROOT, options.platform);
  console.log(`📦 FFmpeg ${RELEASE_TAG} → ${path.relative(REPO_ROOT, outDir)}`);

  const ok = await fetchOne(target.asset, path.join(outDir, target.dest), options);
  if (!ok) process.exit(1);

  // 附上许可证（GPL 构建，随产物分发时必须带上）
  const licenseAsset = `${options.platform}.LICENSE`;
  await fetchOne(licenseAsset, path.join(outDir, 'LICENSE.txt'), {
    force: options.force,
    minBytes: 1024,
  });

  if (options.withProbe) {
    const probe = PROBE_TARGETS[options.platform];
    if (probe) {
      const probeOk = await fetchOne(probe.asset, path.join(outDir, probe.dest), options);
      if (!probeOk) process.exit(1);
    }
  }

  if (options.platform === `${process.platform}-${process.arch}`) {
    const binPath = path.join(outDir, target.dest);
    const version = verifyBinary(binPath);
    if (!version) {
      console.error(`❌ 产物无法在本机执行（${binPath}）`);
      process.exit(1);
    }
    console.log(`🔎 本机校验通过：${version}`);
  }

  console.log(`✅ 就绪：${path.relative(REPO_ROOT, path.join(outDir, target.dest))}`);
}

main().catch((err) => {
  console.error(`❌ 未预期的错误：${err?.stack || err}`);
  process.exit(1);
});
