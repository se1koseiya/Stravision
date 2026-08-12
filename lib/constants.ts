export function getInternalApiSecret(): string {
  // 安全要求：INTERNAL_API_SECRET 必须由环境变量提供，缺失时一律抛错，
  // 避免攻击者使用源码中已知的回退值调用 /api/internal/* 端点
  // （可解封任意 IP 绕过限流、查询维护配置、读取安全配置等）。
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    throw new Error("FATAL: INTERNAL_API_SECRET environment variable is not defined. Refusing to start to prevent internal API bypass via known fallback secret.");
  }
  return secret;
}

/**
 * 硬件设备 ID 单一数据源
 *
 * 新增/修改设备时只需修改此处，所有引用方自动同步。
 * 历史上这些 ID 散布在 6+ 处文件中，维护成本极高。
 */
export const DEVICE_IDS = {
  PUMP: 5,        // 水泵（继电器通道 1）
  FAN: 6,         // 风扇（继电器通道 2）
  RGB_LIGHT: 7,   // RGB 补光灯（继电器通道 3）
  WHITE_LIGHT: 8, // 白光补光灯（继电器通道 4）
} as const

export const DEVICE_NAMES: Record<number, string> = {
  [DEVICE_IDS.PUMP]: '水泵',
  [DEVICE_IDS.FAN]: '风扇',
  [DEVICE_IDS.RGB_LIGHT]: 'RGB灯',
  [DEVICE_IDS.WHITE_LIGHT]: '白光灯',
}

/** 继电器设备 ID 有效范围（用于服务端校验） */
export const RELAY_DEVICE_RANGE = {
  MIN: DEVICE_IDS.PUMP,
  MAX: DEVICE_IDS.WHITE_LIGHT,
}

/**
 * 丝杆滑台（摄像头云台）物理参数
 *
 * 硬件参数：步进电机驱动丝杆，每毫米 160 脉冲，量程 0-700mm。
 */
export const STEPPER = {
  PULSES_PER_MM: 160,       // 脉冲/mm 转换比
  MAX_TRAVEL_MM: 700,       // 物理量程 (mm)
  MAX_PULSES: 112000,       // 最大脉冲数 = 700 × 160
  MIN_PULSES: 0,            // 最小脉冲数（原点）
} as const

/**
 * 光谱服务端点
 *
 * 通过环境变量配置，避免公网 IP 硬编码在源码中。
 * 默认值仅用于本地开发，生产环境必须设置 SPECTRUM_SERVICE_URL。
 */
export function getSpectrumServiceUrl(): string {
  return process.env.SPECTRUM_SERVICE_URL || 'http://8.153.175.190:8000/spectrum-stravision'
}

/**
 * 上下文压缩模型配置
 *
 * 通过环境变量配置，避免硬编码到 dashscope。
 * 默认使用 dashscope qwen-plus（仅作为后备）。
 */
export function getSummarizationConfig() {
  return {
    url: process.env.SUMMARIZATION_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: process.env.SUMMARIZATION_MODEL || 'qwen-plus',
    apiKey: process.env.SUMMARIZATION_API_KEY,
  }
}

