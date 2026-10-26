"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { IconBrain, IconCloudStorage, IconCpu, IconDatabaseNetwork, IconLightning, IconMonitor, IconPhone, IconRadio, IconSeedling, IconServer, IconShare, IconSun, IconThermometer, IconWater, IconWifi } from "@/components/icon";

// --- CONSTANTS ---
const IP_IMAGES = {
  perception: "/ip/草莓头IP-跳跃姿势.png",
  transmission: "/ip/草莓头IP-奔跑姿势.png",
  platform: "/ip/草莓头IP-招手姿势.png",
  application: "/ip/草莓头IP-坐姿玩手机.png"
}

// --- ANIMATIONS ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.3 }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.9 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 50, damping: 20 }
  }
}

const floatingAnimation = {
  y: [-10, 10],
  transition: {
    duration: 4,
    repeat: Infinity,
    repeatType: "mirror" as const,
    ease: "easeInOut"
  }
}

const pulseAnimation = {
  opacity: [0.5, 1, 0.5],
  scale: [1, 1.05, 1],
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: "easeInOut"
  }
}

// --- COMPONENTS ---

interface TechSpecProps {
  icon: React.ReactNode
  label: string
  value?: string
}

const TechSpec = ({ icon, label, value }: TechSpecProps) => (
  <div className="flex items-center gap-3 p-2 rounded-lg bg-black/40 border border-white/5 hover:border-primary/30 transition-colors group">
    <div className="text-primary/70 group-hover:text-emerald-400 transition-colors">
      {icon}
    </div>
    <div className="flex flex-col">
      <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-mono">{label}</span>
      {value && <span className="text-xs font-bold text-zinc-300 font-mono">{value}</span>}
    </div>
  </div>
)

interface LayerCardProps {
  title: string
  enTitle: string
  image: string
  description: string
  specs: TechSpecProps[]
  index: number
}

const LayerCard = ({ title, enTitle, image, description, specs, index }: LayerCardProps) => {
  return (
    <motion.div 
      variants={cardVariants}
      className="relative group flex-1 min-w-[300px] max-w-[350px]"
    >
      {/* Glow Effect */}
      <div className="absolute -inset-1 bg-gradient-to-b from-primary/20 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Card Body */}
      <div className="relative h-full bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden flex flex-col">
        {/* Header with IP */}
        <div className="relative h-48 bg-gradient-to-b from-emerald-950/30 to-zinc-900/0 flex items-center justify-center overflow-hidden">
           <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 mix-blend-overlay" />
           <motion.div 
             animate={floatingAnimation}
             className="relative z-10 w-40 h-40"
           >
             <Image 
                src={image} 
                alt={title} 
                fill 
                className="object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
             />
           </motion.div>
           
           {/* Decorative Rings */}
           <div className="absolute inset-0 border-[0.5px] border-primary/10 rounded-full scale-[2] opacity-20" />
           <div className="absolute inset-0 border-[0.5px] border-primary/10 rounded-full scale-[1.5] opacity-20" />
        </div>

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-primary font-mono text-xs font-bold">0{index + 1}</span>
              <div className="h-px flex-1 bg-primary/20" />
            </div>
            <h3 className="text-2xl font-bold text-white font-jinbuti tracking-wide">{title}</h3>
            <p className="text-xs font-mono text-primary/60 uppercase tracking-widest mb-2">{enTitle}</p>
            <p className="text-sm text-zinc-400 leading-relaxed border-l-2 border-primary/20 pl-3">
              {description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-auto">
            {specs.map((spec, i) => (
              <TechSpec key={i} {...spec} />
            ))}
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="h-1 w-full bg-gradient-to-r from-primary/0 via-emerald-500/50 to-emerald-500/0 opacity-50" />
      </div>
    </motion.div>
  )
}

const DataFlow = ({ label }: { label: string }) => {
  return (
    <div className="hidden xl:flex flex-col items-center justify-center w-16 gap-2 opacity-50">
      <motion.div 
        animate={{ opacity: [0.2, 1, 0.2], x: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-primary"
      >
        <div className="flex gap-1">
            <div className="w-1 h-1 bg-current rounded-full" />
            <div className="w-1 h-1 bg-current rounded-full" />
            <div className="w-1 h-1 bg-current rounded-full" />
        </div>
      </motion.div>
      <div className="h-px w-8 bg-primary/30" />
      <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase rotate-90 whitespace-nowrap tracking-widest mt-4 mb-4 drop-shadow-[0_0_8px_rgba(0,148,86,0.5)]">
        {label}
      </span>
      <div className="h-px w-8 bg-primary/30" />
    </div>
  )
}

export function ArchitectureDiagram() {
  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16 relative"
      >
        <div className="inline-block relative">
            <h2 className="text-4xl md:text-6xl font-bold text-white font-jinbuti tracking-tight relative z-10">
              STRAVISION <span className="text-primary">OS</span>
            </h2>
            <div className="absolute -inset-x-8 -inset-y-4 bg-primary/5 blur-3xl rounded-full z-0" />
        </div>
        <p className="mt-4 text-primary/60 font-mono text-xs md:text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-4">
          <span className="w-8 h-px bg-primary/30" />
          System Architecture V4.2
          <span className="w-8 h-px bg-primary/30" />
        </p>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="flex flex-col xl:flex-row items-stretch justify-center gap-8 relative"
      >
        {/* Layer 1: Perception */}
        <LayerCard 
            index={0}
            title="感知层"
            enTitle="Perception Layer"
            image={IP_IMAGES.perception}
            description="环境传感器集群与视觉感知终端，实时采集大棚内的全维度生长数据。"
            specs={[
                { icon: <IconThermometer size={14} />, label: "环境", value: "Temp/Hum" },
                { icon: <IconSun size={14} />, label: "光照", value: "PAR/Lux" },
                { icon: <IconSeedling size={14} />, label: "土壤", value: "NPK/PH" },
                { icon: <IconLightning size={14} />, label: "能耗", value: "Power" },
            ]}
        />

        <DataFlow label="数据采集" />

        {/* Layer 2: Transmission */}
        <LayerCard 
            index={1}
            title="传输层"
            enTitle="Network Layer"
            image={IP_IMAGES.transmission}
            description="基于 MQTT 5.0 的双向通信链路，确保指令下发与数据上报的毫秒级同步。"
            specs={[
                { icon: <IconWifi size={14} />, label: "无线", value: "5G/WiFi" },
                { icon: <IconRadio size={14} />, label: "LoRa", value: "Long Range" },
                { icon: <IconShare size={14} />, label: "协议", value: "MQTT" },
                { icon: <IconCloudStorage size={14} />, label: "网关", value: "Edge" },
            ]}
        />

        <DataFlow label="传输" />

        {/* Layer 3: Platform */}
        <LayerCard 
            index={2}
            title="平台层"
            enTitle="Platform Layer"
            image={IP_IMAGES.platform}
            description="云端 AI 大脑与数据中台。负责数据清洗、存储、视觉分析与控制决策下发。"
            specs={[
                { icon: <IconServer size={14} />, label: "服务", value: "K8s Cluster" },
                { icon: <IconBrain size={14} />, label: "AI", value: "Qwen-VL" },
                { icon: <IconDatabaseNetwork size={14} />, label: "存储", value: "TimeScale" },
                { icon: <IconCpu size={14} />, label: "计算", value: "Edge AI" },
            ]}
        />

        <DataFlow label="交互" />

        {/* Layer 4: Application */}
        <LayerCard 
            index={3}
            title="应用层"
            enTitle="Application Layer"
            image={IP_IMAGES.application}
            description="多端协同的交互界面。提供数据可视化看板、远程控制台与智能问答助手。"
            specs={[
                { icon: <IconMonitor size={14} />, label: "PC", value: "Dashboard" },
                { icon: <IconPhone size={14} />, label: "Mobile", value: "App" },
                { icon: <IconLightning size={14} />, label: "Control", value: "Real-time" },
                { icon: <IconShare size={14} />, label: "API", value: "REST/GQL" },
            ]}
        />

      </motion.div>
    </div>
  )
}
