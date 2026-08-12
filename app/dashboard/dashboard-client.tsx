"use client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { PageNavigation } from "@/components/page-navigation"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import { Edit, Save, Droplets, Sun, Wind, Leaf, LayoutGrid, Monitor, BarChart3, Grid, Thermometer, Fan, Lightbulb, Video, Cpu, Activity, Gauge, Signal } from "lucide-react"
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
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import type { UserPublic, MembershipTier } from "@/lib/db/user-service"
import { useState, useEffect, useMemo } from "react"
import dynamic from "next/dynamic"

// react-grid-layout 是重型库，延迟加载
const GridLayout = dynamic(() => import("react-grid-layout").then(m => ({ default: m.default })), { ssr: false })
import type { Layout } from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"
import { DashboardChartCard } from "@/components/dashboard/DashboardChartCard"
import { SpectralCard } from "@/components/dashboard/spectral-card"
import { MembershipCard } from "@/components/dashboard/membership-card"
import {
  TemperatureWidget,
  HumidityWidget,
  LightWidget,
  CO2Widget,
  SoilWidget,
  WeatherWidget,
  WeatherForecastWidget,
  AIInsightWidget,
  NutrientWidget,
  IOSWidgetCard,
  WidgetLabel,
  WidgetStatusPill,
  WidgetHeroNumber,
  TopBanner
} from "@/components/dashboard/ios-style"
import { LAYOUT_PRESETS, getWidgetSize } from "@/lib/dashboard-layouts"
import { toast } from "sonner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Minus, Plus, Settings2, AppWindow, Eye, EyeOff } from "lucide-react"
import { useElderFriendly } from "@/lib/contexts/elder-friendly-context"
import { ElderFriendlyToggle } from "@/components/elder-friendly-toggle"
import { PageHeader } from "@/components/page-header"
import { PageHeaderRight } from "@/components/page-header-right"
import { WidgetLibraryDialog } from "@/components/dashboard/widget-library-dialog"
import { DailyBriefingIsland } from "@/components/daily-briefing-island"

// ─── 设备状态条带组件（动态展示设备注册表中的所有设备） ───

const DASH_DEVICE_ICON_MAP: Record<string, typeof Cpu> = {
  Thermometer, Droplets, Fan, Lightbulb, Sun, Wind, Video, Cpu, Activity, Gauge, Signal, Monitor,
  default: Cpu,
}

function getDashDeviceIcon(iconName: string): typeof Cpu {
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
    <div className="w-full max-w-[1600px] mx-auto mb-6">
      <div className="flex items-center gap-2 mb-3 px-1">
        <LayoutGrid className="h-4 w-4 text-[#1677ff]" strokeWidth={1.75} />
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">设备状态</h3>
        <span className="text-xs text-slate-400">{enabledDevices.length}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {enabledDevices.map((d) => {
          const IconCmp = getDashDeviceIcon(d.icon)
          const hex = d.color || '#1677ff'
          let statusText = '离线'
          let statusColor = '#8c8c8c'
          let primaryValue = ''

          if (d.type === 'relay') {
            const relayNum = d.config?.relay_num as number | undefined
            const on = relayNum
              ? deviceData?.[`relay${relayNum}`] === 1
              : false
            statusText = on ? '开启' : '关闭'
            statusColor = on ? '#52c41a' : '#8c8c8c'
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
            statusColor = hasData ? '#52c41a' : '#faad14'
          } else if (d.type === 'camera') {
            statusText = '在线'
            statusColor = '#52c41a'
            primaryValue = d.config?.camera_id || 'CAM'
          } else if (d.type === 'stepper') {
            const pos = deviceData?.stepper_position
            statusText = '就绪'
            statusColor = '#1677ff'
            primaryValue = pos !== undefined ? `${pos}p` : ''
          }

          return (
            <div
              key={d.id}
              className="relative p-3 transition-all"
              style={{
                borderRadius: BERRY_THEME.apple.radius.inner,
                background: '#FFFFFF',
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
                  <IconCmp className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div className="flex items-center gap-1">
                  <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: statusColor }} />
                  <span className="text-[10px] font-medium" style={{ color: statusColor }}>{statusText}</span>
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
  const { isElderFriendlyMode, toggleElderFriendlyMode } = useElderFriendly()

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

  useEffect(() => {
    const fetchAllHistory = async () => {
      try {
        // List of all types used in the dashboard
        const types = [
          'humidity', 'temperature', 'light', 'co2',
          'soilMoisture', 'fertility', 'nitrogen',
          'phosphorus', 'potassium', 'rainfall'
        ].join(',')

        const res = await fetch(`/api/device-history?types=${types}&range=1h`)
        const data = await res.json()
        if (data.success) {
          setHistoryDataMap(data.data)
        }
      } catch (e) {
        console.error("Failed to fetch dashboard history:", e)
      }
    }
    fetchAllHistory()
  }, [])

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
        setLayout(JSON.parse(savedLayout))
      } catch (e) {
        console.error('Failed to load layout:', e)
      }
    }
  }, [])

  const handleRemoveWidget = (id: string) => {
    toast.custom((t) => (
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl rounded-3xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] border border-white/60 dark:border-white/10 p-5 flex flex-col gap-4 min-w-[320px] max-w-[360px] pointer-events-auto">
        <div className="flex flex-col gap-1">
          <div className="font-bold text-slate-900 dark:text-white text-lg">移除组件</div>
          <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">确定要隐藏这个小组件吗？</div>
        </div>
        <div className="flex justify-end gap-3 mt-2">
          <Button variant="ghost" className="rounded-full font-semibold hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => toast.dismiss(t)}>取消</Button>
          <Button className="rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold shadow-md shadow-red-500/20" onClick={() => {
            setLayout(prev => {
              const newLayout = prev.filter(l => l.i !== id)
              localStorage.setItem('dashboard-layout', JSON.stringify(newLayout))
              return newLayout
            })
            toast.dismiss(t)
            toast.success("已移除小组件", {
              className: "rounded-full backdrop-blur-md bg-white/90 dark:bg-slate-800/90 border-white/60 dark:border-white/10 shadow-lg"
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="animate-in fade-in duration-500">
          <div className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50" />
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="h-12 w-80 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mb-2" />
              <div className="h-4 w-96 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-8" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-72 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
                <div className="h-72 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
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
        algorithm: antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: BERRY_THEME.primary,
          borderRadius: BERRY_THEME.radius.lg,
        },
      }}
    >
    <>
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
        <div className="absolute inset-0" style={{ background: BERRY_THEME.apple.canvasGradient }} />
        <div className="absolute inset-0 hidden dark:block dark:bg-[#0B1220]" />

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
            className="fixed inset-0 z-40 bg-black/5 backdrop-blur-[1px]"
            onClick={() => setContextMenuState(null)}
          />
        )}

        <div className="relative grid grid-rows-[72px_1fr] h-full w-full">
          {/* Header */}
          <PageHeader user={currentUser}>
            <PageHeaderRight
              connectionStatus={connectionStatus}
            >
              {/* 布局切换 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                    <LayoutGrid className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>切换视图</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handlePresetChange("default")}>
                    <LayoutGrid className="size-4 mr-2" /> 默认视图
                    {currentPreset === "default" && <span className="ml-auto text-xs">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePresetChange("compact")}>
                    <Grid className="size-4 mr-2" /> 紧凑视图
                    {currentPreset === "compact" && <span className="ml-auto text-xs">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePresetChange("dataFirst")}>
                    <BarChart3 className="size-4 mr-2" /> 数据优先
                    {currentPreset === "dataFirst" && <span className="ml-auto text-xs">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePresetChange("monitor")}>
                    <Monitor className="size-4 mr-2" /> 监控大屏
                    {currentPreset === "monitor" && <span className="ml-auto text-xs">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePresetChange("environment")}>
                    <Wind className="size-4 mr-2" /> 环境监测
                    {currentPreset === "environment" && <span className="ml-auto text-xs">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePresetChange("soil")}>
                    <Leaf className="size-4 mr-2" /> 土壤监测
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
                      <Edit className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setShowWidgetLibrary(true)}>
                      <AppWindow className="size-4 mr-2" /> 添加组件
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleEditMode}>
                      <Edit className="size-4 mr-2" /> 编辑布局
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                      setLayout(defaultLayout)
                      setCurrentPreset("default")
                      localStorage.setItem('dashboard-layout', JSON.stringify(defaultLayout))
                      localStorage.setItem('dashboard-layout-preset', 'default')
                      toast.success('已恢复默认布局')
                    }}>
                      <Settings2 className="size-4 mr-2" /> 恢复默认
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
            <div className="w-full max-w-[1600px] mx-auto mb-6">
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
                {layout.find(l => l.i === 'ai-insight') && (
                  <div key="ai-insight">
                    <AIInsightWidget
                      size={getCurrentWidgetSize('ai-insight')}
                      className="h-full"
                      isEditing={isEditMode}
                      widgetId="ai-insight"
                      onRemove={handleRemoveWidget}
                      onContextMenu={handleWidgetContextMenu}
                      onLongPress={handleWidgetLongPress}
                    />
                  </div>
                )}
                {layout.find(l => l.i === 'humidity') && (
                  <div key="humidity">
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
                  <div key="membership">
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
                  <div key="temperature">
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
                  <div key="light">
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
                  <div key="co2">
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
                  <div key="soil">
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
                  <div key="fertility">
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
                  <div key="nitrogen">
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
                  <div key="phosphorus">
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
                  <div key="potassium">
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
                  <div key="spectral">
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
                  <div key="weather">
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
                  <div key="weather-forecast">
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

              {/* Context Menu Overlay */}
              {contextMenuState && (
                <div
                  className="fixed z-50 animate-in fade-in zoom-in-95 duration-200"
                  style={{
                    top: contextMenuState.y,
                    left: contextMenuState.x,
                    transform: 'translate(0, 10px)'
                  }}
                >
                  <div style={{
                    background: '#fff',
                    borderRadius: BERRY_THEME.radius.md,
                    boxShadow: BERRY_THEME.shadow.lg,
                    border: '1px solid #f0f0f0',
                    padding: 8,
                    minWidth: 220,
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                    {/* Size Selector */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 8,
                      background: '#fafafa',
                      borderRadius: BERRY_THEME.radius.sm,
                      marginBottom: 8,
                    }}>
                      <button
                        className={`flex flex-col items-center justify-center transition-all ${getCurrentWidgetSize(contextMenuState.widgetId) === 'small' ? 'scale-105' : 'opacity-60 hover:opacity-100'}`}
                        style={{
                          padding: 12,
                          borderRadius: BERRY_THEME.radius.sm,
                          background: getCurrentWidgetSize(contextMenuState.widgetId) === 'small' ? '#fff' : 'transparent',
                          boxShadow: getCurrentWidgetSize(contextMenuState.widgetId) === 'small' ? BERRY_THEME.shadow.sm : 'none',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleResizeWidget(contextMenuState.widgetId, 'small')}
                      >
                        <div style={{ width: 20, height: 20, border: '1.5px solid #8c8c8c', borderRadius: 6 }} />
                      </button>
                      <button
                        className={`flex flex-col items-center justify-center transition-all ${getCurrentWidgetSize(contextMenuState.widgetId) === 'medium' ? 'scale-105' : 'opacity-60 hover:opacity-100'}`}
                        style={{
                          padding: 12,
                          borderRadius: BERRY_THEME.radius.sm,
                          background: getCurrentWidgetSize(contextMenuState.widgetId) === 'medium' ? '#fff' : 'transparent',
                          boxShadow: getCurrentWidgetSize(contextMenuState.widgetId) === 'medium' ? BERRY_THEME.shadow.sm : 'none',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleResizeWidget(contextMenuState.widgetId, 'medium')}
                      >
                        <div style={{ width: 32, height: 20, border: '1.5px solid #8c8c8c', borderRadius: 6 }} />
                      </button>
                      <button
                        className={`flex flex-col items-center justify-center transition-all ${getCurrentWidgetSize(contextMenuState.widgetId) === 'large' ? 'scale-105' : 'opacity-60 hover:opacity-100'}`}
                        style={{
                          padding: 12,
                          borderRadius: BERRY_THEME.radius.sm,
                          background: getCurrentWidgetSize(contextMenuState.widgetId) === 'large' ? '#fff' : 'transparent',
                          boxShadow: getCurrentWidgetSize(contextMenuState.widgetId) === 'large' ? BERRY_THEME.shadow.sm : 'none',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleResizeWidget(contextMenuState.widgetId, 'large')}
                      >
                        <div style={{ width: 32, height: 32, border: '1.5px solid #8c8c8c', borderRadius: 8 }} />
                      </button>
                    </div>

                    <button
                      className="flex items-center gap-3 transition-colors text-left w-full"
                      style={{
                        padding: '10px 16px',
                        borderRadius: BERRY_THEME.radius.sm,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: '#595959',
                        fontWeight: 500,
                        fontSize: 13,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#fafafa'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      onClick={() => {
                        setIsEditMode(true)
                        setContextMenuState(null)
                      }}
                    >
                      <AppWindow size={14} strokeWidth={1.75} color="#8c8c8c" />
                      编辑主屏幕
                    </button>

                    <div style={{ height: 1, background: '#f0f0f0', margin: '4px 0' }} />

                    <button
                      className="flex items-center gap-3 transition-colors text-left w-full"
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
                      <Minus size={14} strokeWidth={1.75} />
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

    </>
    </ConfigProvider>
  )
}
