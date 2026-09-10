import { describe, it, expect } from 'vitest'
import { formatTrendInsight, suggestTrendAction } from '../trend-insight-service'
import type { TrendInsight } from '../trend-insight-service'

describe('trend-insight-service - 格式化', () => {
  it('上升趋势格式化（分钟级）', () => {
    const insight: TrendInsight = {
      metric: 'temperature',
      metricLabel: '温度',
      unit: '°C',
      current: 28,
      ratePerHour: 1.5,
      direction: 'high',
      threshold: 30,
      minutesUntilThreshold: 80,
      confidence: 0.8,
    }
    const text = formatTrendInsight(insight)
    expect(text).toContain('温度')
    expect(text).toContain('28°C')
    expect(text).toContain('上升')
    expect(text).toContain('超出上限')
  })

  it('下降趋势格式化（小时级）', () => {
    const insight: TrendInsight = {
      metric: 'soil_moisture',
      metricLabel: '土壤湿度',
      unit: '%',
      current: 38,
      ratePerHour: -2,
      direction: 'low',
      threshold: 30,
      minutesUntilThreshold: 240,
      confidence: 0.7,
    }
    const text = formatTrendInsight(insight)
    expect(text).toContain('土壤湿度')
    expect(text).toContain('4 小时')
    expect(text).toContain('跌破下限')
  })

  it('建议动作按指标+方向匹配', () => {
    expect(suggestTrendAction({ metric: 'humidity', direction: 'high' } as TrendInsight)).toContain('灰霉病')
    expect(suggestTrendAction({ metric: 'temperature', direction: 'high' } as TrendInsight)).toContain('通风')
    expect(suggestTrendAction({ metric: 'co2', direction: 'low' } as TrendInsight)).toContain('CO2')
  })
})
