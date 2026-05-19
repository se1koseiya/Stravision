"use client"

import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai/tool"
import { Task, TaskTrigger, TaskContent, TaskItem } from "@/components/ui/assistant-ui"
import ToolUsageIndicator from "@/components/ui/tool-usage-indicator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestCompletedColorPage() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>完成状态颜色测试</CardTitle>
          <CardDescription>
            验证所有"Completed"状态都使用宝石绿色而不是蓝色
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* AI Tool Component */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">AI 工具组件 - Completed 状态</h3>
            <div className="space-y-3">
              <Tool defaultOpen>
                <ToolHeader 
                  title="网页抓取" 
                  type="tool-invocation" 
                  state="output-available" 
                />
                <ToolContent>
                  <ToolInput
                    input={{
                      url: "https://example.com",
                      selector: "title"
                    }}
                  />
                  <ToolOutput
                    output={{
                      title: "示例网站",
                      content: "抓取成功"
                    }}
                    errorText={undefined}
                  />
                </ToolContent>
              </Tool>

              <Tool defaultOpen>
                <ToolHeader 
                  title="Brave 搜索" 
                  type="tool-invocation" 
                  state="output-available" 
                />
                <ToolContent>
                  <ToolInput
                    input={{
                      query: "草莓种植技术",
                      count: 5
                    }}
                  />
                  <ToolOutput
                    output={{
                      results: "搜索到5条相关结果",
                      status: "success"
                    }}
                    errorText={undefined}
                  />
                </ToolContent>
              </Tool>
            </div>
          </div>

          {/* Task Component */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">任务组件</h3>
            <Task open>
              <TaskTrigger 
                title="数据处理任务" 
                status="completed" 
              />
              <TaskContent>
                <TaskItem>✅ 数据收集完成</TaskItem>
                <TaskItem>✅ 数据清洗完成</TaskItem>
                <TaskItem>✅ 结果输出完成</TaskItem>
              </TaskContent>
            </Task>
          </div>

          {/* Tool Usage Indicator */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">工具使用指示器</h3>
            <div className="space-y-3">
              <ToolUsageIndicator
                toolName="mcp_brave_search"
                toolDescription="搜索相关信息"
                executionTime={1250}
                result="success"
                details="搜索结果已成功获取"
              />
              <ToolUsageIndicator
                toolName="mcp_firecrawl_scrape"
                toolDescription="抓取网页内容"
                executionTime={2100}
                result="success"
                details="网页内容抓取完成"
              />
            </div>
          </div>

          {/* Color Reference */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">颜色参考</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 bg-primary rounded-full"></div>
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">宝石绿 (Emerald)</span>
                </div>
                <p className="text-xs text-primary dark:text-primary">
                  这是正确的完成状态颜色
                </p>
              </div>
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                  <span className="text-blue-700 dark:text-blue-400 font-medium">蓝色 (Blue)</span>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-500">
                  这是之前使用的颜色（已修改）
                </p>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>修改总结</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2 text-primary">✅ 已修改的组件</h4>
              <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>• <code>components/ai/tool.tsx</code> - "output-available" 状态图标和Badge背景</li>
                <li>• <code>components/ui/assistant-ui.tsx</code> - TaskTrigger "completed" 状态指示器</li>
                <li>• <code>app/ai-assistant/page.tsx</code> - 任务列表中的completed状态样式</li>
                <li>• <code>components/ui/tool-usage-indicator.tsx</code> - 成功状态已使用宝石绿色</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🎨 主要颜色变更</h4>
              <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>• <code>text-green-600</code> → <code>text-primary</code></li>
                <li>• <code>bg-green-400</code> → <code>bg-emerald-400</code></li>
                <li>• <code>bg-green-100</code> → <code>bg-emerald-100</code></li>
                <li>• <code>text-green-500</code> → <code>text-primary</code></li>
                <li>• Badge背景从secondary变为自定义宝石绿色</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}