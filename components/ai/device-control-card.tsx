"use client"

import { cn } from '@/lib/utils';
import { DEVICE_IDS, STEPPER } from '@/lib/constants';
import { 
  CheckCircle2, 
  Droplets, 
  Fan, 
  Lightbulb, 
  Loader2, 
  XCircle,
  Power,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { motion } from 'framer-motion';

interface DeviceControlCardProps {
  command: any;
  status?: 'pending' | 'executed' | 'failed' | 'loading';
  error?: string; // 错误信息
  className?: string;
  onExecute?: (command: any) => void;
  onRetry?: () => void; // 重试回调
}

export function DeviceControlCard({ command, status = 'executed', error, className, onExecute, onRetry }: DeviceControlCardProps) {
  // 设备映射与元数据
  const getDeviceMeta = () => {
    const deviceId = command.device;
    let name = command.deviceName || "智能指令";
    
    // 强制映射
    if (deviceId === DEVICE_IDS.PUMP) name = "灌溉水泵";
    if (deviceId === DEVICE_IDS.FAN) name = "环境风扇";
    if (deviceId === DEVICE_IDS.RGB_LIGHT) name = "植物全光谱补光灯";
    if (deviceId === DEVICE_IDS.WHITE_LIGHT) name = "光照植物补光灯";

    if (command.action === 'set_led') {
      return {
        name: "补光色温阵列",
        label: "光谱控制",
        desc: `RGB: ${command.r}, ${command.g}, ${command.b}`,
        icon: Lightbulb,
        color: "text-amber-500 dark:text-amber-400",
        bgGradient: "from-amber-500/5 to-orange-500/5 dark:from-amber-500/10 dark:to-orange-500/5",
        accentColor: "bg-amber-500",
        isOn: true // LED 设置总是"开启"状态
      };
    }

    const isOn = command.value === 1;

    if (name.includes('水泵')) {
      return {
        name,
        label: "流体动力",
        desc: isOn ? "启动水利循环" : "切断水源供应",
        icon: Droplets,
        color: "text-blue-500 dark:text-blue-400",
        bgGradient: "from-blue-500/5 to-cyan-500/5 dark:from-blue-500/10 dark:to-cyan-500/5",
        accentColor: "bg-blue-500",
        isOn
      };
    }

    if (name.includes('风扇')) {
      return {
        name,
        label: "空气调节",
        desc: isOn ? "启动大气循环" : "关闭通风系统",
        icon: Fan,
        color: "text-cyan-500 dark:text-cyan-400",
        bgGradient: "from-cyan-500/5 to-blue-500/5 dark:from-cyan-500/10 dark:to-blue-500/5",
        accentColor: "bg-cyan-500",
        isOn
      };
    }

    if (name.includes('补光灯')) {
      return {
        name,
        label: "植物光照",
        desc: isOn ? "光合作用增强" : "进入休眠模式",
        icon: Lightbulb,
        color: "text-amber-500 dark:text-amber-400",
        bgGradient: "from-amber-500/5 to-orange-500/5 dark:from-amber-500/10 dark:to-orange-500/5",
        accentColor: "bg-amber-500",
        isOn
      };
    }

    if (name.includes('云台') || name.includes('摄像头') || command.action === 'control_camera' || command.action === 'move_camera_and_look') {
      const direction = command.direction === 1 ? '左移' : command.direction === 2 ? '右移' : '控制';
      const distance = command.distance_mm || (command.pulses ? (command.pulses / STEPPER.PULSES_PER_MM).toFixed(1) : '未知');
      
      // 如果是 move_camera_and_look，显示为视觉巡检
      if (command.action === 'move_camera_and_look') {
        return {
          name: "AI视觉巡检",
          label: "智能巡检系统",
          desc: `${direction} ${distance}mm 并拍摄分析`,
          icon: Power,
          color: "text-purple-500 dark:text-purple-400",
          bgGradient: "from-purple-500/5 to-violet-500/5 dark:from-purple-500/10 dark:to-violet-500/5",
          accentColor: "bg-purple-500",
          isOn: true
        };
      }
      
      return {
        name: name.includes('云台') ? name : "摄像头云台",
        label: "位置移动控制",
        desc: `${direction} ${distance}mm`,
        icon: Power,
        color: "text-purple-500 dark:text-purple-400",
        bgGradient: "from-purple-500/5 to-violet-500/5 dark:from-purple-500/10 dark:to-violet-500/5",
        accentColor: "bg-purple-500",
        isOn: true // 云台移动总是"执行"状态
      };
    }

    return {
      name,
      label: "控制单元",
      desc: isOn ? "电源接通" : "电源断开",
      icon: Power,
      color: "text-primary dark:text-emerald-400",
      bgGradient: "from-primary/5 to-green-500/5 dark:from-primary/10 dark:to-green-500/5",
      accentColor: "bg-primary",
      isOn
    };
  };

  const meta = getDeviceMeta();
  const Icon = meta.icon;
  const isExecuting = status === 'loading'; // 只有loading才是执行中，pending是等待用户确认
  
  // 检测是否是云台边界错误
  const isBoundaryError = error && (
    error.includes('已经到达') || 
    error.includes('原点') || 
    error.includes('边界') ||
    error.includes('limit')
  );
  
  const isCameraControl = command.action === 'control_camera' || 
                          command.action === 'move_camera_and_look' || 
                          meta.name.includes('云台') ||
                          meta.name.includes('视觉巡检');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative rounded-3xl overflow-hidden w-full",
        "bg-gradient-to-br from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-950",
        "border border-zinc-200/50 dark:border-white/5",
        "shadow-lg shadow-black/5 dark:shadow-black/10",
        className
      )}
    >
      {/* Background Gradient Accent */}
      <div className={cn("absolute inset-0 bg-gradient-to-br", meta.bgGradient)} />
      
      {/* Status Indicator Bar - 左侧彩色条 */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1",
        status === 'loading' ? "bg-amber-500" :
        status === 'pending' ? "bg-blue-500" :
        status === 'executed' ? (meta.isOn ? "bg-primary" : "bg-zinc-400 dark:bg-zinc-600") : 
        "bg-red-500"
      )} />

      <div className="relative p-5 flex items-center gap-4">
        {/* Left Icon Area */}
        <div className="relative shrink-0">
          <div className={cn(
            "size-14 rounded-2xl flex items-center justify-center transition-all duration-300",
            "bg-white/80 dark:bg-white/5 border shadow-sm",
            meta.isOn 
              ? "border-zinc-200 dark:border-white/10" 
              : "border-zinc-300 dark:border-white/5 opacity-60"
          )}>
            {isExecuting ? (
              <Loader2 className={cn("size-7 animate-spin", meta.color)} strokeWidth={2} />
            ) : (
              <Icon className={cn("size-7", meta.color)} strokeWidth={2} />
            )}
          </div>
          
          {/* Glow effect when ON */}
          {meta.isOn && !isExecuting && (
            <div className={cn(
              "absolute inset-0 blur-xl opacity-20 dark:opacity-30 -z-10",
              meta.accentColor
            )} />
          )}
        </div>

        {/* Middle Content Area */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              {meta.label}
            </span>
            {status === 'loading' && (
              <div className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">执行中</span>
              </div>
            )}
            {status === 'pending' && (
              <div className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">等待确认</span>
              </div>
            )}
          </div>
          
          <h4 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight mb-1">
            {meta.name}
          </h4>
          
          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
            {meta.desc}
          </p>
        </div>

        {/* Right Status/Action Area */}
        <div className="shrink-0">
          {status === 'loading' ? (
            <div className="flex flex-col items-center gap-1.5">
              <div className="size-14 rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center">
                <Loader2 size={24} className="text-amber-600 dark:text-amber-400 animate-spin" strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                执行中
              </span>
            </div>
          ) : status === 'pending' ? (
            <button 
              onClick={() => onExecute && onExecute(command)}
              className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-xs transition-all hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2"
            >
              执行
              <ArrowRight size={14} />
            </button>
          ) : status === 'executed' ? (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="flex flex-col items-center gap-1.5"
            >
              {/* ON/OFF 状态显示 - 超级明显 */}
              {command.action === 'set_led' ? (
                <div className="flex flex-col items-center">
                  <div className="size-14 rounded-2xl bg-primary/15 dark:bg-primary/25 border-2 border-primary/40 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 size={26} className="text-primary dark:text-emerald-400" strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] font-bold text-primary dark:text-emerald-400 uppercase tracking-wider mt-1">
                    已设置
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  {meta.isOn ? (
                    // ON 状态 - 绿色高亮
                    <>
                      <div className="size-14 rounded-2xl bg-primary/15 dark:bg-primary/25 border-2 border-primary/40 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <CheckCircle2 size={26} className="text-primary dark:text-emerald-400" strokeWidth={2.5} />
                      </div>
                      <div className="mt-1.5 px-3 py-1 rounded-full bg-primary/20 dark:bg-primary/30 border border-primary/40">
                        <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                          ON
                        </span>
                      </div>
                    </>
                  ) : (
                    // OFF 状态 - 灰色暗淡
                    <>
                      <div className="size-14 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80 border-2 border-zinc-300/60 dark:border-zinc-700/60 flex items-center justify-center opacity-70">
                        <Power size={26} className="text-zinc-500 dark:text-zinc-400" strokeWidth={2.5} />
                      </div>
                      <div className="mt-1.5 px-3 py-1 rounded-full bg-zinc-200/80 dark:bg-zinc-800/80 border border-zinc-300/60 dark:border-zinc-700/60">
                        <span className="text-[11px] font-black text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                          OFF
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          ) : status === 'failed' ? (
            <div className="flex flex-col items-center gap-1.5">
              <div className="size-14 rounded-2xl border-2 border-red-500/40 bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center shadow-lg shadow-red-500/20">
                <XCircle size={26} className="text-red-600 dark:text-red-400" strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                失败
              </span>
            </div>
          ) : (
            <button 
              onClick={() => onExecute && onExecute(command)}
              className="px-5 py-2.5 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-xs transition-all hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2"
            >
              执行
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Error Details Section - 云台边界错误特殊处理 */}
      {status === 'failed' && error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
          className={cn(
            "relative border-t overflow-hidden",
            isBoundaryError 
              ? "bg-red-50/80 dark:bg-red-950/20 border-red-200/50 dark:border-red-900/30" 
              : "bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-200/50 dark:border-zinc-800/50"
          )}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className={cn(
                "shrink-0 size-8 rounded-xl flex items-center justify-center",
                isBoundaryError 
                  ? "bg-red-100 dark:bg-red-900/30" 
                  : "bg-zinc-200 dark:bg-zinc-800"
              )}>
                <XCircle 
                  size={18} 
                  className={cn(
                    isBoundaryError 
                      ? "text-red-600 dark:text-red-400" 
                      : "text-zinc-600 dark:text-zinc-400"
                  )} 
                  strokeWidth={2.5} 
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <h5 className={cn(
                  "text-xs font-bold mb-1",
                  isBoundaryError 
                    ? "text-red-700 dark:text-red-300" 
                    : "text-zinc-700 dark:text-zinc-300"
                )}>
                  {isBoundaryError ? '⚠️ 错误详情' : '错误详情'}
                </h5>
                <p className={cn(
                  "text-xs leading-relaxed",
                  isBoundaryError 
                    ? "text-red-600 dark:text-red-400" 
                    : "text-zinc-600 dark:text-zinc-400"
                )}>
                  {error}
                </p>
                
                {/* 云台边界错误的特殊提示 */}
                {isBoundaryError && isCameraControl && onRetry && (
                  <div className="mt-3 pt-3 border-t border-red-200/50 dark:border-red-900/30">
                    <button
                      onClick={onRetry}
                      className="w-full px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white text-xs font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-lg flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={14} />
                      让AI重新规划方向
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
