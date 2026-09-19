'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { IconBrain, IconCheckOne, IconDown, IconLightning, IconLoading, IconRobot, IconUp } from "@/components/icon";

interface AgentStep {
  id: string;
  name: string;
  type: 'planner' | 'executor' | 'validator' | 'coordinator';
  status: 'idle' | 'thinking' | 'executing' | 'completed' | 'failed';
  message?: string;
  timestamp?: number;
}

interface AgentOrchestrationPanelProps {
  steps: AgentStep[];
  isActive: boolean;
  className?: string;
}

const AGENT_CONFIG = {
  planner: {
    icon: IconBrain,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    label: '规划',
  },
  executor: {
    icon: IconLightning,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    label: '执行',
  },
  validator: {
    icon: IconCheckOne,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    label: '验证',
  },
  coordinator: {
    icon: IconRobot,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    label: '协调',
  },
};

export function AgentOrchestrationPanel({ steps, isActive, className }: AgentOrchestrationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [visibleSteps, setVisibleSteps] = useState<AgentStep[]>([]);

  useEffect(() => {
    // 逐步显示 steps
    if (steps.length > visibleSteps.length) {
      const timer = setTimeout(() => {
        setVisibleSteps(steps.slice(0, visibleSteps.length + 1));
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setVisibleSteps(steps);
    }
  }, [steps, visibleSteps.length]);

  if (!isActive && steps.length === 0) return null;

  const activeStep = steps.find(s => s.status === 'thinking' || s.status === 'executing');
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "my-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <IconRobot className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            {isActive && (
              <motion.div
                className="absolute -inset-1 bg-blue-500/20 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              多 Agent 协作
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {completedCount}/{steps.length} 步骤完成
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {isActive && (
            <Badge variant="secondary" className="text-xs">
              <IconLoading className="h-3 w-3 mr-1 animate-spin" />
              处理中
            </Badge>
          )}
          {isExpanded ? (
            <IconUp className="h-4 w-4 text-zinc-400" />
          ) : (
            <IconDown className="h-4 w-4 text-zinc-400" />
          )}
        </div>
      </button>

      {/* Progress Bar */}
      <div className="px-4 pb-2">
        <div className="h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Steps */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {visibleSteps.map((step, index) => {
                const config = AGENT_CONFIG[step.type];
                const Icon = config.icon;
                const isActive = step.status === 'thinking' || step.status === 'executing';
                const isCompleted = step.status === 'completed';
                const isFailed = step.status === 'failed';

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl transition-all",
                      isActive && "bg-blue-50/50 dark:bg-blue-900/10 ring-1 ring-blue-500/20",
                      isCompleted && "opacity-60"
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
                      config.bgColor
                    )}>
                      {isActive ? (
                        <IconLoading className={cn("h-4 w-4 animate-spin", config.color)} />
                      ) : isCompleted ? (
                        <IconCheckOne className="h-4 w-4 text-green-500" />
                      ) : isFailed ? (
                        <IconCheckOne className="h-4 w-4 text-red-500" />
                      ) : (
                        <Icon className={cn("h-4 w-4", config.color)} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {step.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {config.label}
                        </Badge>
                      </div>
                      
                      {step.message && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                          {step.message}
                        </p>
                      )}
                      
                      {isActive && (
                        <div className="flex items-center gap-1 mt-2">
                          <div className="w-1 h-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1 h-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1 h-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    {step.timestamp && (
                      <span className="text-xs text-zinc-400 shrink-0">
                        {new Date(step.timestamp).toLocaleTimeString('zh-CN', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
