'use strict';

/**
 * 桌面端 AI 供应商配置。
 *
 * 为什么直接写全局配置而不是走既有的"用户级 Key"通道：
 * 桌面端是单用户本地实例，"用户配置"与"全局配置"在语义上等价。
 * 既有通道（components/ai-settings-dialog.tsx → localStorage → 随 chat 请求传 key）
 * 只覆盖 /api/chat，而 automation / knowledge / embedding 等模块调用
 * resolveProvider(modelId) 时并不带用户 key。写入全局配置可让所有 AI 模块
 * 一致生效，且无需改 20+ 处调用签名。
 *
 * 文件位置：<serverRoot>/data/ai-providers-config.json
 * 打包后该目录已由 links.js 重定向到 userData，写入不落在安装目录。
 */

const fs = require('node:fs');
const path = require('node:path');
const logger = require('./logger');

const CONFIG_FILE = 'ai-providers-config.json';

/** 预置供应商：国内可直连，用户只需粘贴自己的 API Key */
const PRESETS = [
  {
    id: 'aliyun-bailian',
    name: '阿里云百炼（DashScope）',
    type: 'dashscope',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    keyHint: 'sk-…',
    consoleUrl: 'https://bailian.console.aliyun.com/',
    models: [
      { id: 'qwen-max', name: 'Qwen Max', icon: 'qwen', enabled: true, supportsVision: true, supportsReasoning: true },
      { id: 'qwen-plus', name: 'Qwen Plus', icon: 'qwen', enabled: true, supportsVision: true, supportsReasoning: false },
      { id: 'qwen-turbo', name: 'Qwen Turbo', icon: 'qwen', enabled: true },
    ],
  },
  {
    id: 'zhipu',
    name: '智谱 GLM（BigModel）',
    type: 'glm',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    keyHint: 'xxxxx.xxxxx',
    consoleUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    models: [
      { id: 'glm-4-plus', name: 'GLM-4-Plus', icon: 'zhipu', enabled: true, supportsVision: true, supportsReasoning: true },
      { id: 'glm-4-flash', name: 'GLM-4-Flash', icon: 'zhipu', enabled: true, supportsReasoning: false },
    ],
  },
  {
    // Kimi 月之暗面开放平台：OpenAI 完全兼容，但采样参数被上游钉死
    // （temperature / top_p / n / presence_penalty / frequency_penalty 均为固定值，
    //  显式传入不同值会被 400 invalid_request_error 拒绝）。
    // 请求体清洗在服务端 lib/ai/provider-body-adapter.ts 统一做，这里只需填对 baseUrl。
    // 文档：https://platform.kimi.com/docs/api/models-overview
    id: 'kimi',
    name: 'Kimi（月之暗面）',
    type: 'moonshot',
    baseUrl: 'https://api.moonshot.cn/v1',
    keyHint: 'sk-…',
    consoleUrl: 'https://platform.kimi.com/console/api-keys',
    models: [
      { id: 'kimi-k3', name: 'Kimi K3', icon: 'moonshot', enabled: true, supportsVision: true, supportsReasoning: true },
      { id: 'kimi-k2.7-code-highspeed', name: 'Kimi K2.7 Code 高速版', icon: 'moonshot', enabled: true, supportsReasoning: true },
      { id: 'kimi-k2.6', name: 'Kimi K2.6', icon: 'moonshot', enabled: true, supportsReasoning: true },
    ],
  },
  {
    id: 'siliconflow',
    name: '硅基流动（SiliconFlow）',
    type: 'openai',
    baseUrl: 'https://api.siliconflow.cn/v1',
    keyHint: 'sk-…',
    consoleUrl: 'https://cloud.siliconflow.cn/account/ak',
    models: [
      { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', icon: 'deepseek', enabled: true, supportsReasoning: true },
      { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5 72B', icon: 'qwen', enabled: true },
    ],
  },
  {
    id: 'custom-openai',
    name: '自定义 OpenAI 兼容端点',
    type: 'openai',
    baseUrl: '',
    keyHint: 'sk-…',
    consoleUrl: '',
    models: [],
  },
];

function configPath(serverRoot) {
  return path.join(serverRoot, 'data', CONFIG_FILE);
}

function read(serverRoot) {
  try {
    return JSON.parse(fs.readFileSync(configPath(serverRoot), 'utf8'));
  } catch {
    return { providers: [] };
  }
}

/** 是否已配置可用供应商（有凭据且至少一个启用模型） */
function isConfigured(serverRoot) {
  const config = read(serverRoot);
  return Array.isArray(config.providers)
    && config.providers.some((p) => p && p.enabled !== false && p.apiKey && Array.isArray(p.models) && p.models.length > 0);
}

/**
 * 写入（合并/新增）一个供应商。
 *
 * 与 adminUI（app/api/admin/ai-providers）的数据模型对齐：
 * - 只 upsert 目标 provider，**保留**其余供应商（旧实现整表替换，
 *   桌面端永远只能有一个供应商 —— 与 adminUI 多供应商融合冲突）；
 * - 被保存的供应商标记 isDefault，其余取消；
 * - defaultModelId 校验归属（必须能在该供应商的模型里找到）。
 *
 * @param {string} serverRoot
 * @param {{ providerId: string, apiKey: string, baseUrl?: string, model?: string }} input
 */
function save(serverRoot, input) {
  const preset = PRESETS.find((p) => p.id === input.providerId);
  if (!preset) throw new Error(`未知的供应商：${input.providerId}`);

  const apiKey = String(input.apiKey || '').trim();
  if (!apiKey) throw new Error('API Key 不能为空');

  const baseUrl = String(input.baseUrl || preset.baseUrl || '').trim();
  if (!baseUrl) throw new Error('Base URL 不能为空（自定义端点必须填写）');

  // ⚠️ 浅拷贝：preset.models 是 PRESETS 常量的共享引用，下方可能 push 新模型，
  // 直接引用会把用户自填的模型污染进进程级常量。
  const models = preset.models.length
    ? preset.models.slice()
    : [{ id: input.model || input.defaultModelId || 'gpt-4o-mini', name: input.model || input.defaultModelId || 'gpt-4o-mini', enabled: true }];

  const now = new Date().toISOString();
  const existing = read(serverRoot);
  const prev = (existing.providers || []).find((p) => p && p.id === preset.id);

  const provider = {
    id: preset.id,
    name: preset.name,
    type: preset.type,
    baseUrl,
    apiKey,
    models,
    enabled: true,
    isDefault: true,
    priority: prev?.priority || 1,
    createdAt: prev?.createdAt || now,
    updatedAt: now,
  };

  // upsert：其余供应商原样保留
  const providers = (existing.providers || []).filter((p) => p && p.id !== preset.id);
  providers.unshift(provider);
  providers.forEach((p) => { if (p.id !== preset.id) p.isDefault = false; });

  // 默认模型：显式指定（defaultModelId 优先，其次 model）→ 不在模型列表时
  // **自动注册**到当前供应商（自定义端点 / 预设外新模型，如 zai-org/GLM-5.3），
  // 保证 resolveProvider 运行时可解析，不再静默吞掉用户手填的 id；
  // 否则用该供应商第一个模型；再否则维持原值
  let defaultModelId;
  const explicitModel = String(input.defaultModelId || input.model || '').trim();
  if (explicitModel) {
    if (!models.some((m) => m && m.id === explicitModel)) {
      models.push({ id: explicitModel, name: explicitModel, enabled: true });
    }
    defaultModelId = explicitModel;
  } else if (models.length > 0) {
    defaultModelId = models[0].id;
  } else {
    defaultModelId = existing.defaultModelId;
  }

  const config = {
    ...existing,
    providers,
    defaultModelId: defaultModelId || existing.defaultModelId,
    // 保留既有 embedding / 搜索配置；未配置时给安全默认。
    // 联网搜索默认走内置本地引擎（零 Key、无需任何外部服务）——向导这一步之后再被
    // lib/web-search.js#ensureWebSearch 重新评估，能拿到服务端 key 时会自动升级到 Exa。
    embeddingConfig: existing.embeddingConfig || { providerId: '', model: '', enabled: false },
    creditConfig: existing.creditConfig || { enabled: false },
    webSearchConfig: existing.webSearchConfig || {
      enabled: true,
      providerId: '',
      protocol: 'local',
      apiKey: '',
      defaultCount: 8,
      managedBy: 'desktop-auto',
    },
  };

  const file = configPath(serverRoot);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(config, null, 2), 'utf8');
  logger.info('ai-provider', `已写入供应商配置 provider=${preset.id} model=${config.defaultModelId}`);

  return config;
}

/** key 脱敏：前 4 后 4（与 adminUI GET 的回显规则一致） */
function maskKey(key) {
  if (!key) return '';
  return `${key.slice(0, 4)}${'*'.repeat(Math.max(0, key.length - 8))}${key.slice(-4)}`;
}

/**
 * 供应商清单（key 脱敏）+ 默认模型，供向导「已配置供应商」区回显。
 * 与 adminUI 的 GET /api/admin/ai-providers 输出口径一致。
 */
function list(serverRoot) {
  const config = read(serverRoot);
  const providers = (config.providers || []).map((p) => ({
    ...p,
    apiKey: maskKey(p.apiKey),
  }));
  return { providers, defaultModelId: config.defaultModelId || '' };
}

/**
 * 删除供应商。
 * 若被删的是默认模型归属，defaultModelId 回退为剩余供应商的第一个启用模型。
 */
function remove(serverRoot, providerId) {
  const config = read(serverRoot);
  const providers = (config.providers || []).filter((p) => p && p.id !== providerId);
  if (providers.length === (config.providers || []).length) {
    return config; // 不存在，原样返回
  }
  const ownedDefault = (config.providers || []).find(
    (p) => p && p.id === providerId
      && Array.isArray(p.models) && p.models.some((m) => m && m.id === config.defaultModelId),
  );
  if (ownedDefault) {
    const next = providers.find((p) => p && p.enabled !== false && Array.isArray(p.models) && p.models.length > 0);
    config.defaultModelId = next ? next.models[0].id : undefined;
  }
  config.providers = providers;
  const file = configPath(serverRoot);
  fs.writeFileSync(file, JSON.stringify(config, null, 2), 'utf8');
  logger.info('ai-provider', `已删除供应商 provider=${providerId} defaultModel=${config.defaultModelId || '(空)'}`);
  return config;
}

module.exports = { PRESETS, read, isConfigured, save, list, remove, maskKey, configPath, CONFIG_FILE };
