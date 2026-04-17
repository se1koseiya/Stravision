/**
 * 增强的设备控制反馈组件
 * 
 * 提供动画、状态确认和详细反馈
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, Zap, Fan, Droplets, Lightbulb, Thermometer } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface DeviceCommand {
  deviceId: number;
  deviceName: string;
  action: 'on' | 'off' | 'toggle';
  value?: number;
}

export interface DeviceResult {
  success: boolean;
  oldState?: number;
  newState?: number;
  executionTime?: number;
  error?: string;
  verified?: boolean;
}

export interface EnhancedDeviceFeedbackProps {
  command: DeviceCommand;
  result: DeviceResult;
  onClose?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

/**
 * 获取设备图标
 */
function getDeviceIcon(deviceId: number, animated: boolean = false) {
  const iconClass = animated ? 'animate-pulse' : '';
  
  switch (deviceId) {
    case 5: // 水泵
      return <Droplets className={`size-8 text-blue-500 ${iconClass}`} />;
    case 6: // 风扇
      return <Fan className={`size-8 text-cyan-500 ${iconClass}`} />;
    case 7: // 灯光
      return <Lightbulb className={`size-8 text-yellow-500 ${iconClass}`} />;
    case 8: // 加热
      return <Thermometer className={`size-8 text-red-500 ${iconClass}`} />;
    default:
      return <Zap className={`size-8 text-purple-500 ${iconClass}`} />;
  }
}

/**
 * 状态转换动画
 */
function StateTransition({ from, to }: { from?: number; to?: number }) {
  if (from === undefined || to === undefined) {
    return null;
  }
  
  const fromState = from === 1 ? '开启' : '关闭';
  const toState = to === 1 ? '开启' : '关闭';
  
  if (fromState === toState) {
    return null;
  }
  
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
        {fromState}
      </span>
      <motion.div
        initial={{ x: -10, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <svg className="size-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </motion.div>
      <motion.span
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className={`px-2 py-1 rounded-lg font-medium ${
          to === 1
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
        }`}
      >
        {toState}
      </motion.span>
    </div>
  );
}

/**
 * 确认信息
 */
function ConfirmationMessage({ result }: { result: DeviceResult }) {
  if (result.success) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <CheckCircle2 className="size-5" />
          <span className="font-medium">操作成功</span>
        </div>
        
        {result.verified && (
          <p className="text-xs text-green-600 dark:text-green-500">
            ✓ 已验证设备状态
          </p>
        )}
        
        {result.executionTime && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            耗时: {(result.executionTime / 1000).toFixed(2)}秒
          </p>
        )}
      </div>
    );
  } else {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
          <XCircle className="size-5" />
          <span className="font-medium">操作失败</span>
        </div>
        
        {result.error && (
          <p className="text-xs text-red-600 dark:text-red-500">
            {result.error}
          </p>
        )}
      </div>
    );
  }
}

/**
 * 增强的设备控制反馈组件
 */
export function EnhancedDeviceFeedback({
  command,
  result,
  onClose,
  autoClose = true,
  autoCloseDelay = 3000
}: EnhancedDeviceFeedbackProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    if (autoClose && result.success) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          onClose?.();
        }, 300);
      }, autoCloseDelay);
      
      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay, result.success, onClose]);
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-6 right-6 z-50 max-w-sm"
        >
          <div className={`rounded-2xl p-6 shadow-2xl backdrop-blur-xl border ${
            result.success
              ? 'bg-white/90 dark:bg-zinc-900/90 border-green-200 dark:border-green-800'
              : 'bg-white/90 dark:bg-zinc-900/90 border-red-200 dark:border-red-800'
          }`}>
            {/* 背景渐变 */}
            <div className={`absolute inset-0 rounded-2xl opacity-10 ${
              result.success
                ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                : 'bg-gradient-to-br from-red-500 to-rose-500'
            }`} />
            
            <div className="relative space-y-4">
              {/* 设备图标和名称 */}
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ rotate: -10 }}
                  animate={{ rotate: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  {getDeviceIcon(command.deviceId, result.success)}
                </motion.div>
                
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white">
                    {command.deviceName}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {command.action === 'on' ? '开启' : command.action === 'off' ? '关闭' : '切换'}
                  </p>
                </div>
              </div>
              
              {/* 状态转换 */}
              <StateTransition from={result.oldState} to={result.newState} />
              
              {/* 确认信息 */}
              <ConfirmationMessage result={result} />
              
              {/* 关闭按钮 */}
              {!autoClose && (
                <button
                  onClick={() => {
                    setIsVisible(false);
                    setTimeout(() => onClose?.(), 300);
                  }}
                  className="w-full py-2 px-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium transition-colors"
                >
                  关闭
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * 设备控制加载状态
 */
export function DeviceControlLoading({ deviceName }: { deviceName: string }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className="fixed bottom-6 right-6 z-50"
    >
      <div className="rounded-2xl p-6 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl">
        <div className="flex items-center gap-3">
          <Loader2 className="size-6 text-blue-500 animate-spin" />
          <div>
            <p className="font-medium text-zinc-900 dark:text-white">
              正在控制 {deviceName}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              请稍候...
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
