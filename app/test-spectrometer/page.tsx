"use client"

import React from 'react'
import { SpectralCard } from '@/components/dashboard/spectral-card'
import { SpectralPopup } from '@/components/monitor/spectral-popup'
import { DeviceData } from '@/lib/hooks/use-device-data'

// Mock spectral data for testing
const mockSpectralData: DeviceData = {
  temperature: 25.5,
  humidity: 65.2,
  light: 0,
  co2: 0,
  earth_temp: 0,
  earth_water: 0,
  earth_ec: 0,
  earth_n: 0,
  earth_p: 0,
  earth_k: 0,
  relay5: 0,
  relay6: 1,
  relay7: 0,
  relay8: 1,
  led1: 0,
  led2: 0,
  led3: 0,
  led4: 0,
  // Spectral channels with realistic values
  channel1: 1250,  // 415nm Violet
  channel2: 2100,  // 445nm Blue  
  channel3: 1800,  // 480nm Cyan
  channel4: 3200,  // 515nm Green
  channel5: 2800,  // 555nm Yellow-Green
  channel6: 2400,  // 590nm Yellow
  channel7: 1900,  // 630nm Orange
  channel8: 1600,  // 680nm Red
  channel9: 1100,  // NIR
  channel10: 2200, // Clear
  channel11: 150,  // Flicker
}

// Simplified data for SpectralPopup
const mockSpectralPopupData = {
  channel1: 1250,
  channel2: 2100,
  channel3: 1800,
  channel4: 3200,
  channel5: 2800,
  channel6: 2400,
  channel7: 1900,
  channel8: 1600,
  channel9: 1100,
  channel10: 2200,
  channel11: 150,
}

export default function TestSpectrometerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            光谱仪测试页面
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            测试 3D 模型中使用的光谱卡片组件
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Dashboard Style Spectral Card */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              仪表板样式光谱卡片
            </h2>
            <div className="w-full h-[280px]">
              <SpectralCard data={mockSpectralData} />
            </div>
          </div>

          {/* 3D Model Style (new SpectralPopup) */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              3D 模型专用光谱弹窗
            </h2>
            <div className="w-[380px] h-[280px] mx-auto">
              <SpectralPopup data={mockSpectralPopupData} />
            </div>
          </div>

          {/* Comparison */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              对比说明
            </h2>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm space-y-3 text-sm">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">仪表板版本</h3>
                <ul className="text-slate-600 dark:text-slate-400 space-y-1">
                  <li>• 使用 IOSWidgetCard 包装</li>
                  <li>• 适合仪表板网格布局</li>
                  <li>• 支持编辑模式</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">3D模型版本</h3>
                <ul className="text-slate-600 dark:text-slate-400 space-y-1">
                  <li>• 简化的弹窗设计</li>
                  <li>• 专为3D环境优化</li>
                  <li>• 更好的交互性能</li>
                  <li>• 显示详细通道信息</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Data Display */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            模拟光谱数据
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-slate-600 dark:text-slate-400">Channel 1 (415nm):</span>
              <span className="ml-2 font-mono">{mockSpectralData.channel1}</span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">Channel 2 (445nm):</span>
              <span className="ml-2 font-mono">{mockSpectralData.channel2}</span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">Channel 3 (480nm):</span>
              <span className="ml-2 font-mono">{mockSpectralData.channel3}</span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">Channel 4 (515nm):</span>
              <span className="ml-2 font-mono">{mockSpectralData.channel4}</span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">Channel 5 (555nm):</span>
              <span className="ml-2 font-mono">{mockSpectralData.channel5}</span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">Channel 6 (590nm):</span>
              <span className="ml-2 font-mono">{mockSpectralData.channel6}</span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">Channel 7 (630nm):</span>
              <span className="ml-2 font-mono">{mockSpectralData.channel7}</span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">Channel 8 (680nm):</span>
              <span className="ml-2 font-mono">{mockSpectralData.channel8}</span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">Channel 9 (NIR):</span>
              <span className="ml-2 font-mono">{mockSpectralData.channel9}</span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">Channel 10 (Clear):</span>
              <span className="ml-2 font-mono">{mockSpectralData.channel10}</span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">Channel 11 (Flicker):</span>
              <span className="ml-2 font-mono">{mockSpectralData.channel11}</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            测试说明
          </h3>
          <ul className="text-blue-800 dark:text-blue-200 space-y-1 text-sm">
            <li>• 左侧：原始仪表板光谱卡片（使用IOSWidgetCard包装）</li>
            <li>• 中间：新的3D模型专用光谱弹窗（简化设计）</li>
            <li>• 右侧：对比说明和技术细节</li>
            <li>• 新版本专为3D环境优化，避免了IOSWidgetCard的复杂性</li>
            <li>• 如果中间的弹窗正常显示，说明3D模型中的光谱节点应该能正常工作</li>
          </ul>
        </div>
      </div>
    </div>
  )
}