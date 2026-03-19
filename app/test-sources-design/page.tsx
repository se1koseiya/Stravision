"use client"

import { useState } from "react"
import { Sources, SourcesTrigger, SourcesContent, Source } from "@/components/ui/assistant-ui"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function TestSourcesDesignPage() {
  const [showSources, setShowSources] = useState(true)

  const sampleSources = [
    {
      number: 1,
      title: "日光温室草莓定植管理技术要点",
      url: "https://nyncj.mdj.gov.cn/article/123456",
      description: "牡丹江市农业技术服务中心发布的2025年草莓春季管理权威指南，明确开花期温度与光环境参数"
    },
    {
      number: 2,
      title: "浙江宁波 草莓 + 土豆立体套种不争地共享营养液",
      url: "https://www.zh.gov.cn/article/789012",
      description: "央视报道的宁波本地创新模式，强调智能光环境与水肥系统协同调控对草莓苗的关键作用"
    },
    {
      number: 3,
      title: "草莓种植技术指南 - 农业部官方文档",
      url: "https://www.moa.gov.cn/strawberry-guide",
      description: "农业农村部发布的标准化草莓种植技术规范，包含温度、湿度、光照等关键环境参数"
    }
  ]

  return (
    <div className="container mx-auto p-6 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>参考来源设计测试</CardTitle>
          <CardDescription>
            新的简约设计 vs 旧的复杂设计对比
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
            <Button 
              variant={showSources ? "default" : "outline"}
              onClick={() => setShowSources(true)}
            >
              新设计（简约）
            </Button>
            <Button 
              variant={!showSources ? "default" : "outline"}
              onClick={() => setShowSources(false)}
            >
              旧设计（复杂）
            </Button>
          </div>

          {showSources && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">新的简约设计</h3>
              <div className="bg-white dark:bg-zinc-950 p-4 rounded-lg border">
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                    基于搜索结果，我为您找到了以下关于草莓种植的权威资料：
                  </p>
                  
                  <Sources open={true}>
                    <SourcesTrigger count={sampleSources.length} />
                    <SourcesContent>
                      {sampleSources.map((source, index) => (
                        <Source
                          key={index}
                          href={source.url}
                          title={source.title}
                          description={source.description}
                          number={source.number}
                        />
                      ))}
                    </SourcesContent>
                  </Sources>
                </div>
              </div>
            </div>
          )}

          {!showSources && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">旧的复杂设计（已移除）</h3>
              <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-lg border-2 border-dashed">
                <p className="text-sm text-zinc-500 text-center">
                  旧设计已被替换为简约版本
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>设计对比</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 text-green-600">✅ 新设计优势</h4>
              <ul className="space-y-2 text-sm">
                <li>• 简约现代的视觉风格</li>
                <li>• 移除了复杂的渐变和装饰</li>
                <li>• 更好的可读性和扫描性</li>
                <li>• 统一的灰色调色板</li>
                <li>• 更小的视觉占用空间</li>
                <li>• 符合平台整体设计语言</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-red-600">❌ 旧设计问题</h4>
              <ul className="space-y-2 text-sm">
                <li>• 过度使用渐变和颜色</li>
                <li>• 装饰性元素过多</li>
                <li>• 视觉层次混乱</li>
                <li>• 与平台风格不一致</li>
                <li>• 占用过多视觉空间</li>
                <li>• 分散用户注意力</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>技术实现</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">主要改进</h4>
              <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>1. 移除了所有渐变背景和装饰条</li>
                <li>2. 使用统一的 zinc 色调</li>
                <li>3. 简化了悬停效果</li>
                <li>4. 减少了内边距和圆角</li>
                <li>5. 优化了图标和文字的层次</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">保留功能</h4>
              <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>• 编号显示</li>
                <li>• 标题和描述</li>
                <li>• 外部链接图标</li>
                <li>• 域名显示</li>
                <li>• 悬停交互</li>
                <li>• 深浅色主题支持</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}