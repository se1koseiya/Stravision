"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useDeviceControl } from "@/lib/hooks/use-device-control"
import { useDraggableScroll } from "@/lib/hooks/use-draggable-scroll"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import type { UserPublic } from "@/lib/db/user-service"
import { MobileBackground } from "@/components/mobile-background"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import { motion } from "framer-motion"
import { WeatherCard } from "@/components/weather-card"
import { IconCloudy, IconFire, IconHamburgerButton, IconLight, IconMedicineChest, IconPlus, IconRotate, IconSun, IconThunderbolt } from "@/components/icon";
// --- Components ---

function RoomTabs({ selected, onSelect }: { selected: string; onSelect: (room: string) => void }) {
  const rooms = ["全部设备", "种植区A", "种植区B", "控制室"]

  return (
    <div className="flex items-center gap-3 overflow-x-auto px-4 py-2 no-scrollbar">
      {rooms.map((room) => {
        const isSelected = selected === room
        return (
          <button
            key={room}
            onClick={() => onSelect(room)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-300 ${isSelected
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 scale-105"
              : "bg-white/60 dark:bg-white/5 text-foreground/70 hover:bg-white/80"
              }`}
          >
            {room}
          </button>
        )
      })}
      <button className="flex items-center justify-center p-2 rounded-full bg-white/40 dark:bg-black/20 text-foreground/70">
        <IconHamburgerButton className="size-5" />
      </button>
    </div>
  )
}

function DeviceCard({
  title,
  subtitle,
  icon: Icon,
  isOn,
  onToggle,
  room,
  className = "",
  disabled = false
}: {
  title: string;
  subtitle: string;
  icon: any;
  isOn: boolean;
  onToggle?: () => void;
  room: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className={`relative bg-white/70 dark:bg-[#18181B]/70 backdrop-blur-xl rounded-[2rem] p-5 shadow-sm border border-white/20 dark:border-white/5 flex flex-col justify-between h-[160px] transition-all duration-300 ${className}`}>
      <div className="flex justify-between items-start">
        <div className={`size-12 rounded-full flex items-center justify-center transition-colors duration-300 ${isOn ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
          <Icon className="size-7" />
        </div>
        <span className="text-xs text-zinc-400 font-medium">{room}</span>
      </div>

      <div>
        <h3 className="text-base font-bold text-foreground mb-1">{title}</h3>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium transition-colors duration-300 ${isOn ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>
            {subtitle}
          </span>

          {onToggle && (
            <button
              onClick={(e) => { e.stopPropagation(); if (!disabled) onToggle(); }}
              disabled={disabled}
              className={`w-12 h-7 rounded-full relative transition-colors duration-300 ${isOn ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`absolute top-1 size-5 rounded-full transition-all duration-300 ${isOn ? 'left-[22px] bg-white' : 'left-1 bg-white'}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function SliderRow({ label, value, onChange, color, displayValue }: { label: string; value: number; onChange: (v: number) => void; color: string; displayValue?: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <span className="text-sm font-bold text-foreground">{displayValue || value}</span>
      </div>
      <input type="range" min={0} max={255} value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow" style={{ background: `linear-gradient(to right, ${color} 0%, ${color} ${(value / 255) * 100}%, var(--muted) ${(value / 255) * 100}%, var(--muted) 100%)` }} />
    </div>
  )
}

export default function DeviceControlIOSPage() {
  const { deviceData, connectionStatus } = useDeviceData()
  const { status: controlStatus, toggleRelay, setLEDs } = useDeviceControl()
  const { weatherData } = useWeatherContext()
  const [user, setUser] = useState<UserPublic | null>(null)
  const [selectedRoom, setSelectedRoom] = useState("全部设备")

  const [localR, setLocalR] = useState<number | null>(null)
  const [localG, setLocalG] = useState<number | null>(null)
  const [localB, setLocalB] = useState<number | null>(null)
  const [localW, setLocalW] = useState<number | null>(null)
  const mainScrollRef = useDraggableScroll<HTMLDivElement>()

  useEffect(() => {
    ; (async () => {
      try {
        const res = await fetch("/api/auth/me")
        const data = await res.json()
        if (data?.authenticated && data?.user) setUser(data.user as UserPublic)
      } catch { }
    })()
  }, [])

  const r = (localR ?? deviceData?.led1 ?? 0)
  const g = (localG ?? deviceData?.led2 ?? 0)
  const b = (localB ?? deviceData?.led3 ?? 0)
  const w = (localW ?? deviceData?.led4 ?? 0)

  const handleRelayToggle = async (relayNum: number) => {
    if (!deviceData) return
    const currentState = (deviceData[`relay${relayNum}` as keyof typeof deviceData] as number) || 0
    await toggleRelay(relayNum, currentState)
  }

  const handleLEDUpdate = async () => {
    await setLEDs(r, g, b, w)
  }

  return (
    <div className="min-h-dvh w-full bg-zinc-50 dark:bg-[#09090B] text-foreground font-sans transition-colors duration-500">
      <div className="relative z-10 pb-28 pt-[max(env(safe-area-inset-top),14px)]" data-lenis-prevent>
        {/* Header */}
        <div className="px-5 pb-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-jinbuti)' }}>{user?.username ? `${user.username}的大棚` : '我的大棚'}</h1>
                <div className="flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    {connectionStatus.connected ? '设备在线' : '设备离线'}
                  </span>
                </div>
              </div>
            </div>
            <div className="relative size-16 animate-[breathe_4s_ease-in-out_infinite]">
              <Image src="/logo.png" alt="logo" fill className="object-contain" />
            </div>
          </div>

          {/* Weather Row */}
          <div className="flex justify-between items-center px-2">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-foreground">
                <IconFire className="size-5 text-emerald-500" />
                <span className="text-2xl font-bold">{weatherData?.current?.temp_c ? Math.round(weatherData.current.temp_c) : 24}°C</span>
              </div>
              <span className="text-xs text-zinc-400 mt-1">{weatherData?.location?.name || '上城区'}</span>
            </div>

            <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800" />

            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-foreground">
                <IconMedicineChest className="size-5 text-emerald-500" />
                <span className="text-2xl font-bold">{weatherData?.current?.humidity || 67}%</span>
              </div>
              <span className="text-xs text-zinc-400 mt-1">湿度</span>
            </div>

            <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800" />

            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-foreground">
                <IconThunderbolt className="size-5 text-emerald-500" />
                <span className="text-2xl font-bold">良好</span>
              </div>
              <span className="text-xs text-zinc-400 mt-1">PM2.5</span>
            </div>
          </div>
        </div>

        {/* Room Tabs */}
        <RoomTabs selected={selectedRoom} onSelect={setSelectedRoom} />

        {/* Device Grid */}
        <div className="px-4 py-6" id="mobile-control-grid">
          <div className="grid grid-cols-2 gap-4">

            {/* Relay 5: Water Pump */}
            <DeviceCard
              title="水泵"
              subtitle={deviceData?.relay5 === 1 ? "运行中" : "已停止"}
              icon={IconMedicineChest}
              isOn={deviceData?.relay5 === 1}
              onToggle={() => handleRelayToggle(5)}
              room="种植区"
              disabled={controlStatus.loading || !connectionStatus.connected}
            />

            {/* Relay 6: Fan */}
            <DeviceCard
              title="风扇"
              subtitle={deviceData?.relay6 === 1 ? "运行中" : "已停止"}
              icon={IconRotate}
              isOn={deviceData?.relay6 === 1}
              onToggle={() => handleRelayToggle(6)}
              room="种植区"
              disabled={controlStatus.loading || !connectionStatus.connected}
            />

            {/* Relay 7: Grow Light */}
            <DeviceCard
              title="植物全光谱补光灯"
              subtitle={deviceData?.relay7 === 1 ? "ON" : "OFF"}
              icon={IconThunderbolt}
              isOn={deviceData?.relay7 === 1}
              onToggle={() => handleRelayToggle(7)}
              room="种植区"
              disabled={controlStatus.loading || !connectionStatus.connected}
            />

            {/* Relay 8: White Light */}
            <DeviceCard
              title="光照植物补光灯"
              subtitle={deviceData?.relay8 === 1 ? "ON" : "OFF"}
              icon={IconSun}
              isOn={deviceData?.relay8 === 1}
              onToggle={() => handleRelayToggle(8)}
              room="控制室"
              disabled={controlStatus.loading || !connectionStatus.connected}
            />

            {/* RGB Control Card */}
            <div className="col-span-2 bg-white/70 dark:bg-[#18181B]/70 backdrop-blur-xl rounded-[2rem] p-5 shadow-sm border border-white/20 dark:border-white/5">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                    <IconLight className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground"> 植物全光谱补光灯 </h3>
                    <span className="text-xs text-zinc-400 font-medium">控制室</span>
                  </div>
                </div>
                <div className="w-12 h-6 rounded-full border border-border" style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }} />
              </div>

              <div className="space-y-3">
                <SliderRow label="红色" value={r} onChange={setLocalR} color="#DC2626" />
                <SliderRow label="绿色" value={g} onChange={setLocalG} color="#059669" />
                <SliderRow label="蓝色" value={b} onChange={setLocalB} color="#059669" />
                <SliderRow label="亮度 (占空比)" value={w} onChange={setLocalW} color="#52525B" displayValue={`${Math.round((w / 255) * 100)}%`} />
              </div>

              <div className="flex justify-end mt-4">
                <Button onClick={handleLEDUpdate} disabled={controlStatus.loading || !connectionStatus.connected} size="sm" className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20">
                  {controlStatus.loading ? "..." : "更新颜色"}
                </Button>
              </div>
            </div>

            {/* Sensors (Read Only) */}
            <DeviceCard
              title="温湿度"
              subtitle="传感器"
              icon={IconFire}
              isOn={true}
              room="种植区"
              disabled={true}
            />

            <DeviceCard
              title="CO₂"
              subtitle="传感器"
              icon={IconCloudy}
              isOn={true}
              room="种植区"
              disabled={true}
            />

            {/* Weather Card */}
            <div className="col-span-2 mt-4">
              <WeatherCard deviceData={deviceData} />
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
