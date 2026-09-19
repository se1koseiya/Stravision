"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { IconArrowDown, IconBrain, IconChartLine, IconCode, IconComment, IconDatabaseNetwork, IconFileText, IconGlobe, IconGridFour, IconLayers, IconLightning, IconLock, IconPeoples, IconPhone, IconRemind, IconServer, IconSetting, IconShield } from "@/components/icon";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

// IP Images
const IP_IMAGES = {
  access: "/ip/草莓头IP-坐姿玩手机.png",
  business: "/ip/草莓头IP-招手姿势.png",
  support: "/ip/草莓头IP-奔跑姿势.png"
}

const ModuleBox = ({ icon, title, items, isActive = false }: { icon: any, title: string, items: string[], isActive?: boolean }) => {
  return (
    <motion.div 
      variants={itemVariants}
      className={cn(
        "relative flex flex-col p-5 rounded-2xl border transition-all duration-300 group overflow-hidden",
        "border-primary/10 bg-black/40 backdrop-blur-md hover:bg-primary/5 hover:border-primary/30"
      )}
    >
      {/* Active Glow */}
      {isActive && (
          <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none" />
      )}
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 relative z-10">
        <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
            {icon}
        </div>
        <span className="font-bold font-jinbuti tracking-wide text-zinc-100 group-hover:text-emerald-400 transition-colors">{title}</span>
      </div>

      {/* Items */}
      <div className="grid grid-cols-2 gap-y-2 gap-x-4 relative z-10">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px] md:text-xs text-zinc-500 group-hover:text-zinc-300 font-mono transition-colors">
            <div className="w-1 h-1 rounded-full bg-primary/50" />
            {item}
          </div>
        ))}
      </div>

      {/* Decor */}
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
    </motion.div>
  )
}

const LayerSection = ({ title, icon, children, ipImage, ipPosition = "right" }: { title: string, icon: any, children: React.ReactNode, ipImage?: string, ipPosition?: "left" | "right" }) => {
    return (
        <div className="relative border border-primary/10 rounded-3xl p-6 md:p-8 bg-zinc-900/20 backdrop-blur-sm">
            {/* Layer Label */}
            <div className="absolute -top-3 left-8 px-4 py-1 bg-[#050505] border border-primary/20 rounded-full flex items-center gap-2">
                {icon}
                <span className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">
                    {title}
                </span>
            </div>

            {/* IP Decor */}
            {ipImage && (
                <div className={cn(
                    "absolute -bottom-4 w-24 h-24 hidden md:block opacity-80 grayscale hover:grayscale-0 transition-all duration-500 pointer-events-none z-20",
                    ipPosition === "right" ? "-right-4" : "-left-4"
                )}>
                    <Image 
                        src={ipImage} 
                        alt="Mascot" 
                        fill 
                        className="object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" 
                    />
                </div>
            )}

            {children}
        </div>
    )
}

const FlowArrow = () => (
    <div className="flex justify-center -my-4 relative z-10">
        <div className="w-px h-8 bg-gradient-to-b from-primary/0 via-emerald-500/50 to-emerald-500/0" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
             <IconArrowDown className="w-4 h-4 text-primary/50 animate-bounce" />
        </div>
    </div>
)

export function LogicalArchitectureDiagram() {
  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-8">
       <motion.div 
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h3 className="text-3xl md:text-4xl font-bold text-white font-jinbuti mb-2">
          System Logical Architecture
        </h3>
        <p className="text-primary/60 text-xs font-mono uppercase tracking-[0.2em]">
          系统总体逻辑架构设计
        </p>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="flex flex-col gap-8"
      >
        {/* 1. Access Layer */}
        <LayerSection 
            title="Access Layer / 接入层" 
            icon={<IconGlobe className="w-3 h-3 text-primary" />}
            ipImage={IP_IMAGES.access}
            ipPosition="right"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-4 md:pl-0 pr-4 md:pr-12">
             <div className="group p-4 rounded-xl border border-zinc-800 bg-black/40 flex items-center justify-between hover:border-primary/40 transition-all cursor-default">
                <div className="flex items-center gap-3">
                    <IconGlobe className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-300 group-hover:text-white">Web 门户端</span>
                        <span className="text-[10px] text-zinc-600 font-mono">React / Next.js</span>
                    </div>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
             </div>

             <div className="group p-4 rounded-xl border border-zinc-800 bg-black/40 flex items-center justify-between hover:border-primary/40 transition-all cursor-default">
                <div className="flex items-center gap-3">
                    <IconPhone className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-300 group-hover:text-white">移动端 App</span>
                        <span className="text-[10px] text-zinc-600 font-mono">iOS / Android / PWA</span>
                    </div>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse delay-75" />
             </div>

             <div className="group p-4 rounded-xl border border-zinc-800 bg-black/40 flex items-center justify-between hover:border-primary/40 transition-all cursor-default">
                <div className="flex items-center gap-3">
                    <IconGridFour className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-300 group-hover:text-white">管理控制台</span>
                        <span className="text-[10px] text-zinc-600 font-mono">System Management</span>
                    </div>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse delay-150" />
             </div>
          </div>
        </LayerSection>

        <FlowArrow />

        {/* 2. Gateway Layer */}
        <div className="relative group">
           <div className="absolute inset-0 bg-primary/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
           <div className="relative p-1 rounded-2xl bg-gradient-to-r from-zinc-800 via-emerald-500/30 to-zinc-800">
               <div className="bg-[#050505] rounded-xl px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                     <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <IconShield className="w-6 h-6" />
                     </div>
                     <div className="flex flex-col">
                        <span className="font-bold text-white font-jinbuti tracking-wide">API 网关</span>
                        <span className="text-[10px] text-primary/60 font-mono uppercase tracking-widest">安全过滤 & 流量分发</span>
                     </div>
                  </div>
                  
                  <div className="flex flex-wrap justify-center gap-2 md:gap-6">
                     {["SSL/TLS 卸载", "速率限制", "鉴权守卫", "负载均衡"].map((item, i) => (
                         <span key={i} className="px-2 py-1 rounded text-[10px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800">
                            {item}
                         </span>
                     ))}
                  </div>
               </div>
           </div>
        </div>

        <FlowArrow />

        {/* 3. Business Service Layer */}
        <LayerSection 
            title="Business Layer / 业务层" 
            icon={<IconCode className="w-3 h-3 text-primary" />}
            ipImage={IP_IMAGES.business}
            ipPosition="left"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pl-4 md:pl-12 pr-4 md:pr-0">
             <ModuleBox 
                icon={<IconBrain className="w-5 h-5" />}
                title="AI 核心服务"
                items={["视觉分析", "决策智能体", "问答机器人", "产量预测"]}
                isActive
             />
             <ModuleBox 
                icon={<IconLightning className="w-5 h-5" />}
                title="设备 IoT 服务"
                items={["状态监测", "远程控制", "设备影子", "OTA 升级"]}
             />
             <ModuleBox 
                icon={<IconChartLine className="w-5 h-5" />}
                title="数据中台"
                items={["数据清洗", "聚合统计", "报表生成", "异常告警"]}
             />
             <ModuleBox 
                icon={<IconPeoples className="w-5 h-5" />}
                title="用户中心"
                items={["身份认证 (IAM)", "RBAC 权限", "个人档案", "消息通知"]}
             />
          </div>
        </LayerSection>

        <FlowArrow />

        {/* 4. Support Layer */}
        <LayerSection 
            title="Support Layer / 支撑层" 
            icon={<IconServer className="w-3 h-3 text-primary" />}
            ipImage={IP_IMAGES.support}
            ipPosition="right"
        >
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pl-4 md:pl-0 pr-4 md:pr-12">
              {[
                  { title: "消息队列", sub: "RabbitMQ / MQTT" },
                  { title: "任务调度", sub: "Cron / Job" },
                  { title: "日志服务", sub: "ELK Stack" },
                  { title: "缓存服务", sub: "Redis Cluster" }
              ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-800 bg-black/40 hover:bg-primary/5 hover:border-primary/20 transition-colors">
                      <span className="text-xs font-bold text-zinc-300">{item.title}</span>
                      <span className="text-[10px] text-zinc-600 font-mono mt-1">{item.sub}</span>
                  </div>
              ))}
           </div>
        </LayerSection>

      </motion.div>
    </div>
  )
}
