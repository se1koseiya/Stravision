"use client"

import { motion } from "framer-motion"
import { Layers } from "@/components/animate-ui/icons/layers";
import { IconBrain, IconChartLine, IconCpu, IconServer, IconShield } from "@/components/icon";

const features = [
  {
    label: "Perception",
    title: "多模态融合感知",
    description: "视觉与传感器数据交叉验证，精准识别病害",
    icon: Layers,
    className: "col-span-1 md:col-span-1 lg:col-span-1",
    hasDots: true,
    glow: "border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)]"
  },
  {
    label: "Monitoring",
    title: "全栈环境监测",
    description: "覆盖空气、土壤、光照的全维度数据采集",
    icon: IconChartLine,
    className: "col-span-1 md:col-span-1 lg:col-span-1",
  },
  {
    label: "Automation",
    title: "智能决策引擎",
    description: "动态环境调控算法，自动管理水肥光气，实现全天候无人化精准种植",
    icon: IconCpu,
    className: "col-span-1 md:col-span-2 lg:col-span-2",
  },
  {
    label: "AI Assistant",
    title: "农业大模型专家",
    description: "基于 RAG 技术的智能顾问，提供实时的病害诊断与种植指导",
    icon: IconBrain,
    className: "col-span-1 md:col-span-2 lg:col-span-2",
  },
  {
    label: "Edge Computing",
    title: "边缘计算节点",
    description: "本地实时推理，断网亦可稳定运行",
    icon: IconServer,
    className: "col-span-1 md:col-span-1 lg:col-span-1",
  },
  {
    label: "Security",
    title: "企业级安全",
    description: "数据加密传输与存储，保障资产安全",
    icon: IconShield,
    className: "col-span-1 md:col-span-1 lg:col-span-1",
  },
]

const Dots = () => {
  const dots = Array.from({ length: 15 }).map((_, i) => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 2,
    duration: Math.random() * 2 + 2,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {dots.map((dot, i) => (
        <motion.div
          key={i}
          className="absolute bg-purple-500 rounded-full opacity-40"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: dot.size,
            height: dot.size,
          }}
          animate={{
            opacity: [0.2, 0.6, 0.2],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: dot.duration,
            repeat: Infinity,
            delay: dot.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-4 max-w-[1400px] mx-auto relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
          核心技术优势
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
          融合最前沿的物联网与人工智能技术，为现代农业赋能
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[240px]">
        {features.map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className={`
              relative group overflow-hidden rounded-2xl p-6 
              border transition-all duration-300
              flex flex-col justify-between
              ${feature.glow ? feature.glow : 'border-white/10 hover:border-white/20'}
              bg-black/20 backdrop-blur-sm
              ${feature.className}
            `}
          >
            {feature.hasDots && <Dots />}
            
            <div className="relative z-10">
              <div className="mb-3 text-white">
                <feature.icon size={28} />
              </div>
              <span className="text-sm font-medium text-muted-foreground tracking-wide">
                {feature.label}
              </span>
            </div>

            <div className="relative z-10 mt-auto">
              <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {feature.description}
              </p>
            </div>

            {/* Hover Gradient Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          </motion.div>
        ))}
      </div>
    </section>
  )
}
