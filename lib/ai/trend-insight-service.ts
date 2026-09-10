/**
 * 主动趋势洞察服务 (Trend Insight Service)
 *
 * 让 AI 主动守护从「事后告警」升级为「事前预测」。
 *
 * 现有 guardian-service 只在阈值越界时才告警（事后反应），
 * 本服务补齐「趋势预测」——基于历史传感器数据做线性外推，
 * 在指标尚未越界、但按当前趋势即将越界时，提前发出预警。
 *
 * 触发方式：由 guardian-service 的定时检查入口在检测完阈值异常后调用，
 * 与阈值告警互补：一个管「已经出问题」，一个管「快要出问题」。
 */

import { query } from '@/lib/db/database'

// === 类型 ===

export interface TrendInsight {
  metric: string
  /** 指标中文名 */
  metricLabel: string
  unit: string
  /** 当前值 */
  current: number
  /** 变化速率（每小时的变化量，正=上升，负=下降） */
  ratePerHour: number
  /** 预测越界方向：high=即将超上限，low=即将跌破下限 */
  direction: 'high' | 'low'
  /** 阈值 */
  threshold: number
  /** 预计越过阈值还需要多少分钟 */
  minutesUntilThreshold: number
  /** 趋势置信度 0-1（基于数据点数量和拟合度） */
  confidence: number
}

interface MetricThreshold {
  metric: string
  label: string
  unit: string
  min: number
  max: number
  /** 越界时提前预警的窗口（分钟），越界前 X 分钟开始关注 */
  alertWindowMinutes: number
}

// === 指标阈值配置（与 guardian-service 的 THRESHOLDS 保持一致） ===

const METRICS: MetricThreshold[] = [
  { metric: 'temperature', label: '温度', unit: '°C', min: 5, max: 30, alertWindowMinutes: 90 },
  { metric: 'humidity', label: '湿度', unit: '%', min: 40, max: 90, alertWindowMinutes: 120 },
  { metric: 'co2', label: 'CO2', unit: 'ppm', min: 350, max: 1500, alertWindowMinutes: 90 },
  { metric: 'light', label: '光照', unit: 'Lux', min: 5000, max: 50000, alertWindowMinutes: 60 },
  { metric: 'soil_moisture', label: '土壤湿度', unit: '%', min: 30, max: 80, alertWindowMinutes: 180 },
]

// === 线性回归 ===

/**
 * 对时间序列做最小二乘线性拟合，返回斜率（每毫秒变化量）和拟合优度 R²
 */
function linearRegression(points: Array<{ t: number; v: number }>): {
  slopePerMs: number
  r2: number
} {
  const n = points.length
  if (n < 2) return { slopePerMs: 0, r2: 0 }

  let sumT = 0, sumV = 0, sumTV = 0, sumT2 = 0
  for (const p of points) {
    sumT += p.t
    sumV += p.v
    sumTV += p.t * p.v
    sumT2 += p.t * p.t
  }

  const denom = n * sumT2 - sumT * sumT
  if (denom === 0) return { slopePerMs: 0, r2: 0 }

  const slope = (n * sumTV - sumT * sumV) / denom
  const intercept = (sumV - slope * sumT) / n

  // 计算 R²
  let ssRes = 0, ssTot = 0
  const meanV = sumV / n
  for (const p of points) {
    const pred = slope * p.t + intercept
    ssRes += (p.v - pred) * (p.v - pred)
    ssTot += (p.v - meanV) * (p.v - meanV)
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot

  return { slopePerMs: slope, r2 }
}

// === 趋势洞察主函数 ===

/**
 * 从最近的历史传感器数据中识别「即将越界」的趋势
 *
 * @param lookbackMinutes 回看窗口（分钟），默认 60 分钟
 * @returns 趋势洞察列表（已按紧迫度排序）
 */
export async function detectTrendInsights(lookbackMinutes = 60): Promise<TrendInsight[]> {
  const since = Date.now() - lookbackMinutes * 60 * 1000
  const insights: TrendInsight[] = []

  for (const cfg of METRICS) {
    try {
      const rows = await query<{ timestamp: number; value: number }>(
        `SELECT created_at as timestamp, ${cfg.metric} as value
         FROM sensor_readings
         WHERE created_at > $1 AND ${cfg.metric} IS NOT NULL
         ORDER BY created_at ASC`,
        [since]
      )

      if (rows.length < 10) continue // 数据点太少，无法可靠拟合

      // 清洗：土壤湿度历史值 >100 视为未缩放（×10 老数据），除以 10
      const points = rows
        .map(r => {
          let v = Number(r.value)
          if (cfg.metric === 'soil_moisture' && v > 100) v = v / 10
          return { t: Number(r.timestamp), v }
        })
        .filter(p => Number.isFinite(p.v))

      if (points.length < 10) continue

      const { slopePerMs, r2 } = linearRegression(points)
      const current = points[points.length - 1].v
      const ratePerHour = slopePerMs * 3600 * 1000 // 每小时变化量

      // 趋势置信度：数据点越多、拟合度越高越可信
      const dataConfidence = Math.min(1, points.length / 40)
      const confidence = Math.min(1, r2 * 0.6 + dataConfidence * 0.4)

      // 只有当趋势足够明显时才预测（斜率不可忽略 + 置信度达标）
      if (Math.abs(ratePerHour) < 0.5 || confidence < 0.55) continue

      // 判断是否即将越界
      let direction: 'high' | 'low' | null = null
      let threshold = 0
      let minutesUntil = Infinity

      if (ratePerHour > 0 && current < cfg.max) {
        // 上升趋势，预测何时超过上限
        threshold = cfg.max
        minutesUntil = ((cfg.max - current) / ratePerHour) * 60
        if (minutesUntil <= cfg.alertWindowMinutes) direction = 'high'
      } else if (ratePerHour < 0 && current > cfg.min) {
        // 下降趋势，预测何时跌破下限
        threshold = cfg.min
        minutesUntil = ((current - cfg.min) / Math.abs(ratePerHour)) * 60
        if (minutesUntil <= cfg.alertWindowMinutes) direction = 'low'
      }

      if (!direction) continue

      insights.push({
        metric: cfg.metric,
        metricLabel: cfg.label,
        unit: cfg.unit,
        current,
        ratePerHour: Number(ratePerHour.toFixed(2)),
        direction,
        threshold,
        minutesUntilThreshold: Math.max(0, Math.round(minutesUntil)),
        confidence: Number(confidence.toFixed(2)),
      })
    } catch (e) {
      console.error(`[TrendInsight] Failed to analyze ${cfg.metric}:`, e)
    }
  }

  // 按「越界剩余时间」升序排列（最紧迫的在前）
  return insights.sort((a, b) => a.minutesUntilThreshold - b.minutesUntilThreshold)
}

/**
 * 将趋势洞察转为可读的中文描述（供通知 message 使用）
 */
export function formatTrendInsight(insight: TrendInsight): string {
  const timeText = insight.minutesUntilThreshold >= 60
    ? `${Math.floor(insight.minutesUntilThreshold / 60)} 小时 ${insight.minutesUntilThreshold % 60} 分钟`
    : `${insight.minutesUntilThreshold} 分钟`
  const rateText = Math.abs(insight.ratePerHour).toFixed(1)

  return `${insight.metricLabel}当前 ${insight.current}${insight.unit}，正以约 ${rateText}${insight.unit}/小时的速度${insight.direction === 'high' ? '上升' : '下降'}，预计 ${timeText} 后${insight.direction === 'high' ? '超出上限' : '跌破下限'} ${insight.threshold}${insight.unit}。`
}

/**
 * 为趋势洞察生成可执行的预防性建议
 */
export function suggestTrendAction(insight: TrendInsight): string {
  const actions: Record<string, { high: string; low: string }> = {
    temperature: {
      high: '建议提前开启通风或遮阳，避免温度持续攀升造成热害',
      low: '建议关注夜间保温，防止温度过低影响花芽分化',
    },
    humidity: {
      high: '建议加强通风降湿，预防高湿诱发的灰霉病',
      low: '建议适时喷雾或灌溉增湿，避免过干影响蒸腾',
    },
    co2: {
      high: '建议通风换气，降低 CO2 浓度',
      low: '建议补充 CO2 气肥，提升光合效率',
    },
    light: {
      high: '建议开启遮阳，避免强光灼伤叶片',
      low: '建议开启补光灯，保障光照需求',
    },
    soil_moisture: {
      high: '建议停止灌溉并排水，防止根系缺氧',
      low: '建议安排浇水，防止土壤过干导致缺水',
    },
  }
  return actions[insight.metric]?.[insight.direction] || '请根据趋势提前调整设备策略'
}
