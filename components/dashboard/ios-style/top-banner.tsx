"use client"

import { useState, useEffect } from "react"
import { Calendar, ArrowRight, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { RealtimeVoiceOrb, DeviceCommand } from "@/components/realtime-voice-orb"
import { useElderFriendly } from "@/lib/contexts/elder-friendly-context"
import type { DeviceData } from "@/lib/hooks/use-device-data"

interface TopBannerProps {
  userName?: string
  className?: string
  deviceData?: DeviceData | null
  onDeviceCommand?: (command: DeviceCommand) => void
}

export function TopBanner({ 
  userName = "User", 
  className,
  deviceData,
  onDeviceCommand 
}: TopBannerProps) {
  const { isElderFriendlyMode } = useElderFriendly()
  const [dateStr, setDateStr] = useState("")
  const [dayStr, setDayStr] = useState("")
  const [monthStr, setMonthStr] = useState("")

  useEffect(() => {
    const d = new Date()
    setDateStr(d.getDate().toString())
    setDayStr(d.toLocaleDateString('zh-CN', { weekday: 'short' }))
    setMonthStr(d.toLocaleDateString('zh-CN', { month: 'long' }))
  }, [])

  return (
    <div className={cn(
      "w-full bg-white dark:bg-slate-900 rounded-[32px] p-6 flex items-center justify-between shadow-sm border border-transparent dark:border-slate-800",
      isElderFriendlyMode && "elder-friendly-text",
      className
    )}>

      {/* Left side: Date and Task Button */}
      <div className="flex items-center gap-6">
         {/* Date Circle */}
         <div className="flex items-center gap-3">
            <div className={cn(
              "rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center bg-slate-50 dark:bg-slate-800 shrink-0",
              isElderFriendlyMode ? "w-20 h-20" : "w-16 h-16"
            )}>
               <span className={cn(
                 "font-bold text-slate-900 dark:text-white",
                 isElderFriendlyMode ? "text-3xl" : "text-2xl"
               )}>{dateStr}</span>
            </div>
            <div className="flex flex-col">
               <span className={cn(
                 "font-semibold text-slate-900 dark:text-white leading-tight",
                 isElderFriendlyMode ? "text-base" : "text-sm"
               )}>{dayStr},</span>
               <span className={cn(
                 "text-slate-500 dark:text-slate-400 leading-tight",
                 isElderFriendlyMode ? "text-base" : "text-sm"
               )}>{monthStr}</span>
            </div>
         </div>

         {/* Tasks Button */}
         <Button className={cn(
           "rounded-full bg-[#1677ff] hover:bg-[#4096ff] text-white border-0 px-6 font-normal shadow-md shadow-[#1677ff]/20 group hidden md:flex",
           isElderFriendlyMode ? "h-14 text-lg" : "h-12"
         )}>
            查看任务
            <ArrowRight className={cn(
              "ml-2 group-hover:translate-x-1 transition-transform",
              isElderFriendlyMode ? "w-5 h-5" : "w-4 h-4"
            )} />
         </Button>

         {/* Calendar Icon Button */}
         <div className={cn(
           "rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center bg-slate-50 dark:bg-slate-800 shrink-0 relative cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors hidden sm:flex",
           isElderFriendlyMode ? "w-14 h-14" : "w-12 h-12"
         )}>
            <Calendar className={cn(
              "text-slate-600 dark:text-slate-300",
              isElderFriendlyMode ? "w-6 h-6" : "w-5 h-5"
            )} />
            <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#1677ff] rounded-full border-2 border-white dark:border-slate-900" />
         </div>
      </div>

      {/* Middle/Right side: Greeting and Voice Orb */}
      <div className="flex items-center gap-6 ml-auto pl-4">
         <div className="flex flex-col items-end text-right hidden sm:flex">
            <div className="flex items-center gap-2">
               <span className={cn(
                 "font-bold text-slate-900 dark:text-white tracking-tight",
                 isElderFriendlyMode ? "text-3xl" : "text-2xl"
               )}>你好 {userName}，需要帮忙吗？</span>
               <span className={cn(
                 isElderFriendlyMode ? "text-3xl" : "text-2xl"
               )}>👋</span>
            </div>
            <span className={cn(
              "text-slate-400 dark:text-slate-500 font-medium tracking-tight mt-1",
              isElderFriendlyMode ? "text-2xl" : "text-xl"
            )}>| 随时向我提问！</span>
         </div>

         <div className={cn(
           "shrink-0 flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700",
           isElderFriendlyMode ? "w-24 h-24" : "w-20 h-20"
         )}>
            {/* The real voice orb integrated directly with dashboard-specific system prompt */}
            <RealtimeVoiceOrb 
                size={isElderFriendlyMode ? 68 : 56} 
                autoExecuteCommands={true}
                bubblePosition="left"
                deviceData={deviceData}
                onDeviceCommand={onDeviceCommand}
                systemPrompt={`你是莓小智，一个专业的智慧农业助手，现在用户正在查看数据看板页面。

## 当前页面功能
用户正在数据看板页面，这里展示了：
- 实时环境数据：温度、湿度、光照、CO2浓度
- 土壤数据：土壤湿度、肥力、氮磷钾含量
- 天气信息：当前天气状况和预报
- 光谱分析：植物光合作用相关的光谱数据
- AI洞察：基于数据的智能分析和建议

## 你的职责
1. **数据解读**：帮助用户理解看板上的各项数据指标
2. **趋势分析**：分析数据趋势，指出异常情况
3. **建议提供**：基于当前数据给出种植建议
4. **设备控制**：可以帮助用户控制水泵、风扇、补光灯等设备
5. **问题解答**：回答用户关于数据的任何问题

## 交互方式
- 用简洁、专业但易懂的语言回答
- 主动关注数据异常，提醒用户注意
- 可以建议用户切换到其他页面进行具体操作
- 对于长辈用户，使用更通俗的语言解释专业术语
- 当用户要求控制设备时，直接执行并确认

## 示例对话
用户："温度怎么样？"
你："当前温度17.1°C，处于适宜范围。建议保持这个温度，有利于草莓生长。"

用户："土壤湿度够吗？"
你："土壤湿度40.5%，略微偏干。建议适当增加灌溉，保持在50-60%之间最佳。"

用户："开启风扇"
你："好的，正在为您开启风扇 {"action":"toggle_relay","device":6,"value":1}"

记住：你的目标是让用户轻松理解数据，做出正确的种植决策，并能方便地控制设备。`}
            />
         </div>
      </div>

    </div>
  )
}
