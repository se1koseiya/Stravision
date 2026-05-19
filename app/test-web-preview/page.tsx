"use client"

import { useState } from "react"
import { WebPreview, WebPreviewAdvanced, WebPreviewNavigation, WebPreviewNavigationButton, WebPreviewUrl, WebPreviewBody } from "@/components/ui/web-preview"
import { BrowserActivity } from "@/components/ai/browser-activity"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeftIcon, ArrowRightIcon, RefreshCcwIcon, ExternalLinkIcon, Maximize2Icon, MousePointerClickIcon } from "lucide-react"

export default function TestWebPreviewPage() {
  const [testUrl, setTestUrl] = useState("https://github.com")
  const [showBrowser, setShowBrowser] = useState(false)
  const [advancedUrl, setAdvancedUrl] = useState("https://example.com")

  const testUrls = [
    "https://github.com",
    "https://www.google.com",
    "https://stackoverflow.com",
    "https://www.npmjs.com",
    "https://tailwindcss.com"
  ]

  return (
    <div className="container mx-auto p-6 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Web Preview 组件测试</CardTitle>
          <CardDescription>
            测试新的shadcn WebPreview组件和原有的兼容性
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          
          {/* URL 输入 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">测试 URL</h3>
            <div className="flex gap-2">
              <Input
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder="输入要预览的网址"
                className="flex-1"
              />
              <Button onClick={() => setShowBrowser(!showBrowser)}>
                {showBrowser ? "隐藏" : "显示"} 浏览器动效
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {testUrls.map((url) => (
                <Button
                  key={url}
                  variant="outline"
                  size="sm"
                  onClick={() => setTestUrl(url)}
                >
                  {new URL(url).hostname}
                </Button>
              ))}
            </div>
          </div>

          {/* 原有兼容组件 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">原有 WebPreview 组件（兼容模式）</h3>
            <div className="h-64 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
              <WebPreview url={testUrl} className="w-full h-full" />
            </div>
          </div>

          {/* 新的 Shadcn WebPreview 组件 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">新的 Shadcn WebPreview 组件</h3>
            <div className="h-96 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
              <WebPreviewAdvanced 
                defaultUrl={advancedUrl} 
                onUrlChange={setAdvancedUrl}
                className="w-full h-full"
              >
                <WebPreviewNavigation>
                  <WebPreviewNavigationButton tooltip="后退">
                    <ArrowLeftIcon className="size-4" />
                  </WebPreviewNavigationButton>
                  <WebPreviewNavigationButton tooltip="前进">
                    <ArrowRightIcon className="size-4" />
                  </WebPreviewNavigationButton>
                  <WebPreviewNavigationButton tooltip="刷新">
                    <RefreshCcwIcon className="size-4" />
                  </WebPreviewNavigationButton>
                  <WebPreviewUrl />
                  <WebPreviewNavigationButton tooltip="选择">
                    <MousePointerClickIcon className="size-4" />
                  </WebPreviewNavigationButton>
                  <WebPreviewNavigationButton 
                    tooltip="在新标签页打开"
                    onClick={() => window.open(advancedUrl, '_blank')}
                  >
                    <ExternalLinkIcon className="size-4" />
                  </WebPreviewNavigationButton>
                  <WebPreviewNavigationButton tooltip="最大化">
                    <Maximize2Icon className="size-4" />
                  </WebPreviewNavigationButton>
                </WebPreviewNavigation>
                <WebPreviewBody />
              </WebPreviewAdvanced>
            </div>
          </div>

          {/* 浏览器动效组件 */}
          {showBrowser && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">BrowserActivity 组件（带动效）</h3>
              <div className="h-64 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                <BrowserActivity url={testUrl} isOpen={true} onClose={() => {}} />
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>组件对比</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 text-primary">✅ 新 Shadcn WebPreview 优势</h4>
              <ul className="space-y-2 text-sm">
                <li>• 完整的浏览器界面模拟</li>
                <li>• 可交互的导航栏</li>
                <li>• 支持 iframe 直接显示网页</li>
                <li>• 控制台日志显示功能</li>
                <li>• 更好的可扩展性</li>
                <li>• 符合 shadcn/ui 设计规范</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-blue-600">📋 原有组件特点</h4>
              <ul className="space-y-2 text-sm">
                <li>• 网页截图预览</li>
                <li>• 多服务降级机制</li>
                <li>• 更好的加载状态处理</li>
                <li>• 适合静态预览</li>
                <li>• 兼容现有代码</li>
                <li>• 无需iframe权限</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>使用建议</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">🎯 使用场景</h4>
              <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>• <strong>原有 WebPreview</strong>: 适合需要网页截图预览的场景</li>
                <li>• <strong>新 WebPreviewAdvanced</strong>: 适合需要完整浏览器功能的场景</li>
                <li>• <strong>BrowserActivity</strong>: 适合需要动效和加载状态的场景</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🔧 技术实现</h4>
              <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>• 保持了向后兼容性</li>
                <li>• 新组件使用 iframe 技术</li>
                <li>• 支持导航和控制台功能</li>
                <li>• 可以根据需要选择合适的组件</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}