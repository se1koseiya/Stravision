// components/xiaozhi/FloatingXiaozhi.tsx
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { XiaozhiPanel, Message } from "./XiaozhiPanel";
import { useSpeechRecognition } from "@/lib/hooks/use-speech-recognition";
import { toast } from "sonner";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator, ContextMenuCheckboxItem } from "@/components/ui/context-menu";
import { RealtimeVoiceOrb, VoiceStatus, DeviceCommand, ScheduleTaskCommand, NavigateCommand } from "@/components/realtime-voice-orb";
import { usePathname, useRouter } from "next/navigation";
import { useDeviceData } from "@/lib/hooks/use-device-data";
import { DeviceControlOverlay } from "./DeviceControlOverlay";
import { getVoiceSettings } from "@/components/ai-settings-dialog";

// Re-export for compatibility
export type XiaozhiStatus = VoiceStatus;

// Device names mapping
const DEVICE_NAMES: Record<string, string> = {
  '5': '水泵',
  '6': '风扇',
  '7': '补光灯',
  '8': '白灯'
};

// Storage key for orb position
const ORB_POSITION_KEY = 'xiaozhi-orb-position';

// Default position (bottom-right)
const DEFAULT_POSITION = { x: 0, y: 0 };

function FloatingXiaozhiContent() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<XiaozhiStatus>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSmartWakeEnabled, setIsSmartWakeEnabled] = useState(false);
  const hasUserEnabledWakeRef = useRef(false);
  
  // Voice settings from AI settings dialog
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState('Mochi');
  
  // Draggable position state
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [isDragging, setIsDragging] = useState(false);
  
  // Device control overlay state
  const [isExecutingControl, setIsExecutingControl] = useState(false);
  const [executingDeviceName, setExecutingDeviceName] = useState("");
  const [devicePillExpanded, setDevicePillExpanded] = useState(false);
  
  // Get device data for AI context
  const { deviceData } = useDeviceData();

  // Load voice settings on mount and listen for changes
  useEffect(() => {
    const loadVoiceSettings = () => {
      const settings = getVoiceSettings();
      setVoiceEnabled(settings.enabled);
      setSelectedVoice(settings.voice);
    };
    
    loadVoiceSettings();
    
    // Listen for storage changes (when settings are saved in another tab/component)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'xiaozhi-voice-settings') {
        loadVoiceSettings();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also poll periodically in case settings change in same tab
    const interval = setInterval(loadVoiceSettings, 2000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Load saved position on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ORB_POSITION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          setPosition(parsed);
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, []);

  // Save position when drag ends
  const handleDragEnd = useCallback((_: any, info: { point: { x: number; y: number }; offset: { x: number; y: number } }) => {
    setIsDragging(false);
    const newPosition = {
      x: position.x + info.offset.x,
      y: position.y + info.offset.y
    };
    setPosition(newPosition);
    try {
      localStorage.setItem(ORB_POSITION_KEY, JSON.stringify(newPosition));
    } catch (e) {
      // Ignore storage errors
    }
  }, [position]);

  // Reset position to default
  const resetPosition = useCallback(() => {
    setPosition(DEFAULT_POSITION);
    try {
      localStorage.removeItem(ORB_POSITION_KEY);
    } catch (e) {}
    toast.success('位置已重置');
  }, []);

  // Handle device command from voice orb
  const handleDeviceCommand = useCallback((cmd: DeviceCommand) => {
    let deviceName: string;
    if (cmd.action === 'set_led') {
      deviceName = 'RGB补光灯';
    } else if (cmd.action === 'control_camera') {
      const directionNames = ['停止', '左移', '右移'];
      deviceName = `摄像头云台${directionNames[cmd.direction ?? 0] || ''}`;
    } else {
      deviceName = DEVICE_NAMES[String(cmd.device)] || `设备${cmd.device}`;
    }
    
    // Start the overlay animation
    setIsExecutingControl(true);
    setExecutingDeviceName(deviceName);
    setTimeout(() => setDevicePillExpanded(true), 150);
    
    // Auto-hide after delay
    setTimeout(() => {
      setDevicePillExpanded(false);
      setTimeout(() => {
        setExecutingDeviceName("");
        setTimeout(() => setIsExecutingControl(false), 500);
      }, 300);
    }, 2500);
  }, []);

  // Handle schedule task from voice orb
  const handleScheduleTask = useCallback((task: ScheduleTaskCommand) => {
    // Show overlay for task creation
    setIsExecutingControl(true);
    setExecutingDeviceName(`定时任务: ${task.title}`);
    setTimeout(() => setDevicePillExpanded(true), 150);
    
    // Auto-hide after delay
    setTimeout(() => {
      setDevicePillExpanded(false);
      setTimeout(() => {
        setExecutingDeviceName("");
        setTimeout(() => setIsExecutingControl(false), 500);
      }, 300);
    }, 2500);
  }, []);

  // Handle navigate command from voice orb
  const router = useRouter();
  const handleNavigate = useCallback((cmd: NavigateCommand) => {
    // Navigate to the specified page
    const pageRoutes: Record<string, string> = {
      'dashboard': '/dashboard',
      'monitor': '/monitor',
      'device-control': '/device-control',
      'ai-assistant': '/ai-assistant',
      'profile': '/profile',
      'settings': '/settings'
    };
    
    const route = pageRoutes[cmd.page];
    if (route) {
      router.push(route);
    }
  }, [router]);

  // Handle quota exceeded
  const handleQuotaExceeded = useCallback(() => {
    // Could show a dialog or redirect to plans page
    toast.error('语音对话额度已用完，请明天再来或升级套餐');
  }, []);

  // Handle transcript from RealtimeVoiceOrb
  const handleTranscript = useCallback((text: string, isUser: boolean) => {
    setMessages(prev => {
      const last = prev[prev.length - 1];
      const role = isUser ? 'user' : 'assistant';
      
      // If same role and recent, append
      if (last && last.role === role && last.timestamp > Date.now() - 3000) {
        return [
          ...prev.slice(0, -1),
          { ...last, content: last.content + ' ' + text }
        ];
      }
      
      return [
        ...prev,
        { id: Date.now().toString(), role, content: text, timestamp: Date.now() }
      ];
    });
  }, []);

  // Handle status change from orb
  const handleStatusChange = useCallback((newStatus: VoiceStatus) => {
    setStatus(newStatus);
  }, []);

  // Handle errors
  const handleError = useCallback((error: string) => {
    toast.error(error);
  }, []);

  // --- Smart Wake Logic (Web Speech API) ---
  const {
    isListening: isWakeListening,
    startListening: startWakeListening,
    stopListening: stopWakeListening,
    isSupported: isWakeSupported,
    resetTranscript
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    lang: 'zh-CN',
    onResult: (text) => {
       const clean = text.replace(/[.,!?]/g, '').toLowerCase();
       if (clean.includes('小智小智') || clean.includes('小纸小纸') || clean.includes('小志小志')) {
          handleWakeWordTriggered();
       }
    },
    onError: (msg) => {
      toast.error(msg);
      if (msg.includes('麦克风') || msg.includes('无法启动')) {
        hasUserEnabledWakeRef.current = false;
        setIsSmartWakeEnabled(false);
      }
    },
    onEnd: () => {
      if (!hasUserEnabledWakeRef.current) return;
      if (!isSmartWakeEnabled) return;
      if (status !== 'idle') return;
      setTimeout(() => {
        if (!hasUserEnabledWakeRef.current) return;
        if (!isSmartWakeEnabled) return;
        if (status !== 'idle') return;
        startWakeListening();
      }, 500);
    }
  });

  const handleWakeWordTriggered = useCallback(() => {
    if (status !== 'idle') return;
    
    toast.success("小智已唤醒！");
    resetTranscript();
    stopWakeListening();
    
    setIsOpen(true);
  }, [status, resetTranscript, stopWakeListening]);

  const toggleSmartWake = () => {
    if (!isWakeSupported) {
      toast.error("当前浏览器不支持语音唤醒 (Web Speech API)");
      return;
    }
    
    const next = !isSmartWakeEnabled;
    setIsSmartWakeEnabled(next);
    
    if (next) {
      hasUserEnabledWakeRef.current = true;
      startWakeListening();
      toast.success("智能唤醒已开启，试着说'小智小智'");
    } else {
      hasUserEnabledWakeRef.current = false;
      stopWakeListening();
      toast.info("智能唤醒已关闭");
    }
  };

  const handleOrbDoubleClick = () => {
    toggleSmartWake();
  };

  const handleSendMessage = (text: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() }]);
  };

  const handleStartVoice = () => {
    if (isWakeListening) stopWakeListening();
  };

  const handleStopVoice = () => {
    if (isSmartWakeEnabled) startWakeListening();
  };

  // If voice is disabled, don't render anything
  if (!voiceEnabled) return null;

  return (
    <>
      {/* Device Control Overlay - gradient border and dynamic island */}
      <DeviceControlOverlay
        isExecuting={isExecutingControl}
        deviceName={executingDeviceName}
        isExpanded={devicePillExpanded}
      />

      {/* Panel */}
      <XiaozhiPanel 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        messages={messages}
        status={status}
        onSendMessage={handleSendMessage}
        onStartVoice={handleStartVoice}
        onStopVoice={handleStopVoice}
      />

      {/* Floating Orb with Context Menu */}
      <ContextMenu>
        <ContextMenuTrigger>
          <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.05}
            whileDrag={{ scale: 1.1, cursor: "grabbing" }}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            className="fixed bottom-8 right-8 z-[60] touch-none select-none"
            style={{ x: position.x, y: position.y }}
            onDoubleClick={handleOrbDoubleClick}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <div className="relative">
              {/* RealtimeVoiceOrb handles all voice interaction */}
              <RealtimeVoiceOrb
                size={96}
                onStatusChange={handleStatusChange}
                onTranscript={handleTranscript}
                onError={handleError}
                onDeviceCommand={handleDeviceCommand}
                onScheduleTask={handleScheduleTask}
                onNavigate={handleNavigate}
                onQuotaExceeded={handleQuotaExceeded}
                deviceData={deviceData}
                autoExecuteCommands={true}
                className="fixed bottom-0 right-0" // added fixed class back here just for floating version
                instructions={`你是莓小智，是"莓界智慧农业平台"的大棚智能管家。你的职责是帮助用户管理智能大棚、分析环境数据、控制设备。

## 你的性格
- 专业、贴心、干练、偶尔幽默
- 用中文简洁回答问题
- 像经验丰富的农艺师一样给出建议

## 草莓种植最佳实践
- 最佳温度: 白天20-25°C，夜间10-15°C
- 最佳湿度: 60-80%
- 最佳光照: 30000-50000 lux
- 土壤湿度: 60-80%

## 设备说明
- 水泵(Relay5): 灌溉系统
- 风扇(Relay6): 通风降温
- 补光灯(Relay7): RGB补光
- 白灯(Relay8): 照明

## 重要：语音输出规则
当你需要输出JSON命令时（如设备控制、定时任务、页面导航），请将JSON放在回复末尾，但在语音朗读时完全跳过JSON部分，只朗读自然语言描述。绝不要朗读任何包含大括号、引号、冒号等JSON符号的内容。`}
                voice={selectedVoice}
              />
               
              {/* Smart Wake Status Dot */}
              <AnimatePresence>
                {isSmartWakeEnabled && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className={cn(
                      "absolute -top-1 -right-1 w-4 h-4 rounded-full",
                      "bg-green-500 border-2 border-white/30 shadow-lg z-20",
                      isWakeListening && "animate-pulse"
                    )}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </ContextMenuTrigger>
        
        <ContextMenuContent className="w-56 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-white/20">
          <ContextMenuItem disabled className="text-xs font-semibold text-muted-foreground pl-8">
             莓小智 XiaoZhi AI
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-white/10" />
          <ContextMenuCheckboxItem checked={isSmartWakeEnabled} onCheckedChange={toggleSmartWake}>
             智能唤醒 (小智小智)
          </ContextMenuCheckboxItem>
          <ContextMenuSeparator className="bg-white/10" />
          <ContextMenuItem onClick={() => setMessages([])}>
             清空对话历史
          </ContextMenuItem>
          <ContextMenuItem onClick={resetPosition}>
             重置位置
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </>
  );
}

export function FloatingXiaozhi() {
  const pathname = usePathname();
  
  // Whitelist of allowed paths (and their subpaths)
  const allowedPaths = [
    '/ai-assistant', 
    '/monitor', 
    '/device-control', 
    '/chat'
    // removed dashboard
  ];
  
  const isAllowed = pathname && allowedPaths.some(path => pathname.startsWith(path)) && !pathname.startsWith('/dashboard');

  if (!isAllowed) return null;

  return <FloatingXiaozhiContent />;
}
