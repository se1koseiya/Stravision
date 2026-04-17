'use client'

import { useState } from 'react'
import { AIControlBorderEffect } from './ai-control-border-effect'
import { Button } from '@/components/ui/button'
import { Play, Square } from 'lucide-react'

export function AIControlBorderDemo() {
  const [isActive, setIsActive] = useState(false)

  return (
    <div className="relative min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-8">
      <AIControlBorderEffect isActive={isActive} duration={2000} />
      
      <div className="relative z-10 max-w-2xl w-full space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-white">
            AI 控制边框效果
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            当 AI 控制设备时，整个屏幕边框会出现优雅的渐变动画
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-xl border border-zinc-200 dark:border-zinc-800">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  边框效果演示
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  点击按钮查看边框动画效果
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                isActive 
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}>
                {isActive ? '执行中' : '待机'}
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => setIsActive(true)}
                disabled={isActive}
                className="flex-1 h-12"
                variant={isActive ? "secondary" : "default"}
              >
                <Play className="mr-2 h-4 w-4" />
                开始执行
              </Button>
              <Button
                onClick={() => setIsActive(false)}
                disabled={!isActive}
                className="flex-1 h-12"
                variant={!isActive ? "secondary" : "destructive"}
              >
                <Square className="mr-2 h-4 w-4" />
                停止执行
              </Button>
            </div>

            <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">
                效果特点
              </h4>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span>四周边框流动渐变动画</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span>四个角落光晕效果</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span>丝滑的进入和退出动画</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span>不影响页面交互（pointer-events-none）</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-6 border border-blue-200 dark:border-blue-900">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-400 mb-2">
            使用方法
          </h4>
          <pre className="text-xs text-blue-800 dark:text-blue-300 overflow-x-auto">
{`import { AIControlBorderEffect } from '@/components/ai/ai-control-border-effect'

<AIControlBorderEffect 
  isActive={isExecutingControl} 
  duration={2000} 
/>`}
          </pre>
        </div>
      </div>
    </div>
  )
}
