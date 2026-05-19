
"use client"

import Image from "next/image"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertTriangle, RefreshCw, Sparkles, ArrowRight, Zap, CheckCircle2, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface InsightData {
  riskLevel: 'low' | 'medium' | 'high'
  insight: string
  recommendation: string
}

const IP_IMAGES = {
  high: "/ip/智慧农业3D图标-浇水灌溉-细线版.png",
  medium: "/ip/智慧农业3D图标-无人机巡检-细线版.png", 
  low: "/ip/智慧农业3D图标-作物检测-细线版.png",
  loading: "/ip/智慧农业3D图标-无人机巡检-细线版.png"
}

export function AiInsightCard() {
  const [data, setData] = useState<InsightData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchInsight = async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/ai/daily-insight')
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInsight()
  }, [])

  const getStatusColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20'
      case 'medium': return 'text-blue-500 bg-blue-500/10 border-blue-500/20'
      case 'low': return 'text-primary bg-primary/10 border-primary/20'
      default: return 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20'
    }
  }

  const getStatusText = (level: string) => {
    switch (level) {
      case 'high': return '环境风险较高'
      case 'medium': return '环境需关注'
      case 'low': return '生长环境优良'
      default: return '分析中...'
    }
  }

  if (error) {
    return (
      <Card className="h-full bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 overflow-hidden group">
        <CardContent className="h-full flex flex-col items-center justify-center p-8 text-center">
          <div className="size-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
            <AlertTriangle className="size-6 text-red-500" />
          </div>
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-2">无法生成报告</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">AI 服务暂时不可用，请稍后重试</p>
          <Button variant="outline" size="sm" onClick={fetchInsight} className="rounded-full px-6 hover:bg-zinc-100 dark:hover:bg-zinc-900">
            <RefreshCw className="h-4 w-4 mr-2" /> 重试
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-4 z-20">
        <Button 
          variant="ghost" 
          size="icon" 
          className="size-8 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          onClick={fetchInsight}
          disabled={loading}
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
        </Button>
      </div>

      <div className="flex flex-col md:flex-row h-full relative">
        {/* Left Content Area */}
        <div className="flex-1 p-5 md:p-6 flex flex-col relative z-10 min-w-0">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex size-2 rounded-full bg-zinc-900 dark:bg-white animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 whitespace-nowrap">AI Daily Insight</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white whitespace-nowrap overflow-hidden text-overflow-ellipsis">
              每日洞察
            </h2>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4 flex-1"
              >
                <Skeleton className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800" />
                <Skeleton className="h-20 w-full bg-zinc-100 dark:bg-zinc-800" />
                <Skeleton className="h-12 w-full bg-zinc-100 dark:bg-zinc-800" />
              </motion.div>
            ) : data ? (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex-1 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className={cn(
                    "inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-medium w-fit whitespace-nowrap",
                    getStatusColor(data.riskLevel)
                  )}>
                    {data.riskLevel === 'high' && <AlertTriangle className="size-3.5 shrink-0" />}
                    {data.riskLevel === 'medium' && <Zap className="size-3.5 shrink-0" />}
                    {data.riskLevel === 'low' && <CheckCircle2 className="size-3.5 shrink-0" />}
                    <span className="truncate">{getStatusText(data.riskLevel)}</span>
                  </div>

                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium line-clamp-3 md:line-clamp-4">
                    {data.insight}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-full shrink-0">
                      <Sparkles className="size-3.5 text-zinc-900 dark:text-white" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">AI 建议</h4>
                      <p className="text-xs md:text-sm text-zinc-900 dark:text-zinc-200 line-clamp-2">
                        {data.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Right Visual Area - IP Image */}
        <div className="w-full h-[200px] md:h-auto md:w-[35%] lg:w-[240px] shrink-0 bg-zinc-50 dark:bg-zinc-900/50 border-t md:border-t-0 md:border-l border-zinc-100 dark:border-zinc-800 relative overflow-hidden flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05]" />
          
          {/* Animated Blob Background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-tr from-primary/20 to-blue-500/20 rounded-full blur-[40px] animate-pulse" />

          <motion.div
            key={loading ? 'loading-img' : data?.riskLevel}
            initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring",
              stiffness: 100,
              damping: 20
            }}
            className="relative z-10 w-full h-full"
          >
            <Image
              src={loading ? IP_IMAGES.loading : IP_IMAGES[data?.riskLevel || 'low']}
              alt="AI Assistant"
              fill
              className="object-contain drop-shadow-2xl transition-transform duration-700 hover:scale-110"
              priority
            />
          </motion.div>
        </div>
      </div>
    </Card>
  )
}
