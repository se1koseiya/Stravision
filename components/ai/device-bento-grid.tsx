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
  Wifi, 
  WifiOff,
  Leaf,
  Gauge,
  TrendingUp,
  TrendingDown,
  Waves
} from "lucide-react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"

interface MetricCardProps {
  title: string
  value: string | number
  unit: string
  icon: any
  trend?: string
  trendUp?: boolean
  color: {
    bg: string
    text: string
  }
  delay?: number
}

const MetricCard = ({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  trend, 
  trendUp = true,
  color,
  delay = 0 
}: MetricCardProps) => {
  // Generate a smooth bezier path for the sparkline
  const generatePath = () => {
    const seed = title.length
    const points = []
    for (let i = 0; i < 12; i++) {
      points.push(20 + Math.sin(i * 0.8 + seed) * 12 + (Math.random() * 4 - 2))
    }
    
    // Create bezier curve path
    let d = `M0,${points[0]}`
    for (let i = 0; i < points.length - 1; i++) {
      const x0 = i * 10
      const y0 = points[i]
      const x1 = (i + 1) * 10
      const y1 = points[i + 1]
      const cp1x = x0 + (x1 - x0) * 0.5
      const cp1y = y0
      const cp2x = x0 + (x1 - x0) * 0.5
      const cp2y = y1
      d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${x1},${y1}`
    }
    return d
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4, type: "spring", stiffness: 100 }}
    >
      <div className="relative h-full overflow-hidden rounded-[24px] bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 shadow-[0_2px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 group hover:-translate-y-1">
        {/* Background gradient blob */}
        <div className={cn("absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700", color.bg.replace('/10', ''))} />
        
        <div className="p-5 flex flex-col justify-between h-full relative z-10">
          <div className="flex justify-between items-start mb-2">
            <div className={cn("p-2.5 rounded-2xl transition-all duration-300 shadow-sm", color.bg, "group-hover:scale-110")}>
              <Icon size={18} className={cn(color.text)} />
            </div>
            {trend && (
              <div className={cn("flex items-center text-[10px] font-bold px-2 py-1 rounded-full border", 
                trendUp 
                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30" 
                  : "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30"
              )}>
                {trendUp ? <TrendingUp size={10} className="mr-1" /> : <TrendingDown size={10} className="mr-1" />}
                {trend}
              </div>
            )}
          </div>
          
          <div>
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">{title}</p>
            <div className="flex items-end gap-1.5">
              <h3 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 tabular-nums">{value}</h3>
              <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mb-1.5">{unit}</span>
            </div>
          </div>

          {/* Decorative Sparkline */}
          <div className="h-10 mt-3 w-[110%] -ml-[5%] opacity-30 group-hover:opacity-60 transition-opacity duration-500 mask-linear-gradient">
             <svg width="100%" height="100%" viewBox="0 0 110 40" preserveAspectRatio="none" className="overflow-visible">
               <path
                 d={generatePath()}
                 fill="none"
                 stroke="currentColor"
                 strokeWidth="3"
                 strokeLinecap="round"
                 strokeLinejoin="round"
                 className={cn(color.text)}
               />
             </svg>
          </div>
        </div>
      </div>
    </motion.div>
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
    earth_p: 0,
    earth_k: 0,
    relay5: 0,
    relay6: 0,
    relay7: 0,
    relay8: 0,
    led1: 0,
    led2: 0,
    led3: 0,
    led4: 0,
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-2">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="size-5 text-blue-500" />
            实时环境监测
        </h2>
        <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors", 
            connectionStatus.connected 
                ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                : "bg-red-500/10 text-red-600 dark:text-red-400"
        )}>
            <span className="relative flex h-2 w-2">
              <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", connectionStatus.connected ? "bg-green-500" : "bg-red-500")}></span>
              <span className={cn("relative inline-flex rounded-full h-2 w-2", connectionStatus.connected ? "bg-green-500" : "bg-red-500")}></span>
            </span>
            {connectionStatus.connected ? "设备在线" : "设备离线"}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="空气温度"
          value={data.temperature}
          unit="°C"
          icon={Thermometer}
          trend="+1.2%"
          color={{ bg: "bg-orange-500/10", text: "text-orange-500" }}
          delay={0.1}
        />
        <MetricCard
          title="空气湿度"
          value={data.humidity}
          unit="%"
          icon={Droplets}
          trend="-0.5%"
          trendUp={false}
          color={{ bg: "bg-blue-500/10", text: "text-blue-500" }}
          delay={0.2}
        />
        <MetricCard
          title="光照强度"
          value={data.light}
          unit="Lux"
          icon={Sun}
          trend="+5.3%"
          color={{ bg: "bg-amber-500/10", text: "text-amber-500" }}
          delay={0.3}
        />
        <MetricCard
          title="CO2 浓度"
          value={data.co2}
          unit="ppm"
          icon={Wind}
          trend="+2.1%"
          color={{ bg: "bg-emerald-500/10", text: "text-emerald-500" }}
          delay={0.4}
        />

        <MetricCard
          title="土壤温度"
          value={data.earth_temp}
          unit="°C"
          icon={Thermometer}
          trend="+0.2%"
          color={{ bg: "bg-rose-500/10", text: "text-rose-500" }}
          delay={0.5}
        />
        <MetricCard
          title="土壤水分"
          value={data.earth_water.toFixed(1)}
          unit="%"
          icon={Waves}
          trend="+1.8%"
          color={{ bg: "bg-cyan-500/10", text: "text-cyan-500" }}
          delay={0.6}
        />
        <MetricCard
          title="土壤 EC"
          value={data.earth_ec}
          unit="μS/cm"
          icon={Zap}
          trend="-0.8%"
          trendUp={false}
          color={{ bg: "bg-purple-500/10", text: "text-purple-500" }}
          delay={0.7}
        />
        
        {/* Combined NPK Card or separate? Let's do a combined visual for NPK in one slot or split */}
        {/* Given 4 columns, let's put NPK in one "Special" card or spread them. 
            The user wants "Device" tag card. 
            Let's add Nitrogen as representative or average? 
            No, let's use the last slot for a summary or NPK.
            Actually, let's just list Nitrogen for now or maybe "Soil Nutrition"
        */}
        <MetricCard
            title="土壤氮 (N)"
            value={data.earth_n}
            unit="mg/kg"
            icon={Sprout}
            trend="+0.0%"
            color={{ bg: "bg-indigo-500/10", text: "text-indigo-500" }}
            delay={0.8}
        />
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        <MetricCard
            title="土壤磷 (P)"
            value={data.earth_p}
            unit="mg/kg"
            icon={Sprout}
            trend="+0.0%"
            color={{ bg: "bg-pink-500/10", text: "text-pink-500" }}
            delay={0.9}
        />
        <MetricCard
            title="土壤钾 (K)"
            value={data.earth_k}
            unit="mg/kg"
            icon={Sprout}
            trend="+0.0%"
            color={{ bg: "bg-lime-500/10", text: "text-lime-500" }}
            delay={1.0}
        />
        
        {/* Status Card spanning 2 cols */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.4 }}
            className="col-span-2"
        >
            <Card className="h-full border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200">
                <CardContent className="p-5 flex items-center justify-between h-full">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "size-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                            connectionStatus.connected 
                                ? "bg-green-500/10 text-green-500" 
                                : "bg-red-500/10 text-red-500"
                        )}>
                            {connectionStatus.connected ? <Wifi size={24} /> : <WifiOff size={24} />}
                        </div>
                        <div>
                            <div className="font-bold text-lg">系统状态</div>
                            <div className="text-sm text-muted-foreground">
                                {connectionStatus.connected ? "所有传感器正常工作中" : "请检查设备连接"}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex flex-col items-center gap-1">
                                <div className={cn(
                                    "size-3 rounded-full transition-all duration-500",
                                    (data as any)[`led${i}`] 
                                    ? "bg-blue-500 shadow-lg shadow-blue-500/50 scale-110" 
                                    : "bg-slate-200 dark:bg-slate-700"
                                )} />
                                <span className="text-[10px] text-muted-foreground">L{i}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
      </div>
    </div>
  )
}
