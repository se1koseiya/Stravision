"use client"

// 临时验收路由（/dev-widgets）：直接挂载 dashboard 小组件，无登录门槛。
// 仅用于本地深浅两态截图验收，验收完可删。
//
// ⚠️ 这里必须和 dashboard 用**同一份**材质 CSS + 氛围层，否则卡的 backdrop-filter
//    背后无光可透，截图会误判成「材质没生效」。

import { useEffect } from "react"
import { useTheme } from "next-themes"
import { TemperatureWidget } from "@/components/dashboard/ios-style/temperature-widget"
import { HumidityWidget } from "@/components/dashboard/ios-style/humidity-widget"
import { CO2Widget } from "@/components/dashboard/ios-style/co2-widget"
import { SoilWidget } from "@/components/dashboard/ios-style/soil-widget"
import { HeatmapWidget } from "@/components/dashboard/ios-style/heatmap-widget"
import { IOSWidgetCard, WidgetHeroNumber, WidgetMiniStats } from "@/components/dashboard/ios-style/ios-widget-card"
import { MembershipCard } from "@/components/dashboard/membership-card"
import { SpectralCard } from "@/components/dashboard/spectral-card"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import { MATERIAL_CSS } from "@/components/device/material-css"
import { useAdaptiveMaterialLevel } from "@/components/device/use-material-level"
import { DASHBOARD_MATERIAL_CSS } from "@/components/dashboard/ios-style/widget-material"

function DeviceStatusStripMock() {
  return (
    <div style={{ maxWidth: 360, padding: 16 }}>
      <div style={{
        borderRadius: BERRY_THEME.apple.radius.inner,
        background: BERRY_THEME.apple.surface,
        border: '1px solid var(--berry-card-border)',
        boxShadow: BERRY_THEME.apple.shadow.card,
        padding: 14,
      }}>
        <div style={{ color: BERRY_THEME.apple.label, fontSize: 14, fontWeight: 600, marginBottom: 8 }}>设备状态条带</div>
        <WidgetMiniStats
          stats={[
            { label: '在线', value: '6', color: BERRY_THEME.status.success },
            { label: '离线', value: '1', color: BERRY_THEME.status.error },
          ]}
        />
      </div>
    </div>
  )
}

export default function DevWidgetsPage() {
  const { resolvedTheme, setTheme } = useTheme()
  // 与 dashboard 同源的自适应材质等级（写 <html data-mat-level>）
  useAdaptiveMaterialLevel()

  // 无闪烁：初始按 ?theme=dark|light 或 localStorage 同步
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('theme')
    if (t === 'dark' || t === 'light') setTheme(t)
  }, [setTheme])

  const cell = (el: React.ReactNode, h = 180) => (
    <div style={{ width: 344, height: h, position: 'relative' }}>{el}</div>
  )

  return (
    <div className="relative min-h-screen w-full transition-colors" style={{ background: 'var(--berry-canvas)' }}>
      <style>{MATERIAL_CSS + DASHBOARD_MATERIAL_CSS}</style>
      {/* 氛围层已撤（2026-10-22，见 widget-material.ts 顶部：无景页面不再铺彩色光斑） */}
      <div className="relative">
        <div className="flex items-center gap-3 p-6">
          <span className="text-sm" style={{ color: 'var(--berry-label)' }}>
            当前主题：<b>{resolvedTheme ?? '…'}</b>
          </span>
          <button onClick={() => setTheme('light')} className="px-3 py-1.5 rounded-lg text-sm border" style={{ color: 'var(--berry-label)', borderColor: 'var(--berry-separator-opaque)' }}>浅色</button>
          <button onClick={() => setTheme('dark')} className="px-3 py-1.5 rounded-lg text-sm border" style={{ color: 'var(--berry-label)', borderColor: 'var(--berry-separator-opaque)' }}>深色</button>
        </div>

        <div className="flex flex-wrap gap-6 p-6 pt-0" style={{ color: 'var(--berry-label)' }}>
          {cell(<TemperatureWidget value={22.5} size="medium" />)}
          {cell(<HumidityWidget value={62} size="medium" />)}
          {cell(<CO2Widget value={520} size="medium" />)}
          {cell(<SoilWidget moisture={48} fertility={72} size="medium" />)}
          {cell(<HeatmapWidget />, 344)}
          {cell(<MembershipCard size="medium" />)}
          {cell(<TemperatureWidget value={26.1} size="large" />, 344)}
          {cell(<SpectralCard data={null} />, 344)}
          <div style={{ width: 360 }}><DeviceStatusStripMock /></div>
          <div style={{ width: 344, height: 180, position: 'relative' }}>
            <IOSWidgetCard size="medium">
              <WidgetHeroNumber value="42.0" unit="°C" fontSize={34} />
              <div style={{ height: 12 }} />
              <WidgetMiniStats stats={[{ label: 'tokens', value: '1256' }, { label: 'cost', value: '¥0.42' }]} />
            </IOSWidgetCard>
          </div>
        </div>
      </div>
    </div>
  )
}
