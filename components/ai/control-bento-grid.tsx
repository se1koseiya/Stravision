"use client"

import { useDeviceData } from "@/lib/hooks/use-device-data"
import { useDeviceControl } from "@/lib/hooks/use-device-control"
import { cn } from "@/lib/utils"
import { 
  Fan, 
  Droplets, 
  Lightbulb, 
  Zap,
  Power,
  Loader2
} from "lucide-react"
import { motion } from "framer-motion"
import { Switch } from "@/components/ui/switch"
import { useState } from "react"
import { toast } from "sonner"

export function ControlBentoGrid() {
  const { deviceData } = useDeviceData()
  const { toggleRelay } = useDeviceControl()
  const [loading, setLoading] = useState<number | null>(null)

  const handleToggle = async (relayId: number, currentState: number) => {
    setLoading(relayId)
    try {
      const success = await toggleRelay(relayId, currentState)
      if (success) {
        const newState = currentState === 1 ? 0 : 1
        toast.success(`设备 ${relayId} 已${newState ? '开启' : '关闭'}`)
      }
    } catch (error) {
      // toast handled in hook
    } finally {
      setLoading(null)
    }
  }

  // Mock data if no real data
  const data = deviceData || {
    relay5: 0, // Water Pump
    relay6: 0, // Fan
    relay7: 0, // Grow Light
    relay8: 0, // White Light
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  }

  const devices = [
    {
      id: 5,
      name: "灌溉水泵",
      icon: Droplets,
      state: data.relay5,
      color: "text-blue-500 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      activeBg: "bg-blue-500 text-white dark:bg-blue-500",
      border: "border-blue-100 dark:border-blue-900/30"
    },
    {
      id: 6,
      name: "通风风扇",
      icon: Fan,
      state: data.relay6,
      color: "text-cyan-500 dark:text-cyan-400",
      bg: "bg-cyan-50 dark:bg-cyan-900/20",
      activeBg: "bg-cyan-500 text-white dark:bg-cyan-500",
      border: "border-cyan-100 dark:border-cyan-900/30"
    },
    {
      id: 7,
      name: "补光灯",
      icon: Zap,
      state: data.relay7,
      color: "text-purple-500 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-900/20",
      activeBg: "bg-purple-500 text-white dark:bg-purple-500",
      border: "border-purple-100 dark:border-purple-900/30"
    },
    {
      id: 8,
      name: "白光照明",
      icon: Lightbulb,
      state: data.relay8,
      color: "text-amber-500 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      activeBg: "bg-amber-500 text-white dark:bg-amber-500",
      border: "border-amber-100 dark:border-amber-900/30"
    }
  ]

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="w-full max-w-4xl mx-auto p-2"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {devices.map((device) => (
          <motion.div
            key={device.id}
            variants={item}
            className={cn(
              "relative overflow-hidden rounded-[24px] p-5 shadow-sm border transition-all duration-300 group cursor-pointer",
              "bg-white dark:bg-zinc-900 hover:shadow-md",
              device.state ? device.border : "border-zinc-100 dark:border-white/5"
            )}
            onClick={() => handleToggle(device.id, device.state)}
          >
            {/* Background glow when active */}
            <div className={cn(
              "absolute inset-0 opacity-0 transition-opacity duration-500",
              device.state ? "opacity-10" : "opacity-0",
              device.activeBg.split(' ')[0] // Extract bg color class
            )} />

            <div className="flex flex-col justify-between h-full gap-6 relative z-10">
              <div className="flex items-start justify-between">
                <div className={cn(
                  "size-10 rounded-full flex items-center justify-center transition-all duration-300",
                  device.state ? device.activeBg : "bg-zinc-100 dark:bg-white/10 text-zinc-400 dark:text-zinc-500"
                )}>
                  <device.icon 
                    size={20} 
                    className={cn(
                      "transition-transform duration-500",
                      device.id === 6 && device.state ? "animate-spin" : "",
                      device.state ? "scale-110" : "scale-100"
                    )} 
                  />
                </div>
                
                <div className="relative">
                   {loading === device.id ? (
                     <div className="size-6 flex items-center justify-center">
                       <Loader2 size={16} className="animate-spin text-zinc-400" />
                     </div>
                   ) : (
                     <div className={cn(
                       "w-10 h-6 rounded-full transition-colors duration-300 relative",
                       device.state ? "bg-zinc-900 dark:bg-white" : "bg-zinc-200 dark:bg-zinc-700"
                     )}>
                        <div className={cn(
                          "absolute top-1 left-1 size-4 rounded-full bg-white transition-transform duration-300 shadow-sm",
                          device.state ? "translate-x-4 bg-white dark:bg-black" : "translate-x-0"
                        )} />
                     </div>
                   )}
                </div>
              </div>

              <div>
                <div className="font-bold text-zinc-900 dark:text-white text-base mb-1 group-hover:text-black dark:group-hover:text-white transition-colors">{device.name}</div>
                <div className="flex items-center gap-2">
                   <span className={cn(
                     "text-xs font-medium transition-colors",
                     device.state ? "text-zinc-900 dark:text-white" : "text-zinc-400 dark:text-zinc-500"
                   )}>
                     {device.state ? "运行中" : "已关闭"}
                   </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
