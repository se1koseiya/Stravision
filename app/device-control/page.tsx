"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import {
  Droplet,
  Lightbulb,
  Sun,
  Fan,
  Thermometer,
  Wind,
  Wifi,
  WifiOff,
  History,
  Camera,
  ChevronLeft,
  ChevronRight,
  Square,
} from "lucide-react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { PageNavigation } from "@/components/page-navigation"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import { WeatherCard } from "@/components/weather-card"
import { motion } from "framer-motion"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useDeviceControl } from "@/lib/hooks/use-device-control"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import type { UserPublic } from "@/lib/db/user-service"
import { ModeToggle } from "@/components/mode-toggle"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"

function Toggle({
  checked = false,
  onChange,
  disabled = false,
}: {
  checked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
}) {
  const handleToggle = () => {
    if (!disabled) {
      onChange?.(!checked)
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={disabled}
      className={cn(
        "relative w-16 h-9 rounded-full transition-all duration-300 shadow-lg",
        disabled && "opacity-50 cursor-not-allowed",
        checked
          ? "bg-primary"
          : "bg-muted"
      )}
    >
      <motion.span
        className="absolute top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white shadow-md"
        animate={{
          left: checked ? "calc(100% - 32px)" : "4px",
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
      />
    </button>
  )
}

function DeviceCard({
  title,
  icon,
  gradient,
  checked = false,
  onChange,
  disabled = false,
}: {
  title: string
  icon: React.ReactNode
  gradient: string
  checked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
    >
      <Card className="relative h-full rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.06)] dark:bg-slate-900/45 dark:border-white/10 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)] overflow-hidden group">
        <div
          className="absolute inset-0 opacity-50 dark:opacity-60 group-hover:opacity-70 dark:group-hover:opacity-80 transition-opacity duration-300"
          style={{ background: gradient }}
        />
        <CardContent className="relative z-10 p-8 h-full flex flex-col justify-between min-h-[200px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className="bg-background/40 backdrop-blur-sm"
              >
                设备控制
              </Badge>
            </div>
            <h3 className="text-foreground text-2xl font-bold leading-tight">
              {title}
            </h3>
          </div>
          <div className="flex items-end justify-between mt-6">
            <div className="opacity-70 group-hover:opacity-100 transition-opacity text-foreground">
              {icon}
            </div>
            <Toggle checked={checked} onChange={onChange} disabled={disabled} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function SliderRow({
  label,
  value,
  onChange,
  color,
  displayValue,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  color: string
  displayValue?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="text-sm font-bold text-foreground">{displayValue || value}</span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={255}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-muted [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
          style={{
            background: `linear-gradient(to right, ${color} 0%, ${color} ${(value / 255) * 100}%, var(--muted) ${(value / 255) * 100}%, var(--muted) 100%)`,
          }}
        />
      </div>
    </div>
  )
}

export default function DeviceControlPage() {
  const router = useRouter()
  const [r, setR] = useState(0)
  const [g, setG] = useState(0)
  const [b, setB] = useState(0)
  const [w, setW] = useState(0)

  // Logs state
  const [logs, setLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  // User authentication state
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  // Connect to SSE for real-time device data
  const { deviceData, connectionStatus } = useDeviceData()

  // Control hook for sending commands
  const { status: controlStatus, toggleRelay, setLEDs, controlStepper } = useDeviceControl()

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

  // Fetch logs
  const fetchLogs = async () => {
    setLoadingLogs(true)
    try {
      const res = await fetch("/api/device-logs?limit=50")
      const data = await res.json()
      if (data.success) {
        setLogs(data.logs)
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error)
    } finally {
      setLoadingLogs(false)
    }
  }

  // Create log
  const createLog = async (deviceName: string, action: string, details?: string) => {
    if (!currentUser) return
    try {
      await fetch("/api/device-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_name: deviceName,
          action,
          operator: currentUser.username || currentUser.email,
          details
        })
      })
      // Refresh logs
      fetchLogs()
    } catch (error) {
      console.error("Failed to create log:", error)
    }
  }

  // Fetch logs on mount
  useEffect(() => {
    fetchLogs()
  }, [])

  // Sync LED sliders with device data on first load
  useEffect(() => {
    if (deviceData && r === 0 && g === 0 && b === 0 && w === 0) {
      setR(deviceData.led1 || 0)
      setG(deviceData.led2 || 0)
      setB(deviceData.led3 || 0)
      setW(deviceData.led4 || 0)
    }
  }, [deviceData, r, g, b, w])

  // Handle relay toggle
  const handleRelayToggle = async (relayNum: number) => {
    if (!deviceData) return

    const currentState = deviceData[`relay${relayNum}` as keyof typeof deviceData] as number || 0
    const newState = currentState === 1 ? 0 : 1
    const success = await toggleRelay(relayNum, currentState)

    if (success) {
      const deviceNames: Record<number, string> = {
        5: "水泵",
        6: "风扇",
        7: "补光灯",
        8: "白灯"
      }
      createLog(deviceNames[relayNum] || `Relay ${relayNum}`, newState === 1 ? "开启" : "关闭")
    } else {
      // Show error notification (you can add a toast notification here)
      console.error('Failed to toggle relay')
    }
  }

  // Handle LED update
  const handleLEDUpdate = async () => {
    const success = await setLEDs(r, g, b, 0)

    if (success) {
      createLog("RGB 补光灯", "更新颜色", `R:${r} G:${g} B:${b} W:${w}`)
    } else {
      console.error('Failed to update LEDs')
    }
  }

  // Handle stepper motor control (摄像头云台)
  const handleStepperControl = async (direction: number) => {
    // direction: 0=停止, 1=正转/左移, 2=反转/右移
    const success = await controlStepper(direction)

    if (success) {
      const directionNames = ['停止', '左移', '右移']
      createLog("摄像头云台", directionNames[direction], `步进电机${directionNames[direction]}`)
    } else {
      console.error('Failed to control stepper motor')
    }
  }

  // Show loading state while checking authentication
  if (isLoadingUser) {
    return (
      <div className="min-h-screen w-screen h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse">加载中...</div>
      </div>
    )
  }

  // Don't render page if no user (will redirect)
  if (!currentUser) {
    return null
  }

  return (
    <div className="relative min-h-screen w-screen h-screen overflow-hidden text-foreground">
      <div className="absolute inset-0 bg-[#F1EFEA] dark:bg-[#0B1220]" />
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(255,255,255,0.75),transparent_60%),radial-gradient(1000px_circle_at_85%_0%,rgba(209,250,229,0.55),transparent_55%),radial-gradient(900px_circle_at_70%_90%,rgba(224,231,255,0.55),transparent_60%)] dark:hidden" />
      <div className="absolute inset-0 hidden dark:block dark:bg-[radial-gradient(1200px_circle_at_15%_10%,rgba(59,130,246,0.18),transparent_60%),radial-gradient(1000px_circle_at_85%_0%,rgba(16,185,129,0.14),transparent_55%),radial-gradient(900px_circle_at_70%_90%,rgba(99,102,241,0.12),transparent_60%)]" />

      <div className="relative z-10 grid grid-rows-[72px_1fr] h-full w-full">
        {/* Header */}
        <div className="relative flex items-center px-8 border-b border-black/5 dark:border-white/10 bg-white/50 backdrop-blur-sm dark:bg-slate-900/50 z-20">
          <div className="flex items-center gap-4">
            <div className="relative size-12 shrink-0">
              <Image src="/icon.png" alt="logo" fill className="object-contain" />
            </div>
            <div className="leading-tight">
              <div className="text-base font-bold tracking-wide">
                STRAVISION
              </div>
              <div className="text-xs text-muted-foreground">莓界 · 智慧农业平台</div>
            </div>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
            <PageNavigation />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Sheet onOpenChange={(open) => { if (open) fetchLogs() }}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <History className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>设备控制历史</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-80px)] mt-4 pr-4">
                  <div className="space-y-4">
                    {loadingLogs ? (
                      <div className="text-center text-muted-foreground py-8">加载中...</div>
                    ) : logs.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">暂无操作记录</div>
                    ) : (
                      logs.map((log) => (
                        <div key={log.id} className="flex flex-col gap-1 p-3 rounded-lg bg-muted/50 border border-border">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground">{log.device_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={log.action === "开启" ? "default" : "secondary"} className="text-xs">
                              {log.action}
                            </Badge>
                            <span className="text-sm text-muted-foreground">操作人: {log.operator}</span>
                          </div>
                          {log.details && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {log.details}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
            <ModeToggle />
            {connectionStatus.connected ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                <Wifi className="size-3 mr-1" />
                已连接
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                <WifiOff className="size-3 mr-1" />
                {connectionStatus.error || '未连接'}
              </Badge>
            )}
            <UserAvatarMenu user={currentUser} />
          </div>
        </div>

        {/* Content */}
        <div className="relative px-8 pb-8 pt-6 overflow-hidden h-full w-full">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-6 h-full">
            {/* Left: Device Cards */}
            <div 
              className="space-y-6 overflow-y-auto custom-scrollbar pr-2 pb-16"
              data-lenis-prevent
            >
              {/* Row 1: 3 cards - Relay 5, 6, 7 */}
              <div id="device-control-grid" className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <DeviceCard
                  title="水泵 (Relay 5)"
                  icon={
                    <Droplet className="size-16" strokeWidth={1.5} />
                  }
                  gradient="radial-gradient(circle at 30% 30%, rgba(13, 94, 248, 0.4) 0%, transparent 70%)"
                  checked={deviceData?.relay5 === 1}
                  onChange={() => handleRelayToggle(5)}
                  disabled={controlStatus.loading || !connectionStatus.connected}
                />
                <DeviceCard
                  title="风扇 (Relay 6)"
                  icon={
                    <Fan
                      className="size-16"
                      strokeWidth={1.5}
                    />
                  }
                  gradient="radial-gradient(circle at 30% 30%, rgba(96, 165, 250, 0.4) 0%, transparent 70%)"
                  checked={deviceData?.relay6 === 1}
                  onChange={() => handleRelayToggle(6)}
                  disabled={controlStatus.loading || !connectionStatus.connected}
                />
                <DeviceCard
                  title="补光灯 (Relay 7)"
                  icon={<Lightbulb className="size-16" strokeWidth={1.5} />}
                  gradient="radial-gradient(circle at 30% 30%, rgba(245, 183, 0, 0.4) 0%, transparent 70%)"
                  checked={deviceData?.relay7 === 1}
                  onChange={() => handleRelayToggle(7)}
                  disabled={controlStatus.loading || !connectionStatus.connected}
                />
              </div>

              {/* Row 2: 1 card + RGB Control */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <DeviceCard
                  title="白灯 (Relay 8)"
                  icon={<Sun className="size-16" strokeWidth={1.5} />}
                  gradient="radial-gradient(circle at 30% 30%, rgba(138, 124, 243, 0.4) 0%, transparent 70%)"
                  checked={deviceData?.relay8 === 1}
                  onChange={() => handleRelayToggle(8)}
                  disabled={controlStatus.loading || !connectionStatus.connected}
                />

                {/* RGB Control - spans 2 columns */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="md:col-span-2"
                >
                  <Card className="relative h-full rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.06)] dark:bg-slate-900/45 dark:border-white/10 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)] overflow-hidden group">
                    <div
                      className="absolute inset-0 opacity-20 dark:opacity-60 group-hover:opacity-40 dark:group-hover:opacity-80 transition-opacity duration-300"
                      style={{
                        background:
                          "radial-gradient(circle at 30% 30%, rgba(76, 128, 255, 0.4) 0%, transparent 70%)",
                      }}
                    />
                    <CardContent className="relative z-10 p-8 h-full flex flex-col gap-6 min-h-[200px]">
                      <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="flex-1 space-y-4">
                          <div>
                            <Badge
                              variant="outline"
                              className="bg-background/40 backdrop-blur-sm mb-3"
                            >
                              RGB 控制 (LED 1-3)
                            </Badge>
                            <h3 className="text-foreground text-2xl font-bold">
                              补光灯颜色
                            </h3>
                          </div>
                          <div
                            className="w-full h-24 rounded-xl border border-border shadow-inner transition-all duration-300"
                            style={{
                              backgroundColor: `rgb(${r}, ${g}, ${b})`,
                              boxShadow: `0 0 30px rgba(${r}, ${g}, ${b}, 0.5)`,
                            }}
                          />
                        </div>
                        <div className="flex-1 space-y-4 w-full">
                          <SliderRow
                            label="红色 (LED 1)"
                            value={r}
                            onChange={setR}
                            color="#ef4444"
                          />
                          <SliderRow
                            label="绿色 (LED 2)"
                            value={g}
                            onChange={setG}
                            color="#22c55e"
                          />
                          <SliderRow
                            label="蓝色 (LED 3)"
                            value={b}
                            onChange={setB}
                            color="#3b82f6"
                          />
                          <SliderRow
                            label="亮度 (占空比)"
                            value={w}
                            onChange={setW}
                            color="#f59e0b"
                            displayValue={`${Math.round((w / 255) * 100)}%`}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          onClick={handleLEDUpdate}
                          disabled={controlStatus.loading || !connectionStatus.connected}
                          className="px-8"
                        >
                          {controlStatus.loading ? '发送中...' : '更新 LED 亮度'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Row 3: Camera Pan Control (步进电机) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
              >
                <Card className="relative rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.06)] dark:bg-slate-900/45 dark:border-white/10 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)] overflow-hidden group">
                  <div
                    className="absolute inset-0 opacity-30 dark:opacity-60 group-hover:opacity-50 dark:group-hover:opacity-80 transition-opacity duration-300"
                    style={{
                      background:
                        "radial-gradient(circle at 30% 30%, rgba(99, 102, 241, 0.4) 0%, transparent 70%)",
                    }}
                  />
                  <CardContent className="relative z-10 p-8">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                      <div className="flex-1 space-y-4">
                        <div>
                          <Badge
                            variant="outline"
                            className="bg-background/40 backdrop-blur-sm mb-3"
                          >
                            步进电机控制
                          </Badge>
                          <h3 className="text-foreground text-2xl font-bold">
                            摄像头云台
                          </h3>
                          <p className="text-sm text-muted-foreground mt-2">
                            控制摄像头左右移动，用于调整监控视角
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Camera className="size-12 text-indigo-500 opacity-70" strokeWidth={1.5} />
                          <span className="text-sm text-muted-foreground">
                            {deviceData?.stepper_direction === 1 ? '正在左移...' : 
                             deviceData?.stepper_direction === 2 ? '正在右移...' : '已停止'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Button
                          variant="outline"
                          size="lg"
                          className="h-16 w-16 rounded-xl border-2 hover:bg-blue-500/10 hover:border-blue-500/50"
                          onClick={() => handleStepperControl(1)}
                          disabled={controlStatus.loading || !connectionStatus.connected}
                        >
                          <ChevronLeft className="size-8 text-foreground" />
                        </Button>
                        <Button
                          variant="outline"
                          size="lg"
                          className="h-16 w-16 rounded-xl border-2 bg-red-500/10 hover:bg-red-500/20 border-red-500/30 hover:border-red-500/50"
                          onClick={() => handleStepperControl(0)}
                          disabled={controlStatus.loading || !connectionStatus.connected}
                        >
                          <Square className="size-6 fill-red-500 text-red-500" />
                        </Button>
                        <Button
                          variant="outline"
                          size="lg"
                          className="h-16 w-16 rounded-xl border-2 hover:bg-blue-500/10 hover:border-blue-500/50"
                          onClick={() => handleStepperControl(2)}
                          disabled={controlStatus.loading || !connectionStatus.connected}
                        >
                          <ChevronRight className="size-8 text-foreground" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Row 4: 2 cards - Sensors (read-only) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DeviceCard
                  title="温湿度传感器"
                  icon={
                    <Thermometer
                      className="size-16"
                      strokeWidth={1.5}
                    />
                  }
                  gradient="radial-gradient(circle at 30% 30%, rgba(166, 108, 84, 0.4) 0%, transparent 70%)"
                  checked={true}
                  disabled={true}
                />
                <DeviceCard
                  title="CO₂ 传感器"
                  icon={<Wind className="size-16" strokeWidth={1.5} />}
                  gradient="radial-gradient(circle at 30% 30%, rgba(158, 62, 53, 0.4) 0%, transparent 70%)"
                  checked={true}
                  disabled={true}
                />
              </div>
            </div>

            {/* Right: Environment Data */}
            <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.06)] dark:bg-slate-900/45 dark:border-white/10 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)] overflow-hidden p-6">
              <WeatherCard deviceData={deviceData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
