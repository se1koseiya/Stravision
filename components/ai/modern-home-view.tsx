"use client"

import React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import BerryOrb from "@/components/smoothui/berry-orb"
import type { UserPublic } from "@/lib/db/user-service"
import { IconComment, IconMagic, IconSeedling, IconSun, IconThermometer, IconTrendingUp, IconUser, IconWater, IconWind } from "@/components/icon";

interface ModernHomeViewProps {
  user: UserPublic | null
  deviceData: any
  onStartChat?: () => void
}

export function ModernHomeView({ user, deviceData, onStartChat }: ModernHomeViewProps) {
  const [greeting, setGreeting] = React.useState("下午好")
  const [currentTime, setCurrentTime] = React.useState("")

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const hour = now.getHours()
      
      if (hour < 12) setGreeting("早上好")
      else if (hour < 18) setGreeting("下午好")
      else setGreeting("晚上好")
      
      setCurrentTime(now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
    }
    
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  // 环境监测数据
  const environmentData = [
    { 
      icon: IconThermometer, 
      label: "环境温度", 
      value: deviceData?.temperature?.toFixed(1) || "19.2", 
      unit: "℃", 
      color: "text-emerald-400" 
    },
    { 
      icon: IconWater, 
      label: "空气湿度", 
      value: deviceData?.humidity?.toFixed(0) || "64", 
      unit: "%", 
      color: "text-cyan-400" 
    },
    { 
      icon: IconWater, 
      label: "CO₂浓度", 
      value: deviceData?.co2?.toString() || "620", 
      unit: "ppm", 
      color: "text-green-400" 
    },
    { 
      icon: IconSun, 
      label: "光照强度", 
      value: deviceData?.light?.toString() || "850", 
      unit: "lux", 
      color: "text-yellow-400" 
    },
    { 
      icon: IconThermometer, 
      label: "土壤温度", 
      value: "18.6", 
      unit: "℃", 
      color: "text-orange-400" 
    },
    { 
      icon: IconWind, 
      label: "空气流速", 
      value: "45", 
      unit: "%", 
      color: "text-purple-400" 
    },
  ]

  // 智能建议
  const suggestions = [
    {
      icon: IconSeedling,
      title: "灌溉优化建议",
      description: "土壤湿度偏低，建议在 16:00 启动滴灌",
      status: "待执行",
      time: "10:30"
    },
    {
      icon: IconSun,
      title: "光照调整提醒",
      description: "晴天高温，建议关闭 1000lux 补光灯",
      status: "待确认",
      time: "09:18"
    },
    {
      icon: IconTrendingUp,
      title: "温控降温建议",
      description: "温度持续上升，建议开启降温系统",
      status: "进行中",
      time: "05:14"
    },
  ]

  // 快捷功能
  const quickActions = [
    { icon: IconMagic, title: "深度诊断", subtitle: "多维度环境智能分析" },
    { icon: IconTrendingUp, title: "优化方案", subtitle: "基于数据生成优化方案" },
    { icon: IconComment, title: "趋势分析", subtitle: "环境趋势分析与预测" },
    { icon: IconUser, title: "多Agent协作", subtitle: "多智能体协同分析决策" },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* 问候语和3D球体 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold mb-2">
          {greeting}, <span className="text-emerald-400">{user?.username || "访客"}</span>
        </h1>
        <p className="text-zinc-400 mb-4">我是你的农业智能助手</p>
        <p className="text-sm text-zinc-500">我可以帮助你分析数据、优化决策、解决问题</p>

        {/* 3D 球体动画 */}
        <div className="my-12 flex justify-center">
          <div className="relative w-64 h-64">
            <BerryOrb isActive={true} />
          </div>
        </div>

        {/* AI 深度分析卡片 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          onClick={onStartChat}
          className="inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-2xl cursor-pointer hover:border-emerald-500/40 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <IconMagic className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              AI 深度分析
              <span className="text-[11px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">推荐</span>
            </div>
            <div className="text-xs text-zinc-400">
              AI 会根据环境分析，提供专业级优化方案
            </div>
          </div>
          <svg className="w-5 h-5 text-zinc-500 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </motion.div>
      </motion.div>

      {/* 环境监测概览 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-zinc-400">农场环境概览</h2>
          <span className="text-xs text-emerald-400">{currentTime} 更新</span>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          {environmentData.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.05 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn("w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center", item.color)}>
                  <item.icon className="w-4 h-4" />
                </div>
                <IconTrendingUp className="w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-2xl font-bold mb-1">
                {item.value}
                <span className="text-sm text-zinc-500 ml-1">{item.unit}</span>
              </div>
              <div className="text-xs text-zinc-400">{item.label}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 智能建议 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-zinc-400">智能建议</h2>
          <span className="text-xs text-zinc-500">3 条待处理</span>
        </div>
        
        <div className="space-y-3">
          {suggestions.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all cursor-pointer group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-white">{item.title}</h3>
                    <span className={cn(
                      "text-[11px] px-2 py-0.5 rounded-full",
                      item.status === "待执行" && "bg-emerald-500/20 text-emerald-400",
                      item.status === "待确认" && "bg-yellow-500/20 text-yellow-400",
                      item.status === "进行中" && "bg-emerald-500/20 text-emerald-400"
                    )}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mb-2">{item.description}</p>
                  <div className="text-[11px] text-zinc-500">{item.time}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 数据趋势 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-zinc-400">数据趋势</h2>
          <span className="text-xs text-zinc-500">24小时</span>
        </div>
        
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs text-zinc-400">环境温度 (℃)</div>
            <div className="text-2xl font-bold">25</div>
          </div>
          
          {/* 简化的趋势图 */}
          <div className="h-32 flex items-end gap-2">
            {[20, 25, 22, 28, 30, 26, 24, 27, 29, 25, 23, 26].map((value, index) => (
              <div
                key={index}
                className="flex-1 bg-gradient-to-t from-emerald-500/50 to-emerald-500/20 rounded-t-lg transition-all hover:from-emerald-500/70 hover:to-emerald-500/40"
                style={{ height: `${(value / 30) * 100}%` }}
              />
            ))}
          </div>
          
          <div className="flex justify-between text-[11px] text-zinc-500 mt-2">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>
        </div>
      </motion.div>

      {/* 快捷功能 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="grid grid-cols-4 gap-4 mb-8"
      >
        {quickActions.map((action, index) => (
          <div
            key={index}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all cursor-pointer group text-center"
          >
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <action.icon className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="text-sm font-bold mb-1">{action.title}</div>
            <div className="text-[11px] text-zinc-500">{action.subtitle}</div>
          </div>
        ))}
      </motion.div>
    </div>
  )
}
