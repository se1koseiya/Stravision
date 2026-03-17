import React from 'react';
import { cn } from '@/lib/utils';
import { Cpu, Zap, Lightbulb, Fan, Droplets, Camera, CheckCircle2, Power, Terminal } from 'lucide-react';

interface DeviceControlCardProps {
  command: any;
  timestamp?: string;
  status?: 'pending' | 'executed' | 'failed';
  className?: string;
}

export function DeviceControlCard({ command, timestamp, status = 'executed', className }: DeviceControlCardProps) {
  // Determine icon and title based on action/device
  let Icon = Terminal;
  let title = "设备控制指令";
  let colorClass = "text-purple-500";

  if (command.action === 'toggle_relay') {
    Icon = Power;
    if (command.device === 5) { title = "水泵控制"; Icon = Droplets; colorClass = "text-blue-500"; }
    else if (command.device === 6) { title = "风扇控制"; Icon = Fan; colorClass = "text-cyan-500"; }
    else if (command.device === 7) { title = "补光灯电源"; Icon = Zap; colorClass = "text-yellow-500"; }
    else if (command.device === 8) { title = "白灯控制"; Icon = Lightbulb; colorClass = "text-orange-500"; }
  } else if (command.action === 'set_led') {
    title = "RGB补光灯调节";
    Icon = Lightbulb;
    colorClass = "text-pink-500";
  } else if (command.action === 'control_camera') {
    title = "云台控制";
    Icon = Camera;
    colorClass = "text-indigo-500";
  }

  // Format time
  const timeStr = timestamp || new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const jsonStr = JSON.stringify(command, null, 2);

  return (
    <div className={cn(
      "w-full max-w-2xl my-4 rounded-xl border border-zinc-200 dark:border-white/10 overflow-hidden shadow-sm font-sans",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-50/80 dark:bg-[#111111]/80 border-b border-zinc-200 dark:border-white/10">
        <div className="flex items-center gap-2.5">
           <Icon size={16} className={colorClass} strokeWidth={2.5} />
           <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{title}</span>
           <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono bg-zinc-200/50 dark:bg-white/5 px-1.5 py-0.5 rounded ml-1">
             {timeStr}
           </span>
        </div>
        {status === 'executed' && (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={14} />
            <span>已执行</span>
          </div>
        )}
      </div>

      {/* Code Content */}
      <div className="bg-white dark:bg-[#1C1C1E] p-4 overflow-x-auto">
        <div className="flex items-start gap-3">
          <Terminal size={14} className="text-zinc-300 dark:text-zinc-600 mt-0.5 shrink-0" />
          <pre className="font-mono text-[12px] leading-relaxed text-zinc-600 dark:text-zinc-300">
            {jsonStr}
          </pre>
        </div>
      </div>
    </div>
  );
}
