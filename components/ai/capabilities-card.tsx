"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { 
  Sparkles, 
  Zap, 
  Brain, 
  Calendar, 
  FileText, 
  Search, 
  Camera, 
  Activity,
  BarChart3,
  MessageSquare,
  ArrowRight,
  X
} from 'lucide-react'

interface Capability {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  bgColor: string
  iconColor: string
  examples: string[]
}

const capabilities: Capability[] = [
  {
    id: 'device-control',
    icon: <Zap size={28} />,
    title: '智能设备控制',
    description: '控制温室内的水泵、风扇、补光灯等设备，实现精准的环境调控',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    iconColor: 'bg-blue-500',
    examples: [
      '打开水泵',
      '关闭风扇',
      '调节补光灯亮度',
      '移动摄像头到左侧'
    ]
  },
  {
    id: 'environment-monitor',
    icon: <Activity size={28} />,
    title: '环境监测分析',
    description: '实时监测温度、湿度、CO2、光照等环境参数，提供专业分析建议',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
    iconColor: 'bg-emerald-500',
    examples: [
      '当前温室环境如何',
      '分析今日环境数据',
      '湿度是否正常',
      '光照强度够吗'
    ]
  },
  {
    id: 'spectrum-analysis',
    icon: <BarChart3 size={28} />,
    title: '光谱数据分析',
    description: '获取18通道光谱数据，计算NDVI指数，评估植物健康状态',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    iconColor: 'bg-purple-500',
    examples: [
      '获取光谱数据',
      '计算NDVI指数',
      '分析植物健康状况',
      '检测植物胁迫'
    ]
  },
  {
    id: 'visual-inspection',
    icon: <Camera size={28} />,
    title: '视觉巡检',
    description: '控制摄像头移动并捕获画面，进行病虫害识别和生长状态评估',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    iconColor: 'bg-orange-500',
    examples: [
      '巡检温室',
      '拍摄植物照片',
      '检测病虫害',
      '评估生长状态'
    ]
  },
  {
    id: 'schedule-task',
    icon: <Calendar size={28} />,
    title: '定时任务管理',
    description: '创建和管理定时任务，实现自动化灌溉、通风、补光等操作',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    iconColor: 'bg-blue-500',
    examples: [
      '每天早上8点打开补光灯',
      '每2小时检查一次温度',
      '查看所有定时任务',
      '取消明天的浇水任务'
    ]
  },
  {
    id: 'report-generation',
    icon: <FileText size={28} />,
    title: '报告生成',
    description: '生成精美的环境监测报告、数据分析报告，支持HTML和PDF导出',
    bgColor: 'bg-pink-50 dark:bg-pink-950/20',
    iconColor: 'bg-pink-500',
    examples: [
      '生成今日环境报告',
      '导出本周数据分析',
      '生成设备运行报告',
      '创建种植管理报告'
    ]
  },
  {
    id: 'knowledge-search',
    icon: <Search size={28} />,
    title: '农业知识搜索',
    description: '搜索最新的农业种植技术、病虫害防治方法、最佳实践等专业知识',
    bgColor: 'bg-teal-50 dark:bg-teal-950/20',
    iconColor: 'bg-teal-500',
    examples: [
      '草莓白粉病怎么防治',
      '5月份草莓管理要点',
      '如何提高草莓产量',
      '温室通风策略'
    ]
  },
  {
    id: 'smart-advice',
    icon: <Brain size={28} />,
    title: '智能决策建议',
    description: '基于当前环境数据和农业知识，提供专业的种植管理建议',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    iconColor: 'bg-purple-500',
    examples: [
      '现在需要浇水吗',
      '如何优化当前环境',
      '制定本周管理计划',
      '分析产量提升方案'
    ]
  },
  {
    id: 'chat',
    icon: <MessageSquare size={28} />,
    title: '自然对话交互',
    description: '支持自然语言对话，理解复杂指令，提供友好的交互体验',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/20',
    iconColor: 'bg-cyan-500',
    examples: [
      '帮我分析一下现在的环境',
      '温度太高了怎么办',
      '今天需要做什么',
      '给我一些种植建议'
    ]
  }
]

interface CapabilitiesCardProps {
  onExampleClick?: (example: string) => void
}

export function CapabilitiesCard({ onExampleClick }: CapabilitiesCardProps) {
  const [selectedCapability, setSelectedCapability] = useState<Capability | null>(null)

  return (
    <div className="my-6 w-full max-w-5xl space-y-6">
      {/* Banner 卡片 - 独立圆角矩形 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative h-56 overflow-hidden rounded-3xl shadow-lg"
      >
        {/* 背景图片 */}
        <Image
          src="/ability.png"
          alt="AI 助手能力"
          fill
          className="object-cover"
          priority
        />
        
        {/* 文字内容 - 左侧 */}
        <div className="relative h-full flex flex-col justify-center px-12 py-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-md"
          >
            <h3 className="text-4xl font-black font-alimama tracking-wide text-emerald-600 dark:text-emerald-400 mb-4">
              莓小智 AI 助手能力
            </h3>
            <p className="text-zinc-700 dark:text-zinc-300 text-base leading-relaxed">
              多维度感知、智能分析、专业决策，<br />
              让农业管理更科学、更高效
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* 能力网格卡片 - 独立圆角矩形 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-zinc-900 rounded-3xl shadow-lg p-8"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {capabilities.map((capability, index) => (
            <motion.button
              key={capability.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedCapability(capability)}
              className={`group relative p-6 ${capability.bgColor} backdrop-blur-2xl rounded-2xl border border-white/20 dark:border-white/10 transition-all duration-300 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-1 hover:scale-[1.02] text-left overflow-hidden`}
            >
              {/* Vision Pro 玻璃反光效果 */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/5 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
              
              {/* 边缘高光 */}
              <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20 group-hover:ring-white/30 transition-all duration-300" />
              
              {/* 内容 */}
              <div className="relative">
                {/* 图标 */}
                <div className={`inline-flex p-3.5 ${capability.iconColor} rounded-2xl mb-4 text-white shadow-lg shadow-black/10 backdrop-blur-sm`}>
                  {capability.icon}
                </div>
                
                {/* 标题 */}
                <h4 className="font-black font-alimama tracking-wide text-zinc-900 dark:text-white mb-2 text-lg">
                  {capability.title}
                </h4>
                
                {/* 描述 */}
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                  {capability.description}
                </p>
                
                {/* 箭头 */}
                <div className="flex items-center justify-end">
                  <div className={`p-1.5 rounded-full ${capability.iconColor.replace('bg-', 'text-')} group-hover:translate-x-1 transition-transform`}>
                    <ArrowRight size={18} />
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* 详情弹窗 */}
      <AnimatePresence>
        {selectedCapability && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedCapability(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* 关闭按钮 */}
              <button
                onClick={() => setSelectedCapability(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <X size={20} className="text-zinc-600 dark:text-zinc-400" />
              </button>

              {/* 头部 */}
              <div className={`px-8 py-8 ${selectedCapability.bgColor}`}>
                <div className={`inline-flex p-4 ${selectedCapability.iconColor} rounded-2xl mb-4 text-white shadow-lg`}>
                  {React.cloneElement(selectedCapability.icon as React.ReactElement, {
                    size: 40
                  })}
                </div>
                <h3 className="text-2xl font-black font-alimama tracking-wide text-zinc-900 dark:text-white mb-2">
                  {selectedCapability.title}
                </h3>
                <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed">
                  {selectedCapability.description}
                </p>
              </div>

              {/* 示例列表 */}
              <div className="p-8">
                <h4 className="text-sm font-black font-alimama tracking-wide text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-500" />
                  试试这些示例
                </h4>
                <div className="space-y-2">
                  {selectedCapability.examples.map((example, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => {
                        onExampleClick?.(example)
                        setSelectedCapability(null)
                      }}
                      className="w-full group flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 text-left"
                    >
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 group-hover:border-emerald-300 dark:group-hover:border-emerald-700 transition-colors">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {index + 1}
                        </span>
                      </div>
                      <span className="flex-1 text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {example}
                      </span>
                      <ArrowRight 
                        size={16} 
                        className="flex-shrink-0 text-zinc-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" 
                      />
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
