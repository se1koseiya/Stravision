"use client"

import { useState, useEffect, Suspense, useRef, useMemo } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Canvas, useFrame, extend } from "@react-three/fiber"
import { useGLTF, OrbitControls, PerspectiveCamera, Grid, Center, Sparkles as Sparkles3D, Float, Environment, ContactShadows, Lightformer } from "@react-three/drei"
import * as THREE from "three"
import { useDeviceData, type DeviceData } from "@/lib/hooks/use-device-data"
import { useDeviceControl } from "@/lib/hooks/use-device-control"
import { useWeatherContext } from "@/lib/contexts/weather-context"
import { MobileBackground } from "@/components/mobile-background"
import { toast } from "sonner"
import { 
  Bell, 
  LayoutDashboard,
  Thermometer,
  Power,
  ChevronRight,
  Zap,
  Activity,
  Cpu,
  Sprout,
  Fan,
  Sun,
  Sparkles,
  CheckCircle2,
  Search,
  Lightbulb,
  CloudFog,
  Wind,
  Droplets
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserPublic } from "@/lib/db/user-service"
import { GreetingOrb } from "@/components/greeting-orb"

// --- 3D Components ---

function HolographicModel() {
  const { scene } = useGLTF("/3d_model/hero.glb")
  const modelRef = useRef<THREE.Group>(null)

  // Apply Frosted Glass Material
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.material = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color("#ffffff"), // Pure white
          emissive: new THREE.Color("#000000"),
          roughness: 0.25, // Frosted texture (increased roughness)
          metalness: 0.1,
          transmission: 0.95, // High light transmission
          thickness: 1.5, // Realistic thickness
          transparent: true,
          opacity: 1,
          ior: 1.45, // Standard glass IOR
          side: THREE.DoubleSide,
          clearcoat: 0.8, // Subtle gloss on top of frost
          clearcoatRoughness: 0.1,
          attenuationColor: new THREE.Color("#ffffff"), // No color tint (pure clear/white)
          attenuationDistance: 0.5,
        })
      }
    })
  }, [scene])

  useFrame((state) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += 0.005
    }
  })

  return (
    <group ref={modelRef}>
      <Center>
         <primitive object={scene} scale={3.5} />
      </Center>
    </group>
  )
}

function WeatherCard() {
  const { weatherData } = useWeatherContext()
  
  if (!weatherData) return null

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mx-6 mb-8 mt-4"
    >
       {/* Glass Container */}
       <div className="relative overflow-hidden rounded-[2rem] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.12)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.15)] transition-shadow duration-500">
          {/* Background with blur and gradient */}
          <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/60 dark:border-white/10" />
          
          {/* Animated Background Gradient */}
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-blue-100/80 via-blue-50/20 to-transparent dark:from-blue-500/10 dark:via-blue-500/5 dark:to-transparent opacity-80" />

          <div className="relative z-10">
             {/* Header: Location & Time */}
             <div className="flex justify-between items-start mb-6">
                <div>
                   <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      {weatherData.location.name}
                   </h3>
                   <p className="text-xs text-slate-500 dark:text-slate-400 pl-3.5">
                      {weatherData.location.region} · {weatherData.current.condition.text}
                   </p>
                </div>
                {/* Weather Icon */}
                <div className="size-12">
                   <img src={`https:${weatherData.current.condition.icon}`} alt="weather" className="w-full h-full object-contain drop-shadow-md" />
                </div>
             </div>

             {/* Main Temp */}
             <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter" style={{ fontFamily: 'DingTalkJinBuTi' }}>
                   {Math.round(weatherData.current.temp_c)}
                </span>
                <span className="text-xl font-medium text-slate-500 dark:text-slate-400">°C</span>
             </div>

             {/* Grid Stats */}
             <div className="grid grid-cols-3 gap-2">
                <WeatherStat 
                   icon={CloudFog} 
                   label="湿度" 
                   value={`${weatherData.current.humidity}%`} 
                   delay={0.1}
                />
                <WeatherStat 
                   icon={Wind} 
                   label="风速" 
                   value={`${weatherData.current.wind_kph}km/h`} 
                   delay={0.2}
                />
                <WeatherStat 
                   icon={Sun} 
                   label="UV指数" 
                   value={weatherData.current.uv} 
                   delay={0.3}
                />
             </div>
          </div>
       </div>
    </motion.div>
  )
}

function WeatherStat({ icon: Icon, label, value, delay }: any) {
   return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 + delay }}
        className="bg-white/50 dark:bg-white/5 rounded-xl p-3 flex flex-col items-center justify-center gap-1 backdrop-blur-sm"
      >
         <Icon className="size-4 text-slate-400 dark:text-slate-500 mb-1" />
         <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{value}</span>
         <span className="text-[10px] text-slate-400">{label}</span>
      </motion.div>
   )
}

function Scene3D() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
    </div>
  )
}

// --- UI Components ---

function LShapedStats({ 
  score, 
  scoreLabel, 
  temp, 
  humidity,
  soil,
  co2,
  modelSlot
}: { 
  score: number, 
  scoreLabel: string, 
  temp: string, 
  humidity: string,
  soil: string,
  co2: string,
  modelSlot?: React.ReactNode
}) {
  // SVG Path for a Perfect L-Shape with Smooth Corners
  // Designed on 100x100 grid
  // Left col width: 42%, Bottom row height: 40%
  // Corner Radius: 4%
  // Inner Corner Radius: 4%
  const path = `
    M 0 12
    Q 0 0 12 0
    H 42
    V 54
    Q 42 66 54 66
    H 88
    Q 100 66 100 78
    V 88
    Q 100 100 88 100
    H 12
    Q 0 100 0 88
    Z
  `

  return (
    <div className="relative w-full aspect-[1/1.2]">
      {/* 
        Layer 1: The Glass Body (Background) 
        Placed at z-0
      */}
      <div className="absolute inset-0 z-0 filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.12)]">
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
           <defs>
              <linearGradient id="glass-body" x1="0" y1="0" x2="1" y2="1">
                 <stop offset="0%" stopColor="var(--glass-start, white)" stopOpacity="0.95" />
                 <stop offset="100%" stopColor="var(--glass-end, white)" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="glass-border" x1="0" y1="0" x2="0" y2="1">
                 <stop offset="0%" stopColor="var(--glass-border-start, white)" stopOpacity="1" />
                 <stop offset="100%" stopColor="var(--glass-border-end, white)" stopOpacity="0.2" />
              </linearGradient>
           </defs>
           
           {/* Main Body */}
           <path 
             d={path} 
             fill="url(#glass-body)" 
             className="backdrop-blur-2xl transition-colors duration-500"
             style={{
                // Fallback/Enhancement for glass effect
                filter: 'drop-shadow(0 0 1px rgba(255,255,255,0.5))'
             }}
           />
           
           {/* Border Stroke */}
           <path 
             d={path} 
             fill="none" 
             stroke="url(#glass-border)" 
             strokeWidth="0.8"
             vectorEffect="non-scaling-stroke"
             className="opacity-80 transition-colors duration-500"
           />
        </svg>
      </div>

      {/* 
         Layer 2: 3D Model Slot
         Placed at z-30 to sit ON TOP of everything
      */}
      {modelSlot && (
         <div className="absolute inset-0 z-30 pointer-events-none">
            {modelSlot}
         </div>
      )}

      {/* 
        Layer 3: Content (Text & Icons)
        Placed at z-20 to sit ON TOP of the 3D model if needed, or just nicely on the glass
      */}
      <div className="absolute inset-0 z-20">
        {/* Left Column Content */}
        <div className="absolute left-0 top-0 bottom-0 w-[42%] flex flex-col">
            {/* Environment Score */}
            <div className="flex-1 p-5 flex flex-col justify-between">
               <div className="size-11 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 shadow-[0_8px_16px_rgba(30,41,59,0.35)] flex items-center justify-center text-white ring-[3px] ring-white/40">
                  <Activity className="size-6" />
               </div>
               
               <div className="mt-4">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-tight tracking-tight">环境评分</h3>
                  <p className="text-[11px] mt-1.5 text-slate-500 dark:text-slate-400 font-medium tracking-wide">需多关注</p>
                  
                  <div className="relative mt-2 flex items-baseline gap-0.5 text-slate-700 dark:text-slate-300 font-bold">
                     <span className="text-5xl font-['DingTalkJinBuTi'] tracking-tighter drop-shadow-sm bg-gradient-to-br from-slate-800 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">{score}</span>
                     <span className="text-sm font-medium text-slate-400 mb-1.5">分</span>
                     <ChevronRight className="size-4 text-slate-400 ml-0.5 mb-2" />
                  </div>
               </div>
            </div>

            {/* Divider */}
            <div className="w-[80%] h-[1px] bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent mx-auto opacity-70" />

            {/* Temperature */}
            <div className="h-[35%] flex flex-col justify-center items-center p-2">
               <div className="size-9 rounded-full bg-slate-50 dark:bg-slate-500/10 text-slate-500 flex items-center justify-center mb-1.5 shadow-sm ring-1 ring-slate-100 dark:ring-slate-500/20">
                  <Thermometer className="size-5" />
               </div>
               <div className="text-[11px] text-slate-400 font-medium">空气温度</div>
               <div className="flex items-baseline justify-center gap-0.5 mt-0.5">
                  <span className="text-2xl font-bold text-slate-700 dark:text-slate-100 font-['DingTalkJinBuTi']">{temp}</span>
                  <span className="text-[11px] text-slate-400">°C</span>
               </div>
            </div>
        </div>

        {/* Bottom Right Content: Split into Humidity & Soil/CO2 */}
        <div className="absolute right-0 bottom-0 left-[42%] h-[34%] flex">
            {/* Humidity */}
            <div className="flex-1 border-l border-white/40 dark:border-white/5 flex flex-col justify-center items-center p-2">
               <div className="size-8 rounded-full bg-slate-50 dark:bg-slate-500/10 text-slate-500 flex items-center justify-center mb-1 shadow-sm ring-1 ring-slate-100 dark:ring-slate-500/20">
                  <Droplets className="size-4" />
               </div>
               <div className="text-[10px] text-slate-400 font-medium scale-90">相对湿度</div>
               <div className="flex items-baseline justify-center gap-0.5">
                  <span className="text-xl font-bold text-slate-700 dark:text-slate-100 font-['DingTalkJinBuTi']">{humidity}</span>
                  <span className="text-[10px] text-slate-400">%</span>
               </div>
            </div>

            {/* Soil Moisture */}
            <div className="flex-1 border-l border-white/40 dark:border-white/5 flex flex-col justify-center items-center p-2 bg-slate-50/50 dark:bg-white/5">
               <div className="size-8 rounded-full bg-slate-50 dark:bg-slate-500/10 text-slate-500 flex items-center justify-center mb-1 shadow-sm ring-1 ring-slate-100 dark:ring-slate-500/20">
                  <Sprout className="size-4" />
               </div>
               <div className="text-[10px] text-slate-400 font-medium scale-90">土壤水分</div>
               <div className="flex items-baseline justify-center gap-0.5">
                  <span className="text-xl font-bold text-slate-700 dark:text-slate-100 font-['DingTalkJinBuTi']">{soil}</span>
                  <span className="text-[10px] text-slate-400">%</span>
               </div>
            </div>

             {/* CO2 */}
             <div className="flex-1 border-l border-white/40 dark:border-white/5 flex flex-col justify-center items-center p-2">
               <div className="size-8 rounded-full bg-slate-50 dark:bg-slate-500/10 text-slate-500 flex items-center justify-center mb-1 shadow-sm ring-1 ring-slate-100 dark:ring-slate-500/20">
                  <CloudFog className="size-4" />
               </div>
               <div className="text-[10px] text-slate-400 font-medium scale-90">CO₂浓度</div>
               <div className="flex items-baseline justify-center gap-0.5">
                  <span className="text-xl font-bold text-slate-700 dark:text-slate-100 font-['DingTalkJinBuTi']">{co2}</span>
                  {/* <span className="text-[10px] text-slate-400">ppm</span> */}
               </div>
            </div>
        </div>
      </div>
    </div>
  )
}

function StatusCard({ 
  icon: Icon, 
  title, 
  subtitle, 
  action, 
  highlight = false
}: { 
  icon?: any, 
  title: string, 
  subtitle?: string, 
  action?: string,
  highlight?: boolean
}) {
  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "rounded-[2rem] p-6 flex flex-col justify-between shadow-lg border relative overflow-hidden group transition-all duration-300",
        highlight 
          ? "bg-white dark:bg-[#1e293b] border-blue-100 dark:border-blue-900 shadow-blue-500/10" 
          : "bg-white/90 dark:bg-[#1e293b]/90 border-slate-100 dark:border-slate-800"
      )}
    >
      {highlight && (
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/10 blur-2xl rounded-full" />
      )}

      <div className="flex items-start justify-between relative z-10">
        {Icon && (
          <div className={cn(
            "p-3 rounded-2xl",
            highlight ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
          )}>
            <Icon className="size-6" />
          </div>
        )}
      </div>
      
      <div className="mt-6 relative z-10">
        <h3 className={cn(
          "text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100"
        )}>{title}</h3>
        {subtitle && (
          <p className="text-sm mt-2 text-slate-500 dark:text-slate-400 font-medium">{subtitle}</p>
        )}
        
        {action && (
          <div className={cn(
            "flex items-center gap-1 mt-4 text-sm font-bold",
            highlight ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"
          )}>
            {action} <ChevronRight className="size-4" />
          </div>
        )}
      </div>
    </motion.div>
  )
}

function MiniStatus({ 
  icon: Icon, 
  label, 
  value, 
  unit 
}: { 
  icon: any, 
  label: string, 
  value: string, 
  unit: string 
}) {
  return (
    <div className="flex items-center gap-4 bg-white dark:bg-[#1e293b] rounded-[1.5rem] p-4 shadow-sm border border-slate-100 dark:border-slate-800">
      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-blue-500 dark:text-blue-400">
        <Icon className="size-6" />
      </div>
      <div>
        <div className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">{label}</div>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-['DingTalkJinBuTi'] tracking-tight">{value}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{unit}</span>
        </div>
      </div>
    </div>
  )
}

function DeviceCard({ 
  title, 
  subtitle, 
  status, 
  icon: Icon, 
  isOn,
  accentColor = "blue",
  onToggle,
  disabled = false
}: { 
  title: string, 
  subtitle: string, 
  status?: string, 
  icon: any,
  isOn: boolean,
  accentColor?: "blue" | "green" | "purple" | "orange",
  onToggle?: () => void,
  disabled?: boolean
}) {
  const colorMap = {
    blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30",
    green: "text-primary dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30",
    purple: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-900/30",
    orange: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900/30",
  }

  const activeClass = colorMap[accentColor]

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "rounded-[2rem] p-6 shadow-sm border relative overflow-hidden h-48 flex flex-col justify-between transition-all duration-300",
        isOn 
          ? `bg-white dark:bg-[#1e293b] ${activeClass} shadow-lg shadow-blue-500/5` 
          : "bg-white dark:bg-[#1e293b] border-slate-100 dark:border-slate-800",
        disabled && "opacity-60 grayscale"
      )}
    >
      <div className="flex justify-between items-start z-10">
        <div className={cn(
          "p-3 rounded-full transition-colors",
          isOn 
            ? "bg-white dark:bg-[#0B1121] shadow-sm" 
            : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
        )}>
           <Icon className={cn("size-7", isOn && "opacity-100")} />
        </div>
        <button 
          onClick={onToggle}
          className={cn(
            "size-10 rounded-full flex items-center justify-center transition-all",
            isOn 
              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md" 
              : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <Power className="size-5" />
        </button>
      </div>

      <div className="relative z-10">
        <h3 className={cn(
          "font-bold text-lg",
          isOn ? "text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-400"
        )}>{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-500 mt-2 font-medium">{subtitle}</p>
        {status && (
          <p className={cn("text-xs font-bold mt-2", isOn ? "text-slate-900 dark:text-white" : "text-slate-400")}>{status}</p>
        )}
      </div>
    </motion.div>
  )
}

function TabItem({ label, active }: { label: string, active?: boolean }) {
  return (
    <button className={cn(
      "px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap border",
      active 
        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-lg shadow-slate-900/20" 
        : "bg-white dark:bg-[#1e293b] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
    )}>
      {label}
    </button>
  )
}

// --- Helper Functions ---

function calculateEnvironmentScore(data: DeviceData | null) {
  if (!data) return { score: 0, label: "等待数据", deductions: [] }
  
  let score = 100
  const deductions: string[] = []

  // Temp (Ideal 15-30)
  if (data.temperature < 15) {
    score -= 10
    deductions.push("温度偏低")
  } else if (data.temperature > 30) {
    score -= 10
    deductions.push("温度偏高")
  }
  
  // Humidity (Ideal 40-80)
  if (data.humidity < 40) {
    score -= 10
    deductions.push("湿度偏低")
  } else if (data.humidity > 80) {
    score -= 10
    deductions.push("湿度偏高")
  }

  // Soil Moisture (Ideal 30-80)
  if (data.earth_water < 30) {
     score -= 15
     deductions.push("土壤缺水")
  }

  score = Math.max(0, score)
  
  let label = "环境极佳"
  if (score < 60) label = "环境恶劣"
  else if (score < 80) label = "需要关注"

  return { score, label, deductions }
}

function getAIAnalysisState(data: DeviceData | null): AIState {
  if (!data) return 'analyzing'
  const { score } = calculateEnvironmentScore(data)
  return score < 80 ? 'warning' : 'healthy'
}

function getAIAnalysisContent(data: DeviceData | null, state: AIState) {
   if (state === 'analyzing') {
     return {
       title: "正在深度诊断...",
       desc: "正在分析土壤微量元素与光合作用效率，请稍候..."
     }
   }
   
   if (state === 'healthy') {
     return {
       title: "生长环境优良",
       desc: "当前各项指标处于最佳状态，草莓生长迅速，无需人工干预。"
     }
   }

   // Warning State - Generate specific message
   const { deductions } = calculateEnvironmentScore(data)
   const mainIssue = deductions[0] || "环境异常"
   
   let suggestion = ""
   if (mainIssue.includes("温度")) suggestion = "建议调节排风或遮阳系统"
   else if (mainIssue.includes("湿度")) suggestion = "建议开启除湿或喷淋系统"
   else if (mainIssue.includes("缺水")) suggestion = "建议立即启动灌溉系统"
   else suggestion = "建议检查设备状态"

   return {
     title: `${mainIssue}预警`,
     desc: <>{suggestion}，预计可提升 <span className="font-bold text-blue-600 dark:text-blue-400">15%</span> 生长效率。</>
   }
}

function SliderRow({ label, value, onChange, color, displayValue }: { label: string; value: number; onChange: (v: number) => void; color: string; displayValue?: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</span>
        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{displayValue || value}</span>
      </div>
      <input 
        type="range" 
        min={0} 
        max={255} 
        value={value} 
        onChange={(e) => onChange(parseInt(e.target.value))} 
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow" 
        style={{ background: `linear-gradient(to right, ${color} 0%, ${color} ${(value / 255) * 100}%, transparent ${(value / 255) * 100}%, transparent 100%)` }} 
      />
    </div>
  )
}

// --- AI Analysis Config ---
type AIState = 'warning' | 'healthy' | 'analyzing'

const AI_STATES_BASE = {
  warning: {
    image: "/ip/智慧农业3D图标-浇水灌溉-细线版.png",
    subtitle: "AI 智能分析",
    color: "orange",
    bgPulse: "bg-orange-500",
    shadow: "shadow-[0_0_8px_rgba(249,115,22,0.6)]",
    action: "一键优化",
    actionIcon: Zap
  },
  healthy: {
    image: "/ip/智慧农业3D图标-作物检测-细线版.png",
    subtitle: "AI 持续监控中",
    color: "green",
    bgPulse: "bg-green-500",
    shadow: "shadow-[0_0_8px_rgba(34,197,94,0.6)]",
    action: "查看报告",
    actionIcon: CheckCircle2
  },
  analyzing: {
    image: "/ip/智慧农业3D图标-无人机巡检-细线版.png",
    subtitle: "AI 全局扫描",
    color: "blue",
    bgPulse: "bg-blue-500",
    shadow: "shadow-[0_0_8px_rgba(59,130,246,0.6)]",
    action: "取消分析",
    actionIcon: Search
  }
}

export default function HomePage() {
  const router = useRouter()
  const { deviceData } = useDeviceData()
  const { weatherData } = useWeatherContext()
  const { toggleRelay, setLEDs, status: controlStatus } = useDeviceControl()
  const [user, setUser] = useState<UserPublic | null>(null)
  
  // Greeting Orb
  const greetingOrb = useMemo(() => (
    <GreetingOrb username={user?.username} enabled={!!user} />
  ), [user?.username])

  const [aiStatus, setAiStatus] = useState<AIState>('analyzing')
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [aiContentOverride, setAiContentOverride] = useState<{title: string, desc: string} | null>(null)
  const lastAnalysisTimeRef = useRef<number>(0)
  
  // RGB Control State
  const [localR, setLocalR] = useState<number | null>(null)
  const [localG, setLocalG] = useState<number | null>(null)
  const [localB, setLocalB] = useState<number | null>(null)
  const [localW, setLocalW] = useState<number | null>(null)

  const r = (localR ?? deviceData?.led1 ?? 0)
  const g = (localG ?? deviceData?.led2 ?? 0)
  const b = (localB ?? deviceData?.led3 ?? 0)
  const w = (localW ?? deviceData?.led4 ?? 0)

  const handleDeviceToggle = async (relayNum: number, currentStatus: number | undefined) => {
    if (!checkPermission(relayNum)) {
       toast.error("权限不足", { description: "您没有权限控制此设备" })
       return
    }
    if (controlStatus.loading) return
    await toggleRelay(relayNum, currentStatus || 0)
  }

  const handleLEDUpdate = async () => {
    if (!checkPermission('led1')) {
       toast.error("权限不足", { description: "您没有权限调节补光灯颜色" })
       return
    }
    if (controlStatus.loading) return
    await setLEDs(r, g, b, w)
  }

  const checkPermission = (key: string | number) => {
     if (!user) return false
     if (user.role === 'admin' || user.role === 'super_admin') return true
     try {
       const perms = typeof user.permissions === 'string' 
         ? JSON.parse(user.permissions || '{}') 
         : (user.permissions || {})
       const allowed = perms.allowedControls || []
       const target = typeof key === 'number' ? `relay${key}` : key
       return allowed.includes(target)
     } catch {
       return false
     }
  }

  const handleAIAction = async () => {
    // Prevent multiple clicks
    if (aiStatus === 'analyzing') return

    setAiStatus('analyzing')
    setAiContentOverride(null)
    setIsOptimizing(true) // Reusing this as "loading" state
    
    try {
        // 1. Check local settings
        const settingsStr = localStorage.getItem("ai-settings")
        const settings = settingsStr ? JSON.parse(settingsStr) : null
        
        // If no API key, fallback to system logic with a simulated delay
        if (!settings?.apiKey) {
           await new Promise(resolve => setTimeout(resolve, 1500)) // Fake delay
           const newState = getAIAnalysisState(deviceData)
           setAiStatus(newState)
           setIsOptimizing(false)
           return
        }

        // 2. Call AI (No throttling here since it's user triggered)
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
             apiKey: settings.apiKey,
             model: settings.model || "qwen-plus",
             messages: [{
               role: "user",
               content: "请分析当前环境数据。返回JSON格式：{\"status\": \"healthy\" | \"warning\", \"title\": \"简短标题(10字内)\", \"desc\": \"简短描述(30字内)\"}。只返回JSON，不要其他内容。"
             }],
             deviceData,
             weatherData,
             systemPrompt: "你是专业的农业AI助手。请严格按照JSON格式返回分析结果。"
          })
        })

        if (!response.ok) throw new Error("AI Request Failed")

        // Parse SSE response
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let fullText = ""
        
        if (reader) {
           while (true) {
             const { done, value } = await reader.read()
             if (done) break
             const chunk = decoder.decode(value)
             const lines = chunk.split("\n")
             for (const line of lines) {
               if (line.startsWith("data: ")) {
                 const dataStr = line.slice(6)
                 if (dataStr === "[DONE]") continue
                 try {
                   const data = JSON.parse(dataStr)
                   const content = data.choices?.[0]?.delta?.content || ""
                   fullText += content
                 } catch {}
               }
             }
           }
        }
        
        // Extract JSON from fullText
        const jsonMatch = fullText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
           const result = JSON.parse(jsonMatch[0])
           if (result.status && result.title && result.desc) {
              setAiStatus(result.status === 'healthy' ? 'healthy' : 'warning')
              setAiContentOverride({
                title: result.title,
                desc: result.desc
              })
              setIsOptimizing(false)
              return
           }
        }
        
        // If parsing failed or no JSON, fallback
        throw new Error("Invalid AI Response")

    } catch (e) {
        // Fallback on error
        const newState = getAIAnalysisState(deviceData)
        setAiStatus(newState)
        setAiContentOverride(null)
        setIsOptimizing(false)
    }
  }

  // Initial System Check (only run once on mount to set initial state based on rules, NO AI)
  useEffect(() => {
    if (deviceData && aiStatus === 'analyzing' && !isOptimizing) {
       const newState = getAIAnalysisState(deviceData)
       setAiStatus(newState)
    }
  }, [deviceData]) // Only depend on deviceData for initial rule-based check


  useEffect(() => {
    const fetchUser = async () => {
       try {
        const res = await fetch("/api/auth/me")
        const data = await res.json()
        if (data?.user) setUser(data.user)
       } catch {}
    }
    fetchUser()
  }, [])

  const envScore = calculateEnvironmentScore(deviceData)
  const aiContent = aiContentOverride || getAIAnalysisContent(deviceData, aiStatus)
  const currentAI = { ...AI_STATES_BASE[aiStatus], ...aiContent }

  // Derived Data
   const temp = deviceData?.temperature ? Math.round(deviceData.temperature) : (weatherData?.current?.temp_c ? Math.round(weatherData.current.temp_c) : 24)
   const humidity = deviceData?.humidity ? Math.round(deviceData.humidity) : (weatherData?.current?.humidity || 68)
   const soil = deviceData?.earth_water ? Math.round(deviceData.earth_water) : 45
   const co2 = deviceData?.co2 ? Math.round(deviceData.co2) : 420
   
   // Time-based Greeting
   const getGreeting = () => {
     const hour = new Date().getHours()
     if (hour < 6) return "凌晨好,"
     if (hour < 9) return "早上好,"
     if (hour < 12) return "上午好,"
     if (hour < 14) return "中午好,"
     if (hour < 18) return "下午好,"
     if (hour < 22) return "晚上好,"
     return "夜深了,"
   }
   
   const greeting = getGreeting()

  return (
    <div className="min-h-screen w-screen bg-transparent dark:bg-[#0B1121] text-foreground font-sans pb-32 overflow-x-hidden transition-colors duration-500">
      <MobileBackground />
       
      {/* Header */}
      <div className="px-6 pt-16 pb-8  flex justify-between items-center z-50 relative">
        <div className="flex items-center gap-4">
           <div className="size-12 rounded-full bg-white/55 dark:bg-white/5 backdrop-blur-2xl p-[3px] shadow-[0_12px_36px_rgba(15,23,42,0.10)] ring-1 ring-white/70 dark:ring-white/10">
              <div className="w-full h-full rounded-full bg-white/70 dark:bg-white/5 flex items-center justify-center overflow-hidden ring-1 ring-white/60 dark:ring-white/10">
                {user?.avatar_url ? (
                  <Image src={user.avatar_url} alt="User" width={48} height={48} className="object-cover" />
                ) : (
                  <span className="font-bold text-slate-500 dark:text-slate-400 text-lg">{user?.username?.[0]?.toUpperCase() || 'S'}</span>
                )}
              </div>
           </div>
           <div>
             <h1 className="text-xs text-slate-500/90 dark:text-slate-400 font-medium mb-0.5">{greeting}</h1>
             <div className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-1 tracking-tight">
                {user?.username || "管理员"} <span className="text-blue-500">.</span>
             </div>
           </div>
         </div>
        <div className="flex items-center gap-3">
         <div className="flex items-center gap-2 bg-white/55 dark:bg-white/5 backdrop-blur-2xl px-4 py-2 rounded-full border border-white/60 dark:border-white/10 shadow-[0_12px_36px_rgba(15,23,42,0.10)]">
            <span className="size-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">在线</span>
         </div>
         <button className="relative p-2.5 rounded-full bg-white/55 dark:bg-white/5 backdrop-blur-2xl border border-white/60 dark:border-white/10 hover:bg-white/70 dark:hover:bg-white/10 transition-colors shadow-[0_12px_36px_rgba(15,23,42,0.10)]">
            <Bell className="size-6 text-slate-700 dark:text-slate-300" />
            <span className="absolute top-2 right-2.5 size-2 bg-red-500 rounded-full border-2 border-white dark:border-[#1e293b]" />
         </button>
        </div>
      </div>

      {/* Top Section: Dashboard + 3D */}
      <div className="mb-4 relative">
        
        {/* L-Shaped Stats Container with 3D Model Integrated */}
        <div className="relative z-10 w-full px-6">
           <LShapedStats 
              score={envScore.score} 
              scoreLabel={envScore.label} 
              temp={`${temp}`} 
              humidity={`${humidity}`}
              soil={`${soil}`}
              co2={`${co2}`}
              modelSlot={
                 <div className="absolute bottom-[30%] right-[-14%] z-20 pointer-events-none">
                     <Image 
                        src="/ip/sit.png" 
                        alt="IP Character"
                        width={350}
                        height={350}
                        className="object-contain drop-shadow-2xl animate-float origin-bottom-right"
                        priority
                     />
                 </div>
               }
            />
        </div>
      </div>

      {/* AI Analysis / Warning Section */}
      <div className="px-6 mb-8 mt-12 relative z-10">
        <div className="relative group">
          {/* Ambient Glow - Dynamic based on state */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-r blur-3xl opacity-30 transition-all duration-1000",
            aiStatus === 'warning' ? "from-orange-500 via-red-500 to-yellow-500" :
            aiStatus === 'healthy' ? "from-green-400 via-emerald-500 to-teal-500" :
            "from-blue-400 via-indigo-500 to-purple-500"
          )} />

          {/* Main Card Container */}
          <div className="relative rounded-[2.5rem] shadow-[0_8px_32px_rgba(0,0,0,0.05)]">
             
             {/* Background Layer */}
             <div className="absolute inset-0 bg-white/80 dark:bg-[#1a1f2e]/80 backdrop-blur-2xl border border-white/60 dark:border-white/10 rounded-[2.5rem] overflow-hidden">
                {/* Decorative Tech Grid Background */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                     style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} 
                />

                {/* Top Glass Highlight */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-50" />
             </div>

             {/* Content Layer */}
             <div className="relative z-10 p-6 flex justify-between">
                <div className="flex-1 pt-1 pr-2">
                   {/* Title Area */}
                   <div className="mb-4">
                      <div className="h-7 relative overflow-hidden mb-1">
                        <AnimatePresence mode="wait">
                          <motion.h3 
                            key={currentAI.subtitle}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="text-2xl font-black text-slate-900 dark:text-white leading-none tracking-tight absolute inset-0" 
                            style={{ fontFamily: 'DingTalkJinBuTi, system-ui' }}
                          >
                            {currentAI.subtitle}
                          </motion.h3>
                        </AnimatePresence>
                      </div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 pl-0.5">
                        实时生长环境诊断系统
                      </p>
                   </div>
                   
                   {/* Diagnosis Box */}
                   <AnimatePresence mode="wait">
                     <motion.div 
                       key={aiStatus}
                       initial={{ opacity: 0, x: -20, filter: "blur(10px)" }}
                       animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                       exit={{ opacity: 0, x: 20, filter: "blur(10px)" }}
                       transition={{ duration: 0.4, ease: "easeOut" }}
                       className={cn(
                         "rounded-2xl p-3.5 border backdrop-blur-sm transition-colors duration-300",
                         aiStatus === 'warning' ? "bg-orange-50/80 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20" :
                         aiStatus === 'healthy' ? "bg-emerald-50/80 dark:bg-primary/10 border-emerald-100 dark:border-primary/20" :
                         "bg-blue-50/80 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20"
                       )}
                     >
                        <div className="flex gap-3">
                           <motion.div 
                             layoutId="status-bar"
                             className={cn("w-1 rounded-full shrink-0", currentAI.bgPulse)} 
                           />
                           <div>
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className={cn("text-sm font-bold mb-1", 
                                  aiStatus === 'warning' ? "text-orange-700 dark:text-orange-300" :
                                  aiStatus === 'healthy' ? "text-emerald-700 dark:text-emerald-300" :
                                  "text-blue-700 dark:text-blue-300"
                                )}
                              >
                                 {currentAI.title}
                              </motion.div>
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed"
                              >
                                 {currentAI.desc}
                              </motion.div>
                           </div>
                        </div>
                     </motion.div>
                   </AnimatePresence>

                   {/* Action Button Area */}
                   <AnimatePresence>
                     <motion.button 
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: 10 }}
                       whileTap={{ scale: 0.95 }}
                       onClick={handleAIAction}
                       disabled={aiStatus === 'analyzing'}
                       className={cn(
                         "mt-4 w-full py-3 rounded-xl text-xs font-bold shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2 group/btn relative overflow-hidden transition-all",
                         aiStatus === 'analyzing' 
                           ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-wait"
                           : "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                       )}
                     >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                        {aiStatus === 'analyzing' ? (
                           <div className="size-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                           <Sparkles className="size-3.5 fill-current" />
                        )}
                        <span>{aiStatus === 'analyzing' ? "正在分析全域数据..." : "开始智能分析"}</span>
                     </motion.button>
                   </AnimatePresence>
                </div>

                {/* 3D IP Character - Breaking Bounds with Higher Impact */}
                <div className="w-[160px] relative -mr-10 -my-10 -mb-16 flex items-end justify-center pointer-events-none select-none z-20">
                    {/* Glow behind character */}
                    <AnimatePresence mode="wait">
                      <motion.div 
                         key={aiStatus}
                         initial={{ scale: 0.8, opacity: 0 }}
                         animate={{ scale: 1, opacity: 0.6 }}
                         exit={{ scale: 1.2, opacity: 0 }}
                         className={cn("absolute bottom-8 left-1/2 -translate-x-1/2 size-40 rounded-full blur-[40px] animate-pulse mix-blend-multiply dark:mix-blend-normal", 
                            aiStatus === 'warning' ? "bg-orange-400/60" : 
                            aiStatus === 'healthy' ? "bg-emerald-400/60" : "bg-blue-400/60"
                         )} 
                      />
                    </AnimatePresence>
                    
                    <AnimatePresence mode="wait">
                      <motion.div
                         key={aiStatus}
                         initial={{ y: 40, opacity: 0, scale: 0.9 }}
                         animate={{ 
                            y: 0, 
                            opacity: 1, 
                            scale: 1,
                            transition: { 
                              type: "spring",
                              stiffness: 100,
                              damping: 15
                            }
                         }}
                         exit={{ y: 20, opacity: 0, scale: 0.95 }}
                      >
                         <motion.div
                            animate={{ y: [0, -8, 0] }}
                            transition={{ 
                              duration: 4, 
                              repeat: Infinity,
                              ease: "easeInOut" 
                            }}
                         >
                             <Image 
                                src={currentAI.image} 
                                alt="AI Assistant"
                                width={240}
                                height={240}
                                className="object-contain drop-shadow-[0_25px_50px_rgba(0,0,0,0.35)] scale-125 origin-bottom"
                                priority
                             />
                         </motion.div>
                      </motion.div>
                    </AnimatePresence>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Greeting Orb */}
      {greetingOrb}

      <WeatherCard />

      {/* Tab Navigation */}
      <div className="px-6 mb-10 flex items-center justify-between relative z-10">
        <div className="text-2xl font-bold text-slate-900 dark:text-white mr-6 flex items-center gap-2">
          <LayoutDashboard className="size-7 text-blue-500" />
          区域
        </div>
        <div className="flex-1 overflow-x-auto scrollbar-hide flex items-center gap-3 py-2">
          <TabItem label="一号棚" active />
          <TabItem label="二号棚" />
          <TabItem label="育苗区" />
          <TabItem label="设备间" />
        </div>
      </div>

      {/* Device Grid */}
      <div className="px-6 grid grid-cols-2 gap-x-4 gap-y-6 pb-12 relative z-10">
        <DeviceCard 
          title="智能补光" 
          subtitle="自动光谱调节" 
          icon={Sun}
          isOn={!!deviceData?.relay7}
          accentColor="orange"
          status={deviceData?.relay7 ? "运行中" : "已关闭"}
          onToggle={() => handleDeviceToggle(7, deviceData?.relay7)}
          disabled={!checkPermission(7) || controlStatus.loading}
        />
        <DeviceCard 
          title="排风系统" 
          subtitle="强力换气模式" 
          icon={Fan}
          isOn={!!deviceData?.relay6}
          accentColor="blue"
          onToggle={() => handleDeviceToggle(6, deviceData?.relay6)}
          disabled={!checkPermission(6) || controlStatus.loading}
        />
        <DeviceCard 
          title="光照植物补光灯控制" 
          subtitle="照明系统" 
          icon={Lightbulb}
          isOn={!!deviceData?.relay8}
          status={deviceData?.relay8 ? "已开启" : "已关闭"}
          onToggle={() => handleDeviceToggle(8, deviceData?.relay8)}
          disabled={!checkPermission(8) || controlStatus.loading}
        />
        <DeviceCard 
          title="水泵灌溉" 
          subtitle="精准灌溉" 
          icon={Droplets}
          isOn={!!deviceData?.relay5}
          accentColor="green"
          onToggle={() => handleDeviceToggle(5, deviceData?.relay5)}
          disabled={!checkPermission(5) || controlStatus.loading}
        />
      </div>

      {/* RGB Control Section */}
      <div className="px-6 mb-24 relative z-10">
        <div className="bg-white/60 dark:bg-black/40 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-[2rem] p-6 shadow-xl">
           <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                 <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                    <Lightbulb className="size-6" />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">补光灯调色</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">RGB 全光谱调节</p>
                 </div>
              </div>
              <div className="w-12 h-6 rounded-full border border-slate-200 dark:border-slate-700 shadow-inner" style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }} />
           </div>

           <div className="space-y-4">
              <SliderRow label="红色光谱 (R)" value={r} onChange={setLocalR} color="#ef4444" />
              <SliderRow label="绿色光谱 (G)" value={g} onChange={setLocalG} color="#22c55e" />
              <SliderRow label="蓝色光谱 (B)" value={b} onChange={setLocalB} color="#3b82f6" />
              <SliderRow label="亮度 (W)" value={w} onChange={setLocalW} color="#f59e0b" displayValue={`${Math.round((w / 255) * 100)}%`} />
           </div>

           <div className="mt-6">
              <button 
                onClick={handleLEDUpdate}
                className={cn(
                  "w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-all",
                  (controlStatus.loading || !checkPermission('led1')) && "opacity-50 cursor-not-allowed"
                )}
              >
                 {controlStatus.loading ? "正在更新..." : "应用光照设置"}
              </button>
           </div>
        </div>
      </div>

      {/* Bottom Padding for Global Nav */}
      <div className="h-24" />

    </div>
  )
}
