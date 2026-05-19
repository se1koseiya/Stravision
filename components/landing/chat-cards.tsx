"use client"

import { Video, Wifi, CalendarClock, Fan, Power, AlertTriangle, LineChart, Bug } from "lucide-react";
import { Timer } from "@/components/animate-ui/icons/timer";
import { motion } from "framer-motion"

export function MonitorCardMock() {
  return (
    <div className="w-full max-w-sm bg-black/40 border border-gray-800 rounded-xl overflow-hidden backdrop-blur-sm">
      <div className="relative aspect-video bg-background group">
        <div className="absolute inset-0 flex items-center justify-center">
          <Video className="w-8 h-8 text-gray-700" />
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-white/90 font-medium tracking-wide">LIVE</span>
        </div>
        <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/60 text-[10px] text-white/80">
          温室 1 号摄像头
        </div>
      </div>
      <div className="p-3 flex items-center justify-between border-t border-gray-800/50">
        <div className="flex items-center gap-2">
          <Wifi className="w-3.5 h-3.5 text-green-500" />
          <span className="text-xs text-muted-foreground">信号良好</span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">1080P • 30FPS</span>
      </div>
    </div>
  )
}

export function DeviceControlCardMock() {
  return (
    <div className="w-full max-w-sm bg-black/40 border border-gray-800 rounded-xl p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <Fan className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-200">排风扇控制</h4>
            <span className="text-xs text-green-400">运行中</span>
          </div>
        </div>
        <div className="px-2 py-1 rounded bg-green-500/20 border border-green-500/20 text-green-400 text-xs">
          ON
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>风速等级</span>
          <span>3 级</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1.5">
          <div className="bg-green-500 h-1.5 rounded-full" style={{ width: "60%" }} />
        </div>
      </div>
    </div>
  )
}

export function TaskCardMock() {
  return (
    <div className="w-full max-w-sm bg-black/40 border border-gray-800 rounded-xl p-4 backdrop-blur-sm flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
        <CalendarClock className="w-5 h-5 text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-medium text-gray-200">定时补光任务</h4>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/20">
            执行中
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-2">计划执行：16:30 关闭补光灯</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card/50 rounded-lg p-2">
          <Timer className="w-3.5 h-3.5" />
          <span>剩余时间: 01:59:45</span>
        </div>
      </div>
    </div>
  )
}

export function DiseaseCardMock() {
  return (
    <div className="w-full max-w-sm bg-black/40 border border-gray-800 rounded-xl p-4 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
          <Bug className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-200">病虫害检测报告</h4>
          <span className="text-xs text-red-400">检测到高风险</span>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-red-300">草莓白粉病</span>
            <span className="text-xs font-bold text-red-400">92% 置信度</span>
          </div>
          <div className="w-full bg-red-500/10 rounded-full h-1.5">
            <div className="bg-red-500 h-1.5 rounded-full" style={{ width: "92%" }} />
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground leading-relaxed bg-card/30 p-3 rounded-lg">
          建议立即隔离病株，并使用碳酸氢钾或硫磺熏蒸进行防治。保持通风良好，降低环境湿度。
        </div>
      </div>
    </div>
  )
}

export function DataChartCardMock() {
  return (
    <div className="w-full max-w-sm bg-black/40 border border-gray-800 rounded-xl p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <LineChart className="w-4 h-4 text-blue-400" />
          <h4 className="text-sm font-medium text-gray-200">近7天生长环境数据</h4>
        </div>
      </div>
      
      <div className="h-32 flex items-end justify-between gap-1 px-2">
        {[45, 52, 49, 62, 58, 65, 70].map((h, i) => (
          <div key={i} className="w-full bg-blue-500/10 rounded-t-sm relative group">
            <div 
              className="absolute bottom-0 left-0 right-0 bg-blue-500/40 rounded-t-sm transition-all group-hover:bg-blue-500/60"
              style={{ height: `${h}%` }}
            />
            {/* Tooltip on hover would go here in real implementation */}
          </div>
        ))}
      </div>
      
      <div className="flex justify-between mt-3 text-[10px] text-muted-foreground font-mono">
        <span>MON</span>
        <span>TUE</span>
        <span>WED</span>
        <span>THU</span>
        <span>FRI</span>
        <span>SAT</span>
        <span>SUN</span>
      </div>
    </div>
  )
}

