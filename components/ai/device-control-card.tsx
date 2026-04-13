"use client"

import React from 'react';
import { cn } from '@/lib/utils';
import { 
  Wrench, 
  CheckCircle2, 
  Droplets, 
  Fan, 
  Sun, 
  Lightbulb, 
  Palette, 
  Camera, 
  Orbit, 
  RefreshCw, 
  Loader2, 
  XCircle
} from 'lucide-react';

interface DeviceControlCardProps {
  command: any;
  timestamp?: string;
  status?: 'pending' | 'executed' | 'failed' | 'loading';
  className?: string;
  onExecute?: (command: any) => void;
}

export function DeviceControlCard({ command, timestamp, status = 'executed', className, onExecute }: DeviceControlCardProps) {
  let toolName = "设备控制";
  let description = "";
  let themeColor = "text-blue-500 dark:text-blue-400";
  let bgColor = "bg-blue-50/80 dark:bg-blue-500/10";
  let borderColor = "border-blue-200 dark:border-blue-500/20";
  let gradientColor = "from-blue-500/20 via-blue-500/5 to-transparent";
  let Icon = Wrench;

  if (command.action === 'toggle_relay') {
    if (command.device === 5) { 
      toolName = "水泵控制";
      description = command.value === 1 ? "水泵已开启" : "水泵已关闭";
      themeColor = command.value === 1 ? "text-blue-500 dark:text-blue-400" : "text-zinc-500 dark:text-zinc-400";
      bgColor = command.value === 1 ? "bg-blue-50/80 dark:bg-blue-500/10" : "bg-zinc-50/80 dark:bg-zinc-500/10";
      borderColor = command.value === 1 ? "border-blue-200 dark:border-blue-500/20" : "border-zinc-200 dark:border-zinc-500/20";
      gradientColor = command.value === 1 ? "from-blue-500/20 via-blue-500/5 to-transparent" : "from-zinc-500/20 via-zinc-500/5 to-transparent";
      Icon = Droplets;
    }
    else if (command.device === 6) { 
      toolName = "风扇控制";
      description = command.value === 1 ? "风扇已开启" : "风扇已关闭";
      themeColor = command.value === 1 ? "text-cyan-500 dark:text-cyan-400" : "text-zinc-500 dark:text-zinc-400";
      bgColor = command.value === 1 ? "bg-cyan-50/80 dark:bg-cyan-500/10" : "bg-zinc-50/80 dark:bg-zinc-500/10";
      borderColor = command.value === 1 ? "border-cyan-200 dark:border-cyan-500/20" : "border-zinc-200 dark:border-zinc-500/20";
      gradientColor = command.value === 1 ? "from-cyan-500/20 via-cyan-500/5 to-transparent" : "from-zinc-500/20 via-zinc-500/5 to-transparent";
      Icon = Fan;
    }
    else if (command.device === 7) { 
      toolName = "植物全光谱补光灯";
      description = command.value === 1 ? "全光谱补光灯已开启" : "全光谱补光灯已关闭";
      themeColor = command.value === 1 ? "text-amber-500 dark:text-amber-400" : "text-zinc-500 dark:text-zinc-400";
      bgColor = command.value === 1 ? "bg-amber-50/80 dark:bg-amber-500/10" : "bg-zinc-50/80 dark:bg-zinc-500/10";
      borderColor = command.value === 1 ? "border-amber-200 dark:border-amber-500/20" : "border-zinc-200 dark:border-zinc-500/20";
      gradientColor = command.value === 1 ? "from-amber-500/20 via-amber-500/5 to-transparent" : "from-zinc-500/20 via-zinc-500/5 to-transparent";
      Icon = Sun;
    }
    else if (command.device === 8) { 
      toolName = "光照植物补光灯";
      description = command.value === 1 ? "补光灯已开启" : "补光灯已关闭";
      themeColor = command.value === 1 ? "text-yellow-500 dark:text-yellow-400" : "text-zinc-500 dark:text-zinc-400";
      bgColor = command.value === 1 ? "bg-yellow-50/80 dark:bg-yellow-500/10" : "bg-zinc-50/80 dark:bg-zinc-500/10";
      borderColor = command.value === 1 ? "border-yellow-200 dark:border-yellow-500/20" : "border-zinc-200 dark:border-zinc-500/20";
      gradientColor = command.value === 1 ? "from-yellow-500/20 via-yellow-500/5 to-transparent" : "from-zinc-500/20 via-zinc-500/5 to-transparent";
      Icon = Lightbulb;
    }
  } else if (command.action === 'set_led') {
    toolName = "RGB灯光调节";
    description = `设定色彩 RGB(${command.r}, ${command.g}, ${command.b})`;
    themeColor = "text-fuchsia-500 dark:text-fuchsia-400";
    bgColor = "bg-fuchsia-50/80 dark:bg-fuchsia-500/10";
    borderColor = "border-fuchsia-200 dark:border-fuchsia-500/20";
    gradientColor = "from-fuchsia-500/20 via-fuchsia-500/5 to-transparent";
    Icon = Palette;
  } else if (command.action === 'control_camera') {
    toolName = "云台姿态控制";
    const directions: Record<number, string> = { 0: '停止转动', 1: '向左方转动', 2: '向右方转动' };
    description = `云台${directions[command.direction] || '移动'}`;
    themeColor = "text-indigo-500 dark:text-indigo-400";
    bgColor = "bg-indigo-50/80 dark:bg-indigo-500/10";
    borderColor = "border-indigo-200 dark:border-indigo-500/20";
    gradientColor = "from-indigo-500/20 via-indigo-500/5 to-transparent";
    Icon = Orbit;
  } else if (command.action === 'reset_camera') {
    toolName = "云台姿态复位";
    description = "正在执行中心位置复位";
    themeColor = "text-indigo-500 dark:text-indigo-400";
    bgColor = "bg-indigo-50/80 dark:bg-indigo-500/10";
    borderColor = "border-indigo-200 dark:border-indigo-500/20";
    gradientColor = "from-indigo-500/20 via-indigo-500/5 to-transparent";
    Icon = RefreshCw;
  } else if (command.action === 'move_camera_and_look') {
    toolName = "云台巡检拍摄";
    description = "执行移动全景云台并抓拍记录";
    themeColor = "text-violet-500 dark:text-violet-400";
    bgColor = "bg-violet-50/80 dark:bg-violet-500/10";
    borderColor = "border-violet-200 dark:border-violet-500/20";
    gradientColor = "from-violet-500/20 via-violet-500/5 to-transparent";
    Icon = Camera;
  } else if (command.action === 'take_camera_snapshot') {
    toolName = "监控实时抓拍";
    description = "正在拍摄当前视频流画面";
    themeColor = "text-violet-500 dark:text-violet-400";
    bgColor = "bg-violet-50/80 dark:bg-violet-500/10";
    borderColor = "border-violet-200 dark:border-violet-500/20";
    gradientColor = "from-violet-500/20 via-violet-500/5 to-transparent";
    Icon = Camera;
  }

  const iconAnimation = (status === 'loading' || status === 'pending') 
    ? "animate-pulse" 
    : (command.action === 'toggle_relay' && command.device === 6 && command.value === 1) 
      ? "animate-[spin_3s_linear_infinite]" 
      : "";

  return (
    <div className={cn(
      "group relative flex items-center gap-4 px-4 py-3 sm:px-5 sm:py-4 rounded-2xl w-full max-w-[340px] sm:max-w-md",
      "border backdrop-blur-xl transition-all duration-300",
      "hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_8px_24px_-12px_rgba(255,255,255,0.08)]",
      "overflow-hidden cursor-default",
      bgColor,
      borderColor,
      className
    )}>
      {/* Background Gradient Layer */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-50 dark:opacity-30",
        gradientColor
      )} />

      {/* Highlight Top Edge */}
      <div className="absolute inset-x-0 top-0 h-px bg-white/60 dark:bg-white/10" />

      {/* Icon Container with Subtle Glow */}
      <div className={cn("relative shrink-0 z-10 transition-transform duration-300 group-hover:scale-105", themeColor)}>
        <div className="absolute inset-0 bg-current blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-300" />
        <div className={cn(
          "relative flex items-center justify-center w-12 h-12 rounded-xl shadow-sm",
          "bg-white/90 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/5",
          "backdrop-blur-md"
        )}>
          <Icon size={24} strokeWidth={2} className={cn("text-current", iconAnimation)} />
        </div>
      </div>

      {/* Text Details Area */}
      <div className="flex flex-col min-w-0 flex-1 z-10 py-0.5 justify-center">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[15px] leading-tight text-zinc-900 dark:text-zinc-100 tracking-tight">
            {toolName}
          </span>
        </div>
        
        {description && (
          <div className="mt-1 flex items-center">
            <span className={cn(
              "text-[13px] leading-snug font-medium truncate rounded-md transition-colors",
              "text-zinc-500 dark:text-zinc-400",
              "group-hover:text-zinc-700 dark:group-hover:text-zinc-300"
            )}>
              {description}
            </span>
          </div>
        )}
      </div>

      {/* Status Indicators */}
      <div className="shrink-0 flex items-center justify-center z-10 pl-2">
        {status === 'loading' || status === 'pending' ? (
          <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/5", themeColor)}>
            <Loader2 size={14} className="animate-spin text-current" />
            <span className="text-xs font-medium text-current whitespace-nowrap">执行中</span>
          </div>
        ) : status === 'executed' ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/10">
            <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">已完成</span>
          </div>
        ) : status === 'failed' ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/10">
            <XCircle size={14} className="text-rose-600 dark:text-rose-400" />
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400 whitespace-nowrap">失败</span>
          </div>
        ) : null}
      </div>
      
      {/* Glossy overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
    </div>
  );
}
