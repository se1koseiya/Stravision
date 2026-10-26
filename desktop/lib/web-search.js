'use strict';

/**
 * 桌面端联网搜索的「开箱即用」自动配置。
 *
 * 目标：用户装完打开就能用联网搜索，完全不需要知道 API Key / 协议这些东西。
 *
 * 三层降级（按顺序尝试，前一层失败自动落到下一层）：
 *   1. 向授权服务器换 key —— 主 key 只存在服务端环境变量里，桌面端按「授权码 + 设备指纹」
 *      换一把可吊销的 Exa key，走 Exa 协议（检索质量最好）。
 *   2. 构建期内置 key —— 见 lib/search-key.js。默认留空；仅在服务端还没配 key 池时应急。
 *   3. 内置本地引擎 —— protocol='local'，进程内聚合 Bing / 360 / DuckDuckGo。
 *      零 Key、零外部服务，**这一层永远成功**，所以「打开就有联网搜索」是硬保证。
 *
 * 幂等与尊重用户：
 *   - 已由 admin / 用户显式配置过（无 managedBy 标记）→ 一律不动，只在有改善时后台提示升级；
 *   - 由本模块自动写入的（managedBy = 'desktop-auto'）→ 后台定期重新评估，
 *     服务端后来补了 key 就能自动升级到 Exa，用户全程无感。
 *
 * 启动性能：
 *   只有「完全没配过」才同步等待（向导之前，splash 上会有提示）；
 *   已有可用配置则立即返回，刷新放到后台，绝不让网络拖慢启动。
 *
 * 落盘位置：<serverRoot>/data/ai-providers-config.json 的 webSearchConfig 字段
 * （与 adminUI 同一份配置，Next 侧 provider-resolver 按 mtime 失效缓存，写完即刻生效）。
 */

const fs = require('node:fs');
const path = require('node:path');

const aiProvider = require('./ai-provider');
const license = require('./license');
const logger = require('./logger');
const builtin = require('./search-key');

/** 自动写入的配置带这个标记，便于下次启动判断「能不能改」 */
const MANAGED_BY = 'desktop-auto';
/** 向服务端换 key 的超时（毫秒）；超时就走本地引擎，绝不拖慢启动 */
const PROVISION_TIMEOUT = 4000;
/** 后台刷新最小间隔：避免每次启动都去打服务端 */
const REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;
const DEFAULT_COUNT = 8;

const VALID_PROTOCOLS = ['zhipu', 'exa', 'anysearch', 'local'];

/** 默认配置：内置本地引擎，零依赖零成本 */
function localConfig(provisionedAt) {
  return {
    enabled: true,
    protocol: 'local',
    providerId: '',
    apiKey: '',
    defaultCount: DEFAULT_COUNT,
    managedBy: MANAGED_BY,
    provisionedAt: provisionedAt || Date.now(),
  };
}

function exaConfig(apiKey, defaultCount, provisionedAt) {
  return {
    enabled: true,
    protocol: 'exa',
    providerId: '',
    apiKey,
    defaultCount: defaultCount || DEFAULT_COUNT,
    managedBy: MANAGED_BY,
    provisionedAt: provisionedAt || Date.now(),
  };
}

/**
 * 向授权服务器换一把本机专属的搜索 key。
 * 任何失败（未激活 / 断网 / 服务端没配池子）都返回 null，由调用方降级。
 */
async function fetchProvisionedKey() {
  const record = license.read();
  if (!record || !record.code) {
    logger.info('web-search', '本机未激活，跳过服务端换 key');
    return null;
  }
  if (record.revokedAt) {
    logger.warn('web-search', '本机授权已吊销，跳过服务端换 key');
    return null;
  }

  const url = `${license.serverUrl()}/api/license/web-search-key`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVISION_TIMEOUT);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: record.code,
        deviceId: license.getDeviceId(),
        appVersion: '',
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      logger.warn('web-search', `服务端换 key 失败 HTTP ${res.status}`);
      return null;
    }
    const data = await res.json().catch(() => null);
    if (!data || data.ok !== true) {
      logger.warn('web-search', `服务端换 key 被拒绝：${data && data.error ? data.error : '未知原因'}`);
      return null;
    }
    if (data.protocol === 'local' || !data.apiKey) {
      logger.info('web-search', `服务端未配置 key 池（${data.reason || 'no_key'}），使用内置本地引擎`);
      return { protocol: 'local' };
    }
    logger.info('web-search', `已从服务端取得联网搜索凭据 ${data.keyHint || ''}（池 ${data.poolSize || 1} 把）`);
    return {
      protocol: 'exa',
      apiKey: String(data.apiKey),
      defaultCount: Number(data.defaultCount) || DEFAULT_COUNT,
    };
  } catch (err) {
    logger.warn('web-search', `服务端换 key 异常：${err && err.message ? err.message : err}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** 写出 webSearchConfig（其余字段原样保留）；检测到手动配置则放弃写入 */
function writeConfig(serverRoot, webSearchConfig) {
  // 重新读一次，避免覆盖这期间 adminUI / 向导写入的其他字段
  const config = aiProvider.read(serverRoot) || {};
  const existing = config.webSearchConfig;
  // 后台刷新期间用户可能刚在设置里手动改了：手动配置永远优先，放弃本次写入
  if (
    existing &&
    existing.managedBy !== MANAGED_BY &&
    existing.enabled === true &&
    VALID_PROTOCOLS.includes(existing.protocol)
  ) {
    logger.info('web-search', '检测到手动配置，放弃本次自动写入');
    return false;
  }
  const next = {
    ...config,
    providers: config.providers || [],
    embeddingConfig: config.embeddingConfig || { providerId: '', model: '', enabled: false },
    creditConfig: config.creditConfig || { enabled: false },
    webSearchConfig,
  };
  const file = aiProvider.configPath(serverRoot);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(next, null, 2), 'utf8');
  logger.info('web-search', `已写入联网搜索配置 protocol=${webSearchConfig.protocol}`);
  return true;
}

/**
 * 评估一次并落盘。
 * @returns {Promise<{protocol:string, source:string}>}
 */
async function provision(serverRoot) {
  const provisionedAt = Date.now();

  // ① 服务端下发（可吊销、按设备一把）
  const fromServer = await fetchProvisionedKey();
  if (fromServer && fromServer.protocol === 'exa' && fromServer.apiKey) {
    const written = writeConfig(serverRoot, exaConfig(fromServer.apiKey, fromServer.defaultCount, provisionedAt));
    return { protocol: 'exa', source: written ? 'server' : 'skipped' };
  }

  // ② 构建期内置应急 key
  const builtinKey = String((builtin && builtin.exaKey) || '').trim();
  if (builtinKey) {
    logger.warn('web-search', '使用安装包内置的应急搜索 key（会随安装包泄露，仅作过渡）');
    const written = writeConfig(serverRoot, exaConfig(builtinKey, builtin.defaultCount, provisionedAt));
    return { protocol: 'exa', source: written ? 'builtin' : 'skipped' };
  }

  // ③ 内置本地引擎：永远可用
  const written = writeConfig(serverRoot, localConfig(provisionedAt));
  return { protocol: 'local', source: written ? 'local' : 'skipped' };
}

/** 后台刷新：失败只记日志，不影响任何已生效配置 */
function refreshInBackground(serverRoot) {
  provision(serverRoot)
    .then((r) => logger.info('web-search', `后台刷新完成 protocol=${r.protocol} source=${r.source}`))
    .catch((err) => logger.warn('web-search', `后台刷新失败：${err && err.message ? err.message : err}`));
}

/**
 * 确保 webSearchConfig 可用。幂等：可以每次启动都调。
 *
 * @param {string} serverRoot 服务端运行根目录（配置文件所在 data/ 的父级）
 * @returns {Promise<{ changed:boolean, protocol:string, source:string }>}
 */
async function ensureWebSearch(serverRoot) {
  const config = aiProvider.read(serverRoot) || {};
  const current = config.webSearchConfig;

  const usable = !!current && current.enabled === true && VALID_PROTOCOLS.includes(current.protocol);

  // 已显式配置（admin 后台 / 用户自己设过）→ 尊重，绝不动
  if (usable && current.managedBy !== MANAGED_BY) {
    logger.info('web-search', `沿用手动配置 protocol=${current.protocol}`);
    return { changed: false, protocol: current.protocol, source: 'manual' };
  }

  // 自动配置且仍可用 → 立刻返回不阻塞启动，按 TTL 决定要不要后台刷新
  if (usable) {
    const age = Date.now() - Number(current.provisionedAt || 0);
    if (age > REFRESH_INTERVAL_MS) {
      refreshInBackground(serverRoot);
    }
    logger.info('web-search', `沿用自动配置 protocol=${current.protocol}`);
    return { changed: false, protocol: current.protocol, source: 'auto-cached' };
  }

  // 完全没配过 / 配置损坏 → 同步配置（此时才值得等一次网络）
  const r = await provision(serverRoot);
  return { changed: true, protocol: r.protocol, source: r.source };
}

module.exports = { ensureWebSearch, fetchProvisionedKey, provision, MANAGED_BY };
