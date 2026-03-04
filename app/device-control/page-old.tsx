"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"
import { PageNavigation } from "@/components/page-navigation"
import { Droplet, Lightbulb, Sun, Fan, Thermometer, Wind, CloudSun, LeafIcon, Activity, Edit, Save } from "lucide-react";
import { Settings } from "@/components/animate-ui/icons/settings";
import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import GridLayout from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

function Toggle({ defaultChecked = false, className }: { defaultChecked?: boolean; className?: string }) {
  const [checked, setChecked] = useState(defaultChecked)
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => setChecked(!checked)}
      className={cn(
        "relative w-14 h-8 rounded-full transition-all duration-300 shadow-lg",
        checked ? "bg-gradient-to-r from-blue-500 to-blue-600" : "bg-gray-600/50",
        className
      )}
    >
      <span 
        className={cn(
          "absolute top-1/2 -translate-y-1/2 size-6 rounded-full bg-white transition-all duration-300 shadow-md",
          checked ? "right-1 scale-110" : "left-1"
        )} 
      />
    </button>
  )
}

function DeviceCard({
  title,
  icon,
  gradient,
  children,
  isDraggable = false,
}: {
  title: string
  icon: React.ReactNode
  gradient: string
  children?: React.ReactNode
  isDraggable?: boolean
}) {
  return (
    <Card
      className={cn(
        "relative h-full min-h-[200px] rounded-3xl border border-white/5 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-[#1a2332] to-[#0f1419] group",
        isDraggable && "cursor-move"
      )}
    >
      <div
        className="absolute inset-0 opacity-80 group-hover:opacity-100 transition-opacity"
        style={{ background: gradient }}
      />
      <CardContent className="relative z-10 p-6 h-full flex flex-col justify-between">
        <div className="space-y-3">
          <div className="text-white/90 text-sm font-medium tracking-wide uppercase opacity-80">
            设备控制
          </div>
          <div className="text-white text-3xl font-bold leading-tight">
            {title}
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div className="opacity-80 group-hover:opacity-100 transition-opacity">
            {icon}
          </div>
          {children && (
            <div className="transform group-hover:scale-105 transition-transform">
              {children}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function SliderRow({ label, value, onChange, color }: { label: string; value: number; onChange: (v: number) => void; color: string }) {
  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 bg-[#1a2332]/50 backdrop-blur-sm rounded-lg p-1.5 border border-white/5">
        <div className="flex items-center justify-center min-w-[32px] h-[32px] rounded-md bg-[#0f1419] border border-white/10">
          <span className="text-sm font-bold text-white">{value}</span>
        </div>
        <div className="flex-1 px-1">
          <input
            type="range"
            min={0}
            max={255}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[14px] [&::-webkit-slider-thumb]:h-[14px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:w-[14px] [&::-moz-range-thumb]:h-[14px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:hover:scale-110"
            style={{
              background: `linear-gradient(to right, ${color} 0%, ${color} ${(value/255)*100}%, rgba(255,255,255,0.1) ${(value/255)*100}%, rgba(255,255,255,0.1) 100%)`
            }}
            aria-label={label}
          />
        </div>
        <div className="flex items-center justify-center min-w-[32px] h-[32px] rounded-md bg-[#0f1419] border border-white/10">
          <span className="text-xs font-semibold text-white/50">255</span>
        </div>
      </div>
    </div>
  )
}

export default function DeviceControlPage() {
  const defaultLayout = [
    { i: "pump", x: 0, y: 0, w: 4, h: 2 },
    { i: "growLight", x: 4, y: 0, w: 4, h: 2 },
    { i: "whiteLight", x: 8, y: 0, w: 4, h: 2 },
    { i: "fan", x: 0, y: 2, w: 4, h: 2 },
    { i: "rgbControl", x: 4, y: 2, w: 8, h: 2 },
    { i: "tempSensor", x: 0, y: 4, w: 8, h: 2 },
    { i: "co2Sensor", x: 8, y: 4, w: 4, h: 2 },
  ]

  const [layout, setLayout] = useState(defaultLayout)
  const [isEditMode, setIsEditMode] = useState(false)
  const [r, setR] = useState(0)
  const [g, setG] = useState(0)
  const [b, setB] = useState(0)

  // 从 localStorage 加载布局
  useEffect(() => {
    const savedLayout = localStorage.getItem('device-control-layout')
    if (savedLayout) {
      try {
        const parsed = JSON.parse(savedLayout)
        setTimeout(() => setLayout(parsed), 0)
      } catch (e) {
        console.error('Failed to load layout:', e)
      }
    }
  }, [])



  const onLayoutChange = (newLayout: any) => {
    if (isEditMode) {
      setLayout(newLayout)
    }
  }

  const handleSaveLayout = () => {
    localStorage.setItem('device-control-layout', JSON.stringify(layout))
    setIsEditMode(false)
    alert('布局已保存！')
  }

  const handleEditMode = () => {
    setIsEditMode(!isEditMode)
  }

  return (
    <div className="min-h-screen w-screen h-screen bg-gradient-to-br from-[#0a0e1a] via-[#0E1524] to-[#0a0e1a] text-white">
      <div className="grid grid-rows-[72px_1fr] h-full w-full">
        <div className="relative flex items-center px-8 border-b border-white/5 bg-[#0a0e1a]/50 backdrop-blur-sm">
          <div className="flex items-center gap-4 text-white">
            <Image src="/logo.svg" alt="logo" width={64} height={64} />
            <div className="leading-tight">
              <div className="text-base font-bold tracking-wide">STRAVISION</div>
              <div className="text-xs text-white/60">莓界 · 智慧农业平台</div>
            </div>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
            <PageNavigation />
          </div>
        </div>
        <div className="relative px-8 pb-8 pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-6 h-[calc(100vh-72px-56px)]">
            <div className="relative h-full rounded-3xl bg-gradient-to-br from-[#0f1419] to-[#0a0e14] overflow-hidden border border-white/5 shadow-2xl">
              <div className="h-full p-6 overflow-auto">
              {/* 布局编辑按钮 */}
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                {isEditMode ? (
                  <Button
                    onClick={handleSaveLayout}
                    className="h-9 rounded-full px-5 bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    <Save className="mr-2" size={18} /> 保存布局
                  </Button>
                ) : (
                  <Button
                    onClick={handleEditMode}
                    variant="outline"
                    className="h-9 rounded-full px-5 border-white/20 bg-white/5 hover:bg-white/10 text-white hover:text-white"
                  >
                    <Edit className="mr-2" size={18} /> 编辑布局
                  </Button>
                )}
              </div>

                <GridLayout
                  className="layout"
                  layout={layout}
                  cols={12}
                  rowHeight={80}
                  width={
                    typeof window !== "undefined"
                      ? window.innerWidth * 0.55
                      : 1000
                  }
                  isDraggable={isEditMode}
                  isResizable={isEditMode}
                  onLayoutChange={onLayoutChange}
                  compactType={null}
                  preventCollision={true}
                >
                <div key="pump">
                  <DeviceCard
                    title="水泵"
                    icon={
                      <Droplet className="size-12 text-white" strokeWidth={1.5} />
                    }
                    gradient="radial-gradient(800px 800px at 10% 30%, #0D5EF8 0%, transparent 30%)"
                    isDraggable={isEditMode}
                  >
                    <Toggle defaultChecked />
                  </DeviceCard>
                </div>

                <div key="growLight">
                  <DeviceCard
                    title="补光灯"
                    icon={
                      <Lightbulb
                        className="size-12 text-white"
                        strokeWidth={1.5}
                      />
                    }
                    gradient="radial-gradient(800px 800px at 10% 30%, #F5B700 0%, transparent 30%)"
                    isDraggable={isEditMode}
                  >
                    <Toggle />
                  </DeviceCard>
                </div>

                <div key="whiteLight">
                  <DeviceCard
                    title="白灯"
                    icon={<Sun className="size-12 text-white" strokeWidth={1.5} />}
                    gradient="radial-gradient(800px 800px at 10% 30%, #8A7CF3 0%, transparent 30%)"
                    isDraggable={isEditMode}
                  >
                    <Toggle defaultChecked />
                  </DeviceCard>
                </div>

                <div key="fan">
                  <DeviceCard
                    title="风扇"
                    icon={<Fan className="size-12 text-white" strokeWidth={1.5} />}
                    gradient="radial-gradient(800px 800px at 10% 30%, #60A5FA 0%, transparent 30%)"
                    isDraggable={isEditMode}
                  >
                    <Toggle />
                  </DeviceCard>
                </div>

                <div key="rgbControl">
                  <Card className="relative h-full min-h-[200px] rounded-3xl border border-white/5 overflow-hidden shadow-xl bg-gradient-to-br from-[#1a2332] to-[#0f1419] group hover:shadow-2xl transition-all">
                    <div
                      className="absolute inset-0 opacity-80 group-hover:opacity-100 transition-opacity"
                      style={{
                        background:
                          "radial-gradient(800px 800px at 10% 30%, #4C80FF 0%, transparent 30%)",
                      }}
                    />
                    <CardContent className="relative z-10 p-6 h-full flex items-center justify-between gap-6">
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <div className="text-white/90 text-sm font-medium tracking-wide uppercase opacity-80">
                            RGB 控制
                          </div>
                          <div className="text-white text-3xl font-bold leading-tight">
                            补光灯颜色
                          </div>
                        </div>
                        <div
                          className="w-48 h-24 rounded-xl border border-white/10 shadow-inner transition-colors"
                          style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }}
                        />
                      </div>
                      <div className="space-y-1.5 w-80 flex-shrink-0">
                        <SliderRow
                          label="红色 (R)"
                          value={r}
                          onChange={setR}
                          color="#ef4444"
                        />
                        <SliderRow
                          label="绿色 (G)"
                          value={g}
                          onChange={setG}
                          color="#22c55e"
                        />
                        <SliderRow
                          label="蓝色 (B)"
                          value={b}
                          onChange={setB}
                          color="#3b82f6"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div key="tempSensor">
                  <DeviceCard
                    title="温湿度传感器"
                    icon={
                      <Thermometer
                        className="size-12 text-white"
                        strokeWidth={1.5}
                      />
                    }
                    gradient="radial-gradient(800px 800px at 10% 30%, #A66C54 0%, transparent 30%)"
                    isDraggable={isEditMode}
                  >
                    <Toggle defaultChecked />
                  </DeviceCard>
                </div>

                <div key="co2Sensor">
                  <DeviceCard
                    title="CO₂ 传感器"
                    icon={<Wind className="size-12 text-white" strokeWidth={1.5} />}
                    gradient="radial-gradient(800px 800px at 10% 30%, #9E3E35 0%, transparent 30%)"
                    isDraggable={isEditMode}
                  >
                    <Toggle defaultChecked />
                  </DeviceCard>
                </div>
                </GridLayout>
              </div>
            </div>
            <Card className="h-full rounded-3xl bg-gradient-to-br from-[#0f1419] to-[#0a0e14] border border-white/5 text-white shadow-2xl overflow-auto">
              <CardHeader className="px-6 pt-6 pb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold text-white">环境监测数据</CardTitle>
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30">
                    草莓栽培
                  </Badge>
                </div>
                <Separator className="bg-white/5" />
              </CardHeader>
              <CardContent className="space-y-5 px-6 pb-6">
                <div className="grid grid-cols-3 gap-3">
                  <Card className="rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20 p-4 hover:border-orange-500/40 transition-all">
                    <div className="text-xs text-orange-300/80 font-medium mb-1">温度</div>
                    <div className="text-2xl font-bold text-white">12.1°C</div>
                  </Card>
                  <Card className="rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 p-4 hover:border-blue-500/40 transition-all">
                    <div className="text-xs text-blue-300/80 font-medium mb-1">湿度</div>
                    <div className="text-2xl font-bold text-white">38.9%</div>
                  </Card>
                  <Card className="rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20 p-4 hover:border-yellow-500/40 transition-all">
                    <div className="text-xs text-yellow-300/80 font-medium mb-1">光照</div>
                    <div className="text-2xl font-bold text-white">1000 lux</div>
                  </Card>
                </div>
                <Card className="rounded-xl bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-white/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-white/90">
                        <CloudSun className="size-5" />
                        <span className="font-semibold">温度趋势</span>
                      </div>
                      <Badge variant="outline" className="border-blue-500/30 text-blue-300">21°C</Badge>
                    </div>
                    <svg viewBox="0 0 360 120" className="w-full h-[120px]">
                      <defs>
                        <linearGradient id="wg" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#4C80FF" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#4C80FF" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path d="M0,90 C40,70 70,40 110,55 C150,70 180,30 220,50 C260,70 300,40 340,80" fill="none" stroke="#4C80FF" strokeWidth="2.5" />
                      <path d="M0,90 C40,70 70,40 110,55 C150,70 180,30 220,50 C260,70 300,40 340,80 L340,120 L0,120 Z" fill="url(#wg)" />
                    </svg>
                    <div className="mt-3 grid grid-cols-8 text-center text-xs text-white/60">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i}>12/{i + 1}</div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "室内温度", value: "25.3°C", color: "from-red-500/10 to-red-600/5 border-red-500/20" },
                    { label: "风向", value: "西风向", color: "from-cyan-500/10 to-cyan-600/5 border-cyan-500/20" },
                    { label: "UV指数", value: "中等", color: "from-purple-500/10 to-purple-600/5 border-purple-500/20" },
                    { label: "土壤湿度", value: "25.3%", color: "from-green-500/10 to-green-600/5 border-green-500/20" },
                    { label: "风力", value: "1级", color: "from-sky-500/10 to-sky-600/5 border-sky-500/20" },
                    { label: "气压", value: "581hPa", color: "from-indigo-500/10 to-indigo-600/5 border-indigo-500/20" }
                  ].map((item, i) => (
                    <Card key={i} className={cn("rounded-xl bg-gradient-to-br p-3 hover:scale-105 transition-transform", item.color)}>
                      <div className="text-xs text-white/70 font-medium mb-1">{item.label}</div>
                      <div className="text-base font-bold text-white">{item.value}</div>
                    </Card>
                  ))}
                </div>
                <Card className="rounded-xl bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-white/5 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-white/90 font-semibold">生长阶段</div>
                    <Badge variant="outline" className="border-green-500/30 text-green-300">第3阶段</Badge>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "h-16 rounded-lg grid place-content-center transition-all",
                          i <= 2 
                            ? "bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30" 
                            : "bg-white/5 border border-white/10"
                        )}
                      >
                        <LeafIcon className={cn("size-6", i <= 2 ? "text-green-400" : "text-white/30")} />
                      </div>
                    ))}
                  </div>
                </Card>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}