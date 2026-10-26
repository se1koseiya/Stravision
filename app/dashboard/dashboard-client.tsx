"use client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { PageNavigation } from "@/components/page-navigation"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import { CopilotSidebar } from "@/components/ai/copilot/copilot-sidebar"
import { Button } from "@/components/ui/button"
import { ConfigProvider, theme as antdTheme, Typography, Tag, Flex } from "antd"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useDeviceData, type DeviceData } from "@/lib/hooks/use-device-data"
import { useDeviceControl } from "@/lib/hooks/use-device-control"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import { simulatedHistoryMap, useSimulatedValues } from "@/lib/demo/simulated-metrics"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import type { UserPublic, MembershipTier } from "@/lib/db/user-service"
import { useState, useEffect, useMemo } from "react"
import dynamic from "next/dynamic"
import { IconApplicationOne, IconChartHistogram, IconChartLine, IconCpu, IconDashboard, IconEdit, IconFan, IconGridFour, IconLeaf, IconLight, IconMinus, IconMonitor, IconPlus, IconPreviewClose, IconPreviewOpen, IconSave, IconSettingTwo, IconSignal, IconSun, IconThermometer, IconVideo, IconWater, IconWind } from "@/components/icon";

// react-grid-layout 是重型库，延迟加载
const GridLayout = dynamic(() => import("react-grid-layout").then(m => ({ default: m.default })), { ssr: false })
import type { Layout } from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"
import { DashboardChartCard } from "@/components/dashboard/DashboardChartCard"
import { SpectralCard } from "@/components/dashboard/spectral-card"
import { MembershipCard } from "@/components/dashboard/membership-card"
import { AiInsightCard } from "@/components/dashboard/ai-insight-card"
import {
  TemperatureWidget,
  HumidityWidget,
  LightWidget,
  CO2Widget,
  SoilWidget,
  WeatherWidget,
  WeatherForecastWidget,
  HeatmapWidget,
  NutrientWidget,
  IOSWidgetCard,
  WidgetLabel,
  WidgetStatusPill,
  WidgetHeroNumber,
  TopBanner
} from "@/components/dashboard/ios-style"
import { LAYOUT_PRESETS, getWidgetSize } from "@/lib/dashboard-layouts"
import { toast } from "@/lib/ui/feedback"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useElderFriendly } from "@/lib/contexts/elder-friendly-context"
import { ElderFriendlyToggle } from "@/components/elder-friendly-toggle"
import { PageHeader } from "@/components/page-header"
import { PageHeaderRight } from "@/components/page-header-right"
// 沉浸光感材质（HDS 组件材质）：**唯一来源**，档位 + 材质本体 + 自适应等级都在这里。
// dashboard 只做「把变量接到小组件卡上」+ 自己那层氛围光，不复制任何材质数值。
import { MATERIAL_CSS } from "@/components/device/material-css"
import { useAdaptiveMaterialLevel } from "@/components/device/use-material-level"
// dashboard 侧的氛围层 + 小组件卡补充（材质数值仍只在 material-css.ts，此处不含 --mat-* 数值）
import { DASHBOARD_MATERIAL_CSS } from "@/components/dashboard/ios-style/widget-material"
import { WidgetLibraryDialog } from "@/components/dashboard/widget-library-dialog"
import { DailyBriefingIsland } from "@/components/daily-briefing-island"
// 删除小组件的「消散成粒子」（HDS/华为删除动效）：先收 + 迸散，300ms 后才摘出 layout 让网格回流
import { dissolveWidget } from "@/components/dashboard/widget-dissolve"

// ─── 设备状态条带组件（动态展示设备注册表中的所有设备） ───

const DASH_DEVICE_ICON_MAP: Record<string, typeof IconCpu> = {
  IconThermometer, IconWater, IconFan, IconLight, IconSun, IconWind, IconVideo, IconCpu, IconChartLine, IconDashboard, IconSignal, IconMonitor,
  default: IconCpu,
}

function getDashDeviceIcon(iconName: string): typeof IconCpu {
  return DASH_DEVICE_ICON_MAP[iconName] || DASH_DEVICE_ICON_MAP.default
}

interface DeviceStatusStripProps {
  devices: Array<{
    id: number
    name: string
    type: string
    icon: string
    color: string
    is_enabled: boolean
    config: any
  }>
  deviceData: any
  customDeviceData: Record<number, Record<string, any>>
}

function DeviceStatusStrip({ devices, deviceData, customDeviceData }: DeviceStatusStripProps) {
  const enabledDevices = useMemo(() => devices.filter(d => d.is_enabled), [devices])

  if (enabledDevices.length === 0) return null

  return (
    <div className="w-full max-w-[1400px] mx-auto mb-6">
      <div className="flex items-center gap-2 mb-3 px-1">
        <IconGridFour className="h-4 w-4 text-[#059669]" strokeWidth={2} />
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">设备状态</h3>
        <span className="text-xs text-zinc-400">{enabledDevices.length}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {enabledDevices.map((d) => {
          const IconCmp = getDashDeviceIcon(d.icon)
          const hex = d.color || '#059669'
          let statusText = '离线'
          let statusColor = '#8f959e'
          let primaryValue = ''

          if (d.type === 'relay') {
            const relayNum = d.config?.relay_num as number | undefined
            const on = relayNum
              ? deviceData?.[`relay${relayNum}`] === 1
              : false
            statusText = on ? '开启' : '关闭'
            statusColor = on ? '#059669' : '#8f959e'
            primaryValue = on ? 'ON' : 'OFF'
          } else if (d.type === 'sensor') {
            const data = customDeviceData[d.id] || {}
            const hasData = Object.keys(data).length > 0
            const firstMetric = d.config?.metrics?.[0]
            if (hasData && firstMetric) {
              const raw = data[firstMetric.mqtt_field]
              if (raw !== undefined && raw !== null) {
                const val = firstMetric.scale ? Number(raw) * firstMetric.scale : Number(raw)
                primaryValue = `${isNaN(val) ? '--' : val.toFixed(firstMetric.scale && firstMetric.scale < 1 ? 1 : 0)}${firstMetric.unit}`
              }
            }
            statusText = hasData ? '实时' : '等待'
            statusColor = hasData ? '#059669' : '#52525B'
          } else if (d.type === 'camera') {
            statusText = '在线'
            statusColor = '#059669'
            primaryValue = d.config?.camera_id || 'CAM'
          } else if (d.type === 'stepper') {
            const pos = deviceData?.stepper_position
            statusText = '就绪'
            statusColor = '#059669'
            primaryValue = pos !== undefined ? `${pos}p` : ''
          }

          return (
            <div
              key={d.id}
              className="relative p-3 transition-all"
              style={{
                borderRadius: BERRY_THEME.apple.radius.inner,
                background: BERRY_THEME.apple.surface,
                border: '1px solid var(--berry-card-border)',
                boxShadow: BERRY_THEME.apple.shadow.card,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className="h-8 w-8 flex items-center justify-center"
                  style={{
                    backgroundColor: `${hex}1a`,
                    color: hex,
                    borderRadius: BERRY_THEME.apple.radius.small,
                    boxShadow: BERRY_THEME.apple.shadow.inner,
                  }}
                >
                  <IconCmp className="h-4 w-4" strokeWidth={2} />
                </div>
                <div className="flex items-center gap-1">
                  <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: statusColor }} />
                  <span className="text-[11px] font-medium" style={{ color: statusColor }}>{statusText}</span>
                </div>
              </div>
              <div className="text-xs font-bold truncate mb-0.5" style={{ color: BERRY_THEME.apple.label }}>{d.name}</div>
              {primaryValue && (
                <div className="text-[11px] font-mono" style={{ color: BERRY_THEME.apple.labelTertiary }}>{primaryValue}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function DashboardClient({ version = 'full' }: { version?: 'full' | 'simplified' }) {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const { isElderFriendlyMode, toggleElderFriendlyMode } = useElderFriendly()
  // 自适应材质等级（HDS MaterialLevel）：写 <html data-mat-level>，低配设备自动降模糊半径。
  // 与设备控制页同一套机制 —— 等级只缩放 blur()，saturate/brightness 这两个「光感本体」任何档位都保留。
  useAdaptiveMaterialLevel()

  // User authentication state
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  // Connect to SSE for real-time device data
  const { deviceData, connectionStatus, devices, customDeviceData } = useDeviceData()

  // Device control functions
  const { toggleRelay, setLEDs } = useDeviceControl()

  // Use shared weather data from context
  const { weatherData } = useWeatherContext()

  // Batched history data fetching for optimization
  const [historyDataMap, setHistoryDataMap] = useState<Record<string, any[]>>({})

  /** 模拟数值（仅非安装产物）：真机没历史表，走势图会全空，这里整份替换 */
  const simulatedValues = useSimulatedValues()

  useEffect(() => {
    // List of all types used in the dashboard
    const types = [
      'humidity', 'temperature', 'light', 'co2',
      'soilMoisture', 'fertility', 'nitrogen',
      'phosphorus', 'potassium', 'rainfall'
    ]

    if (simulatedValues) {
      setHistoryDataMap(simulatedHistoryMap(types, '1h'))
      return
    }

    const fetchAllHistory = async () => {
      try {
        const res = await fetch(`/api/device-history?types=${types.join(',')}&range=1h`)
        const data = await res.json()
        if (data.success) {
          setHistoryDataMap(data.data)
        }
      } catch (e) {
        console.error("Failed to fetch dashboard history:", e)
      }
    }
    fetchAllHistory()
  }, [simulatedValues])

  const defaultLayout = LAYOUT_PRESETS.default.layout
  const compactLayout = LAYOUT_PRESETS.compact.layout
  const dataFirstLayout = LAYOUT_PRESETS.dataFirst.layout
  const monitorLayout = LAYOUT_PRESETS.monitor.layout
  const environmentLayout = LAYOUT_PRESETS.environment.layout
  const soilLayout = LAYOUT_PRESETS.soil.layout

  const [layout, setLayout] = useState(defaultLayout)
  const [currentPreset, setCurrentPreset] = useState("default")
  const [isEditMode, setIsEditMode] = useState(false)
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false)

  const handlePresetChange = (preset: string) => {
    setCurrentPreset(preset)
    let newLayout = defaultLayout
    switch (preset) {
      case "compact": newLayout = compactLayout; break;
      case "dataFirst": newLayout = dataFirstLayout; break;
      case "monitor": newLayout = monitorLayout; break;
      case "environment": newLayout = environmentLayout; break;
      case "soil": newLayout = soilLayout; break;
      default: newLayout = defaultLayout;
    }
    setLayout(newLayout)
    localStorage.setItem('dashboard-layout', JSON.stringify(newLayout))
    localStorage.setItem('dashboard-layout-preset', preset)
  }

  // Fetch current user on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me")
        const data = await response.json()

        if (data.authenticated && data.user) {
          setCurrentUser(data.user)
        } else {
          router.push("/login")
        }
      } catch (error) {
        console.error("获取用户信息失败:", error)
        router.push("/login")
      } finally {
        setIsLoadingUser(false)
      }
    }

    fetchCurrentUser()
  }, [router])

  // 从 localStorage 加载布局
  useEffect(() => {
    const savedLayout = localStorage.getItem('dashboard-layout')
    const savedPreset = localStorage.getItem('dashboard-layout-preset')
    if (savedPreset) {
      setCurrentPreset(savedPreset)
    }
    if (savedLayout) {
      try {
        const parsed = JSON.parse(savedLayout)
        if (Array.isArray(parsed)) {
          /* 小组件更名迁移：`ai-insight`（AI 洞察）已改为顶栏 hero 横幅，
             原网格位改用「环境时段热力图」。老用户 localStorage 里的键必须一起改名，
             否则该位置变成一个空槽（空格子不会自动回流）。 */
          setLayout(parsed.map((l: any) => (l?.i === 'ai-insight' ? { ...l, i: 'heatmap' } : l)))
        }
      } catch (e) {
        console.error('Failed to load layout:', e)
      }
    }
  }, [])

  const handleRemoveWidget = (id: string) => {
    toast.custom((t) => (
      <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-2xl rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] border border-white/60 dark:border-white/10 p-5 flex flex-col gap-4 min-w-[320px] max-w-[360px] pointer-events-auto">
        <div className="flex flex-col gap-1">
          <div className="font-bold text-zinc-900 dark:text-white text-lg">移除组件</div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">确定要隐藏这个小组件吗？</div>
        </div>
        <div className="flex justify-end gap-3 mt-2">
          <Button variant="ghost" className="rounded-full font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-700" onClick={() => toast.dismiss(t)}>取消</Button>
          <Button className="rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold shadow-sm shadow-red-500/20" onClick={() => {
            /* 真正的移除：只改 layout + 落库。
               ⚠️ 它**不能**直接调 —— 必须先播「收 + 粒子飘散」（dissolveWidget），
                  300ms 后再执行这个回调。一上来就 remove，卡片会「瞬间消失 + 网格跳一下」，
                  既看不出材质被解离，也看不出其余卡片回流补位（这正是华为那套动效的两段节奏）。 */
            const commitRemoval = () => {
              setLayout(prev => {
                const newLayout = prev.filter(l => l.i !== id)
                localStorage.setItem('dashboard-layout', JSON.stringify(newLayout))
                return newLayout
              })
            }
            dissolveWidget(id, commitRemoval)
            toast.dismiss(t)
            toast.success("已移除小组件", {
              className: "rounded-full backdrop-blur-md bg-white/90 dark:bg-zinc-800/90 border-white/60 dark:border-white/10 shadow-lg"
            })
          }}>确定移除</Button>
        </div>
      </div>
    ), {
      duration: Infinity,
      position: 'top-center',
      unstyled: true,
      className: "!bg-transparent !border-none !p-0 !shadow-none !backdrop-blur-none",
      style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, minWidth: 'auto', backdropFilter: 'none' }
    })
  }

  const handleWidgetContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    // Trigger context menu via state/popover
    setContextMenuState({ x: e.clientX, y: e.clientY, widgetId: id })
  }

  const handleWidgetLongPress = (e: React.TouchEvent | React.MouseEvent, id: string) => {
    if (isEditMode) return

    // For touch devices, simulate context menu opening
    let clientX = 0, clientY = 0
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    setContextMenuState({ x: clientX, y: clientY, widgetId: id })
  }

  const handleResizeWidget = (id: string, size: 'small' | 'medium' | 'large') => {
    setLayout(prev => {
      const newLayout = prev.map(item => {
        if (item.i === id) {
          // Adjust dimensions based on requested size
          let newW = item.w, newH = item.h
          if (size === 'small') { newW = 2; newH = 2; }
          else if (size === 'medium') { newW = 4; newH = 2; }
          else if (size === 'large') { newW = 4; newH = 4; }
          return { ...item, w: newW, h: newH }
        }
        return item
      })
      // Save size changes immediately
      localStorage.setItem('dashboard-layout', JSON.stringify(newLayout))
      return newLayout
    })
    setContextMenuState(null)
  }

  const [contextMenuState, setContextMenuState] = useState<{ x: number, y: number, widgetId: string } | null>(null)

  const onLayoutChange = (newLayout: Layout[]) => {
    if (isEditMode) {
      setLayout(newLayout)
    }
  }

  const handleSaveLayout = () => {
    localStorage.setItem('dashboard-layout', JSON.stringify(layout))
    setIsEditMode(false)
    toast.success('布局已保存', {
      description: '您的个性化仪表盘设置已更新',
      duration: 3000,
    })
  }

  const handleEditMode = () => {
    setIsEditMode(!isEditMode)
  }

  const handleAddWidget = (widgetId: string, size: 'small' | 'medium' | 'large') => {
    // Check if widget already exists
    if (layout.find(l => l.i === widgetId)) {
      toast.error('该小组件已存在')
      return
    }

    // Calculate dimensions based on size
    let w = 2, h = 2
    if (size === 'medium') { w = 4; h = 2; }
    else if (size === 'large') { w = 4; h = 4; }

    // Find a good position for the new widget (top-left available space)
    let x = 0, y = 0
    const maxY = Math.max(...layout.map(l => l.y + l.h), 0)

    // Try to place at the end
    y = maxY

    const newItem = {
      i: widgetId,
      x,
      y,
      w,
      h,
      minW: 2,
      minH: 2
    }

    const newLayout = [...layout, newItem]
    setLayout(newLayout)
    localStorage.setItem('dashboard-layout', JSON.stringify(newLayout))

    toast.success('小组件已添加', {
      description: '您可以拖动调整位置和大小',
      duration: 3000,
    })
  }

  const getCurrentWidgetSize = (id: string): 'small' | 'medium' | 'large' => {
    const item = layout.find(l => l.i === id)
    if (!item) return getWidgetSize(id)

    // Logic based on grid units (12 cols total)
    // Small: usually width 2 (2/12 = 1/6 of screen, ~ square-ish on wide screen)
    // Medium: width 4 (1/3 of screen)
    // Large: width 4 and height 4

    if (item.w >= 4 && item.h >= 4) return 'large'
    if (item.w >= 4) return 'medium'
    return 'small'
  }

  // Show loading state while checking authentication
  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="animate-in fade-in duration-500">
          <div className="h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50" />
          <div className="p-6">
            <div className="max-w-[1400px] mx-auto">
              <div className="h-12 w-80 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse mb-2" />
              <div className="h-4 w-96 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-8" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-72 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
                <div className="h-72 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Don't render page if no user (will redirect)
  if (!currentUser) {
    return null
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: BERRY_THEME.primary,
          borderRadius: BERRY_THEME.radius.lg,
        },
      }}
    >
    <>
      {/* 沉浸光感材质（唯一来源）+ 本页的氛围层与小组件卡补充
          ⚠️ 必须用**普通 <style>**（不是 styled-jsx）：styled-jsx 的模板串不接受运行时插值，
             而 MATERIAL_CSS 是从 material-css.ts 引入的共享常量。 */}
      <style>{MATERIAL_CSS + DASHBOARD_MATERIAL_CSS}</style>
      <style jsx global>{`
        @keyframes rain-dashboard {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 0.4; }
          90% { opacity: 0.4; }
          100% { transform: translateY(300%); opacity: 0; }
        }
        @keyframes fade-in-dashboard {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes grow-bar {
          from { transform: scaleY(0); transform-origin: bottom; }
          to { transform: scaleY(1); transform-origin: bottom; }
        }
        .animate-rain-dashboard { animation: rain-dashboard 1.2s linear infinite; }
        .animate-fade-in-dashboard { animation: fade-in-dashboard 0.6s ease-out; }
        .animate-grow-bar { animation: grow-bar 0.8s ease-out; }
      `}</style>
      <div className="relative min-h-screen w-screen h-screen overflow-hidden text-foreground">
        {/* 画布底。⚠️ 这两层是**不透明**的：桌面端玻璃壳打开时它们会把窗口背后那层
            acrylic 挡死，卡片因此没有东西可透 —— 表现就是用户说的「深色模式下没有磨砂透明」。
            所以给它们挂了 dash-canvas-layer 类，由 globals.css 在 html[data-glass-shell="on"]
            下强制让位（第一层透明、第二层 display:none），浏览器部署下行为不变。 */}
        <div className="absolute inset-0 dash-canvas-layer" style={{ background: BERRY_THEME.apple.canvasGradient }} />
        <div className="absolute inset-0 hidden dark:block dark:bg-zinc-950 dash-canvas-layer dash-canvas-layer--dark" />
        {/* 沉浸光感 · 氛围层 —— 2026-10-22 已按用户要求**从这里移除**。
            原因不是"这层做得不好"，而是判据：氛围光只为「让玻璃有东西可透」而存在。
            数据看板是 iOS 小组件风、底色接近纯白、卡又密，铺一层彩色光带之后
            整页读起来是"彩色页面"而不是"看数据的页面"（用户原话：好丑）。
            移除后本页走「无景」分支：卡片由 material-css.ts 的场景轴自动退成实色表面。
            ⚠️ 不要单独把它加回来 —— 没有氛围光的页面挂玻璃材质 = 一块没有光的淡白板。 */}

        {/* Daily Briefing Dynamic Island */}
        <DailyBriefingIsland
          username={currentUser?.username}
          deviceData={deviceData}
          weatherData={weatherData}
          enabled={!!currentUser}
        />

        {/* Global click to close context menu */}
        {contextMenuState && (
          <div
            className="fixed inset-0 z-40 bg-black/5 dc-gblur"
            style={{ "--gblur": "1px" } as React.CSSProperties}
            onClick={() => setContextMenuState(null)}
          />
        )}

        <div className="relative grid grid-rows-[var(--header-h,72px)_1fr] h-full w-full">
          {/* Header */}
          <PageHeader user={currentUser}>
            <PageHeaderRight
              connectionStatus={connectionStatus}
            >
              {/* 布局切换 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                    <IconGridFour className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>切换视图</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handlePresetChange("default")}>
                    <IconGridFour className="size-4 mr-2" /> 默认视图
                    {currentPreset === "default" && <span className="ml-auto text-xs">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePresetChange("compact")}>
                    <IconGridFour className="size-4 mr-2" /> 紧凑视图
                    {currentPreset === "compact" && <span className="ml-auto text-xs">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePresetChange("dataFirst")}>
                    <IconChartHistogram className="size-4 mr-2" /> 数据优先
                    {currentPreset === "dataFirst" && <span className="ml-auto text-xs">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePresetChange("monitor")}>
                    <IconMonitor className="size-4 mr-2" /> 监控大屏
                    {currentPreset === "monitor" && <span className="ml-auto text-xs">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePresetChange("environment")}>
                    <IconWind className="size-4 mr-2" /> 环境监测
                    {currentPreset === "environment" && <span className="ml-auto text-xs">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePresetChange("soil")}>
                    <IconLeaf className="size-4 mr-2" /> 土壤监测
                    {currentPreset === "soil" && <span className="ml-auto text-xs">✓</span>}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 编辑按钮 */}
              {isEditMode ? (
                <Button
                  onClick={handleSaveLayout}
                  size="sm"
                  className="h-8 rounded-lg bg-primary text-white px-3"
                >
                  完成
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                      <IconEdit className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setShowWidgetLibrary(true)}>
                      <IconApplicationOne className="size-4 mr-2" /> 添加组件
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleEditMode}>
                      <IconEdit className="size-4 mr-2" /> 编辑布局
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                      setLayout(defaultLayout)
                      setCurrentPreset("default")
                      localStorage.setItem('dashboard-layout', JSON.stringify(defaultLayout))
                      localStorage.setItem('dashboard-layout-preset', 'default')
                      toast.success('已恢复默认布局')
                    }}>
                      <IconSettingTwo className="size-4 mr-2" /> 恢复默认
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </PageHeaderRight>
          </PageHeader>

          {/* Dashboard Content */}
          <div
            className="relative px-8 pb-8 pt-6 overflow-y-auto h-full w-full custom-scrollbar"
            data-lenis-prevent
          >
            <div className="w-full max-w-[1400px] mx-auto mb-6">
              <TopBanner
                userName={currentUser.username || currentUser.email || "用户"}
                deviceData={deviceData}
                onDeviceCommand={(command) => {
                  // Handle device commands from voice assistant
                  if (command.action === 'toggle_relay' && command.device !== undefined) {
                    // Get current state from deviceData
                    const relayKey = `relay${command.device}` as 'relay5' | 'relay6' | 'relay7' | 'relay8'
                    const currentState = (deviceData?.[relayKey] as number) || 0
                    toggleRelay(command.device, currentState)
                  } else if (command.action === 'set_led' && command.r !== undefined) {
                    // Convert RGB to LED values (assuming r=led1, g=led2, b=led3)
                    setLEDs(
                      command.r || 0,
                      command.g || 0,
                      command.b || 0,
                      0 // led4 not used in RGB commands
                    )
                  }
                }}
              />
            </div>

            {/* AI 每日洞察 —— 顶栏 hero 横幅。
                原先这份洞察被塞在网格的 4×4 槽位里（且存在第二份重复实现）；
                现在网格槽位让给「环境时段热力图」，AI 洞察改为宽幅横幅，
                顺带把 public/ip 的 3D 图标（实物感资产）用起来。 */}
            <div className="w-full max-w-[1400px] mx-auto mb-6">
              <AiInsightCard className="h-full" />
            </div>

            <div id="dashboard-charts" className="w-full min-h-full">
              <GridLayout
                className="layout"
                layout={layout}
                cols={12}
                rowHeight={100}
                width={typeof window !== 'undefined' ? window.innerWidth - 64 : 1600}
                onLayoutChange={onLayoutChange}
                isDraggable={isEditMode}
                isResizable={isEditMode}
                draggableCancel=".cancel-drag"
                compactType={null}
                preventCollision={true}
                margin={[16, 16]}
              >
                {layout.find(l => l.i === 'heatmap') && (
                  <div key="heatmap" data-widget-id="heatmap">
                    <HeatmapWidget
                      size={getCurrentWidgetSize('heatmap')}
                      className="h-full"
                      isEditing={isEditMode}
                      widgetId="heatmap"
                      onRemove={handleRemoveWidget}
                      onContextMenu={handleWidgetContextMenu}
                      onLongPress={handleWidgetLongPress}
                    />
                  </div>
                )}
                {layout.find(l => l.i === 'humidity') && (
                  <div key="humidity" data-widget-id="humidity">
                    <HumidityWidget
                      value={deviceData ? deviceData.humidity : 0}
                      size={getCurrentWidgetSize('humidity')}
                      className="h-full"
                      isEditing={isEditMode}
                      widgetId="humidity"
                      onRemove={handleRemoveWidget}
                      onContextMenu={handleWidgetContextMenu}
                      onLongPress={handleWidgetLongPress}
                    />
                  </div>
                )}

                {/* 会员卡片 */}
                {layout.find(l => l.i === 'membership') && (
                  <div key="membership" data-widget-id="membership">
                    <MembershipCard
                      size={getCurrentWidgetSize('membership')}
                      className="h-full"
                      isEditing={isEditMode}
                      widgetId="membership"
                      onRemove={handleRemoveWidget}
                      onContextMenu={handleWidgetContextMenu}
                      onLongPress={handleWidgetLongPress}
                    />
                  </div>
                )}

                {/* 温度 */}
                {layout.find(l => l.i === 'temperature') && (
                  <div key="temperature" data-widget-id="temperature">
                    <TemperatureWidget
                      value={deviceData ? deviceData.temperature : 0}
                      trend={deviceData ? 'stable' : 'stable'}
                      size={getCurrentWidgetSize('temperature')}
                      className="h-full"
                      isEditing={isEditMode}
                      widgetId="temperature"
                      onRemove={handleRemoveWidget}
                      onContextMenu={handleWidgetContextMenu}
                      onLongPress={handleWidgetLongPress}
                    />
                  </div>
                )}

                {/* 光照 */}
                {layout.find(l => l.i === 'light') && (
                  <div key="light" data-widget-id="light">
                    <LightWidget
                      value={deviceData ? deviceData.light : 0}
                      size={getCurrentWidgetSize('light')}
                      className="h-full"
                      isEditing={isEditMode}
                      widgetId="light"
                      onRemove={handleRemoveWidget}
                      onContextMenu={handleWidgetContextMenu}
                      onLongPress={handleWidgetLongPress}
                    />
                  </div>
                )}

                {/* CO2 */}
                {layout.find(l => l.i === 'co2') && (
                  <div key="co2" data-widget-id="co2">
                    <CO2Widget
                      value={deviceData ? deviceData.co2 : 400}
                      size={getCurrentWidgetSize('co2')}
                      className="h-full"
                      isEditing={isEditMode}
                      widgetId="co2"
                      onRemove={handleRemoveWidget}
                      onContextMenu={handleWidgetContextMenu}
                      onLongPress={handleWidgetLongPress}
                    />
                  </div>
                )}

                {/* 土壤湿度 */}
                {layout.find(l => l.i === 'soil') && (
                  <div key="soil" data-widget-id="soil">
                    <SoilWidget
                      moisture={deviceData ? deviceData.earth_water : 0}
                      fertility={(() => {
                        if (!deviceData) return 0
                        // Calculate fertility based on NPK values
                        const nScore = Math.min(100, (deviceData.earth_n / 200) * 100)
                        const pScore = Math.min(100, (deviceData.earth_p / 100) * 100)
                        const kScore = Math.min(100, (deviceData.earth_k / 300) * 100)
                        return (nScore + pScore + kScore) / 3
                      })()}
                      size={getCurrentWidgetSize('soil')}
                      className="h-full"
                      isEditing={isEditMode}
                      widgetId="soil"
                      onRemove={handleRemoveWidget}
                      onContextMenu={handleWidgetContextMenu}
                      onLongPress={handleWidgetLongPress}
                    />
                  </div>
                )}

                {/* 土壤肥力 */}
                {layout.find(l => l.i === 'fertility') && (
                  <div key="fertility" data-widget-id="fertility">
                    {(() => {
                      const fertSize = getCurrentWidgetSize('fertility')
                      const fertilityValue = (() => {
                        if (!deviceData) return 0
                        const nScore = Math.min(100, (deviceData.earth_n / 200) * 100)
                        const pScore = Math.min(100, (deviceData.earth_p / 100) * 100)
                        const kScore = Math.min(100, (deviceData.earth_k / 300) * 100)
                        return (nScore + pScore + kScore) / 3
                      })()
                      const fertColor = fertilityValue >= 60 ? BERRY_THEME.status.success : fertilityValue >= 30 ? BERRY_THEME.status.warning : '#78716c'
                      const fertLabel = fertilityValue >= 60 ? '健康' : fertilityValue >= 30 ? '一般' : '贫瘠'
                      const Ad = BERRY_THEME.apple
                      const isSmallFert = fertSize === 'small'
                      const isLargeFert = fertSize === 'large'
                      const heroSizeFert = isSmallFert ? 32 : isLargeFert ? 52 : 40

                      return (
                        <IOSWidgetCard
                          size={fertSize}
                          className="h-full"
                          tint={Ad.widgetColors.fertility.accent}
                          isEditing={isEditMode}
                          widgetId="fertility"
                          onRemove={handleRemoveWidget}
                          onContextMenu={handleWidgetContextMenu}
                          onLongPress={handleWidgetLongPress}
                          header={!isSmallFert ? (
                            <>
                              <WidgetLabel>肥力</WidgetLabel>
                              <WidgetStatusPill label={fertLabel} color={fertColor} />
                            </>
                          ) : null}
                        >
                          {isSmallFert ? (
                            <Flex vertical gap={6} justify="center" style={{ height: '100%' }}>
                              <WidgetHeroNumber value={deviceData ? fertilityValue.toFixed(0) : '--'} unit="%" fontSize={heroSizeFert} />
                              <WidgetStatusPill label={fertLabel} color={fertColor} />
                            </Flex>
                          ) : isLargeFert ? (
                            <Flex vertical gap={16} style={{ height: '100%' }}>
                              <Flex vertical gap={6}>
                                <WidgetHeroNumber value={deviceData ? fertilityValue.toFixed(1) : '--'} unit="%" fontSize={heroSizeFert} />
                                <WidgetStatusPill label={fertLabel} color={fertColor} />
                              </Flex>
                              <Flex gap={28} style={{ borderTop: `1px solid ${Ad.separator}`, paddingTop: 14 }}>
                                <Flex vertical gap={3}>
                                  <WidgetLabel style={{ fontSize: 10 }}>氮 N</WidgetLabel>
                                  <span style={{ fontSize: 20, fontWeight: 600, color: Ad.label, lineHeight: 1 }}>{deviceData ? deviceData.earth_n : '--'}</span>
                                </Flex>
                                <Flex vertical gap={3}>
                                  <WidgetLabel style={{ fontSize: 10 }}>磷 P</WidgetLabel>
                                  <span style={{ fontSize: 20, fontWeight: 600, color: Ad.label, lineHeight: 1 }}>{deviceData ? deviceData.earth_p : '--'}</span>
                                </Flex>
                                <Flex vertical gap={3}>
                                  <WidgetLabel style={{ fontSize: 10 }}>钾 K</WidgetLabel>
                                  <span style={{ fontSize: 20, fontWeight: 600, color: Ad.label, lineHeight: 1 }}>{deviceData ? deviceData.earth_k : '--'}</span>
                                </Flex>
                              </Flex>
                            </Flex>
                          ) : (
                            <Flex vertical gap={4}>
                              <WidgetHeroNumber value={deviceData ? fertilityValue.toFixed(1) : '--'} unit="%" fontSize={heroSizeFert} />
                              <WidgetLabel style={{ textTransform: 'none', letterSpacing: 0 }}>综合健康度</WidgetLabel>
                            </Flex>
                          )}
                        </IOSWidgetCard>
                      )
                    })()}
                  </div>
                )}

                {/* 氮含量 */}
                {layout.find(l => l.i === 'nitrogen') && (
                  <div key="nitrogen" data-widget-id="nitrogen">
                    <NutrientWidget
                      type="N"
                      value={deviceData ? deviceData.earth_n : '--'}
                      size={getCurrentWidgetSize('nitrogen')}
                      className="h-full"
                      isEditing={isEditMode}
                      widgetId="nitrogen"
                      onRemove={handleRemoveWidget}
                      onContextMenu={handleWidgetContextMenu}
                      onLongPress={handleWidgetLongPress}
                    />
                  </div>
                )}

                {/* 磷含量 */}
                {layout.find(l => l.i === 'phosphorus') && (
                  <div key="phosphorus" data-widget-id="phosphorus">
                    <NutrientWidget
                      type="P"
                      value={deviceData ? deviceData.earth_p : '--'}
                      size={getCurrentWidgetSize('phosphorus')}
                      className="h-full"
                      isEditing={isEditMode}
                      widgetId="phosphorus"
                      onRemove={handleRemoveWidget}
                      onContextMenu={handleWidgetContextMenu}
                      onLongPress={handleWidgetLongPress}
                    />
                  </div>
                )}

                {/* 钾含量 */}
                {layout.find(l => l.i === 'potassium') && (
                  <div key="potassium" data-widget-id="potassium">
                    <NutrientWidget
                      type="K"
                      value={deviceData ? deviceData.earth_k : '--'}
                      size={getCurrentWidgetSize('potassium')}
                      className="h-full"
                      isEditing={isEditMode}
                      widgetId="potassium"
                      onRemove={handleRemoveWidget}
                      onContextMenu={handleWidgetContextMenu}
                      onLongPress={handleWidgetLongPress}
                    />
                  </div>
                )}

                {/* 光谱分析 (Only show in full version) */}
                {version === 'full' && layout.find(l => l.i === 'spectral') && (
                  <div key="spectral" data-widget-id="spectral">
                    <SpectralCard
                      data={deviceData}
                      isEditing={isEditMode}
                      widgetId="spectral"
                      onRemove={handleRemoveWidget}
                      onContextMenu={handleWidgetContextMenu}
                      onLongPress={handleWidgetLongPress}
                    />
                  </div>
                )}

                {/* 天气信息 */}
                {layout.find(l => l.i === 'weather') && (
                  <div key="weather" data-widget-id="weather">
                    <WeatherWidget
                      temperature={deviceData?.temperature || weatherData?.current?.temp_c || 0}
                      condition={weatherData?.current?.condition?.text || '晴朗'}
                      humidity={deviceData?.humidity || weatherData?.current?.humidity || 0}
                      windSpeed={Number((weatherData?.current?.wind_kph ? weatherData.current.wind_kph / 3.6 : 0).toFixed(1))}
                      windDirection={weatherData?.current?.wind_dir || 0}
                      pressure={weatherData?.current?.pressure_mb || 1013}
                      visibility={weatherData?.current?.vis_km || 10}
                      location={weatherData?.location?.name}
                      size={getCurrentWidgetSize('weather')}
                      className="h-full"
                      isEditing={isEditMode}
                      widgetId="weather"
                      onRemove={handleRemoveWidget}
                      onContextMenu={handleWidgetContextMenu}
                      onLongPress={handleWidgetLongPress}
                    />
                  </div>
                )}

                {/* 天气预报 */}
                {layout.find(l => l.i === 'weather-forecast') && (
                  <div key="weather-forecast" data-widget-id="weather-forecast">
                    <WeatherForecastWidget
                      temperature={deviceData?.temperature || weatherData?.current?.temp_c || 0}
                      condition={weatherData?.current?.condition?.text || '晴朗'}
                      windSpeed={Number((weatherData?.current?.wind_kph ? weatherData.current.wind_kph / 3.6 : 0).toFixed(1))}
                      windDirection={weatherData?.current?.wind_dir || 0}
                      dailyForecast={weatherData?.forecast?.forecastday}
                      size={getCurrentWidgetSize('weather-forecast')}
                      className="h-full"
                      isEditing={isEditMode}
                      widgetId="weather-forecast"
                      onRemove={handleRemoveWidget}
                      onContextMenu={handleWidgetContextMenu}
                      onLongPress={handleWidgetLongPress}
                    />
                  </div>
                )}

              </GridLayout>

              {/* Context Menu Overlay —— 小组件右键菜单（HDS ULTRA 档：弹层/菜单，模糊最重、底最实） */}
              {contextMenuState && (
                <div
                  className="fixed z-50 animate-in fade-in zoom-in-95 duration-200"
                  style={{
                    top: contextMenuState.y,
                    left: contextMenuState.x,
                    transform: 'translate(0, 10px)'
                  }}
                >
                  {/* ⚠️ 材质必须写进 className，**不能**留在内联 style：
                      内联的 background / border / boxShadow 优先级高于任何 CSS 类，
                      留着内联实色底 = 沉浸光感永远不生效（改了等于没改）。
                      内联只保留几何（圆角 / 内边距 / 最小宽度）。 */}
                  <div
                    className="dc-mat dc-mat--ultra"
                    style={{
                      borderRadius: BERRY_THEME.radius.md,
                      padding: 8,
                      minWidth: 220,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Size Selector —— HDS 分段控件：滑槽（--track.dc-seg）承托、选中滑块（--thumb）浮起。
                        原来用 var(--berry-popover) 当"选中底"，那是**实色板**；
                        换成材质滑块（自带模糊 + 内缘光）之后才真的读得出"浮起"。
                        ⚠️ 必须带 .dc-seg：裸 .dc-ctrl--track 的底是中性灰 rgba(120,120,128,.26)，
                           它同时兼着 antd Switch 关态（不能染绿），所以**滑槽的品牌色由 .dc-seg 提供**。
                           实测不带 .dc-seg 时，这块滑槽合成出彩度只有 5 的死灰，
                           而周围菜单/画布彩度 18~24（都吸到了背后的绿色环境光）→ 视觉上唯一的灰板。 */}
                    <div
                      className="dc-seg dc-ctrl--track flex items-center justify-between"
                      style={{
                        padding: 8,
                        borderRadius: BERRY_THEME.radius.sm,
                        marginBottom: 8,
                      }}
                    >
                      {([
                        ['small', 20, 20, 6],
                        ['medium', 32, 20, 6],
                        ['large', 32, 32, 8],
                      ] as const).map(([sz, w, h, r]) => {
                        const active = getCurrentWidgetSize(contextMenuState.widgetId) === sz
                        return (
                          <button
                            key={sz}
                            className={cn(
                              "dc-ctrl--press flex flex-col items-center justify-center",
                              active ? "dc-ctrl--thumb" : "opacity-60 hover:opacity-100"
                            )}
                            style={{
                              padding: 12,
                              borderRadius: BERRY_THEME.radius.sm,
                              border: 'none',
                              cursor: 'pointer',
                            }}
                            onClick={() => handleResizeWidget(contextMenuState.widgetId, sz)}
                          >
                            {/* 尺寸预览方框的描边 = 选中态的唯一强调色。
                                原来一律用 --berry-label-quaternary(#AEAEB2)：那是 iOS systemGray3，
                                **零色相**，于是"选中"和"未选中"只差一个亮度台阶 —— 既不显眼，
                                也和全站「唯一强调色 = 品牌绿」的约定（设备控制页同一控件用品牌墨绿文字）不一致。
                                现在：选中 → 品牌墨绿(--br-brand-ink，浅底 3.6:1 / 深底为亮薄荷)，
                                      未选中 → 三级中性灰（比四级深一档，不再像幽灵）。 */}
                            <div style={{
                              width: w,
                              height: h,
                              border: `1.5px solid ${active ? 'var(--br-brand-ink)' : 'var(--berry-label-tertiary)'}`,
                              borderRadius: r,
                            }} />
                          </button>
                        )
                      })}
                    </div>

                    <button
                      className="dc-ctrl--press flex items-center gap-3 text-left w-full"
                      style={{
                        padding: '10px 16px',
                        borderRadius: BERRY_THEME.radius.sm,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: BERRY_THEME.apple.labelSecondary,
                        fontWeight: 500,
                        fontSize: 13,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--berry-popover-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      onClick={() => {
                        setIsEditMode(true)
                        setContextMenuState(null)
                      }}
                    >
                      <IconApplicationOne size={14} strokeWidth={2} color="var(--berry-label-quaternary)" />
                      编辑主屏幕
                    </button>

                    <div style={{ height: 1, background: 'var(--berry-popover-border)', margin: '4px 0' }} />

                    <button
                      className="dc-ctrl--press flex items-center gap-3 text-left w-full"
                      style={{
                        padding: '10px 16px',
                        borderRadius: BERRY_THEME.radius.sm,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: BERRY_THEME.status.error,
                        fontWeight: 500,
                        fontSize: 13,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = `${BERRY_THEME.status.error}08`}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      onClick={() => {
                        handleRemoveWidget(contextMenuState.widgetId)
                        setContextMenuState(null)
                      }}
                    >
                      <IconMinus size={14} strokeWidth={2} />
                      移除小组件
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Widget Library Dialog */}
      <WidgetLibraryDialog
        open={showWidgetLibrary}
        onOpenChange={setShowWidgetLibrary}
        onAddWidget={handleAddWidget}
        existingWidgets={layout.map(l => l.i)}
      />

      {/* ===== AI 助手侧栏（复用 ai-assistant 的对话组件，欢迎词按页面区分）===== */}
      <CopilotSidebar
        pageKey="dashboard"
        deviceData={(deviceData ?? null) as unknown as Record<string, unknown> | null}
        context={() => {
          const lines: string[] = ["页面：数据看板（/dashboard）"]

          if (deviceData) {
            lines.push("【实时环境】")
            const pick: Array<[string, unknown, string]> = [
              ["温度", deviceData.temperature, "℃"],
              ["湿度", deviceData.humidity, "%"],
              ["光照", (deviceData as Record<string, unknown>).light, "lux"],
              ["CO₂", (deviceData as Record<string, unknown>).co2, "ppm"],
            ]
            for (const [label, val, unit] of pick) {
              const n = Number(val)
              if (Number.isFinite(n)) lines.push(`- ${label}：${n.toFixed(1)}${unit}`)
            }
            const relays: string[] = []
            for (let i = 1; i <= 8; i++) {
              const k = `relay${i}` as keyof typeof deviceData
              if (deviceData[k] === 1) relays.push(`继电器${i}`)
            }
            if (relays.length) lines.push(`- 已开启：${relays.join("、")}`)
          } else {
            lines.push("【实时环境】暂未上报")
          }

          const keys = Object.keys(historyDataMap)
          if (keys.length) {
            lines.push("【近 1 小时趋势】")
            for (const k of keys.slice(0, 6)) {
              const arr = historyDataMap[k]
              if (!Array.isArray(arr) || arr.length < 2) continue
              const nums = arr
                .map((p: { value?: unknown; v?: unknown }) =>
                  Number(p?.value ?? p?.v)
                )
                .filter((n: number) => Number.isFinite(n))
              if (nums.length < 2) continue
              const min = Math.min(...nums)
              const max = Math.max(...nums)
              const last = nums[nums.length - 1]
              const first = nums[0]
              const delta = last - first
              lines.push(
                `- ${k}：当前 ${last.toFixed(1)}，1h 区间 ${min.toFixed(1)}~${max.toFixed(1)}，${
                  delta >= 0 ? "上升" : "下降"
                } ${Math.abs(delta).toFixed(1)}`
              )
            }
          }

          if (weatherData) {
            const w = weatherData as Record<string, unknown>
            const bits: string[] = []
            if (w.temperature != null) bits.push(`气温 ${Number(w.temperature).toFixed(0)}℃`)
            if (w.weather) bits.push(String(w.weather))
            if (bits.length) lines.push(`【室外天气】${bits.join("，")}`)
          }

          lines.push(`【布局】当前 ${layout.length} 个小组件`)
          return lines.join("\n")
        }}
      />

    </>
    </ConfigProvider>
  )
}
