/**
 * 巡检服务测试
 *
 * 巡检的价值在于「自动标出偏离」，所以重点测判定逻辑本身：
 * 边界值、严重度分级、缺数据兜底、未知作物降级。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/farm-service', () => ({
  getCurrentConditions: vi.fn(),
  analyzeSoil: vi.fn()
}))

import { runInspection } from '../inspection-service'
import { getCurrentConditions, analyzeSoil } from '@/lib/db/farm-service'

function metric(key: string, value: number | null) {
  return {
    key,
    label: key,
    unit: '',
    value,
    avg24h: null,
    delta24h: null,
    trend: 'unknown' as const
  }
}

function mockEnv(values: Record<string, number | null>, measuredAt: number | null = Date.now()) {
  vi.mocked(getCurrentConditions).mockResolvedValue({
    measuredAt,
    dataAgeMinutes: measuredAt ? 1 : null,
    metrics: [
      metric('temperature', values.temperature ?? null),
      metric('humidity', values.humidity ?? null),
      metric('co2', values.co2 ?? null),
      metric('soilMoisture', values.soilMoisture ?? null)
    ]
  })
}

function mockSoil(nutrients: Array<{ key: string; label: string; value: number | null; level: string; advice: string }>) {
  vi.mocked(analyzeSoil).mockResolvedValue({
    measuredAt: Date.now(),
    moisture: { value: 70, unit: '%', assessment: '适宜（70%）' },
    nutrients: nutrients as any,
    fertilityIndex: 250,
    summary: '测试摘要',
    suggestions: ['维持现状']
  })
}

const HEALTHY_NUTRIENTS = [
  { key: 'nitrogen', label: '氮含量', value: 100, level: '中等', advice: '维持' },
  { key: 'phosphorus', label: '磷含量', value: 30, level: '中等', advice: '维持' },
  { key: 'potassium', label: '钾含量', value: 120, level: '中等', advice: '维持' }
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('runInspection - 正常场景', () => {
  it('各项指标在适宜区间内时判定为健康', async () => {
    mockEnv({ temperature: 22, humidity: 70, co2: 800, soilMoisture: 70 })
    mockSoil(HEALTHY_NUTRIENTS)

    const report = await runInspection('草莓')

    expect(report.healthy).toBe(true)
    expect(report.anomalies).toHaveLength(0)
    expect(report.conclusion).toContain('适宜范围')
  })

  it('边界值（等于下限/上限）不算偏离', async () => {
    mockEnv({ temperature: 15, humidity: 85, co2: 1200, soilMoisture: 80 })
    mockSoil(HEALTHY_NUTRIENTS)

    const report = await runInspection('草莓')

    expect(report.healthy).toBe(true)
    expect(report.anomalies).toHaveLength(0)
  })
})

describe('runInspection - 异常判定', () => {
  it('温度过低标记为需优先处理并给出加温建议', async () => {
    mockEnv({ temperature: 8, humidity: 70, co2: 800, soilMoisture: 70 })
    mockSoil(HEALTHY_NUTRIENTS)

    const report = await runInspection('草莓')

    expect(report.healthy).toBe(false)
    const temp = report.anomalies.find(a => a.key === 'temperature')!
    expect(temp.severity).toBe('critical')
    expect(temp.finding).toContain('低于适宜下限')
    expect(temp.action).toContain('加温')
  })

  it('湿度过高提示病害风险', async () => {
    mockEnv({ temperature: 22, humidity: 95, co2: 800, soilMoisture: 70 })
    mockSoil(HEALTHY_NUTRIENTS)

    const report = await runInspection('草莓')

    const hum = report.anomalies.find(a => a.key === 'humidity')!
    expect(hum.severity).toBe('warning')
    expect(hum.action).toContain('通风')
  })

  it('土壤缺素一并纳入异常项', async () => {
    mockEnv({ temperature: 22, humidity: 70, co2: 800, soilMoisture: 70 })
    mockSoil([
      { key: 'nitrogen', label: '氮含量', value: 40, level: '缺乏', advice: '建议追施氮肥' },
      { key: 'phosphorus', label: '磷含量', value: 30, level: '中等', advice: '维持' },
      { key: 'potassium', label: '钾含量', value: 120, level: '中等', advice: '维持' }
    ])

    const report = await runInspection('草莓')

    expect(report.healthy).toBe(false)
    const n = report.anomalies.find(a => a.key === 'nitrogen')!
    expect(n.finding).toContain('缺乏')
    expect(n.action).toContain('氮肥')
  })

  it('多项异常时结论区分需优先处理与需关注', async () => {
    mockEnv({ temperature: 5, humidity: 95, co2: 800, soilMoisture: 40 })
    mockSoil(HEALTHY_NUTRIENTS)

    const report = await runInspection('草莓')

    expect(report.anomalies.length).toBeGreaterThanOrEqual(3)
    expect(report.conclusion).toContain('需优先处理')
  })
})

describe('runInspection - 降级与边界', () => {
  it('无传感器数据时不谎报健康', async () => {
    mockEnv({}, null)
    mockSoil(HEALTHY_NUTRIENTS)

    const report = await runInspection('草莓')

    expect(report.healthy).toBe(false)
    expect(report.conclusion).toContain('未获取到传感器数据')
  })

  it('未内置阈值的作物只汇总数据不做异常判定', async () => {
    mockEnv({ temperature: 2, humidity: 20, co2: 3000, soilMoisture: 10 })
    mockSoil(HEALTHY_NUTRIENTS)

    const report = await runInspection('番茄')

    expect(report.anomalies).toHaveLength(0)
    expect(report.crop).toBe('番茄')
  })

  it('指标为 null 时不产生误判', async () => {
    mockEnv({ temperature: null, humidity: null, co2: null, soilMoisture: null })
    mockSoil(HEALTHY_NUTRIENTS)

    const report = await runInspection('草莓')

    expect(report.anomalies).toHaveLength(0)
    expect(report.environment.every(e => e.value === null)).toBe(true)
  })
})
