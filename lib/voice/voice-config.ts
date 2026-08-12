/**
 * 语音助手配置层
 *
 * 设计目标（企业级）：
 * 1. 纯 Omni 架构 —— 直接使用阿里云实时全模态模型（Qwen-Omni-Realtime 系列），ASR+LLM+TTS 一体化。
 * 2. VAD 参数可调 —— 静音断句时长、能量阈值、自适应噪声底等。
 * 3. 音色 / 语言统一 —— 收敛历史上分散的默认音色（Mochi / Cherry 不一致问题）。
 * 4. 多来源合并 —— 环境变量（部署默认）+ localStorage（运行时用户覆盖）+ 传入覆盖。
 * 5. Zod 校验 —— 非法值自动回退默认，绝不抛错中断语音会话。
 *
 * 仅在客户端使用（依赖 localStorage / window）。
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const VoiceArchitectureSchema = z.enum(["omni"]);
export type VoiceArchitecture = z.infer<typeof VoiceArchitectureSchema>;

/**
 * ASR 模式
 * - batch: 批量识别（录音→上传→HTTP 识别），延迟高但兼容所有 providerType
 * - realtime: 实时流式识别（WebSocket 边说边出字），低延迟，仅 dashscope providerType 支持
 */
export const AsrModeSchema = z.enum(["batch", "realtime"]);
export type AsrMode = z.infer<typeof AsrModeSchema>;

export const VadConfigSchema = z.object({
  /** 静音判定阈值（RMS 能量 0~1），低于该值视为安静 */
  silenceThreshold: z.number().min(0.001).max(0.5).default(0.02),
  /** 持续静音多久（毫秒）认为一句话结束。对话场景推荐 150ms（低延迟跟手） */
  silenceDurationMs: z.number().int().min(100).max(5000).default(150),
  /** 持续有声多久（毫秒）认为真正开始说话（防噪声误触发） */
  speechStartMs: z.number().int().min(50).max(2000).default(80),
  /** 单段最长录音时长（毫秒），超过强制断句 */
  maxSegmentMs: z.number().int().min(3000).max(60000).default(30000),
  /** 最短有效语音时长（毫秒），过短视为噪声丢弃 */
  minSpeechMs: z.number().int().min(50).max(3000).default(150),
  /** 是否启用自适应噪声底（推荐开启） */
  adaptiveNoiseFloor: z.boolean().default(true),
});
export type VadConfig = z.infer<typeof VadConfigSchema>;

export const VoiceConfigSchema = z.object({
  /** 语音架构（默认纯 Omni 一体化低延迟） */
  architecture: VoiceArchitectureSchema.default("omni"),
  /** ASR 模式：realtime=实时WebSocket流式(默认，低延迟)，batch=批量HTTP(降级) */
  asrMode: AsrModeSchema.default("realtime"),
  /** TTS 音色（Omni 音色，默认 Tina） */
  voice: z.string().default("Tina"),
  /** ASR 语言 */
  language: z.string().default("zh-CN"),
  /** ASR 方言（auto 表示自动） */
  dialect: z.string().default("auto"),
  /** 是否朗读 AI 回复 */
  readAloud: z.boolean().default(true),
  /** VAD 参数 */
  vad: VadConfigSchema.default(VadConfigSchema.parse({})),
  /** 配置版本号，用于自动迁移旧配置 */
  configVersion: z.number().int().default(9),
});
export type VoiceConfig = z.infer<typeof VoiceConfigSchema>;

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

const VOICE_CONFIG_KEY = "berry-voice-config";

/** 环境变量默认值（构建期注入，作为兜底） */
function envDefaults(): Partial<VoiceConfig> {
  const arch = (process.env.NEXT_PUBLIC_VOICE_ARCHITECTURE || "").trim();
  const voice = (process.env.NEXT_PUBLIC_VOICE_DEFAULT_VOICE || "").trim();
  const lang = (process.env.NEXT_PUBLIC_VOICE_DEFAULT_LANGUAGE || "").trim();
  const out: Partial<VoiceConfig> = {};
  if (arch === "omni") out.architecture = arch;
  if (voice) out.voice = voice;
  if (lang) out.language = lang;
  return out;
}

// ---------------------------------------------------------------------------
// 后端配置同步（admin UI 配置的架构/音色/VAD 作为默认值）
// ---------------------------------------------------------------------------

let backendConfigCache: Partial<VoiceConfig> | null = null;
let backendConfigPromise: Promise<Partial<VoiceConfig>> | null = null;

/**
 * 从后端 /api/voice/config 拉取 admin 配置的默认值。
 * - 仅在客户端执行，首次调用发起请求，后续走缓存。
 * - 失败时静默回退到 env 默认值，不阻塞语音会话。
 * - 缓存 60 秒后自动失效，下次 getVoiceConfig 会重新拉取。
 */
export async function fetchBackendVoiceConfig(): Promise<Partial<VoiceConfig>> {
  if (typeof window === "undefined") return {};
  if (backendConfigCache) return backendConfigCache;
  if (backendConfigPromise) return backendConfigPromise;

  backendConfigPromise = (async () => {
    try {
      const res = await fetch("/api/voice/config", { credentials: "same-origin" });
      if (!res.ok) return {};
      const data = await res.json();
      const out: Partial<VoiceConfig> = {};
      if (data.architecture === "omni") {
        out.architecture = data.architecture;
      }
      // ASR 模式：batch=批量HTTP，realtime=实时WebSocket流式（边说边出字）
      if (data.asrMode === "batch" || data.asrMode === "realtime") {
        out.asrMode = data.asrMode;
      }
      // 纯 Omni 架构：音色取 omni.voice
      if (data.omni?.voice) {
        out.voice = data.omni.voice;
      }
      if (data.asr?.defaultLanguage) out.language = data.asr.defaultLanguage;
      if (data.asr?.defaultDialect) out.dialect = data.asr.defaultDialect;
      if (typeof data.readAloud === "boolean") out.readAloud = data.readAloud;
      if (data.vad) {
        out.vad = {
          silenceThreshold: data.vad.silenceThreshold ?? undefined,
          silenceDurationMs: data.vad.silenceDurationMs ?? undefined,
          speechStartMs: data.vad.speechStartMs ?? undefined,
          maxSegmentMs: data.vad.maxSegmentMs ?? undefined,
          minSpeechMs: data.vad.minSpeechMs ?? undefined,
          adaptiveNoiseFloor: data.vad.adaptiveNoiseFloor ?? undefined,
        };
        // 移除 undefined 字段
        Object.keys(out.vad).forEach((k) => {
          if (out.vad![k as keyof typeof out.vad] === undefined) delete out.vad![k as keyof typeof out.vad];
        });
        if (Object.keys(out.vad).length === 0) delete out.vad;
      }
      backendConfigCache = out;
      // 60 秒后清除缓存，允许配置更新生效
      setTimeout(() => { backendConfigCache = null; }, 60_000);
      return out;
    } catch {
      return {};
    } finally {
      backendConfigPromise = null;
    }
  })();

  return backendConfigPromise;
}

/**
 * 异步初始化：拉取后端配置后合并到 localStorage（仅首次，不覆盖用户已保存的偏好）。
 * 在 useVoiceController 首次挂载时调用。
 */
export async function initBackendConfig(): Promise<void> {
  if (typeof window === "undefined") return;
  const backend = await fetchBackendVoiceConfig();
  if (Object.keys(backend).length === 0) return;

  // admin UI 配置的是全用户参数（音色、架构等），始终覆盖 localStorage
  // 用户可调字段（如 readAloud）保留 localStorage 中的值
  const current = getVoiceConfig();
  const merged = safeParse({ ...current, ...backend });
  try {
    localStorage.setItem(VOICE_CONFIG_KEY, JSON.stringify(merged));
  } catch { /* ignore */ }

  // 通知配置变化（让正在运行的语音会话感知新音色）
  window.dispatchEvent(new StorageEvent("storage", { key: VOICE_CONFIG_KEY }));
}

// ---------------------------------------------------------------------------
// 读取 / 保存
// ---------------------------------------------------------------------------

function safeParse(raw: unknown): VoiceConfig {
  const parsed = VoiceConfigSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  // 部分字段非法时仍尽量保留合法字段
  const fallback = VoiceConfigSchema.parse({});
  if (parsed.success) return parsed.data;
  return fallback;
}

/**
 * 读取完整语音配置（同步 API）。
 * 优先级：localStorage（用户偏好）> env 默认值 > schema 默认值。
 * 后端 admin 配置通过 initBackendConfig() 异步注入到 localStorage（仅首次），
 * 用户后续的修改始终覆盖后端默认值。
 */
export function getVoiceConfig(): VoiceConfig {
  const base = safeParse(envDefaults());
  if (typeof window === "undefined") return base;
  try {
    const saved = localStorage.getItem(VOICE_CONFIG_KEY);
    if (!saved) return base;
    const parsed = safeParse(JSON.parse(saved));
    // 迁移旧版配置（configVersion < 9）：默认切到纯 Omni 架构 + 实时 ASR + Tina 音色
    if (!parsed.configVersion || parsed.configVersion < 9) {
      const migrated = { ...parsed, configVersion: 9, architecture: "omni", asrMode: "realtime" };
      // Cherry 是旧 TTS 音色，Omni 不支持，迁移到 Tina
      if (parsed.voice === "Cherry" || parsed.voice === "Mochi" || parsed.voice === "Chelsie") {
        migrated.voice = "Tina";
      }
      // configVersion < 2: 旧默认值 1200 → 500
      if (!parsed.configVersion || parsed.configVersion < 2) {
        if (parsed.vad?.silenceDurationMs === 1200) {
          migrated.vad = { ...parsed.vad, silenceDurationMs: 500 };
        }
        if (parsed.vad?.speechStartMs === 250) {
          migrated.vad = { ...migrated.vad!, speechStartMs: 150 };
        }
        if (parsed.vad?.minSpeechMs === 400) {
          migrated.vad = { ...migrated.vad!, minSpeechMs: 300 };
        }
      }
      // configVersion < 4: silenceDurationMs 500 → 300
      if (!parsed.configVersion || parsed.configVersion < 4) {
        if (parsed.vad?.silenceDurationMs === 500) {
          migrated.vad = { ...migrated.vad!, silenceDurationMs: 300 };
        }
      }
      // configVersion < 5: silenceDurationMs 300→200, speechStartMs 150→120, minSpeechMs 300→200
      if (!parsed.configVersion || parsed.configVersion < 5) {
        if (parsed.vad?.silenceDurationMs === 300) {
          migrated.vad = { ...migrated.vad!, silenceDurationMs: 200 };
        }
        if (parsed.vad?.speechStartMs === 150) {
          migrated.vad = { ...migrated.vad!, speechStartMs: 120 };
        }
        if (parsed.vad?.minSpeechMs === 300) {
          migrated.vad = { ...migrated.vad!, minSpeechMs: 200 };
        }
      }
      // configVersion < 6: 帧大小优化，进一步降低延迟
      // silenceDurationMs 200→150, speechStartMs 120→80, minSpeechMs 200→150
      if (!parsed.configVersion || parsed.configVersion < 6) {
        if (parsed.vad?.silenceDurationMs === 200) {
          migrated.vad = { ...migrated.vad!, silenceDurationMs: 150 };
        }
        if (parsed.vad?.speechStartMs === 120) {
          migrated.vad = { ...migrated.vad!, speechStartMs: 80 };
        }
        if (parsed.vad?.minSpeechMs === 200) {
          migrated.vad = { ...migrated.vad!, minSpeechMs: 150 };
        }
      }
      // 持久化迁移后的配置
      try {
        localStorage.setItem(VOICE_CONFIG_KEY, JSON.stringify(migrated));
      } catch { /* ignore */ }
      return safeParse({ ...base, ...migrated });
    }
    const merged = { ...base, ...parsed };
    return safeParse(merged);
  } catch {
    return base;
  }
}

/** 仅保存运行时可调字段（架构、音色、语言、朗读、VAD） */
export function saveVoiceConfig(partial: Partial<VoiceConfig>): VoiceConfig {
  const current = getVoiceConfig();
  const next = safeParse({ ...current, ...partial });
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(VOICE_CONFIG_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
  }
  return next;
}

/** 监听配置变化（跨标签页同步） */
export function onVoiceConfigChange(cb: (cfg: VoiceConfig) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === VOICE_CONFIG_KEY) cb(getVoiceConfig());
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

// ---------------------------------------------------------------------------
// 向后兼容：旧版 ai-settings-dialog 的 VoiceSettings
// ---------------------------------------------------------------------------

export interface LegacyVoiceSettings {
  enabled: boolean;
  voice: string;
  readAloud: boolean;
}

const LEGACY_KEY = "xiaozhi-voice-settings";

/** 读取旧版设置并合并到新配置（迁移期兼容） */
export function getLegacyVoiceSettings(): LegacyVoiceSettings {
  if (typeof window === "undefined") {
    return { enabled: true, voice: "Tina", readAloud: true };
  }
  try {
    const saved = localStorage.getItem(LEGACY_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        enabled: parsed.enabled ?? true,
        voice: parsed.voice || "Tina",
        readAloud: parsed.readAloud ?? true,
      };
    }
  } catch {
    /* ignore */
  }
  return { enabled: true, voice: "Tina", readAloud: true };
}
