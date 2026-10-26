/**
 * 打包产物验证（安装包验收）。
 *
 * 分两段：
 *   【静态】检查 release/<platform>-unpacked 的结构是否符合设计约束
 *   【动态】用临时 userData 目录真启动一次打包后的可执行文件，验证
 *          "内嵌 PG → MQTT → Next/WS/Yjs → /api/health → 配置向导"
 *          整条链路在**打包形态**（app.asar + resources/app-server）下能跑通
 *
 * 静态检查覆盖的几条硬约束（改动打包配置后务必回跑）：
 *   1. 前端依赖树绝不能进 asar —— app.asar 应该是 2MB 量级（只有 desktop/ 代码
 *      + aedes/pg/get-port/embedded-postgres 这条运行期依赖链）。若它变成几百 MB，
 *      说明 electron-builder 的 projectDir/appDir 又被指回仓库根了。
 *   2. @embedded-postgres 的可执行文件必须在 asar 之外（app.asar.unpacked），
 *      否则 spawn postgres.exe / initdb.exe 会失败（asar 内文件不可执行）。
 *   3. Next standalone 完整副本必须在 resources/app-server（部署产物在白名单重建时
 *      最容易漏掉 public / .next/static / ws-server / server）。
 *   4. 构建期文件（.npmrc / electron-builder.yml / verify-*）不得进包。
 *   5. 产物内不得残留任何真实凭据。
 *
 * 用法：
 *   node desktop/verify-packaged.mjs            # 只做静态检查
 *   node desktop/verify-packaged.mjs --run      # 静态 + 真实启动（约 1-3 分钟）
 *
 * 使用 --user-data-dir 指向系统临时目录，绝不污染真实的桌面端用户数据
 * （%APPDATA%/Stravision）。该目录会保留，便于事后翻日志。
 */

import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const nodeRequire = createRequire(import.meta.url);
// @electron/asar 是 CommonJS，ESM 里没有 default 导出，走 createRequire
const asar = nodeRequire('@electron/asar');

const RUN = process.argv.includes('--run');

/* ---------------- 断言工具 ---------------- */

let failures = 0;
function check(ok, label, detail) {
  if (ok) {
    console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    failures++;
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 轮询等待条件成立（超时返回 false），用于把"等事件"写成一句断言 */
async function waitUntil(fn, timeoutMs = 10000, interval = 100) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    let value;
    try {
      value = fn();
    } catch {
      value = false;
    }
    if (value) return true;
    if (Date.now() > deadline) return false;
    await sleep(interval);
  }
}

/* ---------------- asar 解析（不引入依赖） ---------------- */

/**
 * 读取 asar 的头部 JSON（文件名清单都在里面）。
 *
 * 格式：前 8 字节是一个 Pickle，偏移 4 处是「头部 Pickle 的字节数」；
 * 紧接着该长度的字节是第二个 Pickle，偏移 4 处是「JSON 字符串长度」。
 * 这里只需要拿字符串做 includes 判断，不需要还原完整目录树。
 */
function readAsarHeader(asarPath) {
  const fd = fs.openSync(asarPath, 'r');
  try {
    const sizeBuf = Buffer.alloc(8);
    fs.readSync(fd, sizeBuf, 0, 8, 0);
    const headerSize = sizeBuf.readUInt32LE(4);
    const headerBuf = Buffer.alloc(headerSize);
    fs.readSync(fd, headerBuf, 0, headerSize, 8);
    const jsonLen = headerBuf.readUInt32LE(4);
    return headerBuf.subarray(8, 8 + jsonLen).toString('utf8');
  } finally {
    fs.closeSync(fd);
  }
}

/* ---------------- 平台产物路径 ---------------- */

const isWin = process.platform === 'win32';
const APP_OUT = path.join(ROOT, 'release', isWin ? 'win-unpacked' : process.platform === 'darwin' ? 'mac' : 'linux-unpacked');
const EXE = path.join(APP_OUT, isWin ? 'Stravision.exe' : process.platform === 'darwin' ? 'Stravision.app' : 'stravision');
const RESOURCES = path.join(APP_OUT, 'resources');
const ASAR = path.join(RESOURCES, 'app.asar');
const UNPACKED = path.join(RESOURCES, 'app.asar.unpacked');
const SERVER = path.join(RESOURCES, 'app-server');

const sb = (p) => {
  try {
    return fs.statSync(p).size;
  } catch {
    return -1;
  }
};
const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/* ---------------- 静态检查 ---------------- */

async function staticChecks() {
  console.log('\n[1] 可执行文件与资源骨架');
  check(fs.existsSync(EXE), `${path.basename(EXE)} 存在`, path.relative(ROOT, EXE));
  check(fs.existsSync(ASAR), 'resources/app.asar 存在');
  check(fs.existsSync(SERVER), 'resources/app-server 存在（asar 之外）');

  // 🚨 在线更新配置（2026-09-16 起硬校验）：electron-updater 运行期从该文件拿更新源，
  //    缺失 = 首查 ENOENT 静默失败 = 永远不弹更新框（4.2.0-4.2.3 通病）。
  //    它由 electron-builder 依据 electron-builder.yml 的 publish 配置在打包时生成，
  //    win-unpacked 与安装后的产物都应有——此前"只有安装后才有"的注释是错误认知。
  const appUpdateYml = path.join(path.dirname(ASAR), 'app-update.yml');
  if (fs.existsSync(appUpdateYml)) {
    const ymlText = fs.readFileSync(appUpdateYml, 'utf8');
    check(
      /provider:\s*generic/.test(ymlText) && /stravision\.site\/downloads\/desktop/.test(ymlText),
      'resources/app-update.yml 存在且指向 stravision.site 更新源'
    );
  } else {
    check(false, 'resources/app-update.yml 存在', '缺失！electron-builder.yml 需配置 publish');
  }

  console.log('\n[2] asar 体积与内容（防止前端依赖树混入）');
  const asarSize = sb(ASAR);
  check(asarSize > 0 && asarSize < 20 * 1024 * 1024, `app.asar 体积合理`, mb(asarSize));

  let header = '';
  try {
    header = readAsarHeader(ASAR);
  } catch (err) {
    check(false, 'asar 头部可解析', err.message);
  }
  // 🚨 splash.html / activate.html **故意不在 asar 里**：
  //    asar 内是 Windows 反斜杠路径，Chromium 的 file:// 加载不了（loadFile 恒 ERR_FILE_NOT_FOUND）。
  //    它们走 extraResources 落在 resources/ui，由 main.js 的 uiDir() 读取。
  //    ⚠️ 2026-10-07：首启向导（原 setup.html）已删除 —— 它改成了 Next 路由
  //       /desktop-setup（见 app/desktop-setup/page.tsx 文件头），不再走 file://，
  //       所以这里不再检查它。（向导为什么能是路由：它跑在 bootstrap 第 8 步，Next 已就绪。）
  for (const f of ['"main.js"', '"preload.js"', '"settings.js"', '"mqtt.js"']) {
    check(header.includes(f), `asar 含 ${f.replaceAll('"', '')}`);
  }
  check(!/\\ui\\/.test(header), 'asar 不含 ui/（UI 页面已移到 resources）');
  for (const f of ['activate.html', 'splash.html']) {
    check(fs.existsSync(path.join(RESOURCES, 'ui', f)), `resources/ui 含 ${f}`);
  }
  // 🚨 ui/assets/ 是这两页的**运行时依赖**，漏掉不会报错、只会静默降级：
  //    material.css 丢了 → 两个窗口的沉浸光感全没（退成一排平白控件）；
  //    两张 png 丢了 → 品牌图标与吉祥物变成裂图。
  for (const f of ['assets/material.css', 'assets/brand-icon.png', 'assets/splash-mascot.png']) {
    check(fs.existsSync(path.join(RESOURCES, 'ui', f)), `resources/ui 含 ${f}`);
  }
  for (const f of ['".npmrc"', '"electron-builder.yml"', '"package-lock.json"']) {
    check(!header.includes(f), `asar 不含构建期文件 ${f.replaceAll('"', '')}`);
  }
  check(!/"verify-[a-z-]*\.(mjs|cjs)"/.test(header), 'asar 不含 verify-* 验证脚本');
  // 先校验 desktop/package.json 里声明的直接依赖
  for (const pkg of ['"aedes"', '"embedded-postgres"', '"get-port"', '"electron-updater"']) {
    check(header.includes(pkg), `asar 含直接依赖 ${pkg.replaceAll('"', '')}`);
  }

  // 🚨🚨 传递依赖必须一起进 asar（2026-09-29 事故的漏网点）
  //   embedded-postgres 运行期会 `import('pg')` 连本地库，而 pg 只是它的**传递依赖**，
  //   desktop/package.json 里并没有写。一旦 electron-builder 的依赖采集退化成
  //   "只搬 package.json 的直接依赖"（见 scripts/desktop/obfuscate-desktop.mjs 文件头），
  //   pg 就不进包 → 客户端 bootstrap 走到 18%「初始化本地数据库」时
  //   `Cannot find package 'pg' imported from .../embedded-postgres/dist/index.js`
  //   → 应用无限重启，装上去就是废的。
  //   老注释"主进程从不 require('pg')"是错的：主进程不 require，但 embedded-postgres 会。
  for (const pkg of [
    '"pg"',
    '"pg-pool"',
    '"pg-protocol"',
    '"pg-types"',
    '"pg-connection-string"',
    '"async-exit-hook"',
  ]) {
    check(header.includes(pkg), `asar 含传递依赖 ${pkg.replaceAll('"', '')}`);
  }

  // 采集器退化防护：直接依赖 + 传递依赖加起来应该有几十个顶层包。
  // 只有 4 个 = 采集器又退化成"只搬 package.json"，上面那组断言可能还没覆盖到的地方同样危险。
  let nmTop = 0;
  try {
    const names = new Set();
    for (const f of asar.listPackage(ASAR)) {
      const parts = f.replace(/\\/g, '/').split('/');
      const i = parts.indexOf('node_modules');
      if (i >= 0 && parts[i + 1]) names.add(parts[i + 1]);
    }
    nmTop = names.size;
  } catch {
    nmTop = 0;
  }
  check(nmTop >= 20, 'asar 的 node_modules 顶层包数量正常（依赖采集未退化）', `${nmTop} 个`);
  check(!header.includes('"after-pack.cjs"'), 'asar 不含加固脚本 after-pack.cjs');

  console.log('\n[2b] 加固：主进程与授权模块已混淆');
  // 判定口径：看**字符串字面量**是不是已经读不到了。
  // 🚨 不要用函数名/属性名判定 —— obfuscator 默认不重命名标识符（renameGlobals 关着），
  //    ensureLicensed / loadBuiltinPublicKey 这些名字留着是正常的，拿它们断言只会误报。
  try {
    const main = asar.extractFile(ASAR, 'main.js').toString('utf8');
    const lic = asar.extractFile(ASAR, 'lib/license.js').toString('utf8');
    const pub = asar.extractFile(ASAR, 'lib/license-public-key.js').toString('utf8');
    check(!main.includes('desktop-license.json'), 'main.js 的字符串已加密');
    check(/_0x[0-9a-f]{4,}/.test(main), 'main.js 带混淆特征');
    check(!lic.includes('该授权已被管理员作废'), 'lib/license.js 的字符串已加密');
    check(!lic.includes('revocation-overdue'), 'lib/license.js 的状态名已加密');
    check(!pub.includes('MCowBQYDK2VwAyEA'), '内置公钥在产物里读不到明文');
    check(/_0x[0-9a-f]{4,}/.test(pub), 'license-public-key.js 带混淆特征');
  } catch (err) {
    check(false, '读取 asar 内文件以校验混淆', err.message);
  }

  // 🚨 [2c] Fuses 与「子进程靠 ELECTRON_RUN_AS_NODE 启动」的架构必须兼容。
  //   桌面端用 spawn(process.execPath, [script], {ELECTRON_RUN_AS_NODE:'1'}) 拉起 Next/WS/Yjs
  //   （desktop/lib/servers.js）。RunAsNode 被翻成 DISABLE 后该环境变量会被静默忽略，
  //   子进程退化成"再启一个完整 Electron 应用" → 撞单实例锁 → 0.2 秒后 quit(0)，
  //   现象是 splash 永远停在「正在等待服务就绪…(72%)」，日志却只有 `进程退出 code=0`。
  //   2026-09-29 踩过一次，这条断言就是那次事故的护栏。
  console.log('\n[2c] Electron Fuses 与子进程启动方式兼容');
  try {
    const fuses = nodeRequire('@electron/fuses');
    const { FuseV1Options, FuseState } = fuses;
    const wire = await fuses.getCurrentFuseWire(EXE);
    const st = (opt) => wire[String(FuseV1Options[opt])];
    const name = (v) =>
      v === FuseState.ENABLE ? 'ENABLE' : v === FuseState.DISABLE ? 'DISABLE' : String(v);

    check(
      st('RunAsNode') === FuseState.ENABLE,
      'RunAsNode 已启用（子服务依赖 ELECTRON_RUN_AS_NODE）',
      name(st('RunAsNode'))
    );
    check(
      st('OnlyLoadAppFromAsar') === FuseState.ENABLE,
      'OnlyLoadAppFromAsar 已启用（只能从 asar 加载）',
      name(st('OnlyLoadAppFromAsar'))
    );
    check(
      st('EnableEmbeddedAsarIntegrityValidation') === FuseState.ENABLE,
      'AsarIntegrity 已启用（改 asar 起不来）',
      name(st('EnableEmbeddedAsarIntegrityValidation'))
    );
    check(
      st('EnableNodeCliInspectArguments') === FuseState.DISABLE,
      'EnableNodeCliInspectArguments 已禁用（挡 --inspect）',
      name(st('EnableNodeCliInspectArguments'))
    );
  } catch (err) {
    check(false, '读取 Electron Fuses', err.message);
  }

  console.log('\n[3] PostgreSQL 二进制在 asar 之外（否则无法 spawn）');
  const pgBin = path.join(UNPACKED, 'node_modules', '@embedded-postgres', `windows-x64`, 'native', 'bin');
  const pgBinAlt = pgBin.replace('windows-x64', `${process.platform}-${process.arch}`);
  const pgDir = fs.existsSync(pgBinAlt) ? pgBinAlt : pgBin;
  for (const exe of isWin ? ['postgres.exe', 'initdb.exe', 'pg_ctl.exe'] : ['postgres', 'initdb', 'pg_ctl']) {
    check(fs.existsSync(path.join(pgDir, exe)), `解包出 ${exe}`);
  }

  console.log('\n[4] Next standalone 运行时完整');
  for (const f of ['server.js', 'package.json', '.next/BUILD_ID', '.next/static', 'public']) {
    check(fs.existsSync(path.join(SERVER, f)), `app-server 含 ${f}`);
  }
  const wsCandidates = ['ws-server/yjs-server.js', 'server/ws-server.js'];
  check(wsCandidates.some((f) => fs.existsSync(path.join(SERVER, f))), 'app-server 含 ws / yjs 服务入口');

  // 🚨 node_modules 是打包最容易静默丢掉的一块：extraResources 会无条件排除
  //    "拷贝源根层"的 node_modules（见 desktop/electron-builder.yml 的说明），
  //    所以这里必须逐包断言，别只看目录存在。
  //    这里只验"目录在不在"，包内是否为空由下面 [next/react/react-dom] 那组单独盯。
  const nodeModules = path.join(SERVER, 'node_modules');
  check(fs.existsSync(nodeModules), 'app-server 含 node_modules（根层会被 extraResources 排除）');
  for (const pkg of ['pg', 'ws', 'yjs', 'lib0', 'y-protocols', 'dotenv', 'sharp']) {
    check(fs.existsSync(path.join(nodeModules, pkg)), `app-server 含运行期依赖 ${pkg}`);
  }

  // 🚨 必须断言 package.json 存在，而不是目录存在。
  //    实测（Windows + 杀软实时防护下）Next 给被追踪包建的软链接会退化成**空目录**，
  //    于是 server.js 第 16 行 require('next') 直接 MODULE_NOT_FOUND 秒退 ——
  //    目录在、文件不在，只看 existsSync(目录) 完全抓不到。
  //    修复见 scripts/desktop/prepare-standalone.mjs 的 materializeTracedPackages()。
  const traced = ['next', 'react', 'react-dom'];
  const emptyShells = traced.filter(
    (pkg) => !fs.existsSync(path.join(nodeModules, pkg, 'package.json')),
  );
  check(
    emptyShells.length === 0,
    'app-server 的 Next 运行期包非空壳（next / react / react-dom）',
    emptyShells.length ? `缺失 package.json：${emptyShells.join(', ')}` : undefined,
  );

  check(
    fs.existsSync(path.join(SERVER, 'data', 'ai-providers-config.json')),
    'app-server 含 AI 供应商配置占位文件'
  );

  // 🚨 2026-10-27 事故：语音模型随 data/ 打包，而桌面端 data/ 被 links.js 重定向成
  //    指向 userData 的目录联接 → 老用户升级时迁移整段跳过，模型只留在 data.__bundled__，
  //    运行期 cwd/data/models/asr 不存在 → 语音输入永久置灰。
  //    现在模型放 serverRoot/models/asr（不经任何联接），这里钉死它必须随包。
  if (process.env.ASR_SKIP_MODEL === '1') {
    console.log('  · 跳过语音模型校验（ASR_SKIP_MODEL=1）');
  } else {
    const asrDir = path.join(SERVER, 'models', 'asr', 'funasr-paraformer');
    for (const f of ['model.int8.onnx', 'tokens.txt']) {
      check(fs.existsSync(path.join(asrDir, f)), `app-server 含语音模型 ${f}（缺失则语音输入置灰）`);
    }
  }

  console.log('\n[5] 产物内不得残留真实凭据');
  const credTargets = [
    path.join(SERVER, 'data', 'ai-providers-config.json'),
    path.join(SERVER, 'data', 'desktop-settings.json'),
  ];
  for (const t of credTargets) {
    if (!fs.existsSync(t)) {
      check(true, `${path.basename(t)} 不存在（无需检查）`);
      continue;
    }
    const raw = fs.readFileSync(t, 'utf8');
    const leaked = /"apiKey"\s*:\s*"[^"]{8,}"/.test(raw) || /sk-[A-Za-z0-9]{16,}/.test(raw);
    check(!leaked, `${path.basename(t)} 未硬编码凭据`);
  }
}

/* ---------------- 动态检查 ---------------- */

/**
 * 启动一次打包后的应用。
 *
 * 🚨 必须清掉 ELECTRON_RUN_AS_NODE：
 * 主进程用它来把子服务跑成纯 Node（see desktop/lib/servers.js），
 * 但**桌面应用自身**一旦继承到它就会退化成 Node CLI，直接报
 * `Stravision.exe: bad option: --user-data-dir=...` 然后秒退。
 * 从打包/调试脚本里跑验证时，这个变量很容易残留在当前 shell 环境里。
 */
/**
 * 验收用授权注入（只读源文件，不动真实用户数据）。
 *
 * 打包态首启在 bootstrap 12% 处会停在授权激活窗：没有有效凭据 → 后面的
 * 内嵌 PG / aedes MQTT / Next / WS / Yjs 全部不启动，`/api/health` 必然 fetch failed，
 * 动态验收会稳定挂掉 6 项（跟包体质量无关，纯粹是验收场景没凭据）。
 *
 * 设备指纹 = sha256(machine-id | hostname | platform | arch)（见 desktop/lib/license.js
 * 的 getDeviceId），与 userData 目录无关 —— 所以同一台机器上本机已激活的
 * desktop-license.json 可以直接复用。
 *
 * 🚨 但有两个前置条件，任一不满足都会退化成 device-mismatch 并停在激活窗：
 *   ① Windows 的机器码来自 `reg query HKLM\SOFTWARE\Microsoft\Cryptography /v MachineGuid`；
 *      若进程策略把 reg.exe 拉黑（WorkBuddy 沙箱就是这样），rawMachineId() 返回 ''，
 *      机器码退化成 'no-machine-id'，指纹必然与本机真实授权不符。
 *   ② 授权本身已过期 / 被吊销。
 *   这两种情况都不是包体缺陷，别据此判定构建失败；换到普通终端跑即可。
 *
 * 覆盖方式：`STRAVISION_VERIFY_LICENSE=<path>`；
 * 关闭注入：`STRAVISION_VERIFY_SKIP_LICENSE_SEED=1`（用于专门验证激活窗本身）。
 */
function seedLicense(userDataDir) {
  if (process.env.STRAVISION_VERIFY_SKIP_LICENSE_SEED === '1') return;
  if (fs.existsSync(path.join(userDataDir, 'server-data', 'desktop-license.json'))) return;

  const candidates = [
    process.env.STRAVISION_VERIFY_LICENSE,
    process.env.APPDATA
      ? path.join(process.env.APPDATA, 'stravision-desktop-runtime', 'server-data', 'desktop-license.json')
      : null,
  ].filter(Boolean);

  const src = candidates.find((p) => {
    try {
      return fs.statSync(p).isFile();
    } catch {
      return false;
    }
  });
  if (!src) {
    console.log('  · 未找到可复用的本机授权凭据（动态验收会停在激活窗）');
    return;
  }

  const destDir = path.join(userDataDir, 'server-data');
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, path.join(destDir, 'desktop-license.json'));
  console.log(`  · 已注入本机授权凭据 ← ${src}`);
}

function launchApp(userDataDir, { skipSetup }) {
  if (skipSetup) {
    // 与 main.js 的 SKIP_FLAG 对齐：有该标记就不弹配置向导，直接进主界面
    const serverData = path.join(userDataDir, 'server-data');
    fs.mkdirSync(serverData, { recursive: true });
    fs.writeFileSync(path.join(serverData, '.ai-setup-skipped'), '');
  }

  seedLicense(userDataDir);

  const outPath = path.join(userDataDir, 'stdout.log');
  const errPath = path.join(userDataDir, 'stderr.log');
  const outFd = fs.openSync(outPath, 'a');
  const errFd = fs.openSync(errPath, 'a');
  const childEnv = { ...process.env };
  delete childEnv.ELECTRON_RUN_AS_NODE;
  delete childEnv.ELECTRON_NO_ATTACH_CONSOLE;

  // 沙箱/CI 无 GPU 环境适配（STRAVISION_VERIFY_NO_GPU=1 时启用；默认不传，保持用户真实启动形态）：
  // Job Object 与 Chromium 内部沙箱冲突会让 GPU/renderer 子进程创建即死（exit_code=1），
  // Chromium 重启 GPU 进程 9 次后 native 层 FATAL 自杀（"GPU process isn't usable. Goodbye."）。
  // --no-sandbox + --disable-gpu 可在无 GPU 沙箱里跑通完整业务链路（实测 25s 到达「就绪 100%」）。
  const extraArgs = process.env.STRAVISION_VERIFY_NO_GPU === '1' ? ['--no-sandbox', '--disable-gpu'] : [];

  const child = spawn(EXE, [`--user-data-dir=${userDataDir}`, ...extraArgs], {
    cwd: APP_OUT,
    detached: false,
    stdio: ['ignore', outFd, errFd],
    env: childEnv,
  });

  return {
    child,
    userDataDir,
    logDir: path.join(userDataDir, 'logs'),
    outPath,
    errPath,
    outFd,
    errFd,
  };
}

/**
 * 收掉本次启动占用的文件句柄。
 * 子进程已继承自己的副本，父进程这份必须显式关掉 ——
 * Windows 上句柄会挡住目录操作（实测 rename 报 EPERM）。
 */
function releaseHandles(app) {
  for (const fd of [app.outFd, app.errFd]) {
    try {
      fs.closeSync(fd);
    } catch {
      /* ignore */
    }
  }
}

async function killApp(app) {
  if (app.child.pid && app.child.exitCode === null) {
    spawnSync('taskkill', ['/PID', String(app.child.pid), '/T', '/F'], { stdio: 'ignore' });
    await sleep(3000);
  }
}

/**
 * 端口是否还能连上（能连上 = 还被占用）。
 * 用真实 TCP 连接判断，而不是看进程表 —— 内嵌 PG 是 detached 的
 * postgres.exe，`taskkill /T` 之后可能还在收尾几秒。
 */
function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    const done = (open) => {
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(600);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

/**
 * 等端口空出来。
 *
 * 🚨 两段启动之间必须等内嵌 PG（5433）真正退出：`taskkill /T /F` 不给应用
 * 优雅退出的机会，postgres.exe 可能还在收尾。此时第二段会以
 * "could not bind IPv4 address 127.0.0.1: Only one usage of each socket address"
 * 失败 —— 那是环境残留，不是产物问题，会误判成 bug。
 */
async function waitForPortFree(port, timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await isPortOpen(port))) return true;
    await sleep(1000);
  }
  return false;
}

/**
 * 把产物副本里被「运行过一次」改写的可写目录还原成随包原始形态。
 *
 * desktop/lib/links.js 在打包形态首次运行时会：
 *   1. 把随包目录迁到 userData，并 rename 成 <name>.__bundled__
 *   2. 在原名位置建目录联接（data / docs / public/uploads）→ <userData>/server-data/...
 * 验收跑过之后产物里就留着这些联接与备份，下次再验就不是「用户首次拿到的形态」了。
 * 这里在验收结束时还原，让产物可反复验收、也能直接拿去打安装包。
 */
function restoreAppServerWritableDirs() {
  const serverRoot = path.join(APP_OUT, 'resources', 'app-server');
  let restored = 0;
  for (const rel of ['data', 'docs', path.join('public', 'uploads')]) {
    const source = path.join(serverRoot, rel);
    const backup = `${source}.__bundled__`;

    let st = null;
    try {
      st = fs.lstatSync(source);
    } catch {
      st = null;
    }
    if (st && st.isSymbolicLink()) {
      // 目录联接必须用 rmdir（RemoveDirectory 语义），unlink 在 Windows 上会失败
      try {
        fs.rmdirSync(source);
      } catch {
        try {
          fs.unlinkSync(source);
        } catch {
          /* ignore */
        }
      }
      restored++;
    }
    if (fs.existsSync(backup)) {
      if (fs.existsSync(source)) fs.rmSync(source, { recursive: true, force: true });
      fs.renameSync(backup, source);
      restored++;
    }
  }
  console.log(`  · 产物可写目录已还原（${restored} 处），保持随包原始形态`);
}

/** 读出该目录下桌面端日志的全部文本（可能分文件） */
function readLogText(logDir) {
  let entries = [];
  try {
    entries = fs.readdirSync(logDir).filter((f) => f.startsWith('desktop-') && f.endsWith('.log'));
  } catch {
    return '';
  }
  let text = '';
  for (const f of entries) {
    try {
      text += fs.readFileSync(path.join(logDir, f), 'utf8');
    } catch {
      /* ignore */
    }
  }
  return text;
}

/**
 * 等待日志文件出现且包含目标文本；child 提前退出则立即返回。
 *
 * 🚨 [ERROR] 短路需要白名单：历史上 4.2.0-4.2.3 因 electron-builder.yml 缺 publish 配置，
 *    打包产物没有 app-update.yml，electron-updater 首查（启动后 20s）报 ENOENT。
 *    2026-09-16 已修复（publish 配置 + [1] 节硬校验该文件存在），此白名单保留为
 *    最后兜底——若再出现该 ENOENT，说明 publish 配置又丢了，[1] 节会先给出明确 ❌。
 */
const BENIGN_ERROR = /\[ERROR\] \[updater\] Error:.*app-update\.yml/;

async function waitForLogText(logDir, needle, timeoutMs, child) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const text = readLogText(logDir);
    if (text.includes(needle)) return { ok: true, logDir, text };
    const fatalLine = text.split('\n').find((l) => l.includes('[ERROR]') && !BENIGN_ERROR.test(l));
    if (fatalLine) return { ok: false, logDir, text, error: true };
    if (child && child.exitCode !== null) {
      return { ok: false, exited: true, code: child.exitCode };
    }
    await sleep(1000);
  }
  return { ok: false, timeout: true };
}

/** 子服务（next / ws-voice / yjs）非零退出 = 对应功能整块是死的 */
function crashedServices(text) {
  return text
    .split('\n')
    .filter((line) => /\[(next|ws-voice|yjs)\].*异常退出/.test(line))
    .map((line) => line.replace(/^\[[^\]]+\]\s*/, '').replace(/^\[[A-Z]+\]\s*/, '').trim());
}

/** 打印日志尾部，失败时最需要它 */
function printLogTail(app, text) {
  if (text) {
    console.log('  · 启动日志（尾部）：');
    for (const line of text.split('\n').filter(Boolean).slice(-12)) console.log(`      ${line}`);
  } else {
    console.log('  · stderr：');
    let tail = '';
    try {
      tail = fs.readFileSync(app.errPath, 'utf8').trim().split('\n').slice(-6).join('\n');
    } catch {
      /* ignore */
    }
    console.log(tail || '      (空)');
  }
}

async function fetchHealth(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    return { status: res.status, text };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * 打包形态下 yjs 协作服务的真实同步往返。
 *
 * 为什么必须是行为级验证：这个服务曾经"进程能起来但 require 就崩"，
 * 只查日志里有没有 "listening" 完全抓不到；而它的失效表现恰恰是
 * 「能连上、但两端内容永远不同步」这类只有真连一次才看得见的症状。
 *
 * 🚨 disableBc 必须开：两个 provider 跑在同一进程里，开着 BroadcastChannel
 * 它们会绕开 WebSocket 直接互通 —— 服务端一行代码都没跑也能全绿。
 */
async function yjsRoundTripCheck() {
  let Y;
  let WebsocketProvider;
  let WS;
  try {
    Y = nodeRequire('yjs');
    ({ WebsocketProvider } = nodeRequire('y-websocket'));
    WS = nodeRequire('ws');
  } catch (err) {
    check(false, 'yjs 同步往返（无法加载客户端依赖）', err.message);
    return;
  }

  const url = 'ws://127.0.0.1:1234';
  // 文档名必须符合 kb-doc-<itemId> 命名空间；此 id 不存在时服务端按空文档处理
  const room = 'kb-doc-999999';
  const marker = `packaged-${Date.now()}`;
  const opts = { WebSocketPolyfill: WS, disableBc: true, connect: true };

  const docA = new Y.Doc();
  const docB = new Y.Doc();
  const providerA = new WebsocketProvider(url, room, docA, opts);
  const providerB = new WebsocketProvider(url, room, docB, opts);

  try {
    const syncedA = await waitUntil(() => providerA.synced, 15000);
    check(syncedA, '客户端 A 与 yjs 服务完成握手', syncedA ? undefined : '15s 内未 synced');

    docA.getText('content').insert(0, marker);
    const forwarded = await waitUntil(() => docB.getText('content').toString().includes(marker), 15000);
    check(
      forwarded,
      'A 的写入经 yjs 服务同步到 B',
      forwarded ? undefined : `B 内容="${docB.getText('content').toString().slice(0, 80)}"`,
    );

    docB.getText('content').insert(0, 'B-');
    const back = await waitUntil(() => docA.getText('content').toString().includes('B-'), 15000);
    check(back, 'B 的写入回传给 A', back ? undefined : `A 内容="${docA.getText('content').toString().slice(0, 80)}"`);
  } catch (err) {
    check(false, 'yjs 同步往返异常', err && err.message);
  } finally {
    for (const p of [providerA, providerB]) {
      try {
        p.destroy();
      } catch {
        /* 忽略 */
      }
    }
  }
}

/**
 * 动态验收：两段式启动。
 *
 * 为什么是两段 —— 首启会弹配置向导并**阻塞等待用户操作**，而
 * `status('就绪', 100)` 是在向导结束之后才打的。也就是说首启根本到不了「就绪」，
 * 只查「就绪」会把首启整条链路漏掉；只查中间态又验不到完整启动。
 * 所以：
 *   第一段（不跳过向导）：验「服务全起 + 向导页面能加载」（= 首启真实终态）
 *   第二段（预置跳过标记）：验一路走到「就绪 (100%)」+ 主界面打开
 *
 * 两段各用**独立的 userData 目录**：日志不会互相污染，
 * 而且每段都是干净的首启场景（PG 会重新 initdb）。
 */
async function dynamicChecks() {
  console.log('\n[6] 打包形态真实启动 · 首启（配置向导会弹出并等待用户操作）');
  // 每轮用一个全新的时间戳目录，而不是复用固定目录再清空：
  // 既天然保证「首次运行」场景，又完全避开「删除/改名已生成 pgdata 的目录」
  // 这条会被 safe-delete 护栏与安全软件句柄挡住的路（两者本机都实测踩过）。
  const firstDir = path.join(os.tmpdir(), `stravision-packaged-verify-${Date.now()}`);
  fs.mkdirSync(firstDir, { recursive: true });
  console.log(`  · userData  = ${firstDir}`);

  const first = launchApp(firstDir, { skipSetup: false });
  console.log(`  · pid       = ${first.child.pid}`);
  console.log('  · 等待启动完成（首次含 initdb，最长 5 分钟）…');

  const t0 = Date.now();
  const res = await waitForLogText(first.logDir, '正在准备 AI 助手', 300000, first.child);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  check(
    res.ok,
    `首启到达「正在准备 AI 助手」（${elapsed}s，= PG/MQTT/Next/WS/Yjs 全部就绪，仅剩用户配置）`,
    res.ok ? undefined : res.timeout ? '超时' : res.exited ? `进程提前退出 code=${res.code}` : '失败',
  );

  // 向导窗口是异步加载的，给它一点时间把页面渲染出来（失败会留下 ERR_FILE_NOT_FOUND）
  await sleep(4000);
  const text = readLogText(first.logDir);
  if (!res.ok) printLogTail(first, text);

  // 健康检查：证明 Next + PG 真的活着
  const health = await fetchHealth(3000);
  check(health.status === 200, '/api/health 返回 200', health.error || `status=${health.status}`);
  if (health.text) {
    let parsed = null;
    try {
      parsed = JSON.parse(health.text);
    } catch {
      /* 非 JSON 也算拿到响应 */
    }
    if (parsed) {
      const db = parsed.checks?.database?.status;
      check(db === 'ok', '健康检查数据库 ok', `database=${db}`);
      const mqtt = parsed.checks?.mqtt?.status;
      check(mqtt === 'ok', '健康检查 MQTT 连接 ok', `mqtt=${mqtt}`);
    }
  }

  // 向导窗口是否被正确加载。
  // ⚠️ 2026-10-07：向导已从 file://（ui/setup.html）改成 Next 路由 /desktop-setup
  //    （打包态走 http://127.0.0.1:<port>/desktop-setup）。所以 ERR_FILE_NOT_FOUND
  //    现在只可能来自 splash/activate；这条总检查保留，覆盖两类加载失败。
  check(!/ERR_FILE_NOT_FOUND|Failed to load URL/i.test(text), '配置向导页面加载无错误');
  check(crashedServices(text).length === 0, '无子服务异常退出', crashedServices(text).join(' | ').slice(0, 300) || undefined);

  console.log('\n[7] yjs 协作服务：打包形态下的真实同步往返');
  await yjsRoundTripCheck();

  console.log('\n[8] 首启进程清理（故意强杀，复刻用户崩溃现场）');
  releaseHandles(first);
  await killApp(first);
  console.log(`  · 日志目录  = ${first.logDir}`);

  // 🚨 这里**故意**只做 taskkill /T /F，不给应用优雅退出的机会。
  //    内嵌 postgres 是 detached 拉起的，不在 Electron 子进程树里：postmaster 直接
  //    消失后，它 fork 的子进程会继承监听套接字句柄继续存活，把 5433 吊住 ——
  //    这正是真实用户「任务管理器结束任务 / 崩溃 / 断电」之后的现场。
  //    产品必须能自己回收这个孤儿（desktop/lib/pg-guard.js），否则用户下次打不开应用。
  //    所以下面不是「等端口空出来」，而是**记录现场**，由第二段来证明回收能力。
  const pgPort = Number(process.env.EMBEDDED_PG_PORT) || 5433;
  const stillBusy = (await waitForPortFree(pgPort, 5000)) === false;
  console.log(
    stillBusy
      ? `  · 端口 ${pgPort} 仍被孤儿 postgres 占用（预期：强杀即如此，交给第二段验证回收）`
      : `  · 端口 ${pgPort} 已自然释放（未产生孤儿，第二段不做回收断言）`
  );

  console.log('\n[9] 二次启动 · 已跳过配置向导，应一路到达「就绪 (100%)」');
  const secondDir = path.join(os.tmpdir(), `stravision-packaged-verify-${Date.now()}-ready`);
  fs.mkdirSync(secondDir, { recursive: true });
  const second = launchApp(secondDir, { skipSetup: true });
  console.log(`  · userData  = ${secondDir}`);
  console.log(`  · pid       = ${second.child.pid}`);

  const t1 = Date.now();
  const res2 = await waitForLogText(second.logDir, '就绪 (100%)', 240000, second.child);
  const elapsed2 = ((Date.now() - t1) / 1000).toFixed(1);
  const text2 = readLogText(second.logDir);
  check(
    res2.ok,
    `到达「就绪 (100%)」（${elapsed2}s，= 主界面已打开）`,
    res2.ok ? undefined : res2.timeout ? '超时' : res2.exited ? `进程提前退出 code=${res2.code}` : '失败',
  );
  if (!res2.ok) printLogTail(second, text2);
  check(crashedServices(text2).length === 0, '二次启动无子服务异常退出', crashedServices(text2).join(' | ').slice(0, 300) || undefined);

  // 崩溃现场回归：上一段如果留下了孤儿 postgres，第二段必须靠自己把端口收回来
  // （desktop/lib/pg-guard.js）。这条断言直接对应真实故障：
  // 「强杀/崩溃后，用户下次打不开应用，只能重启电脑」。
  if (stillBusy) {
    const reclaimed = /已回收上次异常退出遗留/.test(text2);
    check(
      reclaimed,
      '崩溃遗留的数据库进程被自动回收（用户无需重启电脑）',
      reclaimed ? undefined : '日志中没有回收记录 —— 端口守卫未生效，或 PG 没走到 start()',
    );
  }

  releaseHandles(second);
  await killApp(second);
  console.log(`  · 日志目录  = ${second.logDir}`);

  // 验收会在产物副本里留下目录联接与 __bundled__ 备份，还原以保证产物可反复验收
  restoreAppServerWritableDirs();

  // 收尾：第二段也是被强杀的，同样会留下孤儿 postgres 占着端口。
  // 用产品自己的守卫清掉（顺便再验一次守卫在打包形态下可用），让本机保持干净 ——
  // 否则下一次验收的起点就是「端口已被占用」，容易把噪音当成 bug。
  const pgGuard = nodeRequire('./lib/pg-guard.js');
  const pgPkgName =
    process.platform === 'win32' ? 'windows-x64' : process.platform === 'darwin' ? 'darwin-x64' : 'linux-x64';
  const packBinDir = path.join(
    APP_OUT,
    'resources',
    'app.asar.unpacked',
    'node_modules',
    '@embedded-postgres',
    pgPkgName,
    'native',
    'bin'
  );
  const cleanup = await pgGuard.reclaimOwnPostgres({
    port: pgPort,
    pgDataDir: path.join(secondDir, 'server-data', 'pgdata'),
    binDir: packBinDir,
    log: (m) => console.log(`  · ${m}`),
  });
  console.log(`  · 收尾端口回收: ${cleanup.status}`);
  const cleanupOk = cleanup.status === 'free' || cleanup.status === 'reclaimed';
  check(
    cleanupOk,
    `验收收尾后端口 ${pgPort} 已交还（不留孤儿给下次）`,
    cleanupOk ? undefined : `status=${cleanup.status}${cleanup.error ? ` ${cleanup.error}` : ''}`,
  );
}


/* ---------------- 主流程 ---------------- */

console.log('桌面端打包产物验证');
console.log(`产物目录: ${path.relative(ROOT, APP_OUT)}`);

if (!fs.existsSync(APP_OUT)) {
  console.error(`\n未找到打包产物。请先执行：pnpm desktop:pack:win --dir`);
  process.exit(1);
}

await staticChecks();
if (RUN) {
  await dynamicChecks();
}

console.log(`\n结果：${failures === 0 ? '全部通过 ✅' : `${failures} 项失败 ❌`}`);
process.exit(failures === 0 ? 0 : 1);
