"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import BerryOrb from "@/components/smoothui/berry-orb"
import type { UserPublic } from "@/lib/db/user-service"
import { IconArrowUp, IconBrain, IconChartHistogram, IconChartLine, IconCloudStorage, IconDown, IconGlobe, IconLight, IconLightning, IconPaperclip, IconRight, IconSearch, IconSeedling, IconSetting, IconSettingTwo, IconSun, IconThermometer, IconWater, IconWind } from "@/components/icon";

import Image from "next/image"

interface ExactDesignHomeProps {
  user: UserPublic | null
  deviceData: any
  onSendMessage: (msg: string) => void
}

export function ExactDesignHome({ user, deviceData, onSendMessage }: ExactDesignHomeProps) {
  const [greeting, setGreeting] = useState("下午好")
  const [input, setInput] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [enableReasoning, setEnableReasoning] = useState(false)
  const [enableSearch, setEnableSearch] = useState(false)

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting("早上好")
    else if (hour < 18) setGreeting("下午好")
    else setGreeting("晚上好")
  }, [])

  const handleSend = () => {
    if (input.trim()) {
      let message = input.trim()
      
      // 根据启用的功能添加标记
      const tags = []
      if (enableReasoning) tags.push("[深度推理]")
      if (enableSearch) tags.push("[联网搜索]")
      
      if (tags.length > 0) {
        message = `${tags.join(" ")} ${message}`
      }
      
      onSendMessage(message)
      setInput("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 快捷功能 - 使用主色调
  const quickActions = [
    { image: "/ip/智慧农业3D图标-作物检测-细线版.png", title: "深度诊断", subtitle: "多维度问题诊断", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-500/10" },
    { image: "/ip/智慧农业3D图标-浇水灌溉-细线版.png", title: "优化方案", subtitle: "生成最优决策方案", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-500/10" },
    { image: "/ip/智慧农业3D图标-数据监测-细线版.png", title: "趋势分析", subtitle: "数据趋势预测分析", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-500/10" },
    { image: "/ip/智慧农业3D图标-无人机巡检-细线版.png", title: "多Agent协作", subtitle: "复杂任务协同处理", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-500/10" },
  ]

  return (
    <div className="flex w-full h-full min-h-[calc(100vh-80px)] relative z-10 font-sans transition-colors duration-500">
      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto px-6 py-12 relative">
        {/* Subtle Background Glows */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-40 blur-[120px]">
          <div className="absolute top-1/4 left-1/4 w-[30rem] h-[30rem] bg-emerald-500/20 dark:bg-emerald-500/10 rounded-full mix-blend-multiply dark:mix-blend-screen" />
          <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full mix-blend-multiply dark:mix-blend-screen" />
        </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10 w-full relative z-10"
      >
        <h1 className="text-4xl md:text-5xl font-black font-alimama tracking-wide mb-4 text-zinc-900 dark:text-white transition-colors">
          {greeting}, <span className="text-emerald-600 dark:text-emerald-400">{user?.username || "Satsuseii"}</span>
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-base mb-1 transition-colors">我是你的农业智能助手</p>
        <p className="text-zinc-500 dark:text-zinc-500 text-sm transition-colors">我可以帮助你分析数据、优化决策、解决问题</p>
      </motion.div>

      {/* 3D Orb Area */}
      <div className="mb-12 relative z-10 flex justify-center w-full">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-56 h-56 flex items-center justify-center"
        >
          {/* 浮动图标 - 左上 */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="absolute -left-16 -top-8 w-12 h-12 bg-white dark:bg-white/10 backdrop-blur-xl rounded-full shadow-lg border border-emerald-200/50 dark:border-emerald-500/20 flex items-center justify-center"
            style={{
              animation: "float 3s ease-in-out infinite",
            }}
          >
            <IconSeedling className="w-5 h-5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
          </motion.div>

          {/* 浮动图标 - 右上 */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="absolute -right-12 -top-4 w-12 h-12 bg-white dark:bg-white/10 backdrop-blur-xl rounded-full shadow-lg border border-emerald-200/50 dark:border-emerald-500/20 flex items-center justify-center"
            style={{
              animation: "float 3.5s ease-in-out infinite 0.5s",
            }}
          >
            <IconChartHistogram className="w-5 h-5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
          </motion.div>

          {/* 浮动图标 - 左下 */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="absolute -left-12 bottom-8 w-10 h-10 bg-white dark:bg-white/10 backdrop-blur-xl rounded-full shadow-lg border border-emerald-200/50 dark:border-emerald-500/20 flex items-center justify-center"
            style={{
              animation: "float 4s ease-in-out infinite 1s",
            }}
          >
            <IconLightning className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
          </motion.div>

          {/* 浮动小圆点 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.6 }}
            className="absolute right-4 bottom-4 w-3 h-3 bg-emerald-400 dark:bg-emerald-500 rounded-full shadow-lg"
            style={{
              animation: "float 2.5s ease-in-out infinite 0.3s",
            }}
          />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="absolute left-8 top-12 w-2 h-2 bg-emerald-300 dark:bg-emerald-400 rounded-full shadow-lg"
            style={{
              animation: "float 3s ease-in-out infinite 0.8s",
            }}
          />

          {/* Orbital Rings - 改为浅绿色 */}
          <div className={cn("absolute inset-[-40px] rounded-[100%] border-[0.5px] border-emerald-400/30 dark:border-emerald-500/20 shadow-[inset_0_0_20px_rgba(52,211,153,0.1)] dark:shadow-[inset_0_0_20px_rgba(52,211,153,0.05)] transition-all duration-500", (isFocused || input.trim()) ? "animate-[spin_4s_linear_infinite]" : "animate-[spin_10s_linear_infinite]")} />
          <div className={cn("absolute inset-[-80px] rounded-[100%] border-[0.5px] border-emerald-400/20 dark:border-emerald-500/10 shadow-[inset_0_0_20px_rgba(52,211,153,0.05)] dark:shadow-[inset_0_0_20px_rgba(52,211,153,0.02)] transition-all duration-500", (isFocused || input.trim()) ? "animate-[spin_6s_linear_infinite_reverse]" : "animate-[spin_15s_linear_infinite_reverse]")} />
          <div className={cn("absolute inset-[-120px] rounded-[100%] border-[0.5px] border-emerald-400/10 dark:border-emerald-500/5 shadow-[inset_0_0_20px_rgba(52,211,153,0.02)] dark:shadow-[inset_0_0_20px_rgba(52,211,153,0.01)] transition-all duration-500", (isFocused || input.trim()) ? "animate-[spin_8s_linear_infinite]" : "animate-[spin_20s_linear_infinite]")} />
          
          <BerryOrb isActive={isFocused || input.trim().length > 0} className="w-full h-full shadow-[0_0_80px_rgba(52,211,153,0.2)] dark:shadow-[0_0_80px_rgba(52,211,153,0.3)] rounded-full transition-shadow duration-500" />
        </motion.div>
      </div>

      {/* 添加浮动动画的 CSS */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>

      {/* 输入框区域 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative z-10 w-full max-w-3xl mb-12"
      >
        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-2xl border border-zinc-200 dark:border-white/10 rounded-[2rem] p-2 hover:border-zinc-300 dark:hover:border-white/20 hover:bg-white dark:hover:bg-white/10 transition-all focus-within:border-emerald-500/50 dark:focus-within:border-emerald-500/50 focus-within:shadow-[0_0_40px_rgba(0,148,86,0.15)] dark:focus-within:shadow-[0_0_40px_rgba(0,148,86,0.2)] focus-within:bg-white dark:focus-within:bg-white/10 shadow-lg dark:shadow-lg">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="输入您的指令，或开启一段深度的农业经营对话..."
            className="w-full bg-transparent text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 px-6 py-5 resize-none outline-none min-h-[80px] text-[16px] leading-relaxed transition-colors"
            rows={1}
          />
          <div className="flex items-center justify-between px-4 pb-2 mt-2">
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1">
              <button 
                className="p-2.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 rounded-xl transition-colors"
                title="附加文件"
              >
                <IconPaperclip className="w-5 h-5" />
              </button>
              
              <div className="w-px h-5 bg-zinc-200 dark:bg-white/10 mx-3 transition-colors" />

              <button 
                onClick={() => setEnableReasoning(!enableReasoning)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-xl transition-all group",
                  enableReasoning
                    ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                    : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10"
                )}
                title={enableReasoning ? "已启用深度推理" : "启用深度推理"}
              >
                <IconBrain className={cn(
                  "w-4 h-4 transition-colors",
                  enableReasoning 
                    ? "text-emerald-600 dark:text-emerald-400" 
                    : "text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300"
                )} />
                深度推理
              </button>
              <button 
                onClick={() => setEnableSearch(!enableSearch)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-xl transition-all group",
                  enableSearch
                    ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                    : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10"
                )}
                title={enableSearch ? "已启用联网搜索" : "启用联网搜索"}
              >
                <IconGlobe className={cn(
                  "w-4 h-4 transition-colors",
                  enableSearch 
                    ? "text-emerald-600 dark:text-emerald-400" 
                    : "text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300"
                )} />
                联网搜索
              </button>
              <button 
                onClick={() => onSendMessage("打开工具设置")}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 rounded-xl transition-colors group"
                title="工具设置"
              >
                <IconSetting className="w-4 h-4 text-zinc-400 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-white" />
                工具设置
              </button>
            </div>

            <button 
              onClick={handleSend}
              disabled={!input.trim()}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center border shrink-0 ml-3 transition-all",
                input.trim() 
                  ? "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600 dark:hover:bg-emerald-400 shadow-[0_0_15px_rgba(0,148,86,0.3)] dark:shadow-[0_0_20px_rgba(0,148,86,0.4)] scale-105" 
                  : "border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-white/5 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
              )}
            >
              <IconArrowUp className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* 底部功能卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative z-10 w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-5"
      >
        {quickActions.map((action, index) => (
          <div
            key={index}
            onClick={() => onSendMessage(`我想进行${action.title}`)}
            className="flex items-center gap-6 md:gap-8 p-5 bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-2xl hover:bg-white dark:hover:bg-white/10 hover:border-zinc-300 dark:hover:border-white/20 transition-all cursor-pointer group shadow-sm hover:shadow-sm dark:shadow-lg dark:hover:shadow-lg hover:-translate-y-1 relative"
          >
            <div className="w-12 h-12 flex items-center justify-center shrink-0 relative">
              {/* 3D IP 形象，添加破局感（绝对定位、溢出容器、悬停放大） */}
              <div className="absolute -top-7 -left-5 w-24 h-24 drop-shadow-xl group-hover:scale-110 group-hover:-translate-y-2 group-hover:rotate-3 transition-all duration-300 z-10 pointer-events-none">
                <Image src={encodeURI(action.image)} alt={action.title} fill className="object-contain" sizes="96px" unoptimized />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-black font-alimama tracking-wider text-zinc-800 dark:text-white mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate relative z-0">
                {action.title}
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 transition-colors truncate relative z-0">
                {action.subtitle}
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </div>

      {/* 右侧数据看板小组件 - 统一配色 */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="hidden xl:flex flex-col w-[420px] p-6 gap-5 overflow-y-auto custom-scrollbar bg-gradient-to-b from-zinc-50/80 to-white/80 dark:from-zinc-900/80 dark:to-black/80 backdrop-blur-sm"
      >
        {/* Banner 区域 - 使用 ability.png 背景 */}
        <div className="relative overflow-hidden rounded-2xl h-[180px] mb-2 shadow-sm">
          {/* 背景图片 */}
          <div className="absolute inset-0 z-0">
            <Image 
              src="/images/exact/ability.png" 
              alt="实时数据" 
              fill 
              className="object-cover"
              sizes="420px"
              unoptimized
            />
          </div>
          
          {/* 浅色遮罩 */}
          <div className="absolute inset-0 z-[1] bg-gradient-to-br from-white/60 via-white/40 to-transparent dark:from-zinc-900/60 dark:via-zinc-900/40" />
          
          {/* 内容层 */}
          <div className="relative z-10 p-6 h-full flex flex-col justify-between">
            {/* 标题区域 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconChartLine className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                <h2 className="text-lg font-black font-alimama tracking-wide text-zinc-800 dark:text-zinc-200">实时数据</h2>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md rounded-full border border-zinc-200/50 dark:border-zinc-700/50 shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">在线</span>
              </div>
            </div>

            {/* 副标题 */}
            <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">环境监测概览</div>
          </div>
        </div>
        
        {/* 数据卡片 - 统一图标颜色 */}
        <div className="grid grid-cols-2 gap-3">
          {/* 温度卡片 */}
          <div className="bg-white/90 dark:bg-zinc-800/90 rounded-2xl p-4 border border-zinc-200/50 dark:border-zinc-700/50 hover:shadow-sm hover:border-zinc-300/50 dark:hover:border-zinc-600/50 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-700/50">
                <IconThermometer className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" strokeWidth={2.5} />
              </div>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">温度</span>
              <span className="ml-auto text-[11px] font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700/50 px-2 py-0.5 rounded-full">
                实时
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-zinc-700 dark:text-zinc-300 tracking-tight">
                  {deviceData?.temperature?.toFixed(1) || '0.0'}
                </span>
                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">°C</span>
              </div>
              <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                适宜 18-28°C
              </div>
            </div>
          </div>

          {/* 湿度卡片 */}
          <div className="bg-white/90 dark:bg-zinc-800/90 rounded-2xl p-4 border border-zinc-200/50 dark:border-zinc-700/50 hover:shadow-sm hover:border-zinc-300/50 dark:hover:border-zinc-600/50 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-700/50">
                <IconWater className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" strokeWidth={2.5} />
              </div>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">湿度</span>
              <span className="ml-auto text-[11px] font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700/50 px-2 py-0.5 rounded-full">
                实时
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-zinc-700 dark:text-zinc-300 tracking-tight">
                  {deviceData?.humidity?.toFixed(0) || '0'}
                </span>
                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">%</span>
              </div>
              <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                适宜 60-80%
              </div>
            </div>
          </div>

          {/* 光照卡片 */}
          <div className="bg-white/90 dark:bg-zinc-800/90 rounded-2xl p-4 border border-zinc-200/50 dark:border-zinc-700/50 hover:shadow-sm hover:border-zinc-300/50 dark:hover:border-zinc-600/50 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-700/50">
                <IconSun className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" strokeWidth={2.5} />
              </div>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">光照强度</span>
              <span className="ml-auto text-[11px] font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700/50 px-2 py-0.5 rounded-full">
                实时
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-zinc-700 dark:text-zinc-300 tracking-tight">
                  {deviceData?.light?.toFixed(0) || '0'}
                </span>
                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">lux</span>
              </div>
              <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                当前光照强度
              </div>
            </div>
          </div>

          {/* 土壤湿度卡片 */}
          <div className="bg-white/90 dark:bg-zinc-800/90 rounded-2xl p-4 border border-zinc-200/50 dark:border-zinc-700/50 hover:shadow-sm hover:border-zinc-300/50 dark:hover:border-zinc-600/50 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-700/50">
                <IconCloudStorage className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" strokeWidth={2.5} />
              </div>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">土壤水分</span>
              <span className="ml-auto text-[11px] font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700/50 px-2 py-0.5 rounded-full">
                实时
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-zinc-700 dark:text-zinc-300 tracking-tight">
                  {deviceData?.earth_water?.toFixed(0) || '0'}
                </span>
                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">%</span>
              </div>
              <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                土壤含水量
              </div>
            </div>
          </div>
        </div>

        {/* 快速操作区域 - 统一图标颜色 */}
        <div className="space-y-3 mt-2">
          <div className="flex items-center gap-2">
            <IconLightning className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            <div className="text-sm font-black font-alimama tracking-wide text-zinc-800 dark:text-zinc-200">快速操作</div>
          </div>
          
          <div className="space-y-3">
            {/* 今日数据总结 */}
            <button 
              onClick={() => onSendMessage("查看今日数据总结")}
              className="w-full group relative overflow-hidden rounded-2xl transition-all hover:scale-[1.02] hover:shadow-lg"
            >
              {/* 背景图片 */}
              <div className="absolute inset-0 z-0">
                <Image 
                  src="/images/exact/summaryde.png" 
                  alt="今日数据总结" 
                  fill 
                  className="object-cover"
                  sizes="420px"
                  unoptimized
                />
              </div>
              
              {/* 统一的浅色遮罩 */}
              <div className="absolute inset-0 z-[1] bg-gradient-to-br from-white/70 via-white/50 to-white/30 dark:from-zinc-900/70 dark:via-zinc-900/50 dark:to-zinc-900/30" />
              
              {/* 内容层 */}
              <div className="relative z-10 p-4 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-sm border border-zinc-200/50 dark:border-zinc-700/50">
                  <IconChartHistogram className="w-4 h-4 text-zinc-600 dark:text-zinc-400" strokeWidth={2.5} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-black font-alimama tracking-wider text-zinc-800 dark:text-zinc-200 mb-0.5">
                    今日数据总结
                  </div>
                  <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    查看环境数据分析
                  </div>
                </div>
                <IconRight className="w-4 h-4 text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>

            {/* 优化建议 */}
            <button 
              onClick={() => onSendMessage("生成环境优化建议")}
              className="w-full group relative overflow-hidden rounded-2xl transition-all hover:scale-[1.02] hover:shadow-lg"
            >
              {/* 背景图片 */}
              <div className="absolute inset-0 z-0">
                <Image 
                  src="/images/exact/youhua.png" 
                  alt="优化建议" 
                  fill 
                  className="object-cover"
                  sizes="420px"
                  unoptimized
                />
              </div>
              
              {/* 统一的浅色遮罩 */}
              <div className="absolute inset-0 z-[1] bg-gradient-to-br from-white/70 via-white/50 to-white/30 dark:from-zinc-900/70 dark:via-zinc-900/50 dark:to-zinc-900/30" />
              
              {/* 内容层 */}
              <div className="relative z-10 p-4 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-sm border border-zinc-200/50 dark:border-zinc-700/50">
                  <IconLight className="w-4 h-4 text-zinc-600 dark:text-zinc-400" strokeWidth={2.5} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-black font-alimama tracking-wider text-zinc-800 dark:text-zinc-200 mb-0.5">
                    优化建议
                  </div>
                  <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    AI 智能分析建议
                  </div>
                </div>
                <IconRight className="w-4 h-4 text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>

            {/* 设备状态 */}
            <button 
              onClick={() => onSendMessage("查看设备状态")}
              className="w-full group relative overflow-hidden rounded-2xl transition-all hover:scale-[1.02] hover:shadow-lg"
            >
              {/* 背景图片 */}
              <div className="absolute inset-0 z-0">
                <Image 
                  src="/images/exact/device-info.png" 
                  alt="设备状态" 
                  fill 
                  className="object-cover"
                  sizes="420px"
                  unoptimized
                />
              </div>
              
              {/* 统一的浅色遮罩 */}
              <div className="absolute inset-0 z-[1] bg-gradient-to-br from-white/70 via-white/50 to-white/30 dark:from-zinc-900/70 dark:via-zinc-900/50 dark:to-zinc-900/30" />
              
              {/* 内容层 */}
              <div className="relative z-10 p-4 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-sm border border-zinc-200/50 dark:border-zinc-700/50">
                  <IconSettingTwo className="w-4 h-4 text-zinc-600 dark:text-zinc-400" strokeWidth={2.5} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-black font-alimama tracking-wider text-zinc-800 dark:text-zinc-200 mb-0.5">
                    设备状态
                  </div>
                  <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    实时设备监控
                  </div>
                </div>
                <IconRight className="w-4 h-4 text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

