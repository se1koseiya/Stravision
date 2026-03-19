"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestToolStatusPage() {
  const [testMessage, setTestMessage] = useState("帮我抓取一下bilibili上关于草莓种植的视频连接")
  const [isLoading, setIsLoading] = useState(false)
  const [agentStatus, setAgentStatus] = useState("")
  const [response, setResponse] = useState("")
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testToolCall = async () => {
    setIsLoading(true)
    setResponse("")
    setLogs([])
    addLog("开始测试工具调用状态")

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
      let hasToolCalls = false
      let hasContent = false
      let hasDone = false

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
            hasDone = true
            addLog("✅ 收到 [DONE] 标记")
            setAgentStatus("")
            continue
          }

          if (trimmedLine.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmedLine.slice(6))

              if (data.tool_calls) {
                hasToolCalls = true
                const toolNames = data.tool_calls.map((t: any) => t.function.name).join(", ")
                setAgentStatus(`正在使用工具: ${toolNames}...`)
                addLog(`🔧 检测到工具调用: ${toolNames}`)
              }

              if (data.tool_result) {
                addLog(`📊 收到工具结果: ${data.tool_result.name}`)
              }

              const content = data.choices?.[0]?.delta?.content ?? data.content
              if (typeof content === "string" && content.trim()) {
                if (!hasContent) {
                  hasContent = true
                  addLog("📝 开始接收AI回复内容")
                  if (agentStatus.includes("正在使用工具")) {
                    setAgentStatus("")
                    addLog("🧹 清理工具调用状态")
                  }
                }
                setResponse(prev => prev + content)
              }
            } catch (e) {
              addLog(`❌ 解析错误: ${e}`)
            }
          }
        }
      }

      // 最终状态检查
      addLog(`📋 测试完成 - 工具调用: ${hasToolCalls ? '是' : '否'}, 内容: ${hasContent ? '是' : '否'}, DONE: ${hasDone ? '是' : '否'}`)
      
      if (hasToolCalls && !hasDone) {
        addLog("⚠️ 检测到问题：有工具调用但没有收到 [DONE] 标记")
      } else if (hasToolCalls && hasDone) {
        addLog("✅ 工具调用流程正常")
      }

    } catch (error) {
      addLog(`❌ 测试失败: ${error}`)
    } finally {
      setIsLoading(false)
      setAgentStatus("")
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>工具调用状态测试</CardTitle>
          <CardDescription>
            测试AI助手工具调用完成后是否正确清理"Running"状态
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">测试消息</label>
            <Input
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="输入会触发工具调用的消息..."
            />
          </div>

          <Button 
            onClick={testToolCall} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "测试中..." : "开始测试"}
          </Button>

          {agentStatus && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
                当前状态: {agentStatus}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
            <div className="text-sm whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg">
              {response}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}