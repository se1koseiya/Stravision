"use client"

import React, { useState } from 'react'
import { PageNavigation } from '@/components/page-navigation'

export default function TestResponsiveNavPage() {
  const [containerWidth, setContainerWidth] = useState(800)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            响应式胶囊导航测试
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            测试导航栏在不同宽度下的自适应行为
          </p>
        </div>

        {/* Width Control */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            容器宽度控制
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[80px]">
                宽度: {containerWidth}px
              </label>
              <input
                type="range"
                min="300"
                max="1200"
                value={containerWidth}
                onChange={(e) => setContainerWidth(Number(e.target.value))}
                className="flex-1"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setContainerWidth(400)}
                className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                窄屏 (400px)
              </button>
              <button
                onClick={() => setContainerWidth(600)}
                className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
              >
                中等 (600px)
              </button>
              <button
                onClick={() => setContainerWidth(800)}
                className="px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                宽屏 (800px)
              </button>
              <button
                onClick={() => setContainerWidth(1000)}
                className="px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                超宽 (1000px)
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Test Container */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            导航栏测试
          </h3>
          
          {/* Resizable container */}
          <div 
            className="mx-auto bg-slate-100 dark:bg-slate-700 rounded-lg p-4 transition-all duration-300 overflow-hidden"
            style={{ width: `${containerWidth}px` }}
          >
            <div className="flex justify-center">
              <PageNavigation />
            </div>
          </div>
          
          <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            <p>• 当容器宽度不足以显示所有文字时，导航会自动收起为仅图标模式</p>
            <p>• 当容器宽度足够时，会自动展开显示图标和文字</p>
            <p>• 鼠标悬停在收起的图标上会显示提示文字</p>
          </div>
        </div>

        {/* Behavior Description */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            自适应行为说明
          </h3>
          <ul className="text-blue-800 dark:text-blue-200 space-y-2 text-sm">
            <li>
              <strong>自动检测：</strong> 使用 ResizeObserver 监听容器宽度变化
            </li>
            <li>
              <strong>智能收起：</strong> 当宽度不足时自动隐藏文字，仅显示图标
            </li>
            <li>
              <strong>平滑过渡：</strong> 使用 Framer Motion 提供流畅的展开/收起动画
            </li>
            <li>
              <strong>用户体验：</strong> 收起时显示 tooltip 提示，保持可用性
            </li>
            <li>
              <strong>响应式设计：</strong> 适配不同屏幕尺寸和布局需求
            </li>
          </ul>
        </div>

        {/* Technical Details */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            技术实现细节
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-2">宽度计算</h4>
              <ul className="text-slate-600 dark:text-slate-400 space-y-1">
                <li>• 仅图标模式：约 312px (6个按钮 × 48px + 边距)</li>
                <li>• 完整模式：约 600-800px (根据文字长度)</li>
                <li>• 动态计算每个按钮的文字宽度</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-2">动画效果</h4>
              <ul className="text-slate-600 dark:text-slate-400 space-y-1">
                <li>• 文字淡入淡出：opacity 0-1</li>
                <li>• 宽度平滑变化：width auto/0</li>
                <li>• 按钮内边距调整：px-2.5/px-4</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}