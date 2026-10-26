"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { StoryBackground } from "./Background"
import { IconArrowRight, IconBox, IconBrain, IconBriefcase, IconCamera, IconCaution, IconChartHistogram, IconChartLine, IconChartPie, IconCheckCorrect, IconCheckOne, IconCloudStorage, IconCode, IconComment, IconCpu, IconDatabaseNetwork, IconDollar, IconEarth, IconFullScreen, IconGithub, IconGithubOne, IconGlobe, IconHardDisk, IconKey, IconLayers, IconLayoutTwo, IconLeaf, IconLightning, IconList, IconLock, IconMagic, IconMerge, IconMicrophone, IconMonitor, IconNetworkTree, IconPause, IconPeoples, IconPhone, IconPlay, IconRadio, IconRefresh, IconRemind, IconRocket, IconScan, IconSearch, IconSeedling, IconServer, IconSetting, IconShare, IconShield, IconStar, IconSun, IconTag, IconTarget, IconTerminal, IconThermometer, IconTrendingUp, IconTrophy, IconWater, IconWifi, IconWind } from "@/components/icon";

// --- Typography Components (Updated for Premium Look) ---

export const BigTitle = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <h2 className={cn("text-6xl md:text-8xl font-medium tracking-tight leading-[1.1] mb-8 text-white", className)}>
    {children}
  </h2>
)

export const SubTitle = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <p className={cn("text-2xl md:text-3xl text-zinc-400 font-light tracking-wide leading-relaxed max-w-3xl", className)}>
    {children}
  </p>
)

export const Highlight = ({ children, color = "text-emerald-400" }: { children: React.ReactNode, color?: string }) => (
  <span className={cn("font-medium", color)}>
    {children}
  </span>
)

// --- Shared Components ---

const BentoCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn(
    "relative overflow-hidden rounded-2xl bg-zinc-900/40 backdrop-blur-xl border border-white/5 p-8",
    "shadow-[0_8px_30px_rgb(0,0,0,0.12)]", 
    className
  )}>
    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
    {children}
  </div>
)

const Tag = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={cn(
    "px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider bg-white/5 text-zinc-400 border border-white/5",
    className
  )}>
    {children}
  </span>
)

// --- IP Avatar Component (Simplified) ---

export const IPAvatar = ({ 
  pose = "default", 
  className, 
  scale = 1,
  animate = true
}: { 
  pose?: "default" | "happy" | "worry" | "tech" | "future" | "run" | "sit", 
  className?: string,
  scale?: number,
  animate?: boolean
}) => {
  const poses = {
    default: "/ip/草莓头IP-招手姿势.png",
    happy: "/ip/草莓头IP-舞蹈姿势.png",
    worry: "/ip/草莓头IP-坐姿玩手机.png",
    tech: "/ip/草莓头IP-放大镜姿势.png",
    future: "/ip/草莓头IP-跳跃姿势.png",
    run: "/ip/草莓头IP-奔跑姿势.png",
    sit: "/ip/草莓头IP-坐姿玩手机.png"
  }

  return (
    <motion.div 
      className={cn("relative z-10", className)}
      initial={animate ? { y: 20, opacity: 0 } : undefined}
      animate={animate ? { y: 0, opacity: 1 } : undefined}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <div className="relative" style={{ width: 300 * scale, height: 300 * scale }}>
        <Image 
          src={poses[pose] || poses.default} 
          alt="Strawberry IP" 
          fill 
          className="object-contain drop-shadow-2xl"
          priority
        />
      </div>
    </motion.div>
  )
}

// --- P1-P4: Story Arc (Kept mostly same but cleaner) ---

export const CoverSlide = () => (
  <div className="h-full flex items-center justify-center relative overflow-hidden">
    <StoryBackground mode="default" />
    <div className="text-center z-10 flex flex-col items-center">
      <div className="mb-12 relative">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <Image src="/ip/ip-banner.png" alt="Stravision IP" width={600} height={400} className="object-contain" priority />
        </motion.div>
      </div>
      <motion.h1 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-[100px] font-medium tracking-tight text-white mb-6 leading-none"
      >
        STRAVISION
      </motion.h1>
      <motion.p 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-2xl text-zinc-400 font-light tracking-[0.2em] uppercase"
      >
        Skills for Green Future
      </motion.p>
    </div>
  </div>
)

export const ContextSlide = () => (
  <div className="h-full flex items-center justify-center relative px-20">
    <StoryBackground mode="crisis" />
    <div className="grid grid-cols-2 gap-20 w-full items-center z-10 max-w-[1400px]">
      <div className="space-y-8">
        <Tag className="bg-red-500/10 text-red-400 border-red-500/20">Challenge</Tag>
        <BigTitle>
          技能断层<br/>
          <span className="text-zinc-500">The Silent Crisis</span>
        </BigTitle>
        <SubTitle>
          传统经验失效，劳动力短缺。<br/>
          农业正在失去它的"工匠"。
        </SubTitle>
      </div>
      <div className="relative h-[500px] flex items-center justify-center">
        <div className="absolute top-0 right-0 bg-red-500/10 p-8 rounded-2xl border border-red-500/10 backdrop-blur-md">
           <div className="text-6xl font-medium text-white mb-2">45%</div>
           <div className="text-red-400 uppercase text-sm tracking-wider">Labor Shortage</div>
        </div>
        <IPAvatar pose="worry" scale={1.4} />
      </div>
    </div>
  </div>
)

export const PainPointsSlide = () => (
  <div className="h-full flex items-center justify-center relative px-20">
    <StoryBackground mode="crisis" />
    <div className="flex flex-col items-center text-center z-10 max-w-4xl mx-auto">
      <Tag className="mb-8 bg-orange-500/10 text-orange-400 border-orange-500/20">Pain Points</Tag>
      <BigTitle>看不见的数据</BigTitle>
      <SubTitle>
        对于缺乏数字技能的农户来说，<br/>
        海量的传感器数据只是<span className="text-white">噪音</span>。
      </SubTitle>
      <div className="mt-12 flex gap-4 opacity-50">
        {['pH?', 'NPK?', 'EC?', 'Temp?'].map((t, i) => (
          <span key={i} className="text-6xl font-medium text-zinc-700 blur-[2px]">{t}</span>
        ))}
      </div>
    </div>
  </div>
)

export const ConceptSlide = () => (
  <div className="h-full flex items-center justify-center relative text-center">
    <StoryBackground mode="hope" />
    <div className="relative z-10 max-w-4xl flex flex-col items-center">
       <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mb-12 shadow-[0_0_60px_rgba(0,148,86,0.3)]">
          <IconMagic className="w-10 h-10 text-white" />
       </div>
       <h2 className="text-7xl font-medium text-white mb-8">
          数字工匠精神
       </h2>
       <p className="text-3xl text-zinc-400 font-light leading-relaxed">
          Stravision 将 <span className="text-white">IoT 技术</span> 与 <span className="text-white">AI 智慧</span> 结合，<br/>
          让每一位新农人都能成为大师。
       </p>
    </div>
  </div>
)

// --- P5: Solution Map (Redesigned: Bento Grid) ---

export const SolutionMapSlide = () => (
  <div className="h-full flex flex-col justify-center px-20 relative">
    <StoryBackground mode="tech" />
    
    <div className="mb-16 z-10">
       <Tag className="mb-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Solution Architecture</Tag>
       <h2 className="text-6xl font-medium text-white">全栈技能生态</h2>
    </div>

    <div className="grid grid-cols-12 gap-6 h-[500px] w-full max-w-[1400px] z-10">
       {/* Sensing - Large Left */}
       <BentoCard className="col-span-4 flex flex-col justify-between group hover:bg-zinc-900/60 transition-colors">
          <div>
            <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mb-6">
              <IconWifi className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-2xl font-medium text-white mb-2">感知 Sensing</h3>
            <p className="text-zinc-500">IoT 硬件互联与数据采集</p>
          </div>
          <div className="relative h-40 w-full opacity-60 group-hover:opacity-100 transition-opacity">
            <Image src="/images/ip/智慧农业3D图标-数据监测-细线版.png" alt="Sensing" fill className="object-contain object-left" />
          </div>
       </BentoCard>

       {/* Thinking - Center Top */}
       <BentoCard className="col-span-4 flex flex-col items-center text-center justify-center bg-zinc-800/20 border-emerald-500/20">
          <div className="relative w-32 h-32 mb-6">
             <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full" />
             <IPAvatar pose="tech" scale={0.6} animate={false} />
          </div>
          <h3 className="text-2xl font-medium text-white mb-2">思考 Thinking</h3>
          <p className="text-emerald-400/80 text-sm uppercase tracking-wider">AI & Big Data Core</p>
       </BentoCard>

       {/* Acting - Large Right */}
       <BentoCard className="col-span-4 flex flex-col justify-between group hover:bg-zinc-900/60 transition-colors">
          <div>
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6">
              <IconLightning className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-2xl font-medium text-white mb-2">行动 Acting</h3>
            <p className="text-zinc-500">自动化控制与执行</p>
          </div>
          <div className="relative h-40 w-full opacity-60 group-hover:opacity-100 transition-opacity">
            <Image src="/images/ip/智慧农业3D图标-浇水灌溉-细线版.png" alt="Acting" fill className="object-contain object-right" />
          </div>
       </BentoCard>

       {/* Bottom Connectors */}
       <div className="col-span-12 flex justify-between items-center px-10 text-zinc-600 font-mono text-sm mt-4">
          <span>MQTT / Modbus</span>
          <div className="h-px bg-zinc-800 flex-1 mx-8" />
          <span>REST / WebSocket</span>
          <div className="h-px bg-zinc-800 flex-1 mx-8" />
          <span>GPIO / PWM</span>
       </div>
    </div>
  </div>
)

// --- P6: Hardware Layer (Redesigned: Immersive Product) ---

export const HardwareLayerSlide = () => (
  <div className="h-full flex items-center relative overflow-hidden bg-[#050505]">
     <StoryBackground mode="tech" />
     
     <div className="w-1/2 h-full flex items-center justify-center relative z-10 pl-20">
        <div className="relative w-[600px] h-[600px] group">
           <div className="absolute inset-0 bg-orange-500/5 blur-[100px] rounded-full group-hover:bg-orange-500/10 transition-colors duration-1000" />
           <motion.div
             animate={{ rotate: 360 }}
             transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
             className="relative w-full h-full"
           >
              <Image src="/images/ip/智慧农业3D图标-数据监测-细线版.png" alt="Sensor" fill className="object-contain drop-shadow-2xl" />
           </motion.div>
           
           {/* Floating Tags */}
           <div className="absolute top-20 right-0 bg-zinc-900/80 backdrop-blur border border-white/10 px-4 py-2 rounded-lg text-sm text-zinc-300">
             ESP32 Core
           </div>
           <div className="absolute bottom-40 left-0 bg-zinc-900/80 backdrop-blur border border-white/10 px-4 py-2 rounded-lg text-sm text-zinc-300">
             RS485 Interface
           </div>
        </div>
     </div>

     <div className="w-1/2 pr-20 pl-10 z-10">
        <div className="mb-12">
          <Tag className="mb-6 bg-orange-500/10 text-orange-400 border-orange-500/20">Layer 01: Sensing</Tag>
          <h2 className="text-7xl font-medium text-white mb-6">精准感知</h2>
          <p className="text-2xl text-zinc-400 font-light leading-relaxed">
             捕捉每一次微小的环境变化。<br/>
             工业级精度，全天候守护。
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
           {['Temp & Humidity', 'Soil NPK', 'CO2 Levels', 'Light Intensity'].map((item, i) => (
             <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5">
               <div className="w-2 h-2 rounded-full bg-orange-500" />
               <span className="text-zinc-300">{item}</span>
             </div>
           ))}
        </div>
     </div>
  </div>
)

// --- P7: Control Layer (Redesigned: Speed & Action) ---

export const ControlLayerSlide = () => (
  <div className="h-full flex items-center justify-center px-20 relative overflow-hidden">
     <StoryBackground mode="tech" />
     
     {/* Speed Lines Background */}
     <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute h-px bg-emerald-500 w-full" style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100 - 50}%`, opacity: Math.random() }} />
        ))}
     </div>

     <div className="max-w-[1400px] w-full grid grid-cols-2 gap-20 items-center z-10">
        <div>
           <Tag className="mb-6 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Layer 02: Control</Tag>
           <h2 className="text-8xl font-medium text-white mb-8 tracking-tighter">
             10ms<br/>
             <span className="text-zinc-600 text-6xl">Latency</span>
           </h2>
           <p className="text-2xl text-zinc-400 font-light leading-relaxed mb-10">
             从云端指令到硬件动作，<br/>
             快到几乎无法察觉。
           </p>
           
           <div className="flex gap-4">
              <div className="flex-1 bg-zinc-900/50 border border-white/10 p-6 rounded-2xl flex items-center gap-4">
                 <IconWind className="text-emerald-500 w-8 h-8" />
                 <div>
                   <div className="text-white font-medium">智能通风</div>
                   <div className="text-zinc-500 text-xs">Auto Ventilation</div>
                 </div>
              </div>
              <div className="flex-1 bg-zinc-900/50 border border-white/10 p-6 rounded-2xl flex items-center gap-4">
                 <IconWater className="text-cyan-500 w-8 h-8" />
                 <div>
                   <div className="text-white font-medium">精准灌溉</div>
                   <div className="text-zinc-500 text-xs">Smart Irrigation</div>
                 </div>
              </div>
           </div>
        </div>

        <div className="relative flex justify-center">
           <div className="absolute inset-0 bg-emerald-500/10 blur-[80px] rounded-full" />
           <IPAvatar pose="run" scale={1.5} />
        </div>
     </div>
  </div>
)

// --- P8: Edge Computing (Redesigned: Central Core) ---

export const EdgeComputingSlide = () => (
  <div className="h-full flex flex-col items-center justify-center relative overflow-hidden">
     <StoryBackground mode="tech" />
     
     <div className="z-10 text-center mb-12">
        <h2 className="text-5xl font-medium text-white mb-4">边缘计算核心</h2>
        <p className="text-zinc-400 text-xl">即使断网，依然智慧</p>
     </div>

     <div className="relative w-[600px] h-[400px] z-10 flex items-center justify-center">
        {/* Central Hub Visualization */}
        <div className="w-64 h-64 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center relative shadow-lg z-20">
           <IconServer className="w-24 h-24 text-purple-500" />
           {/* Status Light */}
           <div className="absolute top-6 right-6 w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_#059669]" />
        </div>

        {/* Orbiting Satellites */}
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute w-[400px] h-[400px] border border-white/5 rounded-full"
            style={{ rotate: i * 45 }}
            animate={{ rotate: i * 45 + 360 }}
            transition={{ duration: 20 + i * 5, repeat: Infinity, ease: "linear" }}
          >
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-purple-500 rounded-full" />
             </div>
          </motion.div>
        ))}
     </div>

     <div className="flex gap-8 mt-12 z-10">
        {['Local AI Inference', 'Data Buffering', 'Protocol Conversion'].map((t, i) => (
           <span key={i} className="text-zinc-500 text-sm font-mono border border-zinc-800 px-4 py-2 rounded-lg bg-zinc-900/50">{t}</span>
        ))}
     </div>
  </div>
)

// --- P9: AI Vision (Redesigned: Camera UI) ---

export const AIModelSlide = () => (
  <div className="h-full flex items-center justify-center relative bg-black">
     {/* Camera UI Overlay */}
     <div className="absolute inset-0 z-20 pointer-events-none p-12 flex flex-col justify-between">
        <div className="flex justify-between items-start">
           <div className="bg-black/50 backdrop-blur px-4 py-1 rounded-full text-yellow-500 text-sm font-mono flex items-center gap-2">
             <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" /> AI_VISION_ACTIVE
           </div>
           <div className="text-white/50 font-mono text-xs">FPS: 58 | LATENCY: 24ms</div>
        </div>
        
        {/* Crosshair */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-white/20">
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-2 bg-white/50" />
           <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-2 bg-white/50" />
           <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-1 bg-white/50" />
           <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-1 bg-white/50" />
        </div>

        <div className="flex justify-between items-end">
           <div className="text-white/80 font-mono">
              <div className="text-4xl font-bold mb-1">98.5%</div>
              <div className="text-xs text-zinc-500">CONFIDENCE SCORE</div>
           </div>
           <div className="flex gap-2">
              <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center">
                 <IconScan className="text-white/50 w-6 h-6" />
              </div>
           </div>
        </div>
     </div>

     {/* Main Content */}
     <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="relative w-[800px] h-[600px]">
           <Image src="/images/ip/智慧农业3D图标-作物检测-细线版.png" alt="Crop" fill className="object-contain" />
           {/* Bounding Box */}
           <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             whileInView={{ opacity: 1, scale: 1 }}
             className="absolute top-[30%] left-[30%] w-[40%] h-[40%] border-2 border-yellow-500 rounded-lg shadow-[0_0_20px_rgba(234,179,8,0.3)]"
           >
              <div className="absolute -top-8 left-0 bg-yellow-500 text-black px-3 py-1 text-sm font-bold rounded-t-lg rounded-br-lg">
                 Anthracnose Detected
              </div>
           </motion.div>
        </div>
     </div>
  </div>
)

// --- P10: Voice Agent (Redesigned: Chat Interface) ---

export const VoiceInteractionSlide = () => (
  <div className="h-full flex flex-col items-center justify-center relative overflow-hidden bg-zinc-950">
     <StoryBackground mode="hope" />
     
     <div className="w-full max-w-2xl z-10 space-y-8">
        <div className="text-center mb-12">
           <h2 className="text-4xl font-medium text-white mb-2">自然语言交互</h2>
           <p className="text-zinc-500">就像和老朋友聊天一样简单</p>
        </div>

        {/* Chat Bubbles */}
        <div className="space-y-6">
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             className="flex justify-end"
           >
              <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl rounded-tr-none text-lg shadow-lg max-w-md">
                 "二号大棚现在的温度是多少？适合浇水吗？"
              </div>
           </motion.div>

           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.5 }}
             className="flex justify-start gap-4 items-end"
           >
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
                 <BotIcon className="w-6 h-6 text-white" />
              </div>
              <div className="bg-zinc-800 text-zinc-200 px-6 py-4 rounded-2xl rounded-tl-none text-lg shadow-lg max-w-md border border-white/5">
                 <p className="mb-2">当前温度 32°C，略高于适宜范围。</p>
                 <div className="flex gap-2 mt-3">
                    <button className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg text-sm text-white transition-colors">开启降温</button>
                    <button className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg text-sm text-white transition-colors">启动灌溉</button>
                 </div>
              </div>
           </motion.div>
        </div>

        {/* Voice Visualizer */}
        <div className="flex justify-center items-center gap-1 h-12 mt-12">
           {[...Array(5)].map((_, i) => (
             <motion.div
               key={i}
               className="w-1 bg-primary rounded-full"
               animate={{ height: [10, Math.random() * 40 + 10, 10] }}
               transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
             />
           ))}
        </div>
     </div>
  </div>
)

const BotIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
    <path d="M12 16v6" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="8" y1="22" x2="16" y2="22" />
  </svg>
)

// --- P11: Platform (Redesigned: Clean Mockup) ---

export const WebDashboardSlide = () => (
  <div className="h-full flex items-center justify-center relative bg-[#050505]">
     <StoryBackground mode="tech" />
     
     <div className="absolute top-12 left-0 w-full text-center z-10">
        <h2 className="text-4xl font-medium text-white mb-2">全景驾驶舱</h2>
        <p className="text-zinc-500">Web Dashboard</p>
     </div>

     <motion.div 
       initial={{ y: 50, opacity: 0 }}
       whileInView={{ y: 0, opacity: 1 }}
       transition={{ duration: 0.8 }}
       className="relative w-[85vw] max-w-6xl aspect-[16/9] z-10 mt-12"
     >
        {/* Browser Frame */}
        <div className="absolute inset-0 bg-zinc-900 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-zinc-800 ring-1 ring-white/10">
           {/* Header */}
           <div className="h-8 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/20" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
              <div className="w-3 h-3 rounded-full bg-green-500/20" />
           </div>
           {/* Content */}
           <div className="relative w-full h-[calc(100%-2rem)] bg-black">
              <Image src="/ui/dashboard-pc.png" alt="Dashboard" fill className="object-cover" />
           </div>
        </div>
        
        {/* Reflection */}
        <div className="absolute -bottom-10 left-0 right-0 h-40 bg-gradient-to-t from-transparent to-black z-20" />
     </motion.div>
  </div>
)

// --- P12: Mobile (Redesigned: Floating Devices) ---

export const MobileAppSlide = () => (
  <div className="h-full flex items-center justify-center relative bg-zinc-950">
     <div className="w-full max-w-6xl grid grid-cols-2 gap-20 items-center z-10 px-20">
        <div className="space-y-8">
           <Tag className="bg-primary/10 text-emerald-400 border-primary/20">Mobile First</Tag>
           <h2 className="text-7xl font-medium text-white">
             掌上农场
           </h2>
           <p className="text-2xl text-zinc-400 font-light">
             无论身在何处，<br/>
             农场状态触手可及。
           </p>
           <div className="flex gap-6 pt-4">
              <div className="flex items-center gap-3 text-zinc-300">
                 <IconRemind className="text-zinc-500" /> 实时告警推送
              </div>
              <div className="flex items-center gap-3 text-zinc-300">
                 <IconChartLine className="text-zinc-500" /> 远程设备控制
              </div>
           </div>
        </div>

        <div className="relative h-[600px] flex items-center justify-center">
           <motion.div 
             initial={{ y: 50, opacity: 0 }}
             whileInView={{ y: 0, opacity: 1 }}
             className="relative w-[300px] h-[600px] bg-zinc-900 rounded-[3rem] border-4 border-zinc-800 shadow-lg overflow-hidden ring-1 ring-white/10"
           >
              <Image src="/ui/dashboard-mobile.png" alt="App" fill className="object-cover" />
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-xl z-20" />
           </motion.div>
           
           {/* Decorative elements behind */}
           <div className="absolute inset-0 bg-primary/20 blur-[100px] -z-10 rounded-full" />
        </div>
     </div>
  </div>
)

// --- P13: Digital Twin (Clean) ---

export const VisualMonitorSlide = () => (
  <div className="h-full flex flex-col items-center justify-center relative bg-[#050505]">
     <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />
     
     <div className="z-10 text-center mb-12">
        <h2 className="text-5xl font-medium text-white mb-2">3D 数字孪生</h2>
        <p className="text-zinc-500">Real-time Simulation</p>
     </div>
     
     <div className="relative w-[900px] h-[500px] rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur overflow-hidden shadow-lg z-10">
        <div className="absolute inset-0 flex items-center justify-center">
           <IconBox className="w-32 h-32 text-primary/20 animate-spin-slow" />
           <div className="absolute text-primary font-mono text-xs tracking-widest mt-40">RENDERING...</div>
        </div>
        
        {/* UI Overlay */}
        <div className="absolute top-4 left-4 flex gap-4 text-xs font-mono text-zinc-500">
           <span>X: 102.45</span>
           <span>Y: 88.12</span>
           <span>Z: 12.00</span>
        </div>
     </div>
  </div>
)

// --- P14: Tech Stack (Logo Wall) ---

export const TechStackSlide = () => (
  <div className="h-full flex flex-col items-center justify-center relative px-20">
     <StoryBackground mode="tech" />
     
     <div className="text-center mb-20 z-10">
        <h2 className="text-5xl font-medium text-white">技术栈</h2>
     </div>

     <div className="grid grid-cols-4 gap-8 max-w-5xl w-full z-10">
        {[
           { icon: IconLayoutTwo, title: "Next.js 14", sub: "Frontend" },
           { icon: IconServer, title: "FastAPI", sub: "Backend" },
           { icon: IconDatabaseNetwork, title: "PostgreSQL", sub: "Database" },
           { icon: IconCpu, title: "ESP32", sub: "Embedded" },
           { icon: IconBox, title: "Docker", sub: "DevOps" },
           { icon: IconBrain, title: "PyTorch", sub: "AI Model" },
           { icon: IconChartLine, title: "MQTT", sub: "Protocol" },
           { icon: IconShield, title: "OAuth2", sub: "Security" },
        ].map((item, i) => (
           <BentoCard key={i} className="flex flex-col items-center text-center py-8 hover:bg-white/5 transition-colors cursor-default">
              <item.icon className="w-10 h-10 text-zinc-400 mb-4" />
              <div className="text-white font-medium mb-1">{item.title}</div>
              <div className="text-zinc-600 text-xs uppercase">{item.sub}</div>
           </BentoCard>
        ))}
     </div>
  </div>
)

// --- P15: Market (Big Numbers) ---

export const MarketSlide = () => (
  <div className="h-full flex items-center justify-center relative px-20">
     <StoryBackground mode="future" />
     
     <div className="grid grid-cols-2 gap-32 max-w-6xl w-full z-10 items-center">
        <div>
           <Tag className="mb-6 bg-purple-500/10 text-purple-400 border-purple-500/20">Market Size</Tag>
           <h2 className="text-[120px] font-medium text-white leading-none tracking-tight mb-4">
             $38B
           </h2>
           <p className="text-zinc-400 text-2xl">
             2025年全球智慧农业市场规模预测
           </p>
        </div>
        
        <div className="space-y-6">
           {[
              { title: "硬件销售", val: "30%", color: "bg-primary" },
              { title: "SaaS 订阅", val: "45%", color: "bg-emerald-500" },
              { title: "数据增值服务", val: "25%", color: "bg-purple-500" },
           ].map((item, i) => (
              <div key={i} className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className={cn("w-3 h-3 rounded-full", item.color)} />
                    <span className="text-lg text-zinc-300">{item.title}</span>
                 </div>
                 <span className="text-2xl font-bold text-white">{item.val}</span>
              </div>
           ))}
        </div>
     </div>
  </div>
)

// --- P16: Team (Clean Cards) ---

export const TeamSlide = () => (
  <div className="h-full flex flex-col items-center justify-center relative">
     <div className="text-center mb-16">
        <h2 className="text-5xl font-medium text-white mb-2">核心团队</h2>
        <p className="text-zinc-500">Multidisciplinary Experts</p>
     </div>
     
     <div className="flex gap-8 px-20 w-full max-w-[1400px] justify-center">
        {[
           { name: "Tech Lead", role: "Full Stack", color: "bg-emerald-500" },
           { name: "AI Lead", role: "Algorithm", color: "bg-purple-500" },
           { name: "IoT Lead", role: "Hardware", color: "bg-orange-500" },
           { name: "Design Lead", role: "Product", color: "bg-pink-500" },
        ].map((member, i) => (
           <div key={i} className="w-64 bg-zinc-900/50 border border-white/5 rounded-2xl p-6 flex flex-col items-center hover:translate-y-[-10px] transition-transform duration-300">
              <div className="w-24 h-24 rounded-full bg-zinc-800 mb-6 overflow-hidden relative">
                 <Image src={`/images/sticker/sticker (${i+1}).png`} alt="Member" fill className="object-cover" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
              <span className={cn("text-xs px-2 py-1 rounded text-white/80 mb-6", member.color)}>{member.role}</span>
              
              {/* Mini Skill Bars */}
              <div className="w-full space-y-2">
                 <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className={cn("h-full w-[90%]", member.color)} />
                 </div>
                 <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className={cn("h-full w-[80%]", member.color, "opacity-70")} />
                 </div>
              </div>
           </div>
        ))}
     </div>
  </div>
)

// --- P17: Roadmap (Horizontal) ---

export const RoadmapSlide = () => (
  <div className="h-full flex flex-col justify-center px-20 relative">
     <StoryBackground mode="future" />
     
     <div className="mb-20 z-10">
        <h2 className="text-5xl font-medium text-white">未来路线图</h2>
     </div>

     <div className="relative z-10 flex justify-between max-w-6xl w-full mx-auto">
        {/* Horizontal Line */}
        <div className="absolute top-8 left-0 w-full h-px bg-zinc-800 -z-10" />
        
        {[
           { year: "2024", title: "Pilot", desc: "验证核心算法与试点" },
           { year: "2025", title: "Scale", desc: "开源硬件与生态建设" },
           { year: "2026", title: "Global", desc: "普惠每一位新农人" },
        ].map((item, i) => (
           <div key={i} className="flex flex-col items-start w-64 group">
              <div className="w-4 h-4 bg-zinc-900 border-2 border-white rounded-full mb-8 group-hover:scale-125 transition-transform group-hover:bg-primary group-hover:border-primary" />
              <div className="text-4xl font-medium text-white mb-2">{item.year}</div>
              <div className="text-lg text-emerald-400 font-medium mb-2">{item.title}</div>
              <p className="text-zinc-500 leading-relaxed">{item.desc}</p>
           </div>
        ))}
     </div>
  </div>
)

// --- P18: Closing (Clean) ---

export const ClosingSlide = () => (
  <div className="h-full flex flex-col items-center justify-center relative text-center">
    <StoryBackground mode="hope" />
    <div className="relative z-10 flex flex-col items-center">
       <div className="mb-12">
          <IPAvatar pose="default" scale={1.2} animate={false} />
       </div>
       <h2 className="text-6xl font-medium text-white mb-8">用技能，定义未来</h2>
       <p className="text-xl text-zinc-400 tracking-widest uppercase mb-12">Master Skills, Change Worlds</p>
       <div className="px-8 py-3 rounded-full bg-white/5 border border-white/10 text-zinc-400 font-mono text-sm hover:bg-white/10 transition-colors cursor-pointer">
          stravision.ai
       </div>
    </div>
  </div>
)
