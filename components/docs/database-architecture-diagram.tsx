"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { IconArrowRight, IconBox, IconDatabaseNetwork, IconFileCode, IconHardDisk, IconHexagonOne, IconLayers, IconRefresh, IconServer, IconTime } from "@/components/icon";

const IP_IMAGES = {
    main: "/ip/草莓头IP-舞蹈姿势.png"
}

const DBNode = ({ icon, title, desc, type, className }: { icon: any, title: string, desc: string, type: string, className?: string }) => {
  return (
    <div className={cn(
        "relative group flex flex-col p-6 rounded-2xl border transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_0_30px_-10px_rgba(16,185,129,0.2)]",
        "border-zinc-800 bg-black/40 backdrop-blur-md hover:border-primary/30",
        className
    )}>
       {/* Holographic Edge */}
       <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
       
       <div className="flex items-start justify-between mb-4">
           <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
               {icon}
           </div>
           <span className="text-[10px] font-mono uppercase tracking-widest text-primary/50 border border-primary/10 px-2 py-1 rounded bg-primary/5">
               {type}
           </span>
       </div>

       <h4 className="text-lg font-bold text-white mb-2 font-jinbuti tracking-wide">{title}</h4>
       <p className="text-sm text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors">
           {desc}
       </p>
    </div>
  )
}

export function DatabaseArchitectureDiagram() {
  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8 relative">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16 relative z-10"
      >
        <h3 className="text-3xl md:text-4xl font-bold text-white font-jinbuti mb-2">
          Storage Architecture
        </h3>
        <p className="text-primary/60 text-xs font-mono uppercase tracking-[0.2em]">
          数据库存储架构设计
        </p>
      </motion.div>

      {/* Central IP Hub */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 opacity-10 pointer-events-none z-0">
          <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full" />
      </div>
      
      {/* Central Figure */}
      <motion.div 
         animate={{ y: [-10, 10] }}
         transition={{ duration: 4, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
         className="hidden lg:block absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 z-10 pointer-events-none opacity-80 mix-blend-screen"
      >
          <Image 
              src={IP_IMAGES.main} 
              alt="Database Guardian" 
              fill 
              className="object-contain drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]"
          />
      </motion.div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
         <DBNode 
            icon={<IconDatabaseNetwork className="w-6 h-6" />}
            title="关系型数据库"
            type="PostgreSQL"
            desc="存储结构化业务数据，包括用户档案、设备元数据、权限配置及系统设置。是系统的单一事实来源 (SSOT)。"
         />

         <DBNode 
            icon={<IconTime className="w-6 h-6" />}
            title="时序数据库"
            type="TimescaleDB"
            desc="高吞吐量存储传感器遥测数据。针对时间窗口查询、数据降采样和连续聚合进行了深度优化。"
            className="lg:-translate-y-8"
         />

         <DBNode 
            icon={<IconLayers className="w-6 h-6" />}
            title="向量数据库"
            type="pgvector"
            desc="存储高维向量嵌入，支持 RAG（检索增强生成），赋能 AI 助手进行知识库检索和历史上下文关联。"
         />

         <DBNode 
            icon={<IconRefresh className="w-6 h-6" />}
            title="缓存层"
            type="Redis"
            desc="内存数据结构存储，用于会话管理、实时设备状态缓存以及 API 速率限制（Rate Limiting）。"
         />

         <DBNode 
            icon={<IconHardDisk className="w-6 h-6" />}
            title="对象存储"
            type="MinIO / S3"
            desc="非结构化数据存储，用于托管摄像头快照、延时摄影视频、设备固件包以及用户头像资源。"
            className="lg:translate-y-8"
         />

         <DBNode 
            icon={<IconFileCode className="w-6 h-6" />}
            title="日志与审计"
            type="Elasticsearch"
            desc="集中式日志存储，涵盖系统事件、API 访问日志及安全审计轨迹。支持全文检索与异常检测。"
         />
      </div>
    </div>
  )
}
