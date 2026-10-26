#!/usr/bin/env node
/**
 * 生成桌面端授权签名密钥对（Ed25519）。
 *
 * 用法：
 *   node scripts/desktop/generate-license-keys.mjs            # 首次生成
 *   node scripts/desktop/generate-license-keys.mjs --force    # 重新生成
 *
 * 产出三处：
 *   1. data/desktop-license-keys.json          —— 服务端读它来签租约（本地开发用；生产请用环境变量）
 *   2. desktop/lib/license-public-key.js       —— 桌面端内置公钥（随安装包分发，可提交）
 *   3. 终端输出两条环境变量 —— 部署到服务器时写进 .env：
 *        DESKTOP_LICENSE_PRIVATE_KEY=...
 *        DESKTOP_LICENSE_PUBLIC_KEY=...
 *
 * ⚠️ 重新生成会让**已签发并已激活**的桌面端全部失效（旧租约验签不通过），
 *    必须同时重新打包桌面端才配套。
 */

import { generateKeyPairSync, createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const keyFile = path.join(root, 'data', 'desktop-license-keys.json');
const pubFile = path.join(root, 'desktop', 'lib', 'license-public-key.js');
const force = process.argv.includes('--force');

if (fs.existsSync(keyFile) && !force) {
  console.log(`密钥已存在：${keyFile}`);
  console.log('如需重新生成请加 --force（会使已激活的客户端全部失效，需重新打包桌面端）');
  process.exit(0);
}

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const priv = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64');
const pub = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
// 公钥指纹：写进 desktop/lib/license-public-key.js，客户端加载时比对，
// 防止"把内置公钥换成攻击者自己的公钥"这种最简单的绕过手法
const fingerprint = createHash('sha256').update(pub).digest('hex');

fs.mkdirSync(path.dirname(keyFile), { recursive: true });
fs.writeFileSync(keyFile, JSON.stringify({ privateKey: priv, publicKey: pub }, null, 2), { mode: 0o600 });

fs.writeFileSync(
  pubFile,
  [
    "'use strict';",
    '',
    '/**',
    ' * 授权签名公钥（base64 编码的 SPKI DER）。',
    ' *',
    ' * 由 `node scripts/desktop/generate-license-keys.mjs` 生成 —— 不要手改。',
    ` * 生成时间：${new Date().toISOString()}`,
    ' *',
    ' * 公钥随安装包分发是安全的：它只能验证租约，无法签发。',
    ' */',
    '',
    `module.exports = {`,
    `  publicKey: '${pub}',`,
    `  fingerprint: '${fingerprint}',`,
    `};`,
    '',
  ].join('\n'),
  'utf8'
);

console.log('✅ 已生成 Ed25519 授权签名密钥对');
console.log(`   私钥文件：${keyFile}（已加入 .gitignore，请勿提交）`);
console.log(`   公钥文件：${pubFile}`);
console.log('');
console.log('部署到服务器时，把下面两行写进 .env（或用环境变量注入）：');
console.log('');
console.log(`DESKTOP_LICENSE_PRIVATE_KEY=${priv}`);
console.log(`DESKTOP_LICENSE_PUBLIC_KEY=${pub}`);
console.log('');
