#!/usr/bin/env node
/**
 * 把吊销清单上传到 Gitee raw（`pnpm license:publish`）。
 *
 * 为什么单独做一个：
 *   清单改一次就要去网页上手动粘贴一次，迟早会漏 —— 漏了就意味着"作废没生效"。
 *   这个脚本调 Gitee 开放 API 直接提交文件，一条命令完成「重建清单 → 上传 → 校验可拉取」。
 *
 * 首次配置（之后配置存 data/desktop-publish-gitee.json，0600）：
 *   node scripts/desktop/publish-revocation.mjs \
 *     --repo <owner>/<repo> --token <私人令牌> [--branch master] [--path revoked.json]
 *
 * 日常用：
 *   node scripts/desktop/publish-revocation.mjs          # 重建清单并上传
 *   node scripts/desktop/publish-revocation.mjs --check  # 只校验现在线上那份能不能拉到
 *   node scripts/desktop/publish-revocation.mjs --set-rl  # 顺手把这个 raw 地址设为签发默认值
 *
 * ⚠️ 三条硬约束（踩了就是"作废不生效"）：
 *   1. **仓库必须公开** —— 私有仓库的 raw 链接会 302 到登录页，客户端 fetch 拿到的是 HTML；
 *   2. 私人令牌要有 `projects` 写权限（Gitee 设置 → 私人令牌）；
 *   3. Gitee raw 有 CDN 缓存，上传后**几分钟内**客户端拉到的可能还是旧清单 —— 急的话用直链里的
 *      `?timestamp=` 或改用 COS/R2。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as vault from './license-vault.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CFG_FILE = path.join(root, 'data', 'desktop-publish-gitee.json');

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

function loadCfg() {
  try {
    return JSON.parse(fs.readFileSync(CFG_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveCfg(cfg) {
  fs.mkdirSync(path.dirname(CFG_FILE), { recursive: true });
  fs.writeFileSync(CFG_FILE, JSON.stringify(cfg, null, 2), { mode: 0o600 });
}

const cfg = loadCfg();
const repo = String(args.repo || cfg.repo || '').trim();
const token = String(args.token || cfg.token || process.env.GITEE_TOKEN || '').trim();
const branch = String(args.branch || cfg.branch || 'master').trim();
const filePath = String(args.path || cfg.path || 'revoked.json').trim().replace(/^\/+/, '');

if (!/^[^/]+\/[^/]+$/.test(repo)) {
  die('缺少仓库名，格式 <owner>/<repo>，例如 --repo zarx/stravision-license');
}
if (!token) {
  die('缺少 Gitee 私人令牌：--token <令牌>（或设环境变量 GITEE_TOKEN）。\n   Gitee → 设置 → 私人令牌，需要 projects 写权限。');
}

const [owner, repoName] = repo.split('/');
/** Gitee raw 直链：客户端就是 GET 这个地址 */
const rawUrl = `https://gitee.com/${owner}/${repoName}/raw/${branch}/${filePath}`;

/* ------------------------------------------------------------------ */
/* Gitee API                                                           */
/* ------------------------------------------------------------------ */

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = data?.message || `HTTP ${res.status}`;
    throw new Error(`${method} ${url} 失败：${msg}`);
  }
  return data;
}

/** 取远端文件当前 sha（更新必填，新建则不需要） */
async function remoteSha() {
  try {
    const data = await api(
      'GET',
      `https://gitee.com/api/v5/repos/${owner}/${repoName}/contents/${filePath}?access_token=${encodeURIComponent(token)}&ref=${encodeURIComponent(branch)}`
    );
    return data?.sha || '';
  } catch {
    return ''; // 404 = 文件还不存在，走新建
  }
}

async function upload(content, sha) {
  const body = {
    access_token: token,
    content: Buffer.from(content, 'utf8').toString('base64'),
    message: `chore: 更新吊销清单 ${new Date().toISOString()}`,
    branch,
  };
  if (sha) body.sha = sha;
  await api('PUT', `https://gitee.com/api/v5/repos/${owner}/${repoName}/contents/${filePath}`, body);
}

/** 上传后实际拉一次，确认客户端视角能拿到同样的内容 */
async function verify(content) {
  const res = await fetch(`${rawUrl}?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
  const text = (await res.text()).trim();
  if (text === content.trim()) return { ok: true };
  // 常见：CDN 还没刷、或仓库私有（返回的是登录页 HTML）
  if (/登录|Sign in|<!DOCTYPE/i.test(text.slice(0, 200))) {
    return { ok: false, reason: '拉到的是登录页 —— 仓库多半是私有的，请改为公开仓库' };
  }
  return { ok: false, reason: '内容与刚上传的不一致（Gitee raw 有 CDN 缓存，等几分钟再验）' };
}

/* ------------------------------------------------------------------ */
/* 主流程                                                              */
/* ------------------------------------------------------------------ */

async function main() {
  saveCfg({ ...cfg, repo, branch, path: filePath, token });

  if (args.check) {
    const list = vault.readRevocationList();
    const r = await verify(list.blob);
    console.log('');
    console.log(`raw 直链  ${rawUrl}`);
    console.log(`客户端视角 ${r.ok ? '✅ 能拉到且与本地一致' : `❌ ${r.reason}`}`);
    console.log('');
    process.exit(r.ok ? 0 : 1);
  }

  const list = args['no-rebuild'] ? vault.readRevocationList() : vault.buildRevocationList();
  console.log('');
  console.log(`清单       ${list.file}`);
  console.log(`作废条数   ${list.revoked.length}`);

  const sha = await remoteSha();
  await upload(list.blob, sha);
  console.log(`已上传     ${repo}:${branch}/${filePath}（${sha ? '更新' : '新建'}）`);
  console.log(`raw 直链   ${rawUrl}`);

  if (args['set-rl']) {
    vault.saveSettings({ revocationUrl: rawUrl });
    console.log(`已设为默认清单地址（之后签发的码都会带上它）`);
  }

  const r = await verify(list.blob);
  console.log(`客户端视角 ${r.ok ? '✅ 能拉到且与本地一致' : `⚠️ ${r.reason}`}`);
  console.log('');

  if (!r.ok) process.exit(1);
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}\n`);
  process.exit(1);
});
