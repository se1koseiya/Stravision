
"use client"

import { useDeviceData } from "@/lib/hooks/use-device-data"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { IconChartLine, IconLight, IconSun, IconThermometer, IconWater, IconWind } from "@/components/icon";

export function DeviceSidebarList() {
  const { deviceData } = useDeviceData()

  const devices = [
    {
      id: "fan",
      name: "通风风扇",
      icon: IconWind,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      isActive: deviceData?.relay6 === 1,
      value: null
    },
    {
      id: "pump",
      name: "灌溉水泵",
      icon: IconWater,
      color: "text-cyan-500",
      bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
      isActive: deviceData?.relay5 === 1,
      value: null
    },
    {
      id: "light",
      name: "补光灯",
      icon: IconSun,
      color: "text-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
      isActive: deviceData?.relay7 === 1,
      value: null
    },
    {
      id: "white-light",
      name: "白光照明",
      icon: IconLight,
      color: "text-yellow-500",
      bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
      isActive: deviceData?.relay8 === 1,
      value: null
    }
  ]

  const sensors = [
    {
      name: "空气温度",
      value: deviceData ? `${deviceData.temperature}°C` : "--",
      icon: IconThermometer,
      color: "text-red-500"
    },
    {
      name: "空气湿度",
      value: deviceData ? `${deviceData.humidity}%` : "--",
      icon: IconWater,
      color: "text-emerald-500"
    },
    {
      name: "CO2 浓度",
      value: deviceData ? `${deviceData.co2} ppm` : "--",
      icon: IconWind,
      color: "text-green-500"
    },
    {
      name: "光照强度",
      value: deviceData ? `${deviceData.light} Lux` : "--",
      icon: IconSun,
      color: "text-orange-500"
    }
  ]

  return (
    <div className="space-y-6 py-4">
      {/* Devices Section */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">执行设备</h3>
        <div className="space-y-2">
          {devices.map((device) => (
            <div 
              key={device.id} 
              className="flex items-center justify-between p-3 rounded-xl border bg-card/50 hover:bg-accent/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", device.bgColor, device.color)}>
                  <device.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium text-sm">{device.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full", device.isActive ? "bg-green-500" : "bg-zinc-300 dark:bg-zinc-600")}></span>
                    {device.isActive ? "运行中" : "已关闭"}
                  </div>
                </div>
              </div>
              <Switch checked={device.isActive} disabled aria-readonly />
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Sensors Section */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">环境传感器</h3>
        <div className="grid grid-cols-2 gap-3">
          {sensors.map((sensor, idx) => (
            <div key={idx} className="p-3 rounded-xl border bg-card/50 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <sensor.icon className={cn("w-4 h-4", sensor.color)} />
                <span className="text-xs">{sensor.name}</span>
              </div>
              <div className="text-lg font-semibold tabular-nums pl-1">
                {sensor.value}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 text-xs text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
        <IconChartLine className="w-4 h-4 mr-1.5" />
        提示：此面板仅展示实时状态，如需控制设备请使用 Automation Action 节点。
      </div>
    </div>
  )
}
