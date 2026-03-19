"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function TestSearchEnforcementPage() {
  const [testMessage, setTestMessage] = useState("帮我抓取一下bilibili上关于草莓种植的视频连接")
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState("")
  const [logs, setLogs] = useState<string[]>([])
  const [toolCalls, setToolCalls] = useState<any[]>([])
  const [hasRealLinks, setHasRealLinks] = useState<boolean | null>(null)

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} [${type.toUpperCase()}]: ${message}`])
  }

  const testSearchEnforcement = async () => {
    setIsLoading(true)
    setResponse("")
    setLogs([])
    setToolCalls([])
    setHasRealLinks(null)
    addLog("开始测试搜索强制执行")

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: testMessage }],
          model: "qwen-plus",
          systemPrompt: "你是一个AI助手，请使用可用的工具来回答用户问题。",
          enableSearch: true,
          mcpConfigs: [
            {
              id: "exa-search",
              name: "exa-search", 
              displayName: "Exa 搜索",
              enabled: true,
              apiKey: "demo-key"
            },
            {
              id: "brave-search",
              name: "brave-search",
              displayName: "Brave 搜索", 
              enabled: true,
              apiKey: "demo-key"
            }
          ]
        })
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      let buffer = ""
      let fullResponse = ""
      let detectedToolCalls: any[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine) continue

          if (trimmedLine === "data: [DONE]") {
            addLog("流结束", "success")
            continue
          }

          if (trimmedLine.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmedLine.slice(6))

              if (data.tool_calls) {
                detectedToolCalls = [...detectedToolCalls, ...data.tool_calls]
                const toolNames = data.tool_calls.map((t: any) => t.function.name).join(", ")
                addLog(`✅ 检测到工具调用: ${toolNames}`, "success")
              }

              if (data.tool_result) {
                addLog(`📊 收到工具结果: ${data.tool_result.name}`, "info")
              }

              const content = data.choices?.[0]?.delta?.content ?? data.content
              if (typeof content === "string" && content.trim()) {
                fullResponse += content
                setResponse(fullResponse)
              }
            } catch (e) {
              addLog(`解析错误: ${e}`, "error")
            }
          }
        }
      }

      setToolCalls(detectedToolCalls)

      // 分析响应内容
      const analysisResults = analyzeResponse(fullResponse, detectedToolCalls)
      
      if (detectedToolCalls.length === 0) {
        addLog("❌ 严重问题：AI没有调用任何搜索工具！", "error")
      } else {
        addLog(`✅ AI正确调用了 ${detectedToolCalls.length} 个工具`, "success")
      }

      // 检查是否有编造的链接
      const fakeLinks = detectFakeLinks(fullResponse)
      if (fakeLinks.length > 0) {
        addLog(`❌ 检测到 ${fakeLinks.length} 个可疑的编造链接`, "error")
        setHasRealLinks(false)
      } else if (fullResponse.includes("http")) {
        addLog("✅ 响应中的链接看起来是真实的", "success")
        setHasRealLinks(true)
      } else {
        addLog("ℹ️ 响应中没有链接", "info")
      }

    } catch (error) {
      addLog(`测试失败: ${error}`, "error")
    } finally {
      setIsLoading(false)
    }
  }

  const analyzeResponse = (response: string, toolCalls: any[]) => {
    const hasToolCalls = toolCalls.length > 0
    const hasLinks = response.includes("http")
    const hasBilibiliLinks = response.includes("bilibili.com")
    
    return {
      hasToolCalls,
      hasLinks,
      hasBilibiliLinks
    }
  }

  const detectFakeLinks = (text: string) => {
    const fakePatterns = [
      /https:\/\/www\.bilibili\.com\/video\/BV[A-Za-z0-9]{10}/g, // 典型的编造B站链接格式
      /https:\/\/example\.com/g,
      /https:\/\/test\.com/g,
    ]
    
    const fakeLinks: string[] = []
    fakePatterns.forEach(pattern => {
      const matches = text.match(pattern)
      if (matches) {
        fakeLinks.push(...matches)
      }
    })
    
    return fakeLinks
  }

  const testCases = [
    "帮我抓取一下bilibili上关于草莓种植的视频连接",
    "帮我搜索最新的农业技术资讯",
    "我想知道2025年草莓种植的最佳方法",
    "查一下今年的农业政策有什么变化",
    "找一下关于温室大棚的技术文章"
  ]

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>搜索强制执行测试</CardTitle>
          <CardDescription>
            测试AI是否在搜索请求时强制调用MCP工具，而不是编造信息
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">测试消息</label>
            <Input
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="输入搜索请求..."
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {testCases.map((testCase, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setTestMessage(testCase)}
              >
                测试 {index + 1}
              </Button>
            ))}
          </div>

          <Button 
            onClick={testSearchEnforcement} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "测试中..." : "开始测试"}
          </Button>

          {/* 状态指示器 */}
          <div className="flex gap-2">
            {toolCalls.length > 0 && (
              <Badge variant="default" className="bg-green-500">
                ✅ 调用了工具
              </Badge>
            )}
            {hasRealLinks === true && (
              <Badge variant="default" className="bg-blue-500">
                ✅ 真实链接
              </Badge>
            )}
            {hasRealLinks === false && (
              <Badge variant="destructive">
                ❌ 编造链接
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {toolCalls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>工具调用记录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {toolCalls.map((call, index) => (
                <div key={index} className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <div className="font-medium">{call.function.name}</div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    {call.function.arguments}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>执行日志</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="text-sm font-mono text-zinc-600 dark:text-zinc-400">
                {log}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {response && (
        <Card>
          <CardHeader>
            <CardTitle>AI回复</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg max-h-96 overflow-y-auto">
              {response}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}