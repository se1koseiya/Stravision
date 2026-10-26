#!/usr/bin/env node
/**
 * 本地授权码「台账」（vault）—— 离线授权体系的控制中枢。
 *
 * 为什么需要它：
 *   离线授权串签出去就离开了服务端，服务器库里没有它。
 *   如果本机也不记账，过两周你就不知道「签过几个、给了谁、哪个快到期」。
 *   这个模块把台账落在 `data/desktop-license-vault.json`（0600，仅本人可读），
 *   让签发 / 查询 / 续期 / 作废 / 导出全部在你自己电脑上闭环。
 *
 * 边界（必须写在前面，免得误以为它能远程吊销）：
 *   ❌ 台账里的「作废」只是一条本地备注 —— 客户端永不联网，收不到它，
 *      客户机上那个串会一直用到 exp 到期为止。
 *   ✅ 真正的控制力来自「有效期」：短周期签发 + 到期必须找你重签。
 *
 * 被两处复用：CLI（`license-console.mjs`）与本地网页控制台（同一文件的 serve 子命令）。
 */

import { createPrivateKey, createHash, randomBytes, sign as cryptoSign } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const KEY_FILE = path.join(root, 'data', 'desktop-license-keys.json');
const VAULT_FILE = path.join(root, 'data', 'desktop-license-vault.json');
const DAY = 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* 密钥                                                                */
/* ------------------------------------------------------------------ */

let cachedKey = null;

/** 读取本机私钥（缺失则报错，绝不自动生成 —— 换密钥是"核弹"，必须显式执行） */
export function privateKey() {
  if (cachedKey) return cachedKey;
  if (!fs.existsSync(KEY_FILE)) {
    throw new Error(`找不到私钥：${KEY_FILE}\n先执行：pnpm desktop:license:keys`);
  }
  const keys = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
  if (!keys.privateKey) throw new Error(`私钥文件异常（缺 privateKey）：${KEY_FILE}`);
  cachedKey = createPrivateKey({
    key: Buffer.from(keys.privateKey, 'base64'),
    format: 'der',
    type: 'pkcs8',
  });
  return cachedKey;
}

export function keyFilePath() {
  return KEY_FILE;
}

/* ------------------------------------------------------------------ */
/* 台账读写                                                            */
/* ------------------------------------------------------------------ */

const EMPTY = {
  version: 1,
  updatedAt: 0,
  // 签发默认值：吊销清单地址（空 = 纯离线串）与复检周期（天）
  settings: { revocationUrl: '', recheckDays: 30 },
  licenses: [],
};

const REVOCATION_FILE = path.join(root, 'data', 'desktop-revocation.json');

export function vaultPath() {
  return VAULT_FILE;
}

export function loadVault() {
  try {
    const raw = JSON.parse(fs.readFileSync(VAULT_FILE, 'utf8'));
    if (raw && Array.isArray(raw.licenses)) {
      return { ...EMPTY, ...raw, settings: { ...EMPTY.settings, ...(raw.settings || {}) } };
    }
  } catch {
    /* 不存在或损坏 → 当作空台账 */
  }
  return { ...EMPTY, settings: { ...EMPTY.settings }, licenses: [] };
}

export function saveVault(vault) {
  vault.updatedAt = Date.now();
  fs.mkdirSync(path.dirname(VAULT_FILE), { recursive: true });
  // 先写临时文件再改名，避免写一半被杀导致台账损坏
  const tmp = `${VAULT_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(vault, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, VAULT_FILE);
  try {
    fs.chmodSync(VAULT_FILE, 0o600);
  } catch {
    /* Windows 上 chmod 可能不支持，忽略 */
  }
  return vault;
}

/* ------------------------------------------------------------------ */
/* 签发                                                                */
/* ------------------------------------------------------------------ */

const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford Base32（剔除 I/L/O/U）

function randomCode() {
  const bytes = randomBytes(16);
  let body = '';
  for (let i = 0; i < bytes.length; i++) {
    if (i > 0 && i % 4 === 0) body += '-';
    body += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `STV-${body}`;
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * 签发一条离线授权并登记进台账。
 *
 * @param {{deviceId:string, label?:string, days?:number, expires?:string,
 *          permanent?:boolean, note?:string}} opts
 */
export function issue(opts) {
  const deviceId = String(opts.deviceId || '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(deviceId)) {
    throw new Error(`设备指纹必须是 64 位十六进制 sha256，收到 ${deviceId.length} 位：${deviceId}`);
  }

  let exp;
  if (opts.permanent) exp = 0;
  else if (opts.expires) {
    const d = new Date(`${opts.expires}T23:59:59`);
    if (!Number.isFinite(d.getTime())) throw new Error(`到期日无法解析：${opts.expires}`);
    exp = d.getTime();
  } else exp = Date.now() + Math.floor(Number(opts.days || 365)) * DAY;

  if (exp > 0 && exp <= Date.now()) throw new Error('指定的到期时间已经过去了');

  const vault = loadVault();
  const code = randomCode();
  const rl = String(opts.rl ?? vault.settings.revocationUrl ?? '').trim();
  const rk = Number(opts.rk ?? vault.settings.recheckDays ?? 30);
  const payload = {
    v: 1,
    code,
    dev: deviceId,
    exp,
    iat: Date.now(),
    ...(opts.label ? { lbl: String(opts.label).slice(0, 120) } : {}),
    // 只有给了清单地址才启用拉取式吊销；不给 = 纯离线串，客户端永不联网
    ...(rl ? { rl, rk: Number.isFinite(rk) && rk > 0 ? Math.floor(rk) : 30 } : {}),
  };
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  const lease = `${body}.${b64url(cryptoSign(null, Buffer.from(body, 'utf8'), privateKey()))}`;

  if (vault.licenses.some((l) => l.code === code)) throw new Error(`授权码撞号（极罕见）：${code}`);

  const record = {
    code,
    deviceId,
    label: String(opts.label || '').slice(0, 120),
    note: String(opts.note || '').slice(0, 500),
    lease,
    exp,
    rl,
    rk: rl ? payload.rk : 0,
    issuedAt: Date.now(),
    status: 'active',
    history: [{ at: Date.now(), action: 'issue', exp }],
  };
  vault.licenses.push(record);
  saveVault(vault);
  return record;
}

/** 按授权码或序号（#1 / 1）查一条 */
export function find(vault, ref) {
  const key = String(ref || '').trim();
  if (!key) return null;
  if (/^#?\d+$/.test(key)) {
    const idx = Number(key.replace('#', '')) - 1;
    return vault.licenses[idx] || null;
  }
  const up = key.toUpperCase();
  return vault.licenses.find((l) => l.code.toUpperCase() === up) || null;
}

/** 重新签发（续期 / 改备注）。旧串在旧 exp 前仍然有效——客户端不联网，换不掉它。 */
export function renew(code, { days, expires, permanent, label, note, rl, rk }) {
  const vault = loadVault();
  const rec = find(vault, code);
  if (!rec) throw new Error(`台账里没有这个授权码：${code}`);

  let exp;
  if (permanent) exp = 0;
  else if (expires) {
    const d = new Date(`${expires}T23:59:59`);
    if (!Number.isFinite(d.getTime())) throw new Error(`到期日无法解析：${expires}`);
    exp = d.getTime();
  } else if (days !== undefined && days !== null) {
    const base = Math.max(Date.now(), rec.exp || 0);
    exp = base + Math.floor(Number(days)) * DAY;
  } else throw new Error('续期需要 --days N / --expires 日期 / --permanent 之一');

  if (exp > 0 && exp <= Date.now()) throw new Error('续期后的到期时间仍然是过去，请检查参数');

  const nextRl = String(rl ?? rec.rl ?? '').trim();
  const nextRk = Number(rk ?? rec.rk ?? 30);
  const payload = {
    v: 1,
    code: rec.code,
    dev: rec.deviceId,
    exp,
    iat: Date.now(),
    ...(label ?? rec.label ? { lbl: String(label ?? rec.label).slice(0, 120) } : {}),
    ...(nextRl ? { rl: nextRl, rk: Number.isFinite(nextRk) && nextRk > 0 ? Math.floor(nextRk) : 30 } : {}),
  };
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  rec.lease = `${body}.${b64url(cryptoSign(null, Buffer.from(body, 'utf8'), privateKey()))}`;
  rec.exp = exp;
  rec.rl = nextRl;
  rec.rk = nextRl ? payload.rk : 0;
  if (label !== undefined) rec.label = String(label).slice(0, 120);
  if (note !== undefined) rec.note = String(note).slice(0, 500);
  rec.status = 'active';
  rec.history = [...(rec.history || []), { at: Date.now(), action: 'renew', exp }];
  saveVault(vault);
  return rec;
}

/** 标记作废，并**自动重建吊销清单**（清单上传后客户端才会真的锁死） */
export function revoke(code, reason) {
  const vault = loadVault();
  const rec = find(vault, code);
  if (!rec) throw new Error(`台账里没有这个授权码：${code}`);
  rec.status = 'revoked';
  if (reason) rec.note = String(reason).slice(0, 500);
  rec.history = [...(rec.history || []), { at: Date.now(), action: 'revoke' }];
  saveVault(vault);
  const list = buildRevocationList();
  return { record: rec, list };
}

/** 撤销作废（误操作的后悔药）：恢复为有效，并重建清单让客户端下次复检通过 */
export function unrevoke(code, note) {
  const vault = loadVault();
  const rec = find(vault, code);
  if (!rec) throw new Error(`台账里没有这个授权码：${code}`);
  rec.status = 'active';
  if (note !== undefined) rec.note = String(note).slice(0, 500);
  rec.history = [...(rec.history || []), { at: Date.now(), action: 'unrevoke' }];
  saveVault(vault);
  const list = buildRevocationList();
  return { record: rec, list };
}

/* ------------------------------------------------------------------ */
/* 吊销清单（拉取式吊销：静态文件 + 私钥签名）                             */
/* ------------------------------------------------------------------ */

/**
 * 用私钥签一份「已作废授权码」清单，写到 data/desktop-revocation.json。
 *
 * 内容就是一串 `<base64url payload>.<base64url 签名>`，与租约同格式 ——
 * 好处：把它原样传到任意静态托管（Gitee raw / Pages / COS / R2）就能用，
 * 不需要任何服务端程序，stravision.site 在不在都一样。
 */
export function buildRevocationList() {
  const vault = loadVault();
  const revoked = vault.licenses
    .filter((l) => l.status === 'revoked')
    .map((l) => String(l.code).toUpperCase());
  const payload = { v: 1, t: Date.now(), revoked: Array.from(new Set(revoked)) };
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  const blob = `${body}.${b64url(cryptoSign(null, Buffer.from(body, 'utf8'), privateKey()))}`;
  fs.mkdirSync(path.dirname(REVOCATION_FILE), { recursive: true });
  fs.writeFileSync(REVOCATION_FILE, blob, 'utf8');
  return { blob, revoked: payload.revoked, file: REVOCATION_FILE, updatedAt: payload.t };
}

/** 读取当前清单（不存在则现签一份） */
export function readRevocationList() {
  if (!fs.existsSync(REVOCATION_FILE)) return buildRevocationList();
  return { blob: fs.readFileSync(REVOCATION_FILE, 'utf8'), file: REVOCATION_FILE };
}

/** 更新签发默认值（清单地址 / 复检周期） */
export function saveSettings(patch) {
  const vault = loadVault();
  vault.settings = { ...vault.settings, ...patch };
  if (vault.settings.revocationUrl) vault.settings.revocationUrl = String(vault.settings.revocationUrl).trim();
  if (vault.settings.recheckDays) vault.settings.recheckDays = Math.floor(Number(vault.settings.recheckDays)) || 30;
  saveVault(vault);
  return vault.settings;
}

/* ------------------------------------------------------------------ */
/* 视图辅助                                                            */
/* ------------------------------------------------------------------ */

export function daysLeft(exp) {
  if (!exp) return null; // 永久
  return Math.ceil((exp - Date.now()) / DAY);
}

export function statusOf(rec) {
  if (rec.status === 'revoked') return '已作废';
  const d = daysLeft(rec.exp);
  if (d === null) return '永久';
  if (d < 0) return '已过期';
  if (d <= 30) return `${d}天(临期)`;
  return `有效 ${d}天`;
}

export function formatDate(ms) {
  if (!ms) return '永久';
  return new Date(ms).toLocaleDateString('zh-CN');
}

export function leaseFingerprint(lease) {
  return createHash('sha256').update(String(lease || '')).digest('hex').slice(0, 12);
}

export function stats(vault) {
  const now = Date.now();
  const s = { total: vault.licenses.length, active: 0, revoked: 0, expired: 0, expiringSoon: 0, permanent: 0 };
  vault.licenses.forEach((l) => {
    if (l.status === 'revoked') return s.revoked++;
    if (!l.exp) return (s.permanent++, s.active++);
    if (l.exp < now) return s.expired++;
    s.active++;
    if (l.exp - now <= 30 * DAY) s.expiringSoon++;
  });
  return s;
}
