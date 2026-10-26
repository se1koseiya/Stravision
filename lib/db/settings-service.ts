import { initDB, queryOne, execute } from "./database"
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto"

// ===========================================================================
// API Key 加密/解密工具（AES-256-GCM）
// 用于语音模块独立 API Key 的安全存储。
// 主密钥从环境变量 VOICE_KEY_ENCRYPTION_SECRET 派生，静态存储为密文。
// ===========================================================================

const ENCRYPTION_ALGORITHM = "aes-256-gcm"
const KEY_DERIVATION_SALT = "berry-realm-voice-key-salt-v1"

/** 从环境变量派生 32 字节密钥；若无环境变量则使用内置默认值（仅开发环境） */
function getEncryptionKey(): Buffer {
  const secret = process.env.VOICE_KEY_ENCRYPTION_SECRET || "berry-realm-default-encryption-key-do-not-use-in-prod"
  return scryptSync(secret, KEY_DERIVATION_SALT, 32)
}

/** 加密明文 API Key，返回 base64 字符串（格式: iv:authTag:ciphertext） */
function encryptApiKey(plaintext: string): string {
  if (!plaintext) return ""
  const key = getEncryptionKey()
  const iv = randomBytes(12) // GCM 推荐 12 字节 IV
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`
}

/** 解密 API Key 密文，返回明文 */
function decryptApiKey(ciphertext: string): string {
  if (!ciphertext) return ""
  // 兼容未加密的旧数据（直接返回原文）
  if (!ciphertext.includes(":")) return ciphertext
  try {
    const key = getEncryptionKey()
    const [ivB64, authTagB64, dataB64] = ciphertext.split(":")
    const iv = Buffer.from(ivB64, "base64")
    const authTag = Buffer.from(authTagB64, "base64")
    const encrypted = Buffer.from(dataB64, "base64")
    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return decrypted.toString("utf8")
  } catch (error) {
    console.error("[VoiceKey] Decryption failed:", error)
    return ""
  }
}

/** 脱敏显示：仅显示前 4 位 + *** + 后 4 位；过短的 key 全部用 *** 代替 */
function maskApiKey(key: string): string {
  if (!key) return ""
  if (key.length <= 8) return "***"
  return `${key.slice(0, 4)}***${key.slice(-4)}`
}

export interface RateLimitConfig {
  limit: number
  windowMs: number
  violationLimit: number // Before auto-ban
  banDuration: number // ms
}

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  limit: 300,
  windowMs: 60 * 1000,
  violationLimit: 20,
  banDuration: 15 * 60 * 1000 // 15 minutes
}

export async function getRateLimitConfig(): Promise<RateLimitConfig> {
  await initDB()
  const row = await queryOne<{ value: string }>("SELECT value FROM system_settings WHERE key = $1", ["rate_limit_config"])
  
  if (!row) return DEFAULT_RATE_LIMIT_CONFIG
  try {
    return JSON.parse(row.value)
  } catch (e) {
    return DEFAULT_RATE_LIMIT_CONFIG
  }
}

export async function updateRateLimitConfig(config: RateLimitConfig): Promise<void> {
  await initDB()
  const now = Date.now()
  await execute(
    `INSERT INTO system_settings (key, value, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ["rate_limit_config", JSON.stringify(config), now]
  )
}

// ===========================================================================
// 应用图标（品牌图标）
// 存储 key: app_icon
// 结构: { url: string | null, updatedAt: number }
// - url 为 null 表示使用内置默认图标（public/logo.png）
// - url 为 /uploads/... 时指向用户上传并持久化的图标文件
// 说明：全站 /logo.png（favicon、PWA manifest、侧边栏品牌位、邮件模板）统一由
//       app/api/branding/icon/route.ts 动态输出，因此修改此处即可全局生效。
// ===========================================================================

export interface AppIconConfig {
  /** 当前图标公开访问路径（如 /uploads/xxx.png）；null = 使用内置默认图标 */
  url: string | null
  /** 最近更新时间戳（ms）；0 表示从未自定义 */
  updatedAt: number
}

export const DEFAULT_APP_ICON_CONFIG: AppIconConfig = {
  url: null,
  updatedAt: 0,
}

export async function getAppIconConfig(): Promise<AppIconConfig> {
  await initDB()
  const row = await queryOne<{ value: string }>(
    "SELECT value FROM system_settings WHERE key = $1",
    ["app_icon"]
  )

  if (!row) return DEFAULT_APP_ICON_CONFIG
  try {
    const parsed = JSON.parse(row.value) as Partial<AppIconConfig>
    return {
      url: typeof parsed.url === "string" && parsed.url ? parsed.url : null,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    }
  } catch {
    return DEFAULT_APP_ICON_CONFIG
  }
}

export async function updateAppIconConfig(config: AppIconConfig): Promise<void> {
  await initDB()
  const now = Date.now()
  await execute(
    `INSERT INTO system_settings (key, value, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [
      "app_icon",
      JSON.stringify({ url: config.url, updatedAt: config.updatedAt || now }),
      now,
    ]
  )
}

export interface GreenhouseCameraUrls {
  cameraAUrl: string
  cameraBUrl: string
}

export const DEFAULT_GREENHOUSE_CAMERA_URLS: GreenhouseCameraUrls = {
  cameraAUrl: "",
  cameraBUrl: ""
}

export async function getGreenhouseCameraUrls(): Promise<GreenhouseCameraUrls> {
  await initDB()
  const row = await queryOne<{ value: string }>("SELECT value FROM system_settings WHERE key = $1", ["greenhouse_camera_urls"])

  if (!row) return DEFAULT_GREENHOUSE_CAMERA_URLS
  try {
    const parsed = JSON.parse(row.value) as Partial<GreenhouseCameraUrls>
    return {
      cameraAUrl: typeof parsed.cameraAUrl === "string" ? parsed.cameraAUrl : "",
      cameraBUrl: typeof parsed.cameraBUrl === "string" ? parsed.cameraBUrl : ""
    }
  } catch {
    return DEFAULT_GREENHOUSE_CAMERA_URLS
  }
}

export async function updateGreenhouseCameraUrls(urls: GreenhouseCameraUrls): Promise<void> {
  await initDB()
  const now = Date.now()
  await execute(
    `INSERT INTO system_settings (key, value, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ["greenhouse_camera_urls", JSON.stringify(urls), now]
  )
}

/**
 * Stepper Motor Position Control
 * Track current position of the camera slide (lead screw) in pulses.
 */
export async function getStepperPosition(): Promise<number> {
  await initDB()
  const row = await queryOne<{ value: string }>("SELECT value FROM system_settings WHERE key = $1", ["stepper_position_pulses"])
  
  if (!row) return 0 // Default to 0 (home)
  return parseInt(row.value) || 0
}

export async function updateStepperPosition(pulses: number): Promise<void> {
  await initDB()
  const now = Date.now()
  await execute(
    `INSERT INTO system_settings (key, value, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ["stepper_position_pulses", String(pulses), now]
  )
}

export type DeviceControlVersion = 'full' | 'simplified'
export type DashboardVersion = 'full' | 'simplified'

export async function getDeviceControlVersion(): Promise<DeviceControlVersion> {
  await initDB()
  const row = await queryOne<{ value: string }>("SELECT value FROM system_settings WHERE key = $1", ["device_control_version"])
  
  if (!row) return 'full'
  return (row.value === 'simplified' ? 'simplified' : 'full') as DeviceControlVersion
}

export async function updateDeviceControlVersion(version: DeviceControlVersion): Promise<void> {
  await initDB()
  const now = Date.now()
  await execute(
    `INSERT INTO system_settings (key, value, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ["device_control_version", version, now]
  )
}

export async function getDashboardVersion(): Promise<DashboardVersion> {
  await initDB()
  const row = await queryOne<{ value: string }>("SELECT value FROM system_settings WHERE key = $1", ["dashboard_version"])
  
  if (!row) return 'full'
  return (row.value === 'simplified' ? 'simplified' : 'full') as DashboardVersion
}

export async function updateDashboardVersion(version: DashboardVersion): Promise<void> {
  await initDB()
  const now = Date.now()
  await execute(
    `INSERT INTO system_settings (key, value, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ["dashboard_version", version, now]
  )
}

export type SpectrumDataSource = 'mcp' | 'mqtt'

export async function getSpectrumDataSource(): Promise<SpectrumDataSource> {
  await initDB()
  const row = await queryOne<{ value: string }>("SELECT value FROM system_settings WHERE key = $1", ["spectrum_data_source"])
  
  if (!row) return 'mcp'
  return (row.value === 'mqtt' ? 'mqtt' : 'mcp') as SpectrumDataSource
}

export async function updateSpectrumDataSource(source: SpectrumDataSource): Promise<void> {
  await initDB()
  const now = Date.now()
  await execute(
    `INSERT INTO system_settings (key, value, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ["spectrum_data_source", source, now]
  )
}

// ===========================================================================
// 语音助手配置（企业级 · 后端可配）
// 存储 key: voice_config
// 架构：语音模块的 API Key 与 AI 助理共用同一套 AI 提供商配置
//       （data/ai-providers-config.json），通过 providerId 引用。
//       TTS/ASR 的专用端点、模型、音色等参数在此配置。
// ===========================================================================

/** 语音架构模式（纯 Omni 一体化） */
export type VoiceArchitecture = "omni"

/** TTS 音色选项 */
export interface TtsVoiceOption {
  value: string
  label: string
}

/**
 * TTS 提供商类型（决定请求格式）。
 * - dashscope: 阿里云 DashScope，Bearer 认证，JSON body(input/parameters)，返回 audio.url
 * - unifiedtts: UnifiedTTS 聚合平台，X-API-Key 认证，flat JSON body，返回 data.audio_url
 * - openai: OpenAI 兼容格式，Bearer 认证，返回直接音频流
 * - baidu: 百度语音（Bearer bce-v3 认证）
 * - custom: 自定义格式（按 dashscope 兼容处理）
 */
export type TtsProviderType = "dashscope" | "unifiedtts" | "openai" | "baidu" | "custom"

/** TTS 专用参数（端点/模型/音色/格式）。API Key 由 AI 提供商统一管理。 */
export interface TtsApiConfig {
  /** 提供商类型（决定请求/响应格式） */
  providerType: TtsProviderType
  /** API 端点 URL（TTS 专用，与聊天端点不同） */
  endpoint: string
  /** 模型名 */
  model: string
  /** 默认音色 */
  defaultVoice: string
  /** 可选音色列表 */
  voices: TtsVoiceOption[]
  /** 音频格式：mp3 | wav | pcm */
  audioFormat: "mp3" | "wav" | "pcm"
  /** 采样率 */
  sampleRate: number
}

/**
 * ASR 提供商类型（决定请求格式）。
 * - dashscope: 阿里云 Qwen3-ASR-Flash，OpenAI 兼容接口，base64 音频上传
 * - baidu: 百度短语音识别，JSON(base64) 上传，result 数组返回
 * - openai: OpenAI Whisper 兼容格式，FormData 上传
 * - custom: 自定义格式（按 dashscope 兼容处理）
 */
export type AsrProviderType = "dashscope" | "baidu" | "openai" | "custom" | "browser"

/** ASR 专用参数（端点/模型/语言）。API Key 由 AI 提供商统一管理。 */
export interface AsrApiConfig {
  /** 提供商类型（决定请求/响应格式） */
  providerType: AsrProviderType
  /** API 端点 URL（HTTP 批量 ASR 专用） */
  endpoint: string
  /** 模型名（HTTP 批量 ASR） */
  model: string
  /** 默认语言 */
  defaultLanguage: string
  /** 默认方言 */
  defaultDialect: string
  /** 实时 ASR WebSocket 端点（仅 asrMode=realtime 时使用） */
  realtimeEndpoint?: string
  /** 实时 ASR 模型名（如 qwen-audio-3.0-asr-flash-streaming） */
  realtimeModel?: string
  /** 音频格式（pcm/wav/mp3/opus，默认 pcm） */
  format?: string
  /** 采样率（默认 16000） */
  sampleRate?: number
  /** VAD 断句静音阈值（毫秒，默认 500） */
  maxSentenceSilence?: number
}

/** VAD 参数（与前端 voice-config.ts 对齐） */
export interface VadServerConfig {
  silenceThreshold: number
  silenceDurationMs: number
  speechStartMs: number
  maxSegmentMs: number
  minSpeechMs: number
  adaptiveNoiseFloor: boolean
}

/**
 * Omni 一体化架构专用参数（WebSocket 实时流式）。
 * 与级联架构的 TTS/ASR HTTP 接口完全独立。
 */
export interface OmniApiConfig {
  /** 实时 WebSocket 端点（如 wss://dashscope.aliyuncs.com/api-ws/v1/realtime） */
  endpoint: string
  /** 模型名（如 qwen3-omni-flash-realtime） */
  model: string
  /** 默认音色（Omni 模式的输出音色） */
  voice: string
}

/** 完整语音配置（后端存储）。🚨 2026-09-24：asrMode 已退役（纯 Omni 架构无独立 ASR 阶段） */
export interface VoiceServerConfig {
  architecture: VoiceArchitecture
  /** 引用 AI 提供商 ID（来自 ai-providers-config.json），null=使用环境变量兜底 */
  providerId: string | null
  /** TTS 专用参数 */
  tts: TtsApiConfig
  /** ASR 专用参数 */
  asr: AsrApiConfig
  /** Omni 一体化架构专用参数 */
  omni: OmniApiConfig
  /** VAD 参数 */
  vad: VadServerConfig
  /** 是否默认朗读 AI 回复 */
  readAloud: boolean
  /** TTS 独立 API Key（AES-256-GCM 密文存储，空表示使用 AI 提供商共享 Key） */
  ttsApiKey?: string
  /** ASR 独立 API Key（AES-256-GCM 密文存储，空表示使用 AI 提供商共享 Key） */
  asrApiKey?: string
  /** Omni 独立 API Key（AES-256-GCM 密文存储，空表示使用 AI 提供商共享 Key） */
  omniApiKey?: string
}

/** API Key 状态信息（脱敏，用于前端展示） */
export interface VoiceKeyStatus {
  /** 是否已配置独立 Key */
  configured: boolean
  /** 脱敏显示值（如 sk-a***z9k2） */
  masked: string
  /** 更新时间戳（ms） */
  updatedAt?: number
}

export const DEFAULT_VOICE_SERVER_CONFIG: VoiceServerConfig = {
  architecture: "omni",
  providerId: "dashscope",
  tts: {
    providerType: "dashscope",
    endpoint: "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
    model: "qwen3-tts-flash",
    defaultVoice: "Cherry",
    voices: [
      { value: "Cherry", label: "Cherry（女声·温婉）" },
      { value: "Mochi", label: "Mochi（女声·活泼）" },
      { value: "Ethan", label: "Ethan（男声·沉稳）" },
      { value: "Serena", label: "Serena（女声·专业）" },
      { value: "Chelsie", label: "Chelsie（女声·清新）" },
    ],
    audioFormat: "mp3",
    sampleRate: 24000,
  },
  asr: {
    providerType: "dashscope",
    // Qwen3-ASR-Flash OpenAI 兼容接口（支持 base64 音频上传）
    // 也可使用专属域名：https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    model: "qwen3-asr-flash",
    defaultLanguage: "zh-CN",
    defaultDialect: "auto",
    // 实时 ASR（WebSocket 流式，边说边出字）
    realtimeEndpoint: "wss://dashscope.aliyuncs.com/api-ws/v1/inference",
    realtimeModel: "qwen-audio-3.0-asr-flash-streaming",
    format: "pcm",
    sampleRate: 16000,
    maxSentenceSilence: 500, // 对话场景推荐 400-600ms
  },
  omni: {
    // DashScope 实时 WebSocket 端点（Qwen-Omni-Realtime 系列）
    endpoint: "wss://dashscope.aliyuncs.com/api-ws/v1/realtime",
    model: "qwen3-omni-flash-realtime",
    // Tina 是 Qwen3.5-Omni 系列默认音色，向下兼容 qwen3-omni-flash-realtime
    voice: "Tina",
  },
  vad: {
    silenceThreshold: 0.02,
    // 对话场景推荐 300ms（实测更跟手，阿里云官方推荐 400）
    silenceDurationMs: 300,
    speechStartMs: 150,
    maxSegmentMs: 30000,
    minSpeechMs: 300,
    adaptiveNoiseFloor: true,
  },
  readAloud: true,
}

/**
 * 迁移旧版 VAD 默认值到新默认值。
 * - v1→v2: silenceDurationMs 1200 → 500
 * - v2→v3: silenceDurationMs 500 → 300（对话场景更跟手）
 * 仅当值等于旧默认值时迁移，用户自定义值保持不变。
 */
function migrateVadConfig(vad: VadServerConfig): VadServerConfig {
  if (vad.silenceDurationMs === 1200) vad.silenceDurationMs = 300
  if (vad.silenceDurationMs === 500) vad.silenceDurationMs = 300
  if (vad.speechStartMs === 250) vad.speechStartMs = 150
  if (vad.minSpeechMs === 400) vad.minSpeechMs = 300
  return vad
}

/** 深度合并：用户配置覆盖默认值（保证新增字段有默认值） */
function mergeVoiceConfig(saved: Partial<VoiceServerConfig> | null): VoiceServerConfig {
  if (!saved) return DEFAULT_VOICE_SERVER_CONFIG
  const merged: VoiceServerConfig = {
    architecture: "omni",
    providerId: typeof saved.providerId === "string" ? saved.providerId : (saved.providerId === null ? null : DEFAULT_VOICE_SERVER_CONFIG.providerId),
    tts: { ...DEFAULT_VOICE_SERVER_CONFIG.tts, ...(saved.tts ?? {}) },
    asr: { ...DEFAULT_VOICE_SERVER_CONFIG.asr, ...(saved.asr ?? {}) },
    omni: { ...DEFAULT_VOICE_SERVER_CONFIG.omni, ...(saved.omni ?? {}) },
    vad: migrateVadConfig({ ...DEFAULT_VOICE_SERVER_CONFIG.vad, ...(saved.vad ?? {}) }),
    readAloud: typeof saved.readAloud === "boolean" ? saved.readAloud : true,
    // 保留加密的 key 原样（不解密，仅在需要时按字段访问）
    ttsApiKey: saved.ttsApiKey,
    asrApiKey: saved.asrApiKey,
    omniApiKey: saved.omniApiKey,
  }

  // 自动迁移历史遗留的 DashScope ASR 配置到 Qwen3-ASR-Flash OpenAI 兼容接口：
  // 旧 endpoint (.../audio/asr 或 .../audio/asr/recognition) 使用 FormData 上传，
  // 旧 model (paraformer-realtime-v2) 是实时 WebSocket 模型，不支持 HTTP 上传。
  // 新方案统一使用 OpenAI 兼容接口（compatible-mode/v1/chat/completions + qwen3-asr-flash）。
  if (merged.asr.providerType === "dashscope") {
    if (merged.asr.endpoint.includes("/services/audio/asr")) {
      // 从旧 endpoint 提取域名，拼接新路径
      const domainMatch = merged.asr.endpoint.match(/^(https?:\/\/[^/]+)/)
      if (domainMatch) {
        merged.asr.endpoint = `${domainMatch[1]}/compatible-mode/v1/chat/completions`
      }
    }
    // OpenAI 兼容模式只支持 qwen3-asr-flash；
    // 以下模型均为实时 WebSocket 专用，不支持 HTTP 调用，需自动迁移到 qwen3-asr-flash。
    // 参考：https://help.aliyun.com/zh/model-studio/qwen-asr-api-reference
    const NON_HTTP_MODELS = [
      "paraformer-realtime-v2", "paraformer-realtime-v1",
      "paraformer-realtime-8k-v2", "paraformer-realtime-8k-v1",
      "qwen-audio-3.0-asr-flash-streaming",
      "fun-asr-realtime", "fun-asr-realtime-2026-02-28",
      "fun-asr-realtime-2025-11-07", "fun-asr-realtime-2025-09-15",
      "fun-asr-flash-8k-realtime", "fun-asr-flash-8k-realtime-2026-01-28",
      "qwen3-asr-flash-realtime", "qwen3-asr-flash-realtime-2026-02-10",
      "qwen3-asr-flash-realtime-2025-10-27",
    ]
    if (NON_HTTP_MODELS.includes(merged.asr.model) || merged.asr.model === "") {
      merged.asr.model = "qwen3-asr-flash"
    }
  }

  return merged
}

export async function getVoiceServerConfig(): Promise<VoiceServerConfig> {
  await initDB()
  const row = await queryOne<{ value: string }>(
    "SELECT value FROM system_settings WHERE key = $1",
    ["voice_config"]
  )
  if (!row) return DEFAULT_VOICE_SERVER_CONFIG
  try {
    return mergeVoiceConfig(JSON.parse(row.value))
  } catch {
    return DEFAULT_VOICE_SERVER_CONFIG
  }
}

export async function updateVoiceServerConfig(config: VoiceServerConfig): Promise<void> {
  await initDB()
  const now = Date.now()
  await execute(
    `INSERT INTO system_settings (key, value, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ["voice_config", JSON.stringify(config), now]
  )
}

/**
 * 解析语音模块 API Key。
 * 优先级：voice_config 中独立加密的 ttsApiKey/asrApiKey/omniApiKey → AI 提供商共享 Key → 环境变量兜底。
 * 这样语音模块既可与 AI 助理共用 Key，也可配置独立 Key 实现隔离与安全。
 *
 * @param providerId AI 提供商 ID（共享 Key 回退用）
 * @param scope "tts" | "asr" | "omni"，指定要读取哪个独立 Key
 */
export async function resolveVoiceApiKey(
  providerId: string | null,
  scope?: "tts" | "asr" | "omni"
): Promise<{ apiKey: string | null; providerName: string | null; source: "dedicated" | "shared" | "env" | "none" }> {
  // 1. 优先使用独立加密 Key
  if (scope) {
    const cfg = await getVoiceServerConfig()
    const encryptedKey = scope === "tts" ? cfg.ttsApiKey : scope === "asr" ? cfg.asrApiKey : cfg.omniApiKey
    if (encryptedKey) {
      const plaintext = decryptApiKey(encryptedKey)
      if (plaintext) {
        return { apiKey: plaintext, providerName: "独立 Key（语音专用）", source: "dedicated" }
      }
    }
  }

  // 2. 回退到 AI 提供商共享 Key
  const { readProvidersConfig } = await import("@/lib/ai/provider-resolver")
  const config = await readProvidersConfig()

  if (providerId) {
    const provider = config.providers.find((p) => p.id === providerId && p.enabled && p.apiKey)
    if (provider) {
      return { apiKey: provider.apiKey, providerName: provider.name, source: "shared" }
    }
  }

  const firstEnabled = config.providers.find((p) => p.enabled && p.apiKey)
  if (firstEnabled) {
    return { apiKey: firstEnabled.apiKey, providerName: firstEnabled.name, source: "shared" }
  }

  // 3. 环境变量兜底
  const envKey = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY
  if (envKey) {
    return { apiKey: envKey, providerName: "环境变量", source: "env" }
  }

  return { apiKey: null, providerName: null, source: "none" }
}

/**
 * 保存独立 API Key（加密后存储）。
 * @param scope "tts" | "asr" | "omni"
 * @param plaintext 明文 Key；传空字符串清除 Key
 */
export async function saveVoiceApiKey(scope: "tts" | "asr" | "omni", plaintext: string): Promise<void> {
  const cfg = await getVoiceServerConfig()
  const encrypted = plaintext ? encryptApiKey(plaintext) : ""
  const updated: VoiceServerConfig = {
    ...cfg,
    ttsApiKey: scope === "tts" ? encrypted : cfg.ttsApiKey,
    asrApiKey: scope === "asr" ? encrypted : cfg.asrApiKey,
    omniApiKey: scope === "omni" ? encrypted : cfg.omniApiKey,
  }
  await updateVoiceServerConfig(updated)
}

/**
 * 获取 API Key 脱敏状态（用于前端展示，不返回明文）。
 */
export async function getVoiceKeyStatus(scope: "tts" | "asr" | "omni"): Promise<VoiceKeyStatus> {
  const cfg = await getVoiceServerConfig()
  const encrypted = scope === "tts" ? cfg.ttsApiKey : scope === "asr" ? cfg.asrApiKey : cfg.omniApiKey
  if (!encrypted) return { configured: false, masked: "" }
  const plaintext = decryptApiKey(encrypted)
  return { configured: Boolean(plaintext), masked: maskApiKey(plaintext) }
}

/**
 * 返回脱敏后的语音配置（不含 API Key，仅返回是否已配置）。
 * 用于公开的 /api/voice/config 接口，供前端读取运行时参数。
 */
export async function getPublicVoiceConfig(): Promise<{
  architecture: VoiceArchitecture
  providerId: string | null
  tts: TtsApiConfig
  asr: AsrApiConfig
  omni: OmniApiConfig
  vad: VadServerConfig
  readAloud: boolean
  ttsKeyStatus: VoiceKeyStatus
  asrKeyStatus: VoiceKeyStatus
  omniKeyStatus: VoiceKeyStatus
  sharedApiKeyConfigured: boolean
  sharedProviderName: string | null
}> {
  const cfg = await getVoiceServerConfig()
  const [ttsKeyStatus, asrKeyStatus, omniKeyStatus, shared] = await Promise.all([
    getVoiceKeyStatus("tts"),
    getVoiceKeyStatus("asr"),
    getVoiceKeyStatus("omni"),
    resolveVoiceApiKey(cfg.providerId),
  ])
  return {
    architecture: cfg.architecture,
    providerId: cfg.providerId,
    tts: cfg.tts,
    asr: cfg.asr,
    omni: cfg.omni,
    vad: cfg.vad,
    readAloud: cfg.readAloud,
    ttsKeyStatus,
    asrKeyStatus,
    omniKeyStatus,
    sharedApiKeyConfigured: Boolean(shared.apiKey),
    sharedProviderName: shared.providerName,
  }
}
