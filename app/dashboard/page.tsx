"use client"
import { Card, CardContent } from "@/components/ui/card"
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
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import { useRouter } from "next/navigation"
import type { UserPublic, MembershipTier } from "@/lib/db/user-service"
import { useState, useEffect } from "react"
import GridLayout, { Layout } from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"
import { DashboardChartCard } from "@/components/dashboard/DashboardChartCard"
import { SpectralCard } from "@/components/dashboard/spectral-card"
import { AiInsightCard } from "@/components/dashboard/ai-insight-card"
import { MembershipCard } from "@/components/dashboard/membership-card"
import { toast } from "sonner"

interface UserPublicWithMembership extends UserPublic {
  membership?: MembershipTier
}

export default function DashboardPage() {
  const router = useRouter()

  // User authentication state
  const [currentUser, setCurrentUser] = useState<UserPublicWithMembership | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  // Connect to SSE for real-time device data
  const { deviceData, connectionStatus } = useDeviceData()

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

  const defaultLayout: Layout[] = [
    { i: "membership", x: 0, y: 0, w: 3, h: 4 },
    { i: "temperature", x: 3, y: 0, w: 3, h: 4 },
    { i: "humidity", x: 6, y: 0, w: 3, h: 4 },
    { i: "soilMoisture", x: 9, y: 0, w: 3, h: 4 },
    { i: "ai-insight", x: 0, y: 4, w: 8, h: 6 },
    { i: "light", x: 8, y: 4, w: 4, h: 6 },
    { i: "spectral", x: 0, y: 10, w: 6, h: 6 },
    { i: "co2", x: 6, y: 10, w: 6, h: 6 },
  ]

  const compactLayout: Layout[] = [
    { i: "membership", x: 0, y: 0, w: 2, h: 4 },
    { i: "temperature", x: 2, y: 0, w: 2, h: 4 },
    { i: "humidity", x: 4, y: 0, w: 2, h: 4 },
    { i: "soilMoisture", x: 6, y: 0, w: 2, h: 4 },
    { i: "light", x: 8, y: 0, w: 2, h: 4 },
    { i: "co2", x: 10, y: 0, w: 2, h: 4 },
    { i: "ai-insight", x: 0, y: 4, w: 6, h: 6 },
    { i: "spectral", x: 6, y: 4, w: 6, h: 6 },
  ]

  const dataFirstLayout = [
    { i: "ai-insight", x: 0, y: 0, w: 12, h: 2 },
    { i: "spectral", x: 0, y: 2, w: 8, h: 4 },
    { i: "humidity", x: 8, y: 2, w: 4, h: 2 },
    { i: "temperature", x: 8, y: 4, w: 4, h: 2 },
    { i: "light", x: 0, y: 6, w: 3, h: 2 },
    { i: "co2", x: 3, y: 6, w: 3, h: 2 },
    { i: "soilMoisture", x: 6, y: 4, w: 3, h: 2 },
    { i: "rainfall", x: 9, y: 4, w: 3, h: 2 },
    { i: "fertility", x: 0, y: 6, w: 3, h: 2 },
    { i: "nitrogen", x: 3, y: 6, w: 3, h: 2 },
    { i: "phosphorus", x: 6, y: 6, w: 3, h: 2 },
    { i: "potassium", x: 9, y: 6, w: 3, h: 2 },
  ]

  const monitorLayout = [
    { i: "humidity", x: 0, y: 0, w: 6, h: 3 },
    { i: "temperature", x: 6, y: 0, w: 6, h: 3 },
    { i: "light", x: 0, y: 3, w: 4, h: 2 },
    { i: "co2", x: 4, y: 3, w: 4, h: 2 },
    { i: "soilMoisture", x: 8, y: 3, w: 4, h: 2 },
    { i: "spectral", x: 0, y: 5, w: 12, h: 3 },
    { i: "fertility", x: 0, y: 8, w: 3, h: 2 },
    { i: "nitrogen", x: 3, y: 8, w: 3, h: 2 },
    { i: "phosphorus", x: 6, y: 8, w: 3, h: 2 },
    { i: "potassium", x: 9, y: 8, w: 3, h: 2 },
    { i: "rainfall", x: 0, y: 10, w: 12, h: 2 },
  ]

  const environmentLayout = [
    { i: "ai-insight", x: 0, y: 0, w: 12, h: 2 },
    { i: "humidity", x: 0, y: 2, w: 6, h: 3 }, // Large Humidity
    { i: "temperature", x: 6, y: 2, w: 6, h: 3 }, // Large Temperature
    { i: "co2", x: 0, y: 5, w: 4, h: 2 },
    { i: "light", x: 4, y: 5, w: 4, h: 2 },
    { i: "rainfall", x: 8, y: 5, w: 4, h: 2 },
    { i: "soilMoisture", x: 0, y: 7, w: 3, h: 2 },
    { i: "fertility", x: 3, y: 7, w: 3, h: 2 },
    { i: "nitrogen", x: 6, y: 7, w: 2, h: 2 },
    { i: "phosphorus", x: 8, y: 7, w: 2, h: 2 },
    { i: "potassium", x: 10, y: 7, w: 2, h: 2 },
    { i: "spectral", x: 0, y: 9, w: 12, h: 3 },
  ]

  const soilLayout = [
    { i: "ai-insight", x: 0, y: 0, w: 12, h: 2 },
    { i: "soilMoisture", x: 0, y: 2, w: 6, h: 3 }, // Large Soil Moisture
    { i: "fertility", x: 6, y: 2, w: 6, h: 3 }, // Large Fertility
    { i: "nitrogen", x: 0, y: 5, w: 4, h: 2 },
    { i: "phosphorus", x: 4, y: 5, w: 4, h: 2 },
    { i: "potassium", x: 8, y: 5, w: 4, h: 2 },
    { i: "humidity", x: 0, y: 7, w: 3, h: 2 },
    { i: "temperature", x: 3, y: 7, w: 3, h: 2 },
    { i: "light", x: 6, y: 7, w: 3, h: 2 },
    { i: "co2", x: 9, y: 7, w: 3, h: 2 },
    { i: "spectral", x: 0, y: 9, w: 12, h: 3 },
    { i: "rainfall", x: 0, y: 12, w: 12, h: 2 },
  ]

  const [layout, setLayout] = useState(defaultLayout)
  const [currentPreset, setCurrentPreset] = useState("default")
  const [isEditMode, setIsEditMode] = useState(false)

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
        <div className="absolute inset-0 bg-[#F1EFEA] dark:bg-[#0B1220]" />
        <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(255,255,255,0.75),transparent_60%),radial-gradient(1000px_circle_at_85%_0%,rgba(209,250,229,0.55),transparent_55%),radial-gradient(900px_circle_at_70%_90%,rgba(224,231,255,0.55),transparent_60%)] dark:hidden" />
        <div className="absolute inset-0 hidden dark:block dark:bg-[radial-gradient(1200px_circle_at_15%_10%,rgba(59,130,246,0.18),transparent_60%),radial-gradient(1000px_circle_at_85%_0%,rgba(16,185,129,0.14),transparent_55%),radial-gradient(900px_circle_at_70%_90%,rgba(99,102,241,0.12),transparent_60%)]" />

        <div className="relative grid grid-rows-[72px_1fr] h-full w-full">
          {/* Header */}
          <div className="relative flex items-center px-8 border-b border-black/5 dark:border-white/10 bg-white/50 backdrop-blur-sm dark:bg-slate-900/50">
            <div className="flex items-center gap-4 text-foreground">
            <div className="relative size-12 shrink-0">
              <Image src="/icon.png" alt="logo" fill className="object-contain" />
            </div>
            <div className="leading-tight">
                <div className="text-base font-bold tracking-wide">STRAVISION</div>
                <div className="text-xs text-muted-foreground">莓界 · 智慧农业平台</div>
              </div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
              <PageNavigation />
            </div>

              {/* 布局编辑按钮和连接状态 */}
              <div className="ml-auto flex items-center gap-3">
                <div className="hidden md:flex">
                  {currentUser?.membership && currentUser.membership !== 'free' && (
                    <Badge 
                      className={`
                        ${currentUser.membership === 'plus' 
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 shadow-indigo-500/20' 
                          : 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-orange-500/20'} 
                        border-0 text-white shadow-lg flex items-center gap-1 px-3 py-1 mr-3
                      `}
                    >
                      {currentUser.membership === 'plus' ? <Crown className="size-3.5 fill-current" /> : <Sparkles className="size-3.5 fill-current" />}
                      {currentUser.membership === 'plus' ? 'PLUS' : 'PRO'}
                    </Badge>
                  )}

                  {connectionStatus.connected ? (
                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30 mr-3">
                      <Wifi className="size-3 mr-1" />
                      已连接
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30 mr-3">
                      <WifiOff className="size-3 mr-1" />
                      {connectionStatus.error || '未连接'}
                    </Badge>
                  )}
                  {connectionStatus.lastUpdate && (
                    <span className="text-xs text-muted-foreground/60 mr-3 hidden lg:inline">
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
                    <DropdownMenuLabel>布局操作</DropdownMenuLabel>
                    <DropdownMenuItem onClick={handleEditMode} className="justify-between cursor-pointer focus:bg-green-50 dark:focus:bg-green-900/20 focus:text-green-900 dark:focus:text-green-100">
                      <span className="flex items-center gap-2"><Edit className="size-4" /> {isEditMode ? '完成编辑' : '调整布局'}</span>
                      {isEditMode && <span className="text-green-500 text-xs">编辑中</span>}
                    </DropdownMenuItem>
                    {isEditMode && (
                      <DropdownMenuItem onClick={handleSaveLayout} className="justify-between cursor-pointer focus:bg-green-50 dark:focus:bg-green-900/20 focus:text-green-900 dark:focus:text-green-100">
                        <span className="flex items-center gap-2"><Save className="size-4" /> 保存布局</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
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
                    size="icon"
                    className="h-9 w-9 rounded-full bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    <Save size={18} />
                  </Button>
                ) : (
                  <Button
                    onClick={handleEditMode}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                  >
                    <Edit size={18} />
                  </Button>
                )}
                <UserAvatarMenu user={currentUser} />
              </div>
          </div>

          {/* Dashboard Content */}
          <div 
            className="relative px-8 pb-8 pt-6 overflow-y-auto h-full w-full custom-scrollbar"
            data-lenis-prevent
          >
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
                compactType={null}
                preventCollision={true}
                margin={[16, 16]}
              >
                <div key="ai-insight">
                  <AiInsightCard />
                </div>
                {/* 湿度 */}
                <div key="humidity">
                  <DashboardChartCard
                    title="湿度"
                    value={deviceData ? deviceData.humidity.toFixed(1) : '--'}
                    unit="%"
                    icon={<Droplets className="size-10 text-blue-400" />}
                    type="humidity"
                    color="blue"
                    gradientColor="#60a5fa"
                    initialHistoryData={historyDataMap['humidity']}
                  />
                </div>

                {/* 会员卡片 */}
              <div key="membership">
                <MembershipCard />
              </div>
              
              {/* 温度 */}
              <div key="temperature">
                  <DashboardChartCard
                    title="温度"
                    value={deviceData ? deviceData.temperature.toFixed(1) : '--'}
                    unit="°C"
                    icon={<Sun className="size-10 text-orange-400" />}
                    type="temperature"
                    color="orange"
                    gradientColor="#fb923c"
                    initialHistoryData={historyDataMap['temperature']}
                  />
                </div>

                {/* 光照 */}
                <div key="light">
                  <DashboardChartCard
                    title="光照强度"
                    value={deviceData ? deviceData.light : '--'}
                    unit="lux"
                    icon={<Sun className="size-10 text-yellow-400" strokeWidth={1.5} />}
                    type="light"
                    color="yellow"
                    gradientColor="#facc15"
                    initialHistoryData={historyDataMap['light']}
                  />
                </div>

                {/* CO2 */}
                <div key="co2">
                  <DashboardChartCard
                    title="CO₂浓度"
                    value={deviceData ? deviceData.co2 : '--'}
                    unit="ppm"
                    icon={<Wind className="size-10 text-gray-500" />}
                    type="co2"
                    color="gray"
                    gradientColor="#9ca3af"
                    initialHistoryData={historyDataMap['co2']}
                  />
                </div>

                {/* 土壤湿度 */}
                <div key="soilMoisture">
                  <DashboardChartCard
                    title="土壤湿度"
                    value={deviceData ? (deviceData.earth_water).toFixed(0) : '--'}
                    unit="%"
                    icon={<Droplets className="size-10 text-cyan-400" />}
                    type="soilMoisture"
                    color="cyan"
                    gradientColor="#22d3ee"
                    initialHistoryData={historyDataMap['soilMoisture']}
                  />
                </div>

                {/* 土壤肥力 */}
                <div key="fertility">
                  <DashboardChartCard
                    title="土壤肥力"
                    value={(() => {
                        if (!deviceData) return '--'
                        // Calculate fertility based on NPK values
                        // N: 0-200 mg/kg -> 0-100%
                        const nScore = Math.min(100, (deviceData.earth_n / 200) * 100)
                        // P: 0-100 mg/kg -> 0-100%
                        const pScore = Math.min(100, (deviceData.earth_p / 100) * 100)
                        // K: 0-300 mg/kg -> 0-100%
                        const kScore = Math.min(100, (deviceData.earth_k / 300) * 100)
                        
                        const fertility = (nScore + pScore + kScore) / 3
                        return fertility.toFixed(1)
                    })()}
                    unit="%"
                    icon={<Leaf className="size-10 text-green-500" />}
                    type="fertility"
                    color="green"
                    gradientColor="#4ade80"
                    initialHistoryData={historyDataMap['fertility']}
                  />
                </div>

                {/* 氮含量 */}
                <div key="nitrogen">
                  <DashboardChartCard
                    title="氮含量 (N)"
                    value={deviceData ? deviceData.earth_n : '--'}
                    unit="mg/kg"
                    icon={<div className="size-10 rounded-full bg-purple-400 flex items-center justify-center text-white font-bold text-xl">N</div>}
                    type="nitrogen"
                    color="purple"
                    gradientColor="#c084fc"
                    initialHistoryData={historyDataMap['nitrogen']}
                  />
                </div>

                {/* 磷含量 */}
                <div key="phosphorus">
                  <DashboardChartCard
                    title="磷含量 (P)"
                    value={deviceData ? deviceData.earth_p : '--'}
                    unit="mg/kg"
                    icon={<div className="size-10 rounded-full bg-pink-400 flex items-center justify-center text-white font-bold text-xl">P</div>}
                    type="phosphorus"
                    color="pink"
                    gradientColor="#f472b6"
                    initialHistoryData={historyDataMap['phosphorus']}
                  />
                </div>

                {/* 钾含量 */}
                <div key="potassium">
                  <DashboardChartCard
                    title="钾含量 (K)"
                    value={deviceData ? deviceData.earth_k : '--'}
                    unit="mg/kg"
                    icon={<div className="size-10 rounded-full bg-amber-400 flex items-center justify-center text-white font-bold text-xl">K</div>}
                    type="potassium"
                    color="amber"
                    gradientColor="#fbbf24"
                    initialHistoryData={historyDataMap['potassium']}
                  />
                </div>

                {/* 光谱分析 */}
                <div key="spectral">
                  <SpectralCard data={deviceData} />
                </div>

                {/* 降雨量 */}
                <div key="rainfall">
                  {(() => {
                    const todayPrecip = weatherData?.forecast?.forecastday?.[0]?.day?.totalprecip_mm || 0
                    const isRaining = todayPrecip > 0

                    return (
                      <Card className={`h-full rounded-3xl border overflow-hidden shadow-2xl transition-all cursor-move relative ${isRaining
                        ? 'bg-gradient-to-br from-blue-600/20 via-cyan-600/15 to-blue-700/20 border-blue-400/30 hover:shadow-blue-500/20'
                        : 'glass border-border hover:shadow-3xl'
                        }`}>
                        {/* 雨滴动画效果 */}
                        {isRaining && (
                          <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            {Array.from({ length: 15 }).map((_, i) => (
                              <div
                                key={i}
                                className="absolute w-0.5 h-3 bg-blue-300/30 animate-rain-dashboard"
                                style={{
                                  left: `${Math.random() * 100}%`,
                                  animationDelay: `${Math.random() * 2}s`,
                                  animationDuration: `${0.8 + Math.random() * 0.4}s`
                                }}
                              />
                            ))}
                          </div>
                        )}

                        <CardContent className="p-6 h-full flex flex-col justify-between relative z-10">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-5xl font-bold text-foreground mb-2 animate-fade-in-dashboard">
                                {weatherData?.forecast?.forecastday?.[0]?.day?.totalprecip_mm?.toFixed(1) || '--'}
                                <span className="text-2xl font-normal text-muted-foreground">mm</span>
                              </div>
                              <Badge className={`${isRaining ? 'bg-blue-400/30 text-blue-200 border-blue-400/40' : 'bg-blue-500/20 text-blue-600 border-blue-500/30'}`}>
                                今日降雨量
                              </Badge>
                            </div>
                            <Droplets className={`size-10 transition-all ${isRaining ? 'text-blue-300 animate-bounce' : 'text-blue-400'}`} />
                          </div>
                          <div className="flex items-end justify-between h-16 gap-1.5 mt-4">
                            {weatherData?.forecast?.forecastday?.slice(0, 7).map((day, i) => {
                              const maxPrecip = Math.max(...(weatherData.forecast.forecastday.slice(0, 7).map(d => d.day.totalprecip_mm || 0)), 1)
                              const height = ((day.day.totalprecip_mm || 0) / maxPrecip) * 100
                              const hasRain = (day.day.totalprecip_mm || 0) > 0
                              return (
                                <div
                                  key={i}
                                  className={`flex-1 rounded-t-lg transition-all duration-500 ${hasRain
                                    ? 'bg-gradient-to-t from-blue-400 to-blue-300 hover:from-blue-500 hover:to-blue-400 animate-grow-bar'
                                    : 'bg-gradient-to-t from-blue-400/20 to-blue-300/20 hover:from-blue-400/30 hover:to-blue-300/30'
                                    }`}
                                  style={{
                                    height: `${Math.max(height, 5)}%`,
                                    animationDelay: `${i * 0.1}s`
                                  }}
                                  title={`${day.date}: ${day.day.totalprecip_mm?.toFixed(1) || 0}mm`}
                                />
                              )
                            }) || [40, 60, 35, 70, 45, 55, 50].map((height, i) => (
                              <div key={i} className="flex-1 bg-gradient-to-t from-blue-400/30 to-blue-300/30 rounded-t-lg" style={{ height: `${height}%` }} />
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })()}
                </div>

              </GridLayout>
            </div>
          </div>
        </div>
      </div>

    </>
  )
}
