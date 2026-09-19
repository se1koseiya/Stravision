"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { IconAddUser, IconArrowRight, IconChartLine, IconCheckOne, IconComment, IconFileText, IconMicrophone, IconPhone, IconScan, IconShield, IconTrendingUp, IconWifi } from "@/components/icon";

const IP_IMAGES = {
    auth: "/ip/草莓头IP-招手姿势.png",
    device: "/ip/草莓头IP-坐姿玩手机.png",
    interact: "/ip/草莓头IP-舞蹈姿势.png",
    insight: "/ip/草莓头IP-跳跃姿势.png"
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 }
}

const StepCard = ({ 
    step, 
    title, 
    desc, 
    icon, 
    subItems, 
    ipImage,
    isLast = false 
}: { 
    step: string, 
    title: string, 
    desc: string, 
    icon: any, 
    subItems: string[], 
    ipImage: string,
    isLast?: boolean 
}) => {
    return (
        <motion.div variants={itemVariants} className="flex-1 relative">
            <div className="relative z-10 h-full flex flex-col">
                {/* Number Badge */}
                <div className="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-zinc-900 border border-primary/30 flex items-center justify-center text-primary font-mono font-bold shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)] z-20">
                    {step}
                </div>

                {/* Card Content */}
                <div className="flex-1 p-6 pt-8 rounded-2xl border border-zinc-800 bg-black/40 backdrop-blur-md hover:border-primary/30 transition-all duration-300 group overflow-hidden">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-primary">
                            {icon}
                        </div>
                        {/* IP Image */}
                        <div className="w-16 h-16 relative opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 grayscale group-hover:grayscale-0">
                            <Image 
                                src={ipImage} 
                                alt={title} 
                                fill 
                                className="object-contain"
                            />
                        </div>
                    </div>

                    <h4 className="text-xl font-bold text-white mb-2 font-jinbuti">{title}</h4>
                    <p className="text-xs text-zinc-500 mb-6 leading-relaxed h-10">{desc}</p>

                    {/* Sub Items */}
                    <div className="space-y-3">
                        {subItems.map((item, i) => (
                            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5 group-hover:border-primary/10 transition-colors">
                                <IconCheckOne className="w-4 h-4 text-primary/50 group-hover:text-primary transition-colors" />
                                <span className="text-xs text-zinc-300 font-mono">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Connector Arrow */}
            {!isLast && (
                <div className="hidden lg:flex absolute top-1/2 -right-6 w-12 items-center justify-center z-0 -translate-y-1/2">
                    <motion.div 
                        animate={{ x: [0, 5, 0], opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <IconArrowRight className="w-6 h-6 text-primary/50" />
                    </motion.div>
                </div>
            )}
            
            {/* Mobile Connector */}
            {!isLast && (
                 <div className="lg:hidden flex justify-center py-4">
                    <IconArrowRight className="w-6 h-6 text-primary/30 rotate-90" />
                 </div>
            )}
        </motion.div>
    )
}

export function UserFlowDiagram() {
  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h3 className="text-3xl md:text-4xl font-bold text-white font-jinbuti mb-2">
          User Business Flow
        </h3>
        <p className="text-primary/60 text-xs font-mono uppercase tracking-[0.2em]">
          用户全链路业务逻辑
        </p>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="flex flex-col lg:flex-row gap-4 lg:gap-12"
      >
        <StepCard 
            step="01"
            title="接入与认证"
            desc="用户通过多端入口进入平台，完成身份核验与权限获取。"
            icon={<IconAddUser className="w-6 h-6" />}
            ipImage={IP_IMAGES.auth}
            subItems={[
                "手机号/微信一键登录",
                "实名/企业认证 (KYC)",
                "获取 Access Token",
                "建立 SSE 长连接"
            ]}
        />

        <StepCard 
            step="02"
            title="设备配网"
            desc="将物理设备接入云端，建立数字孪生映射关系。"
            icon={<IconScan className="w-6 h-6" />}
            ipImage={IP_IMAGES.device}
            subItems={[
                "扫描设备二维码",
                "蓝牙/AP 辅助配网",
                "绑定大棚/区域",
                "初始化设备参数"
            ]}
        />

        <StepCard 
            step="03"
            title="交互与控制"
            desc="通过可视化界面或 AI 语音助手，实时管控农业现场。"
            icon={<IconMicrophone className="w-6 h-6" />}
            ipImage={IP_IMAGES.interact}
            subItems={[
                "实时视频/数据监控",
                "AI 语音指令下发",
                "远程反控 (水泵/风机)",
                "异常告警推送"
            ]}
        />

        <StepCard 
            step="04"
            title="决策与洞察"
            desc="基于历史数据与 AI 模型，获取种植建议与生长报告。"
            icon={<IconTrendingUp className="w-6 h-6" />}
            ipImage={IP_IMAGES.insight}
            isLast
            subItems={[
                "生成生长周期报表",
                "AI 病虫害诊断",
                "光合作用分析 (PAR)",
                "产量预测模型"
            ]}
        />
      </motion.div>
    </div>
  )
}
