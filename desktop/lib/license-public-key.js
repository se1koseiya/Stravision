'use strict';

/**
 * 授权签名公钥（base64 编码的 SPKI DER）。
 *
 * 由 `node scripts/desktop/generate-license-keys.mjs` 生成 —— 不要手改。
 * 生成时间：2026-09-29T07:11:24.270Z
 *
 * 公钥随安装包分发是安全的：它只能验证租约，无法签发。
 *
 * fingerprint = sha256(publicKey)，由生成脚本一并写入。
 * 客户端加载时会比对：只改 publicKey 而不改 fingerprint，会被判定为"客户端被篡改"并拒绝启动。
 * （当然这不是银弹 —— 它挡的是"随手替换公钥"，挡不住有耐心的逆向；配合混淆与 fuses 提高门槛。）
 */

module.exports = {
  publicKey: 'MCowBQYDK2VwAyEAXwnTY14ePmY99O6E8N6L4PpJgaqVZtXoNQO3mAgcPNA=',
  fingerprint: 'a25973eaf289463efaf01295e81a80bdd12b5d55bb69d8258cbc7a30b3a6644c',
};
