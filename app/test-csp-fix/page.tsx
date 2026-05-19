"use client"

import { useState } from "react"
import { WebPreview, WebPreviewNavigation, WebPreviewNavigationButton, WebPreviewUrl, WebPreviewBody } from "@/components/ai/web-preview"
import { ArrowUpRight, RefreshCcw } from "lucide-react"

const testUrls = [
  { name: "Example.com", url: "https://example.com", shouldWork: true },
  { name: "HTTPBin", url: "https://httpbin.org", shouldWork: true },
  { name: "B站", url: "https://www.bilibili.com", shouldWork: false },
  { name: "GitHub", url: "https://github.com", shouldWork: false },
  { name: "MDN文档", url: "https://developer.mozilla.org", shouldWork: true },
  { name: "Stack Overflow", url: "https://stackoverflow.com", shouldWork: false },
  { name: "YouTube", url: "https://www.youtube.com", shouldWork: false },
  { name: "知乎", url: "https://www.zhihu.com", shouldWork: false },
]

export default function TestCSPFix() {
  const [selectedUrl, setSelectedUrl] = useState(testUrls[0])
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-zinc-900 dark:text-white">CSP iframe 修复测试</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8">
          测试修复后的CSP配置是否允许iframe正常加载外部网站
        </p>

        {/* 当前CSP状态 */}
        <div className="mb-8 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <h2 className="font-semibold text-green-900 dark:text-green-100 mb-2">CSP 配置状态 ✅</h2>
          <p className="text-sm text-green-800 dark:text-green-200 mb-2">
            已开放所有HTTPS网站，frame-src 配置：
          </p>
          <div className="text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40 p-3 rounded font-mono">
            frame-src 'self' https: https://challenges.cloudflare.com https://*.alipay.com https://*.qq.com https://o.alicdn.com
          </div>
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            💡 现在所有HTTPS网站都被CSP允许，如果仍无法加载则是目标网站自身的安全策略
          </p>
        </div>

        {/* URL选择器 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">选择测试网站：</h2>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-zinc-600 hover:bg-zinc-700 text-white rounded-lg transition-colors"
            >
              <RefreshCcw size={16} />
              刷新iframe
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mb-2">
                  {urlInfo.url}
                </div>
                <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                  urlInfo.shouldWork 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                }`}>
                  {urlInfo.shouldWork ? 'CSP允许+网站允许' : 'CSP允许但网站可能阻止'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 测试结果说明 */}
        <div className="mb-6 p-4 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">当前测试：{selectedUrl.name}</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">URL: {selectedUrl.url}</p>
          <div className="text-sm">
            <span className="font-medium">预期结果：</span>
            {selectedUrl.shouldWork ? (
              <span className="text-green-600 dark:text-green-400">
                ✅ CSP完全允许，网站也允许iframe嵌入，应该正常显示
              </span>
            ) : (
              <span className="text-orange-600 dark:text-orange-400">
                ⚠️ CSP允许，但网站可能设置了X-Frame-Options阻止iframe
              </span>
            )}
          </div>
        </div>

        {/* WebPreview测试 */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700">
          <WebPreview 
            defaultUrl={selectedUrl.url}
            key={`${selectedUrl.url}-${refreshKey}`} // 强制重新渲染
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

        {/* 调试信息 */}
        <div className="mt-8 p-6 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">调试信息</h3>
          <div className="space-y-4 text-sm">
            <div>
              <span className="font-medium text-zinc-900 dark:text-white">如果iframe仍然无法加载：</span>
              <ul className="mt-2 space-y-1 text-zinc-600 dark:text-zinc-400 ml-4">
                <li>1. 检查浏览器控制台是否有CSP错误</li>
                <li>2. 确认网站是否设置了X-Frame-Options</li>
                <li>3. 查看网站的Content-Security-Policy响应头</li>
                <li>4. 尝试刷新页面或清除缓存</li>
              </ul>
            </div>
            
            <div>
              <span className="font-medium text-zinc-900 dark:text-white">常见错误信息：</span>
              <ul className="mt-2 space-y-1 text-zinc-600 dark:text-zinc-400 ml-4">
                <li>• "Refused to frame" - 网站阻止iframe嵌入</li>
                <li>• "Content Security Policy" - CSP配置问题</li>
                <li>• "X-Frame-Options deny" - 网站设置了frame阻止</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}