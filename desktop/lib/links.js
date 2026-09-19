'use strict';

/**
 * 可写目录映射。
 *
 * 问题：业务代码用 `process.cwd()/data`、`public/uploads`、`docs` 等相对路径读写，
 * 而打包后 cwd 指向安装目录 —— 该目录可能只读（macOS /Applications），
 * 且应用升级时会被覆盖，用户数据会丢。
 *
 * 方案：把这些目录重定向到 userData，用目录联接（Windows junction / POSIX symlink）
 * 替代真实目录，使 cwd 保持不变而写入落到用户态目录。
 *
 * ⚠️ 开发模式（未打包）直接返回，绝不碰仓库文件 ——
 * serverRoot 在开发态就是仓库根目录，任何重命名都会破坏用户工程。
 */

const fs = require('node:fs');
const path = require('node:path');
const logger = require('./logger');

/** 需要重定向的可写目录（相对 serverRoot） */
const WRITABLE_DIRS = ['data', 'public/uploads', 'docs'];

function copyDirSync(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyDirSync(src, dst);
    else if (entry.isFile()) fs.copyFileSync(src, dst);
  }
}

/** 目标目录是否为空（不存在或没有条目） */
function isEmptyDir(dir) {
  try {
    return fs.readdirSync(dir).length === 0;
  } catch {
    return true;
  }
}

function createLink(target, linkPath) {
  // Windows 上 'junction' 类型无需管理员权限；POSIX 上该参数被忽略
  fs.symlinkSync(target, linkPath, 'junction');
}

function linkOne(serverRoot, dataRoot, rel) {
  const source = path.join(serverRoot, rel);
  const target = path.join(dataRoot, rel);

  fs.mkdirSync(target, { recursive: true });

  let sourceStat = null;
  try {
    sourceStat = fs.lstatSync(source);
  } catch {
    sourceStat = null;
  }

  if (sourceStat && sourceStat.isSymbolicLink()) {
    const current = fs.readlinkSync(source);
    if (path.resolve(current) === path.resolve(target)) return; // 已正确映射
    fs.unlinkSync(source);
  }

  if (sourceStat && sourceStat.isDirectory()) {
    // 随包附带的初始数据（如默认 data/*.json 配置）：首次运行时迁移到 userData，
    // 保留默认配置，之后用户改动只落在 userData 侧。
    if (isEmptyDir(target)) {
      logger.info('links', `迁移随包初始数据 ${rel} → userData`);
      copyDirSync(source, target);
    }
    const backup = `${source}.__bundled__`;
    try {
      if (fs.existsSync(backup)) fs.rmSync(backup, { recursive: true, force: true });
      fs.renameSync(source, backup);
    } catch (err) {
      logger.warn('links', `无法重命名 ${rel}（可能只读），改用删除: ${err.message}`);
      fs.rmSync(source, { recursive: true, force: true });
    }
  }

  createLink(target, source);
  logger.info('links', `已建立可写映射 ${rel} → ${target}`);
}

/**
 * 建立全部可写目录映射。
 * @returns {{ applied: boolean, reason?: string }}
 */
function apply(serverRoot, dataRoot, { isPackaged }) {
  if (!isPackaged) {
    return { applied: false, reason: '开发模式：使用仓库目录，不做重定向' };
  }

  for (const rel of WRITABLE_DIRS) {
    try {
      linkOne(serverRoot, dataRoot, rel);
    } catch (err) {
      // 单个目录失败不应阻断启动：退化为使用安装目录（可能只读，功能受限）
      logger.error('links', `映射 ${rel} 失败: ${err.message}`);
    }
  }

  return { applied: true };
}

module.exports = { apply, WRITABLE_DIRS };
