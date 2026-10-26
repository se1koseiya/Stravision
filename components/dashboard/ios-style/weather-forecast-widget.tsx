"use client"

import { useMemo } from "react"
import { Flex } from "antd"
import { IOSWidgetCard } from "./ios-widget-card"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import {
  WidgetForecastList,
  type ForecastDay,
} from "./weather-visualizations"
import { WeatherEffects } from "./weather-effects"
import { useWeatherVideo, WeatherVideoBackground } from "./weather-video"
import { getSkyRamp, skyGradient, type SkyRamp } from "./weather-sky"
import { IconCalendar, IconLightRain, IconSunrise, IconSunset, IconThermometer, IconWind } from "@/components/icon";

const A = BERRY_THEME.apple
const ICON_STROKE = 1.75

interface WeatherForecastWidgetProps {
  temperature?: number
  condition?: string
  windSpeed?: number
  windDirection?: number | string
  dailyForecast?: Array<{
    date: string
    day: {
      maxtemp_c: number
      mintemp_c: number
      avgtemp_c?: number
      condition: { text: string; code?: number }
      maxwind_kph: number
      avghumidity?: number
      totalprecip_mm?: number
      daily_chance_of_rain?: number
    }
    astro?: {
      sunrise?: string
      sunset?: string
    }
  }>
  size?: 'small' | 'medium' | 'large'
  className?: string
  isEditing?: boolean
  widgetId?: string
  onRemove?: (id: string) => void
  onContextMenu?: (e: React.MouseEvent, id: string) => void
  onLongPress?: (e: React.TouchEvent | React.MouseEvent, id: string) => void
}

/**
 * 天气色相板已抽到 ./weather-sky（唯一来源）。
 * ⚠️ 原先这里有一份 getGradient，与 weather-widget.tsx 那份**内容不一致** ——
 *    同一场雨在两张卡上是两个颜色。现在两处都读 weather-sky。
 */

function generateFallbackDays(temp: number, condition: string, windSpeed: number, windDir: number | string): ForecastDay[] {
  const dayNames = ['今天', '明天', '周三', '周四', '周五', '周六', '周日']
  return dayNames.map((day, i) => ({
    day,
    condition,
    windSpeed: windSpeed * (0.8 + Math.random() * 0.4),
    windDir,
    high: Math.round(temp + 2 + Math.random() * 3 - i * 0.3),
    low: Math.round(temp - 4 - Math.random() * 2 + i * 0.2),
  }))
}

export function WeatherForecastWidget({
  temperature = 24,
  condition = '晴朗',
  windSpeed = 3,
  windDirection = 0,
  dailyForecast,
  size = 'large',
  className,
  isEditing,
  widgetId,
  onRemove,
  onContextMenu,
  onLongPress,
}: WeatherForecastWidgetProps) {
  const isLarge = size === 'large'
  // 夜间（19:00–06:00）走夜间色板：否则大白天出现深色天空卡，画面自相矛盾
  const hour = new Date().getHours()
  const ramp: SkyRamp = getSkyRamp(condition, hour >= 19 || hour < 6)

  const forecastDays = useMemo<ForecastDay[]>(() => {
    if (dailyForecast && dailyForecast.length > 0) {
      const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      return dailyForecast.slice(0, isLarge ? 7 : 5).map((d, i) => {
        const date = new Date(d.date)
        return {
          day: i === 0 ? '今天' : i === 1 ? '明天' : dayNames[date.getDay()],
          condition: d.day.condition.text,
          windSpeed: d.day.maxwind_kph / 3.6,
          windDir: windDirection,
          high: Math.round(d.day.maxtemp_c),
          low: Math.round(d.day.mintemp_c),
          rainChance: d.day.daily_chance_of_rain,
        }
      })
    }
    return generateFallbackDays(temperature, condition, windSpeed, windDirection)
  }, [dailyForecast, isLarge, temperature, condition, windSpeed, windDirection])

  const avgHigh = Math.round(forecastDays.reduce((s, d) => s + d.high, 0) / forecastDays.length)
  const avgLow = Math.round(forecastDays.reduce((s, d) => s + d.low, 0) / forecastDays.length)
  const maxWind = Math.max(...forecastDays.map(d => d.windSpeed))
  const sunrise = dailyForecast?.[0]?.astro?.sunrise || '05:42'
  const sunset = dailyForecast?.[0]?.astro?.sunset || '18:56'

  // Randomly use weather video background (70% chance)
  const video = useWeatherVideo(condition, 0.7)

  /**
   * 天空底层 —— 同色相明度递减 + 顶部受光 + 地平线柔光。
   *
   * 依据华为「平衡共生」：光影与材质是物理世界在数字世界的映射。
   * 天空之所以读起来像天空，靠的是**上缘受光**（光从上方来）与
   * **地平线处一层薄雾**这两件事，不是靠多套色相。
   */
  const gradientBg = (
    <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', overflow: 'hidden', background: skyGradient(ramp) }}>
      {video.enabled && <WeatherVideoBackground src={video.src} overlayOpacity={0.62} tintDeep={ramp.stops[2]} />}
      {/* 上缘受光：与 HDS 材质「上缘最亮」同一条物理规则，只是这里的天光更强 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(180deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,.05) 26%, transparent 55%)`,
      }} />
      {/* 地平线柔光：把「上方天空 / 下方地面」的交界处点亮，避免读成一块死色 */}
      <div style={{
        position: 'absolute', left: '-10%', right: '-10%', bottom: '-6%', height: '58%',
        background: `radial-gradient(58% 100% at 50% 100%, ${ramp.stops[2]} 0%, transparent 72%)`,
        opacity: 0.5,
      }} />
      {/* 右上角一枚极淡的高空光斑：给同色相画面一个「光源方向」，否则三色渐变太平 */}
      <div style={{
        position: 'absolute', top: -34, right: -26, width: 150, height: 150,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${ramp.accent} 0%, transparent 68%)`,
        opacity: 0.20, filter: 'blur(10px)',
      }} />
      {!video.enabled && <WeatherEffects condition={condition} reduced />}
    </div>
  )

  // ─── MEDIUM ───
  if (!isLarge) {
    return (
      <IOSWidgetCard
        size={size}
        className={className}
        background={gradientBg}
        isEditing={isEditing}
        widgetId={widgetId}
        onRemove={onRemove}
        onContextMenu={onContextMenu}
        onLongPress={onLongPress}
        tint={ramp.accent}
      >
        <Flex vertical style={{ height: '100%' }}>
          <Flex align="center" justify="space-between" style={{ marginBottom: 8 }}>
            <Flex align="center" gap={6}>
              <IconCalendar size={14} strokeWidth={2} color="rgba(255,255,255,0.8)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>未来预报</span>
            </Flex>
            <Flex align="center" gap={8}>
              <Flex align="center" gap={3}>
                <IconThermometer size={10} strokeWidth={2} color="rgba(255,255,255,0.5)" />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums' }}>
                  {avgLow}° / {avgHigh}°
                </span>
              </Flex>
            </Flex>
          </Flex>
          <div style={{ flex: 1, minHeight: 0 }}>
            <WidgetForecastList days={forecastDays.slice(0, 4)} maxTemp={avgHigh + 3} minTemp={avgLow - 3} />
          </div>
        </Flex>
      </IOSWidgetCard>
    )
  }

  // ─── LARGE ───
  return (
    <IOSWidgetCard
      size={size}
      className={className}
      background={gradientBg}
      isEditing={isEditing}
      widgetId={widgetId}
      onRemove={onRemove}
      onContextMenu={onContextMenu}
      onLongPress={onLongPress}
      tint={ramp.accent}
    >
      <Flex vertical gap={8} style={{ height: '100%' }}>
        {/* Header —— 文案 + 日出日落
            华为文本层级：标题用高亮白（primary 层级），日出日落属辅助信息，
            降到 rgba(255,255,255,.66) 上下（≈ secondary 60% 那一档）。 */}
        <Flex align="center" justify="space-between" style={{ paddingLeft: 2 }}>
          <Flex align="center" gap={6}>
            <IconCalendar size={14} strokeWidth={2} color="rgba(255,255,255,.92)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', letterSpacing: '0.01em', lineHeight: 1 }}>
              7 日预报
            </span>
          </Flex>
          <Flex gap={12} align="center">
            <Flex align="center" gap={4}>
              <IconSunrise size={12} strokeWidth={2} color="rgba(255,255,255,.60)" />
              <span style={{ fontSize: 10.5, fontWeight: 500, color: 'rgba(255,255,255,.70)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {sunrise}
              </span>
            </Flex>
            <Flex align="center" gap={4}>
              <IconSunset size={12} strokeWidth={2} color="rgba(255,255,255,.60)" />
              <span style={{ fontSize: 10.5, fontWeight: 500, color: 'rgba(255,255,255,.70)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {sunset}
              </span>
            </Flex>
          </Flex>
        </Flex>

        {/* Forecast list
            ⚠️ 原先这里是个 rgba(255,255,255,.08) + 1px 描边的大圆角容器
               （= 圆角矩形套圆角矩形，违反「一层容器」铁律），在同色相天空底上
               还会显出一块灰白脏斑。现在改为**纯分隔线分区**：靠一条 1px 内缘光
               把列表与页眉/页脚分开，层次仍然在，但不引入第二个容器。 */}
        <div style={{
          flex: 1,
          minHeight: 0,
          padding: '2px 2px 0',
          borderTop: '1px solid rgba(255,255,255,.14)',
          borderBottom: '1px solid rgba(255,255,255,.10)',
          overflow: 'hidden',
        }}>
          <WidgetForecastList
            days={forecastDays}
            maxTemp={avgHigh + 3}
            minTemp={avgLow - 3}
            ramp={ramp}
          />
        </div>

        {/* Summary stats —— 裸排 + 竖细分隔线，不套药丸底
            （4 个圆角矩形并排 = 4 个容器，违反「一层容器」；且在天空底上
              rgba(255,255,255,.10) 的方块会读成一片脏渍，而不是四个数据。） */}
        <Flex align="stretch" style={{ marginTop: 2 }}>
          <SummaryStat icon={<IconThermometer size={13} strokeWidth={ICON_STROKE} />} label="平均高温" value={`${avgHigh}°`} />
          <SummaryStat icon={<IconThermometer size={13} strokeWidth={ICON_STROKE} />} label="平均低温" value={`${avgLow}°`} />
          <SummaryStat icon={<IconWind size={13} strokeWidth={ICON_STROKE} />} label="最大风速" value={`${maxWind.toFixed(1)} m/s`} />
          <SummaryStat
            icon={<IconLightRain size={13} strokeWidth={ICON_STROKE} />}
            label="降水概率"
            value={`${Math.round(forecastDays.reduce((s, d) => s + (d.rainChance || 0), 0) / forecastDays.length)}%`}
            last
          />
        </Flex>
      </Flex>
    </IOSWidgetCard>
  )
}

/**
 * 汇总数据格 —— 裸排：图标 + 数值 + 标签，格间一条 1px 竖线。
 * 华为「最小化色彩管理」：能用留白与分隔线说清的层级，不给它一块底色。
 * 最后一格不带右边线（末格的多余分隔线会在卡边留一道断口）。
 */
function SummaryStat({
  icon,
  label,
  value,
  last = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  last?: boolean
}) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 3,
      padding: '2px 4px',
      borderRight: last ? 'none' : '1px solid rgba(255,255,255,.13)',
    }}>
      {/* 图标与数值同行：把「单位」降级成数值的一部分，视觉上只有一个焦点 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, lineHeight: 1 }}>
        <span style={{ color: 'rgba(255,255,255,.62)', display: 'inline-flex' }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
          {value}
        </span>
      </div>
      <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,.56)', lineHeight: 1, whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </div>
  )
}
