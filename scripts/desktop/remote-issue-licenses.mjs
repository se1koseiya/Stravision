#!/usr/bin/env node
/**
 * 远程批量签发桌面端联网授权码（online 码）。
 *
 * 什么时候用它：
 *   服务器 SSH 连不上（没密钥），但你有浏览器登录态 —— 那就直接调线上的管理接口。
 *   本脚本把「签 N 个码」这件重复活一次性做完，并把 10 个码整理成可直接转发的清单。
 *
 * 取 Cookie 的方法（浏览器里）：
 *   F12 → Network → 随便点一个 stravision.site 的请求 → Request Headers → 复制 `cookie:` 那一整行
 *   （或直接 F12 → Application → Cookies → 把需要的键值拼起来）
 *   ⚠️ Cookie 等价于你的管理员登录态，用完请尽快让服务端登出/改密，别贴到公开聊天里。
 *
 * 用法：
 *   node scripts/desktop/remote-issue-licenses.mjs --cookie "<cookie>" [选项]
 *
 * 必填：
 *   --cookie "<cookie>"   浏览器里复制的完整 Cookie 头（需是 admin / super_admin 账号）
 *
 * 可选：
 *   --base https://stravision.site   目标站点（默认 https://stravision.site）
 *   --count 10            签发数量（默认 10）
 *   --days 365            有效期天数（默认 365；与 --permanent / --expires 三选一）
 *   --expires 2027-12-31  指定到期日
 *   --permanent           永久有效
 *   --max-activations 1   每码可激活台数（默认 1，即一码一机）
 *   --grace-days 7        离线宽限天数（默认不传，由服务端取默认 7 天）
 *   --label "2026秋批"     备注前缀，实际写入 `前缀 · N`
 *   --out licenses.txt    结果写成清单文件
 *   --json                以 JSON 输出
 */

import fs from 'node:fs';
import path from 'node:path';

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

const cookie = String(args.cookie || '').trim();
if (!cookie) die('缺少 --cookie（浏览器 F12 复制的完整 cookie 头）。');

const base = String(args.base || 'https://stravision.site').replace(/\/+$/, '');
const count = Math.max(1, Math.min(100, Number(args.count || 10) || 10));
const maxActivations = Math.max(1, Math.min(999, Number(args['max-activations'] || 1) || 1));
const labelPrefix = String(args.label || '').trim();
const graceDays = args['grace-days'] !== undefined && args['grace-days'] !== true ? Number(args['grace-days']) : undefined;
if (graceDays !== undefined && (!Number.isFinite(graceDays) || graceDays < 1)) die('--grace-days 需要正整数');

/* ---- 有效期 ---- */
const body = { maxActivations, kind: 'online' };
if (args.permanent) {
  body.permanent = true;
} else if (args.expires !== undefined && args.expires !== true) {
  const d = new Date(`${args.expires}T23:59:59`);
  if (!Number.isFinite(d.getTime())) die(`--expires 日期无法解析：${args.expires}`);
  body.expiresAt = d.getTime();
} else {
  body.durationDays = Number(args.days || 365) || 365;
}
if (graceDays !== undefined) body.graceDays = Math.floor(graceDays);

/* ------------------------------------------------------------------ */
/* 签发                                                                */
/* ------------------------------------------------------------------ */

const endpoint = `${base}/api/admin/desktop-licenses`;
const issued = [];
const failed = [];

for (let i = 0; i < count; i++) {
  const label = labelPrefix ? `${labelPrefix} · ${String(i + 1).padStart(2, '0')}` : '';
  let res;
  let data;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({ ...body, label }),
    });
    data = await res.json().catch(() => ({}));
  } catch (error) {
    failed.push({ index: i + 1, error: `网络错误：${error.message}` });
    continue;
  }
  if (!res.ok || !data?.license?.code) {
    failed.push({ index: i + 1, error: `HTTP ${res.status} ${data?.error || ''}`.trim() });
    continue;
  }
  issued.push({
    index: i + 1,
    code: data.license.code,
    id: data.license.id,
    label: data.license.label || label,
    expiresAt: data.license.expiresAt ?? null,
    maxActivations: data.license.maxActivations ?? maxActivations,
  });
  process.stdout.write(`  签发中 ${i + 1}/${count}\r`);
}

/* ------------------------------------------------------------------ */
/* 输出                                                                */
/* ------------------------------------------------------------------ */

const validityText = args.permanent
  ? '永久有效'
  : body.expiresAt
    ? `到期 ${new Date(body.expiresAt).toLocaleString('zh-CN', { hour12: false })}`
    : `${body.durationDays} 天`;

console.log('');
if (args.json) {
  console.log(JSON.stringify({ ok: failed.length === 0, base, validityText, issued, failed }, null, 2));
} else {
  console.log(`✅ 已向 ${base} 签发 ${issued.length}/${count} 个联网授权码（${validityText}）`);
  if (issued.length) {
    console.log('────────────────────────────────────────────────────────');
    issued.forEach((it) => {
      const exp = it.expiresAt ? new Date(it.expiresAt).toLocaleDateString('zh-CN') : '永久';
      console.log(`${String(it.index).padStart(2, ' ')}. ${it.code}   到期 ${exp}   ${it.maxActivations} 台   ${it.label || ''}`);
    });
    console.log('────────────────────────────────────────────────────────');
  }
  if (failed.length) {
    console.log(`❌ 失败 ${failed.length} 个：`);
    failed.forEach((f) => console.log(`   #${f.index} ${f.error}`));
  }
  console.log('');
  console.log('客户用法：桌面端「激活本机」→ 输入上面的授权码 → 联网激活（一码一机）。');
  console.log('');
}

if (args.out && args.out !== true && issued.length) {
  const outPath = path.resolve(String(args.out));
  const lines = [
    `# 桌面端授权码 · 共 ${issued.length} 个 · ${validityText}`,
    `# 签发时间 ${new Date().toLocaleString('zh-CN', { hour12: false })} · ${base}`,
    `# 用法：桌面端「激活本机」→ 输入授权码 → 联网激活`,
    '',
    ...issued.map((it) => {
      const exp = it.expiresAt ? new Date(it.expiresAt).toLocaleDateString('zh-CN') : '永久';
      return `${String(it.index).padStart(2, ' ')}. ${it.code}   到期 ${exp}   ${it.label || ''}`;
    }),
    '',
  ];
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log(`已写入文件：${outPath}`);
}

process.exit(failed.length ? 1 : 0);
