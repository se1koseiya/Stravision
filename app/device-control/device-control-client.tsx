"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import dynamic from "next/dynamic"
import {
  Switch,
  Slider,
  Button,
  Badge,
  Row,
  Col,
  Space,
  Tag,
  Typography,
  InputNumber,
  Input,
  Divider,
  Tooltip,
  message,
  Modal,
  Alert,
  Spin,
  Empty,
  Descriptions,
  Segmented,
  Progress,
  Popconfirm,
  ConfigProvider,
  theme as antdTheme,
} from "antd"
import {
  HistoryOutlined,
  UndoOutlined,
  SettingOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons"
import { 
  Droplet, 
  Droplets, 
  Fan, 
  Lightbulb, 
  Camera, 
  Cpu, 
  Activity, 
  Sliders, 
  Settings, 
  Info, 
  History, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  ChevronUp,
  ChevronDown,
  Mic,
  Maximize2,
  Minimize2,
  X,
  Video, 
  Signal, 
  Sun, 
  CloudSun, 
  Wifi, 
  Thermometer, 
  Wind, 
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  AlertOctagon,
  Compass,
  ArrowRight,
  RotateCcw,
  Target
} from "lucide-react"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useDeviceControl } from "@/lib/hooks/use-device-control"
import { useRouter } from "next/navigation"
import type { UserPublic } from "@/lib/db/user-service"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import { PageHeaderRight } from "@/components/page-header-right"
import { useElderFriendly } from "@/lib/contexts/elder-friendly-context"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"

const { Text } = Typography

// 动态载入监控视频组件
const LiveStreamPlayer = dynamic(
  () => import("@/components/live-stream-player").then((mod) => mod.LiveStreamPlayer),
  { ssr: false }
)

// ==================== 流媒体 URL 处理函数 ====================
const getStreamUrlFromInput = (rawUrl: string) => {
  const url = rawUrl.trim()
  if (!url) return ""

  if (/player\.xstrive\.com\/video\/live/i.test(url)) {
    const safeDecode = (value: string) => {
      try {
        return decodeURIComponent(value)
      } catch {
        return value
      }
    }

    const extractVideoUrlLoosely = (playerUrl: string) => {
      const qIndex = playerUrl.indexOf("?")
      if (qIndex < 0) return ""
      const query = playerUrl.slice(qIndex + 1)
      const lower = query.toLowerCase()
      let start = lower.indexOf("videourl=")
      while (start !== -1 && start > 0 && query[start - 1] !== "&") {
        start = lower.indexOf("videourl=", start + 1)
      }
      if (start === -1) return ""
      const valueStart = start + "videourl=".length
      const after = query.slice(valueStart)
      const parts = after.split("&")
      const stopKeys = new Set(["islive", "ismute", "aspect", "lang", "autoplay", "from", "player", "t", "ts"])
      const videoParts: string[] = []
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i]
        const eq = p.indexOf("=")
        const key = eq >= 0 ? p.slice(0, eq).toLowerCase() : ""
        if (i > 0 && key && stopKeys.has(key)) break
        videoParts.push(p)
      }
      return videoParts.join("&")
    }

    try {
      const u = new URL(url)
      const videoUrl = u.searchParams.get("videoUrl") ?? ""
      const loose = extractVideoUrlLoosely(url)
      const picked = loose.length > videoUrl.length ? loose : videoUrl
      if (!picked) return ""
      return safeDecode(picked)
    } catch {
      const loose = extractVideoUrlLoosely(url)
      if (!loose) return ""
      return safeDecode(loose)
    }
  }

  return url
}

const getPlayableUrl = (rawUrl: string) => {
  const url = getStreamUrlFromInput(rawUrl)
  if (!url) return ""

  if (url.startsWith("rtmp://") || url.startsWith("rtmps://")) {
    return `/api/stream-rtmp?url=${encodeURIComponent(url)}`
  }

  if (typeof window !== "undefined") {
    try {
      const u = new URL(url)
      if (u.protocol === "http:" || u.protocol === "https:") {
        return `/api/stream-proxy?url=${encodeURIComponent(url)}`
      }
    } catch {}
  }

  return url
}

// ==================== HSL/RGB 转换函数 (用于调色盘) ====================
const hslToRgb = (h: number, s: number, l: number) => {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [
    Math.round(255 * f(0)),
    Math.round(255 * f(8)),
    Math.round(255 * f(4))
  ];
};

// ==================== HSL Canvas 调色盘微组件 ====================
interface ColorPickerProps {
  r: number
  g: number
  b: number
  onChange: (r: number, g: number, b: number) => void
}

function ColorPickerCanvas({ r, g, b, onChange }: ColorPickerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [cursorPos, setCursorPos] = useState({ x: 120, y: 80 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // 绘制横向彩虹色相渐变
    const rainbowGrad = ctx.createLinearGradient(0, 0, width, 0)
    rainbowGrad.addColorStop(0, '#ff0000')
    rainbowGrad.addColorStop(0.17, '#ffff00')
    rainbowGrad.addColorStop(0.33, '#00ff00')
    rainbowGrad.addColorStop(0.5, '#00ffff')
    rainbowGrad.addColorStop(0.67, '#0000ff')
    rainbowGrad.addColorStop(0.83, '#ff00ff')
    rainbowGrad.addColorStop(1, '#ff0000')
    ctx.fillStyle = rainbowGrad
    ctx.fillRect(0, 0, width, height)

    // 叠加垂直饱和度与明度混合
    const vtGrad = ctx.createLinearGradient(0, 0, 0, height)
    vtGrad.addColorStop(0, 'rgba(255,255,255,1)')
    vtGrad.addColorStop(0.5, 'rgba(255,255,255,0)')
    vtGrad.addColorStop(0.5, 'rgba(0,0,0,0)')
    vtGrad.addColorStop(1, 'rgba(0,0,0,1)')
    ctx.fillStyle = vtGrad
    ctx.fillRect(0, 0, width, height)
  }, [])

  const handlePickColor = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
    
    const canvasX = (x / rect.width) * canvas.width
    const canvasY = (y / rect.height) * canvas.height
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    try {
      const imgData = ctx.getImageData(canvasX, canvasY, 1, 1).data
      onChange(imgData[0], imgData[1], imgData[2])
      setCursorPos({ x, y })
    } catch (err) {
      console.error(err)
    }
  }

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsMouseDown(true)
    handlePickColor(e)
  }

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isMouseDown) {
      handlePickColor(e)
    }
  }

  useEffect(() => {
    const handleMouseUp = () => setIsMouseDown(false)
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [isMouseDown])

  return (
    <div className="relative w-full h-[220px] rounded-xl overflow-hidden shadow-inner border border-slate-100 dark:border-zinc-800">
      <canvas
        ref={canvasRef}
        width={400}
        height={220}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        className="w-full h-full cursor-crosshair"
      />
      {/* 游标选择器 */}
      <div
        className="absolute size-4 rounded-full border-2 border-white bg-transparent pointer-events-none shadow-[0_0_8px_rgba(0,0,0,0.5)] -translate-x-2 -translate-y-2"
        style={{ left: cursorPos.x, top: cursorPos.y }}
      />
    </div>
  )
}

export default function DeviceControlClient() {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const { token } = antdTheme.useToken()

  // 侧边子导航激活项: 'overview' (设备总览) | 'control' (设备控制)
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'control'>('overview')

  // Sidebar 收起/展开状态
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // 历史记录展开状态
  const [showHistory, setShowHistory] = useState(false)

  // 设备分组展开状态
  const [showDeviceGroups, setShowDeviceGroups] = useState(false)

  // 告警记录展开状态
  const [showAlerts, setShowAlerts] = useState(false)

  // 通知设置展开状态
  const [showNotifications, setShowNotifications] = useState(false)

  // 视图切换状态: 'card' | 'list'
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')

  // RGB LED 状态
  const [r, setR] = useState(0)
  const [g, setG] = useState(0)
  const [b, setB] = useState(0)
  const [w, setW] = useState(80)

  // 步进电机参数
  const [stepPulses, setStepPulses] = useState(1600)
  const [presetPulses, setPresetPulses] = useState(112000)
  const [presetSpeed, setPresetSpeed] = useState(10000)

  // 日志状态
  const [logs, setLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  // 摄像头加载状态
  const [loadingCameras, setLoadingCameras] = useState(false)

  // 全屏模式状态
  const [isFullscreen, setIsFullscreen] = useState(false)
  const videoContainerRef = useRef<HTMLDivElement>(null)

  // 用户认证状态
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  // LED 发送防抖与状态指示
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced')
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 老年友好模式
  const { isElderFriendlyMode } = useElderFriendly()

  // 摄像头列表与选择
  const [cameras, setCameras] = useState([
    { id: 1, name: "温室监控摄像头 A", on: true, url: "" },
    { id: 2, name: "温室监控摄像头 B", on: true, url: "" },
  ])
  const [selectedCameraId, setSelectedCameraId] = useState<number>(1)

  // 连接实时数据
  const { deviceData, connectionStatus } = useDeviceData()

  // 设备控制 hook
  const { status: controlStatus, toggleRelay, setLEDs, controlStepper, resetStepperPosition, sendStepperPreset } = useDeviceControl()

  const selectedCamera = useMemo(() => {
    return cameras.find(c => c.id === selectedCameraId) || cameras[0]
  }, [cameras, selectedCameraId])

  const cameraPlayerSources = useMemo(() => {
    if (!selectedCamera?.url) return []
    const src = getPlayableUrl(selectedCamera.url)
    if (!src) return []
    return [{ src }]
  }, [selectedCamera?.url])

  // ==================== 数据获取与登录校验 ====================

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

  // 获取监控视频流 URL
  const fetchCameras = useCallback(async () => {
    setLoadingCameras(true)
    try {
      const res = await fetch('/api/greenhouse/cameras')
      if (res.ok) {
        const data = await res.json()
        setCameras(prev => prev.map(cam => {
          if (cam.id === 1) return { ...cam, url: data.cameraAUrl || "" }
          if (cam.id === 2) return { ...cam, url: data.cameraBUrl || "" }
          return cam
        }))
      } else {
        message.error('获取摄像头配置失败')
      }
    } catch (error) {
      console.error("获取监控视频流失败:", error)
      message.error('获取摄像头配置失败')
    } finally {
      setLoadingCameras(false)
    }
  }, [])

  useEffect(() => {
    fetchCameras()

    // 定时刷新摄像头配置（每30秒）
    const interval = setInterval(fetchCameras, 30000)
    return () => clearInterval(interval)
  }, [fetchCameras])

  // 获取操作日志
  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true)
    try {
      const res = await fetch("/api/device-logs?limit=50")
      const data = await res.json()
      if (data.success) {
        setLogs(data.logs)
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error)
      message.error('获取操作日志失败')
    } finally {
      setLoadingLogs(false)
    }
  }, [])

  // 创建操作日志
  const createLog = useCallback(async (deviceName: string, action: string, details?: string) => {
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
      fetchLogs()
    } catch (error) {
      console.error("Failed to create log:", error)
    }
  }, [currentUser, fetchLogs])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // 初始化 LED 值
  useEffect(() => {
    if (deviceData && r === 0 && g === 0 && b === 0) {
      setB(deviceData.led1 || 0)
      setR(deviceData.led2 || 0)
      setG(deviceData.led3 || 0)
      setW(deviceData.led4 || 0)
    }
  }, [deviceData, r, g, b])

  // 清理防抖定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // ==================== LED 防抖自动发送逻辑 ====================

  const triggerLEDUpdate = useCallback((newB: number, newR: number, newG: number, newW: number) => {
    // 检查连接状态
    if (!connectionStatus.connected) {
      setSyncStatus('error')
      return
    }

    setSyncStatus('syncing')
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const success = await setLEDs(newB, newR, newG, newW)
        if (success) {
          setSyncStatus('synced')
          createLog("RGB 补光灯", "调色更新", `R:${newR} G:${newG} B:${newB} W:${newW}`)
        } else {
          setSyncStatus('error')
          message.error('LED 参数更新失败')
        }
      } catch (err) {
        setSyncStatus('error')
        console.error('LED 更新失败:', err)
        message.error(`LED 控制异常: ${err instanceof Error ? err.message : '未知错误'}`)
      }
    }, 350)
  }, [setLEDs, createLog, connectionStatus.connected])

  const handleRChange = (val: number) => {
    setR(val)
    triggerLEDUpdate(b, val, g, w)
  }

  const handleGChange = (val: number) => {
    setG(val)
    triggerLEDUpdate(b, r, val, w)
  }

  const handleBChange = (val: number) => {
    setB(val)
    triggerLEDUpdate(val, r, g, w)
  }

  const handleWChange = (val: number) => {
    setW(val)
    triggerLEDUpdate(b, r, g, val)
  }

  const handleCanvasColorChange = (newR: number, newG: number, newB: number) => {
    setR(newR)
    setG(newG)
    setB(newB)
    triggerLEDUpdate(newB, newR, newG, w)
  }

  // ==================== 操作逻辑处理 ====================

  const handleRelayToggle = async (relayNum: number) => {
    if (!deviceData) {
      message.warning('等待设备数据连接...')
      return
    }

    // 检查连接状态
    if (!connectionStatus.connected) {
      message.error('设备未连接，无法执行操作')
      return
    }

    const currentState = deviceData[`relay${relayNum}` as keyof typeof deviceData] as number || 0
    const newState = currentState === 1 ? 0 : 1
    const deviceConfig = DEVICES_CONFIG_LOCAL.find(d => d.key === relayNum)!
    const deviceName = deviceConfig.title

    const executeToggle = async () => {
      try {
        const success = await toggleRelay(relayNum, currentState)
        if (success) {
          createLog(deviceName, newState === 1 ? "开启" : "关闭")
          message.success(`${deviceName} 已${newState === 1 ? '开启' : '关闭'}`)
        } else {
          message.error(`${deviceName} 操作失败，请重试`)
        }
      } catch (error) {
        console.error('继电器操作失败:', error)
        message.error(`${deviceName} 操作异常: ${error instanceof Error ? error.message : '未知错误'}`)
      }
    }

    if (deviceConfig.isCritical) {
      Modal.confirm({
        title: newState === 1 ? '安全提示：确认开启水泵？' : '安全提示：确认关闭水泵？',
        content: (
          <div className="space-y-2 mt-2">
            <p className="text-sm">您确定要操作关键设备 <strong>{deviceName}</strong> 吗？</p>
            <Alert
              type={newState === 1 ? "success" : "warning"}
              showIcon
              message={newState === 1 ? "自动灌溉设备启动将开闸注水，请核查管路接口。" : "停机将立即终止大棚注水。"}
              className="text-xs"
            />
          </div>
        ),
        okText: newState === 1 ? '确认启动' : '确认停机',
        okType: newState === 1 ? 'primary' : 'danger',
        cancelText: '取消',
        centered: true,
        onOk: executeToggle,
      })
    } else {
      await executeToggle()
    }
  }

  const handleStepperControl = async (orientation: number) => {
    // 检查连接状态
    if (!connectionStatus.connected) {
      message.error('设备未连接，无法控制云台')
      return
    }

    const pulses = orientation === 0 ? undefined : stepPulses
    const orientationNames = ['停止', '左移', '右移']

    try {
      if (orientation === 0) {
        const success = await controlStepper(orientation, pulses)
        if (success) {
          createLog("摄像头云台", "停止", "步进电机紧急停止")
          message.info('步进滑台已紧急刹车停止')
        } else {
          message.error('停止命令发送失败')
        }
        return
      }

      const distance = (pulses! / 160).toFixed(1)
      const success = await controlStepper(orientation, pulses)
      if (success) {
        createLog("摄像头云台", orientationNames[orientation], `滑台移动 ${distance}mm`)
        message.success(`滑台指令已发送: ${orientationNames[orientation]} ${distance}mm`)
      } else {
        message.error('云台控制命令发送失败')
      }
    } catch (error) {
      console.error('步进电机控制失败:', error)
      message.error(`云台控制异常: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  const handleResetStepper = async () => {
    // 检查连接状态
    if (!connectionStatus.connected) {
      message.error('设备未连接，无法执行复位操作')
      return
    }

    const currentPosition = ((deviceData?.stepper_position || 0) / 160).toFixed(1)

    Modal.confirm({
      title: '滑台归零校准',
      content: (
        <div className="space-y-2 mt-2">
          <p className="text-sm">这会将监控摄像头滑轨移回起始传感器零位，校准累积误差：</p>
          <Alert
            type="info"
            showIcon
            message={`当前软位置: ${currentPosition}mm → 硬件物理零点`}
            className="text-xs"
          />
        </div>
      ),
      okText: '确认校准',
      okType: 'danger',
      onOk: async () => {
        try {
          const success = await resetStepperPosition()
          if (success) {
            createLog("摄像头云台", "复位归零", `从 ${currentPosition}mm 归零`)
            message.success('复位校准序列已发送')
          } else {
            message.error('复位命令发送失败')
          }
        } catch (error) {
          console.error('步进电机复位失败:', error)
          message.error(`复位操作异常: ${error instanceof Error ? error.message : '未知错误'}`)
        }
      },
    })
  }

  const handleStepperPreset = async () => {
    if (!connectionStatus.connected) {
      message.error('未连接到设备服务器')
      return
    }

    try {
      const distance = (presetPulses / 160).toFixed(1)
      const success = await sendStepperPreset(presetPulses, presetSpeed)
      if (success) {
        message.success(`参数下发成功，行程: ${distance}mm`)
        await createLog("摄像头云台", "高级预设", `脉冲: ${presetPulses}, 速度: ${presetSpeed}`)
      } else {
        message.error('预设参数发送失败')
      }
    } catch (error) {
      console.error('步进电机预设失败:', error)
      message.error(`预设参数异常: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // 预设位卡片一击即达
  const handlePresetTrigger = async (presetName: string, targetMm: number) => {
    // 检查连接状态
    if (!connectionStatus.connected) {
      message.error('设备未连接，无法执行定位操作')
      return
    }

    const pulses = Math.round(targetMm * 160)
    Modal.confirm({
      title: `云台定位：前往预设点 ${presetName}？`,
      content: <p className="text-sm">系统将发送驱动包移动至行程 <strong>{targetMm} mm</strong> 处。</p>,
      okText: '确认前往',
      onOk: async () => {
        try {
          const success = await sendStepperPreset(pulses, 10000)
          if (success) {
            message.success(`正在前往预设位: ${presetName} (${targetMm}mm)`)
            createLog("摄像头云台", "预设定位", `前往 ${presetName} (${targetMm}mm)`)
          } else {
            message.error('预设定位命令发送失败')
          }
        } catch (error) {
          console.error('预设定位失败:', error)
          message.error(`定位操作异常: ${error instanceof Error ? error.message : '未知错误'}`)
        }
      }
    })
  }

  // ==================== 全屏控制功能 ====================

  const toggleFullscreen = useCallback(async () => {
    if (!selectedCamera?.url) {
      message.warning('摄像头未连接')
      return
    }

    try {
      if (!isFullscreen && videoContainerRef.current) {
        // 进入全屏
        await videoContainerRef.current.requestFullscreen()
        setIsFullscreen(true)
        message.success('已进入全屏模式 (按 ESC 退出)')
      } else if (document.fullscreenElement) {
        // 退出全屏
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (error) {
      console.error('全屏操作失败:', error)
      message.error('全屏功能不可用')
    }
  }, [isFullscreen, selectedCamera?.url])

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // ==================== 数据绑定与计算 ====================

  const systemStats = useMemo(() => {
    const activeList = DEVICES_CONFIG_LOCAL.filter(d =>
      (deviceData?.[`relay${d.key}` as keyof typeof deviceData] as number || 0) === 1
    )
    return {
      activeDevices: activeList.length,
      stepperPosition: ((deviceData?.stepper_position || 0) / 160).toFixed(1),
      ledBrightness: Math.round((w / 255) * 100),
      stepperStatus: deviceData?.stepper_direction === 1 ? '向左平移' :
                      deviceData?.stepper_direction === 2 ? '向右平移' : '滑台停驻',
    }
  }, [deviceData, w])

  // 大棚环境实时数据绑定
  const greenhouseMetrics = useMemo(() => {
    return {
      temp: deviceData?.temperature !== undefined ? deviceData.temperature.toFixed(1) : "0.0",
      humidity: deviceData?.humidity !== undefined ? deviceData.humidity.toFixed(1) : "0.0",
      co2: deviceData?.co2 !== undefined ? deviceData.co2 : 0,
      light: deviceData?.light !== undefined ? deviceData.light : 0,
    }
  }, [deviceData])

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#19a15f', // 严格复刻截图品牌绿
          colorSuccess: '#19a15f',
          colorWarning: '#f59e0b',
          colorError: '#ef4444',
          borderRadius: 8,
        },
        components: {
          Button: {
            borderRadius: 8,
            colorPrimary: '#19a15f',
          },
          Switch: {
            colorPrimary: '#19a15f',
          },
          Slider: {
            colorPrimary: '#19a15f',
            colorFillSecondary: '#19a15f',
          }
        }
      }}
    >
      <div className={cn(
        "min-h-screen w-full flex flex-col relative transition-colors duration-500",
        // 精致的大厂背景色：极浅灰白
        "bg-[#f5f7f8] dark:bg-[#0b0f19] text-foreground font-sans",
        isElderFriendlyMode && "elder-friendly-text"
      )}>
        {/* ====== 顶栏 (Topbar) ====== */}
        <PageHeader user={currentUser}>
          <PageHeaderRight
            connectionStatus={connectionStatus}
          />
        </PageHeader>

        {/* ====== 下半部双分栏布局 ====== */}
        <div className="flex flex-1 w-full min-h-[calc(100vh-72px)] overflow-hidden">

          {/* ======================================================== */}
          {/*                 左侧二级导航栏 (一比一复刻)               */}
          {/* ======================================================== */}
          <div className={cn(
            "relative shrink-0 bg-white dark:bg-zinc-950 flex flex-col justify-between select-none m-4 rounded-2xl transition-all duration-300",
            sidebarCollapsed ? "w-[60px] p-2" : "w-[240px] p-4"
          )}>
            {/* 收起/展开按钮 */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={cn(
                "absolute -top-2 -right-2 z-10 size-6 rounded-full bg-slate-100 dark:bg-zinc-900 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors shadow-sm border border-slate-200 dark:border-zinc-800"
              )}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="size-3 text-slate-600 dark:text-slate-400" />
              ) : (
                <ChevronLeft className="size-3 text-slate-600 dark:text-slate-400" />
              )}
            </button>

            <div className="space-y-6 relative">

              {/* Group 1 */}
              <div className="space-y-1.5">
                <button
                  onClick={() => setActiveSubTab('control')}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200",
                    activeSubTab === 'control'
                      ? "bg-[#e6f7ef] text-[#19a15f] dark:bg-[#112d1f]"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-900",
                    sidebarCollapsed && "justify-center px-2"
                  )}
                >
                  <Cpu className="size-4" />
                  <span className={cn(sidebarCollapsed && "hidden")}>设备控制</span>
                </button>

                <button
                  onClick={() => setActiveSubTab('overview')}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200",
                    activeSubTab === 'overview'
                      ? "bg-[#e6f7ef] text-[#19a15f] dark:bg-[#112d1f]"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-900",
                    sidebarCollapsed && "justify-center px-2"
                  )}
                >
                  <Sliders className="size-4" />
                  <span className={cn(sidebarCollapsed && "hidden")}>设备总览</span>
                </button>

                {/* 设备分组按钮 - 可展开 */}
                {!sidebarCollapsed && (
                  <div>
                    <button
                      onClick={() => setShowDeviceGroups(!showDeviceGroups)}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all",
                        showDeviceGroups
                          ? "bg-[#e6f7ef] text-[#19a15f] dark:bg-[#112d1f]"
                          : "text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Settings className="size-4" />
                        <span>设备分组</span>
                      </div>
                      <ChevronDown className={cn("size-3 transition-transform", showDeviceGroups && "rotate-180")} />
                    </button>

                    {/* 设备分组展开内容 */}
                    <AnimatePresence>
                      {showDeviceGroups && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 ml-2 p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-lg space-y-2">
                            {DEVICES_CONFIG_LOCAL.map((device) => (
                              <div
                                key={device.key}
                                className="flex items-center justify-between p-2 bg-white dark:bg-zinc-950 rounded border border-slate-100 dark:border-zinc-800"
                              >
                                <span className="text-[9px] font-bold text-foreground">{device.title}</span>
                                <Badge
                                  status={(deviceData?.[`relay${device.key}` as keyof typeof deviceData] as number || 0) === 1 ? 'success' : 'default'}
                                  text={<span className="text-[8px]">{(deviceData?.[`relay${device.key}` as keyof typeof deviceData] as number || 0) === 1 ? '运行' : '停止'}</span>}
                                />
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Group 2: 环境管理 */}
              <div className="space-y-1.5">
                {!sidebarCollapsed && (
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-600 px-3 uppercase tracking-wider block">环境管理</span>
                )}

                {/* 历史记录按钮 - 可展开 */}
                {!sidebarCollapsed && (
                  <div>
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all",
                        showHistory
                          ? "bg-[#e6f7ef] text-[#19a15f] dark:bg-[#112d1f]"
                          : "text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <History className="size-4" />
                        <span>历史记录</span>
                      </div>
                      <ChevronDown className={cn("size-3 transition-transform", showHistory && "rotate-180")} />
                    </button>

                    {/* 历史记录展开内容 */}
                    <AnimatePresence>
                      {showHistory && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 ml-2 p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-lg space-y-3">
                            {/* 视图切换 */}
                            <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-lg">
                              <button
                                onClick={() => setViewMode('card')}
                                className={cn(
                                  "flex-1 px-2 py-1 rounded text-[10px] font-bold transition-all",
                                  viewMode === 'card'
                                    ? "bg-[#19a15f] text-white"
                                    : "text-slate-500 hover:text-slate-700"
                                )}
                              >
                                卡片
                              </button>
                              <button
                                onClick={() => setViewMode('list')}
                                className={cn(
                                  "flex-1 px-2 py-1 rounded text-[10px] font-bold transition-all",
                                  viewMode === 'list'
                                    ? "bg-[#19a15f] text-white"
                                    : "text-slate-500 hover:text-slate-700"
                                )}
                              >
                                列表
                              </button>
                            </div>

                            {/* 刷新按钮 */}
                            <button
                              onClick={fetchLogs}
                              disabled={loadingLogs}
                              className="w-full text-[10px] font-bold text-[#19a15f] hover:underline flex items-center justify-center gap-1 disabled:opacity-50"
                            >
                              <RefreshCw className={cn("size-3", loadingLogs && "animate-spin")} />
                              <span>刷新记录</span>
                            </button>

                            {/* 操作记录列表 */}
                            <ScrollArea className="h-[200px]">
                              {loadingLogs ? (
                                <div className="flex items-center justify-center h-full">
                                  <Spin size="small" />
                                </div>
                              ) : logs.length === 0 ? (
                                <Empty
                                  description="暂无记录"
                                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                                  className="py-2"
                                />
                              ) : (
                                <div className="space-y-1.5">
                                  {logs.slice(0, 10).map((log: any, index: number) => (
                                    <div
                                      key={log.id || index}
                                      className="p-2 bg-white dark:bg-zinc-950 rounded border border-slate-100 dark:border-zinc-800"
                                    >
                                      {viewMode === 'card' ? (
                                        <div className="space-y-1">
                                          <div className="flex justify-between items-start">
                                            <span className="text-[9px] font-bold text-foreground truncate flex-1">{log.device_name}</span>
                                            <span className="text-[8px] text-slate-400 font-mono ml-1">
                                              {log.created_at ? new Date(log.created_at).toLocaleTimeString('zh-CN', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                              }) : '--:--'}
                                            </span>
                                          </div>
                                          <Badge
                                            status={log.action?.includes('开启') || log.action?.includes('打开') ? 'success' : log.action?.includes('关闭') ? 'default' : 'processing'}
                                            text={<span className="text-[8px] font-medium">{log.action}</span>}
                                          />
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="text-[8px] font-medium text-foreground truncate flex-1">{log.device_name}</span>
                                          <Badge
                                            status={log.action?.includes('开启') || log.action?.includes('打开') ? 'success' : log.action?.includes('关闭') ? 'default' : 'processing'}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </ScrollArea>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Group 3: 告警管理 */}
              <div className="space-y-1.5">
                {!sidebarCollapsed && (
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-600 px-3 uppercase tracking-wider block">告警管理</span>
                )}

                {/* 告警记录按钮 - 可展开 */}
                {!sidebarCollapsed && (
                  <div>
                    <button
                      onClick={() => setShowAlerts(!showAlerts)}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all",
                        showAlerts
                          ? "bg-[#e6f7ef] text-[#19a15f] dark:bg-[#112d1f]"
                          : "text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <AlertOctagon className="size-4" />
                        <span>告警记录</span>
                      </div>
                      <ChevronDown className={cn("size-3 transition-transform", showAlerts && "rotate-180")} />
                    </button>

                    {/* 告警记录展开内容 */}
                    <AnimatePresence>
                      {showAlerts && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 ml-2 p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-lg">
                            <div className="space-y-2">
                              <div className="p-2 bg-white dark:bg-zinc-950 rounded border border-slate-100 dark:border-zinc-800">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-bold text-foreground">系统运行正常</span>
                                  <Badge status="success" text={<span className="text-[8px]">正常</span>} />
                                </div>
                                <span className="text-[8px] text-slate-400 mt-1 block">无告警事件</span>
                              </div>
                              <div className="p-2 bg-white dark:bg-zinc-950 rounded border border-slate-100 dark:border-zinc-800">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-bold text-foreground">设备连接状态</span>
                                  <Badge status={connectionStatus.connected ? 'success' : 'warning'} text={<span className="text-[8px]">{connectionStatus.connected ? '已连接' : '离线'}</span>} />
                                </div>
                                <span className="text-[8px] text-slate-400 mt-1 block">{connectionStatus.connected ? '所有设备在线' : '请检查网络连接'}</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* 通知设置按钮 - 可展开 */}
                {!sidebarCollapsed && (
                  <div>
                    <button
                      onClick={() => setShowNotifications(!showNotifications)}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all",
                        showNotifications
                          ? "bg-[#e6f7ef] text-[#19a15f] dark:bg-[#112d1f]"
                          : "text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Info className="size-4" />
                        <span>通知设置</span>
                      </div>
                      <ChevronDown className={cn("size-3 transition-transform", showNotifications && "rotate-180")} />
                    </button>

                    {/* 通知设置展开内容 */}
                    <AnimatePresence>
                      {showNotifications && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 ml-2 p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-lg space-y-2">
                            <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-950 rounded border border-slate-100 dark:border-zinc-800">
                              <span className="text-[9px] font-bold text-foreground">邮件通知</span>
                              <Switch size="small" defaultChecked />
                            </div>
                            <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-950 rounded border border-slate-100 dark:border-zinc-800">
                              <span className="text-[9px] font-bold text-foreground">短信通知</span>
                              <Switch size="small" />
                            </div>
                            <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-950 rounded border border-slate-100 dark:border-zinc-800">
                              <span className="text-[9px] font-bold text-foreground">推送通知</span>
                              <Switch size="small" defaultChecked />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

            </div>

            {/* Bottom 帮助中心 */}
            {!sidebarCollapsed && (
              <div className="pt-4 border-t border-slate-100 dark:border-zinc-900">
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 transition-colors">
                  <HelpCircle className="size-4" />
                  <span>帮助中心</span>
                </button>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/*                   右侧主工作面板 + 右看板                 */}
          {/* ======================================================== */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col xl:flex-row gap-6 p-6 max-w-[1240px] mx-auto w-full">
              
              {/* 中间主控制面板 */}
              <div className="flex-1 min-w-0">
                {/* 设备连接状态提示 */}
                {!connectionStatus.connected && (
                  <Alert
                    type="warning"
                    showIcon
                    banner
                    message="设备离线"
                    description="当前未连接到设备服务器，部分控制功能可能不可用。请检查网络连接或设备状态。"
                    className="mb-4 rounded-xl"
                    closable
                  />
                )}

                <AnimatePresence mode="wait">
                  
                  {/* ======================================================== */}
                  {/*               Tab 1: 设备总览视图 (一比一复刻)             */}
                  {/* ======================================================== */}
                  {activeSubTab === 'overview' && (
                    <motion.div
                      key="overview"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      {/* 设备总览头部 */}
                      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
                        <div>
                          <h1 className="text-lg font-black text-foreground">设备总览</h1>
                          <p className="text-xs text-muted-foreground mt-0.5">实时控制和监控温室设备运行状态</p>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-950 p-1 rounded-xl">
                          <button className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 shadow-sm border border-slate-100 dark:border-zinc-800 text-xs font-bold text-[#19a15f] flex items-center gap-1">
                            <AppstoreOutlined />
                            <span>卡片视图</span>
                          </button>
                          <button className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1">
                            <UnorderedListOutlined />
                            <span>列表视图</span>
                          </button>
                        </div>
                      </div>

                      {/* 4个继电器开关卡片 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          { key: 5, title: "水泵 (Relay 5)", icon: Droplets, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
                          { key: 6, title: "风扇 (Relay 6)", icon: Fan, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20" },
                          { key: 7, title: "植物全光谱补光灯 (Relay 7)", icon: Lightbulb, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20" },
                          { key: 8, title: "光照植物补光灯 (Relay 8)", icon: Sun, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/20" },
                        ].map((dev) => {
                          const isActive = (deviceData?.[`relay${dev.key}` as keyof typeof deviceData] as number || 0) === 1
                          const DevIcon = dev.icon

                          return (
                            <div
                              key={dev.key}
                              className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 p-5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col justify-between min-h-[160px]"
                            >
                              <div className="flex justify-between items-start">
                                <div className={cn("size-9 rounded-xl flex items-center justify-center shrink-0", dev.bg, dev.color)}>
                                  <DevIcon className="size-5" />
                                </div>
                                <span className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                  connectionStatus.connected 
                                    ? "text-emerald-500 bg-[#e6f7ef] dark:bg-[#112d1f]" 
                                    : "text-red-500 bg-red-50 dark:bg-red-950/30"
                                )}>· {connectionStatus.connected ? '在线' : '离线'}</span>
                              </div>

                              <div className="mt-4">
                                <h3 className="font-extrabold text-sm text-foreground tracking-tight">{dev.title}</h3>
                                <span className="text-[10px] text-muted-foreground block mt-0.5">设备控制</span>
                              </div>

                              <div className="flex justify-between items-center pt-3 border-t border-slate-50 dark:border-zinc-800/40 mt-3">
                                <DevIcon className={cn("size-6 opacity-45", isActive && dev.color)} />
                                <Switch
                                  checked={isActive}
                                  onChange={() => handleRelayToggle(dev.key)}
                                  disabled={!connectionStatus.connected || controlStatus.loading}
                                  loading={controlStatus.loading}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* 补光颜色调色板 */}
                      <div className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.01)] space-y-4">
                        <div className="flex justify-between items-center">
                          <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                            <span>补光灯颜色控制</span>
                            <span className="text-[10px] text-slate-400 font-normal bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">RGB 控制 (LED 1-3)</span>
                          </h2>
                          {/* LED 同步状态指示 */}
                          <div className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium",
                            syncStatus === 'synced' && "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20",
                            syncStatus === 'syncing' && "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20",
                            syncStatus === 'error' && "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/20"
                          )}>
                            {syncStatus === 'synced' && <CheckCircle2 className="size-3" />}
                            {syncStatus === 'syncing' && <RefreshCw className="size-3 animate-spin" />}
                            {syncStatus === 'error' && <AlertCircle className="size-3" />}
                            <span>
                              {syncStatus === 'synced' && '已同步'}
                              {syncStatus === 'syncing' && '同步中...'}
                              {syncStatus === 'error' && '同步失败'}
                            </span>
                          </div>
                        </div>

                        <Row gutter={[24, 24]} align="middle">
                          {/* 左：画布调色 */}
                          <Col xs={24} md={10}>
                            <ColorPickerCanvas r={r} g={g} b={b} onChange={handleCanvasColorChange} />
                          </Col>

                          {/* 右：通道参数调节 */}
                          <Col xs={24} md={14} className="space-y-4">
                            {[
                              { label: "红色 (LED 1)", val: r, onChange: handleRChange, color: "#ef4444" },
                              { label: "绿色 (LED 2)", val: g, onChange: handleGChange, color: "#10b981" },
                              { label: "蓝色 (LED 3)", val: b, onChange: handleBChange, color: "#6366f1" },
                            ].map((item) => (
                              <div key={item.label} className="grid grid-cols-12 gap-3 items-center">
                                <span className="col-span-3 text-xs font-bold text-slate-600 dark:text-zinc-400">{item.label}</span>
                                <Slider
                                  min={0}
                                  max={255}
                                  value={item.val}
                                  onChange={item.onChange}
                                  className="col-span-8 my-0 shrink-0"
                                  styles={{
                                    track: { background: item.color },
                                    handle: { borderColor: item.color, backgroundColor: item.color }
                                  }}
                                />
                                <span className="col-span-1 font-mono text-xs text-right text-slate-400 font-bold">{item.val}</span>
                              </div>
                            ))}

                            <div className="grid grid-cols-12 gap-3 items-center">
                              <span className="col-span-3 text-xs font-bold text-slate-600 dark:text-zinc-400">亮度 (占比)</span>
                              <Slider
                                min={0}
                                max={255}
                                value={w}
                                onChange={handleWChange}
                                className="col-span-8 my-0"
                              />
                              <span className="col-span-1 font-mono text-xs text-right text-slate-400 font-bold">{Math.round((w / 255) * 100)}%</span>
                            </div>

                            <div className="flex justify-end pt-2">
                              <Button
                                type="primary"
                                className="bg-[#19a15f] hover:bg-[#15874f] border-0 text-white rounded-lg px-6"
                                onClick={() => triggerLEDUpdate(b, r, g, w)}
                              >
                                更新 LED 亮度
                              </Button>
                            </div>
                          </Col>
                        </Row>
                      </div>

                    </motion.div>
                  )}

                  {/* ======================================================== */}
                  {/*               Tab 2: 设备控制视图 (一比一复刻)             */}
                  {/* ======================================================== */}
                  {activeSubTab === 'control' && (
                    <motion.div
                      key="control"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      {/* 核心卡片 */}
                      <div className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.01)] space-y-6">
                        
                        {/* 摄像头云台卡片头部 */}
                        <div className="flex justify-between items-center">
                          <div>
                            <h1 className="text-lg font-black text-foreground flex items-center gap-2">
                              <span>摄像头云台</span>
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                connectionStatus.connected 
                                  ? "text-emerald-500 bg-[#e6f7ef] dark:bg-[#112d1f]" 
                                  : "text-red-500 bg-red-50 dark:bg-red-950/30"
                              )}>· {connectionStatus.connected ? '在线' : '离线'}</span>
                            </h1>
                            <p className="text-xs text-muted-foreground mt-0.5">步进电机控制 (700mm 量程)</p>
                          </div>
                        </div>

                        {/* 中间布局：左边流媒体视频，右边操作面板 */}
                        <Row gutter={[24, 24]}>
                          
                          {/* 左边：实时监控画面 */}
                          <Col xs={24} md={10}>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-500 block">实时预览</span>
                                <div className="flex items-center gap-2">
                                  {/* 摄像头切换器 */}
                                  <div className="flex gap-1 bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-lg">
                                    {cameras.map((cam) => (
                                      <button
                                        key={cam.id}
                                        onClick={() => setSelectedCameraId(cam.id)}
                                        disabled={loadingCameras}
                                        className={cn(
                                          "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                                          selectedCameraId === cam.id
                                            ? "bg-white dark:bg-zinc-900 text-[#19a15f] shadow-sm"
                                            : "text-slate-500 hover:text-slate-700",
                                          loadingCameras && "opacity-50 cursor-not-allowed"
                                        )}
                                      >
                                        {cam.name.includes('A') ? 'CAM-A' : 'CAM-B'}
                                      </button>
                                    ))}
                                  </div>
                                  {/* 刷新按钮 */}
                                  <button
                                    onClick={fetchCameras}
                                    disabled={loadingCameras}
                                    className="p-1 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-[#19a15f] hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all disabled:opacity-50"
                                    title="刷新摄像头配置"
                                  >
                                    <RefreshCw className={cn("size-3", loadingCameras && "animate-spin")} />
                                  </button>
                                </div>
                              </div>

                              {/* 当前摄像头信息 */}
                              <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 dark:bg-zinc-900/40 rounded-lg">
                                <Video className={cn("size-3", selectedCamera?.url ? "text-emerald-500" : "text-slate-400")} />
                                <span className="text-[9px] font-medium text-slate-600 dark:text-slate-400">
                                  {selectedCamera?.name || '未选择'}
                                  {!selectedCamera?.url && ' (未配置)'}
                                </span>
                              </div>

                              <div
                                ref={videoContainerRef}
                                className={cn(
                                  "relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-slate-100 dark:border-zinc-800",
                                  isFullscreen && "rounded-none border-0"
                                )}
                              >
                                {selectedCamera?.url ? (
                                  <>
                                    <LiveStreamPlayer
                                      sources={cameraPlayerSources}
                                      className="w-full h-full object-cover"
                                      autoplay
                                      muted
                                      controls={false}
                                    />
                                    {/* 视频加载指示器 */}
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
                                      <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                                        <span className="text-[9px] text-white font-medium">实时监控中</span>
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-700">
                                    <Signal className="size-5 animate-pulse mb-2" />
                                    <span className="text-[10px] font-medium">CCTV 未连接或离线</span>
                                    <span className="text-[8px] text-slate-500 mt-1">请先在系统设置中配置摄像头 URL</span>
                                  </div>
                                )}

                                <div className={cn(
                                  "absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] text-white font-bold select-none transition-colors",
                                  selectedCamera?.url ? "bg-[#19a15f]/80" : "bg-red-500/80"
                                )}>
                                  {selectedCamera?.url ? '● 在线' : '● 离线'}
                                </div>

                                {/* 底部 overlay buttons */}
                                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => {
                                        if (!selectedCamera?.url) {
                                          message.warning('摄像头未连接')
                                          return
                                        }
                                        message.info('截图功能开发中...')
                                      }}
                                      className="p-1 rounded bg-black/40 text-white/80 hover:text-white hover:bg-black/60 transition-all"
                                      title="截图"
                                    >
                                      <Camera className="size-3" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (!selectedCamera?.url) {
                                          message.warning('摄像头未连接')
                                          return
                                        }
                                        message.info('录像功能开发中...')
                                      }}
                                      className="p-1 rounded bg-black/40 text-white/80 hover:text-white hover:bg-black/60 transition-all"
                                      title="录像"
                                    >
                                      <Video className="size-3" />
                                    </button>
                                  </div>
                                  <button
                                    onClick={toggleFullscreen}
                                    className="p-1 rounded bg-black/40 text-white/80 hover:text-white hover:bg-black/60 transition-all"
                                    title={isFullscreen ? "退出全屏" : "全屏"}
                                  >
                                    {isFullscreen ? <Minimize2 className="size-3" /> : <Maximize2 className="size-3" />}
                                  </button>
                                </div>

                                {/* 全屏模式 - 沉浸式控制界面 */}
                                {isFullscreen && (
                                  <div className="absolute inset-0 z-50 flex">
                                    {/* 左侧：全屏视频区域 */}
                                    <div className="flex-1 relative bg-gradient-to-br from-zinc-950 via-black to-zinc-900">
                                      {/* 视频内容 */}
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        {selectedCamera?.url ? (
                                          <LiveStreamPlayer
                                            sources={cameraPlayerSources}
                                            className="w-full h-full object-cover"
                                            autoplay
                                            muted
                                            controls={false}
                                          />
                                        ) : (
                                          <div className="flex flex-col items-center justify-center text-zinc-600">
                                            <Signal className="size-12 animate-pulse mb-3" />
                                            <span className="text-sm font-medium">摄像头未连接</span>
                                            <span className="text-xs text-zinc-500 mt-1">请配置摄像头 URL</span>
                                          </div>
                                        )}
                                      </div>

                                      {/* 左上角状态信息 */}
                                      <div className="absolute top-6 left-6 flex items-center gap-4">
                                        <div className="flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 px-4 py-2.5 rounded-xl shadow-lg">
                                          <div
                                            className="size-2.5 rounded-full animate-pulse"
                                            style={{ backgroundColor: selectedCamera?.url ? token.colorSuccess : token.colorError }}
                                          />
                                          <span className="text-white/90 font-semibold text-sm">{selectedCamera?.name || '未选择'}</span>
                                          <span style={{ color: token.colorSuccess }} className="text-xs font-mono tracking-wider">LIVE</span>
                                        </div>

                                        {/* 摄像头切换 */}
                                        <div className="flex gap-1.5 bg-white/5 backdrop-blur-xl border border-white/10 p-1.5 rounded-xl">
                                          {cameras.map((cam) => (
                                            <button
                                              key={cam.id}
                                              onClick={() => setSelectedCameraId(cam.id)}
                                              style={{
                                                backgroundColor: selectedCameraId === cam.id ? token.colorPrimary : 'transparent',
                                                color: selectedCameraId === cam.id ? '#fff' : 'rgba(255,255,255,0.6)',
                                              }}
                                              className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                                                selectedCameraId !== cam.id && "hover:text-white hover:bg-white/10"
                                              )}
                                            >
                                              {cam.name.includes('A') ? 'A' : 'B'}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      {/* 左下角提示 */}
                                      <div className="absolute bottom-6 left-6 text-white/40 text-xs font-medium">
                                        按 ESC 退出全屏
                                      </div>
                                    </div>

                                    {/* 右侧：玻璃态控制面板 */}
                                    <div className="w-[340px] bg-gradient-to-b from-white/8 via-white/5 to-white/3 backdrop-blur-2xl border-l border-white/10 flex flex-col shadow-2xl">
                                      {/* 面板头部 */}
                                      <div className="p-6 border-b border-white/10">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <h2 className="text-white font-bold text-base">云台控制</h2>
                                            <p className="text-white/50 text-xs mt-0.5">700mm 行程范围</p>
                                          </div>
                                          <button
                                            onClick={toggleFullscreen}
                                            style={{
                                              backgroundColor: 'rgba(255,255,255,0.1)',
                                              borderColor: 'rgba(255,255,255,0.1)',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = token.colorError}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                                            className="size-9 rounded-xl text-white/70 hover:text-white flex items-center justify-center transition-all duration-200 backdrop-blur-sm border"
                                            title="退出全屏"
                                          >
                                            <Minimize2 className="size-4" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* 位置信息卡片 */}
                                      <div className="px-6 py-5">
                                        <div
                                          className="backdrop-blur-xl rounded-2xl p-5"
                                          style={{
                                            background: `linear-gradient(to bottom right, ${token.colorPrimary}20, ${token.colorPrimary}08)`,
                                            borderColor: `${token.colorPrimary}40`,
                                          }}
                                        >
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <span className="text-white/60 text-xs font-medium block">当前位置</span>
                                              <div className="flex items-baseline gap-1 mt-1">
                                                <span style={{ color: token.colorPrimary }} className="font-black text-2xl font-mono tracking-tight">{systemStats.stepperPosition}</span>
                                                <span className="text-white/50 text-sm font-medium">mm</span>
                                              </div>
                                            </div>
                                            <div
                                              className="size-12 rounded-xl flex items-center justify-center"
                                              style={{
                                                backgroundColor: `${token.colorPrimary}20`,
                                                borderColor: `${token.colorPrimary}40`,
                                              }}
                                            >
                                              <Compass style={{ color: token.colorPrimary }} className="size-6" />
                                            </div>
                                          </div>
                                          <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 text-xs">
                                            <span className="text-white/50">脉冲:</span>
                                            <span className="text-white/80 font-mono">{deviceData?.stepper_position || 0} p</span>
                                            <span className="text-white/30 mx-1">|</span>
                                            <span className="text-white/50">方向:</span>
                                            <span style={{ color: deviceData?.stepper_direction === 0 ? 'rgba(255,255,255,0.6)' : token.colorPrimary }} className="font-medium">
                                              {deviceData?.stepper_direction === 0 ? '停止' : deviceData?.stepper_direction === 1 ? '左移' : '右移'}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* 精致罗盘控制器 */}
                                      <div className="px-6 py-4 flex-1 flex flex-col items-center justify-center">
                                        <div className="relative">
                                          {/* 外圈装饰 */}
                                          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-white/5 blur-xl scale-110 opacity-50" />

                                          {/* 主罗盘 */}
                                          <div className="relative size-40 rounded-full bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border-2 border-white/20 shadow-2xl flex items-center justify-center">
                                            {/* 方向刻度 */}
                                            <div className="absolute inset-2 rounded-full border border-white/10" />
                                            <div className="absolute top-3 left-1/2 -translate-x-1/2 text-white/30 text-[8px] font-bold">↑</div>
                                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/30 text-[8px] font-bold">↓</div>

                                            {/* 左按钮 */}
                                            <button
                                              onClick={() => handleStepperControl(1)}
                                              disabled={!connectionStatus.connected || deviceData?.stepper_direction !== 0}
                                              className={cn(
                                                "absolute left-2 size-14 rounded-full flex items-center justify-center transition-all duration-200",
                                                "bg-gradient-to-br from-white/15 to-white/5 border border-white/20",
                                                "disabled:opacity-40 disabled:cursor-not-allowed"
                                              )}
                                              onMouseEnter={(e) => {
                                                if (!e.currentTarget.disabled) {
                                                  e.currentTarget.style.background = `linear-gradient(to bottom right, ${token.colorPrimary}40, ${token.colorPrimary}20)`
                                                  e.currentTarget.style.borderColor = `${token.colorPrimary}50`
                                                }
                                              }}
                                              onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'linear-gradient(to bottom right, rgba(255,255,255,0.15), rgba(255,255,255,0.05))'
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                                              }}
                                            >
                                              <ChevronLeft className="size-7 text-white/80" />
                                            </button>

                                            {/* 右按钮 */}
                                            <button
                                              onClick={() => handleStepperControl(2)}
                                              disabled={!connectionStatus.connected || deviceData?.stepper_direction !== 0}
                                              className={cn(
                                                "absolute right-2 size-14 rounded-full flex items-center justify-center transition-all duration-200",
                                                "bg-gradient-to-br from-white/15 to-white/5 border border-white/20",
                                                "disabled:opacity-40 disabled:cursor-not-allowed"
                                              )}
                                              onMouseEnter={(e) => {
                                                if (!e.currentTarget.disabled) {
                                                  e.currentTarget.style.background = `linear-gradient(to bottom right, ${token.colorPrimary}40, ${token.colorPrimary}20)`
                                                  e.currentTarget.style.borderColor = `${token.colorPrimary}50`
                                                }
                                              }}
                                              onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'linear-gradient(to bottom right, rgba(255,255,255,0.15), rgba(255,255,255,0.05))'
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                                              }}
                                            >
                                              <ChevronRight className="size-7 text-white/80" />
                                            </button>

                                            {/* 中央停止按钮 */}
                                            <button
                                              onClick={() => handleStepperControl(0)}
                                              disabled={!connectionStatus.connected || deviceData?.stepper_direction === 0}
                                              className={cn(
                                                "size-16 rounded-full flex items-center justify-center transition-all duration-200 shadow-xl border-2 border-white/30",
                                                "disabled:opacity-40 disabled:cursor-not-allowed"
                                              )}
                                              style={{
                                                background: `linear-gradient(to bottom right, ${token.colorError}90, ${token.colorError}99)`,
                                              }}
                                            >
                                              <span className="size-4 bg-white rounded-full shadow-inner" />
                                            </button>
                                          </div>
                                        </div>

                                        {/* 移动距离选择 */}
                                        <div className="mt-6 flex gap-2">
                                          {[10, 50, 100].map((mmVal) => {
                                            const isSelected = stepPulses === mmVal * 160
                                            return (
                                              <button
                                                key={mmVal}
                                                onClick={() => setStepPulses(mmVal * 160)}
                                                style={{
                                                  backgroundColor: isSelected ? token.colorPrimary : 'rgba(255,255,255,0.1)',
                                                  borderColor: isSelected ? 'transparent' : 'rgba(255,255,255,0.1)',
                                                  color: isSelected ? '#fff' : 'rgba(255,255,255,0.7)',
                                                }}
                                                className={cn(
                                                  "px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200",
                                                  !isSelected && "hover:bg-white/20 hover:text-white"
                                                )}
                                              >
                                                {mmVal}mm
                                              </button>
                                            )
                                          })}
                                        </div>
                                      </div>

                                      {/* 操作按钮区 */}
                                      <div className="px-6 py-5 border-t border-white/10 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                          <button
                                            onClick={() => {
                                              toggleFullscreen()
                                              setTimeout(() => handleResetStepper(), 300)
                                            }}
                                            disabled={!connectionStatus.connected}
                                            className={cn(
                                              "px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 text-white",
                                              "disabled:opacity-40 disabled:cursor-not-allowed"
                                            )}
                                            style={{
                                              background: `linear-gradient(to right, ${token.colorWarning}80, ${token.colorWarning}99)`,
                                            }}
                                          >
                                            <RotateCcw className="size-4" />
                                            复位
                                          </button>
                                          <button
                                            onClick={() => message.info('预设定位功能')}
                                            disabled={!connectionStatus.connected}
                                            className={cn(
                                              "px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 text-white",
                                              "disabled:opacity-40 disabled:cursor-not-allowed"
                                            )}
                                            style={{
                                              background: `linear-gradient(to right, ${token.colorInfo}80, ${token.colorInfo}99)`,
                                            }}
                                          >
                                            <Target className="size-4" />
                                            预设
                                          </button>
                                        </div>

                                        {/* 工具按钮 */}
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => message.info('截图功能')}
                                            className="flex-1 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs font-medium transition-all duration-200 flex items-center justify-center gap-2 border border-white/10"
                                          >
                                            <Camera className="size-3.5" />
                                            截图
                                          </button>
                                          <button
                                            onClick={() => message.info('录像功能')}
                                            className="flex-1 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs font-medium transition-all duration-200 flex items-center justify-center gap-2 border border-white/10"
                                          >
                                            <Video className="size-3.5" />
                                            录像
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                          </Col>

                          {/* 右边：云台操纵台 */}
                          <Col xs={24} md={14} className="space-y-5">
                            <span className="text-xs font-bold text-slate-500 block">云台控制</span>
                            
                            <Row gutter={[16, 16]} align="middle">
                              {/* 罗盘圆盘 */}
                              <Col span={10} className="flex justify-center">
                                <div className="relative size-28 rounded-full border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/40 flex items-center justify-center shadow-inner">
                                  <button onClick={() => message.info('未启用垂直控制')} className="absolute top-1 text-slate-400 hover:text-[#19a15f]"><ChevronUp className="size-4" /></button>
                                  <button onClick={() => message.info('未启用垂直控制')} className="absolute bottom-1 text-slate-400 hover:text-[#19a15f]"><ChevronDown className="size-4" /></button>
                                  <button onClick={() => handleStepperControl(1)} className="absolute left-1 text-slate-400 hover:text-[#19a15f]"><ChevronLeft className="size-4" /></button>
                                  <button onClick={() => handleStepperControl(2)} className="absolute right-1 text-slate-400 hover:text-[#19a15f]"><ChevronRight className="size-4" /></button>
                                  <button onClick={() => handleStepperControl(0)} className="size-6 rounded-full bg-[#19a15f] border-2 border-white dark:border-zinc-900 flex items-center justify-center shadow-md">
                                    <span className="size-1.5 bg-white rounded-sm" />
                                  </button>
                                </div>
                              </Col>

                              {/* 参数调节与状态 */}
                              <Col span={14} className="space-y-3 text-xs">
                                <div>
                                  <span className="text-slate-400 block text-[10px]">当前位置</span>
                                  <span className="font-bold text-[#19a15f] text-sm font-mono">{systemStats.stepperPosition} mm</span>
                                  <span className="text-slate-400 text-[10px] ml-1.5 font-mono">({deviceData?.stepper_position || 0} p)</span>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  <div>
                                    <span className="text-slate-400 block text-[10px] mb-0.5">复位位置</span>
                                    <span className="font-medium text-[11px] block">最左侧 (0mm)</span>
                                  </div>
                                  <Button size="small" className="rounded-lg text-[10px] px-3 border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800" onClick={handleResetStepper}>复位</Button>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-slate-400 block text-[10px]">单次移动距离</span>
                                  <Slider
                                    min={160}
                                    max={16000}
                                    step={160}
                                    value={stepPulses}
                                    onChange={setStepPulses}
                                    className="my-1.5"
                                  />
                                  <div className="flex gap-1.5 mt-2">
                                    {[10, 50, 100].map((mmVal) => {
                                      const isSel = stepPulses === mmVal * 160
                                      return (
                                        <button
                                          key={mmVal}
                                          onClick={() => setStepPulses(mmVal * 160)}
                                          className={cn(
                                            "px-3 py-1 rounded-full text-[10px] font-bold transition-all",
                                            isSel
                                              ? "bg-[#19a15f] text-white"
                                              : "bg-slate-50 dark:bg-zinc-800 text-slate-500 hover:bg-slate-100"
                                          )}
                                        >
                                          {mmVal}mm
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              </Col>
                            </Row>
                          </Col>

                        </Row>

                        {/* 底排分栏：左边预设位置卡片，右边参数输入 */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-slate-50 dark:border-zinc-800/40">
                          
                          {/* 左边：预设位置 */}
                          <div className="lg:col-span-7 space-y-3">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-extrabold text-slate-600 dark:text-zinc-400">预设位置</span>
                              <button onClick={() => message.info('添加预设位模块暂未集成后端数据库')} className="text-[#19a15f] hover:underline font-bold">+ 添加预设位</button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {[
                                { name: "预设位 1", desc: "左侧 (0mm)", mm: 2.5 },
                                { name: "预设位 2", desc: "中间 (350mm)", mm: 350.0 },
                                { name: "预设位 3", desc: "右侧 (700mm)", mm: 700.0 },
                                { name: "预设位 4", desc: "作业位", mm: 125.0 }
                              ].map((preset) => (
                                <div
                                  key={preset.name}
                                  onClick={() => handlePresetTrigger(preset.name, preset.mm)}
                                  className="p-3 border border-slate-100 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-zinc-950/20 hover:border-emerald-500 cursor-pointer transition-all"
                                >
                                  <div className="flex justify-between items-center text-[10px] font-bold text-foreground">
                                    <span>{preset.name}</span>
                                    <span className="text-[8px] text-slate-400">•••</span>
                                  </div>
                                  <span className="text-[9px] text-muted-foreground block mt-1">{preset.desc}</span>
                                  <span className="text-[10px] text-[#19a15f] font-bold mt-1.5 block flex items-center gap-0.5">
                                    <Compass className="size-3" /> {preset.mm} mm
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 右边：参数预设输入 */}
                          <div className="lg:col-span-5 space-y-3 bg-slate-50/40 dark:bg-zinc-950/15 p-4 rounded-xl border border-slate-100 dark:border-zinc-800">
                            <span className="text-xs font-extrabold text-slate-600 dark:text-zinc-400 block">高级参数预设</span>
                            
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="space-y-1">
                                <span className="text-[9px] text-slate-400 font-bold block">目标脉冲 (node0817)</span>
                                <InputNumber
                                  min={160}
                                  max={112000}
                                  value={presetPulses}
                                  onChange={(v) => setPresetPulses(v || 160)}
                                  className="w-full rounded-lg"
                                  size="small"
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[9px] text-slate-400 font-bold block">速度 (node0803)</span>
                                <InputNumber
                                  min={1000}
                                  max={50000}
                                  value={presetSpeed}
                                  onChange={(v) => setPresetSpeed(v || 10000)}
                                  className="w-full rounded-lg"
                                  size="small"
                                />
                              </div>
                            </div>

                            <Button
                              type="primary"
                              block
                              className="bg-[#19a15f] hover:bg-[#15874f] text-white rounded-lg mt-2 text-xs h-8"
                              onClick={handleStepperPreset}
                              disabled={!connectionStatus.connected}
                            >
                              发送预设参数
                            </Button>
                          </div>

                        </div>

                      </div>

                      {/* 底部的两个温湿度/CO2 传感器 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* 温湿传感器卡片 */}
                        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col justify-between min-h-[140px]">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className="size-8 rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-500 flex items-center justify-center shrink-0">
                                <Thermometer className="size-4" />
                              </div>
                              <div>
                                <h3 className="font-bold text-xs text-foreground">温湿度传感器</h3>
                                <span className="text-[9px] text-slate-400 block font-mono">设备控制</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-[9px] font-bold",
                                connectionStatus.connected 
                                  ? "text-emerald-500" 
                                  : "text-red-500"
                              )}>· {connectionStatus.connected ? '在线' : '离线'}</span>
                              <Switch defaultChecked size="small" />
                            </div>
                          </div>

                          <div className="flex gap-8 mt-4">
                            <div>
                              <span className="text-[9px] text-slate-400 block font-bold">温度</span>
                              <span className="text-lg font-black text-blue-500 font-mono">{greenhouseMetrics.temp} <span className="text-xs font-normal">°C</span></span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 block font-bold">湿度</span>
                              <span className="text-lg font-black text-blue-500 font-mono">{greenhouseMetrics.humidity} <span className="text-xs font-normal">%</span></span>
                            </div>
                          </div>

                          <div className="flex justify-end pt-2 border-t border-slate-50 dark:border-zinc-800/40 mt-3 text-[10px]">
                            <button onClick={() => message.info('数据详情加载中...')} className="text-[#19a15f] hover:underline font-bold flex items-center gap-0.5">
                              <span>查看详情</span>
                              <ArrowRight className="size-3" />
                            </button>
                          </div>
                        </div>

                        {/* CO2 传感器卡片 */}
                        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col justify-between min-h-[140px]">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className="size-8 rounded-full bg-red-50 dark:bg-red-950/20 text-red-500 flex items-center justify-center shrink-0">
                                <Cpu className="size-4" />
                              </div>
                              <div>
                                <h3 className="font-bold text-xs text-foreground">CO₂ 传感器</h3>
                                <span className="text-[9px] text-slate-400 block font-mono">设备控制</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-[9px] font-bold",
                                connectionStatus.connected 
                                  ? "text-emerald-500" 
                                  : "text-red-500"
                              )}>· {connectionStatus.connected ? '在线' : '离线'}</span>
                              <Switch defaultChecked size="small" />
                            </div>
                          </div>

                          <div className="mt-4">
                            <span className="text-[9px] text-slate-400 block font-bold">CO₂ 浓度</span>
                            <span className="text-lg font-black text-red-500 font-mono">{greenhouseMetrics.co2} <span className="text-xs font-normal">ppm</span></span>
                          </div>

                          <div className="flex justify-end pt-2 border-t border-slate-50 dark:border-zinc-800/40 mt-3 text-[10px]">
                            <button onClick={() => message.info('数据详情加载中...')} className="text-[#19a15f] hover:underline font-bold flex items-center gap-0.5">
                              <span>查看详情</span>
                              <ArrowRight className="size-3" />
                            </button>
                          </div>
                        </div>

                      </div>

                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* ======================================================== */}
              {/*                    右侧侧边栏综合看板                      */}
              {/* ======================================================== */}
              <div className="w-full xl:w-[320px] shrink-0 space-y-6 xl:self-start xl:sticky xl:top-6">
                
                {/* 1. 当前地区天气 (截图同款) */}
                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 shadow-[0_4px_20px_rgba(0,0,0,0.01)] space-y-5 select-none">
                  <div>
                    <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">当前地区</h3>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">周六, 6月13日</span>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <div>
                      <div className="text-4xl font-black text-foreground tracking-tight">21<span className="text-xl font-normal align-top">°C</span></div>
                      <span className="text-xs text-slate-400 font-bold mt-1 block">阴</span>
                    </div>
                    <div className="relative size-16 shrink-0 filter drop-shadow-md">
                      {/* 天气云朵插图 */}
                      <CloudSun className="size-16 text-amber-500" />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-3 border-t border-slate-50 dark:border-zinc-800/40">
                    <div className="flex items-center gap-1"><span className="font-bold text-foreground">↑ 最高 26°C</span></div>
                    <div className="flex items-center gap-1"><span className="font-bold text-foreground">↓ 最低 18°C</span></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-50 dark:border-zinc-800/40 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-[#19a15f] flex items-center justify-center shrink-0">
                        <Thermometer className="size-4" />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block font-bold">空气湿度</span>
                        <span className="font-bold text-slate-700 dark:text-zinc-300">82%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-[#19a15f] flex items-center justify-center shrink-0">
                        <Wind className="size-4" />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block font-bold">风速</span>
                        <span className="font-bold text-slate-700 dark:text-zinc-300">10 km/h</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-[#19a15f] flex items-center justify-center shrink-0">
                        <Compass className="size-4" />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block font-bold">大气压强</span>
                        <span className="font-bold text-slate-700 dark:text-zinc-300">101 hPa</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-[#19a15f] flex items-center justify-center shrink-0">
                        <Wind className="size-4" />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block font-bold">风向</span>
                        <span className="font-bold text-slate-700 dark:text-zinc-300">南风</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. 大棚环境参数网格 */}
                <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 shadow-[0_4px_20px_rgba(0,0,0,0.01)] space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">大棚环境参数</h3>
                    <Link href="/monitor" className="text-xs font-bold text-[#19a15f] hover:underline flex items-center gap-0.5">
                      <span>查看详情</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {[
                      { name: "室内温度", val: `${greenhouseMetrics.temp} °C`, icon: Thermometer },
                      { name: "室内湿度", val: `${greenhouseMetrics.humidity} %`, icon: Droplets },
                      { name: "二氧化碳浓度", val: `${greenhouseMetrics.co2} ppm`, icon: Cpu },
                      { name: "光照强度", val: `${greenhouseMetrics.light} lux`, icon: Sun },
                    ].map((metric) => (
                      <div key={metric.name} className="p-3 bg-slate-50 dark:bg-zinc-950/40 rounded-xl border border-slate-50 dark:border-zinc-900/60 flex items-center gap-3">
                        <metric.icon className="size-4 text-[#19a15f] shrink-0" />
                        <div>
                          <span className="text-[9px] text-slate-400 block font-bold">{metric.name}</span>
                          <span className="font-extrabold text-foreground block mt-0.5 font-mono">{metric.val}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      </div>
    </ConfigProvider>
  )
}

// ==================== 静态依赖配置 ====================
const DEVICES_CONFIG_LOCAL = [
  { key: 5, title: "水泵系统", isCritical: true },
  { key: 6, title: "通风风扇", isCritical: false },
  { key: 7, title: "全光谱补光灯", isCritical: false },
  { key: 8, title: "辅助补光灯", isCritical: false },
]