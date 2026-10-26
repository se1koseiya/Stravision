'use strict';

/**
 * 桌面端授权（license）模块。
 *
 * 三段式设计：
 *   1. 设备指纹 —— 稳定标识本机，首次激活时上报，服务端据此绑定"一码一机"；
 *   2. 签名租约 —— 服务端用 Ed25519 私钥签发（见 lib/desktop-license-lease.ts），
 *      本模块用**内置公钥**验签。这是断网时仍能可信判定授权状态的基础：
 *      用户改本地 JSON 或自建假服务器都无法伪造有效租约。
 *   3. 离线宽限 —— 联网校验失败时，凭租约 + lastOnlineOkAt 在宽限期内继续可用，
 *      避免"客户机房断网就用不了"。超出宽限期则要求联网。
 *
 * 本地存储：<userData>/server-data/desktop-license.json（权限 0600）
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const logger = require('./logger');
const { getDataRoot, isDev } = require('./config');

/**
 * 授权服务地址：桌面端只认这一条 HTTPS 端点。
 * 开发模式可用 STRAVISION_LICENSE_SERVER 指向本地服务端联调。
 */
const DEFAULT_SERVER = 'https://stravision.site';
/** 离线宽限天数：联网校验失败时允许继续使用的天数 */
const GRACE_DAYS = 7;
/** 联网请求超时（毫秒） */
const REQUEST_TIMEOUT = 12000;
/** 吊销清单默认复检周期（天）；租约里带 rk 时以租约为准 */
const RECHECK_DAYS = 30;
/** 运行期吊销复检间隔（毫秒）：不重启也能在 6 小时内收到作废 */
const RECHECK_INTERVAL = 6 * 60 * 60 * 1000;
/**
 * 内置的吊销清单地址（可由 `pnpm desktop:license:keys` 同目录的 license-config.js 覆盖）。
 *
 * 🚨 留空 = 不检查。只有租约里带 `rl` 时才联网拉取，
 *    这样改造前签发的纯离线串行为完全不变（向后兼容）。
 *    地址不必指向我们自己的服务器 —— Gitee/GitHub raw、Pages、COS、R2 等静态托管都可以，
 *    托管方只提供文件，清单本身由私钥签名，伪造/篡改都会被验签拦下。
 */
const DEFAULT_REVOCATION_URL = '';
const DAY = 24 * 60 * 60 * 1000;

const LICENSE_FILE = 'desktop-license.json';

/* ------------------------------------------------------------------ */
/* 内置公钥                                                            */
/* ------------------------------------------------------------------ */

/**
 * 🚨 打包版本一律忽略环境变量覆盖。
 *
 * 否则 `STRAVISION_LICENSE_SERVER=http://127.0.0.1:3000` +
 * `STRAVISION_LICENSE_PUBLIC_KEY=<本机自动生成的公钥>` 两行环境变量，
 * 就是一个现成的授权绕过开关（本机服务端会自己生成密钥对）。
 * 调试开关只能存在于开发模式。
 */
function allowEnvOverride() {
  return isDev;
}

/**
 * 打包时由 scripts/desktop/generate-license-keys.mjs 生成 desktop/lib/license-public-key.js，
 * 内容为服务端签名公钥（base64 SPKI DER）。此处兜底为空字符串。
 */
function loadBuiltinPublicKey() {
  if (allowEnvOverride()) {
    const fromEnv = String(process.env.STRAVISION_LICENSE_PUBLIC_KEY || '').trim();
    if (fromEnv) return fromEnv;
  }
  try {
    // eslint-disable-next-line global-require
    const mod = require('./license-public-key');
    const key = String(mod?.publicKey || '').trim();
    if (!key) return '';
    // 防"直接把公钥换成自己的"：指纹对不上就当没配置，客户端会以 misconfigured 拒绝放行，
    // 而不是静默接受一个来路不明的公钥。
    const expect = String(mod?.fingerprint || '').trim();
    if (expect) {
      const actual = crypto.createHash('sha256').update(key).digest('hex');
      if (actual !== expect.toLowerCase()) {
        logger.warn('license', '内置授权公钥与其指纹不匹配，疑似被篡改');
        return '';
      }
    }
    return key;
  } catch {
    return '';
  }
}

/* ------------------------------------------------------------------ */
/* 设备指纹                                                            */
/* ------------------------------------------------------------------ */

/** 平台原生机器标识（重装应用不变，重装系统会变） */
function rawMachineId() {
  try {
    if (process.platform === 'win32') {
      const out = execFileSync(
        'reg',
        ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'],
        { encoding: 'utf8', timeout: 3000, windowsHide: true }
      );
      const m = /MachineGuid\s+REG_SZ\s+([0-9a-fA-F-]+)/.exec(out);
      if (m) return m[1];
    } else if (process.platform === 'darwin') {
      const out = execFileSync('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'], {
        encoding: 'utf8',
        timeout: 3000,
      });
      const m = /"IOPlatformUUID"\s*=\s*"([^"]+)"/.exec(out);
      if (m) return m[1];
    } else {
      for (const p of ['/etc/machine-id', '/var/lib/dbus/machine-id']) {
        try {
          const v = fs.readFileSync(p, 'utf8').trim();
          if (v) return v;
        } catch {
          /* 换下一个候选路径 */
        }
      }
    }
  } catch {
    /* 取不到就走回退，不阻断 */
  }
  return '';
}

let cachedDeviceId = null;

/**
 * 设备指纹 = sha256(机器标识 | 主机名 | 平台 | 架构)。
 *
 * 不掺 MAC 地址：换网卡/插拔扩展坞太常见，掺进去会让正常用户突然"掉授权"。
 * 机器标识为主，主机名兜住"机器标识被镜像克隆成同一个"的场景。
 */
function getDeviceId() {
  if (cachedDeviceId) return cachedDeviceId;
  const parts = [
    rawMachineId() || 'no-machine-id',
    os.hostname() || 'no-hostname',
    process.platform,
    process.arch,
  ];
  cachedDeviceId = crypto.createHash('sha256').update(parts.join('|')).digest('hex');
  return cachedDeviceId;
}

/** 设备展示名（后台列表里认得出是哪台机器） */
function getDeviceName() {
  const host = os.hostname() || 'unknown';
  return `${host} (${os.type()} ${os.release()})`;
}

/* ------------------------------------------------------------------ */
/* 本地存储                                                            */
/* ------------------------------------------------------------------ */

function filePath() {
  return path.join(getDataRoot(), LICENSE_FILE);
}

/** 读取本地授权记录；损坏或不存在返回 null */
function read() {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath(), 'utf8'));
    if (!raw || typeof raw !== 'object' || !raw.code) return null;
    return {
      code: String(raw.code),
      deviceId: String(raw.deviceId || ''),
      lease: String(raw.lease || ''),
      label: String(raw.label || ''),
      serverUrl: String(raw.serverUrl || DEFAULT_SERVER),
      activatedAt: Number(raw.activatedAt || 0),
      lastOnlineOkAt: Number(raw.lastOnlineOkAt || 0),
      // 离线授权串导入的凭据：不联网、跳过心跳、不受宽限约束（只看到期日）
      offline: raw.offline === true,
      // 吊销清单复检状态：0 = 从未成功复检过
      lastRevocationCheckAt: Number(raw.lastRevocationCheckAt || 0),
      // 命中吊销清单的时间戳；>0 即永久锁死（只有重新导入新串才会清零）
      revokedAt: Number(raw.revokedAt || 0),
      // 已见过的最新清单时间，用于拒绝"回滚到旧清单"
      revocationListTime: Number(raw.revocationListTime || 0),
    };
  } catch {
    return null;
  }
}

function write(record) {
  const file = filePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(record, null, 2), { mode: 0o600 });
}

function clear() {
  try {
    fs.unlinkSync(filePath());
  } catch {
    /* 不存在即视为已清除 */
  }
}

/* ------------------------------------------------------------------ */
/* 租约验签（与 lib/desktop-license-lease.ts 为同一格式）                 */
/* ------------------------------------------------------------------ */

function base64UrlToBuffer(s) {
  const normalized = String(s).replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64');
}

/**
 * 校验租约的签名与内容。
 * @returns {{ v:number, code:string, dev:string, exp:number, iat:number, gd:number, lbl:string } | null}
 */
function verifyLease(lease, publicKeyBase64) {
  const key = publicKeyBase64 || loadBuiltinPublicKey();
  if (!key) return null;
  const parts = String(lease || '').split('.');
  if (parts.length !== 2) return null;

  try {
    const ok = crypto.verify(
      null,
      Buffer.from(parts[0], 'utf8'),
      crypto.createPublicKey({
        key: Buffer.from(key, 'base64'),
        format: 'der',
        type: 'spki',
      }),
      base64UrlToBuffer(parts[1])
    );
    if (!ok) return null;

    const payload = JSON.parse(base64UrlToBuffer(parts[0]).toString('utf8'));
    if (!payload || payload.v !== 1 || typeof payload.code !== 'string') return null;
    const gd = Number(payload.gd);
    return {
      v: payload.v,
      code: payload.code,
      dev: String(payload.dev || ''),
      exp: Number(payload.exp || 0),
      iat: Number(payload.iat || 0),
      // gd 缺省按 GRACE_DAYS：老租约不带 gd，行为与改造前一致
      gd: Number.isFinite(gd) && gd > 0 ? gd : GRACE_DAYS,
      lbl: String(payload.lbl || ''),
      // rl 缺省为空 = 不做吊销复检（老租约行为不变）；rk 缺省 30 天
      rl: typeof payload.rl === 'string' ? payload.rl : '',
      rk: Number.isFinite(Number(payload.rk)) && Number(payload.rk) > 0 ? Number(payload.rk) : RECHECK_DAYS,
    };
  } catch (err) {
    logger.warn('license', `租约验签异常：${err.message}`);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* 联网请求                                                            */
/* ------------------------------------------------------------------ */

function serverUrl() {
  const override = allowEnvOverride() ? process.env.STRAVISION_LICENSE_SERVER : '';
  return String(override || DEFAULT_SERVER).replace(/\/+$/, '');
}

/**
 * POST JSON 到授权服务。
 * @returns {Promise<{ ok:boolean, status:number, data:any }>}
 */
async function postJson(endpoint, payload) {
  const url = `${serverUrl()}${endpoint}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* 对外：激活 / 心跳 / 评估                                             */
/* ------------------------------------------------------------------ */

/**
 * 联网激活：校验码 → 换取租约 → 落盘。
 * @param {string} code 用户输入的授权码
 */
async function activate(code) {
  const deviceId = getDeviceId();
  const res = await postJson('/api/license/activate', {
    code: String(code || '').trim(),
    deviceId,
    deviceName: getDeviceName(),
    platform: process.platform,
    appVersion: require('electron').app.getVersion(),
  });

  const body = res.data || {};
  if (!res.ok || !body.ok) {
    return { ok: false, error: body.error || `激活失败（HTTP ${res.status}）` };
  }

  const payload = verifyLease(body.lease);
  if (!payload) {
    return { ok: false, error: '服务端返回的授权凭据无法验证，请联系管理员' };
  }
  if (payload.dev !== deviceId) {
    return { ok: false, error: '授权凭据与本机不匹配，请重新激活' };
  }

  const now = Date.now();
  write({
    code: payload.code,
    deviceId,
    lease: String(body.lease),
    label: String(body.license?.label || payload.lbl || ''),
    serverUrl: serverUrl(),
    activatedAt: now,
    lastOnlineOkAt: now,
    offline: false,
  });
  logger.info('license', `激活成功 code=${payload.code} device=${deviceId.slice(0, 12)}`);
  return { ok: true, status: 'active' };
}

/**
 * 离线导入：管理员用私钥签发的授权串，本机验签后直接落盘。
 *
 * 与 activate() 的区别（关键）：
 *   - **不发任何网络请求** —— 服务器停机 / 到期 / 域名失效都不影响；
 *   - **跳过心跳** —— 该码不在服务端库里，联网心跳会拿到 404 并被误判为"已失效"，
 *     所以本地标记 offline=true，heartbeat() 见到即直接跳过；
 *   - **不受离线宽限约束** —— lastOnlineOkAt 记 0，宽限判定整体跳过，
 *     有效期只由租约里的 exp 决定（exp=0 即永久）。
 *
 * @param {string} blob 离线授权串（即租约本身：`<base64url payload>.<base64url 签名>`）
 */
function activateOffline(blob) {
  const lease = String(blob || '').trim();
  if (!lease) return { ok: false, error: '请粘贴管理员提供的离线授权串' };

  const payload = verifyLease(lease);
  if (!payload) {
    return { ok: false, error: '离线授权串无效或已损坏，请向管理员重新索取' };
  }

  const deviceId = getDeviceId();
  if (payload.dev !== deviceId) {
    return { ok: false, error: '该离线授权是签发给其它设备的，请把本机指纹提供给管理员重新签发' };
  }

  const now = Date.now();
  if (payload.exp > 0 && now > payload.exp) {
    return { ok: false, error: '离线授权已到期，请联系管理员重新签发' };
  }

  write({
    code: payload.code,
    deviceId,
    lease,
    label: payload.lbl || '',
    serverUrl: DEFAULT_SERVER,
    activatedAt: now,
    lastOnlineOkAt: 0, // 0 = 不做离线宽限判定
    offline: true,
  });
  logger.info('license', `离线授权导入成功 code=${payload.code} device=${deviceId.slice(0, 12)}`);
  return { ok: true, status: 'active', offline: true, code: payload.code, label: payload.lbl || '' };
}

/**
 * 心跳：向服务端确认授权仍有效并换发新租约。
 *
 * 失败分两类，调用方处理方式完全不同：
 *   - offline=true（网络不可达 / 超时）→ 走离线宽限，不清本地授权；
 *   - fatal=true（服务端 403/404：被停用、已过期、被解绑）→ 确定性失效，本地授权应作废。
 *   其余（429 / 5xx）视为临时故障，既不宽限也不作废。
 */
async function heartbeat() {
  const record = read();
  if (!record) return { ok: false, offline: false, fatal: false, error: '尚未激活' };
  // 离线授权串：该码不在服务端库里，联网心跳只会拿到 404 并被判为"授权不存在"，
  // 那会把离线导入的授权误删。这类凭据的设计前提就是"永不需要联网"，直接跳过。
  if (record.offline) {
    return { ok: true, offline: true, fatal: false, skipped: true };
  }

  let res;
  try {
    res = await postJson('/api/license/heartbeat', {
      code: record.code,
      deviceId: getDeviceId(),
      appVersion: require('electron').app.getVersion(),
    });
  } catch (err) {
    logger.warn('license', `心跳失败（网络不可达）：${err.message}`);
    return { ok: false, offline: true, fatal: false, error: '网络不可达' };
  }

  const body = res.data || {};
  if (!res.ok || !body.ok) {
    const fatal = res.status === 403 || res.status === 404;
    logger.warn('license', `心跳被拒绝（HTTP ${res.status}）：${body.error || ''}`);
    return {
      ok: false,
      offline: false,
      fatal,
      error: body.error || `校验失败（HTTP ${res.status}）`,
    };
  }

  const payload = verifyLease(body.lease);
  if (!payload) return { ok: false, offline: false, fatal: false, error: '授权凭据校验失败' };

  write({
    ...record,
    code: payload.code,
    lease: String(body.lease),
    label: String(body.license?.label || record.label || payload.lbl || ''),
    lastOnlineOkAt: Date.now(),
    offline: false,
  });
  logger.info('license', `心跳通过，到期时间 ${payload.exp ? new Date(payload.exp).toISOString() : '永久'}`);
  return { ok: true, offline: false, fatal: false };
}

/* ------------------------------------------------------------------ */
/* 吊销清单（拉取式吊销 —— 没有自己的服务器也能作废已发出的码）            */
/* ------------------------------------------------------------------ */

/** 内置清单地址（打包后可被 license-config.js 覆盖；留空 = 只有租约带 rl 才检查） */
function defaultRevocationUrl() {
  try {
    // eslint-disable-next-line global-require
    const mod = require('./license-config');
    const fromFile = String(mod?.revocationUrl || '').trim();
    if (fromFile) return fromFile;
  } catch {
    /* 没有配置文件就用内置常量 */
  }
  return DEFAULT_REVOCATION_URL;
}

/** 该租约实际使用的清单地址；空串 = 不检查 */
function revocationUrlFor(payload) {
  return String(payload?.rl || '').trim() || defaultRevocationUrl();
}

async function getText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    return { ok: res.ok, status: res.status, text: res.ok ? await res.text() : '' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 验签吊销清单。
 *
 * 与租约同一套 Ed25519 公钥 —— 托管方（哪怕被入侵）也造不出能通过的清单，
 * 最多只能**把旧清单再发一遍**（回滚攻击），这个由调用方比对 `t` 时间戳拦下。
 *
 * @returns {{ v:number, t:number, revoked:string[] } | null}
 */
function verifyRevocationList(blob, publicKeyBase64) {
  const key = publicKeyBase64 || loadBuiltinPublicKey();
  if (!key) return null;
  const parts = String(blob || '').trim().split('.');
  if (parts.length !== 2) return null;
  try {
    const ok = crypto.verify(
      null,
      Buffer.from(parts[0], 'utf8'),
      crypto.createPublicKey({ key: Buffer.from(key, 'base64'), format: 'der', type: 'spki' }),
      base64UrlToBuffer(parts[1])
    );
    if (!ok) return null;
    const payload = JSON.parse(base64UrlToBuffer(parts[0]).toString('utf8'));
    if (!payload || payload.v !== 1 || !Array.isArray(payload.revoked)) return null;
    return { v: 1, t: Number(payload.t || 0), revoked: payload.revoked.map((c) => String(c).toUpperCase()) };
  } catch (err) {
    logger.warn('license', `吊销清单解析异常：${err.message}`);
    return null;
  }
}

/**
 * 拉一次吊销清单并落盘结果（唯一会联网的地方之一）。
 *
 * 三种结果：
 *   - `hit: true`  → 本机授权码在清单里，写 revokedAt，evaluate 会永久判 revoked；
 *   - `offline: true` → 拉不到（断网 / 托管挂了），**什么都不做**，交给 overdue 窗口兜底；
 *   - `skipped: true` → 该码没配 rl，是纯离线串，永不联网（向后兼容）。
 *
 * @returns {Promise<{ ok:boolean, hit?:boolean, offline?:boolean, skipped?:boolean, error?:string }>}
 */
async function checkRevocation() {
  const record = read();
  if (!record) return { ok: false, skipped: true, error: '尚未激活' };

  const payload = verifyLease(record.lease);
  if (!payload) return { ok: false, error: '本地授权信息已损坏' };

  const url = revocationUrlFor(payload);
  if (!url) return { ok: true, skipped: true };

  let res;
  try {
    res = await getText(url);
  } catch (err) {
    logger.warn('license', `吊销清单拉取失败（网络不可达）：${err.message}`);
    return { ok: false, offline: true, error: '网络不可达' };
  }
  if (!res.ok) {
    logger.warn('license', `吊销清单拉取失败（HTTP ${res.status}）`);
    return { ok: false, offline: true, error: `HTTP ${res.status}` };
  }

  const list = verifyRevocationList(res.text);
  if (!list) {
    // 清单被改坏或被替换成未签名内容：不予采信，也不锁死用户（宁可放过也不误杀）
    logger.warn('license', '吊销清单验签失败，已忽略本次结果');
    return { ok: false, error: '清单签名无效' };
  }
  // 防回滚：清单时间比本地已见过的还旧 → 拒绝采信
  if (record.revocationListTime && list.t < record.revocationListTime) {
    logger.warn('license', '吊销清单时间戳回退，疑似回滚攻击，已忽略');
    return { ok: false, error: '清单时间戳回退' };
  }

  const hit = list.revoked.includes(String(record.code || '').toUpperCase());
  write({
    ...record,
    lastRevocationCheckAt: Date.now(),
    revocationListTime: Math.max(record.revocationListTime || 0, list.t || 0),
    revokedAt: hit ? Date.now() : 0,
  });
  logger.info('license', `吊销清单已核对（${list.revoked.length} 条）hit=${hit}`);
  return { ok: true, hit };
}

/**
 * 综合评估本地授权状态（不发网络请求）。
 *
 * @returns {{
 *   ok: boolean, status: string, message: string,
 *   code?: string, label?: string, expiresAt?: number|null,
 *   daysLeft?: number|null, graceUntil?: number|null, graceDaysLeft?: number|null
 * }}
 */
function evaluate() {
  const record = read();
  if (!record) {
    return { ok: false, status: 'none', message: '本机尚未激活' };
  }

  const publicKey = loadBuiltinPublicKey();
  if (!publicKey) {
    // 打包时漏注入公钥属于构建事故：宁可显式报错，也不要静默放行
    const { app } = require('electron');
    if (app.isPackaged) {
      return { ok: false, status: 'misconfigured', message: '客户端缺少授权公钥，请重新安装正式版本' };
    }
    logger.warn('license', '未配置授权公钥（开发模式）：跳过验签');
    return {
      ok: true,
      status: 'dev-bypass',
      message: '开发模式：未配置公钥，未校验证书签名',
      code: record.code,
      expiresAt: null,
      daysLeft: null,
    };
  }

  const payload = verifyLease(record.lease);
  if (!payload) {
    return { ok: false, status: 'invalid', message: '本地授权信息已损坏或不可信，请重新激活' };
  }
  if (payload.dev !== getDeviceId()) {
    // 直接拷贝别人的本地文件（或换了机器）会命中这里
    return { ok: false, status: 'device-mismatch', message: '授权与本机不匹配，请重新激活' };
  }

  const now = Date.now();

  // 已被吊销清单点名：永久锁死，只有重新导入新串（write 时 revokedAt 归零）才解
  if (record.revokedAt > 0) {
    return {
      ok: false,
      status: 'revoked',
      message: '该授权已被管理员作废，请联系管理员重新签发',
      code: payload.code,
      label: record.label || payload.lbl || '',
      revokedAt: record.revokedAt,
    };
  }
  const expiresAt = payload.exp > 0 ? payload.exp : null;
  const daysLeft = expiresAt == null ? null : Math.ceil((expiresAt - now) / 86400000);
  // 宽限天数来自**已验签的租约**（管理员按码设置，客户端改不了）。
  // 离线授权串（record.offline）不做宽限判定：lastOnlineOkAt 记 0，graceUntil 直接为 null，
  // 有效期只由 exp 决定 —— 这样服务器停机也不会影响它。
  const graceDays = record.offline ? null : payload.gd > 0 ? payload.gd : GRACE_DAYS;
  const graceUntil =
    record.offline || !record.lastOnlineOkAt ? null : record.lastOnlineOkAt + graceDays * 86400000;
  const graceDaysLeft = graceUntil == null ? null : Math.ceil((graceUntil - now) / 86400000);
  // 吊销复检窗口：配了 rl 才启用。rk 天没复检 = 待复检（仍可用）；
  // 再宽限 gd 天仍未复检成功 = 判定锁死（客户既然要用 AI 就必须联网，这个要求合理）
  const listUrl = revocationUrlFor(payload);
  const intervalDays = payload.rk;
  let revalidation = null;
  if (listUrl) {
    const anchor = record.lastRevocationCheckAt || record.activatedAt || 0;
    const overdueAfter = (intervalDays + (graceDays || GRACE_DAYS)) * DAY;
    revalidation = {
      listUrl,
      intervalDays,
      lastCheckAt: record.lastRevocationCheckAt || 0,
      required: now - anchor > intervalDays * DAY,
      overdue: now - anchor > overdueAfter,
      overdueAfterDays: intervalDays + (graceDays || GRACE_DAYS),
    };
  }

  const base = {
    code: payload.code,
    label: record.label || payload.lbl || '',
    offline: !!record.offline,
    graceDays,
    expiresAt,
    daysLeft,
    graceUntil,
    graceDaysLeft,
    revalidation,
  };

  if (expiresAt != null && now > expiresAt) {
    return { ok: false, status: 'expired', message: '授权已到期，请联系管理员续期', ...base };
  }
  if (graceUntil != null && now > graceUntil) {
    return {
      ok: false,
      status: 'need-online',
      message: `已超过 ${graceDays} 天未联网校验，请联网后重启应用`,
      ...base,
    };
  }
  if (revalidation?.overdue) {
    return {
      ok: false,
      status: 'revocation-overdue',
      message: `已超过 ${revalidation.overdueAfterDays} 天未核对授权状态，请联网后重启应用`,
      ...base,
    };
  }
  return { ok: true, status: 'active', message: '授权有效', ...base };
}

module.exports = {
  GRACE_DAYS,
  RECHECK_DAYS,
  RECHECK_INTERVAL,
  DEFAULT_SERVER,
  LICENSE_FILE,
  getDeviceId,
  getDeviceName,
  verifyLease,
  verifyRevocationList,
  defaultRevocationUrl,
  serverUrl,
  read,
  write,
  clear,
  activate,
  activateOffline,
  heartbeat,
  checkRevocation,
  evaluate,
  filePath,
};
