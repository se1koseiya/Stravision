"use client"

/**
 * 桌面端「模拟数值」数据源 —— 演示 / 截图专用。
 *
 * ── 为什么需要它 ─────────────────────────────────────────────────────
 * 非安装产物（`release/win-unpacked`、`Stravision-*-portable.zip`）通常跑在没有
 * 硬件、也没有 MQTT 数据源的机器上：所有传感器读数是 `0`、走势线是一条虚线，
 * 截出来的产品图是「一屏 0.0」。这个模块给这类产物一份**看起来像真的**数据，
 * 让截图不依赖现场设备。
 *
 * ── 三条硬约束 ───────────────────────────────────────────────────────
 * 1. **确定性**：同一个时间戳一定得到同一个值。仪表盘、设备控制、监控页、
 *    AI 助手可能同时挂在屏幕上 —— 各自跑一份随机数就会出现「同一时刻三个温度」。
 *    实现上值只由 `Date.now()` 决定（正弦叠加），不存任何随机状态。
 * 2. **平滑**：三层不同周期的正弦叠加（主波 + 次波 + 高频微扰），相邻两拍
 *    （2s）差值在 0.01 量级 —— 肉眼看不到跳变，也不会出现锯齿。
 * 3. **可关闭**：开关关掉后立刻让位给真实 SSE 数据，不做任何"记住上次模拟值"
 *    的兜底（那会让用户分不清哪条数据是真的）。
 *
 * ── 只在非安装产物里出现 ─────────────────────────────────────────────
 * 可用性判定见 {@link isSimulatedValuesAvailable}：桌面壳通过 preload 注入的
 * `demoValuesAvailable`（打包态且缺 `resources/app-update.yml` = `--dir` 产物），
 * 或者开发环境（方便在浏览器里验收 UI）。正式安装包/浏览器部署里恒为 false，
 * 开关连入口都不会渲染。
 */

import { useSyncExternalStore } from "react"

/** 开关在 localStorage 里的键；换键等于让老用户的开关状态失效，慎重 */
export const SIMULATED_VALUES_STORAGE_KEY = "stravision:simulated-values"

/** 模拟数据刷新节拍（ms）。与真实 SSE 推送同一个量级，页面看不出差别 */
export const SIMULATED_TICK_MS = 2000

const TAU = Math.PI * 2

/* ------------------------------------------------------------------ */
/* 指标规格                                                            */
/* ------------------------------------------------------------------ */

type MetricSpec = {
  /** 基准值（波形的中轴） */
  base: number
  /** 振幅（单侧最大偏移） */
  amp: number
  /** 主波周期（秒）：越大漂移越慢，像真实温室的昼夜/通风节律 */
  period: number
  /** 相位（弧度）：让各指标错开，不会同涨同落 */
  phase: number
  /** 展示精度 */
  digits: number
}

/**
 * 数值都按「大棚常温季节」的合理区间取：
 *  - 温度 24~25 °C、湿度 60~66 %：不触发任何预警（预警浮层会盖住截图）
 *  - CO₂ 570~670 ppm：略高于大气本底，符合有作物的密闭棚
 *  - 光照 17~20k lux：`LightWidget` 的「适中」档（1000~50000），环形进度约 1/4
 *  - 土壤 EC 620~670 μS/cm、NPK 82/40/165 上下：肥力环 ~48%，不是满格也不是空
 */
const SIM_METRICS = {
  temperature: { base: 24.6, amp: 0.85, period: 240, phase: 0.3, digits: 1 },
  humidity: { base: 63.2, amp: 2.6, period: 300, phase: 1.7, digits: 1 },
  co2: { base: 618, amp: 46, period: 420, phase: 2.4, digits: 0 },
  light: { base: 18600, amp: 1200, period: 360, phase: 0.8, digits: 0 },
  earth_temp: { base: 21.4, amp: 0.5, period: 480, phase: 1.1, digits: 1 },
  earth_water: { base: 38.6, amp: 1.8, period: 540, phase: 2.9, digits: 1 },
  earth_ec: { base: 642, amp: 22, period: 600, phase: 0.5, digits: 0 },
  earth_n: { base: 86, amp: 4, period: 600, phase: 1.9, digits: 0 },
  earth_p: { base: 42, amp: 3, period: 600, phase: 2.2, digits: 0 },
  earth_k: { base: 168, amp: 6, period: 600, phase: 3.1, digits: 0 },
  rainfall: { base: 0.18, amp: 0.14, period: 720, phase: 4.2, digits: 2 },
} as const satisfies Record<string, MetricSpec>

export type SimulatedMetricKey = keyof typeof SIM_METRICS

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

/**
 * 单条指标在某个时刻的取值。
 *
 * 三层正弦：主波（周期 `period`）+ 0.38 倍频次波 + 2.7 倍频微扰。
 * 微扰幅值只有 12%，作用是把「纯正弦」那种一眼假的手感打散。
 */
export function simulatedMetric(key: SimulatedMetricKey, at: number = Date.now()): number {
  const spec: MetricSpec = SIM_METRICS[key]
  const seconds = at / 1000
  const primary = Math.sin((seconds / spec.period) * TAU + spec.phase)
  const secondary = Math.sin((seconds / (spec.period / 2.7)) * TAU + spec.phase * 2.1)
  const ripple = Math.sin((seconds / (spec.period / 7.3)) * TAU + spec.phase * 3.7)
  const raw = spec.base + spec.amp * (0.62 * primary + 0.26 * secondary + 0.12 * ripple)
  return round(raw, spec.digits)
}

/* ------------------------------------------------------------------ */
/* 实时数据快照                                                        */
/* ------------------------------------------------------------------ */

/**
 * 模拟的 `DeviceData` 快照。
 *
 * 继电器刻意给「开一半」：截图里「在线 6 台 / 运行 2 台」比「全离线」或
 * 「全绿」都可信 —— 全开会让一屏出现十几个绿色开关，品牌色直接失效。
 * 索引签名是为了兼容 `relay1`~`relay4`（legacy 兜底的出厂继电器通道）。
 */
export interface SimulatedDevicePayload extends Record<string, number> {
  temperature: number
  humidity: number
  light: number
  co2: number
  earth_temp: number
  earth_water: number
  earth_ec: number
  earth_n: number
  earth_p: number
  earth_k: number
  relay5: number
  relay6: number
  relay7: number
  relay8: number
  led1: number
  led2: number
  led3: number
  led4: number
  stepper_position: number
  stepper_direction: number
  timestamp: number
}

export function simulatedDeviceData(at: number = Date.now()): SimulatedDevicePayload {
  return {
    temperature: simulatedMetric("temperature", at),
    humidity: simulatedMetric("humidity", at),
    light: simulatedMetric("light", at),
    co2: simulatedMetric("co2", at),
    earth_temp: simulatedMetric("earth_temp", at),
    earth_water: simulatedMetric("earth_water", at),
    earth_ec: simulatedMetric("earth_ec", at),
    earth_n: simulatedMetric("earth_n", at),
    earth_p: simulatedMetric("earth_p", at),
    earth_k: simulatedMetric("earth_k", at),
    // 补光灯 + 循环风机在跑，灌溉阀/遮阳帘关着
    relay5: 1,
    relay6: 1,
    relay7: 0,
    relay8: 0,
    // legacy 通道（设备注册表为空时页面会回退到出厂四路继电器）
    relay1: 1,
    relay2: 0,
    relay3: 1,
    relay4: 0,
    led1: 1,
    led2: 0,
    led3: 1,
    led4: 0,
    // 滑台停在行程 40% 附近（总行程 160）
    stepper_position: 64,
    stepper_direction: 0,
    timestamp: at,
  }
}

/** 自定义设备（注册表里的 sensor）指标定义 —— 只取模拟需要的两个字段 */
type SimulatedSensorLike = {
  id: number
  type?: string
  config?: {
    metrics?: Array<{ mqtt_field?: string; scale?: number }>
  } | null
}

/** mqtt_field / 指标名 → 模拟指标。命中不了的名字走确定性兜底，不会出现空白 */
const FIELD_HINTS: Array<[RegExp, SimulatedMetricKey]> = [
  [/temp/i, "temperature"],
  [/hum(idity)?$/i, "humidity"],
  [/co2|carbon/i, "co2"],
  [/lux|light|illum/i, "light"],
  [/soil.*temp|earth.*temp/i, "earth_temp"],
  [/moist|water|soil/i, "earth_water"],
  [/ec|conduct/i, "earth_ec"],
  [/\bn\b|nitrogen/i, "earth_n"],
  [/\bp\b|phosphor/i, "earth_p"],
  [/\bk\b|potass/i, "earth_k"],
  [/rain/i, "rainfall"],
]

function resolveFieldKey(field: string): SimulatedMetricKey {
  for (const [pattern, key] of FIELD_HINTS) {
    if (pattern.test(field)) return key
  }
  return "temperature"
}

/**
 * 自定义设备的实时数据：`{ deviceId: { mqtt_field: 原始上报值 } }`。
 *
 * 🚨 返回的是**上报值**而不是物理值：监控页在渲染时会再乘 `metric.scale`
 *    （见 `app/monitor/monitor-beautiful.tsx` 的 `m.scale ? raw * m.scale : raw`）。
 *    这里提前除一次，否则 `scale: 0.1` 的温度会显示成 2.4 °C。
 */
export function simulatedCustomDeviceData(
  devices: SimulatedSensorLike[],
  at: number = Date.now(),
): Record<number, Record<string, number>> {
  const result: Record<number, Record<string, number>> = {}
  for (const device of devices) {
    if (device.type && device.type !== "sensor") continue
    const metrics = device.config?.metrics ?? []
    if (!metrics.length) continue
    const values: Record<string, number> = {}
    metrics.forEach((metric, index) => {
      const field = metric.mqtt_field?.trim() || `metric_${index + 1}`
      const key = resolveFieldKey(field)
      const scale = Number(metric.scale) || 1
      // 同一设备的多个同类指标（如两个温度探头）用 index 错开相位，避免完全重合
      const physical = simulatedMetric(key, at + index * 1370)
      values[field] = round(physical / (scale || 1), Math.max(0, (SIM_METRICS[key].digits ?? 1) + 1))
    })
    result[device.id] = values
  }
  return result
}

/* ------------------------------------------------------------------ */
/* 历史曲线                                                            */
/* ------------------------------------------------------------------ */

export interface SimulatedHistoryPoint {
  timestamp: number
  value: number
}

/** `/api/device-history` 的 type → 模拟指标 */
const HISTORY_TYPE_MAP: Record<string, SimulatedMetricKey> = {
  temperature: "temperature",
  humidity: "humidity",
  light: "light",
  co2: "co2",
  soilMoisture: "earth_water",
  nitrogen: "earth_n",
  phosphorus: "earth_p",
  potassium: "earth_k",
  rainfall: "rainfall",
}

/** 与 `/api/device-history` 的 range 白名单一一对应（服务端按同样粒度降采样） */
const RANGE_SHAPE: Record<string, { spanMs: number; points: number }> = {
  "10m": { spanMs: 10 * 60_000, points: 24 },
  "1h": { spanMs: 60 * 60_000, points: 36 },
  "7h": { spanMs: 7 * 60 * 60_000, points: 48 },
  "1d": { spanMs: 24 * 60 * 60_000, points: 48 },
  "7d": { spanMs: 7 * 24 * 60 * 60_000, points: 56 },
}

/**
 * 一条历史曲线。
 *
 * 🚨 采样点必须调 `simulatedMetric(key, ts)` —— 与实时快照同一函数、同一时间轴。
 *    这样曲线末端一定等于页面上的当前读数；各画一套随机曲线会出现
 *    「卡上写 24.6 °C、走势线最后一点在 22 °C」的穿帮。
 */
export function simulatedHistory(
  type: string,
  range: string = "1h",
  at: number = Date.now(),
): SimulatedHistoryPoint[] {
  const shape = RANGE_SHAPE[range] ?? RANGE_SHAPE["1h"]
  const { spanMs, points } = shape

  // 肥力不是独立传感器，而是 NPK 归一化的派生值 —— 与 dashboard 的算法保持一致
  const fertility = type === "fertility"
  const key = HISTORY_TYPE_MAP[type]
  if (!fertility && !key) return []

  const step = points > 1 ? spanMs / (points - 1) : 0
  const list: SimulatedHistoryPoint[] = []
  for (let i = 0; i < points; i += 1) {
    const timestamp = Math.round(at - spanMs + step * i)
    let value: number
    if (fertility) {
      const n = Math.min(100, (simulatedMetric("earth_n", timestamp) / 200) * 100)
      const p = Math.min(100, (simulatedMetric("earth_p", timestamp) / 100) * 100)
      const k = Math.min(100, (simulatedMetric("earth_k", timestamp) / 300) * 100)
      value = round((n + p + k) / 3, 1)
    } else {
      value = simulatedMetric(key, timestamp)
    }
    list.push({ timestamp, value })
  }
  return list
}

/** 多指标一次性历史（对齐 `/api/device-history?types=a,b,c` 的返回结构） */
export function simulatedHistoryMap(
  types: string[],
  range: string = "1h",
  at: number = Date.now(),
): Record<string, SimulatedHistoryPoint[]> {
  const result: Record<string, SimulatedHistoryPoint[]> = {}
  for (const type of types) {
    const list = simulatedHistory(type, range, at)
    if (list.length) result[type] = list
  }
  return result
}

/* ------------------------------------------------------------------ */
/* 开关状态                                                            */
/* ------------------------------------------------------------------ */

let enabled = false
let hydrated = false
const listeners = new Set<() => void>()

function readStored(): boolean {
  try {
    return window.localStorage.getItem(SIMULATED_VALUES_STORAGE_KEY) === "1"
  } catch {
    // 隐私模式 / 存储被禁：当成关闭，不影响页面
    return false
  }
}

/** 当前是否开启（浏览器环境才读 localStorage；SSR 恒 false） */
export function isSimulatedValuesOn(): boolean {
  if (typeof window === "undefined") return false
  if (!hydrated) {
    enabled = readStored()
    hydrated = true
  }
  return enabled
}

/** 切换开关：写 localStorage 并广播给所有订阅者 */
export function setSimulatedValues(on: boolean): void {
  if (typeof window === "undefined") return
  enabled = on
  hydrated = true
  try {
    window.localStorage.setItem(SIMULATED_VALUES_STORAGE_KEY, on ? "1" : "0")
  } catch {
    /* 写不进去也要让本次会话生效 */
  }
  listeners.forEach((listener) => listener())
}

/** 显式订阅（给非 React 场景用） */
export function subscribeSimulatedValues(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * 当前产物是否允许「模拟数值」。
 *
 * - 桌面壳：由 preload 注入 `demoValuesAvailable`（仅 `--dir` 免安装产物为 true）
 * - 浏览器 dev：放行，方便不打包直接验收 UI 与数值
 * - 正式安装包 / 生产 Web：恒 false（开关入口不渲染）
 */
export function isSimulatedValuesAvailable(): boolean {
  if (typeof window === "undefined") return false
  if (window.stravisionDesktop?.demoValuesAvailable) return true
  return process.env.NODE_ENV === "development"
}

const noopSubscribe = () => () => {}

/** React hook：开关状态（跨组件同步） */
export function useSimulatedValues(): boolean {
  return useSyncExternalStore(subscribeSimulatedValues, isSimulatedValuesOn, () => false)
}

/** React hook：当前环境是否支持模拟数值（false 时不要渲染任何入口） */
export function useSimulatedValuesAvailable(): boolean {
  return useSyncExternalStore(noopSubscribe, isSimulatedValuesAvailable, () => false)
}
