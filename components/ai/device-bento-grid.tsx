"use client"

import { useDeviceData } from "@/lib/hooks/use-device-data"
import { cn } from "@/lib/utils"
import { 
  Thermometer, 
  Droplets, 
  Sun, 
  Wind, 
  Activity, 
  Zap, 
  Sprout, 
  Waves
} from "lucide-react"
import { motion } from "framer-motion"

interface MetricCellProps {
  title: string
  value: string | number
  unit: string
  icon: any
  colorClass: string
}

const MetricCell = ({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  colorClass
}: MetricCellProps) => {
  return (
    <div className="bg-white dark:bg-[#1C1C1E] p-4 flex flex-col justify-center min-h-[90px] transition-colors hover:bg-zinc-50 dark:hover:bg-[#242426]">
      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
        <Icon size={14} className={colorClass} strokeWidth={2.5} />
        <span className="text-xs font-medium tracking-wide">{title}</span>
      </div>
      <div className="mt-2.5 flex items-baseline gap-1">
        <h3 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 tabular-nums leading-none">
            {value}
        </h3>
        <span className="text-[11px] text-zinc-400 font-medium">{unit}</span>
      </div>
    </div>
  )
}

export function DeviceBentoGrid() {
  const { deviceData, connectionStatus } = useDeviceData()

  // Mock data for preview if no real data is connected yet, or use 0
  const data = deviceData || {
    temperature: 0,
    humidity: 0,
    light: 0,
    co2: 0,
    earth_temp: 0,
    earth_water: 0,
    earth_ec: 0,
    earth_n: 0,
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-3xl my-4 rounded-xl border border-zinc-200 dark:border-white/10 overflow-hidden shadow-sm font-sans"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-50/80 dark:bg-[#111111]/80 border-b border-zinc-200 dark:border-white/10">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
            <Activity className="size-4 text-blue-500" />
            环境状态概览
        </h2>
        <div className="flex items-center gap-1.5">
            <span className="relative flex size-1.5">
              <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", connectionStatus.connected ? "bg-emerald-500" : "bg-rose-500")}></span>
              <span className={cn("relative inline-flex rounded-full size-1.5", connectionStatus.connected ? "bg-emerald-500" : "bg-rose-500")}></span>
            </span>
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                {connectionStatus.connected ? "设备在线" : "设备离线"}
            </span>
        </div>
      </div>

      {/* Grid with 1px gap creating perfectly sharp borders */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[1px] bg-zinc-200 dark:bg-white/10">
        <MetricCell
          title="空气温度"
          value={data.temperature}
          unit="°C"
          icon={Thermometer}
          colorClass="text-orange-500"
        />
        <MetricCell
          title="空气湿度"
          value={data.humidity}
          unit="%"
          icon={Droplets}
          colorClass="text-blue-500"
        />
        <MetricCell
          title="光照强度"
          value={data.light}
          unit="Lux"
          icon={Sun}
          colorClass="text-amber-500"
        />
        <MetricCell
          title="CO2 浓度"
          value={data.co2}
          unit="ppm"
          icon={Wind}
          colorClass="text-emerald-500"
        />
        <MetricCell
          title="土壤温度"
          value={data.earth_temp}
          unit="°C"
          icon={Thermometer}
          colorClass="text-rose-500"
        />
        <MetricCell
          title="土壤水分"
          value={data.earth_water.toFixed(1)}
          unit="%"
          icon={Waves}
          colorClass="text-cyan-500"
        />
        <MetricCell
          title="土壤 EC"
          value={data.earth_ec}
          unit="μS/cm"
          icon={Zap}
          colorClass="text-purple-500"
        />
        <MetricCell
            title="综合肥力(N)"
            value={data.earth_n}
            unit="mg/kg"
            icon={Sprout}
            colorClass="text-indigo-500"
        />
      </div>
    </motion.div>
  )
}
