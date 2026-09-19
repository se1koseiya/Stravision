#!/usr/bin/env node
/**
 * 生成 release/latest.yml（electron-updater generic provider 的版本清单）。
 *
 * 为什么独立成模块：electron-builder 只在真正执行 publish 时才产出 latest.yml，
 * 本地 pack（publish=never）会跳过 → 在线更新没有清单可用。
 * pack.mjs 打包成功后自动调用；也可以手工执行：
 *
 *   node scripts/desktop/latest-yml.mjs <installer.exe> [version]
 *   （version 缺省取 desktop/package.json）
 *
 * 字段格式与 electron-builder 产出的 UpdateInfo 对齐（files[0].blockMapSize
 * 供差量更新取 blockmap）。sha512 用流式哈希，避免 500MB 安装包整体进内存。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..', '..');

export async function writeLatestYml(installerPath, version) {
  const stat = fs.statSync(installerPath);
  if (stat.size < 1024 * 1024) {
    throw new Error(`安装包疑似不完整（size=${stat.size}）: ${installerPath}`);
  }
  const hash = crypto.createHash('sha512');
  await new Promise((resolve, reject) => {
    fs.createReadStream(installerPath)
      .on('data', (c) => hash.update(c))
      .on('error', reject)
      .on('end', resolve);
  });
  const sha512 = hash.digest('base64');
  const fileName = path.basename(installerPath);
  const blockmap = `${installerPath}.blockmap`;
  const blockMapSize = fs.existsSync(blockmap) ? fs.statSync(blockmap).size : undefined;

  const lines = [
    `version: ${version}`,
    'files:',
    `  - url: ${fileName}`,
    `    sha512: ${sha512}`,
    `    size: ${stat.size}`,
    ...(blockMapSize ? [`    blockMapSize: ${blockMapSize}`] : []),
    `path: ${fileName}`,
    `sha512: ${sha512}`,
    `releaseDate: '${new Date().toISOString()}'`,
  ];
  const ymlPath = path.join(ROOT, 'release', 'latest.yml');
  fs.writeFileSync(ymlPath, lines.join('\n') + '\n');
  console.log(`[latest-yml] 已生成 ${ymlPath} -> ${fileName} (v${version})`);
  return ymlPath;
}

/* 直接执行：node scripts/desktop/latest-yml.mjs <exe> [version] */
if (process.argv[1] && path.resolve(process.argv[1]) === url.fileURLToPath(import.meta.url)) {
  const installer = process.argv[2];
  if (!installer) {
    console.error('usage: node scripts/desktop/latest-yml.mjs <installer.exe> [version]');
    process.exit(1);
  }
  const version =
    process.argv[3] ||
    JSON.parse(fs.readFileSync(path.join(ROOT, 'desktop', 'package.json'), 'utf8')).version;
  await writeLatestYml(path.resolve(installer), version);
}
