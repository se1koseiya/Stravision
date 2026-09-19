"use client"

import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { IconCamera, IconChartLine, IconCheckOne, IconCloseOne, IconFan, IconLight, IconLightning, IconLoading, IconPower, IconWater } from "@/components/icon";

interface DeviceControlDisplayProps {
  toolName: string
  input: any
  result: any
  className?: string
}

export function DeviceControlDisplay({ toolName, input, result, className }: DeviceControlDisplayProps) {
  const isSuccess = result?.status === 'success'
  const isError = result?.status === 'error'
  const isExecuting = result?.status === 'executing' || result?.status === 'moving'

  // 根据工具名称选择图标和颜色
  const getDeviceInfo = () => {
    switch (toolName) {
      case 'set_led':
        return {
          icon: IconLight,
          name: '植物补光灯',
          subtitle: 'RGB 全光谱控制',
          color: 'text-amber-500 dark:text-amber-400',
          accentColor: 'bg-amber-500',
          bgGradient: 'from-amber-500/5 to-orange-500/5 dark:from-amber-500/10 dark:to-orange-500/5'
        }
      case 'toggle_relay':
        const deviceName = input?.deviceName || `设备${input?.device}`
        let icon = IconPower
        let color = 'text-blue-500 dark:text-blue-400'
        let accentColor = 'bg-blue-500'
        let bgGradient = 'from-blue-500/5 to-cyan-500/5 dark:from-blue-500/10 dark:to-cyan-500/5'
        
        if (deviceName.includes('风扇')) {
          icon = IconFan
          color = 'text-cyan-500 dark:text-cyan-400'
          accentColor = 'bg-cyan-500'
          bgGradient = 'from-cyan-500/5 to-blue-500/5 dark:from-cyan-500/10 dark:to-blue-500/5'
        } else if (deviceName.includes('水泵')) {
          icon = IconWater
          color = 'text-blue-500 dark:text-blue-400'
          accentColor = 'bg-blue-500'
          bgGradient = 'from-blue-500/5 to-indigo-500/5 dark:from-blue-500/10 dark:to-indigo-500/5'
        } else if (deviceName.includes('补光灯')) {
          icon = IconLight
          color = 'text-amber-500 dark:text-amber-400'
          accentColor = 'bg-amber-500'
          bgGradient = 'from-amber-500/5 to-orange-500/5 dark:from-amber-500/10 dark:to-orange-500/5'
        }
        
        return {
          icon,
          name: deviceName,
          subtitle: '继电器开关控制',
          color,
          accentColor,
          bgGradient
        }
      case 'control_camera':
        return {
          icon: IconCamera,
          name: '摄像头云台',
          subtitle: '位置移动控制',
          color: 'text-purple-500 dark:text-purple-400',
          accentColor: 'bg-purple-500',
          bgGradient: 'from-purple-500/5 to-pink-500/5 dark:from-purple-500/10 dark:to-pink-500/5'
        }
      default:
        return {
          icon: IconPower,
          name: '设备控制',
          subtitle: 'IoT 设备管理',
          color: 'text-zinc-500 dark:text-zinc-400',
          accentColor: 'bg-zinc-500',
          bgGradient: 'from-zinc-500/5 to-zinc-500/5 dark:from-zinc-500/10 dark:to-zinc-500/5'
        }
    }
  }

  const deviceInfo = getDeviceInfo()
  const Icon = deviceInfo.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative rounded-3xl overflow-hidden transition-all duration-500",
        "bg-gradient-to-br from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-950",
        "border border-zinc-200/50 dark:border-white/5",
        "shadow-2xl shadow-black/5 dark:shadow-black/20",
        className
      )}
    >
      {/* Background Gradient Accent */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-100",
        deviceInfo.bgGradient
      )} />
      
      {/* Status Indicator Dot */}
      <div className="absolute top-6 right-6 z-10">
        <div className={cn(
          "size-3 rounded-full shadow-lg",
          isExecuting && "bg-blue-500 animate-pulse shadow-blue-500/50",
          isSuccess && "bg-primary shadow-emerald-500/50",
          isError && "bg-red-500 shadow-red-500/50"
        )} />
      </div>

      <div className="relative p-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
              {deviceInfo.name}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              {deviceInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Main Visual Area */}
        <div className="flex items-center justify-center py-8">
          <div className="relative">
            {/* Glow Effect */}
            <div className={cn(
              "absolute inset-0 blur-3xl opacity-20 dark:opacity-40",
              deviceInfo.accentColor
            )} />
            
            {/* Icon Container */}
            <div className="relative">
              <div className={cn(
                "size-32 rounded-full flex items-center justify-center",
                "bg-white/80 dark:bg-gradient-to-br dark:from-white/10 dark:to-white/5",
                "border border-zinc-200 dark:border-white/10",
                "backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/20"
              )}>
                <Icon className={cn("size-16", deviceInfo.color)} strokeWidth={1.5} />
              </div>
              
              {/* Status Badge */}
              {isExecuting && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute -bottom-2 -right-2 size-10 rounded-full bg-blue-500 flex items-center justify-center border-4 border-zinc-100 dark:border-zinc-900 shadow-lg"
                >
                  <IconLoading className="size-5 text-white" />
                </motion.div>
              )}
              
              {isSuccess && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="absolute -bottom-2 -right-2 size-10 rounded-full bg-primary flex items-center justify-center border-4 border-zinc-100 dark:border-zinc-900 shadow-lg"
                >
                  <IconCheckOne className="size-5 text-white" />
                </motion.div>
              )}
              
              {isError && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="absolute -bottom-2 -right-2 size-10 rounded-full bg-red-500 flex items-center justify-center border-4 border-zinc-100 dark:border-zinc-900 shadow-lg"
                >
                  <IconCloseOne className="size-5 text-white" />
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Parameters Grid */}
        <div className="space-y-3">
          {toolName === 'set_led' && (
            <div className="grid grid-cols-3 gap-3">
              {/* R Channel */}
              <div className="rounded-2xl bg-white/80 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 backdrop-blur-sm shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Red</span>
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-white">{input.r}</div>
                <div className="mt-2 h-1.5 rounded-full bg-zinc-200 dark:bg-white/10 overflow-hidden">
                  <div 
                    className="h-full bg-red-500 rounded-full transition-all duration-500"
                    style={{ width: `${(input.r / 255) * 100}%` }}
                  />
                </div>
              </div>
              
              {/* G Channel */}
              <div className="rounded-2xl bg-white/80 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 backdrop-blur-sm shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-2 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Green</span>
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-white">{input.g}</div>
                <div className="mt-2 h-1.5 rounded-full bg-zinc-200 dark:bg-white/10 overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${(input.g / 255) * 100}%` }}
                  />
                </div>
              </div>
              
              {/* B Channel */}
              <div className="rounded-2xl bg-white/80 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 backdrop-blur-sm shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Blue</span>
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-white">{input.b}</div>
                <div className="mt-2 h-1.5 rounded-full bg-zinc-200 dark:bg-white/10 overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${(input.b / 255) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
          
          {toolName === 'toggle_relay' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/80 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-4 backdrop-blur-sm shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <IconLightning className="size-4 text-zinc-400" />
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">设备编号</span>
                </div>
                <div className="text-3xl font-bold text-zinc-900 dark:text-white">#{input.device}</div>
              </div>
              
              <div className="rounded-2xl bg-white/80 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-4 backdrop-blur-sm shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <IconChartLine className="size-4 text-zinc-400" />
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">状态</span>
                </div>
                <div className={cn(
                  "text-3xl font-bold",
                  input.value === 1 ? "text-primary dark:text-emerald-400" : "text-zinc-400 dark:text-zinc-500"
                )}>
                  {input.value === 1 ? 'ON' : 'OFF'}
                </div>
              </div>
            </div>
          )}
          
          {toolName === 'control_camera' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/80 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-4 backdrop-blur-sm shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <IconCamera className="size-4 text-zinc-400" />
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">方向</span>
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {input.direction === 1 ? '← 左移' : input.direction === 2 ? '右移 →' : '停止'}
                </div>
              </div>
              
              {input.distance_mm && (
                <div className="rounded-2xl bg-white/80 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-4 backdrop-blur-sm shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <IconChartLine className="size-4 text-zinc-400" />
                    <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">距离</span>
                  </div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-white">{input.distance_mm} <span className="text-lg text-zinc-500 dark:text-zinc-400">mm</span></div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Message */}
        {result?.message && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-2xl p-4 backdrop-blur-sm border shadow-sm",
              isSuccess && "bg-primary/10 dark:bg-primary/20 border-primary/20 dark:border-primary/30",
              isError && "bg-red-500/10 dark:bg-red-500/20 border-red-500/20 dark:border-red-500/30",
              isExecuting && "bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/20 dark:border-blue-500/30"
            )}
          >
            <div className="flex items-center gap-3">
              {isExecuting && <IconLoading className="size-4 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />}
              {isSuccess && <IconCheckOne className="size-4 text-primary dark:text-emerald-400 flex-shrink-0" />}
              {isError && <IconCloseOne className="size-4 text-red-600 dark:text-red-400 flex-shrink-0" />}
              <p className={cn(
                "text-sm font-medium",
                isSuccess && "text-emerald-700 dark:text-emerald-300",
                isError && "text-red-700 dark:text-red-300",
                isExecuting && "text-blue-700 dark:text-blue-300"
              )}>
                {result.message}
              </p>
            </div>
          </motion.div>
        )}

        {/* Error Details */}
        {result?.error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 dark:border-red-500/30 p-4 backdrop-blur-sm shadow-sm"
          >
            <div className="flex items-start gap-3">
              <IconCloseOne className="size-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">错误详情</p>
                <p className="text-sm text-red-700 dark:text-red-300 break-words">{result.error}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
