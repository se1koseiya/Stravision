#!/usr/bin/env node
/**
 * 批量签发离线授权串（`scripts/desktop/offline-license.mjs` 的批量版）。
 *
 * 为什么单独做一个：
 *   一次要给 N 个客户发授权时，跑 N 遍单发脚本既慢又容易漏参数（有效期 / 备注写歪）。
 *   本脚本一次读一份「设备清单」，用同一套参数签出 N 串，并输出可直接转发的清单文件。
 *
 * 设备清单文件格式（--devices <file>）：
 *   每行一台：`<64位指纹> [备注]`，指纹后可跟空格或 Tab 分隔的备注；
 *   `#` 开头为注释，空行跳过。例：
 *
 *     # 2026 秋 · 十个客户
 *     3f2a...c1   张三 · 1号大棚
 *     9b7e...04   李四 · 育苗车间
 *
 * 用法：
 *   node scripts/desktop/batch-offline-license.mjs --devices devices.txt [选项]
 *
 * 必填（二选一）：
 *   --devices <file>      设备清单文件
 *   --device <fp[,fp2]>   直接给指纹，逗号分隔（不带备注时用这个）
 *
 * 有效期（三选一，默认 --days 365）：
 *   --days 365            从现在起 N 天
 *   --expires 2027-12-31  指定到期日（当天 23:59:59）
 *   --permanent           永久有效
 *
 * 可选：
 *   --out licenses.txt    把结果写成可直接转发的清单文件
 *   --json                以 JSON 输出（便于脚本化）
 *
 * ⚠️ 与单发脚本同样的代价：离线串不联网、无法远程吊销，到期需重新签发。
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

/* ---- 设备清单 ---- */
const devices = [];
const seen = new Set();

function pushDevice(fp, label) {
  const id = String(fp || '').trim().toLowerCase();
  if (!id) return;
  if (!/^[0-9a-f]{64}$/.test(id)) {
    die(`设备指纹格式不对（应为 64 位十六进制 sha256），收到 ${id.length} 位：${id}`);
  }
  if (seen.has(id)) die(`设备指纹重复：${id}（一机一码，请检查清单）`);
  seen.add(id);
  devices.push({ id, label: String(label || '').trim().slice(0, 120) });
}

if (args.devices && args.devices !== true) {
  const p = path.resolve(String(args.devices));
  if (!fs.existsSync(p)) die(`找不到设备清单文件：${p}`);
  fs.readFileSync(p, 'utf8')
    .split(/\r?\n/)
    .forEach((rawLine, idx) => {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) return;
      const [fp, ...rest] = line.split(/\s+/);
      pushDevice(fp, rest.join(' '));
      if (!/^[0-9a-f]{64}$/.test(String(fp || '').trim().toLowerCase())) {
        die(`设备清单第 ${idx + 1} 行指纹非法：${line}`);
      }
    });
} else if (args.device && args.device !== true) {
  String(args.device)
    .split(',')
    .forEach((fp) => pushDevice(fp, ''));
} else {
  die('缺少 --devices <清单文件> 或 --device <指纹,指纹,...>');
}

if (!devices.length) die('设备清单为空，没有可签发的设备。');

/* ---- 有效期 ---- */
let exp = 0;
if (args.permanent) {
  exp = 0;
} else if (args.expires !== undefined) {
  if (args.expires === true) die('--expires 需要一个日期，例如 --expires 2027-12-31');
  const d = new Date(`${args.expires}T23:59:59`);
  if (!Number.isFinite(d.getTime())) die(`--expires 日期无法解析：${args.expires}`);
  exp = d.getTime();
} else if (args.days !== undefined) {
  const n = Number(args.days);
  if (!Number.isFinite(n) || n <= 0) die(`--days 需要正整数，收到：${args.days}`);
  exp = Date.now() + Math.floor(n) * DAY;
} else {
  exp = Date.now() + 365 * DAY;
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
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const issued = devices.map(({ id, label }) => {
  const code = randomCode();
  const payload = {
    v: 1,
    code,
    dev: id,
    exp,
    iat: Date.now(),
    ...(label ? { lbl: label } : {}),
  };
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  const blob = `${body}.${b64url(cryptoSign(null, Buffer.from(body, 'utf8'), privateKey))}`;
  return {
    code,
    deviceId: id,
    label,
    exp,
    lease: blob,
    fingerprint: createHash('sha256').update(blob).digest('hex').slice(0, 12),
  };
});

/* ------------------------------------------------------------------ */
/* 输出                                                                */
/* ------------------------------------------------------------------ */

const expiryText = exp === 0 ? '永久有效' : new Date(exp).toLocaleString('zh-CN', { hour12: false });

if (args.json) {
  console.log(
    JSON.stringify(
      { ok: true, count: issued.length, exp, expiresAt: exp || null, items: issued },
      null,
      2
    )
  );
} else {
  console.log('');
  console.log(`✅ 已签发 ${issued.length} 条离线授权`);
  console.log(`   有效期      ${expiryText}`);
  console.log('────────────────────────────────────────────────────────');
  issued.forEach((it, i) => {
    console.log(
      `${String(i + 1).padStart(2, ' ')}. ${it.code}  ${it.label || '（无备注）'}  设备 ${it.deviceId.slice(0, 12)}…  校验 ${it.fingerprint}`
    );
  });
  console.log('────────────────────────────────────────────────────────');
  console.log('');
}

if (args.out && args.out !== true) {
  const outPath = path.resolve(String(args.out));
  const blocks = [
    `# 离线授权清单 · 共 ${issued.length} 条 · 有效期 ${expiryText}`,
    `# 签发时间 ${new Date().toLocaleString('zh-CN', { hour12: false })}`,
    `# 用法：桌面端「激活本机」→「离线授权串」→ 粘贴下方对应那一整行`,
    '',
  ];
  issued.forEach((it, i) => {
    blocks.push(
      [
        `# ${i + 1}. ${it.label || '（无备注）'}`,
        `授权码：${it.code}`,
        `设备指纹：${it.deviceId}`,
        `串校验：${it.fingerprint}`,
        it.lease,
        '',
      ].join('\n')
    );
  });
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, blocks.join('\n'), 'utf8');
  console.log(`已写入文件：${outPath}`);
  console.log('');
}
