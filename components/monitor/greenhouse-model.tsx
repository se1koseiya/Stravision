"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { Suspense, useRef, useMemo, useState, useCallback, useEffect } from "react"
import { Canvas, useThree, useFrame, invalidate } from "@react-three/fiber"
import { OrbitControls, useGLTF, Html } from "@react-three/drei"
import * as THREE from "three"
import { Video, Thermometer, Droplets, Fan, Lightbulb, Sun, X, Plus, Bot, Sparkles, Send, Activity } from "lucide-react"
import { SpectralCard } from "@/components/dashboard/spectral-card"
import { SpectralPopup } from "@/components/monitor/spectral-popup"
import { Skeleton } from "@/components/ui/skeleton"
import type { DeviceData } from "@/lib/hooks/use-device-data"

interface LightState {
  rgbLight: { r: number; g: number; b: number; intensity: number }
  whiteLight: { intensity: number }
}

interface GreenhouseModelProps {
  className?: string
  theme?: "light" | "dark"
  deviceData?: {
    temperature: number
    humidity: number
    relay5: number
    relay6: number
    relay7: number
    relay8: number
    led1?: number
    led2?: number
    led3?: number
    led4?: number
    channel1?: number
    channel2?: number
    channel3?: number
    channel4?: number
    channel5?: number
    channel6?: number
    channel7?: number
    channel8?: number
    channel9?: number
    channel10?: number
    channel11?: number
  } | null
  onToggleRelay?: (relay: 5 | 6 | 7 | 8, current: number) => void
  onUpdateLEDs?: (r: number, g: number, b: number, w: number) => void
  filter?: "all" | "active" | "offline"
  onViewCamera?: (cameraId: string) => void
}

class ModelErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean}> {
  state = { hasError: false }
  
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("3D Model Error:", error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center flex-col gap-4 text-muted-foreground p-8 text-center bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="size-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <p className="font-medium text-foreground">3D 模型加载失败</p>
          <p className="text-sm max-w-xs">网络连接超时或资源无法访问。这不会影响页面的其他功能。</p>
          <button onClick={() => this.setState({ hasError: false })} className="mt-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
            重试加载
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// 设备标记点配置
const DEVICE_MARKERS = [
  { 
    id: "camera-a", 
    type: "camera", 
    label: "摄像头 A",
    position: [-2.5, 1.2, -1.5] as [number, number, number],
    cameraTarget: [-2.5, 1, -1.5] as [number, number, number],
    cameraPosition: [1, 4, 5] as [number, number, number],
    color: "#84cc16",
    icon: Video
  },
  { 
    id: "camera-b", 
    type: "camera", 
    label: "摄像头 B",
    position: [1.5, 1.5, -2] as [number, number, number],
    cameraTarget: [1.5, 1.3, -2] as [number, number, number],
    cameraPosition: [4, 4, 4] as [number, number, number],
    color: "#84cc16",
    icon: Video
  },
  { 
    id: "temp-sensor", 
    type: "sensor", 
    label: "温度传感器",
    position: [0, 0.8, 0] as [number, number, number],
    cameraTarget: [0, 0.6, 0] as [number, number, number],
    cameraPosition: [5, 4, 5] as [number, number, number],
    color: "#a78bfa",
    icon: Thermometer
  },
  { 
    id: "irrigation", 
    type: "control", 
    relay: 5 as const,
    label: "灌溉系统",
    position: [-2, 0.3, 1] as [number, number, number],
    cameraTarget: [-2, 0.2, 1] as [number, number, number],
    cameraPosition: [2, 4, 5] as [number, number, number],
    color: "#38bdf8",
    icon: Droplets
  },
  { 
    id: "ventilation", 
    type: "control", 
    relay: 6 as const,
    label: "通风系统",
    position: [2.5, 0.3, 1.5] as [number, number, number],
    cameraTarget: [2.5, 0.2, 1.5] as [number, number, number],
    cameraPosition: [5, 4, 5] as [number, number, number],
    color: "#38bdf8",
    icon: Fan
  },
  { 
    id: "rgb-light", 
    type: "light-rgb", 
    label: "植物全光谱补光灯",
    position: [-1, 2.2, 0] as [number, number, number],
    cameraTarget: [-1, 2, 0] as [number, number, number],
    cameraPosition: [3, 5, 5] as [number, number, number],
    color: "#f472b6",
    icon: Lightbulb
  },
  { 
    id: "white-light", 
    type: "light-white", 
    label: "光照植物补光灯",
    position: [1, 2.2, 0] as [number, number, number],
    cameraTarget: [1, 2, 0] as [number, number, number],
    cameraPosition: [4, 5, 5] as [number, number, number],
    color: "#fbbf24",
    icon: Sun
  },
  { 
    id: "spectrometer", 
    type: "spectrometer", 
    label: "光谱仪",
    position: [2, 1, -0.5] as [number, number, number],
    cameraTarget: [2, 0.8, -0.5] as [number, number, number],
    cameraPosition: [5, 4, 4] as [number, number, number],
    color: "#ec4899",
    icon: Activity
  },
  { 
    id: "ai-assistant", 
    type: "ai-assistant", 
    label: "莓界AI助手",
    position: [0, 1.8, 2] as [number, number, number],
    cameraTarget: [0, 1.6, 2] as [number, number, number],
    cameraPosition: [3, 5, 7] as [number, number, number],
    color: "#10b981",
    icon: Bot
  },
]

type MarkerType = typeof DEVICE_MARKERS[0]

interface MarkerProps {
  marker: MarkerType
  isSelected: boolean
  onClick: () => void
  isDark: boolean
}

function Marker({ marker, isSelected, onClick, isDark }: MarkerProps) {
  const Icon = marker.icon
  const isAIAssistant = marker.type === "ai-assistant"
  
  return (
    <Html
      position={marker.position}
      center
      distanceFactor={8}
      occlude={false}
      style={{ pointerEvents: "auto" }}
    >
      <button
        onClick={onClick}
        className={`
          group relative flex items-center justify-center
          w-11 h-11 rounded-full cursor-pointer
          backdrop-blur-md border-2
          transition-all duration-300 ease-out
          ${isSelected ? "scale-125 ring-2 ring-white/60" : "hover:scale-110"}
          ${isDark ? "bg-white/15 border-white/30" : "bg-white/70 border-white/80"}
        `}
        style={{ 
          boxShadow: isSelected 
            ? `0 0 24px ${marker.color}90, 0 8px 20px rgba(0,0,0,0.25)` 
            : `0 4px 16px rgba(0,0,0,0.12)`
        }}
      >
        {isAIAssistant ? (
          <img src="/logo.gif" alt="AI" className="w-6 h-6 object-contain" />
        ) : (
          <Icon 
            className="w-5 h-5" 
            style={{ color: marker.color }}
          />
        )}
        <span 
          className={`
            absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full 
            flex items-center justify-center
            backdrop-blur-sm border
            ${isDark ? "bg-white/20 border-white/30" : "bg-white/90 border-white/80"}
          `}
          style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}
        >
          <Plus className={`w-2.5 h-2.5 ${isDark ? "text-white/80" : "text-slate-600"}`} />
        </span>
      </button>
    </Html>
  )
}

interface DeviceCardProps {
  marker: MarkerType
  onClose: () => void
  isDark: boolean
  deviceData?: GreenhouseModelProps["deviceData"]
  onToggleRelay?: GreenhouseModelProps["onToggleRelay"]
  onUpdateLEDs?: GreenhouseModelProps["onUpdateLEDs"]
  onViewCamera?: GreenhouseModelProps["onViewCamera"]
  lightState: LightState
  onLightChange: (state: Partial<LightState>) => void
}

function DeviceCard({ marker, onClose, isDark, deviceData, onToggleRelay, onUpdateLEDs, onViewCamera, lightState, onLightChange }: DeviceCardProps) {
  const Icon = marker.icon
  const isControl = marker.type === "control"
  const relay = "relay" in marker ? marker.relay : undefined
  const isOn = relay && deviceData ? deviceData[`relay${relay}`] === 1 : false

  const cardBg = isDark ? "bg-slate-900/70 border-white/10 text-white" : "bg-white/70 border-white/50 text-slate-900"
  const contentBg = isDark ? "bg-white/5" : "bg-black/5"
  const subText = isDark ? "text-slate-400" : "text-slate-500"

  // Process spectrum data if available
  const spectrumData = useMemo(() => {
    // If no device data at all, return null
    if (!deviceData) return null
    
    // Check if we have any spectral data (non-zero)
    const hasSpectrum = [
      deviceData.channel1, deviceData.channel2, deviceData.channel3,
      deviceData.channel4, deviceData.channel5, deviceData.channel6,
      deviceData.channel7, deviceData.channel8, deviceData.channel9
    ].some(val => val !== undefined && val > 0)

    if (!hasSpectrum) return null

    // Normalize channels (assuming 16-bit raw values, 0-65535)
    // Map to 0-100% for visualization
    const maxVal = Math.max(
      deviceData.channel1 || 0, deviceData.channel2 || 0, deviceData.channel3 || 0, 
      deviceData.channel4 || 0, deviceData.channel5 || 0, deviceData.channel6 || 0, 
      deviceData.channel7 || 0, deviceData.channel8 || 0, deviceData.channel9 || 0
    ) || 1

    const channels = [
      deviceData.channel1 || 0, // 415nm
      deviceData.channel2 || 0, // 445nm
      deviceData.channel3 || 0, // 480nm
      deviceData.channel4 || 0, // 515nm
      deviceData.channel5 || 0, // 555nm
      deviceData.channel6 || 0, // 590nm
      deviceData.channel7 || 0, // 630nm
      deviceData.channel8 || 0, // 680nm (Red)
      deviceData.channel9 || 0, // NIR
    ]

    return channels.map(val => (val / maxVal) * 100)
  }, [deviceData])

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!deviceData?.channel8 || !deviceData?.channel9) return null
    
    // Simple SPAD proxy: NIR / Red ratio
    // SPAD correlates with Chlorophyll content
    // Chlorophyll absorbs Red (680nm) strongly, reflects NIR
    // Higher SPAD -> More Chlorophyll -> More Red absorption -> Lower Red signal -> Higher NIR/Red ratio
    const red = deviceData.channel8 || 1
    const nir = deviceData.channel9 || 1
    const spad = (nir / red) * 10 // Arbitrary scaling factor for display
    
    // Nitrogen correlates with SPAD
    const nitrogen = spad * 0.05 // Simplified correlation
    
    return {
      spad: spad.toFixed(1),
      nitrogen: nitrogen.toFixed(2)
    }
  }, [deviceData])

  if (marker.type === "spectrometer") {
    // Use actual device data only, no mock data
    const spectralData = {
      channel1: deviceData?.channel1,
      channel2: deviceData?.channel2,
      channel3: deviceData?.channel3,
      channel4: deviceData?.channel4,
      channel5: deviceData?.channel5,
      channel6: deviceData?.channel6,
      channel7: deviceData?.channel7,
      channel8: deviceData?.channel8,
      channel9: deviceData?.channel9,
      channel10: deviceData?.channel10,
      channel11: deviceData?.channel11,
    }

    return (
      <Html
        position={[marker.position[0], marker.position[1] + 0.8, marker.position[2]]}
        center
        distanceFactor={6}
        style={{ pointerEvents: "auto" }}
      >
        <div className="relative w-[380px] h-[280px] animate-in fade-in zoom-in-95 duration-300">
          <SpectralPopup data={spectralData} />
          <button 
            onClick={onClose} 
            className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-xs z-10 ${isDark ? "bg-black/20 hover:bg-black/40 text-white" : "bg-black/5 hover:bg-black/10 text-slate-900"}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </Html>
    )
  }

  return (
    <Html
      position={[marker.position[0], marker.position[1] + 0.8, marker.position[2]]}
      center
      distanceFactor={6}
      style={{ pointerEvents: "auto" }}
    >
      <div 
        className={`w-72 p-4 rounded-2xl backdrop-blur-xl border shadow-2xl animate-in fade-in zoom-in-95 duration-300 ${cardBg}`}
        style={{
          boxShadow: isDark 
            ? "0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)" 
            : "0 25px 50px -12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.5)"
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${marker.color}20` }}>
              {marker.type === "ai-assistant" ? (
                <img src="/logo.gif" alt="AI" className="w-6 h-6 object-contain" />
              ) : (
                <Icon className="w-5 h-5" style={{ color: marker.color }} />
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm">{marker.label}</h3>
              <p className={`text-xs ${subText}`}>
                {marker.type === "camera" ? "监控设备" : marker.type === "sensor" ? "传感器" : marker.type === "ai-assistant" ? "智能助手" : marker.type === "spectrometer" ? "光谱分析" : marker.type.startsWith("light") ? "补光设备" : "控制设备"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isDark ? "hover:bg-white/10" : "hover:bg-black/5"}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sensor Content */}
        {marker.type === "sensor" && deviceData && (
          <div className={`p-3 rounded-xl ${contentBg}`}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className={`text-xs ${subText}`}>温度</p>
                <p className="text-lg font-bold">{deviceData.temperature.toFixed(1)}°C</p>
              </div>
              <div>
                <p className={`text-xs ${subText}`}>湿度</p>
                <p className="text-lg font-bold">{deviceData.humidity.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        )}

        {/* Camera Content */}
        {marker.type === "camera" && (
          <div className={`p-3 rounded-xl ${contentBg}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${subText}`}>状态</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-medium">在线</span>
                </div>
              </div>
              <button 
                onClick={() => onViewCamera?.(marker.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isDark ? "bg-white/10 hover:bg-white/15" : "bg-black/5 hover:bg-black/10"}`}
              >
                查看画面
              </button>
            </div>
          </div>
        )}

        {/* Control Content */}
        {isControl && relay && (
          <div className={`p-3 rounded-xl ${contentBg}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${subText}`}>状态</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2 h-2 rounded-full ${isOn ? "bg-emerald-500" : "bg-slate-400"}`} />
                  <span className="text-sm font-medium">{isOn ? "运行中" : "已关闭"}</span>
                </div>
              </div>
              <button 
                onClick={() => onToggleRelay?.(relay, deviceData?.[`relay${relay}`] ?? 0)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${isOn ? "bg-emerald-500" : isDark ? "bg-slate-600" : "bg-slate-300"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${isOn ? "left-[calc(100%-22px)]" : "left-0.5"}`} />
              </button>
            </div>
          </div>
        )}

        {/* RGB Light Content */}
        {marker.type === "light-rgb" && (
          <div className={`p-3 rounded-xl space-y-3 ${contentBg}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${subText}`}>状态</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2 h-2 rounded-full ${deviceData?.relay7 === 1 ? "bg-emerald-500" : "bg-slate-400"}`} />
                  <span className="text-sm font-medium">{deviceData?.relay7 === 1 ? "开启" : "关闭"}</span>
                </div>
              </div>
              <button 
                onClick={() => onToggleRelay?.(7, deviceData?.relay7 ?? 0)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${deviceData?.relay7 === 1 ? "bg-emerald-500" : isDark ? "bg-slate-600" : "bg-slate-300"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${deviceData?.relay7 === 1 ? "left-[calc(100%-22px)]" : "left-0.5"}`} />
              </button>
            </div>

            {/* Color Preview */}
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-lg border border-white/20"
                style={{ backgroundColor: `rgb(${lightState.rgbLight.r}, ${lightState.rgbLight.g}, ${lightState.rgbLight.b})` }}
              />
              <span className={`text-xs font-mono ${subText}`}>
                RGB({lightState.rgbLight.r}, {lightState.rgbLight.g}, {lightState.rgbLight.b})
              </span>
            </div>

            {/* RGB Sliders */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-4 text-xs font-bold text-red-500">R</span>
                <input
                  type="range" min="0" max="255" value={lightState.rgbLight.r}
                  onChange={(e) => onLightChange({ rgbLight: { ...lightState.rgbLight, r: Number(e.target.value) } })}
                  className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, #000, #ff0000)` }}
                />
                <span className="w-8 text-xs text-right">{lightState.rgbLight.r}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 text-xs font-bold text-green-500">G</span>
                <input
                  type="range" min="0" max="255" value={lightState.rgbLight.g}
                  onChange={(e) => onLightChange({ rgbLight: { ...lightState.rgbLight, g: Number(e.target.value) } })}
                  className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, #000, #00ff00)` }}
                />
                <span className="w-8 text-xs text-right">{lightState.rgbLight.g}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 text-xs font-bold text-blue-500">B</span>
                <input
                  type="range" min="0" max="255" value={lightState.rgbLight.b}
                  onChange={(e) => onLightChange({ rgbLight: { ...lightState.rgbLight, b: Number(e.target.value) } })}
                  className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, #000, #0000ff)` }}
                />
                <span className="w-8 text-xs text-right">{lightState.rgbLight.b}</span>
              </div>
            </div>

            {/* Intensity */}
            <div className="flex items-center gap-2">
              <span className={`text-xs ${subText}`}>亮度</span>
              <input
                type="range" min="0" max="100" value={lightState.rgbLight.intensity}
                onChange={(e) => onLightChange({ rgbLight: { ...lightState.rgbLight, intensity: Number(e.target.value) } })}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-slate-600 to-white"
              />
              <span className="w-8 text-xs text-right">{lightState.rgbLight.intensity}%</span>
            </div>

            {/* Update Button */}
            <button
              onClick={() => onUpdateLEDs?.(lightState.rgbLight.r, lightState.rgbLight.g, lightState.rgbLight.b, 0)}
              className={`w-full py-2 rounded-lg text-xs font-medium transition-colors ${
                isDark 
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white" 
                  : "bg-emerald-500 hover:bg-emerald-600 text-white"
              }`}
            >
              更新颜色
            </button>
          </div>
        )}

        {/* White Light Content */}
        {marker.type === "light-white" && (
          <div className={`p-3 rounded-xl space-y-3 ${contentBg}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${subText}`}>状态</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2 h-2 rounded-full ${deviceData?.relay8 === 1 ? "bg-emerald-500" : "bg-slate-400"}`} />
                  <span className="text-sm font-medium">{deviceData?.relay8 === 1 ? "开启" : "关闭"}</span>
                </div>
              </div>
              <button 
                onClick={() => onToggleRelay?.(8, deviceData?.relay8 ?? 0)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${deviceData?.relay8 === 1 ? "bg-emerald-500" : isDark ? "bg-slate-600" : "bg-slate-300"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${deviceData?.relay8 === 1 ? "left-[calc(100%-22px)]" : "left-0.5"}`} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${subText}`}>亮度</span>
              <input
                type="range" min="0" max="100" value={lightState.whiteLight.intensity}
                onChange={(e) => onLightChange({ whiteLight: { ...lightState.whiteLight, intensity: Number(e.target.value) } })}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-slate-600 to-yellow-100"
              />
              <span className="w-8 text-xs text-right">{lightState.whiteLight.intensity}%</span>
            </div>
          </div>
        )}

        {/* AI Assistant Content */}
        {marker.type === "ai-assistant" && (
          <AIAssistantCard 
            isDark={isDark} 
            onClose={onClose} 
            deviceData={deviceData}
            onToggleRelay={onToggleRelay}
            onUpdateLEDs={onUpdateLEDs}
          />
        )}
      </div>
    </Html>
  )
}

// AI 助手小弹窗组件
function AIAssistantCard({ 
  isDark, 
  onClose, 
  deviceData,
  onToggleRelay,
  onUpdateLEDs
}: { 
  isDark: boolean
  onClose: () => void
  deviceData: GreenhouseModelProps["deviceData"]
  onToggleRelay?: GreenhouseModelProps["onToggleRelay"]
  onUpdateLEDs?: GreenhouseModelProps["onUpdateLEDs"]
}) {
  const [message, setMessage] = useState("")
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    { role: "assistant", content: "你好！我是莓界AI助手 🍓 有什么可以帮你的吗？" }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [showDeviceBento, setShowDeviceBento] = useState(false)
  const [showControlBento, setShowControlBento] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const contentBg = isDark ? "bg-white/5" : "bg-black/5"

  // 从 localStorage 获取 AI 设置
  const getAISettings = useCallback(() => {
    if (typeof window === "undefined") return null
    try {
      const settings = localStorage.getItem("ai-settings")
      return settings ? JSON.parse(settings) : null
    } catch {
      return null
    }
  }, [])

  // 解析并执行设备控制命令
  const executeDeviceCommand = useCallback((content: string) => {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      try {
        const cmd = JSON.parse(jsonMatch[1])
        if (cmd.action === "toggle_relay" && cmd.device && onToggleRelay) {
          onToggleRelay(cmd.device as 5 | 6 | 7 | 8, cmd.value === 1 ? 0 : 1)
          return true
        }
        if (cmd.action === "set_led" && onUpdateLEDs) {
          onUpdateLEDs(cmd.r || 0, cmd.g || 0, cmd.b || 0, cmd.w || 0)
          return true
        }
      } catch {}
    }
    return false
  }, [onToggleRelay, onUpdateLEDs])

  // 渲染消息内容（支持 markdown 和特殊标签）
  const renderContent = useCallback((content: string) => {
    // 检测特殊标签
    const hasDeviceBento = /<\s*DEVICE_BENTO/.test(content)
    const hasControlBento = /<\s*CONTROL_BENTO/.test(content)
    
    if (hasDeviceBento && !showDeviceBento) setShowDeviceBento(true)
    if (hasControlBento && !showControlBento) setShowControlBento(true)

    // 清理特殊标签
    let cleanContent = content
      .replace(/<REASONING>[\s\S]*?<\/REASONING>/g, "")
      .replace(/<SOURCES>[\s\S]*?<\/SOURCES>/g, "")
      .replace(/<\s*DEVICE_BENTO\s*(?:>[\s\S]*?(?:<\/\s*DEVICE_BENTO\s*>|$)|(?:\/>))/g, "")
      .replace(/<\s*CONTROL_BENTO\s*(?:>[\s\S]*?(?:<\/\s*CONTROL_BENTO\s*>|$)|(?:\/>))/g, "")
      .replace(/<MONITOR>[\s\S]*?<\/MONITOR>/g, "")
      .replace(/<TASK_LIST>[\s\S]*?<\/TASK_LIST>/g, "")
      .replace(/<CHART[\s\S]*?<\/CHART>/g, "")
      .trim()

    // 简单的 markdown 渲染
    cleanContent = cleanContent
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px]">$1</code>')
      .replace(/\n/g, '<br/>')

    return <span dangerouslySetInnerHTML={{ __html: cleanContent }} />
  }, [showDeviceBento, showControlBento])

  const handleSend = useCallback(async () => {
    if (!message.trim() || isLoading) return
    
    const userMessage = message.trim()
    setMessage("")
    setChatHistory(prev => [...prev, { role: "user", content: userMessage }])
    setIsLoading(true)
    setShowDeviceBento(false)
    setShowControlBento(false)

    try {
      const settings = getAISettings()
      
      if (!settings?.apiKey) {
        setChatHistory(prev => [...prev, { 
          role: "assistant", 
          content: "请先在 AI 助手页面配置 API Key 哦~ 点击上方「打开完整版」进行设置 🔧" 
        }])
        setIsLoading(false)
        return
      }

      // 构建消息历史
      const messages = chatHistory
        .filter(m => m.role === "user" || m.role === "assistant")
        .map(m => ({ role: m.role, content: m.content }))
      messages.push({ role: "user", content: userMessage })

      // 调用真实 API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          apiKey: settings.apiKey,
          apiUrl: settings.apiUrl || "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
          model: settings.model || "qwen-plus",
          systemPrompt: "你是莓界AI助手，一个专业的智慧农业温室助手。请用简洁友好的语言回答问题。当用户询问设备状态时使用<DEVICE_BENTO></DEVICE_BENTO>标签，当用户要求控制设备时使用<CONTROL_BENTO></CONTROL_BENTO>标签并给出JSON控制命令。",
          deviceData,
        }),
      })

      if (!response.ok) {
        throw new Error("API 请求失败")
      }

      // 处理流式响应
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ""

      if (reader) {
        // 先添加一个空的助手消息
        setChatHistory(prev => [...prev, { role: "assistant", content: "" }])

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data:")) {
              const data = line.slice(5).trim()
              if (data === "[DONE]") continue

              try {
                const json = JSON.parse(data)
                const content = json.choices?.[0]?.delta?.content || ""
                if (content) {
                  fullContent += content
                  // 更新最后一条消息
                  setChatHistory(prev => {
                    const newHistory = [...prev]
                    newHistory[newHistory.length - 1] = { role: "assistant", content: fullContent }
                    return newHistory
                  })
                }
              } catch {}
            }
          }
        }

        // 尝试执行设备控制命令
        executeDeviceCommand(fullContent)
      }
    } catch (error) {
      setChatHistory(prev => [...prev, { 
        role: "assistant", 
        content: "抱歉，出了点问题 😅 请稍后再试，或者检查一下网络连接~" 
      }])
    } finally {
      setIsLoading(false)
    }
  }, [message, isLoading, chatHistory, deviceData, getAISettings, executeDeviceCommand])

  // 自动滚动到底部
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatHistory])

  return (
    <div className={`p-3 rounded-xl space-y-3 ${contentBg}`}>
      {/* 状态栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative w-5 h-5">
            <img src="/logo.gif" alt="AI" className="w-full h-full object-contain" />
          </div>
          <span className="text-xs font-medium">在线</span>
        </div>
        <a 
          href="/ai-assistant" 
          className={`text-xs ${isDark ? "text-emerald-400 hover:text-emerald-300" : "text-emerald-600 hover:text-emerald-700"}`}
        >
          打开完整版 →
        </a>
      </div>

      {/* 设备状态卡片 */}
      {showDeviceBento && deviceData && (
        <div className={`p-2 rounded-lg ${isDark ? "bg-slate-800/80" : "bg-white/80"} border ${isDark ? "border-slate-700" : "border-slate-200"}`}>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="flex items-center gap-1.5">
              <Thermometer className="w-3 h-3 text-orange-500" />
              <span>{deviceData.temperature.toFixed(1)}°C</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Droplets className="w-3 h-3 text-blue-500" />
              <span>{deviceData.humidity.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Droplets className="w-3 h-3 text-cyan-500" />
              <span className={deviceData.relay5 === 1 ? "text-emerald-500" : ""}>
                灌溉 {deviceData.relay5 === 1 ? "开" : "关"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Fan className="w-3 h-3 text-indigo-500" />
              <span className={deviceData.relay6 === 1 ? "text-emerald-500" : ""}>
                通风 {deviceData.relay6 === 1 ? "开" : "关"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 设备控制卡片 */}
      {showControlBento && deviceData && (
        <div className={`p-2 rounded-lg ${isDark ? "bg-slate-800/80" : "bg-white/80"} border ${isDark ? "border-slate-700" : "border-slate-200"}`}>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "灌溉", relay: 5 as const, icon: Droplets, color: "text-cyan-500" },
              { label: "通风", relay: 6 as const, icon: Fan, color: "text-indigo-500" },
              { label: "补光", relay: 7 as const, icon: Lightbulb, color: "text-amber-500" },
              { label: "光照植物补光灯", relay: 8 as const, icon: Sun, color: "text-yellow-500" },
            ].map(({ label, relay, icon: Icon, color }) => {
              const isOn = deviceData[`relay${relay}`] === 1
              return (
                <button
                  key={relay}
                  onClick={() => onToggleRelay?.(relay, isOn ? 1 : 0)}
                  className={`flex items-center justify-between p-1.5 rounded-lg text-[10px] transition-colors ${
                    isOn 
                      ? isDark ? "bg-emerald-900/50 border-emerald-700" : "bg-emerald-50 border-emerald-200"
                      : isDark ? "bg-slate-700/50 border-slate-600" : "bg-slate-50 border-slate-200"
                  } border`}
                >
                  <div className="flex items-center gap-1">
                    <Icon className={`w-3 h-3 ${color}`} />
                    <span>{label}</span>
                  </div>
                  <div className={`w-6 h-3 rounded-full transition-colors ${isOn ? "bg-emerald-500" : isDark ? "bg-slate-600" : "bg-slate-300"}`}>
                    <div className={`w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-transform mt-[1px] ${isOn ? "ml-[13px]" : "ml-[1px]"}`} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 聊天区域 */}
      <div 
        ref={chatContainerRef}
        className={`h-28 overflow-y-auto space-y-2 p-2 rounded-lg ${isDark ? "bg-slate-800/50" : "bg-white/50"}`}
      >
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-5 h-5 mr-1.5 flex-shrink-0">
                <img src="/logo.gif" alt="AI" className="w-full h-full object-contain rounded-full" />
              </div>
            )}
            <div className={`max-w-[80%] px-3 py-1.5 rounded-2xl text-xs ${
              msg.role === "user" 
                ? "bg-emerald-500 text-white rounded-br-md" 
                : isDark 
                  ? "bg-slate-700 text-slate-200 rounded-bl-md" 
                  : "bg-slate-200 text-slate-800 rounded-bl-md"
            }`}>
              {msg.role === "assistant" ? renderContent(msg.content) : msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="w-5 h-5 mr-1.5 flex-shrink-0">
              <img src="/logo.gif" alt="AI" className="w-full h-full object-contain rounded-full animate-pulse" />
            </div>
            <div className={`px-3 py-1.5 rounded-2xl rounded-bl-md text-xs ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 输入框 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="问我任何问题..."
          className={`flex-1 px-3 py-2 rounded-xl text-xs border ${
            isDark 
              ? "bg-slate-800 border-slate-600 text-white placeholder:text-slate-500" 
              : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
          }`}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !message.trim()}
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
            message.trim() && !isLoading
              ? "bg-emerald-500 text-white hover:bg-emerald-600"
              : isDark ? "bg-slate-700 text-slate-500" : "bg-slate-200 text-slate-400"
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* 快捷问题 */}
      <div className="flex flex-wrap gap-1.5">
        {["环境状态", "种植建议", "设备检查"].map((q) => (
          <button
            key={q}
            onClick={() => setMessage(q)}
            className={`px-2 py-1 rounded-lg text-[10px] transition-colors ${
              isDark 
                ? "bg-slate-700/50 hover:bg-slate-600/50 text-slate-300" 
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

// 补光灯3D光源
function GrowLights({ lightState, deviceData }: { lightState: LightState; deviceData: GreenhouseModelProps["deviceData"] }) {
  const rgbColor = useMemo(() => {
    const { r, g, b } = lightState.rgbLight
    return new THREE.Color(r / 255, g / 255, b / 255)
  }, [lightState.rgbLight.r, lightState.rgbLight.g, lightState.rgbLight.b])

  const rgbOn = deviceData?.relay7 === 1
  const whiteOn = deviceData?.relay8 === 1

  return (
    <>
      {/* 植物全光谱补光灯 */}
      {rgbOn && (
        <>
          <pointLight
            position={[-1, 2.2, 0]}
            color={rgbColor}
            intensity={lightState.rgbLight.intensity / 20}
            distance={6}
            decay={2}
          />
          <mesh position={[-1, 2.2, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color={rgbColor} />
          </mesh>
        </>
      )}

      {/* 白光补光灯 */}
      {whiteOn && (
        <>
          <pointLight
            position={[1, 2.2, 0]}
            color="#fffaf0"
            intensity={lightState.whiteLight.intensity / 15}
            distance={8}
            decay={2}
          />
          <mesh position={[1, 2.2, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color="#fffaf0" />
          </mesh>
        </>
      )}
    </>
  )
}

// 平滑缓动函数 - easeInOutCubic 提供平滑的加速和减速
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// 摄像机动画控制
function CameraController({ targetPosition, targetLookAt, enabled, animationKey }: { 
  targetPosition: THREE.Vector3 | null
  targetLookAt: THREE.Vector3 | null
  enabled: boolean
  animationKey: number // 用于强制触发新动画
}) {
  const { camera } = useThree()
  const startPosition = useRef(new THREE.Vector3())
  const startLookAt = useRef(new THREE.Vector3(0, 0, 0))
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0))
  const finalTarget = useRef(new THREE.Vector3())
  const finalLookAt = useRef(new THREE.Vector3())
  const animationProgress = useRef(0)
  const animationDuration = 1.8 // 动画持续时间（秒）
  const isAnimating = useRef(false)
  const lastAnimationKey = useRef(-1)

  // 当 animationKey 改变时，强制开始新动画
  useEffect(() => {
    if (enabled && targetPosition && targetLookAt && animationKey !== lastAnimationKey.current) {
      // 从当前位置开始（支持中途切换）
      startPosition.current.copy(camera.position)
      startLookAt.current.copy(currentLookAt.current)
      // 记录目标位置
      finalTarget.current.copy(targetPosition)
      finalLookAt.current.copy(targetLookAt)
      // 重置动画进度
      animationProgress.current = 0
      isAnimating.current = true
      lastAnimationKey.current = animationKey
      // 立即触发一次渲染以启动动画
      invalidate()
    }
  }, [enabled, targetPosition, targetLookAt, animationKey, camera])

  useFrame((_, delta) => {
    if (!isAnimating.current) return
    
    // 更新动画进度
    animationProgress.current += delta / animationDuration
    
    if (animationProgress.current >= 1) {
      animationProgress.current = 1
      isAnimating.current = false
      // 确保最终位置精确
      camera.position.copy(finalTarget.current)
      currentLookAt.current.copy(finalLookAt.current)
      camera.lookAt(currentLookAt.current)
      invalidate()
      return
    }
    
    // 使用缓动函数计算平滑的插值因子
    const easedProgress = easeInOutCubic(animationProgress.current)
    
    // 平滑插值位置
    camera.position.lerpVectors(startPosition.current, finalTarget.current, easedProgress)
    
    // 平滑插值视角目标
    currentLookAt.current.lerpVectors(startLookAt.current, finalLookAt.current, easedProgress)
    camera.lookAt(currentLookAt.current)
    
    invalidate() // 触发重新渲染以继续动画
  })

  return null
}

function Model({ isUglyMode }: { isUglyMode?: boolean }) {
  const { scene } = useGLTF("/3d_model/scene.gltf")

  useMemo(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        if (isUglyMode) {
          // Low poly ugly mode
          mesh.castShadow = false
          mesh.receiveShadow = false
          if (mesh.material instanceof THREE.MeshStandardMaterial) {
            // Flatten material
            mesh.material.envMapIntensity = 0
            mesh.material.roughness = 1
            mesh.material.metalness = 0
            mesh.material.flatShading = true
            // Reduce texture quality if possible
            if (mesh.material.map) {
               mesh.material.map.generateMipmaps = false
               mesh.material.map.minFilter = THREE.NearestFilter
               mesh.material.map.magFilter = THREE.NearestFilter
            }
            mesh.material.needsUpdate = true
          }
        } else {
          // High quality mode
          mesh.castShadow = true
          mesh.receiveShadow = true
          if (mesh.material instanceof THREE.MeshStandardMaterial) {
            // 增强材质的物理属性
            mesh.material.envMapIntensity = 0.6
            mesh.material.roughness = Math.max(0.3, mesh.material.roughness) // 增加粗糙度，减少过亮反射
            mesh.material.metalness = Math.min(0.5, mesh.material.metalness) // 限制金属度
            mesh.material.flatShading = false
            mesh.material.needsUpdate = true
          }
        }
      }
    })
  }, [scene, isUglyMode])

  return <primitive object={scene} scale={0.5} position={[0, -1.5, 0]} />
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#4ade80" wireframe />
    </mesh>
  )
}

function Ground({ isDark }: { isDark: boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <shadowMaterial transparent opacity={isDark ? 0.4 : 0.25} color="#1a1a2e" />
    </mesh>
  )
}

function SceneSetup() {
  const { gl } = useThree()
  useMemo(() => {
    gl.shadowMap.enabled = true
    gl.shadowMap.type = THREE.PCFSoftShadowMap // 使用软阴影，更真实
    gl.outputColorSpace = THREE.SRGBColorSpace
  }, [gl])
  return null
}

// 控制渲染循环的组件
function RenderController() {
  const controlsRef = useRef<any>(null)
  
  useFrame(() => {
    // 只在需要时触发渲染
  })
  
  return null
}

function Scene({ isDark, deviceData, onToggleRelay, onUpdateLEDs, filter = "all", onViewCamera, isUglyMode }: { 
  isDark: boolean
  deviceData: GreenhouseModelProps["deviceData"]
  onToggleRelay: GreenhouseModelProps["onToggleRelay"]
  onUpdateLEDs: GreenhouseModelProps["onUpdateLEDs"]
  filter?: GreenhouseModelProps["filter"]
  onViewCamera?: GreenhouseModelProps["onViewCamera"]
  isUglyMode?: boolean
}) {
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null)

  const filteredMarkers = useMemo(() => {
    if (filter === "all") return DEVICE_MARKERS
    
    return DEVICE_MARKERS.filter(marker => {
      let isActive = false
      if (marker.type === "control" && "relay" in marker && marker.relay) {
        const relayKey = `relay${marker.relay}` as keyof typeof deviceData
        isActive = deviceData?.[relayKey] === 1
      } else if (marker.type === "light-rgb" || marker.type === "light-white") {
        isActive = true 
      } else {
        isActive = true
      }

      return filter === "active" ? isActive : !isActive
    })
  }, [filter, deviceData])

  const [cameraTarget, setCameraTarget] = useState<THREE.Vector3 | null>(null)
  const [cameraLookAt, setCameraLookAt] = useState<THREE.Vector3 | null>(null)
  const [isCameraAnimating, setIsCameraAnimating] = useState(false)
  const [animationKey, setAnimationKey] = useState(0) // 用于强制触发新动画
  const [lightState, setLightState] = useState<LightState>({
    rgbLight: { r: 255, g: 100, b: 200, intensity: 50 },
    whiteLight: { intensity: 70 }
  })
  const controlsRef = useRef<any>(null)
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasInitializedLEDs = useRef(false)

  // 从 deviceData 同步 LED 值
  useEffect(() => {
    if (deviceData && !hasInitializedLEDs.current) {
      const r = deviceData.led1 ?? 255
      const g = deviceData.led2 ?? 100
      const b = deviceData.led3 ?? 200
      if (r > 0 || g > 0 || b > 0) {
        setLightState(prev => ({
          ...prev,
          rgbLight: { ...prev.rgbLight, r, g, b }
        }))
        hasInitializedLEDs.current = true
      }
    }
  }, [deviceData])

  const handleLightChange = useCallback((newState: Partial<LightState>) => {
    setLightState(prev => ({ ...prev, ...newState }))
  }, [])

  const handleMarkerClick = useCallback((marker: MarkerType) => {
    // 清除之前的定时器
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current)
      animationTimeoutRef.current = null
    }

    if (selectedMarker === marker.id) {
      // 点击同一个标记，关闭
      setSelectedMarker(null)
      setIsCameraAnimating(false)
      if (controlsRef.current) controlsRef.current.enabled = true
    } else {
      // 切换到新标记
      setSelectedMarker(marker.id)
      setCameraTarget(new THREE.Vector3(...marker.cameraPosition))
      setCameraLookAt(new THREE.Vector3(...marker.cameraTarget))
      setAnimationKey(prev => prev + 1) // 递增 key 强制触发新动画
      setIsCameraAnimating(true)
      if (controlsRef.current) controlsRef.current.enabled = false
      
      // 动画完成后恢复控制
      animationTimeoutRef.current = setTimeout(() => {
        setIsCameraAnimating(false)
        if (controlsRef.current) {
          controlsRef.current.enabled = true
          controlsRef.current.target.copy(new THREE.Vector3(...marker.cameraTarget))
        }
      }, 2000)
    }
  }, [selectedMarker])

  const handleCloseCard = useCallback(() => setSelectedMarker(null), [])

  return (
    <>
      <SceneSetup />
      <RenderController />
      <CameraController targetPosition={cameraTarget} targetLookAt={cameraLookAt} enabled={isCameraAnimating} animationKey={animationKey} />

      {/* 真实光照系统 - 模拟自然光 */}
      {/* 环境光 - 模拟天空散射光，降低强度让阴影更明显 */}
      <ambientLight intensity={isDark ? 0.15 : 0.25} color={isDark ? "#4a6fa5" : "#e8f0ff"} />
      
      {/* 半球光 - 模拟天空和地面的反射，天空偏蓝，地面偏暖 */}
      <hemisphereLight 
        args={[
          isDark ? "#3d5a80" : "#87ceeb",  // 天空色
          isDark ? "#2d3a4a" : "#8b7355",  // 地面反射色
          isDark ? 0.4 : 0.5
        ]} 
      />
      
      {/* 主光源 - 模拟太阳光，暖色调 */}
      <directionalLight 
        position={[10, 15, 8]} 
        intensity={isDark ? 1.2 : 2.5}
        color={isDark ? "#b8c8e8" : "#fff5e6"}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={35}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.001}
        shadow-normalBias={0.04}
      />
      
      {/* 补光 - 模拟天空散射的蓝色光，填充阴影区域 */}
      <directionalLight 
        position={[-6, 8, -4]} 
        intensity={isDark ? 0.3 : 0.6} 
        color={isDark ? "#6b8cce" : "#b4d4ff"} 
      />
      
      {/* 边缘光 - 从后方打光，增加轮廓感 */}
      <directionalLight 
        position={[-3, 5, -8]} 
        intensity={isDark ? 0.2 : 0.4} 
        color={isDark ? "#8fa8d4" : "#ffeedd"} 
      />

      {/* 补光灯 */}
      <GrowLights lightState={lightState} deviceData={deviceData} />

      <Suspense fallback={<LoadingFallback />}>
        <Model isUglyMode={isUglyMode} />
        <Ground isDark={isDark} />

        {!isUglyMode && filteredMarkers.map((marker) => (
          <Marker key={marker.id} marker={marker} isSelected={selectedMarker === marker.id} onClick={() => handleMarkerClick(marker)} isDark={isDark} />
        ))}

        {!isUglyMode && selectedMarker && (
          <DeviceCard
            marker={DEVICE_MARKERS.find(m => m.id === selectedMarker)!}
            onClose={handleCloseCard}
            isDark={isDark}
            deviceData={deviceData}
            onToggleRelay={onToggleRelay}
            onUpdateLEDs={onUpdateLEDs}
            onViewCamera={onViewCamera}
            lightState={lightState}
            onLightChange={handleLightChange}
          />
        )}
      </Suspense>

      <OrbitControls 
        ref={controlsRef} 
        enablePan 
        enableZoom 
        minDistance={2} 
        maxDistance={20} 
        maxPolarAngle={Math.PI / 2 - 0.05} 
        minPolarAngle={0.1} 
        enableDamping 
        dampingFactor={0.05}
        onChange={() => invalidate()} // 只在控制变化时渲染
      />
    </>
  )
}

export function GreenhouseModel({ className, theme = "light", deviceData, onToggleRelay, onUpdateLEDs, filter = "all", onViewCamera, isUglyMode = false }: GreenhouseModelProps & { isUglyMode?: boolean }) {
  const isDark = theme === "dark"
  const [isVisible, setIsVisible] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  // 页面可见性检测 - 当页面不可见时暂停渲染
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden)
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [])

  // Intersection Observer - 当组件不在视口时暂停渲染
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    )
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Ugly mode completely disables advanced WebGL features
  const glProps = isUglyMode 
    ? { alpha: true, antialias: false, powerPreference: "low-power" as const, precision: "lowp" as const }
    : { 
        alpha: true, 
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: isDark ? 1.1 : 1.3,
        powerPreference: "high-performance" as const,
        precision: "mediump" as const
      }

  return (
    <div ref={containerRef} className={className}>
      <ModelErrorBoundary>
        <Suspense fallback={<Model3DLoadingSkeleton isDark={isDark} />}>
          <Canvas
            camera={{ position: [6, 4, 6], fov: 45 }}
            style={{ background: "transparent" }}
            frameloop={isVisible ? "demand" : "never"}
            gl={glProps}
            shadows={isUglyMode ? false : "soft"}
            dpr={isUglyMode ? 0.5 : [1, 1.5]} // Low res for ugly mode
            performance={{ min: 0.5 }}
          >
            <Scene isDark={isDark} deviceData={deviceData} onToggleRelay={onToggleRelay} onUpdateLEDs={onUpdateLEDs} filter={filter} onViewCamera={onViewCamera} isUglyMode={isUglyMode} />
          </Canvas>
        </Suspense>
      </ModelErrorBoundary>
    </div>
  )
}

// 3D 模型加载骨架屏
function Model3DLoadingSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-xl overflow-hidden">
      {/* Loading Animation */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-4 animate-in fade-in zoom-in-95 duration-500">
          {/* Animated 3D Cube */}
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
              <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-blue-500 rounded-2xl opacity-20" />
            </div>
            <div className="absolute inset-2 animate-pulse">
              <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl opacity-40" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-4xl">🏡</div>
            </div>
          </div>
          
          {/* Loading Text */}
          <div className="space-y-2">
            <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              正在加载 3D 模型...
            </p>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              首次加载可能需要几秒钟
            </p>
          </div>

          {/* Loading Dots */}
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>

      {/* Floating Device Markers Skeleton */}
      <div className="absolute top-4 left-4 animate-pulse">
        <Skeleton className="h-11 w-11 rounded-full" />
      </div>
      <div className="absolute top-1/4 right-8 animate-pulse" style={{ animationDelay: '200ms' }}>
        <Skeleton className="h-11 w-11 rounded-full" />
      </div>
      <div className="absolute bottom-1/4 left-1/3 animate-pulse" style={{ animationDelay: '400ms' }}>
        <Skeleton className="h-11 w-11 rounded-full" />
      </div>
      <div className="absolute bottom-8 right-1/4 animate-pulse" style={{ animationDelay: '600ms' }}>
        <Skeleton className="h-11 w-11 rounded-full" />
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-64">
        <div className="h-1 bg-slate-300 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>
    </div>
  )
}
