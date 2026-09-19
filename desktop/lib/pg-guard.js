'use strict';

/**
 * 内嵌 PostgreSQL 的端口守卫。
 *
 * 【背景：一次真实的卡死事故】
 *   `postgres` 是我们以 detached 方式拉起的，不在 Electron 的子进程树里。
 *   正常退出时 desktop/lib/postgres.js 会走 pg.stop() 收尾，所以平时没问题。
 *   但只要应用被**强杀**（任务管理器「结束任务」、`taskkill /F`、崩溃、断电），
 *   postmaster 会直接消失，而它 fork 出来的子进程会**继承监听套接字句柄**继续活着：
 *   端口 5433 就这样被一个「父进程已不存在」的孤儿吊住。
 *
 *   （实测特征：`Get-NetTCPConnection -LocalPort 5433` 报的 OwningProcess 是一个
 *    已经查不到的 PID —— 那是原 postmaster 的 PID，句柄被孤儿子进程持有，
 *    所以**按端口查 PID 是查不出真凶的**，只能按进程镜像/命令行路径反查。）
 *
 *   下一次启动时 PG 绑不上端口，bootstrap 第 4 步（postgres.start）抛
 *   "could not bind IPv4 address ...: Only one usage of each socket address"，
 *   应用永久停在「正在初始化本地数据库…」，用户只能手动杀进程或重启电脑。
 *
 * 【本模块做的事】在启动 PG 之前先回收端口：
 *   1) 端口空闲          → 什么都不做；
 *   2) 被占用且占用者确实是**本应用随包携带**的 postgres（按捆绑二进制路径匹配，
 *      因此绝不会误伤用户自己安装的 PostgreSQL，比如 C:\Program Files\PostgreSQL\18）
 *                       → 先 pg_ctl stop -m fast 优雅停，再强制结束，等端口释放；
 *   3) 被占用但不是我们的 → 返回 occupied-by-others，由调用方给出可读错误。
 *
 * 匹配依据只用「命令行里是否出现本应用捆绑的 postgres 可执行文件路径」，
 * 不依赖端口→PID 反查（上面解释了为什么不可靠），也不依赖进程名（postgres.exe 重名）。
 */

const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawnSync } = require('node:child_process');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 随包平台包的候选名（按当前 platform/arch 优先） */
function platformPackageCandidates() {
  const arch = process.arch === 'arm64' ? 'arm64' : process.arch === 'arm' ? 'arm' : 'x64';
  if (process.platform === 'win32') return [`windows-${arch}`, 'windows-x64'];
  if (process.platform === 'darwin') return [`darwin-${arch}`, 'darwin-x64'];
  return [`linux-${arch}`, 'linux-x64'];
}

/**
 * 解析「本应用随包携带的」postgres 二进制目录，返回**真实磁盘路径**。
 *
 * ⚠️ 打包后 __dirname 在 app.asar 虚拟文件系统里，而 electron-builder 的
 * asarUnpack 会把二进制解到 app.asar.unpacked。两者必须显式区分：
 * 我们这里是拿它去和「其他进程的命令行」做字符串比较，必须是真实路径，
 * 否则永远匹配不到（asar 内路径不会出现在别的进程命令行里）。
 */
function resolveBinDir() {
  const pkgRoot = path.resolve(__dirname, '..'); // 打包时 = <...>/resources/app.asar
  const diskRoot = pkgRoot.replace(/app\.asar(?=[\\/]|$)/, 'app.asar.unpacked');
  const exeName = process.platform === 'win32' ? 'postgres.exe' : 'postgres';
  for (const name of platformPackageCandidates()) {
    const binDir = path.join(diskRoot, 'node_modules', '@embedded-postgres', name, 'native', 'bin');
    if (fs.existsSync(path.join(binDir, exeName))) return binDir;
  }
  return null;
}

/**
 * 用真实 TCP 连接判断端口是否被监听。
 * 不用 netstat/进程表：能连上才算「被占用」，这是唯一不会骗人的判据。
 */
function probePort(port, host = '127.0.0.1', timeoutMs = 700) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    const done = (open) => {
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

/** 进程是否还活着（signal 0 只做存在性检查，不真的发信号） */
function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * 列出「以本应用捆绑二进制启动的」postgres / pg_ctl 进程 PID。
 *
 * @returns {{ pids: number[], error?: string }}
 */
function listOwnPostgresPids(binDir) {
  const exeName = process.platform === 'win32' ? 'postgres.exe' : 'postgres';
  const needle = path.join(binDir, exeName);

  if (process.platform === 'win32') {
    // 命令行里路径的斜杠方向不固定（实测 detached 子进程用的是正斜杠），
    // 所以两种形态都送进去比一次；不做 -replace 以免多层转义出错。
    const script = [
      "$fwd = $env:STRAVISION_PG_BIN_FWD",
      "$bak = $env:STRAVISION_PG_BIN_BAK",
      "Get-CimInstance Win32_Process -Filter \"Name='postgres.exe' or Name='pg_ctl.exe'\" |",
      "  Where-Object { $c = $_.CommandLine; if ($c) { $l = $c.ToLower(); $l.Contains($fwd) -or $l.Contains($bak) } } |",
      '  ForEach-Object { $_.ProcessId }',
    ].join('\n');
    const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
      env: {
        ...process.env,
        STRAVISION_PG_BIN_FWD: needle.replace(/\\/g, '/').toLowerCase(),
        STRAVISION_PG_BIN_BAK: needle.toLowerCase(),
      },
      encoding: 'utf8',
      timeout: 20000,
      windowsHide: true,
    });
    if (r.error) return { pids: [], error: r.error.message };
    if (r.status !== 0) return { pids: [], error: (r.stderr || '').trim() || `exit=${r.status}` };
    const pids = String(r.stdout || '')
      .split(/\r?\n/)
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    return { pids };
  }

  // POSIX：ps 拿完整命令行逐条比对
  const r = spawnSync('ps', ['-eo', 'pid=,args='], { encoding: 'utf8', timeout: 20000 });
  if (r.error) return { pids: [], error: r.error.message };
  const pids = [];
  for (const line of String(r.stdout || '').split(/\r?\n/)) {
    const m = /^\s*(\d+)\s+(.*)$/.exec(line);
    if (!m) continue;
    if (m[2].includes(needle)) pids.push(Number(m[1]));
  }
  return { pids };
}

/** 优雅停止（尽力而为）：postmaster 还活着时才有意义，孤儿场景下会直接失败，忽略即可 */
function tryGracefulStop(binDir, pgDataDir) {
  const pgCtl = path.join(binDir, process.platform === 'win32' ? 'pg_ctl.exe' : 'pg_ctl');
  if (!fs.existsSync(pgCtl) || !fs.existsSync(path.join(pgDataDir, 'postmaster.pid'))) return false;
  const r = spawnSync(pgCtl, ['-D', pgDataDir, 'stop', '-m', 'fast', '-w', '-t', '10'], {
    cwd: binDir,
    stdio: 'ignore',
    timeout: 20000,
    windowsHide: true,
    // pg_ctl 需要同目录下的 dll，cwd 之外再补一次 PATH
    env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH || ''}` },
  });
  return r.status === 0;
}

function forceKill(pids) {
  for (const pid of pids) {
    try {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
      } else {
        process.kill(pid, 'SIGKILL');
      }
    } catch {
      /* 已退出 */
    }
  }
}

/**
 * 确保端口可用。
 *
 * @param {object} opts
 * @param {number} opts.port            内嵌 PG 端口
 * @param {string} opts.pgDataDir       数据目录（用于优雅停止）
 * @param {string} [opts.binDir]        捆绑二进制目录，默认自动解析
 * @param {(msg: string) => void} [opts.log]
 * @returns {Promise<{status: 'free'|'reclaimed'|'occupied-by-others'|'still-busy', pids?: number[], error?: string}>}
 */
async function reclaimOwnPostgres({ port, pgDataDir, binDir, log = () => {} }) {
  if (!(await probePort(port))) return { status: 'free' };

  const bin = binDir || resolveBinDir();
  if (!bin) {
    return { status: 'occupied-by-others', error: '无法定位本应用的内嵌数据库二进制目录' };
  }

  log(`端口 ${port} 被占用，检查是否为上次异常退出遗留的内嵌数据库…`);
  const { pids, error } = listOwnPostgresPids(bin);
  if (error) log(`枚举遗留进程失败（将按端口冲突处理）: ${error}`);
  if (!pids.length) return { status: 'occupied-by-others', error };

  log(`发现本应用遗留的数据库进程 ${pids.join(', ')}，先尝试优雅停止…`);
  try {
    tryGracefulStop(bin, pgDataDir);
  } catch {
    /* 尽力而为 */
  }

  const left = pids.filter(pidAlive);
  if (left.length) {
    log(`优雅停止未生效，强制结束 ${left.join(', ')}`);
    forceKill(left);
  }

  // 监听句柄要等**所有**持有者退出才释放，留够时间并持续探测
  for (let i = 0; i < 30; i++) {
    if (!(await probePort(port))) return { status: 'reclaimed', pids };
    await sleep(500);
  }
  return { status: 'still-busy', pids };
}

module.exports = {
  probePort,
  resolveBinDir,
  listOwnPostgresPids,
  reclaimOwnPostgres,
};
