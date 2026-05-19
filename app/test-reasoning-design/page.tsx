"use client"

import { useState } from "react"
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai/reasoning"

export default function TestReasoningDesign() {
  const [isStreaming, setIsStreaming] = useState(false)

  const sampleReasoningText = `用户询问我的身份介绍，这是一个简单的自我介绍问题，不需要调用工具。我需要基于系统提示中的角色设定来回答。

作为AI助手，我应该：
1. 简洁地介绍自己的身份和能力
2. 说明我能提供的帮助类型
3. 保持友好和专业的语调

这是一个标准的问候和介绍场景，我可以直接回答而不需要额外的工具调用。`

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-zinc-900 dark:text-white">思考过程卡片重设计</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8">
          简约设计，符合平台设计语言，去除多余装饰元素
        </p>

        {/* 控制按钮 */}
        <div className="mb-8 space-x-4">
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isStreaming 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-primary hover:bg-emerald-700 text-white'
            }`}
          >
            {isStreaming ? '停止思考' : '开始思考'}
          </button>
        </div>

        {/* 对比展示 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 新设计 */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-white">新设计 (简约)</h2>
            <div className="space-y-4">
              <Reasoning isStreaming={isStreaming}>
                <ReasoningTrigger />
                <ReasoningContent>
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {sampleReasoningText}
                  </div>
                </ReasoningContent>
              </Reasoning>
            </div>
          </div>

          {/* 旧设计对比 */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-white">旧设计 (复杂)</h2>
            <div className="space-y-4">
              {/* 模拟旧设计 */}
              <div className="border-l-2 border-emerald-200 dark:border-blue-800 pl-4 rounded-lg bg-emerald-50/30 dark:bg-blue-950/20 py-2">
                <div className="flex items-center justify-between w-full text-sm font-medium text-emerald-700 dark:text-blue-400 py-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-pulse">✨</div>
                    <span className="font-semibold">AI 思考过程</span>
                  </div>
                  <div className="h-4 w-4">⌄</div>
                </div>
                <div className="text-sm text-muted-foreground dark:text-gray-300 mt-2">
                  <div className="pb-2 pt-2 border-t border-emerald-100 dark:border-blue-900/50 whitespace-pre-wrap leading-relaxed">
                    {sampleReasoningText}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 设计说明 */}
        <div className="mt-12 p-6 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">设计改进说明</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-zinc-900 dark:text-white mb-2">移除的元素：</h4>
              <ul className="space-y-1 text-zinc-600 dark:text-zinc-400">
                <li>• 彩色边框 (emerald/blue)</li>
                <li>• 彩色背景 (emerald-50/blue-950)</li>
                <li>• 动画效果 (animate-pulse)</li>
                <li>• 复杂的颜色系统</li>
                <li>• 过度装饰的边框样式</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-zinc-900 dark:text-white mb-2">新增的特性：</h4>
              <ul className="space-y-1 text-zinc-600 dark:text-zinc-400">
                <li>• 统一的zinc色调</li>
                <li>• 简洁的边框设计</li>
                <li>• 清晰的层次结构</li>
                <li>• 更好的可读性</li>
                <li>• 符合平台设计语言</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 使用示例 */}
        <div className="mt-8 p-6 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">在对话中的效果</h3>
          <div className="space-y-4">
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-primary dark:text-emerald-400 text-sm font-medium">
                  AI
                </div>
                <div className="flex-1">
                  <Reasoning isStreaming={isStreaming} defaultOpen={false}>
                    <ReasoningTrigger />
                    <ReasoningContent>
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {sampleReasoningText}
                      </div>
                    </ReasoningContent>
                  </Reasoning>
                  
                  <div className="mt-4 text-zinc-900 dark:text-white">
                    你好！我是莓小智，你的AI智能助手。我可以帮助你：

                    🌱 **智慧农业管理** - 监控大棚环境、分析作物生长状况、优化种植方案
                    🤖 **设备智能控制** - 自动调节温湿度、光照、灌溉等农业设备
                    📊 **数据分析洞察** - 解读传感器数据、生成农业报告、预测趋势
                    🔍 **实时信息查询** - 天气预报、农技知识、市场行情等

                    有什么我可以帮助你的吗？
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}