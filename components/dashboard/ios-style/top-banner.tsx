"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DeviceCommand } from "@/components/realtime-voice-orb"
import { useElderFriendly } from "@/lib/contexts/elder-friendly-context"
import type { DeviceData } from "@/lib/hooks/use-device-data"
import { IconArrowRight, IconCalendar, IconUser } from "@/components/icon";

interface TopBannerProps {
  userName?: string
  className?: string
  deviceData?: DeviceData | null
  onDeviceCommand?: (command: DeviceCommand) => void
}

export function TopBanner({ 
  userName = "User", 
  className,
  /* 🚨 2026-09-24：语音球已从顶栏移除（语音收编进 Copilot 的 Call 态）。
     deviceData / onDeviceCommand 保留在 props 里，调用方无需改动。 */
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
      /* 沉浸光感材质 —— HDS REGULAR 档（内容区卡片，与 dashboard 小组件卡同档，
         因为它俩在视觉上是同层内容，档位不同会显得"两张卡不是一套"）。
         原来 bg-white / dark:bg-zinc-900 是**纯实色板**：不透明 = 材质四件套一样都没有。
         材质数值来自 components/device/material-css.ts（已全局注入，无需本页再导入 CSS）。 */
      "dc-mat dc-mat--regular w-full rounded-[32px] p-6 flex items-center justify-between",
      isElderFriendlyMode && "elder-friendly-text",
      className
    )}>

      {/* Left side: Date and Task Button */}
      <div className="flex items-center gap-6">
         {/* Date Circle —— 卡片**内部**的嵌套表面：HDS THIN（控件压在卡片之上，
             要能让卡片的色光继续透上来，所以比卡片更薄） */}
         <div className="flex items-center gap-3">
            <div className={cn(
              "dc-mat dc-mat--thin rounded-full flex items-center justify-center shrink-0",
              isElderFriendlyMode ? "w-20 h-20" : "w-16 h-16"
            )}>
               <span className={cn(
                 "font-bold text-zinc-900 dark:text-white",
                 isElderFriendlyMode ? "text-3xl" : "text-2xl"
               )}>{dateStr}</span>
            </div>
            <div className="flex flex-col">
               <span className={cn(
                 "font-semibold text-zinc-900 dark:text-white leading-tight",
                 isElderFriendlyMode ? "text-base" : "text-sm"
               )}>{dayStr},</span>
               <span className={cn(
                 "text-zinc-500 dark:text-zinc-400 leading-tight",
                 isElderFriendlyMode ? "text-base" : "text-sm"
               )}>{monthStr}</span>
            </div>
         </div>

         {/* Tasks Button —— 品牌档材质（.dc-ctrl--brand）：从"平涂一块绿"升级成"一块有光的绿玻璃"
             （模糊 + saturate 吸光 + 内缘光），并带按压弹性 + 按压点光源。
             ⚠️ 这里必须删掉 bg-[#059669] / hover:bg-[#10B981] / shadow-*：
                虽然未分层的材质样式确实会赢，但两条写法并存=下一个人改色会改到没生效的那条。 */}
         <Button className={cn(
           "dc-ctrl--brand dc-ctrl--press rounded-full text-white px-6 font-normal group hidden md:flex",
           isElderFriendlyMode ? "h-14 text-lg" : "h-12"
         )}>
            查看任务
            <IconArrowRight className={cn(
              "ml-2 group-hover:translate-x-1 transition-transform",
              isElderFriendlyMode ? "w-5 h-5" : "w-4 h-4"
            )} />
         </Button>

         {/* Calendar Icon Button —— 卡片内的图标按钮：HDS THIN + 按压（点光源定位靠
             .dc-ctrl--press 自带的 position: relative，右上角的小红点也吃同一个定位基准） */}
         <div className={cn(
           "dc-mat dc-mat--thin dc-ctrl--press rounded-full flex items-center justify-center shrink-0 cursor-pointer hidden sm:flex",
           isElderFriendlyMode ? "w-14 h-14" : "w-12 h-12"
         )}>
            <IconCalendar className={cn(
              "text-zinc-600 dark:text-zinc-300",
              isElderFriendlyMode ? "w-6 h-6" : "w-5 h-5"
            )} />
            <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#059669] rounded-full border-2 border-white dark:border-zinc-900" />
         </div>
      </div>

      {/* Middle/Right side: Greeting and Voice Orb */}
      <div className="flex items-center gap-6 ml-auto pl-4">
         <div className="flex flex-col items-end text-right hidden sm:flex">
            <div className="flex items-center gap-2">
               <span className={cn(
                 "font-bold text-zinc-900 dark:text-white tracking-tight",
                 isElderFriendlyMode ? "text-3xl" : "text-2xl"
               )}>你好 {userName}，需要帮忙吗？</span>
               <span className={cn(
                 isElderFriendlyMode ? "text-3xl" : "text-2xl"
               )}>👋</span>
            </div>
            <span className={cn(
              "text-zinc-400 dark:text-zinc-500 font-medium tracking-tight mt-1",
              isElderFriendlyMode ? "text-2xl" : "text-xl"
            )}>| 随时向我提问！</span>
         </div>

      </div>

    </div>
  )
}
