"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, Radio, Wifi } from "lucide-react"
import { cn } from "@/lib/utils"

type SpectrumDataSource = 'mcp' | 'mqtt'

export function SpectrumSourceSettings() {
  const [source, setSource] = useState<SpectrumDataSource>('mcp')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchSource()
  }, [])

  const fetchSource = async () => {
    try {
      const res = await fetch("/api/admin/settings/spectrum-source")
      if (!res.ok) throw new Error("Failed to fetch spectrum source")
      const data = await res.json()
      setSource(data.source)
    } catch (error) {
      console.error(error)
      toast.error("加载光谱数据源配置失败")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (newSource: SpectrumDataSource) => {
    if (newSource === source) return
    
    setUpdating(true)
    try {
      const res = await fetch("/api/admin/settings/spectrum-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: newSource })
      })

      if (!res.ok) throw new Error("Failed to update spectrum source")
      
      setSource(newSource)
      toast.success(`光谱数据源已切换至 ${newSource === 'mcp' ? 'MCP 服务器' : 'MQTT 直连'}`, {
        description: newSource === 'mcp' 
          ? '通过 MCP 服务器获取光谱数据' 
          : '通过 MQTT 通道直接获取光谱数据'
      })
    } catch (error) {
      console.error(error)
      toast.error("更新光谱数据源失败")
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg shadow-none">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Radio className="size-4 text-purple-500" />
          AI 光谱数据源
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          选择 AI 助手获取光谱数据的方式。MCP 通过服务器中转，MQTT 为直连模式。
        </p>
        
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className={cn(
              "h-auto flex-col items-start gap-2 p-4 rounded-lg transition-all",
              source === 'mcp'
                ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300"
                : "border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )}
            onClick={() => handleUpdate('mcp')}
            disabled={updating}
          >
            <div className="flex items-center gap-2 w-full">
              <div className={cn(
                "size-4 rounded-full border-2 flex items-center justify-center",
                source === 'mcp' 
                  ? "border-purple-500" 
                  : "border-zinc-300 dark:border-zinc-600"
              )}>
                {source === 'mcp' && (
                  <div className="size-2 rounded-full bg-purple-500" />
                )}
              </div>
              <span className="font-medium text-sm">MCP 服务器</span>
            </div>
            <p className="text-xs text-left text-zinc-500 dark:text-zinc-400 leading-relaxed">
              通过 MCP 服务器获取光谱数据，支持缓存和数据处理
            </p>
          </Button>

          <Button
            variant="outline"
            className={cn(
              "h-auto flex-col items-start gap-2 p-4 rounded-lg transition-all",
              source === 'mqtt'
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300"
                : "border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )}
            onClick={() => handleUpdate('mqtt')}
            disabled={updating}
          >
            <div className="flex items-center gap-2 w-full">
              <div className={cn(
                "size-4 rounded-full border-2 flex items-center justify-center",
                source === 'mqtt' 
                  ? "border-blue-500" 
                  : "border-zinc-300 dark:border-zinc-600"
              )}>
                {source === 'mqtt' && (
                  <div className="size-2 rounded-full bg-blue-500" />
                )}
              </div>
              <span className="font-medium text-sm">MQTT 直连</span>
            </div>
            <p className="text-xs text-left text-zinc-500 dark:text-zinc-400 leading-relaxed">
              直接通过 MQTT 通道获取实时光谱数据
            </p>
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono pt-2">
          <Wifi className="size-3" />
          <span>当前模式: {source === 'mcp' ? 'MCP 服务器' : 'MQTT 直连'}</span>
        </div>
      </CardContent>
    </Card>
  )
}
