"use client"

import { useState } from "react"
import { Globe, ArrowUpRight } from "lucide-react"
import { WebPreview, WebPreviewNavigation, WebPreviewNavigationButton, WebPreviewUrl, WebPreviewBody } from "@/components/ai/web-preview"

const testUrls = [
  { name: "B站 (会被阻止)", url: "https://www.bilibili.com", blocked: true },
  { name: "GitHub (会被阻止)", url: "https://github.com", blocked: true },
  { name: "Example.com (可以显示)", url: "https://example.com", blocked: false },
  { name: "HTTPBin (可以显示)", url: "https://httpbin.org", blocked: false },
]

export default function TestWebPreviewEnhanced() {
  const [selectedUrl, setSelectedUrl] = useState(testUrls[0])

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-zinc-900 dark:text-white">增强版网页预览测试</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8">
          测试不同网站的iframe显示效果，包括被阻止的网站的降级处理
        </p>
        
        {/* URL选择器 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-white">选择测试网站：</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {testUrls.map((urlInfo) => (
              <button
                key={urlInfo.url}
                onClick={() => setSelectedUrl(urlInfo)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedUrl.url === urlInfo.url
                    ? 'border-primary bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <div className="font-medium text-sm text-zinc-900 dark:text-white mb-1">
                  {urlInfo.name}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  {urlInfo.url}
                </div>
                <div className={`text-xs mt-2 px-2 py-1 rounded-full inline-block ${
                  urlInfo.blocked 
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}>
                  {urlInfo.blocked ? '会被阻止' : '可以显示'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 当前选择的URL信息 */}
        <div className="mb-6 p-4 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">当前测试：{selectedUrl.name}</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">URL: {selectedUrl.url}</p>
          <p className="text-sm">
            <span className="font-medium">预期结果：</span>
            {selectedUrl.blocked ? (
              <span className="text-red-600 dark:text-red-400">
                iframe会被阻止，显示降级界面，提供"在新标签页打开"按钮
              </span>
            ) : (
              <span className="text-green-600 dark:text-green-400">
                iframe应该能正常显示网页内容
              </span>
            )}
          </p>
        </div>

        {/* WebPreview组件 */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700">
          <WebPreview 
            defaultUrl={selectedUrl.url}
            key={selectedUrl.url} // 强制重新渲染
            className="h-[600px] bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 shadow-sm"
          >
            <WebPreviewNavigation className="bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800">
              <div className="flex gap-1.5 mr-3">
                <div className="size-2.5 rounded-full bg-red-400" />
                <div className="size-2.5 rounded-full bg-amber-400" />
                <div className="size-2.5 rounded-full bg-green-400" />
              </div>
              <WebPreviewUrl 
                value={selectedUrl.url}
                className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                readOnly
              />
              <WebPreviewNavigationButton 
                tooltip="在新标签页打开"
                onClick={() => window.open(selectedUrl.url, '_blank')}
              >
                <ArrowUpRight className="size-4" />
              </WebPreviewNavigationButton>
            </WebPreviewNavigation>
            <WebPreviewBody 
              src={selectedUrl.url}
            />
          </WebPreview>
        </div>

        {/* 说明文档 */}
        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">功能说明</h3>
          <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <p><strong>自动检测：</strong>组件会自动检测常见的会阻止iframe的网站（如B站、GitHub等）</p>
            <p><strong>优雅降级：</strong>当iframe被阻止时，显示美观的降级界面，而不是空白或错误页面</p>
            <p><strong>用户友好：</strong>提供"在新标签页打开"按钮，让用户能够正常访问网站</p>
            <p><strong>视觉一致：</strong>降级界面使用相同的设计语言，保持视觉一致性</p>
          </div>
        </div>
      </div>
    </div>
  )
}