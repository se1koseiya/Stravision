"use client"

import { motion, useScroll, useTransform, AnimatePresence, useSpring } from "framer-motion"
import Image from "next/image"
import { useRef, useState } from "react"
import BerryOrb from "@/components/smoothui/berry-orb"
import { IconCpu, IconRight } from "@/components/icon";

export function Warning() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start start"]
  })

  // Add high-end physical damping (smooth scroll progress)
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 50,
    damping: 25,
    restDelta: 0.001
  })

  // High-impact canvas expansion and camera entry effects - Now all compressed into [0, 1]
  // Since offset is "start end" to "start start", progress=1 means the top of the section just hit the top of screen.
  const containerScale = useTransform(smoothProgress, [0.1, 0.7], [0.4, 1])
  const containerRotateX = useTransform(smoothProgress, [0.1, 0.7], [25, 0])
  const containerZ = useTransform(smoothProgress, [0.1, 0.7], [-500, 0])
  const containerRadius = useTransform(smoothProgress, [0.3, 0.7], ["120px", "40px"])
  const containerBlur = useTransform(smoothProgress, [0.1, 0.5], ["blur(20px)", "blur(0px)"])
  
  // Brightness/Flash effect
  const flashOpacity = useTransform(smoothProgress, [0.5, 0.65, 0.8], [0, 0.6, 0])
  
  // Content reveal (explosive scale-in)
  const contentOpacity = useTransform(smoothProgress, [0.65, 0.95], [0, 1])
  const contentScale = useTransform(smoothProgress, [0.65, 0.95], [0.85, 1])
  const contentY = useTransform(smoothProgress, [0.65, 0.95], [60, 0])
  
  // Background image dynamic zoom
  const bgScale = useTransform(smoothProgress, [0.1, 0.8], [1.6, 1])
  const bgOpacity = useTransform(smoothProgress, [0, 0.2], [0, 1])

  // Aurora glow behind the canvas
  const glowScale = useTransform(smoothProgress, [0.2, 0.7], [0.8, 1.2])
  const glowOpacity = useTransform(smoothProgress, [0.1, 0.4, 0.9], [0, 0.8, 0.2])

  const [activeTab, setActiveTab] = useState(0)

  const tabs = [
    {
      id: "perception",
      label: "环境感知",
      title: "多模态环境感知",
      subtitle: "多模态感知",
      description: "融合温湿度、光照、土壤传感器及高清摄像头视觉数据，AI 为您的温室构建高精度的实时数字孪生。",
      icon: "/glassyicons/Camera.png",
      color: "blue",
      metrics: [ 
        { label: "传感器通道", value: "12", unit: "路" },
        { label: "采样频率", value: "500", unit: "毫秒" },
        { label: "视觉精度", value: "98.7", unit: "%" },
      ]
    },
    {
      id: "agent",
      label: "报告生成",
      title: "智能种植报告生成",
      subtitle: "报告生成",
      description: "基于海量环境数据与生长视觉分析，AI 自动生成多维度种植报告，包含生长进度预测、病虫害预警及产量估算建议。",
      icon: "/glassyicons/Design.png",
      color: "purple",
      metrics: [ 
        { label: "报告维度", value: "8", unit: "项" },
        { label: "生成速度", value: "<5", unit: "秒" },
        { label: "分析精度", value: "94.8", unit: "%" },
      ]
    },
    {
      id: "control",
      label: "闭环控制",
      title: "全自动闭环控制",
      subtitle: "闭环控制",
      description: "抛弃繁琐的条件设置。AI 直接理解自然语言意图，自动翻译为底层 IoT 指令并立刻执行。",
      icon: "/glassyicons/Auto.png",
      color: "teal",
      metrics: [ 
        { label: "指令响应", value: "<500", unit: "毫秒" },
        { label: "设备覆盖", value: "200", unit: "台" },
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
    <section ref={ref} className="relative w-full h-[160vh] z-20 bg-white" style={{ perspective: '2000px' }}>
      <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden px-4 md:px-8">
        
        {/* The Aurora Glow Background */}
        <motion.div
          style={{
            scale: glowScale,
            opacity: glowOpacity,
          }}
          className="absolute w-[80vw] h-[80vh] bg-gradient-to-r from-blue-400/30 via-teal-300/30 to-purple-400/30 blur-[120px] rounded-full z-0"
        />

        {/* The Expanding Canvas Container */}
        <motion.div 
          style={{ 
            scale: containerScale, 
            rotateX: containerRotateX,
            z: containerZ,
            borderRadius: containerRadius,
            filter: containerBlur,
            opacity: bgOpacity 
          }}
          className="relative w-full max-w-7xl aspect-[16/10] md:aspect-video lg:h-[85vh] overflow-hidden shadow-[0_60px_150px_rgba(0,0,0,0.3)] bg-slate-900 z-10"
        >
          {/* Background Image - Dynamic Zoom */}
          <motion.div style={{ scale: bgScale }} className="absolute inset-0 z-0">
            <Image
              src="/images/grass_water.png"
              alt="Landscape Background"
              fill
              className="object-cover object-center"
              priority
            />
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/15 backdrop-blur-[1px]" />
          </motion.div>

          {/* Impact Flash Overlay */}
          <motion.div 
            style={{ opacity: flashOpacity }}
            className="absolute inset-0 bg-white z-20 pointer-events-none mix-blend-overlay"
          />

          {/* Main Content Area - Explosive reveal */}
          <motion.div
            style={{ 
              opacity: contentOpacity,
              scale: contentScale,
              y: contentY
            }}
            className="relative z-30 w-full h-full flex items-center justify-center p-4 md:p-8 pt-20"
          >
            <div className="bg-white/60 backdrop-blur-3xl rounded-[3rem] p-8 md:p-12 shadow-[0_40px_120px_rgba(0,0,0,0.1)] border border-white/80 flex flex-col lg:flex-row gap-12 w-full max-w-7xl max-h-full overflow-y-auto lg:overflow-visible custom-scrollbar relative">
              
              {/* Decorative Background Noise/Grain Effect */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

              {/* ============ LEFT COLUMN: Editorial Style ============ */}
              <div className="w-full lg:w-[40%] flex flex-col">
                <div className="mb-12">
                  <span className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600 mb-4 block">系统架构设计</span>
                  <h2 className="text-4xl md:text-5xl font-black text-gray-900 font-alimama tracking-tight leading-[1.1] mb-6">
                    从边缘感知<br/>到云端决策
                  </h2>
                  <div className="w-12 h-1 bg-gray-900 mb-8" />
                  <p className="text-gray-500 text-lg font-medium leading-relaxed max-w-sm">
                    打破传统温室的封闭性。我们构建了一套自愈式农业系统，让数据在毫秒间转化为生长动力。
                  </p>
                </div>

                {/* Integrated Feature Image */}
                <div className="relative w-full aspect-[4/5] rounded-[2.5rem] overflow-hidden group">
                  <Image
                    src="/images/exact/features1.jpg"
                    alt="智慧农业"
                    fill
                    className="object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent" />
                  
                  {/* Floating BerryOrb - Minimalist placement */}
                  <div className="absolute bottom-8 left-8 z-20 flex items-center gap-4">
                    <BerryOrb size="56px" theme="dark" isActive={true} />
                    <div className="text-white">
                      <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">运行状态</div>
                      <div className="text-sm font-bold tracking-tight">AI 引擎运行中</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ============ RIGHT COLUMN: Minimalist Data ============ */}
              <div className="w-full lg:w-[60%] flex flex-col">
                
                {/* Minimalist Tab Switcher */}
                <div className="flex gap-8 mb-12 border-b border-gray-100 pb-2">
                  {tabs.map((tab, idx) => {
                    const isActive = activeTab === idx
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(idx)}
                        className={`relative py-2 text-sm font-black tracking-tight transition-all ${
                          isActive ? "text-gray-900" : "text-gray-300 hover:text-gray-500"
                        }`}
                      >
                        {tab.label}
                        {isActive && (
                          <motion.div layoutId="activeTabUnderline" className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-blue-600 rounded-full pointer-events-none" />
                        )}
                      </button>
                    )
                  })}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="flex-1 flex flex-col"
                  >
                    {/* Editorial Content */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
                      <div>
                        <h3 className="text-3xl font-black text-gray-900 font-alimama tracking-tighter mb-4">
                          {active.title}
                        </h3>
                        <p className="text-gray-500 font-medium leading-relaxed">
                          {active.description}
                        </p>
                      </div>
                      <div className="flex flex-col gap-6">
                        {active.metrics.map((m, i) => (
                          <div key={m.label} className="flex items-baseline justify-between border-b border-gray-50 pb-2">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{m.label}</span>
                            <span className="text-xl font-black text-gray-900 font-alimama">
                              {m.value}<span className="text-xs text-gray-400 ml-1">{m.unit}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Architectural Visualization - No more generic cards */}
                    <div className="flex-1 bg-gray-50/50 rounded-[2.5rem] p-10 border border-gray-100 relative group overflow-hidden">
                      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <IconCpu size={120} strokeWidth={1} />
                      </div>

                      {activeTab === 0 && (
                        <div className="relative z-10 grid grid-cols-2 gap-12">
                          {[
                            { label: "环境数据", sensors: [
                              { name: "空气温度", val: "24.8°C" },
                              { name: "相对湿度", val: "67.2%" }
                            ]},
                            { label: "土壤与光照", sensors: [
                              { name: "光照强度", val: "32.4k" },
                              { name: "土壤电导率", val: "1.8 mS" }
                            ]}
                          ].map((group) => (
                            <div key={group.label}>
                              <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-6">{group.label}</div>
                              <div className="flex flex-col gap-8">
                                {group.sensors.map(s => (
                                  <div key={s.name}>
                                    <div className="text-3xl font-black text-gray-900 font-alimama tracking-tight mb-1">{s.val}</div>
                                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{s.name}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {activeTab === 1 && (
                        <div className="relative z-10 flex flex-col">
                          <div className="text-[10px] font-black text-purple-600 uppercase tracking-[0.3em] mb-8 text-center">报告生成管线</div>
                          <div className="flex flex-col gap-10">
                            {[
                              { name: "生长进度分析", status: "分析完成", progress: 100 },
                              { name: "环境相关性评估", status: "处理中", progress: 72 },
                              { name: "产量估算模型", status: "队列中", progress: 0 },
                            ].map((step, i) => (
                              <div key={step.name} className="relative">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-4">
                                    <span className="text-xs font-black text-gray-300">0{i+1}</span>
                                    <span className="text-lg font-black text-gray-900 tracking-tight">{step.name}</span>
                                  </div>
                                  <span className={`text-[10px] font-black tracking-widest uppercase ${step.progress === 100 ? 'text-green-500' : 'text-purple-500'}`}>
                                    {step.status}
                                  </span>
                                </div>
                                <div className="h-[2px] w-full bg-gray-200">
                                  <motion.div 
                                    className={`h-full ${step.progress === 100 ? 'bg-gray-900' : 'bg-purple-600'}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${step.progress}%` }}
                                    transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeTab === 2 && (
                        <div className="relative z-10 flex flex-col h-full justify-center">
                          <div className="max-w-md mx-auto w-full">
                            <div className="text-[10px] font-black text-teal-600 uppercase tracking-[0.3em] mb-8 text-center">意图语义映射</div>
                            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-50 flex flex-col gap-6">
                              <div className="italic text-xl font-medium text-gray-900 tracking-tight border-l-4 border-teal-500 pl-6 py-2">
                                “根据今天的高温预警，优化温室环境。”
                              </div>
                              <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3 text-xs font-bold text-gray-400">
                                  <div className="w-2 h-[1px] bg-gray-300" /> 正在翻译为 IoT 通讯协议
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="bg-gray-50 p-4 rounded-2xl">
                                    <div className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">遮阳系统</div>
                                    <div className="text-sm font-bold text-gray-900">执行：全展开</div>
                                  </div>
                                  <div className="bg-gray-50 p-4 rounded-2xl">
                                    <div className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">雾化系统</div>
                                    <div className="text-sm font-bold text-gray-900">执行：循环喷淋</div>
                                  </div>
                                </div>
                              </div>
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
    </motion.div>
  </div>
</section>
  )
}
