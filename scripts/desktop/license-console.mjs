#!/usr/bin/env node
/**
 * 本地授权码控制台（离线授权体系的"遥控器"）。
 *
 * 一句话：不依赖任何服务器，在你自己电脑上签发 / 查台账 / 续期 / 作废 / 导出授权串。
 * 数据落在 `data/desktop-license-vault.json`（0600），私钥仍在 `data/desktop-license-keys.json`。
 *
 * 用法：
 *   node scripts/desktop/license-console.mjs <子命令> [选项]
 *
 * 子命令：
 *   issue    签发（登记进台账）
 *     --device <fp[,fp2,...]>   设备指纹，逗号分隔
 *     --devices <file>          或读清单文件（每行 `<指纹> [备注]`）
 *     --count N                 批量签 N 个（与 --devices 合用）
 *     --label "张三 · 1号棚"     备注
 *     --days 365 / --expires 2027-12-31 / --permanent    有效期（默认 365 天）
 *   list     台账列表（--all 含已作废 / --expired 只看过期 / --json）
 *   show     <码|序号>          查看一条详情
 *   export   <码|序号> [--out f] 重新输出授权串（客户弄丢了可以重发）
 *   renew    <码|序号> --days 365 [--label x]   续期（重新签串，需让客户重新粘贴）
 *   revoke   <码|序号> [--reason x]  作废：标记台账 + 自动重建吊销清单
 *   unrevoke <码|序号> [--reason x]  撤销作废（误操作的后悔药），同样需 publish 才生效
 *   revocation [--rebuild] [--out f] 查看 / 导出吊销清单（上传到静态托管即可生效）
 *   config   [--rl <URL>] [--rk <天>]  查看 / 设置签发的默认清单地址与复检周期
 *   stats    统计
 *   serve    [--port 5188]      启动本地网页控制台（只监听 127.0.0.1）
 *
 * 吊销（拉取式）三步：
 *   1. config --rl <清单直链>       （一次性设置；清单可放 Gitee/GitHub raw、COS、R2 等任意静态托管）
 *   2. revoke <码>                  （重建 data/desktop-revocation.json）
 *   3. 把 revocation 输出的那一行上传到托管地址 → 客户端下次复检即锁死
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as vault from './license-vault.mjs';

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
const cmd = String(args._[0] || 'help').toLowerCase();

function die(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* 有效期参数（issue / renew 共用）                                      */
/* ------------------------------------------------------------------ */

function expiryFromArgs(a, fallbackDays = 365) {
  if (a.permanent) return { permanent: true };
  if (a.expires !== undefined && a.expires !== true) return { expires: String(a.expires) };
  if (a.days !== undefined && a.days !== true) return { days: Number(a.days) };
  return { days: fallbackDays };
}

/* ------------------------------------------------------------------ */
/* 子命令                                                              */
/* ------------------------------------------------------------------ */

function cmdIssue() {
  const targets = [];
  if (args.devices && args.devices !== true) {
    const p = path.resolve(String(args.devices));
    if (!fs.existsSync(p)) die(`找不到设备清单：${p}`);
    fs.readFileSync(p, 'utf8')
      .split(/\r?\n/)
      .forEach((line) => {
        const t = line.trim();
        if (!t || t.startsWith('#')) return;
        const [fp, ...rest] = t.split(/\s+/);
        targets.push({ deviceId: fp, label: rest.join(' ') });
      });
  } else if (args.device && args.device !== true) {
    const label = String(args.label || '');
    const list = String(args.device)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    list.forEach((fp, i) =>
      targets.push({ deviceId: fp, label: list.length > 1 ? `${label} · ${i + 1}`.trim() : label })
    );
  } else if (args.count) {
    die('批量签发需要指纹：用 --devices <清单文件> 或 --device <指纹,指纹,...>');
  } else {
    die('缺少 --device <指纹> 或 --devices <清单文件>');
  }

  if (!targets.length) die('没有可签发的设备。');

  const exp = expiryFromArgs(args);
  const created = targets.map((t) =>
    vault.issue({
      deviceId: t.deviceId,
      label: t.label || String(args.label || ''),
      note: String(args.note || ''),
      rl: args.rl !== undefined && args.rl !== true ? String(args.rl) : undefined,
      rk: args.rk !== undefined && args.rk !== true ? Number(args.rk) : undefined,
      ...exp,
    })
  );

  console.log('');
  console.log(`✅ 已签发 ${created.length} 条并登记进台账`);
  console.log('────────────────────────────────────────────────────────');
  created.forEach((r) => {
    console.log(`${r.code}  ${r.label || '（无备注）'}  到期 ${vault.formatDate(r.exp)}  设备 ${r.deviceId.slice(0, 12)}…`);
  });
  console.log('────────────────────────────────────────────────────────');
  if (created[0]?.rl) {
    console.log(`吊销清单  ${created[0].rl}（每 ${created[0].rk} 天复检一次）`);
    console.log('   → 将来 `pnpm license revoke <码>` 后上传清单，客户机上就会自动锁死。');
  } else {
    console.log('纯离线串（未配清单地址）→ 签出后无法远程吊销，只能等它到期。');
    console.log('   想要吊销能力：`pnpm license config --rl <清单直链>` 后重签。');
  }
  console.log('把串发给对应客户：`pnpm license export <码>` 可随时重取。');
  console.log('');
}

function cmdList() {
  const v = vault.loadVault();
  let rows = v.licenses;
  if (args.expired) rows = rows.filter((l) => l.exp && l.exp < Date.now() && l.status !== 'revoked');
  else if (args.revoked) rows = rows.filter((l) => l.status === 'revoked');
  else if (!args.all) rows = rows.filter((l) => l.status !== 'revoked');

  if (args.json) {
    console.log(JSON.stringify({ stats: vault.stats(v), licenses: rows }, null, 2));
    return;
  }
  console.log('');
  console.log(`台账：${v.licenses.length} 条（显示 ${rows.length} 条）  ${vault.vaultPath()}`);
  console.log('────────────────────────────────────────────────────────');
  console.log('#    授权码                          状态        到期          备注');
  rows.forEach((l, i) => {
    const idx = String(v.licenses.indexOf(l) + 1).padStart(2, ' ');
    console.log(
      `${idx}   ${l.code.padEnd(35)}  ${vault.statusOf(l).padEnd(10)}  ${vault.formatDate(l.exp).padEnd(12)}  ${l.label || ''}`
    );
  });
  console.log('────────────────────────────────────────────────────────');
  const s = vault.stats(v);
  console.log(`有效 ${s.active} · 临期30天内 ${s.expiringSoon} · 已过期 ${s.expired} · 永久 ${s.permanent} · 已作废 ${s.revoked}`);
  console.log('');
}

function cmdShow() {
  const v = vault.loadVault();
  const rec = vault.find(v, args._[1]);
  if (!rec) die(`找不到：${args._[1] || '(未指定)'}。用 list 看序号。`);
  console.log('');
  console.log(`授权码      ${rec.code}`);
  console.log(`备注        ${rec.label || '（无）'}`);
  console.log(`备注2       ${rec.note || '（无）'}`);
  console.log(`设备指纹    ${rec.deviceId}`);
  console.log(`到期        ${vault.formatDate(rec.exp)}（${vault.statusOf(rec)}）`);
  console.log(`签发时间    ${new Date(rec.issuedAt).toLocaleString('zh-CN', { hour12: false })}`);
  console.log(`状态        ${rec.status === 'revoked' ? '已作废（仅本地标记）' : '正常'}`);
  console.log(`串校验      ${vault.leaseFingerprint(rec.lease)}`);
  if (rec.history?.length) {
    console.log('历史');
    rec.history.forEach((h) =>
      console.log(`   ${new Date(h.at).toLocaleString('zh-CN', { hour12: false })}  ${h.action}${h.exp !== undefined ? `  → ${vault.formatDate(h.exp)}` : ''}`)
    );
  }
  console.log('');
}

function cmdExport() {
  const v = vault.loadVault();
  const rec = vault.find(v, args._[1]);
  if (!rec) die(`找不到：${args._[1] || '(未指定)'}`);
  const text = [
    `授权码：${rec.code}`,
    `备注：${rec.label || '（无）'}`,
    `设备指纹：${rec.deviceId}`,
    `有效期：${vault.formatDate(rec.exp)}`,
    '',
    '离线授权串（桌面端「激活本机」→「离线授权串」粘贴）：',
    rec.lease,
    '',
  ].join('\n');

  if (args.out && args.out !== true) {
    const p = path.resolve(String(args.out));
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, text, 'utf8');
    console.log(`\n✅ 已写入 ${p}\n`);
    return;
  }
  console.log('');
  console.log(text);
}

function cmdRenew() {
  const exp = expiryFromArgs(args, null);
  if (exp.days === null && !exp.permanent && !exp.expires) {
    die('续期需要 --days N / --expires 2027-12-31 / --permanent 之一');
  }
  const rec = vault.renew(args._[1], {
    days: exp.days,
    expires: exp.expires,
    permanent: exp.permanent,
    label: args.label !== undefined && args.label !== true ? String(args.label) : undefined,
    note: args.note !== undefined && args.note !== true ? String(args.note) : undefined,
    rl: args.rl !== undefined && args.rl !== true ? String(args.rl) : undefined,
    rk: args.rk !== undefined && args.rk !== true ? Number(args.rk) : undefined,
  });
  console.log('');
  console.log(`✅ 已续期 ${rec.code} → 到期 ${vault.formatDate(rec.exp)}`);
  console.log('⚠️ 必须把新串重新发给客户（客户端不联网，旧串在旧到期日前仍然有效）。');
  console.log('');
  console.log(rec.lease);
  console.log('');
}

function cmdRevoke() {
  const { record: rec, list } = vault.revoke(
    args._[1],
    args.reason !== undefined && args.reason !== true ? String(args.reason) : ''
  );
  console.log('');
  console.log(`已标记作废：${rec.code}（${rec.label || '（无备注）'}）`);
  console.log(`吊销清单已重建：${list.file}（共 ${list.revoked.length} 条）`);
  if (rec.rl) {
    console.log(`该码配了清单地址 ${rec.rl}，清单上传后客户端复检会命中并锁死。`);
  } else {
    console.log('⚠️ 这个码**没有配清单地址**（签发时没给 --rl，且未设置默认地址）→ 客户端永不联网，');
    console.log('   清单对它无效，只能等它到期。可用 `pnpm license config --rl <URL>` 设置默认地址后重签。');
  }
  console.log('');
}

function cmdUnrevoke() {
  const { record: rec, list } = vault.unrevoke(
    args._[1],
    args.reason !== undefined && args.reason !== true ? String(args.reason) : undefined
  );
  console.log('');
  console.log(`已撤销作废：${rec.code}（${rec.label || '（无备注）'}）`);
  console.log(`吊销清单已重建：${list.revoked.length} 条`);
  console.log('记得 `pnpm license:publish` 把新清单传上去 —— 客户端下次复检才会解锁。');
  console.log('');
}

function cmdRevocation() {
  const list = args.rebuild ? vault.buildRevocationList() : vault.readRevocationList();
  const parsed = (() => {
    try {
      const body = String(list.blob).split('.')[0];
      return JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    } catch {
      return null;
    }
  })();

  if (args.json) {
    console.log(JSON.stringify({ ...list, parsed }, null, 2));
    return;
  }
  console.log('');
  console.log(`吊销清单    ${list.file}`);
  console.log(`作废条数    ${parsed?.revoked?.length ?? '?'}   更新于 ${parsed ? new Date(parsed.t).toLocaleString('zh-CN', { hour12: false }) : '?'}`);
  console.log('────────────────────────────────────────────────────────');
  (parsed?.revoked || []).forEach((c) => console.log(`  ${c}`));
  console.log('────────────────────────────────────────────────────────');
  console.log('把下面这一整行原样上传到你的静态托管（Gitee raw / Pages / COS / R2 都行）：');
  console.log('');
  console.log(list.blob);
  console.log('');
  console.log('然后把该地址设为默认：`pnpm license config --rl <文件直链>`，之后再签的码都会带上它。');
  console.log('');

  if (args.out && args.out !== true) {
    const p = path.resolve(String(args.out));
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, list.blob, 'utf8');
    console.log(`已写入文件：${p}`);
  }
}

function cmdConfig() {
  const patch = {};
  if (args.rl !== undefined) patch.revocationUrl = args.rl === true ? '' : String(args.rl);
  if (args.rk !== undefined) patch.recheckDays = Number(args.rk);
  if (!Object.keys(patch).length) {
    const v = vault.loadVault();
    console.log('');
    console.log(`默认清单地址  ${v.settings.revocationUrl || '（空：签出的是纯离线串）'}`);
    console.log(`默认复检周期  ${v.settings.recheckDays} 天`);
    console.log('');
    console.log('改法：pnpm license config --rl https://gitee.com/xxx/raw/revoked.json --rk 30');
    console.log('');
    return;
  }
  const s = vault.saveSettings(patch);
  console.log('');
  console.log(`✅ 默认清单地址  ${s.revocationUrl || '（空）'}`);
  console.log(`✅ 默认复检周期  ${s.recheckDays} 天`);
  console.log('   （只影响之后签发的码；已签发的用 `pnpm license renew <码> --rl <URL>` 补上）');
  console.log('');
}

function cmdStats() {
  const v = vault.loadVault();
  const s = vault.stats(v);
  console.log('');
  console.log(`台账文件    ${vault.vaultPath()}`);
  console.log(`私钥文件    ${vault.keyFilePath()}`);
  console.log(`总条数      ${s.total}`);
  console.log(`有效        ${s.active}（其中永久 ${s.permanent}）`);
  console.log(`30天内到期  ${s.expiringSoon}`);
  console.log(`已过期      ${s.expired}`);
  console.log(`已作废      ${s.revoked}`);
  console.log('');
}

/* ------------------------------------------------------------------ */
/* 网页控制台                                                          */
/* ------------------------------------------------------------------ */

function htmlPage() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>授权码控制台 · Stravision</title>
<style>
  :root {
    --bg: #f4f6f5; --panel: #ffffff; --line: #e2e6e4; --text: #1f2422;
    --muted: #6b7571; --brand: #059669; --brand-soft: #e7f6f0; --warn: #b45309; --danger: #b91c1c;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text);
    font: 14px/1.6 "PingFang SC", "Microsoft YaHei", system-ui, sans-serif; }
  header { padding: 18px 24px; background: var(--panel); border-bottom: 1px solid var(--line);
    display: flex; align-items: baseline; gap: 12px; }
  header h1 { font-size: 16px; margin: 0; font-weight: 600; }
  header span { color: var(--muted); font-size: 12px; }
  main { max-width: 1080px; margin: 0 auto; padding: 20px 24px 48px; }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 16px; margin-bottom: 16px; }
  .card h2 { font-size: 13px; margin: 0 0 12px; color: var(--muted); font-weight: 600; letter-spacing: .3px; }
  .row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  input, select, button { font: inherit; padding: 7px 10px; border-radius: 8px; border: 1px solid var(--line);
    background: #fff; color: var(--text); }
  input { min-width: 140px; }
  input.grow { flex: 1; min-width: 260px; font-family: ui-monospace, Consolas, monospace; }
  button { cursor: pointer; }
  button.primary { background: var(--brand); border-color: var(--brand); color: #fff; }
  button.ghost { background: #fff; }
  button.danger { color: var(--danger); }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line); vertical-align: middle; }
  th { color: var(--muted); font-weight: 600; font-size: 12px; }
  td.code { font-family: ui-monospace, Consolas, monospace; }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; background: var(--brand-soft); color: var(--brand); }
  .tag.warn { background: #fef3c7; color: var(--warn); }
  .tag.bad { background: #fee2e2; color: var(--danger); }
  .tag.grey { background: #eef1ef; color: var(--muted); }
  .stats { display: flex; gap: 20px; flex-wrap: wrap; color: var(--muted); font-size: 13px; }
  .stats b { color: var(--text); font-size: 18px; display: block; }
  pre { white-space: pre-wrap; word-break: break-all; background: #f8faf9; border: 1px solid var(--line);
    border-radius: 8px; padding: 12px; font-size: 12px; margin: 8px 0 0; }
  .hint { color: var(--muted); font-size: 12px; margin-top: 8px; }
  .msg { margin-top: 10px; font-size: 13px; }
  .msg.err { color: var(--danger); }
  .msg.ok { color: var(--brand); }
</style>
</head>
<body>
<header>
  <h1>授权码控制台</h1>
  <span>仅本机 · 私钥不出电脑 · <code id="vaultPath"></code></span>
</header>
<main>
  <div class="card">
    <h2>概览</h2>
    <div class="stats" id="stats"></div>
  </div>

  <div class="card">
    <h2>吊销清单（拉取式 —— 客户端定期拉取，命中即锁死）</h2>
    <div class="row">
      <input class="grow" id="sUrl" placeholder="清单直链（Gitee raw / Pages / COS / R2 均可）" />
      <input id="sDays" type="number" value="30" style="width:110px" title="复检周期（天）" />
      <button class="primary" id="btnSaveCfg">保存</button>
      <button class="ghost" id="btnCopyList">复制清单</button>
    </div>
    <div class="hint" id="cfgHint"></div>
    <div class="msg" id="cfgMsg"></div>
  </div>

  <div class="card">
    <h2>签发新授权</h2>
    <div class="row">
      <input class="grow" id="fDevice" placeholder="设备指纹（64 位 sha256 hex）" />
      <input id="fLabel" placeholder="备注（客户 / 大棚）" />
      <input id="fDays" type="number" value="365" style="width:110px" title="有效期天数" />
      <button class="primary" id="btnIssue">签发</button>
    </div>
    <div class="hint">有效期按天填；填 0 = 永久。签完自动登记台账。</div>
    <div class="msg" id="issueMsg"></div>
    <pre id="issueOut" hidden></pre>
  </div>

  <div class="card">
    <h2>台账</h2>
    <div class="row" style="margin-bottom:10px">
      <input class="grow" id="q" placeholder="搜索：授权码 / 备注 / 设备指纹" />
      <label style="color:var(--muted)"><input type="checkbox" id="showRevoked" /> 显示已作废</label>
    </div>
    <table>
      <thead><tr><th>#</th><th>授权码</th><th>状态</th><th>到期</th><th>备注</th><th>操作</th></tr></thead>
      <tbody id="rows"></tbody>
    </table>
  </div>
</main>
<script>
const $ = (id) => document.getElementById(id);
let all = [];
let cfg = { settings: {}, revocation: {} };

async function api(url, opts) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || ('HTTP ' + res.status));
  return data;
}

function tag(text, cls) { return '<span class="tag ' + (cls || '') + '">' + text + '</span>'; }

function render() {
  const q = $('q').value.trim().toLowerCase();
  const showRevoked = $('showRevoked').checked;
  const rows = all.filter((l) => {
    if (!showRevoked && l.status === 'revoked') return false;
    if (!q) return true;
    return (l.code + ' ' + (l.label || '') + ' ' + l.deviceId).toLowerCase().includes(q);
  });
  $('rows').innerHTML = rows.map((l) => {
    const i = all.indexOf(l) + 1;
    const st = l.status === 'revoked'
      ? tag('已作废', 'grey')
      : l.exp === 0
        ? tag('永久', '')
        : l.exp < Date.now()
          ? tag('已过期', 'bad')
          : (l.exp - Date.now()) / 86400000 <= 30
            ? tag('临期 ' + Math.ceil((l.exp - Date.now()) / 86400000) + ' 天', 'warn')
            : tag('有效', '');
    const exp = l.exp === 0 ? '永久' : new Date(l.exp).toLocaleDateString('zh-CN');
    return '<tr>' +
      '<td>' + i + '</td>' +
      '<td class="code">' + l.code + '</td>' +
      '<td>' + st + '</td>' +
      '<td>' + exp + '</td>' +
      '<td>' + (l.label || '') + '</td>' +
      '<td>' +
        '<button class="ghost" onclick="doExport(' + i + ')">取串</button> ' +
        '<button class="ghost" onclick="doRenew(' + i + ')">续365天</button> ' +
        '<button class="danger ghost" onclick="doRevoke(' + i + ')">作废</button>' +
      '</td></tr>';
  }).join('');
}

async function loadCfg() {
  const d = await api('/api/settings');
  cfg = d;
  $('sUrl').value = d.settings.revocationUrl || '';
  $('sDays').value = d.settings.recheckDays || 30;
  const r = d.revocation;
  $('cfgHint').textContent =
    (d.settings.revocationUrl
      ? '签发时会把该地址写进租约，客户端每 ' + d.settings.recheckDays + ' 天核对一次。'
      : '未设置地址 → 签出的是纯离线串，无法远程吊销。') +
    ' 当前清单：' + r.count + ' 条作废' +
    (r.updatedAt ? '，更新于 ' + new Date(r.updatedAt).toLocaleString('zh-CN') : '');
}

async function refresh() {
  const data = await api('/api/list');
  all = data.licenses;
  $('vaultPath').textContent = data.vaultPath;
  $('stats').innerHTML =
    '<div>总数<b>' + data.stats.total + '</b></div>' +
    '<div>有效<b>' + data.stats.active + '</b></div>' +
    '<div>临期30天<b>' + data.stats.expiringSoon + '</b></div>' +
    '<div>已过期<b>' + data.stats.expired + '</b></div>' +
    '<div>已作废<b>' + data.stats.revoked + '</b></div>';
  render();
  await loadCfg();
}

$('btnSaveCfg').onclick = async () => {
  const msg = $('cfgMsg'); msg.className = 'msg'; msg.textContent = '';
  try {
    const d = await api('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revocationUrl: $('sUrl').value.trim(), recheckDays: Number($('sDays').value || 30) }),
    });
    msg.className = 'msg ok'; msg.textContent = '已保存（只影响之后签发的码）';
    await loadCfg();
  } catch (e) { msg.className = 'msg err'; msg.textContent = e.message; }
};

$('btnCopyList').onclick = async () => {
  try {
    await navigator.clipboard.writeText(cfg.revocation.blob);
    $('cfgMsg').className = 'msg ok';
    $('cfgMsg').textContent = '清单已复制，上传到托管地址即可生效';
  } catch (e) {
    prompt('手动复制这一行并上传：', cfg.revocation.blob);
  }
};

$('btnIssue').onclick = async () => {
  const msg = $('issueMsg'); const out = $('issueOut');
  msg.className = 'msg'; msg.textContent = ''; out.hidden = true;
  try {
    const days = Number($('fDays').value || 365);
    const data = await api('/api/issue', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: $('fDevice').value.trim(),
        label: $('fLabel').value.trim(),
        permanent: days === 0,
        days: days === 0 ? undefined : days,
      }),
    });
    msg.className = 'msg ok';
    msg.textContent = '已签发 ' + data.record.code;
    out.hidden = false;
    out.textContent = data.record.lease;
    $('fDevice').value = '';
    refresh();
  } catch (e) {
    msg.className = 'msg err'; msg.textContent = e.message;
  }
};

async function doExport(i) {
  const rec = all[i - 1];
  const data = await api('/api/export?code=' + encodeURIComponent(rec.code));
  const text = '授权码：' + rec.code + '\\n备注：' + (rec.label || '') + '\\n设备指纹：' + rec.deviceId +
    '\\n有效期：' + (rec.exp === 0 ? '永久' : new Date(rec.exp).toLocaleDateString('zh-CN')) +
    '\\n\\n离线授权串（桌面端「激活本机」→「离线授权串」粘贴）：\\n' + data.lease;
  await navigator.clipboard.writeText(text).catch(() => {});
  prompt('已复制到剪贴板，也可在此手动复制：', data.lease);
}

async function doRenew(i) {
  const rec = all[i - 1];
  const days = prompt('续期天数（0 = 永久）：', '365');
  if (days === null) return;
  const d = Number(days);
  if (!Number.isFinite(d) || d < 0) return alert('天数不合法');
  const data = await api('/api/renew', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: rec.code, permanent: d === 0, days: d === 0 ? undefined : d }),
  });
  prompt('已续期，把新串发给客户（旧串在旧到期日前仍有效）：', data.record.lease);
  refresh();
}

async function doRevoke(i) {
  const rec = all[i - 1];
  if (!confirm('标记作废 ' + rec.code + ' ？\\n\\n注意：这只是本机台账标记，客户端不联网收不到，客户机上仍会用到期为止。')) return;
  await api('/api/revoke', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: rec.code }),
  });
  refresh();
}

$('q').oninput = render;
$('showRevoked').onchange = render;
refresh();
</script>
</body>
</html>`;
}

function cmdServe() {
  const port = Number(args.port || 5188);
  const server = http.createServer(async (req, res) => {
    const send = (code, body, type) => {
      res.writeHead(code, { 'Content-Type': type || 'application/json; charset=utf-8' });
      res.end(body);
    };
    const url = new URL(req.url, `http://127.0.0.1:${port}`);

    try {
      if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
        return send(200, htmlPage(), 'text/html; charset=utf-8');
      }
      if (req.method === 'GET' && url.pathname === '/api/list') {
        const v = vault.loadVault();
        return send(200, JSON.stringify({ ok: true, stats: vault.stats(v), licenses: v.licenses, vaultPath: vault.vaultPath() }));
      }
      if (req.method === 'GET' && url.pathname === '/api/settings') {
        const v = vault.loadVault();
        const list = vault.readRevocationList();
        let parsed = null;
        try {
          parsed = JSON.parse(
            Buffer.from(String(list.blob).split('.')[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
          );
        } catch {
          parsed = null;
        }
        return send(
          200,
          JSON.stringify({
            ok: true,
            settings: v.settings,
            revocation: { count: parsed?.revoked?.length ?? 0, updatedAt: parsed?.t ?? 0, blob: list.blob, file: list.file },
          })
        );
      }
      if (req.method === 'POST' && url.pathname === '/api/settings') {
        const body = JSON.parse(await readBody(req));
        const settings = vault.saveSettings({
          revocationUrl: body.revocationUrl,
          recheckDays: body.recheckDays,
        });
        return send(200, JSON.stringify({ ok: true, settings }));
      }
      if (req.method === 'GET' && url.pathname === '/api/export') {
        const v = vault.loadVault();
        const rec = vault.find(v, url.searchParams.get('code'));
        if (!rec) return send(404, JSON.stringify({ ok: false, error: '找不到该授权码' }));
        return send(200, JSON.stringify({ ok: true, lease: rec.lease, code: rec.code }));
      }
      if (req.method === 'POST' && url.pathname === '/api/issue') {
        const body = JSON.parse(await readBody(req));
        const rec = vault.issue({
          deviceId: body.deviceId,
          label: body.label,
          days: body.days,
          expires: body.expires,
          permanent: body.permanent,
        });
        return send(200, JSON.stringify({ ok: true, record: rec }));
      }
      if (req.method === 'POST' && url.pathname === '/api/renew') {
        const body = JSON.parse(await readBody(req));
        const rec = vault.renew(body.code, { days: body.days, expires: body.expires, permanent: body.permanent });
        return send(200, JSON.stringify({ ok: true, record: rec }));
      }
      if (req.method === 'POST' && url.pathname === '/api/revoke') {
        const body = JSON.parse(await readBody(req));
        const rec = vault.revoke(body.code, body.reason);
        return send(200, JSON.stringify({ ok: true, record: rec }));
      }
      return send(404, JSON.stringify({ ok: false, error: 'Not Found' }));
    } catch (error) {
      return send(400, JSON.stringify({ ok: false, error: error.message }));
    }
  });

  // 只监听回环地址：局域网里别的机器连不上，私钥也就出不去
  server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${port}`;
    console.log('');
    console.log(`✅ 授权码控制台已启动：${url}`);
    console.log(`   台账 ${vault.vaultPath()}`);
    console.log(`   私钥 ${vault.keyFilePath()}（不联网、不上行）`);
    console.log('   Ctrl+C 停止');
    console.log('');
    if (args['no-open']) return;
    const open = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    try {
      exec(`${open} ${url}`);
    } catch {
      /* 打不开就算了，手动访问即可 */
    }
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

/* ------------------------------------------------------------------ */
/* 分发                                                                */
/* ------------------------------------------------------------------ */

switch (cmd) {
  case 'issue':
    cmdIssue();
    break;
  case 'list':
  case 'ls':
    cmdList();
    break;
  case 'show':
    cmdShow();
    break;
  case 'export':
    cmdExport();
    break;
  case 'renew':
    cmdRenew();
    break;
  case 'revoke':
    cmdRevoke();
    break;
  case 'unrevoke':
  case 'restore':
    cmdUnrevoke();
    break;
  case 'revocation':
  case 'rl':
    cmdRevocation();
    break;
  case 'config':
    cmdConfig();
    break;
  case 'stats':
    cmdStats();
    break;
  case 'serve':
  case 'ui':
    cmdServe();
    break;
  default:
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n/, ''));
}
