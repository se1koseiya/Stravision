"use client"

import { useRef, useEffect, useState } from "react"
import { motion, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate } from "framer-motion"
import Link from "next/link"
import { IconArrowRightUp, IconCpu, IconGlobe, IconLightning, IconLock, IconNetworkTree, IconPreviewOpen, IconRight, IconTerminal } from "@/components/icon";

// --- UTILS ---
function useParallax(value: any, distance: number) {
  return useTransform(value, [0, 1], [-distance, distance])
}

// --- COMPONENTS ---

const GridBackground = () => (
  <div className="fixed inset-0 z-0 pointer-events-none">
    <div className="absolute inset-0 bg-[#020202]" />
    {/* Grid Lines */}
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />
    {/* Noise */}
    <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
         style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
    />
  </div>
)

const HeroTitle = () => {
  const { scrollY } = useScroll()
  const y1 = useTransform(scrollY, [0, 500], [0, 200])
  const y2 = useTransform(scrollY, [0, 500], [0, -100])
  const opacity = useTransform(scrollY, [0, 300], [1, 0])

  return (
    <div className="relative z-10 flex flex-col items-start justify-center min-h-[90vh] px-6 md:px-24 pt-20">
      <motion.div style={{ opacity }} className="relative">
        {/* Decorative ID */}
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="absolute -left-12 top-2 hidden md:flex flex-col gap-2"
        >
            <div className="w-px h-12 bg-primary/50" />
            <span className="text-[10px] font-mono text-primary/50 [writing-mode:vertical-rl] rotate-180">SYS.INIT.V2</span>
        </motion.div>

        <h1 className="text-[15vw] leading-[0.85] font-jinbuti tracking-tighter text-white mix-blend-difference select-none">
            <motion.div style={{ x: y1 }} className="opacity-50 blur-sm absolute top-0 left-0 text-emerald-900 pointer-events-none">
                STRAVISION
            </motion.div>
            <span className="relative z-10">STRAVISION</span>
        </h1>
        
        <div className="flex flex-col md:flex-row md:items-start gap-8 mt-12 ml-2 md:ml-4">
            <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "100px" }}
                transition={{ delay: 1, duration: 1, ease: "circOut" }}
                className="h-px bg-primary hidden md:block mt-6" 
            />
            
            <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.8 }}
                className="text-lg md:text-3xl text-zinc-400 font-jinbuti max-w-2xl leading-relaxed tracking-wide"
            >
                We construct the <span className="text-emerald-400">nervous system</span> for modern agriculture.
                <br />
                <span className="text-sm md:text-base text-zinc-600 font-mono mt-6 block uppercase tracking-widest opacity-60">
                    // SENSING · DECISION · ACTUATION
                </span>
            </motion.p>
        </div>
      </motion.div>

      {/* Scroll Hint */}
      <motion.div 
        style={{ opacity }}
        className="absolute bottom-12 right-12 flex items-center gap-4"
      >
        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Scroll for System Data</span>
        <div className="w-12 h-px bg-zinc-800" />
      </motion.div>
    </div>
  )
}

const FeatureRow = ({ title, desc, id, index, href }: { title: string, desc: string, id: string, index: number, href?: string }) => {
    const Content = (
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-8">
            {/* ID */}
            <span className="font-mono text-xs text-primary/50 uppercase tracking-widest">
                {id}
            </span>

            {/* Content */}
            <div className="flex-1 md:max-w-4xl">
                <h2 className="text-4xl md:text-7xl font-jinbuti text-white mb-6 group-hover:text-emerald-400 transition-colors duration-500">
                    {title}
                </h2>
                <p className="text-zinc-500 text-lg md:text-xl max-w-2xl leading-relaxed">
                    {desc}
                </p>
            </div>

            {/* Action */}
            <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-full border border-white/10 group-hover:border-primary/50 group-hover:scale-110 transition-all duration-500">
                <IconArrowRightUp className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400" />
            </div>
        </div>
    )

    return (
        <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.8, delay: index * 0.1 }}
            className="group relative border-t border-white/10 py-16 md:py-24 px-6 md:px-24 hover:bg-white/[0.02] transition-colors duration-500"
        >
            {href ? (
                <Link href={href} className="block w-full h-full">
                    {Content}
                </Link>
            ) : Content}
        </motion.div>
    )
}

const TechnicalHUD = () => {
    return (
        <div className="fixed top-24 right-6 md:right-12 z-40 hidden lg:flex flex-col items-end gap-2 pointer-events-none mix-blend-difference">
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary animate-pulse" />
                <span className="font-mono text-[10px] text-zinc-400">LIVE FEED</span>
            </div>
            <div className="font-mono text-[10px] text-zinc-600 flex flex-col items-end gap-1">
                <span>MEM: 64%</span>
                <span>NET: 12ms</span>
                <span>ENC: AES-256</span>
            </div>
        </div>
    )
}

// --- MAIN PAGE ---

export default function DocsPage() {
  return (
    <main className="relative min-h-screen bg-[#020202] text-white selection:bg-primary/30">
      <GridBackground />
      <TechnicalHUD />

      {/* Nav */}
      <nav className="fixed top-0 left-0 w-full px-6 py-6 z-50 flex justify-between items-center backdrop-blur-sm border-b border-white/5 bg-[#020202]/80">
        <Link href="/" className="flex items-center gap-2 group">
            <div className="w-3 h-3 bg-white group-hover:bg-emerald-400 transition-colors" />
            <span className="font-mono text-xs tracking-widest text-zinc-400 group-hover:text-white transition-colors">STRAVISION OS</span>
        </Link>
        <Link href="/apply" className="px-6 py-2 bg-white text-black text-xs font-bold uppercase tracking-wide hover:bg-emerald-400 hover:text-black transition-colors">
            Access System
        </Link>
      </nav>

      {/* Hero */}
      <HeroTitle />

      {/* Brutalist Features List */}
      <section className="relative z-10 pb-32">
        <div className="px-6 md:px-24 mb-12 flex items-end gap-4">
            <div className="w-3 h-3 bg-primary" />
            <h3 className="font-mono text-sm text-zinc-500 uppercase tracking-widest">System Modules</h3>
        </div>

        <FeatureRow 
            id="MOD-01"
            index={0}
            title="Spectral Matrix" 
            desc="11-Channel Photobiology. 覆盖 415nm 紫光至 NIR 近红外波段。实时解析光合有效辐射 (PAR) 与光质配比，为作物定制精准的光配方。" 
        />
        <FeatureRow 
            id="MOD-02"
            index={1}
            title="Cloud-Edge Synergy" 
            desc="AI-IoT Neural Network. 基于 ESP32-C3 采集，Qwen-VL 大模型决策。云端大脑实时分析环境数据，边缘终端毫秒级响应执行，构建感知-决策-执行闭环。" 
        />
        <FeatureRow 
            id="MOD-03"
            index={2}
            title="Dual-Link Protocol" 
            desc="MQTT + SSE Architecture. 设备端采用 MQTT 5.0 保持轻量级长连接，客户端通过 SSE 实现亚秒级数据流送。确保百万级数据点的高并发稳定传输。" 
        />
        <FeatureRow 
            id="MOD-04"
            index={3}
            title="Visual Cortex" 
            desc="Multimodal Agent. 集成视觉大模型与自然语言控制。不仅能识别病虫害图像，更能通过对话直接反控物理设备（水泵/风扇/补光灯），实现从“看”到“动”的智能跃迁。" 
        />
        <FeatureRow 
            id="DEV-01"
            index={4}
            title="API Reference" 
            desc="Developer Interface. 完整的 RESTful API 文档。包含认证、设备控制、AI 交互、环境数据获取等核心接口，助力开发者快速接入。"
            href="/docs/api"
        />
        <FeatureRow 
            id="ARCH-01"
            index={5}
            title="System Architecture" 
            desc="4.2. System Overall Architecture Design. 感知层、传输与网络层、平台层、应用层四层架构详解。点击查看完整架构图。"
            href="/docs/architecture"
        />
      </section>

      {/* Data Stream / Specs */}
      <section className="relative z-10 py-32 bg-zinc-900 border-y border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
        
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 relative">
            <div>
                <h3 className="font-jinbuti text-5xl text-white mb-8">Technical<br/><span className="text-zinc-500">Specifications</span></h3>
                <p className="text-zinc-400 max-w-sm leading-relaxed mb-12">
                    专为严苛农业环境设计的工业级参数标准。
                    <br/>
                    IP67 防护，-40°C 至 85°C 宽温工作。
                </p>
                <Link href="/docs/specs" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors border-b border-emerald-400/30 pb-1">
                    <span className="font-mono text-xs uppercase tracking-widest">Download Datasheet</span>
                    <IconRight className="w-4 h-4" />
                </Link>
            </div>

            <div className="font-mono text-sm">
                {[
                    { k: "主控核心", v: "JY-DAM0404D (工业级继电器组)" },
                    { k: "网络通讯", v: "5G 网关 (VA007+) + USR-N510 串口服" },
                    { k: "传感阵列", v: "土壤多参 / 温湿度 / CO2 / 光照度" },
                    { k: "执行单元", v: "顶光/补光 · 负压风机 · 水泵" },
                    { k: "调光系统", v: "DAM04-LAMP (四路精密调光)" },
                    { k: "供电架构", v: "220V AC 输入 · 多路 DC 稳压" },
                    { k: "总线协议", v: "RS485 Modbus · 工业以太网" },
                    { k: "安全机制", v: "FS 烟感探测 · 硬件看门狗" },
                ].map((item, i) => (
                    <div key={i} className="flex justify-between py-4 border-b border-white/10 hover:bg-white/5 px-2 transition-colors cursor-crosshair">
                        <span className="text-zinc-500">{item.k}</span>
                        <span className="text-white">{item.v}</span>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-24 px-6 md:px-24 flex flex-col md:flex-row justify-between items-end gap-12 bg-[#020202]">
        <div>
            <h2 className="text-[10vw] leading-none font-jinbuti text-zinc-800 hover:text-white transition-colors duration-700 cursor-default select-none">
                NEXT STEP
            </h2>
        </div>
        <div className="flex flex-col items-end gap-6">
            <p className="text-zinc-500 text-right max-w-xs">
                Ready to deploy the future of agriculture?
                <br/>Initialize your instance now.
            </p>
            <Link href="/apply" className="group flex items-center gap-4 px-8 py-4 bg-primary text-black font-bold text-lg hover:bg-emerald-400 transition-colors">
                <span>INITIALIZE</span>
                <IconArrowRightUp className="w-5 h-5 group-hover:rotate-45 transition-transform" />
            </Link>
        </div>
      </footer>
    </main>
  )
}
