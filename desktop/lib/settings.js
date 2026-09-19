'use strict';

/**
 * 桌面端本地服务配置（由首启向导/“本地服务配置”入口写入）。
 *
 * 为什么需要这一层：
 * 业务侧的 MQTT / 语音 / 密钥全部从 **环境变量** 读取（lib/mqtt-config.ts、
 * lib/db/settings-service.ts 等），而打包后的桌面应用无法让用户去改 .env 再重启。
 * 因此把配置持久化到 userData，并在每次拉起 Next / WS 子进程时注入成环境变量 ——
 * 用户改完配置重启应用即生效，无需重新构建。
 *
 * 存放位置：<userData>/server-data/desktop-settings.json（权限 0600）
 */

const fs = require('node:fs');
const path = require('node:path');
const logger = require('./logger');
const { LOCAL_MQTT, DEFAULT_PORTS } = require('./config');

const FILE = 'desktop-settings.json';

/**
 * 不允许由用户环境变量覆盖的键 —— 这些由启动器自己管理，
 * 被覆盖会直接破坏进程编排（端口冲突 / 连错库 / 拿不到密钥）。
 */
const ENV_DENYLIST = new Set([
  'PORT',
  'HOSTNAME',
  'NODE_ENV',
  'NODE_OPTIONS',
  'PATH',
  'PATHEXT',
  'SystemRoot',
  'COMSPEC',
  'ELECTRON_RUN_AS_NODE',
  'DATABASE_URL',
  'NEXT_SERVER_URL',
  'JWT_SECRET',
  'INTERNAL_API_SECRET',
  'WS_SERVER_PORT',
  'YJS_WS_PORT',
  'YJS_WS_HOST',
]);

/** 默认 MQTT 主题（与 lib/mqtt-config.ts 的 DEFAULT_CONFIG 对齐） */
const DEFAULT_TOPICS = {
  subscribeTopic: 'stravision/devices/+/data',
  publishTopic: 'stravision/devices/control',
};

function defaults() {
  return {
    ai: { providerId: '', baseUrl: '', apiKey: '', model: '' },
    mqtt: {
      // local = 使用应用内置 broker（离线默认）；remote = 连接自建/云端 broker
      mode: 'local',
      host: '127.0.0.1',
      port: DEFAULT_PORTS.mqtt,
      username: LOCAL_MQTT.username,
      password: LOCAL_MQTT.password,
      subscribeTopic: DEFAULT_TOPICS.subscribeTopic,
      publishTopic: DEFAULT_TOPICS.publishTopic,
      useSSL: false,
      keepalive: 60,
      reconnectPeriod: 5000,
    },
    voice: { dashscopeApiKey: '' },
    env: [],
    secrets: { jwtSecret: '', internalApiSecret: '' },
    // 本机摄像头接入地址（业务侧 /api/greenhouse/cameras 写入，见该路由的落盘逻辑）。
    // 存这里是为了在嵌入式 PG 数据目录被重建时仍能恢复用户配置。
    cameras: { cameraAUrl: '', cameraBUrl: '' },
    // 首启向导收集的外观与偏好。管理后台「个性化」页是权威入口，
    // 这里只在用户首次进入应用前记下意向，业务侧首登后据此回填。
    personal: { assistantName: '', userAddress: '', theme: 'system' },
  };
}

function filePath(dataRoot) {
  return path.join(dataRoot, FILE);
}

/** 合并默认值，容忍旧版本文件缺字段 */
function normalize(raw) {
  const base = defaults();
  if (!raw || typeof raw !== 'object') return base;

  const out = {
    ...base,
    ...raw,
    ai: { ...base.ai, ...(raw.ai || {}) },
    mqtt: { ...base.mqtt, ...(raw.mqtt || {}) },
    voice: { ...base.voice, ...(raw.voice || {}) },
    secrets: { ...base.secrets, ...(raw.secrets || {}) },
    cameras: { ...base.cameras, ...(raw.cameras || {}) },
    personal: { ...base.personal, ...(raw.personal || {}) },
    env: Array.isArray(raw.env) ? raw.env : [],
  };

  if (out.mqtt.mode !== 'remote') out.mqtt.mode = 'local';
  const port = Number(out.mqtt.port);
  out.mqtt.port = Number.isInteger(port) && port > 0 && port < 65536 ? port : base.mqtt.port;
  out.mqtt.useSSL = out.mqtt.useSSL === true || out.mqtt.useSSL === 'true';
  out.mqtt.keepalive = Number.isFinite(Number(out.mqtt.keepalive)) ? Number(out.mqtt.keepalive) : base.mqtt.keepalive;
  out.mqtt.reconnectPeriod = Number.isFinite(Number(out.mqtt.reconnectPeriod))
    ? Number(out.mqtt.reconnectPeriod)
    : base.mqtt.reconnectPeriod;

  return out;
}

function read(dataRoot) {
  try {
    return normalize(JSON.parse(fs.readFileSync(filePath(dataRoot), 'utf8')));
  } catch {
    return defaults();
  }
}

/**
 * 保存（浅合并顶层键）。返回保存后的完整配置。
 * @param {string} dataRoot
 * @param {object} patch 形如 { ai, mqtt, voice, env }
 */
function save(dataRoot, patch) {
  const current = read(dataRoot);
  const next = normalize({ ...current, ...(patch || {}) });

  // 先校验再落盘 —— 不让一份坏配置写进去，否则下次启动子进程会直接起不来
  const errors = validate(next);
  if (errors.length) throw new Error(errors.join('；'));

  const file = filePath(dataRoot);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(next, null, 2), { mode: 0o600 });
  logger.info('settings', `已保存本地服务配置 mqtt.mode=${next.mqtt.mode}`);
  return next;
}

/** 校验：远程 broker 必须给全 host/username/password/topic */
function validate(settings) {
  const errors = [];
  const m = settings.mqtt;

  if (m.mode === 'remote') {
    if (!m.host || !String(m.host).trim()) errors.push('MQTT 服务器地址不能为空');
    if (!m.username || !String(m.username).trim()) errors.push('MQTT 用户名不能为空');
    if (!m.password || !String(m.password).trim()) errors.push('MQTT 密码不能为空');
  }
  if (!m.subscribeTopic || !String(m.subscribeTopic).trim()) errors.push('订阅主题不能为空');
  if (!m.publishTopic || !String(m.publishTopic).trim()) errors.push('发布主题不能为空');

  return errors;
}

/**
 * 把配置转成注入给子进程的环境变量。
 * 只返回**需要覆盖**的键；调用方负责与基础 env 合并。
 *
 * @param {object} settings
 * @param {{ localMqttPort: number }} ctx
 */
function toEnv(settings, ctx) {
  const env = {};
  const m = settings.mqtt;

  if (m.mode === 'remote') {
    env.MQTT_HOST = String(m.host).trim();
    env.MQTT_PORT = String(m.port);
    env.MQTT_USERNAME = String(m.username);
    env.MQTT_PASSWORD = String(m.password);
  } else {
    // 内置 broker：地址固定回环，端口来自端口策略
    env.MQTT_HOST = '127.0.0.1';
    env.MQTT_PORT = String(ctx.localMqttPort);
    env.MQTT_USERNAME = LOCAL_MQTT.username;
    env.MQTT_PASSWORD = LOCAL_MQTT.password;
  }

  env.MQTT_SUBSCRIBE_TOPIC = m.subscribeTopic;
  env.MQTT_PUBLISH_TOPIC = m.publishTopic;
  env.MQTT_USE_SSL = m.useSSL ? 'true' : 'false';
  env.MQTT_KEEPALIVE = String(m.keepalive);
  env.MQTT_RECONNECT_PERIOD = String(m.reconnectPeriod);

  // 语音兜底 Key：lib/db/settings-service.ts 的 resolveVoiceApiKey 在
  // “独立 Key → AI 供应商共享 Key → 环境变量”三级里最后才用它。
  // 桌面端保留这条，供用户单独指定语音用的 Key。
  const voiceKey = String(settings.voice?.dashscopeApiKey || '').trim();
  if (voiceKey) env.DASHSCOPE_API_KEY = voiceKey;

  // 自定义环境变量（用户在向导里逐条添加）
  const skipped = [];
  for (const item of settings.env || []) {
    const key = String(item?.key || '').trim();
    const value = item?.value == null ? '' : String(item.value);
    if (!key) continue;
    if (ENV_DENYLIST.has(key)) {
      skipped.push(key);
      continue;
    }
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      skipped.push(key);
      continue;
    }
    env[key] = value;
  }
  if (skipped.length) {
    logger.warn('settings', `以下环境变量被忽略（保留字或非法名）：${skipped.join(', ')}`);
  }

  return env;
}

module.exports = {
  FILE,
  DEFAULT_TOPICS,
  ENV_DENYLIST,
  defaults,
  read,
  save,
  validate,
  toEnv,
  filePath,
};
