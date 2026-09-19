'use strict';

/**
 * 本地密钥持久化。
 *
 * JWT_SECRET 必须跨重启稳定 —— 若每次启动重新生成，用户所有登录态会立即失效。
 * INTERNAL_API_SECRET 用于 Next 服务端与 WebSocket 服务之间的内部鉴权。
 *
 * 存于 userData/server-data/secrets.json，仅本机用户态可读。
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const logger = require('./logger');

const REQUIRED_KEYS = ['JWT_SECRET', 'INTERNAL_API_SECRET'];

function load(dataRoot) {
  const file = path.join(dataRoot, 'secrets.json');

  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    data = {};
  }

  let changed = false;
  for (const key of REQUIRED_KEYS) {
    if (!data[key] || typeof data[key] !== 'string') {
      data[key] = crypto.randomBytes(32).toString('hex');
      changed = true;
    }
  }

  if (changed) {
    try {
      fs.writeFileSync(file, JSON.stringify(data, null, 2), { mode: 0o600 });
      logger.info('secrets', '已生成本地密钥并持久化（后续启动将复用）');
    } catch (err) {
      logger.error('secrets', `密钥写入失败: ${err.message}`);
    }
  }

  return data;
}

module.exports = { load };
