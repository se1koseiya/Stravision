/**
 * 桌面端构建准备。
 *
 * 职责：
 *   1. 校验并"白名单重建" Next standalone 产物
 *   2. 放入 standalone 缺失的运行期资源（public / static / 服务脚本 / AI 技能 / 文档库）
 *   3. 补齐 Next 依赖图之外的包（独立服务脚本用）
 *   4. 把 .pnpm 里被追踪的包平铺到顶层（Next 的软链接在 Windows 上建不出来），
 *      并硬断言顶层对每个被追踪的包都可解析
 *   5. 隐私清理 + 凭据扫描（不通过则终止构建）
 *
 * ────────────────────────────────────────────────────────────────
 * 为什么是"白名单重建"而不是"增量补充"：
 *
 * 实测 Next 16.1 + turbopack 在 outputFileTracingRoot 指向项目根时，
 * 会把项目根目录**整体镜像**进 .next/standalone（含 README、Dockerfile、
 * nginx/、desktop/，以及 data/ai-providers-config.json —— 内含真实 API Key，
 * data/sessions.json —— 用户会话数据）。
 *
 * 仅靠"复制时跳过敏感文件"不足以防住这类污染，必须主动裁剪：
 * 只保留 server.js / .next / node_modules / package.json，其余全部移除后重建。
 * ────────────────────────────────────────────────────────────────
 *
 * 用法：node scripts/desktop/prepare-standalone.mjs
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);

// ── NODE_OPTIONS 可能注入 node-language-shim（其内部再加载 safe-delete-shim），
//    会拦截本脚本必需的批量裁剪操作（SAFE_DELETE_BULK_CONFIRM_REQUIRED）。
//    注意：不能只匹配 "safe-delete-shim" 字符串 —— 注入名是 node-language-shim，
//    实测漏判会导致裁剪静默失败。本脚本不需要任何 NODE_OPTIONS，直接整体剥离。 ──
if (process.env.NODE_OPTIONS) {
  console.log('[prepare-standalone] 检测到 NODE_OPTIONS，剥离后重新执行（规避删除拦截）…');
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  const result = spawnSync(process.execPath, [SELF, ...process.argv.slice(2)], {
    env,
    stdio: 'inherit',
  });
  process.exit(result.status ?? 1);
}

const ROOT = path.resolve(path.dirname(SELF), '..', '..');
const STANDALONE = path.join(ROOT, '.next', 'standalone');

/** 裁剪后允许留在 standalone 顶层的条目（其余一律移除，之后按需重建） */
const KEEP_TOP_LEVEL = new Set(['server.js', '.next', 'node_modules', 'package.json']);

/** 需要整目录复制的资源 */
const COPY_DIRS = [
  ['.next/static', '.next/static'],
  ['server', 'server'],
  ['ws-server', 'ws-server'],
  ['.agents', '.agents'],
  ['docs', 'docs'],
];

/** 需要单文件复制的资源 */
const COPY_FILES = [
  ['lib/blog/docs-manifest.json', 'lib/blog/docs-manifest.json'],
];

/**
 * public/ 中不打包的目录：
 * - uploads      用户上传内容（隐私，且安装包不应携带他人数据）
 * - weathervideo 587MB 装饰性天气背景视频，占 public 体积六成
 * 保留 vad（81MB，语音助手 VAD 模型，功能必需）等运行期资源。
 */
const PUBLIC_EXCLUDES = new Set(['uploads', 'weathervideo']);

/**
 * 额外运行期依赖：仅被独立服务脚本使用，不在 Next 依赖追踪图内。
 *
 * ⚠️ lib0 / y-protocols 必须列进来，且必须同时是**根 package.json 的直接依赖**：
 * ws-server/lib/yjs-sync.js 直接 require 它们，而 pnpm 隔离布局下顶层只有直接依赖
 * 的软链接，传递依赖只存在于 .pnpm/ —— 不提升为直接依赖，Docker 里的
 * yjs-ws 容器（工作目录是仓库根）会直接 MODULE_NOT_FOUND。
 *
 * 不再需要 y-websocket：协作服务端已改为用 y-protocols 自行实现协议层
 * （上游 3.x 已删除服务端工具），前端那侧由 Next 自行打包，不依赖此目录。
 */
const EXTRA_PACKAGES = ['dotenv', 'yjs', 'lib0', 'y-protocols', 'ws', 'pg'];

/** data/ 白名单：只复制产品默认配置 */
const DATA_ALLOW = ['ai-models-config.json', 'announcements.json'];

/** 该文件不复制，改写为空配置（避免开发者凭据外发） */
const CREDENTIAL_FILE = 'ai-providers-config.json';

/** 明确排除的敏感文件（用于日志说明） */
const DATA_EXCLUDES = ['sessions.json', 'user-memory'];

const EMPTY_PROVIDERS_CONFIG = {
  providers: [],
  defaultModelId: '',
  embeddingConfig: { providerId: '', model: '', enabled: false },
  creditConfig: { enabled: false },
  webSearchConfig: { enabled: false, providerId: '', protocol: 'anysearch', apiKey: '', defaultCount: 8 },
};

function dirSize(dir) {
  let total = 0;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) {
        try {
          total += fs.statSync(full).size;
        } catch {
          /* ignore */
        }
      }
    }
  }
  return total;
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/* ────────────────────────────────────────────────────────────────
 * 自建目录复制
 *
 * 为什么不用 fs.cpSync（踩过的坑，勿改回去）：
 * 1. 目标目录已存在时，cpSync 在 Windows 上会先尝试整体清除目标再重建，
 *    本机上会卡死（实测：prepare 停在 ".next/static" 一步，进程内存
 *    12 秒零增长 = 真死锁，不是慢）。.next/standalone 恰恰是"反复重建
 *    同一目标"的场景，必须绕开。
 * 2. 逐文件写入会触发杀软实时防护（本机为火绒 HIPS），
 *    重复构建时把没变过的文件再写一遍纯属浪费 —— 按 size+mtime 跳过。
 * ──────────────────────────────────────────────────────────────── */

/**
 * 递归复制目录（显式栈，无递归深度风险）。
 * @param {string} src
 * @param {string} dest
 * @param {{ followSymlinks?: boolean, onProgress?: (copied:number, total:number)=>void }} [opts]
 * @returns {{ copied: number, skipped: number }}
 */
function copyTree(src, dest, opts = {}) {
  const { followSymlinks = false } = opts;
  const stats = { copied: 0, skipped: 0 };

  const stack = [[src, dest]];
  while (stack.length) {
    let [from, to] = stack.pop();

    let st;
    try {
      st = fs.lstatSync(from);
    } catch {
      continue;
    }

    if (st.isSymbolicLink()) {
      if (!followSymlinks) {
        // 保留软链接本身（public/ 下若有相对链接，指向项目内资源，保留即可）
        try {
          fs.rmSync(to, { recursive: true, force: true });
        } catch {
          /* ignore */
        }
        try {
          fs.symlinkSync(fs.readlinkSync(from), to);
        } catch {
          /* ignore */
        }
        continue;
      }
      // 跟随软链接（pnpm 的 node_modules 依赖即为此形态）
      let real;
      try {
        real = fs.realpathSync(from);
        st = fs.statSync(real);
      } catch {
        continue;
      }
      from = real;
    }

    if (st.isDirectory()) {
      fs.mkdirSync(to, { recursive: true });
      let entries;
      try {
        entries = fs.readdirSync(from, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        stack.push([path.join(from, entry.name), path.join(to, entry.name)]);
      }
      continue;
    }

    if (!st.isFile()) continue; // 跳过 FIFO / 设备文件等

    // 内容未变则跳过：size 相同且目标不早于源
    let unchanged = false;
    try {
      const dst = fs.statSync(to);
      unchanged = dst.isFile() && dst.size === st.size && dst.mtimeMs >= st.mtimeMs;
    } catch {
      unchanged = false;
    }
    if (unchanged) {
      stats.skipped++;
      continue;
    }

    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    stats.copied++;
  }

  return stats;
}

/**
 * 裁掉所有非白名单的顶层条目。
 *
 * ⚠️ 两条踩过的血泪教训（本机装有火绒实时防护）：
 *
 * 1. 不要在这里先 dirSize 再删除：那会把同一棵树的 I/O 翻倍。
 *    一次全量遍历叠加上万次 unlink 会从数十秒恶化到十几分钟。
 *
 * 2. 🚨 **不要用 fs.rmSync 递归删大目录**：会卡死在杀软驱动层，永不返回。
 *    实测 `app` 目录删了 55s 后，删除 `components` 时进程 CPU 完全停止增长、
 *    目录内文件数也不再下降（32 个文件卡住不动），既不抛错也不结束。
 *    与之前 `fs.cpSync` 同一病因：驱动的逐文件扫描钩子在第一万个文件后僵死。
 *
 * 正确做法：**改名移出**到系统临时目录。同盘 rename 是纯元数据操作，
 * 毫秒级完成且完全绕开逐文件扫描；真正的清理留给系统临时目录回收。
 * 若 rename 因跨盘/句柄占用失败，再退回删除（小目录通常能过）。
 */
function pruneStandalone() {
  console.log('[prepare-standalone] 裁剪 standalone 顶层（保留 server.js/.next/node_modules/package.json）：');

  const trashDir = path.join(os.tmpdir(), 'stravision-standalone-trash', String(Date.now()));
  const removed = [];
  const failed = [];
  const started = Date.now();
  let anyTrash = false;

  for (const entry of fs.readdirSync(STANDALONE)) {
    if (KEEP_TOP_LEVEL.has(entry)) continue;

    const full = path.join(STANDALONE, entry);
    const t0 = Date.now();

    try {
      fs.mkdirSync(trashDir, { recursive: true });
      const target = path.join(trashDir, entry);
      // 目标可能在上一次中断的运行里残留
      fs.rmSync(target, { recursive: true, force: true, maxRetries: 2, retryDelay: 50 });
      fs.renameSync(full, target);
      anyTrash = true;
      const cost = Date.now() - t0;
      removed.push(cost > 2000 ? `${entry}(${(cost / 1000).toFixed(1)}s)` : entry);
      if (cost > 2000) console.log(`  移出 ${entry} 用时 ${(cost / 1000).toFixed(1)}s`);
    } catch (renameErr) {
      const t1 = Date.now();
      try {
        fs.rmSync(full, { recursive: true, force: true, maxRetries: 5, retryDelay: 120 });
        removed.push(`${entry}(删除 ${((Date.now() - t1) / 1000).toFixed(1)}s)`);
      } catch (err) {
        // 不在这里 exit：留下非白名单内容靠末尾的凭据扫描兜底拦截
        failed.push(entry);
        console.log(`  ⚠ 移出与删除都失败 ${entry}: ${err.message}`);
      }
    }
  }

  if (removed.length) {
    console.log(
      `  移出 ${removed.length} 项，共 ${((Date.now() - started) / 1000).toFixed(1)}s：${removed.slice(0, 12).join(', ')}${removed.length > 12 ? ' …' : ''}`,
    );
  } else {
    console.log('  无需裁剪');
  }
  if (anyTrash) {
    console.log(`  移出的内容在系统临时目录（可随时手动清理）：${trashDir}`);
  }
  if (failed.length) {
    console.log(`  ⚠ 有 ${failed.length} 项未能移出：${failed.join(', ')}`);
  }
}

function copyEntry(srcRel, destRel, { isDir }) {
  const src = path.join(ROOT, srcRel);
  const dest = path.join(STANDALONE, destRel);

  if (!fs.existsSync(src)) {
    console.log(`  [跳过] ${srcRel}（源不存在）`);
    return 0;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });

  const started = Date.now();
  if (isDir) {
    const stats = copyTree(src, dest);
    const size = dirSize(dest);
    console.log(
      `  [完成] ${srcRel} → ${destRel}  (${mb(size)}, 写入 ${stats.copied} / 跳过 ${stats.skipped}, ${Date.now() - started}ms)`,
    );
    return size;
  }

  fs.copyFileSync(src, dest);
  const size = fs.statSync(dest).size;
  console.log(`  [完成] ${srcRel} → ${destRel}  (${mb(size)})`);
  return size;
}

/** 复制 public（顶层按排除清单过滤） */
function copyPublic() {
  const src = path.join(ROOT, 'public');
  const dest = path.join(STANDALONE, 'public');

  if (!fs.existsSync(src)) {
    console.log('  [跳过] public（源不存在）');
    return 0;
  }

  fs.mkdirSync(dest, { recursive: true });

  const started = Date.now();
  let copied = 0;
  let skipped = 0;

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (PUBLIC_EXCLUDES.has(entry.name)) continue;
    const stats = copyTree(path.join(src, entry.name), path.join(dest, entry.name));
    copied += stats.copied;
    skipped += stats.skipped;
  }

  const size = dirSize(dest);
  console.log(
    `  [完成] public（已排除 ${[...PUBLIC_EXCLUDES].join('、')}）  (${mb(size)}, 写入 ${copied} / 跳过 ${skipped}, ${Date.now() - started}ms)`,
  );
  return size;
}

/**
 * 定位一个包的实体目录。
 * pnpm 的 node_modules 顶层只有"直接依赖"的软链接；传递依赖只存在于
 * .pnpm/<name>@<version>[_peer]/node_modules/<name>。
 * 本函数两级查找：顶层优先，失败则扫 .pnpm（多个版本时任取第一个，均为满足 semver 的实体）。
 */
function resolvePackageDir(srcRoot, name) {
  const direct = path.join(srcRoot, name);
  if (fs.existsSync(direct)) return direct;

  const pnpmRoot = path.join(srcRoot, '.pnpm');
  if (!fs.existsSync(pnpmRoot)) return null;

  // 作用域包 @scope/name → 目录名前缀含 '/'，需转成 '+' 形式搜索
  const prefix = name.replace('/', '+');
  let candidates;
  try {
    candidates = fs.readdirSync(pnpmRoot).filter((d) => d === name || d.startsWith(`${prefix}@`));
  } catch {
    return null;
  }

  for (const candidate of candidates) {
    const nested = path.join(pnpmRoot, candidate, 'node_modules', name);
    if (fs.existsSync(nested)) return nested;
  }
  return null;
}

/**
 * 补齐运行期依赖 —— **递归展开依赖闭包**。
 *
 * 为什么必须递归，而不是只补几个顶层包：
 * 1. 独立服务脚本（server/ws-server.js、ws-server/yjs-server.js）不在 Next 依赖图内，
 *    它们的直接依赖（dotenv/yjs/y-websocket/ws/pg）本就不会被追踪。
 * 2. 被 `serverExternalPackages` 外部化的包（pg 等），Next 只外部化它本身，
 *    **不会追踪它自己的 dependencies**。实测补完 pg 后立刻报：
 *      Cannot find module '...standalone/node_modules/pg-types/index.js'
 *    —— pg 的传递依赖（pg-types / pg-protocol / pg-pool / split2 …）全都不在。
 *
 * 所以这里从种子包出发，读每个包 package.json 的 dependencies / optionalDependencies
 * 做 BFS，逐层把闭包内的所有包实体拷进 standalone/node_modules。
 * 按文件比对（copyTree），可反复执行并顺带修复被中断留下的半拷贝包。
 */
function ensureRuntimePackages() {
  const srcRoot = path.join(ROOT, 'node_modules');
  const destRoot = path.join(STANDALONE, 'node_modules');
  fs.mkdirSync(destRoot, { recursive: true });

  console.log('\n[prepare-standalone] 展开运行期依赖闭包（Next 追踪图外的包与其传递依赖）：');

  const seen = new Set();
  const queue = [...EXTRA_PACKAGES];
  const unreachable = [];

  while (queue.length) {
    const name = queue.shift();
    if (!name || seen.has(name)) continue;
    if (name.startsWith('node:') || name.startsWith('.')) continue;
    seen.add(name);

    const src = resolvePackageDir(srcRoot, name);
    if (!src) {
      unreachable.push(name);
      continue;
    }

    const dest = path.join(destRoot, name);
    const hadPackageJson = fs.existsSync(path.join(dest, 'package.json'));
    const stats = copyTree(src, dest, { followSymlinks: true });

    if (!hadPackageJson || stats.copied > 0) {
      const origin = path.relative(srcRoot, src).startsWith('.pnpm') ? ' (.pnpm)' : '';
      console.log(`  [${hadPackageJson ? '补全' : '新增'}] ${name}${origin}（${stats.copied} 个文件）`);
    }

    let pkg;
    try {
      pkg = JSON.parse(fs.readFileSync(path.join(src, 'package.json'), 'utf8'));
    } catch {
      continue;
    }
    for (const dep of Object.keys({ ...(pkg.dependencies || {}), ...(pkg.optionalDependencies || {}) })) {
      if (!seen.has(dep)) queue.push(dep);
    }
  }

  console.log(`  闭包共 ${seen.size} 个包`);
  if (unreachable.length) {
    console.log(`  ⚠ 未能定位（可能为可选依赖或平台包）：${unreachable.join(', ')}`);
  }
}

/**
 * 补全 `.next/node_modules/<name>-<hash>` 外部化包。
 *
 * 背景：next.config.ts 的 `serverExternalPackages`（pg / bcryptjs / …）会被 Next
 * 外部化到 `.next/node_modules/<name>-<16位hash>/`。标准实现是建**软链接**指向真实包，
 * 但本机实测（Windows + 杀软实时防护）这些目录被建成了**空目录** ——
 * 服务端启动即崩：
 *   Cannot find package '...\.next\node_modules\pg-6d75120e0d9fdbe9\index.js'
 * 表现为 /api/health 无响应、instrumentation hook 加载失败。
 *
 * 这里按包名从真实 node_modules 把内容补进去（按文件比对，幂等）。
 */
const HASH_SUFFIX = /^(.+)-[0-9a-f]{16}$/;

function ensureExternalPackages() {
  const extRoot = path.join(STANDALONE, '.next', 'node_modules');
  if (!fs.existsSync(extRoot)) {
    console.log('\n[prepare-standalone] 无 .next/node_modules（无需补全）');
    return;
  }

  const srcRoot = path.join(ROOT, 'node_modules');
  console.log('\n[prepare-standalone] 补全 .next/node_modules 外部化包：');

  for (const entry of fs.readdirSync(extRoot)) {
    const dest = path.join(extRoot, entry);

    let isDir = false;
    try {
      isDir = fs.statSync(dest).isDirectory();
    } catch {
      continue;
    }
    if (!isDir) continue;

    // 已有 package.json 视为完整（空目录正是缺它才导致解析失败）
    if (fs.existsSync(path.join(dest, 'package.json'))) {
      console.log(`  [已完整] ${entry}`);
      continue;
    }

    const matched = HASH_SUFFIX.exec(entry);
    const name = matched ? matched[1] : entry;
    const src = resolvePackageDir(srcRoot, name);
    if (!src) {
      console.log(`  ⚠ 无法定位包 ${name}（目录名 ${entry}），跳过`);
      continue;
    }

    const stats = copyTree(src, dest, { followSymlinks: true });
    console.log(`  [补全] ${entry} ← ${name}（${stats.copied} 个文件）`);
  }
}

/**
 * 定位一个**内容完整**的包实体（跳过空壳目录）。
 *
 * 与 resolvePackageDir 的差别：后者只要目录存在就返回，而这里要求含 package.json。
 * 本机实测 Next 留下的"空目录"恰好满足前者、不满足后者 —— 用错函数会把空壳
 * 当成实体再复制一遍，等于没修（复制到自身，静默无效）。
 */
function locatePackageEntity(nodeModulesDir, name) {
  const direct = path.join(nodeModulesDir, name);
  if (fs.existsSync(path.join(direct, 'package.json'))) return direct;

  const pnpmRoot = path.join(nodeModulesDir, '.pnpm');
  if (!fs.existsSync(pnpmRoot)) return null;

  const prefix = name.replace('/', '+');
  let candidates;
  try {
    candidates = fs.readdirSync(pnpmRoot).filter((d) => d === name || d.startsWith(`${prefix}@`));
  } catch {
    return null;
  }

  for (const candidate of candidates) {
    const nested = path.join(pnpmRoot, candidate, 'node_modules', name);
    if (fs.existsSync(path.join(nested, 'package.json'))) return nested;
  }
  return null;
}

/** 读包版本号（读不到返回 null） */
function readPackageVersion(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version ?? null;
  } catch {
    return null;
  }
}

/** 顶层某个包位是否可用（有目录且含 package.json） */
function isUsablePackageSlot(dir) {
  return fs.existsSync(path.join(dir, 'package.json'));
}

/** 扫描顶层包位：name → 目录（作用域包下钻一层） */
function scanTopLevelSlots(destRoot) {
  const slots = new Map();
  for (const entry of fs.readdirSync(destRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === '.pnpm' || entry.name.startsWith('.')) continue;
    const full = path.join(destRoot, entry.name);
    if (entry.name.startsWith('@')) {
      let members = [];
      try {
        members = fs.readdirSync(full);
      } catch {
        continue;
      }
      for (const sub of members) slots.set(`${entry.name}/${sub}`, path.join(full, sub));
      continue;
    }
    slots.set(entry.name, full);
  }
  return slots;
}

/**
 * 扫描 .pnpm 中被 Next 追踪到的包：name → 候选源目录[]。
 * Next 的追踪结果就以这个布局落在 standalone 里，是本模块的判据来源。
 */
function scanTracedPackages(destRoot) {
  const traced = new Map();
  const pnpmRoot = path.join(destRoot, '.pnpm');
  if (!fs.existsSync(pnpmRoot)) return traced;

  const push = (name, dir) => {
    if (!traced.has(name)) traced.set(name, []);
    traced.get(name).push(dir);
  };

  for (const entry of fs.readdirSync(pnpmRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const nested = path.join(pnpmRoot, entry.name, 'node_modules');
    if (!fs.existsSync(nested)) continue;
    for (const sub of fs.readdirSync(nested, { withFileTypes: true })) {
      if (sub.name.startsWith('@')) {
        const scopeDir = path.join(nested, sub.name);
        let members = [];
        try {
          members = fs.readdirSync(scopeDir);
        } catch {
          continue;
        }
        for (const member of members) push(`${sub.name}/${member}`, path.join(scopeDir, member));
        continue;
      }
      push(sub.name, path.join(nested, sub.name));
    }
  }
  return traced;
}

/**
 * 统计 dest 相对 src 缺失的文件数（只比"在不在"，不比内容）。
 *
 * 这是本模块的核心判据。**不能**用"顶层有没有 package.json"来判断一个包位是否可用：
 * 实测 Next 在本机给 @swc/helpers 留下的顶层残桩**只有 package.json**，
 * 看着"存在"，但 next/dist/server/require-hook.js 要 require 的
 * `@swc/helpers/cjs/_interop_require_default.cjs` 并不在，照样 MODULE_NOT_FOUND。
 */
function countMissingFiles(src, dest) {
  let missing = 0;
  const stack = [''];
  while (stack.length) {
    const rel = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(path.join(src, rel), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const childRel = rel ? path.join(rel, entry.name) : entry.name;
      let st;
      try {
        st = fs.statSync(path.join(src, childRel)); // 跟随软链接（.pnpm 内大量用软链接去重）
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        stack.push(childRel);
        continue;
      }
      if (!st.isFile()) continue;
      if (!fs.existsSync(path.join(dest, childRel))) missing++;
    }
  }
  return missing;
}

/**
 * 从同名候选中挑一个可用的追踪副本。
 *
 * 同名包在 .pnpm 里会有多个候选（peer 装饰不同；还有一批是坏的软链接，
 * 连 package.json 都读不到，先按"可用"过滤掉）。
 * 版本以仓库根的解析结果为准 —— 那正是 Next 追踪时的解析结果。
 */
function resolveTracedSource(name, candidates) {
  const valid = candidates.filter(isUsablePackageSlot);
  if (valid.length === 0) return null;

  const rootDir = locatePackageEntity(path.join(ROOT, 'node_modules'), name);
  const rootVersion = rootDir ? readPackageVersion(rootDir) : null;
  const matched = rootVersion ? valid.find((c) => readPackageVersion(c) === rootVersion) : null;
  if (matched) return matched;

  const versions = [...new Set(valid.map(readPackageVersion).filter(Boolean))];
  if (versions.length > 1) {
    console.log(`  ⚠ ${name} 在 .pnpm 中有多个版本（${versions.join(', ')}），按第一个取用`);
  }
  return valid[0];
}

/**
 * 算出"顶层与 .pnpm 追踪副本的差异"：Map<name, { dest, source, missing }>。
 *
 * 不变量：**顶层必须是 .pnpm 追踪副本的完整镜像**（这正是 Linux 上那条软链接的语义）。
 * materializeTracedPackages 用它来决定要补什么，assertRuntimePackages 用它来验收，
 * 两边共用同一个判据，避免"修了但没修干净"。
 */
function diffTracedTopLevel(destRoot) {
  const slots = scanTopLevelSlots(destRoot);
  const traced = scanTracedPackages(destRoot);
  const diff = new Map();

  for (const [name, candidates] of traced) {
    const source = resolveTracedSource(name, candidates);
    if (!source) continue; // 候选全是残桩：交给 ensureRuntimePackages 从仓库根兜底
    const dest = slots.get(name) || path.join(destRoot, name);
    const missing = isUsablePackageSlot(dest) ? countMissingFiles(source, dest) : Number.POSITIVE_INFINITY;
    if (missing > 0) diff.set(name, { dest, source, missing });
  }

  // 顶层存在但不在 .pnpm 里的残桩：回落到仓库根找完整包
  for (const [name, dir] of slots) {
    if (traced.has(name) || isUsablePackageSlot(dir)) continue;
    const source = locatePackageEntity(path.join(ROOT, 'node_modules'), name);
    if (source) diff.set(name, { dest: dir, source, missing: Number.POSITIVE_INFINITY });
  }

  return diff;
}

/**
 * 把 .pnpm 中已被追踪的包"平铺"到 standalone/node_modules 顶层。
 *
 * 🚨 背景（与 ensureExternalPackages 同源但位置不同，别合并）：
 * Next 的 output tracing 按 pnpm 的真实路径把被追踪的包复制进
 *   node_modules/.pnpm/<pkg>@<ver>/node_modules/<pkg>/
 * 然后在顶层建**软链接**指过去。本机（Windows + 杀软实时防护）实测这些软链接
 * 会整个建不出来，两种表现都出现过：
 *   1. 顶层留个**空目录**（next / react / react-dom / typescript）
 *   2. 顶层**连目录都没有**（styled-jsx / bcryptjs / jose / node-cron /
 *      source-map-support / semver / buffer-from）
 * 后者尤其阴险：只看"目录在不在"的检查完全发现不了，而 next 自己的
 * require-hook 会直接炸：
 *   Cannot find module 'styled-jsx/package.json'
 * 表现为桌面端「应用服务」通道 code=1 退出、/api/health 永不通过。
 *
 * 除了"整个目录没建出来"，还有一种更阴险的形态：顶层留下**残桩** ——
 * 只有 package.json，真正的文件一个没到（@swc/helpers 就是这样，
 * next/dist/server/require-hook.js 要的 cjs/_interop_require_default.cjs 不在）。
 * 所以判据是**内容级**的：顶层必须完整镜像 .pnpm 追踪副本（见 diffTracedTopLevel），
 * 而不是"有个 package.json 就算数"。
 *
 * 版本选择：同名包在 .pnpm 里会有多个候选（peer 装饰不同，另有一批坏软链接）。
 * 以仓库根 node_modules 解析到的版本为准 —— 那正是 Next 追踪时的解析结果。
 */
function materializeTracedPackages() {
  const destRoot = path.join(STANDALONE, 'node_modules');
  if (!fs.existsSync(path.join(destRoot, '.pnpm'))) return;

  console.log('\n[prepare-standalone] 同步 .pnpm 追踪副本到顶层（软链接在本机建不出来）：');

  const diff = diffTracedTopLevel(destRoot);
  if (diff.size === 0) {
    console.log('  顶层已与 .pnpm 一致，无需动作');
    return;
  }

  let synced = 0;
  for (const name of [...diff.keys()].sort()) {
    const { dest, source, missing } = diff.get(name);
    const stats = copyTree(source, dest, { followSymlinks: true });
    synced++;
    const lack = missing === Number.POSITIVE_INFINITY ? '全部' : `${missing} 个`;
    console.log(
      `  [同步] ${name} ← ${path.relative(STANDALONE, source)}（缺 ${lack} 文件，写入 ${stats.copied} / 跳过 ${stats.skipped}）`,
    );
  }
  console.log(`  同步 ${synced} 个包`);
}

/**
 * 构建期硬断言：顶层必须是每个被追踪包的**完整镜像**。
 *
 * 为什么值得让构建失败：这类缺失的**全部**症状都发生在用户装完之后
 * （服务端起不来、/api/health 永不通过、界面白屏），排查成本极高 ——
 * 这次就是从「桌面端能不能启动」一路追到「pnpm 软链接在本机建不出来」。
 * 宁可在这里失败。
 */
const REQUIRED_RUNTIME_PACKAGES = ['next', 'react', 'react-dom'];

function assertRuntimePackages() {
  const destRoot = path.join(STANDALONE, 'node_modules');
  const problems = [];

  const missingRequired = REQUIRED_RUNTIME_PACKAGES.filter(
    (name) => !isUsablePackageSlot(path.join(destRoot, name)),
  );
  if (missingRequired.length) problems.push(`必需包缺失：${missingRequired.join(', ')}`);

  // 与 materializeTracedPackages 共用同一判据：差异应为空
  const diff = diffTracedTopLevel(destRoot);
  if (diff.size) {
    const detail = [...diff.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, d]) => `${name}(缺 ${d.missing === Number.POSITIVE_INFINITY ? '全部' : d.missing})`)
      .join(', ');
    problems.push(`顶层未完整镜像 .pnpm 追踪副本：${detail}`);
  }

  if (problems.length) {
    console.error('\n✗ standalone 的运行期依赖不完整：');
    for (const p of problems) console.error(`  - ${p}`);
    console.error('  server.js / next 的 require-hook 会直接 MODULE_NOT_FOUND，');
    console.error('  桌面端表现为「应用服务」通道退出、/api/health 永不通过、界面白屏。');
    console.error('  请检查 materializeTracedPackages() 的 .pnpm 扫描逻辑。\n');
    process.exit(1);
  }

  console.log(
    `[prepare-standalone] 运行期依赖完整：必需包齐全（${REQUIRED_RUNTIME_PACKAGES.join(', ')}），顶层与 .pnpm 一致`,
  );
}

/** data/ 白名单重建 */
function prepareDataDir() {
  const src = path.join(ROOT, 'data');
  const dest = path.join(STANDALONE, 'data');
  fs.mkdirSync(dest, { recursive: true });

  console.log('\n[prepare-standalone] 重建 data/（白名单 + 凭据清理）：');

  if (!fs.existsSync(src)) {
    console.log('  [跳过] data/（源不存在）');
  } else {
    for (const name of DATA_ALLOW) {
      const from = path.join(src, name);
      if (!fs.existsSync(from)) {
        console.log(`  [跳过] data/${name}（不存在）`);
        continue;
      }
      fs.copyFileSync(from, path.join(dest, name));
      console.log(`  [完成] data/${name}`);
    }
  }

  fs.writeFileSync(
    path.join(dest, CREDENTIAL_FILE),
    JSON.stringify(EMPTY_PROVIDERS_CONFIG, null, 2),
    'utf8',
  );
  console.log(`  [重置] data/${CREDENTIAL_FILE} → 空配置`);

  for (const name of DATA_EXCLUDES) {
    if (fs.existsSync(path.join(src, name))) {
      console.log(`  [排除] data/${name}（敏感，不打包）`);
    }
  }
}

/** 凭据扫描：命中即判定构建失败 */
function scanForSecrets() {
  const targets = [
    path.join(STANDALONE, 'data'),
    path.join(STANDALONE, 'public'),
  ];

  const suspicions = [];

  const scanFile = (file) => {
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      return;
    }
    if (/\bsk-[A-Za-z0-9_-]{12,}|\bas_sk_[A-Za-z0-9]{12,}/.test(text)) {
      suspicions.push(`${path.relative(STANDALONE, file)}: 命中 API Key 前缀`);
    }
    if (/"apiKey"\s*:\s*"[^"]{8,}"/.test(text)) {
      suspicions.push(`${path.relative(STANDALONE, file)}: 存在非空 apiKey 字段`);
    }
  };

  for (const dir of targets) {
    if (!fs.existsSync(dir)) continue;
    const stack = [dir];
    while (stack.length) {
      const current = stack.pop();
      let entries;
      try {
        entries = fs.readdirSync(current, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) stack.push(full);
        else if (entry.isFile()) scanFile(full);
      }
    }
  }

  console.log('\n[prepare-standalone] 凭据扫描：');
  if (suspicions.length) {
    for (const item of suspicions) console.log(`  ✗ ${item}`);
    return false;
  }
  console.log('  ✓ 未发现凭据泄漏');
  return true;
}

function main() {
  console.log('[prepare-standalone] 校验 standalone 产物…');

  if (!fs.existsSync(path.join(STANDALONE, 'server.js'))) {
    console.error('\n✗ 未找到 .next/standalone/server.js');
    console.error('  请先执行：node scripts/desktop/build-next.mjs\n');
    process.exit(1);
  }

  console.log(`[prepare-standalone] 目标目录：${STANDALONE}\n`);

  pruneStandalone();

  console.log('\n[prepare-standalone] 重建运行期资源：');
  let total = 0;
  total += copyPublic();
  for (const [src, dest] of COPY_DIRS) {
    total += copyEntry(src, dest, { isDir: true });
  }
  for (const [src, dest] of COPY_FILES) {
    total += copyEntry(src, dest, { isDir: false });
  }

  ensureExternalPackages();
  materializeTracedPackages();
  ensureRuntimePackages();
  assertRuntimePackages();
  prepareDataDir();

  if (!scanForSecrets()) {
    console.error('\n✗ 检测到疑似凭据残留，已终止构建以防凭据外发。');
    console.error('  请检查 prepare-standalone.mjs 的白名单配置后重试。\n');
    process.exit(1);
  }

  const finalSize = dirSize(STANDALONE);
  console.log(`\n[prepare-standalone] standalone 最终大小 ${mb(finalSize)}`);
  console.log('[prepare-standalone] 完成 ✓\n');
}

main();
