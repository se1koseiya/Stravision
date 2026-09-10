/**
 * 农业数据服务测试
 *
 * 重点覆盖「从裸数值到农事结论」的翻译逻辑：
 * - 趋势方向判定（升/降/平）
 * - 氮磷钾丰缺评级边界
 * - 土壤湿度适宜区间判断
 * - 缺数据时的降级措辞（不能把 null 说成 0）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../database', () => ({
  initDB: vi.fn(),
  query: vi.fn()
}))

import { getCurrentConditions, analyzeSoil, getDeviceActivity } from '../farm-service'
import { query } from '../database'

/** 按 SQL 特征分派 mock 结果，模拟 sensor_readings 的三段查询 */
function mockConditions({ latest, avg, base }: { latest?: any; avg?: any; base?: any }) {
  vi.mocked(query).mockImplementation(async (sql: string) => {
    if (sql.includes('AVG(')) return [avg ?? {}]
    if (sql.includes('ASC')) return base ? [base] : []
    return latest ? [latest] : []
  })
}

/** 取出最近一次 query 调用的 [sql, params]，规避 mock.calls 元素的可选类型 */
function lastQueryCall(): [string, any[]] {
  const calls = vi.mocked(query).mock.calls
  return calls[calls.length - 1] as [string, any[]]
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getCurrentConditions', () => {
  it('返回 9 项指标的最新值、24h 均值与趋势', async () => {
    const now = Date.now()
    mockConditions({
      latest: {
        temperature: 26.5,
        humidity: 70.2,
        light: 12000,
        co2: 620,
        soil_moisture: 65,
        earth_n: 90,
        earth_p: 30,
        earth_k: 120,
        rainfall: 0,
        created_at: now
      },
      avg: {
        temperature_avg: 24.1,
        humidity_avg: 68.0
      },
      base: {
        temperature: 22.0,
        humidity: 69.0,
        created_at: now - 24 * 3600 * 1000
      }
    })

    const report = await getCurrentConditions()

    expect(report.measuredAt).toBe(now)
    expect(report.metrics).toHaveLength(9)

    const temp = report.metrics.find(m => m.key === 'temperature')!
    expect(temp.value).toBe(26.5)
    expect(temp.avg24h).toBe(24.1)
    expect(temp.trend).toBe('rising')
    expect(temp.delta24h).toBe(4.5)

    // 湿度 69 -> 70.2 变化约 1.7%，低于 2% 阈值，应判平稳
    const hum = report.metrics.find(m => m.key === 'humidity')!
    expect(hum.trend).toBe('stable')
  })

  it('数值下降时判定为 falling', async () => {
    const now = Date.now()
    mockConditions({
      latest: { temperature: 18.0, created_at: now },
      base: { temperature: 25.0, created_at: now - 3600 * 1000 }
    })

    const report = await getCurrentConditions()
    const temp = report.metrics.find(m => m.key === 'temperature')!
    expect(temp.trend).toBe('falling')
    expect(temp.delta24h).toBe(-7)
  })

  it('无数据时返回 null 而不是 0，避免 AI 把缺数当实测值', async () => {
    mockConditions({})

    const report = await getCurrentConditions()

    expect(report.measuredAt).toBeNull()
    expect(report.dataAgeMinutes).toBeNull()
    expect(report.metrics.every(m => m.value === null)).toBe(true)
  })

  it('数据陈旧时 dataAgeMinutes 反映真实间隔', async () => {
    const twoHoursAgo = Date.now() - 2 * 3600 * 1000
    mockConditions({ latest: { temperature: 20, created_at: twoHoursAgo } })

    const report = await getCurrentConditions()

    expect(report.dataAgeMinutes).toBeGreaterThanOrEqual(119)
    expect(report.dataAgeMinutes).toBeLessThanOrEqual(121)
  })
})

describe('analyzeSoil', () => {
  function mockSoil(row: any) {
    vi.mocked(query).mockImplementation(async () => (row ? [row] : []))
  }

  it('氮磷钾分别评级，缺素项给出补充建议', async () => {
    mockSoil({
      soil_moisture: 45,
      earth_n: 40,   // < 60 缺乏
      earth_p: 30,   // 20-40 中等
      earth_k: 200,  // > 150 丰富
      created_at: Date.now()
    })

    const report = await analyzeSoil()

    const n = report.nutrients.find(x => x.key === 'nitrogen')!
    const p = report.nutrients.find(x => x.key === 'phosphorus')!
    const k = report.nutrients.find(x => x.key === 'potassium')!

    expect(n.level).toBe('缺乏')
    expect(p.level).toBe('中等')
    expect(k.level).toBe('丰富')

    expect(report.fertilityIndex).toBe(270)
    expect(report.summary).toContain('缺1项')
    expect(report.suggestions.some(s => s.includes('优先补充'))).toBe(true)
  })

  it('土壤偏干时建议先灌溉再追肥', async () => {
    mockSoil({ soil_moisture: 40, earth_n: 100, earth_p: 30, earth_k: 120 })

    const report = await analyzeSoil()

    expect(report.moisture.assessment).toContain('偏干')
    expect(report.suggestions.some(s => s.includes('灌溉'))).toBe(true)
  })

  it('土壤过湿时提示排水与病害风险', async () => {
    mockSoil({ soil_moisture: 92, earth_n: 100, earth_p: 30, earth_k: 120 })

    const report = await analyzeSoil()

    expect(report.moisture.assessment).toContain('偏湿')
    expect(report.suggestions.some(s => s.includes('排水') || s.includes('通风'))).toBe(true)
  })

  it('指标全部正常时给出维持现状的建议', async () => {
    mockSoil({ soil_moisture: 70, earth_n: 100, earth_p: 30, earth_k: 120 })

    const report = await analyzeSoil()

    expect(report.moisture.assessment).toContain('适宜')
    expect(report.suggestions).toHaveLength(1)
    expect(report.suggestions[0]).toContain('正常')
  })

  it('无土壤数据时评级为未知而非缺乏', async () => {
    mockSoil(null)

    const report = await analyzeSoil()

    expect(report.fertilityIndex).toBeNull()
    expect(report.nutrients.every(n => n.level === '未知')).toBe(true)
    expect(report.summary).toContain('数据不完整')
  })

  it('兼容历史数据土壤湿度未归一化（>100 按 /10 处理）', async () => {
    mockSoil({ soil_moisture: 700, earth_n: 100, earth_p: 30, earth_k: 120 })

    const report = await analyzeSoil()

    expect(report.moisture.assessment).toContain('70%')
    expect(report.moisture.assessment).toContain('适宜')
  })
})

describe('getDeviceActivity', () => {
  it('默认回溯 7 天并限制返回条数', async () => {
    vi.mocked(query).mockResolvedValue([])

    await getDeviceActivity()

    const [sql, params] = lastQueryCall()
    expect(sql).toContain('device_logs')
    expect(params[params.length - 1]).toBe(20) // limit 兜底 20
    expect(params[0]).toBeGreaterThan(Date.now() - 7 * 24 * 3600 * 1000 - 5000)
  })

  it('limit 超出上限时收敛到 100', async () => {
    vi.mocked(query).mockResolvedValue([])

    await getDeviceActivity({ limit: 9999 })

    const [, params] = lastQueryCall()
    expect(params[params.length - 1]).toBe(100)
  })

  it('指定设备名时追加过滤条件', async () => {
    vi.mocked(query).mockResolvedValue([])

    await getDeviceActivity({ deviceName: '水泵' })

    const [sql, params] = lastQueryCall()
    expect(sql).toContain('device_name =')
    expect(params).toContain('水泵')
  })

  it('映射数据库字段为驼峰结构', async () => {
    vi.mocked(query).mockResolvedValue([
      {
        id: 7,
        device_name: '大棚水泵',
        action: '开启',
        operator: 'Zarx',
        details: '灌溉 10 分钟',
        created_at: 1757400000000
      }
    ] as any)

    const entries = await getDeviceActivity({ limit: 5 })

    expect(entries).toHaveLength(1)
    expect(entries[0]).toEqual({
      id: 7,
      deviceName: '大棚水泵',
      action: '开启',
      operator: 'Zarx',
      details: '灌溉 10 分钟',
      createdAt: 1757400000000
    })
  })
})
