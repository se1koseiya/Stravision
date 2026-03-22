"use client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { PageNavigation } from "@/components/page-navigation"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import { Edit, Save, Wifi, WifiOff, Droplets, Sun, Wind, Leaf, LayoutGrid, Monitor, BarChart3, Grid, Sparkles, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { useState, useEffect } from "react"
import GridLayout, { Layout } from "react-grid-layout"
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
  AIInsightWidget,
  NutrientWidget,
  IOSWidgetCard,
  TopBanner
} from "@/components/dashboard/ios-style"
import { LAYOUT_PRESETS, getWidgetSize } from "@/lib/dashboard-layouts"
import { toast } from "sonner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Minus, Plus, Settings2, AppWindow, Eye, EyeOff } from "lucide-react"
import { useElderFriendly } from "@/lib/contexts/elder-friendly-context"
import { ElderFriendlyToggle } from "@/components/elder-friendly-toggle"
import { PageHeader } from "@/components/page-header"
import { WidgetLibraryDialog } from "@/components/dashboard/widget-library-dialog"
import { DailyBriefingIsland } from "@/components/daily-briefing-island"

export default function DashboardPage() {
  const router = useRouter()
  const { isElderFriendlyMode, toggleElderFriendlyMode } = useElderFriendly()

  // User authentication state
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  // Connect to SSE for real-time device data
  const { deviceData, connectionStatus } = useDeviceData()

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
      <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] border border-white/60 p-5 flex flex-col gap-4 min-w-[320px] max-w-[360px] pointer-events-auto">
        <div className="flex flex-col gap-1">
          <div className="font-bold text-slate-900 text-lg">移除组件</div>
          <div className="text-sm text-slate-500 font-medium">确定要隐藏这个小组件吗？</div>
        </div>
        <div className="flex justify-end gap-3 mt-2">
          <Button variant="ghost" className="rounded-full font-semibold hover:bg-slate-100" onClick={() => toast.dismiss(t)}>取消</Button>
          <Button className="rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold shadow-md shadow-red-500/20" onClick={() => {
            setLayout(prev => {
              const newLayout = prev.filter(l => l.i !== id)
              localStorage.setItem('dashboard-layout', JSON.stringify(newLayout))
              return newLayout
            })
            toast.dismiss(t)
            toast.success("已移除小组件", {
              className: "rounded-full backdrop-blur-md bg-white/90 border-white/60 shadow-lg"
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
        <div className="absolute inset-0 bg-[#F5F7FA] dark:bg-[#0B1220]" />
        <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(255,255,255,0.8),transparent_60%),radial-gradient(1000px_circle_at_85%_0%,rgba(240,253,244,0.6),transparent_55%)] dark:hidden" />
        <div className="absolute inset-0 hidden dark:block dark:bg-[radial-gradient(1200px_circle_at_15%_10%,rgba(59,130,246,0.18),transparent_60%),radial-gradient(1000px_circle_at_85%_0%,rgba(16,185,129,0.14),transparent_55%),radial-gradient(900px_circle_at_70%_90%,rgba(99,102,241,0.12),transparent_60%)]" />

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
            <div className="hidden md:flex items-center gap-3">
              {currentUser?.membership && currentUser.membership !== 'free' && (
                <Badge
                  className={`
                    ${currentUser.membership === 'plus'
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 shadow-indigo-500/20'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-orange-500/20'} 
                    border-0 text-white shadow-lg flex items-center gap-1 px-3 py-1
                  `}
                >
                  {currentUser.membership === 'plus' ? <Crown className="size-3.5 fill-current" /> : <Sparkles className="size-3.5 fill-current" />}
                  {currentUser.membership === 'plus' ? 'PLUS' : 'PRO'}
                </Badge>
              )}

              {connectionStatus.connected ? (
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30">
                  <Wifi className="size-3 mr-1" />
                  已连接
                </Badge>
              ) : (
                <Badge className="bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30">
                  <WifiOff className="size-3 mr-1" />
                  {connectionStatus.error || '未连接'}
                </Badge>
              )}
              {connectionStatus.lastUpdate && (
                <span className="text-xs text-muted-foreground/60 hidden lg:inline">
                  更新: {connectionStatus.lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-green-50 hover:text-green-900 dark:hover:bg-green-900/20 dark:hover:text-green-100">
                  <LayoutGrid className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>切换视图预设</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handlePresetChange("default")} className="justify-between focus:bg-green-50 dark:focus:bg-green-900/20 focus:text-green-900 dark:focus:text-green-100">
                  <span className="flex items-center gap-2"><LayoutGrid className="size-4" /> 默认视图</span>
                  {currentPreset === "default" && <span className="text-green-500 text-xs">当前</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePresetChange("compact")} className="justify-between focus:bg-green-50 dark:focus:bg-green-900/20 focus:text-green-900 dark:focus:text-green-100">
                  <span className="flex items-center gap-2"><Grid className="size-4" /> 紧凑视图</span>
                  {currentPreset === "compact" && <span className="text-green-500 text-xs">当前</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePresetChange("dataFirst")} className="justify-between focus:bg-green-50 dark:focus:bg-green-900/20 focus:text-green-900 dark:focus:text-green-100">
                  <span className="flex items-center gap-2"><BarChart3 className="size-4" /> 数据优先</span>
                  {currentPreset === "dataFirst" && <span className="text-green-500 text-xs">当前</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePresetChange("monitor")} className="justify-between focus:bg-green-50 dark:focus:bg-green-900/20 focus:text-green-900 dark:focus:text-green-100">
                  <span className="flex items-center gap-2"><Monitor className="size-4" /> 监控大屏</span>
                  {currentPreset === "monitor" && <span className="text-green-500 text-xs">当前</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePresetChange("environment")} className="justify-between focus:bg-green-50 dark:focus:bg-green-900/20 focus:text-green-900 dark:focus:text-green-100">
                  <span className="flex items-center gap-2"><Wind className="size-4" /> 环境监测</span>
                  {currentPreset === "environment" && <span className="text-green-500 text-xs">当前</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePresetChange("soil")} className="justify-between focus:bg-green-50 dark:focus:bg-green-900/20 focus:text-green-900 dark:focus:text-green-100">
                  <span className="flex items-center gap-2"><Leaf className="size-4" /> 土壤监测</span>
                  {currentPreset === "soil" && <span className="text-green-500 text-xs">当前</span>}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {isEditMode ? (
              <Button
                onClick={handleSaveLayout}
                size="sm"
                className="h-9 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transition-all font-medium px-4 ml-2"
              >
                完成编辑
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-green-50 hover:text-green-900 dark:hover:bg-green-900/20 dark:hover:text-green-100 ml-1"
                    title="编辑仪表盘"
                  >
                    <Edit className="size-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => setShowWidgetLibrary(true)}
                    className="focus:bg-green-50 dark:focus:bg-green-900/20 focus:text-green-900 dark:focus:text-green-100"
                  >
                    <AppWindow className="size-4 mr-2" />
                    添加小组件
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleEditMode}
                    className="focus:bg-green-50 dark:focus:bg-green-900/20 focus:text-green-900 dark:focus:text-green-100"
                  >
                    <Edit className="size-4 mr-2" />
                    编辑布局
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      // Reset to default layout
                      setLayout(defaultLayout)
                      setCurrentPreset("default")
                      localStorage.setItem('dashboard-layout', JSON.stringify(defaultLayout))
                      localStorage.setItem('dashboard-layout-preset', 'default')
                      toast.success('已恢复默认布局')
                    }}
                    className="focus:bg-red-50 dark:focus:bg-red-900/20 focus:text-red-900 dark:focus:text-red-100"
                  >
                    <Settings2 className="size-4 mr-2" />
                    恢复默认布局
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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

                {/* 土壤肥力 - 使用 IOSWidgetCard 模拟统一风格 */}
                {layout.find(l => l.i === 'fertility') && (
                  <div key="fertility">
                    <IOSWidgetCard
                      size={getCurrentWidgetSize('fertility')}
                      className="h-full bg-white text-slate-900 shadow-sm border-0"
                      isEditing={isEditMode}
                      widgetId="fertility"
                      onRemove={handleRemoveWidget}
                      onContextMenu={handleWidgetContextMenu}
                      onLongPress={handleWidgetLongPress}
                      header={
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-full bg-emerald-50">
                            <Leaf className="w-4 h-4 text-emerald-500" />
                          </div>
                          {getCurrentWidgetSize('fertility') !== 'small' && <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">土壤肥力</span>}
                        </div>
                      }
                    >
                      <div className="flex flex-col h-full justify-between">
                        {getCurrentWidgetSize('fertility') === 'small' ? (
                          <>
                            <div className="mt-auto">
                              <div className="flex items-start">
                                <span className="text-3xl font-bold tracking-tighter text-slate-900">
                                  {(() => {
                                    if (!deviceData) return '--'
                                    const nScore = Math.min(100, (deviceData.earth_n / 200) * 100)
                                    const pScore = Math.min(100, (deviceData.earth_p / 100) * 100)
                                    const kScore = Math.min(100, (deviceData.earth_k / 300) * 100)
                                    const fertility = (nScore + pScore + kScore) / 3
                                    return fertility.toFixed(0)
                                  })()}
                                </span>
                                <span className="text-xs font-medium mt-1 text-slate-400 ml-1">%</span>
                              </div>
                              <div className="text-xs font-medium text-slate-500 mt-1 truncate">
                                肥力指数
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-5xl font-bold tracking-tighter text-slate-900">
                                {(() => {
                                  if (!deviceData) return '--'
                                  const nScore = Math.min(100, (deviceData.earth_n / 200) * 100)
                                  const pScore = Math.min(100, (deviceData.earth_p / 100) * 100)
                                  const kScore = Math.min(100, (deviceData.earth_k / 300) * 100)
                                  const fertility = (nScore + pScore + kScore) / 3
                                  return fertility.toFixed(1)
                                })()}
                              </span>
                              <span className="text-xl text-slate-400 ml-1">%</span>
                              <div className="text-sm text-slate-500 mt-1">综合健康度</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </IOSWidgetCard>
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

                {/* 光谱分析 */}
                {layout.find(l => l.i === 'spectral') && (
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
                  <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl rounded-3xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] border border-white/60 dark:border-white/10 p-2 min-w-[220px] flex flex-col">
                    {/* Size Selector */}
                    <div className="flex items-center justify-between p-2 bg-slate-100/40 dark:bg-slate-800/40 rounded-2xl mb-2 backdrop-blur-md">
                      <button
                        className={`p-3 rounded-xl flex flex-col items-center justify-center transition-all ${getCurrentWidgetSize(contextMenuState.widgetId) === 'small' ? 'bg-white shadow-sm scale-105' : 'hover:bg-white/50'}`}
                        onClick={() => handleResizeWidget(contextMenuState.widgetId, 'small')}
                      >
                        <div className="w-5 h-5 border-[1.5px] border-slate-400 rounded-[8px]" />
                      </button>
                      <button
                        className={`p-3 rounded-xl flex flex-col items-center justify-center transition-all ${getCurrentWidgetSize(contextMenuState.widgetId) === 'medium' ? 'bg-white shadow-sm scale-105' : 'hover:bg-white/50'}`}
                        onClick={() => handleResizeWidget(contextMenuState.widgetId, 'medium')}
                      >
                        <div className="w-8 h-5 border-[1.5px] border-slate-400 rounded-[8px]" />
                      </button>
                      <button
                        className={`p-3 rounded-xl flex flex-col items-center justify-center transition-all ${getCurrentWidgetSize(contextMenuState.widgetId) === 'large' ? 'bg-white shadow-sm scale-105' : 'hover:bg-white/50'}`}
                        onClick={() => handleResizeWidget(contextMenuState.widgetId, 'large')}
                      >
                        <div className="w-8 h-8 border-[1.5px] border-slate-400 rounded-[12px]" />
                      </button>
                    </div>

                    <button
                      className="flex items-center gap-3 p-3 px-4 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-2xl transition-colors text-left w-full text-slate-700 dark:text-slate-200 font-medium text-sm"
                      onClick={() => {
                        setIsEditMode(true)
                        setContextMenuState(null)
                      }}
                    >
                      <AppWindow className="w-4 h-4 text-slate-500" />
                      编辑主屏幕
                    </button>

                    <div className="h-px w-[calc(100%-2rem)] mx-auto bg-slate-200/60 dark:bg-slate-700/50 my-1" />

                    <button
                      className="flex items-center gap-3 p-3 px-4 hover:bg-red-50/50 dark:hover:bg-red-950/30 rounded-2xl transition-colors text-left w-full text-red-500 font-medium text-sm"
                      onClick={() => {
                        handleRemoveWidget(contextMenuState.widgetId)
                        setContextMenuState(null)
                      }}
                    >
                      <Minus className="w-4 h-4" />
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
  )
}
