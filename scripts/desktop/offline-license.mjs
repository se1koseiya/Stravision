#!/usr/bin/env node
/**
 * 离线授权串生成器（`pnpm desktop:license:offline`）。
 *
 * 为什么需要它：
 *   常规授权码是「客户端联网 → 服务端用私钥签租约」。
 *   一旦服务器停机 / 到期 / 域名失效，就再也发不出新授权了。
 *   这个脚本用**本机那份私钥**直接离线签发，全程不碰服务器 ——
 *   只要你还拿着 data/desktop-license-keys.json，就能一直给新设备发授权。
 *
 * 流程：
 *   1. 客户在「激活本机」窗口把**设备指纹**发给你（窗口里有「复制」按钮）；
 *   2. 你本地跑本脚本 → 得到一串离线授权串；
 *   3. 客户在激活窗口切到「离线授权串」标签，粘贴 → 完成（纯本地验签，不联网）。
 *
 * 用法：
 *   node scripts/desktop/offline-license.mjs --device <64位指纹> [选项]
 *
 * 必填：
 *   --device <fp>            目标设备指纹（sha256 hex，64 位）
 *
 * 有效期（三选一，默认 --days 365）：
 *   --days 365               从现在起 N 天
 *   --expires 2027-12-31     指定到期日（当天 23:59:59）
 *   --permanent              永久有效
 *
 * 可选：
 *   --label "张三 · 1号大棚"   备注（会显示在客户端「关于」里）
 *   --code STV-XXXX-...       指定展示用授权码（默认自动生成一个）
 *   --out license.txt        同时写入文件（方便整段发给客户）
 *   --json                   以 JSON 输出（便于脚本化）
 *
 * ⚠️ 离线串不联网、跳过心跳、不受离线宽限约束 —— 有效期只由这里的到期时间决定，
 *    签发后**无法远程吊销**（这是「完全脱钩服务器」的必然代价）。
 */

import { createPrivateKey, createHash, randomBytes, sign as cryptoSign } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const keyFile = path.join(root, 'data', 'desktop-license-keys.json');
const DAY = 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* 参数                                                                */
/* ------------------------------------------------------------------ */

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      out._.push(a);
      continue;
    }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

function die(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

if (args.help || args.h) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n/, ''));
  process.exit(0);
}

const deviceId = String(args.device || '').trim().toLowerCase();
if (!deviceId) die('缺少 --device（目标设备指纹）。让客户在激活窗口点「复制」把指纹发给你。');
if (!/^[0-9a-f]{64}$/.test(deviceId)) {
  die(`设备指纹格式不对：应为 64 位十六进制（sha256）。收到的是 ${deviceId.length} 位：${deviceId}`);
}

const label = String(args.label || '').trim().slice(0, 120);

/* ---- 有效期 ---- */
let exp = 0;
if (args.permanent) {
  exp = 0;
} else if (args.expires !== undefined) {
  if (args.expires === true) die('--expires 需要一个日期，例如 --expires 2027-12-31');
  const d = new Date(`${args.expires}T23:59:59`);
  if (!Number.isFinite(d.getTime())) die(`--expires 日期无法解析：${args.expires}（应形如 2027-12-31）`);
  exp = d.getTime();
} else if (args.days !== undefined) {
  const n = Number(args.days);
  if (!Number.isFinite(n) || n <= 0) die(`--days 需要正整数，收到：${args.days}`);
  exp = Date.now() + Math.floor(n) * DAY;
} else {
  exp = Date.now() + 365 * DAY; // 默认一年
}

if (exp > 0 && exp <= Date.now()) die('指定的到期时间已经过去了，请重新指定。');

/* ------------------------------------------------------------------ */
/* 私钥                                                                */
/* ------------------------------------------------------------------ */

if (!fs.existsSync(keyFile)) {
  die(`找不到私钥文件：${keyFile}\n   先执行：pnpm desktop:license:keys`);
}
const keys = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
if (!keys.privateKey) die(`私钥文件内容异常（缺 privateKey 字段）：${keyFile}`);
const privateKey = createPrivateKey({
  key: Buffer.from(keys.privateKey, 'base64'),
  format: 'der',
  type: 'pkcs8',
});

/* ------------------------------------------------------------------ */
/* 授权码（仅用于展示，服务端不查它，因为离线串根本不联网）                  */
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
const code = String(args.code || '').trim().toUpperCase() || randomCode();

/* ------------------------------------------------------------------ */
/* 签发（与 lib/desktop-license-lease.ts 的 signLease 完全同格式）        */
/* ------------------------------------------------------------------ */

function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const payload = {
  v: 1,
  code,
  dev: deviceId,
  exp,
  iat: Date.now(),
  // gd 不写：离线串不走宽限判定（客户端 evaluate 对 offline 记录直接跳过宽限）
  ...(label ? { lbl: label } : {}),
};
const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
const blob = `${body}.${b64url(cryptoSign(null, Buffer.from(body, 'utf8'), privateKey))}`;

/* ------------------------------------------------------------------ */
/* 输出                                                                */
/* ------------------------------------------------------------------ */

const expiryText = exp === 0 ? '永久有效' : new Date(exp).toLocaleString('zh-CN', { hour12: false });
const fingerprint = createHash('sha256').update(blob).digest('hex').slice(0, 12);

if (args.json) {
  console.log(JSON.stringify({ ok: true, code, deviceId, label, exp, expiresAt: exp || null, lease: blob }, null, 2));
} else {
  console.log('');
  console.log('✅ 离线授权串已生成');
  console.log('────────────────────────────────────────────────────────');
  console.log(`授权码      ${code}   （仅用于识别，服务端不校验）`);
  console.log(`目标设备    ${deviceId}`);
  console.log(`备注        ${label || '（无）'}`);
  console.log(`有效期      ${expiryText}`);
  console.log(`串校验      ${fingerprint}`);
  console.log('────────────────────────────────────────────────────────');
  console.log('把下面这一整行发给客户，让他在「激活本机」窗口切到「离线授权串」粘贴：');
  console.log('');
  console.log(blob);
  console.log('');
  console.log('⚠️ 该串不联网校验、无法远程吊销；到期后需重新签发一次。');
  console.log('');
}

if (args.out && args.out !== true) {
  const outPath = path.resolve(String(args.out));
  fs.writeFileSync(
    outPath,
    [
      `授权码：${code}`,
      `目标设备指纹：${deviceId}`,
      `备注：${label || '（无）'}`,
      `有效期：${expiryText}`,
      '',
      '离线授权串（在桌面端「激活本机」→「离线授权串」中粘贴）：',
      blob,
      '',
    ].join('\n'),
    'utf8'
  );
  console.log(`已写入文件：${outPath}`);
}
