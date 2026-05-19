"use client"

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { useRef, useState } from "react"
import BerryOrb from "@/components/smoothui/berry-orb"
import { ChevronRight } from "lucide-react"

export function Warning() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  })

  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "40%"])
  const yContent = useTransform(scrollYProgress, [0, 1], ["5%", "-5%"])

  const [activeTab, setActiveTab] = useState(0)

  const tabs = [
    {
      id: "perception",
      label: "环境感知",
      title: "多模态环境感知",
      subtitle: "Multimodal Perception",
      description: "融合温湿度、光照、土壤传感器及高清摄像头视觉数据，AI 为您的温室构建高精度的实时数字孪生。",
      icon: "/glassyicons/Camera.png",
      color: "blue",
      metrics: [
        { label: "传感器通道", value: "12", unit: "CH" },
        { label: "采样频率", value: "500", unit: "ms" },
        { label: "视觉精度", value: "98.7", unit: "%" },
      ]
    },
    {
      id: "agent",
      label: "智能协同",
      title: "多智能体专家协同",
      subtitle: "Multi-Agent Collaboration",
      description: "农业知识Agent、设备调度Agent、数据分析Agent协同工作，面对复杂环境变化迅速推演最优应对策略。",
      icon: "/glassyicons/Users.png",
      color: "purple",
      metrics: [
        { label: "专家模型", value: "6", unit: "个" },
        { label: "推理延迟", value: "<2", unit: "s" },
        { label: "决策准确率", value: "96.3", unit: "%" },
      ]
    },
    {
      id: "control",
      label: "闭环控制",
      title: "全自动闭环控制",
      subtitle: "Closed-loop Control",
      description: "抛弃繁琐的 IFTTT 条件设置。AI 直接理解自然语言意图，自动翻译为底层 IoT 指令并立刻执行。",
      icon: "/glassyicons/Auto.png",
      color: "teal",
      metrics: [
        { label: "指令响应", value: "<500", unit: "ms" },
        { label: "设备覆盖", value: "200", unit: "+" },
        { label: "执行成功率", value: "99.2", unit: "%" },
      ]
    }
  ]

  const colorMap: Record<string, { bg: string; text: string; light: string; border: string; ring: string }> = {
    blue: { bg: "bg-blue-500", text: "text-blue-600", light: "bg-blue-50", border: "border-blue-200", ring: "ring-blue-500/20" },
    purple: { bg: "bg-purple-500", text: "text-purple-600", light: "bg-purple-50", border: "border-purple-200", ring: "ring-purple-500/20" },
    teal: { bg: "bg-teal-500", text: "text-teal-600", light: "bg-teal-50", border: "border-teal-200", ring: "ring-teal-500/20" },
  }

  const active = tabs[activeTab]
  const colors = colorMap[active.color]

  // Bar chart data — simulating AI processing growth
  const barData = [
    { year: "Jan", ai: 35, manual: 65 },
    { year: "Mar", ai: 50, manual: 55 },
    { year: "May", ai: 62, manual: 48 },
    { year: "Jul", ai: 78, manual: 40 },
    { year: "Sep", ai: 88, manual: 35 },
    { year: "Nov", ai: 95, manual: 28 },
  ]
  const maxVal = 100

  return (
    <section ref={ref} className="relative w-full pt-0 pb-32 flex flex-col items-center justify-center overflow-hidden z-20">

      {/* Background Image (Grass & Water) */}
      <motion.div style={{ y: yBg }} className="absolute inset-0 z-0 pointer-events-none w-full h-[140%] -top-[20%]">
        <Image
          src="/images/grass_water.png"
          alt="Landscape Background"
          fill
          className="object-cover object-bottom"
          priority
        />
        {/* Top Gradient to blend with previous white section */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-slate-50 to-transparent" />
      </motion.div>

      {/* Main Container */}
      <motion.div
        style={{ y: yContent }}
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, delay: 0.1 }}
        className="relative z-10 w-full max-w-6xl mx-auto px-4"
      >
        <div className="bg-white/50 backdrop-blur-2xl rounded-[2.5rem] p-5 md:p-8 shadow-[0_32px_80px_rgba(0,0,0,0.08)] border border-white/70 flex flex-col lg:flex-row gap-6 min-h-[560px]">

          {/* ============ LEFT COLUMN ============ */}
          <div className="w-full lg:w-[42%] flex flex-col gap-5">

            {/* Top Card — Hero Image with BerryOrb */}
            <div className="relative w-full h-56 rounded-[1.8rem] overflow-hidden bg-gradient-to-br from-blue-100/80 to-teal-50/60 p-7 flex flex-col justify-end">
              <Image
                src="/images/exact/features1.jpg"
                alt="Smart Agriculture"
                fill
                className="object-cover opacity-50 mix-blend-multiply filter contrast-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />

              {/* Floating BerryOrb */}
              <div className="absolute top-4 left-5 z-20">
                <BerryOrb size="48px" theme="light" isActive={true} />
              </div>

              <div className="relative z-10">
                <p className="text-white font-bold text-lg md:text-xl leading-snug tracking-tight">
                  AI 原生架构，<br />
                  让每一台设备都拥有<br />
                  <span className="text-blue-200">智慧大脑。</span>
                </p>
              </div>
            </div>

            {/* Bottom Card — AI Processing Bar Chart */}
            <div className="w-full flex-1 rounded-[1.8rem] bg-white/70 backdrop-blur-lg border border-gray-100 p-6 flex flex-col shadow-sm">
              {/* Chart Legend */}
              <div className="flex items-center gap-5 mb-4">
                <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-400" /> AI 自动决策
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-sm bg-gray-200" /> 人工干预
                </div>
              </div>

              {/* Y-axis + Bars */}
              <div className="flex-1 flex items-end gap-0 relative">
                {/* Y-axis labels */}
                <div className="absolute -left-1 bottom-0 top-0 flex flex-col justify-between text-[9px] text-gray-400 font-medium py-1 pr-2">
                  <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0</span>
                </div>

                {/* Bars */}
                <div className="flex-1 flex items-end justify-between gap-2 pl-8 h-full border-l border-b border-gray-100">
                  {barData.map((d, i) => (
                    <div key={d.year} className="flex flex-col items-center gap-1 flex-1">
                      <div className="w-full flex flex-col items-center gap-[2px] h-[140px] justify-end">
                        {/* Manual bar (gray, behind) */}
                        <motion.div
                          className="w-full max-w-[28px] bg-gray-100 rounded-t-md"
                          initial={{ height: 0 }}
                          whileInView={{ height: `${(d.manual / maxVal) * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, delay: 0.3 + i * 0.08 }}
                        />
                        {/* AI bar (colored) */}
                        <motion.div
                          className="w-full max-w-[28px] bg-gradient-to-t from-blue-400 to-teal-300 rounded-t-md"
                          initial={{ height: 0 }}
                          whileInView={{ height: `${(d.ai / maxVal) * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, delay: 0.4 + i * 0.08 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* X-axis labels */}
              <div className="flex justify-between pl-8 mt-2">
                {barData.map(d => (
                  <span key={d.year} className="text-[10px] text-gray-400 font-medium flex-1 text-center">{d.year}</span>
                ))}
              </div>
            </div>
          </div>

          {/* ============ RIGHT COLUMN ============ */}
          <div className="w-full lg:w-[58%] bg-white/70 backdrop-blur-lg rounded-[1.8rem] p-6 md:p-8 border border-gray-100 shadow-sm flex flex-col">

            {/* Tab Bar */}
            <div className="flex gap-2 mb-8 bg-gray-50 rounded-2xl p-1.5">
              {tabs.map((tab, idx) => {
                const isActive = activeTab === idx
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(idx)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                      isActive
                        ? "bg-white text-gray-900 shadow-md"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Image src={tab.icon} alt={tab.label} width={16} height={16} className="w-4 h-4 object-contain" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Active Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex-1 flex flex-col"
              >
                {/* Title */}
                <div className="mb-6">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3 ${colors.light} ${colors.text} ${colors.border} border`}>
                    <Image src={active.icon} alt={active.subtitle} width={12} height={12} className="w-3 h-3 object-contain" />
                    {active.subtitle}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-gray-900 font-alimama tracking-tight mb-3">
                    {active.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-sm">
                    {active.description}
                  </p>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                  {active.metrics.map((m, i) => (
                    <motion.div
                      key={m.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100"
                    >
                      <div className="text-2xl font-black text-gray-900 tracking-tighter">
                        {m.value}<span className="text-sm font-semibold text-gray-400 ml-0.5">{m.unit}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 font-medium mt-1">{m.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Live Simulation Area */}
                <div className={`flex-1 rounded-2xl p-5 border ${colors.border} ${colors.light} relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent" />

                  {activeTab === 0 && (
                    <div className="relative z-10 flex flex-col gap-3">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">实时数据流</div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { icon: "/glassyicons/Weather.png", label: "温度", val: "24.8°C" },
                          { icon: "/glassyicons/Health.png", label: "湿度", val: "67.2%" },
                          { icon: "/glassyicons/Moon.png", label: "光照", val: "32.4k Lux" },
                          { icon: "/glassyicons/Sygnal.png", label: "土壤EC", val: "1.8 mS" },
                        ].map((sensor) => (
                          <div key={sensor.label} className="bg-white/80 rounded-xl p-3 flex items-center gap-3 border border-white">
                            <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
                              <Image src={sensor.icon} alt={sensor.label} width={48} height={48} className="w-full h-full object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] text-gray-400 font-medium">{sensor.label}</div>
                              <div className="text-sm font-bold text-gray-900 truncate">{sensor.val}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 1 && (
                    <div className="relative z-10 flex flex-col gap-3">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Agent 协作链</div>
                      <div className="flex flex-col gap-2">
                        {[
                          { name: "环境分析 Agent", status: "分析完成", progress: 100 },
                          { name: "策略规划 Agent", status: "推理中...", progress: 72 },
                          { name: "设备调度 Agent", status: "等待中", progress: 0 },
                        ].map((agent) => (
                          <div key={agent.name} className="bg-white/80 rounded-xl p-3 border border-white">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Cpu size={14} className="text-purple-500" strokeWidth={2.5} />
                                <span className="text-sm font-bold text-gray-900">{agent.name}</span>
                              </div>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                agent.progress === 100 ? "bg-green-100 text-green-700" :
                                agent.progress > 0 ? "bg-purple-100 text-purple-700 animate-pulse" :
                                "bg-gray-100 text-gray-500"
                              }`}>
                                {agent.status}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${agent.progress}%` }}
                                transition={{ duration: 1, delay: 0.3 }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 2 && (
                    <div className="relative z-10 flex flex-col gap-3">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">指令执行流</div>
                      <div className="flex flex-col gap-2">
                        {/* User Input */}
                        <div className="bg-white/80 rounded-xl p-3 border border-white flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0 mt-0.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-400 font-medium mb-0.5">用户指令</div>
                            <div className="text-sm text-gray-800 font-medium">"今天太阳大，帮我降温保湿"</div>
                          </div>
                        </div>
                        {/* AI Parsing */}
                        <div className="flex items-center justify-center">
                          <motion.div
                            animate={{ y: [0, 3, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="flex items-center gap-2 text-teal-500 text-xs font-semibold"
                          >
                            <ChevronRight size={14} className="rotate-90" />
                            AI 意图解析 → IoT 指令
                          </motion.div>
                        </div>
                        {/* Device Commands */}
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { cmd: "展开遮阳网", device: "遮阳系统" },
                            { cmd: "开启雾化喷头", device: "加湿系统" },
                          ].map((item) => (
                            <div key={item.cmd} className="bg-teal-500 rounded-xl p-3 text-white">
                              <div className="text-[9px] opacity-70 font-medium mb-0.5">{item.device}</div>
                              <div className="text-sm font-bold flex items-center justify-between">
                                {item.cmd}
                                <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </motion.div>

    </section>
  )
}
