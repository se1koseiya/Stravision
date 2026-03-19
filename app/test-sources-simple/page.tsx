"use client"

import { Sources, SourcesTrigger, SourcesContent, Source } from "@/components/ui/assistant-ui"

export default function TestSourcesSimplePage() {
  const sampleSources = [
    {
      number: 1,
      title: "Next.js 官方文档",
      url: "https://nextjs.org/docs",
      description: "Next.js 框架的官方文档，包含完整的 API 参考和使用指南"
    },
    {
      number: 2,
      title: "React 官方文档",
      url: "https://react.dev",
      description: "React 库的官方文档，学习现代 React 开发的最佳资源"
    },
    {
      number: 3,
      title: "Tailwind CSS 文档",
      url: "https://tailwindcss.com/docs",
      description: "实用优先的 CSS 框架文档，快速构建现代用户界面"
    }
  ]

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">参考来源组件测试</h1>
      
      <div className="space-y-6">
        <div className="bg-white dark:bg-zinc-950 p-6 rounded-lg border">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            基于您的查询，我找到了以下相关资源：
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

        <div className="bg-white dark:bg-zinc-950 p-6 rounded-lg border">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            折叠状态的参考来源：
          </p>
          
          <Sources open={false}>
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

      <div className="mt-8 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
        <h2 className="font-semibold mb-2">设计特点</h2>
        <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
          <li>• 简约的灰色调色板</li>
          <li>• 清晰的信息层次</li>
          <li>• 统一的视觉风格</li>
          <li>• 良好的悬停反馈</li>
          <li>• 支持深浅色主题</li>
        </ul>
      </div>
    </div>
  )
}