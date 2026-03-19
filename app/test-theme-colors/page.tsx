"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PromptInput, PromptInputTextarea, PromptInputSubmit } from "@/components/ui/assistant-ui"
import { ArrowUpIcon } from "lucide-react"

export default function TestThemeColorsPage() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>平台主题颜色测试</CardTitle>
          <CardDescription>
            验证所有主要组件都使用宝石绿色作为主色调
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          
          {/* Primary Buttons */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">主要按钮</h3>
            <div className="flex gap-4 flex-wrap">
              <Button>默认按钮</Button>
              <Button variant="outline">轮廓按钮</Button>
              <Button variant="secondary">次要按钮</Button>
              <Button variant="ghost">幽灵按钮</Button>
              <Button variant="link">链接按钮</Button>
            </div>
          </div>

          {/* Badges */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">徽章组件</h3>
            <div className="flex gap-4 flex-wrap">
              <Badge>默认徽章</Badge>
              <Badge variant="secondary">次要徽章</Badge>
              <Badge variant="outline">轮廓徽章</Badge>
              <Badge variant="destructive">危险徽章</Badge>
            </div>
          </div>

          {/* Input Components */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">输入组件</h3>
            <div className="space-y-4 max-w-md">
              <Input placeholder="普通输入框" />
              <Input placeholder="聚焦时显示主色调边框" className="focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          {/* AI Assistant Input */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">AI 助手输入</h3>
            <div className="max-w-2xl">
              <PromptInput>
                <div className="relative">
                  <PromptInputTextarea 
                    placeholder="输入您的问题..."
                    defaultValue="测试消息"
                  />
                  <div className="absolute bottom-2 right-2">
                    <PromptInputSubmit>
                      <ArrowUpIcon className="size-4" />
                    </PromptInputSubmit>
                  </div>
                </div>
              </PromptInput>
            </div>
          </div>

          {/* Color Swatches */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">颜色样本</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="w-full h-16 bg-primary rounded-lg"></div>
                <p className="text-sm font-medium">Primary</p>
                <p className="text-xs text-muted-foreground">主色调</p>
              </div>
              <div className="space-y-2">
                <div className="w-full h-16 bg-secondary rounded-lg"></div>
                <p className="text-sm font-medium">Secondary</p>
                <p className="text-xs text-muted-foreground">次要色</p>
              </div>
              <div className="space-y-2">
                <div className="w-full h-16 bg-accent rounded-lg"></div>
                <p className="text-sm font-medium">Accent</p>
                <p className="text-xs text-muted-foreground">强调色</p>
              </div>
              <div className="space-y-2">
                <div className="w-full h-16 bg-muted rounded-lg"></div>
                <p className="text-sm font-medium">Muted</p>
                <p className="text-xs text-muted-foreground">柔和色</p>
              </div>
            </div>
          </div>

          {/* Focus States */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">聚焦状态</h3>
            <div className="space-y-4 max-w-md">
              <Button className="focus:ring-2 focus:ring-ring focus:ring-offset-2">
                聚焦时显示环形边框
              </Button>
              <Input placeholder="聚焦时显示主色调边框" />
            </div>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">链接样式</h3>
            <div className="space-y-2">
              <p>
                这是一个 <a href="#" className="text-primary hover:underline">主色调链接</a> 的示例。
              </p>
              <p>
                这是一个 <Button variant="link" className="p-0 h-auto">按钮样式的链接</Button> 的示例。
              </p>
            </div>
          </div>

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>颜色变更总结</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2 text-emerald-600">✅ 已修改的颜色变量</h4>
              <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>• <code>--primary</code> - 主色调改为宝石绿色</li>
                <li>• <code>--ring</code> - 聚焦环颜色改为宝石绿色</li>
                <li>• <code>--sidebar-primary</code> - 侧边栏主色调改为宝石绿色</li>
                <li>• <code>--sidebar-ring</code> - 侧边栏聚焦环改为宝石绿色</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🎨 修改的组件</h4>
              <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>• AI 助手提交按钮渐变色</li>
                <li>• Toast 通知图标和边框颜色</li>
                <li>• 工具完成状态 Badge 颜色</li>
                <li>• 任务完成状态指示器颜色</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🌈 颜色值</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium mb-1">浅色模式</p>
                  <p><code>oklch(0.59 0.16 163)</code></p>
                </div>
                <div>
                  <p className="font-medium mb-1">深色模式</p>
                  <p><code>oklch(0.65 0.15 163)</code></p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}