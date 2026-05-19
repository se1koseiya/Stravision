"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"

export default function TestFocusStatesPage() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>聚焦状态和悬停效果测试</CardTitle>
          <CardDescription>
            验证所有输入组件和交互元素都使用宝石绿色而不是蓝色
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          
          {/* Input Fields */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">输入框聚焦状态</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="test-input">普通输入框</Label>
                <Input 
                  id="test-input"
                  placeholder="点击聚焦查看边框颜色" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-input-2">API Key 输入框</Label>
                <Input 
                  id="test-input-2"
                  type="password"
                  placeholder="sk-..." 
                />
              </div>
            </div>
          </div>

          {/* Textarea */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">文本域聚焦状态</h3>
            <div className="space-y-2">
              <Label htmlFor="test-textarea">系统提示词</Label>
              <Textarea 
                id="test-textarea"
                placeholder="你是智慧农业平台的AI助手..."
                rows={4}
              />
            </div>
          </div>

          {/* Buttons and Hover States */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">按钮悬停状态</h3>
            <div className="flex gap-4 flex-wrap">
              <Button>主要按钮</Button>
              <Button variant="outline">轮廓按钮</Button>
              <Button variant="secondary">次要按钮</Button>
              <Button variant="ghost">幽灵按钮</Button>
              <Button variant="link">链接按钮</Button>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">链接悬停状态</h3>
            <div className="space-y-2">
              <p>
                这是一个 <a href="#" className="text-primary hover:underline">主色调链接</a> 的示例。
              </p>
              <p>
                这是一个 <a href="#" className="text-primary dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline">宝石绿链接</a> 的示例。
              </p>
            </div>
          </div>

          {/* Badges */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">徽章悬停状态</h3>
            <div className="flex gap-4 flex-wrap">
              <Badge className="cursor-pointer hover:bg-primary/90">可悬停徽章</Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-accent">轮廓徽章</Badge>
              <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">次要徽章</Badge>
            </div>
          </div>

          {/* Form Example */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">表单示例</h3>
            <form className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input 
                  id="api-key"
                  type="password"
                  placeholder="sk-..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-url">API URL</Label>
                <Input 
                  id="api-url"
                  placeholder="https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model-name">模型名称</Label>
                <Input 
                  id="model-name"
                  placeholder="qwen3-plus"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="system-prompt">系统提示词</Label>
                <Textarea 
                  id="system-prompt"
                  placeholder="你是智慧农业平台的AI助手，专门帮助用户分析农业数据，提供种植建议和解答农业相关问题。请用专业但易懂的语言回答问题。"
                  rows={4}
                />
              </div>
              <Button type="submit" className="w-full">
                保存设置
              </Button>
            </form>
          </div>

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>测试说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2 text-primary">✅ 应该显示宝石绿色的地方</h4>
              <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>• 输入框聚焦时的边框颜色</li>
                <li>• 文本域聚焦时的边框颜色</li>
                <li>• 按钮的背景颜色和悬停效果</li>
                <li>• 链接的文字颜色和悬停效果</li>
                <li>• 徽章的背景颜色</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-red-600">❌ 不应该出现蓝色的地方</h4>
              <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>• 任何聚焦状态的边框</li>
                <li>• 任何悬停状态的颜色</li>
                <li>• 任何主要交互元素的颜色</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🔧 修改的CSS变量</h4>
              <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>• <code>--primary</code> - 主色调</li>
                <li>• <code>--ring</code> - 聚焦环颜色</li>
                <li>• 强制性CSS规则覆盖蓝色聚焦状态</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}