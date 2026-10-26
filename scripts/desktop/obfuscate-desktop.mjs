#!/usr/bin/env node
/**
 * 打包加固 · 第一步：混淆主进程源码。
 *
 * 【为什么必须"就地混淆"，而不是复制一份 desktop-obf 出来】
 *   2026-09-29 事故：旧实现把 desktop/ 复制成 <root>/desktop-obf，再用 NTFS junction
 *   把 node_modules 指回源目录。结果 electron-builder 的依赖采集（内部跑
 *   `npm list --production --json`）在那个目录里直接失败：
 *     - desktop    → exit 0，83 个包（干净的生产依赖树，含 pg）
 *     - desktop-obf→ exit 1，ELSPROBLEMS + **27031 个包**（51MB JSON）
 *   因为 desktop-obf 位于仓库根，npm 顺着 junction 往上摸到了**根的前端依赖树**
 *   （webpack / vue / esbuild / rollup …）。采集失败后 electron-builder 退化成
 *   "只搬 package.json 里写的直接依赖"，于是传递依赖 pg 没进 app.asar ——
 *   客户端 bootstrap 走到 18%「初始化本地数据库」时
 *   `Cannot find package 'pg' imported from .../embedded-postgres/dist/index.js`，
 *   然后无限重启。**整个 5.0.0 装上去就是起不来的。**
 *
 *   就地混淆则完全不引入新目录：appDir 始终是 desktop/，npm 采集的仍是那棵
 *   验证过的 83 包树。代价是构建期间源码会被临时改写，所以必须有备份 + 还原。
 *
 * 【为什么不在 asar 打包后改】
 *   asar 里有一部分文件是 asarUnpack 出去的（@embedded-postgres 的可执行文件），
 *   解包再重打包会丢失 unpack 标记 → postgres.exe 被塞回 asar → 桌面端起不来内嵌数据库。
 *   所以只能在**打包前**改。
 *
 * 【安全】
 *   混淆前把目标文件备份到系统临时目录，pack.mjs 在构建结束后（无论成功失败）
 *   调 restore() 还原。若进程被强杀留下混淆态，下次构建会检测到并自动从备份还原。
 *
 * 启用：默认开启；`--no-obf` 或 `DESKTOP_NO_OBF=1` 可跳过（排障时对比用）。
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JavaScriptObfuscator from 'javascript-obfuscator';

/** 需要混淆的文件（相对 appDir）—— 授权链路 + 主进程入口 */
const TARGETS = [
  'main.js',
  'lib/license.js',
  'lib/license-config.js',
  'lib/license-public-key.js',
  'lib/secrets.js',
];

const OBF_OPTIONS = {
  compact: true,
  target: 'node',
  // require('./xxx') 保持原样：不加密模块路径，避免任何解析层面的意外
  ignoreImports: true,
  // 其余字符串全部进数组 + rc4 加密：公钥、IPC 通道名、接口路径都读不到了
  stringArray: true,
  stringArrayThreshold: 1,
  stringArrayEncoding: ['rc4'],
  stringArrayWrappersCount: 3,
  stringArrayWrappersType: 'function',
  // 不重命名全局/属性：IPC 通道名与导出对象键必须保持运行期一致
  renameGlobals: false,
  renameProperties: false,
  // 控制流扁平化 / 死代码注入收益高但风险也高（体积、启动耗时、偶发语义差异），先不开
  controlFlowFlattening: false,
  deadCodeInjection: false,
  selfDefending: false,
  numbersToExpressions: false,
  simplify: true,
  splitStrings: false,
  // 日志还要能看：保留 console
  disableConsoleOutput: false,
  log: false,
};

const BACKUP_PREFIX = 'stravision-obf-backup-';

/** 混淆后的特征：javascript-obfuscator 必然产出 `_0x` 十六进制标识符 */
function looksObfuscated(code) {
  return /_0x[0-9a-f]{4,}/i.test(String(code || '').slice(0, 4000));
}

function backupRoot() {
  return path.join(os.tmpdir(), 'stravision-obf-backups');
}

/**
 * 上一轮构建被强杀时，源码可能还留在混淆态。找出最近的备份并还原。
 * @returns {boolean} 是否执行了还原
 */
export function recoverStaleObfuscation(src) {
  const sample = path.join(src, 'main.js');
  if (!fs.existsSync(sample)) return false;
  let code = '';
  try {
    code = fs.readFileSync(sample, 'utf8');
  } catch {
    return false;
  }
  if (!looksObfuscated(code)) return false;

  const rootDir = backupRoot();
  let latest = null;
  try {
    for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith(BACKUP_PREFIX)) continue;
      const full = path.join(rootDir, entry.name);
      const srcFile = path.join(full, 'main.js');
      if (!fs.existsSync(srcFile)) continue;
      if (!latest || fs.statSync(full).mtimeMs > fs.statSync(latest).mtimeMs) latest = full;
    }
  } catch {
    latest = null;
  }
  if (!latest) {
    console.warn('[obf] ⚠️ desktop/main.js 疑似处于混淆态，但找不到可用备份 —— 请先手动恢复再打包');
    return false;
  }
  let n = 0;
  for (const rel of TARGETS) {
    const bak = path.join(latest, rel);
    if (!fs.existsSync(bak)) continue;
    fs.copyFileSync(bak, path.join(src, rel));
    n++;
  }
  console.warn(`[obf] ⚠️ 检测到上轮遗留的混淆态，已从备份还原 ${n} 个文件（${latest}）`);
  return true;
}

/**
 * 就地混淆 appDir 下的目标文件。
 *
 * @param {{src: string, targets?: string[]}} opts
 * @returns {Promise<{done:number, total:number, restore:() => void, backupDir:string|null}>}
 */
export async function obfuscateInPlace({ src, targets = TARGETS }) {
  console.log('[obf] 就地混淆主进程源码 …');

  recoverStaleObfuscation(src);

  const parent = backupRoot();
  const backupDir = path.join(parent, `${BACKUP_PREFIX}${Date.now()}`);
  fs.mkdirSync(backupDir, { recursive: true });

  const pending = [];
  for (const rel of targets) {
    const file = path.join(src, rel);
    if (!fs.existsSync(file)) {
      console.warn(`[obf] 跳过不存在的文件：${rel}`);
      continue;
    }
    const bak = path.join(backupDir, rel);
    fs.mkdirSync(path.dirname(bak), { recursive: true });
    fs.copyFileSync(file, bak);
    pending.push({ rel, file, bak });
  }

  let done = 0;
  for (const { rel, file } of pending) {
    try {
      const before = fs.statSync(file).size;
      const code = fs.readFileSync(file, 'utf8');
      if (looksObfuscated(code)) {
        console.warn(`[obf]   ${rel} 已是混淆态，跳过`);
        continue;
      }
      const out = JavaScriptObfuscator.obfuscate(code, OBF_OPTIONS).getObfuscatedCode();
      fs.writeFileSync(file, out, 'utf8');
      done++;
      console.log(`[obf]   ${rel}  ${(before / 1024).toFixed(1)}KB → ${(fs.statSync(file).size / 1024).toFixed(1)}KB`);
    } catch (err) {
      console.warn(`[obf] ⚠️ ${rel} 混淆失败：${err.message}`);
    }
  }

  console.log(`[obf] ✅ 已混淆 ${done}/${pending.length} 个文件（备份 ${backupDir}）`);

  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    try {
      let n = 0;
      for (const { rel, file, bak } of pending) {
        if (fs.existsSync(bak)) {
          fs.copyFileSync(bak, file);
          n++;
        }
      }
      console.log(`[obf] 已还原源码 ${n}/${pending.length} 个文件`);
    } catch (err) {
      console.warn(`[obf] ⚠️ 还原源码失败：${err.message} —— 请从 ${backupDir} 手动拷回 desktop/`);
      return;
    }
    try {
      fs.rmSync(backupDir, { recursive: true, force: true });
    } catch {
      /* 备份目录删不掉不影响构建结果 */
    }
  };

  return { done, total: pending.length, restore, backupDir };
}

/**
 * @deprecated 不要再用：复制副本 + node_modules junction 会污染 electron-builder 的依赖采集
 * （详见文件头注释）。保留仅为兼容旧调用。
 */
export async function prepareObfuscatedDir({ src }) {
  const { restore } = await obfuscateInPlace({ src });
  return { dir: src, restore };
}

/** 直接运行时：单独混淆一次（排障用）；加 --restore 则从备份还原 */
if (process.argv[1] && process.argv[1].endsWith('obfuscate-desktop.mjs')) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const src = path.join(root, 'desktop');
  if (process.argv.includes('--restore')) {
    recoverStaleObfuscation(src);
    console.log('[obf] 还原完成');
  } else {
    await obfuscateInPlace({ src });
    console.log('[obf] 提示：源码当前处于混淆态，跑 `node scripts/desktop/obfuscate-desktop.mjs --restore` 还原');
  }
}
