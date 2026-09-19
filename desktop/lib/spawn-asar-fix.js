'use strict';

/**
 * 🚨 打包形态下必须打的一个补丁：让**异步** child_process.spawn 能执行 asar 内的可执行文件。
 *
 * 症状：打包后首次启动永久卡在「正在初始化本地数据库…」，pgdata 目录是空的，
 * 既没有 initdb 的输出、也没有任何 ERROR 日志 —— 看着像死锁或被安全软件拦了，极易误诊。
 *
 * 根因：内嵌 Postgres 靠 `embedded-postgres` 拉起二进制。它从平台包
 * `@embedded-postgres/<platform>-<arch>` 里取路径，而该包是用
 * `fileURLToPath(import.meta.url)` 拼 `native/bin/…` 的。模块本身在 app.asar 内，
 * 于是算出来的是归档内的虚拟路径：
 *   …\resources\app.asar\node_modules\@embedded-postgres\windows-x64\native\bin\initdb.exe
 * Electron 的 asar 兼容层只把**同步** API（fs / execFileSync 之类）的路径映射到
 * `app.asar.unpacked`，**异步 spawn 不映射** → 直接 ENOENT。
 * 而 embedded-postgres 只监听 close/exit、不处理 error 事件 → Promise 永不 settle，
 * 于是静默挂起（实测同一路径 execFileSync 112ms 正常返回 "initdb (PostgreSQL) 18.4"，
 * spawn 报 ENOENT）。
 *
 * 修法：把 spawn 一类的入口包一层，遇到 `.asar` 路径、且同名 `.asar.unpacked`
 * 文件真实存在时改写之。只改写"确实有解包副本"的路径，对普通路径完全透明；
 * 将来 Electron 自己补齐 spawn 的 asar 支持时，这层只会退化成无害的空操作。
 *
 * 必须在 main.js 最前面 require 并 apply()，早于任何可能 import child_process 的模块。
 */

const fs = require('node:fs');
const childProcess = require('node:child_process');

const ASAR_SEGMENT = /([\\/])app\.asar([\\/])/;

/** `…\app.asar\node_modules\x.exe` → `…\app.asar.unpacked\node_modules\x.exe`（仅在解包副本真实存在时） */
function toUnpackedPath(file) {
  if (typeof file !== 'string' || !file.includes('app.asar') || file.includes('app.asar.unpacked')) {
    return file;
  }
  if (!ASAR_SEGMENT.test(file)) return file;
  const candidate = file.replace(ASAR_SEGMENT, '$1app.asar.unpacked$2');
  try {
    if (fs.existsSync(candidate)) return candidate;
  } catch {
    /* 读不到就按原样传下去，让上层拿到真实的 ENOENT */
  }
  return file;
}

function patch(method) {
  const original = childProcess[method];
  if (typeof original !== 'function' || original.__asarPathPatched) return;
  const wrapped = function (file, ...rest) {
    return original.call(this, toUnpackedPath(file), ...rest);
  };
  wrapped.__asarPathPatched = true;
  childProcess[method] = wrapped;
}

function apply() {
  // fork 起的是 Node/Electron 入口（不会指向解包二进制），一并处理，成本为零
  for (const method of ['spawn', 'spawnSync', 'execFile', 'execFileSync', 'fork']) {
    patch(method);
  }
}

module.exports = { apply, toUnpackedPath };
