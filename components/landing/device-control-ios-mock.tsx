"use client"

import { useState } from "react"
import Image from "next/image"
import {
  LightBulbIcon,
  SunIcon,
  BeakerIcon,
  CloudIcon,
  FireIcon,
  HomeIcon,
  ChartBarIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  BoltIcon
} from "@heroicons/react/24/outline"
import { HomeIcon as HomeIconSolid } from "@heroicons/react/24/solid"

// --- Components ---

function RoomTabs({ selected, onSelect }: { selected: string; onSelect: (room: string) => void }) {
  const rooms = ["全部", "种植区A", "种植区B", "控制室"]

  return (
    <div className="flex items-center gap-2 overflow-x-auto px-4 py-3 no-scrollbar mask-gradient-right">
      {rooms.map((room) => {
        const isSelected = selected === room
        return (
          <button
            key={room}
            onClick={() => onSelect(room)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-medium transition-all duration-300 ${isSelected
              ? "bg-black text-white shadow-md shadow-black/10"
              : "bg-white text-gray-500 hover:bg-gray-50 border border-gray-100"
              }`}
          >
            {room}
          </button>
        )
      })}
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
    <div className={`relative bg-white rounded-[1.2rem] p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100/50 flex flex-col justify-between h-[100px] transition-all duration-300 group hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] ${className}`}>
      <div className="flex justify-between items-start">
        <div className={`size-8 rounded-full flex items-center justify-center transition-colors duration-300 ${isOn ? 'bg-black text-white' : 'bg-gray-50 text-gray-400'}`}>
          <Icon className="size-4" />
        </div>
        <span className="text-[9px] text-gray-400 font-medium tracking-wide">{room}</span>
      </div>

      <div>
        <h3 className="text-[11px] font-semibold text-gray-900 mb-0.5 tracking-tight">{title}</h3>
        <div className="flex items-center justify-between">
          <span className={`text-[9px] font-medium transition-colors duration-300 ${isOn ? 'text-black' : 'text-gray-400'}`}>
            {subtitle}
          </span>

          {onToggle && (
            <button
              onClick={(e) => { e.stopPropagation(); if (!disabled) onToggle(); }}
              disabled={disabled}
              className={`w-8 h-4.5 rounded-full relative transition-colors duration-300 ${isOn ? 'bg-black' : 'bg-gray-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className={`absolute top-0.5 size-3.5 rounded-full transition-all duration-300 shadow-sm ${isOn ? 'left-[16px] bg-white' : 'left-0.5 bg-white'}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function SliderRow({ label, value, onChange, color, displayValue }: { label: string; value: number; onChange: (v: number) => void; color: string; displayValue?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[8px] text-gray-500 font-medium">{label}</span>
        <span className="text-[10px] font-bold text-gray-900">{displayValue || value}</span>
      </div>
      <input type="range" min={0} max={255} value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="w-full h-1 rounded-full appearance-none cursor-pointer bg-gray-200 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow" style={{ background: `linear-gradient(to right, ${color} 0%, ${color} ${(value / 255) * 100}%, #e5e7eb ${(value / 255) * 100}%, #e5e7eb 100%)` }} />
    </div>
  )
}

export function DeviceControlIOSMock() {
  const [selectedRoom, setSelectedRoom] = useState("全部")
  
  // Mock State
  const [relay5, setRelay5] = useState(0)
  const [relay6, setRelay6] = useState(0)
  const [relay7, setRelay7] = useState(1)
  const [relay8, setRelay8] = useState(1)

  const [r, setR] = useState(255)
  const [g, setG] = useState(120)
  const [b, setB] = useState(100)
  const [w, setW] = useState(200)

  return (
    <div className="w-full h-full bg-[#FAFAFA] overflow-hidden font-sans relative flex flex-col">
      {/* Subtle Gradient Background */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-gray-50 to-transparent pointer-events-none" />

      <div className="relative z-10 flex-1 flex flex-col h-full">
        {/* Header */}
        <div className="px-5 pt-12 pb-4 shrink-0">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-lg font-bold text-gray-900 tracking-tight">我的智能大棚</h1>
                <div className="size-2 rounded-full bg-green-500 animate-pulse" />
              </div>
              <p className="text-[10px] text-gray-400 font-medium">设备运行正常</p>
            </div>
            <div className="relative size-9 rounded-full overflow-hidden border border-gray-100 shadow-sm bg-white p-1.5">
              <Image src="/logo.svg" alt="logo" fill className="object-contain p-1" />
            </div>
          </div>

          {/* Weather Row */}
          <div className="flex justify-between items-center bg-white rounded-2xl p-3 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100/50">
            <div className="flex flex-col items-center flex-1">
              <div className="flex items-center gap-1 text-gray-900 mb-0.5">
                <FireIcon className="size-3.5 text-orange-500" />
                <span className="text-base font-bold tracking-tight">24°C</span>
              </div>
              <span className="text-[9px] text-gray-400 font-medium">室内温度</span>
            </div>

            <div className="w-px h-6 bg-gray-100" />

            <div className="flex flex-col items-center flex-1">
              <div className="flex items-center gap-1 text-gray-900 mb-0.5">
                <BeakerIcon className="size-3.5 text-blue-500" />
                <span className="text-base font-bold tracking-tight">63%</span>
              </div>
              <span className="text-[9px] text-gray-400 font-medium">空气湿度</span>
            </div>

            <div className="w-px h-6 bg-gray-100" />

            <div className="flex flex-col items-center flex-1">
              <div className="flex items-center gap-1 text-gray-900 mb-0.5">
                <SunIcon className="size-3.5 text-yellow-500" />
                <span className="text-base font-bold tracking-tight">良好</span>
              </div>
              <span className="text-[9px] text-gray-400 font-medium">光照强度</span>
            </div>
          </div>
        </div>

        {/* Room Tabs */}
        <div className="shrink-0">
           <RoomTabs selected={selectedRoom} onSelect={setSelectedRoom} />
        </div>

        {/* Device Grid */}
        <div className="flex-1 overflow-y-auto px-5 py-2 no-scrollbar space-y-3 min-h-0">
          <div className="grid grid-cols-2 gap-3 pb-24">

            {/* Relay 5: Water Pump */}
            <DeviceCard
              title="智能水泵"
              subtitle={relay5 === 1 ? "运行中" : "已停止"}
              icon={BeakerIcon}
              isOn={relay5 === 1}
              onToggle={() => setRelay5(prev => prev === 1 ? 0 : 1)}
              room="种植区 A"
            />

            {/* Relay 6: Fan */}
            <DeviceCard
              title="排风系统"
              subtitle={relay6 === 1 ? "高速运行" : "已关闭"}
              icon={ArrowPathIcon}
              isOn={relay6 === 1}
              onToggle={() => setRelay6(prev => prev === 1 ? 0 : 1)}
              room="种植区 B"
            />

            {/* Relay 7: Grow Light */}
            <DeviceCard
              title="植物补光"
              subtitle={relay7 === 1 ? "自动模式" : "手动关闭"}
              icon={BoltIcon}
              isOn={relay7 === 1}
              onToggle={() => setRelay7(prev => prev === 1 ? 0 : 1)}
              room="全区域"
            />

            {/* Relay 8: White Light */}
            <DeviceCard
              title="照明系统"
              subtitle={relay8 === 1 ? "开启" : "关闭"}
              icon={SunIcon}
              isOn={relay8 === 1}
              onToggle={() => setRelay8(prev => prev === 1 ? 0 : 1)}
              room="控制室"
            />

            {/* RGB Control Card */}
            <div className="col-span-2 bg-white rounded-[1.5rem] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100/50">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-7 rounded-full bg-gray-50 flex items-center justify-center text-gray-600">
                    <LightBulbIcon className="size-3.5" />
                  </div>
                  <div>
                    <h3 className="text-[11px] font-bold text-gray-900">光谱调节 (RGB)</h3>
                    <span className="text-[9px] text-gray-400 font-medium">精准控制</span>
                  </div>
                </div>
                <div className="size-5 rounded-full border border-gray-100 shadow-sm" style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }} />
              </div>

              <div className="space-y-2.5">
                <SliderRow label="Red" value={r} onChange={setR} color="#ef4444" />
                <SliderRow label="Green" value={g} onChange={setG} color="#22c55e" />
                <SliderRow label="Blue" value={b} onChange={setB} color="#3b82f6" />
                <div className="pt-0.5">
                    <SliderRow label="Brightness" value={w} onChange={setW} color="#f59e0b" displayValue={`${Math.round((w / 255) * 100)}%`} />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tab Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[80px] bg-white/95 backdrop-blur-md border-t border-gray-100/50 flex justify-around items-start pt-3 pb-8 px-6 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] z-20">
           <div className="flex flex-col items-center gap-1 group cursor-pointer">
              <div className="p-1.5 rounded-xl bg-gray-50 group-hover:bg-gray-100 transition-colors">
                 <HomeIconSolid className="size-4 text-gray-900" />
              </div>
              <span className="text-[9px] font-medium text-gray-900">首页</span>
           </div>
           <div className="flex flex-col items-center gap-1 group cursor-pointer">
              <div className="p-1.5 rounded-xl bg-transparent group-hover:bg-gray-50 transition-colors">
                 <ChartBarIcon className="size-4 text-gray-400 group-hover:text-gray-600" />
              </div>
              <span className="text-[9px] font-medium text-gray-400 group-hover:text-gray-600">数据</span>
           </div>
           <div className="flex flex-col items-center gap-1 group cursor-pointer">
              <div className="p-1.5 rounded-xl bg-transparent group-hover:bg-gray-50 transition-colors">
                 <UserIcon className="size-4 text-gray-400 group-hover:text-gray-600" />
              </div>
              <span className="text-[9px] font-medium text-gray-400 group-hover:text-gray-600">我的</span>
           </div>
        </div>
      </div>
    </div>
  )
}
