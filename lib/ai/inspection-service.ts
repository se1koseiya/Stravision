/**
 * 巡检服务
 *
 * 与 farm-service 的区别：
 * - farm-service 回答「某个指标现在是多少」
 * - inspection-service 回答「整体有没有问题，问题出在哪」
 *
 * 核心增值是异常判定：把各路数据对照作物适宜区间，直接标出偏离项与处置建议，
 * AI 拿到的是「已标注的巡检结论」而不是一堆裸数据，写报告时不会漏判或误判。
 */

import { getCurrentConditions, analyzeSoil } from '@/lib/db/farm-service'

/** 异常项 */
export interface Anomaly {
  key: string
  label: string
  value: number | null
  unit: string
  expected: string
  severity: 'critical' | 'warning'
  finding: string
  action: string
}

/** 单项指标的适宜区间与越界处置建议 */
interface RangeRule {
  key: string
  label: string
  unit: string
  min?: number
  max?: number
  severity?: 'critical' | 'warning'
  /** 低于下限时的处置建议 */
  lowAction: string
  /** 高于上限时的处置建议 */
  highAction: string
}

/**
 * 草莓（浆果类）生长适宜区间
 *
 * 数值取自常见设施栽培管理经验值，按作物切换时只需替换本常量。
 */
const STRAWBERRY_RULES: RangeRule[] = [
  {
    key: 'temperature',
    label: '空气温度',
    unit: '°C',
    min: 15,
    max: 28,
    severity: 'critical',
    lowAction: '温度偏低，启用加温或关闭通风口，避免冷害抑制开花',
    highAction: '温度偏高，开启通风与遮阳，必要时喷雾降温'
  },
  {
    key: 'humidity',
    label: '空气湿度',
    unit: '%',
    min: 60,
    max: 85,
    severity: 'warning',
    lowAction: '空气偏干，加湿或减少通风，避免花器失水影响授粉',
    highAction: '湿度过高，加强通风除湿，灰霉病与白粉病风险上升'
  },
  {
    key: 'co2',
    label: 'CO2',
    unit: 'ppm',
    min: 400,
    max: 1200,
    severity: 'warning',
    lowAction: 'CO2 不足，可在光照充足时段补气以提升光合效率',
    highAction: 'CO2 富集过度，立即通风，长期高浓度会抑制植株生长'
  },
  {
    key: 'soilMoisture',
    label: '土壤湿度',
    unit: '%',
    min: 60,
    max: 80,
    severity: 'critical',
    lowAction: '土壤缺水，尽快灌溉，花期缺水会直接导致落花落果',
    highAction: '土壤过湿，暂停灌溉并加强通风，防止沤根与根腐病'
  }
]

export interface InspectionReport {
  inspectedAt: number
  crop: string
  environment: Array<{ label: string; value: number | null; unit: string }>
  soil: {
    summary: string
    moisture: string
    nutrients: Array<{ label: string; value: number | null; unit: string; level: string }>
    suggestions: string[]
  }
  anomalies: Anomaly[]
  /** 供 AI 直接引用的结论段落 */
  conclusion: string
  healthy: boolean
}

function evaluateRule(rule: RangeRule, value: number | null): Anomaly | null {
  if (value === null) return null

  if (rule.min !== undefined && value < rule.min) {
    return {
      key: rule.key,
      label: rule.label,
      value,
      unit: rule.unit,
      expected: `${rule.min}-${rule.max}${rule.unit}`,
      severity: rule.severity ?? 'warning',
      finding: `${rule.label} ${value}${rule.unit}，低于适宜下限 ${rule.min}${rule.unit}`,
      action: rule.lowAction
    }
  }

  if (rule.max !== undefined && value > rule.max) {
    return {
      key: rule.key,
      label: rule.label,
      value,
      unit: rule.unit,
      expected: `${rule.min}-${rule.max}${rule.unit}`,
      severity: rule.severity ?? 'warning',
      finding: `${rule.label} ${value}${rule.unit}，高于适宜上限 ${rule.max}${rule.unit}`,
      action: rule.highAction
    }
  }

  return null
}

/**
 * 执行一次数据侧巡检
 *
 * @param crop 作物类型（当前仅内置草莓阈值，其他作物回退为纯数据汇总，不做异常判定）
 */
export async function runInspection(crop = '草莓'): Promise<InspectionReport> {
  const [conditions, soil] = await Promise.all([getCurrentConditions(), analyzeSoil()])

  const envList = conditions.metrics.map(m => ({
    label: m.label,
    value: m.value,
    unit: m.unit
  }))

  const rules = crop.includes('草莓') ? STRAWBERRY_RULES : []
  const anomalies: Anomaly[] = []

  for (const rule of rules) {
    const metric = conditions.metrics.find(m => m.key === rule.key)
    const hit = evaluateRule(rule, metric?.value ?? null)
    if (hit) anomalies.push(hit)
  }

  // 土壤缺素属于需要处置的异常，一并纳入
  for (const n of soil.nutrients) {
    if (n.level === '缺乏') {
      anomalies.push({
        key: n.key,
        label: n.label,
        value: n.value,
        unit: n.unit,
        expected: '中等及以上',
        severity: 'warning',
        finding: `${n.label} ${n.value ?? '—'}${n.unit}，判定为缺乏`,
        action: n.advice
      })
    }
  }

  const hasData = conditions.measuredAt !== null
  const critical = anomalies.filter(a => a.severity === 'critical')

  let conclusion: string
  if (!hasData) {
    conclusion = '未获取到传感器数据，无法判定环境是否适宜，请检查采集端'
  } else if (anomalies.length === 0) {
    conclusion = `各项指标处于${crop}适宜范围内，暂无需处置`
  } else {
    const parts = [`巡检发现 ${anomalies.length} 项偏离（其中 ${critical.length} 项需优先处理）`]
    parts.push(anomalies.slice(0, 5).map(a => `${a.label}：${a.finding}`).join('；'))
    conclusion = parts.join('。')
  }

  return {
    inspectedAt: Date.now(),
    crop,
    environment: envList,
    soil: {
      summary: soil.summary,
      moisture: soil.moisture.assessment,
      nutrients: soil.nutrients.map(n => ({
        label: n.label,
        value: n.value,
        unit: n.unit,
        level: n.level
      })),
      suggestions: soil.suggestions
    },
    anomalies,
    conclusion,
    healthy: hasData && anomalies.length === 0
  }
}
