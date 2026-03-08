
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Send, Rocket, Plus, Trash2, Sparkles, Bug, Loader2 } from "lucide-react"

export function ChangelogSender() {
  const [version, setVersion] = useState("v2.5.0")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [title, setTitle] = useState("系统更新公告：MCP 工具与智能托管优化")
  
  const [features, setFeatures] = useState<string[]>([
    "新增光谱 MCP (Spectrum MCP) 工具，支持获取指定通道光谱值和全波段数据",
    "管理后台新增更新日志 (Changelog) 推送功能，支持结构化展示",
    "聊天界面新增更新日志卡片渲染，优化信息展示体验",
    "集成 SSE (Server-Sent Events) 协议支持，提升 MCP 工具连接稳定性"
  ])
  const [improvements, setImprovements] = useState<string[]>([
    "优化了 AI 智能托管逻辑，加入了严格的强制静默协议，防止设备被意外开启",
    "改进了自动播报功能，进入监控页面时 AI 会自动进行语音问候",
    "优化了 MCP 工具执行器的错误处理和重试机制",
    "调整了系统提示词 (System Prompt)，增强了对用户关闭指令的服从性"
  ])
  const [fixes, setFixes] = useState<string[]>([
    "修复了 IP 封禁管理中时间戳解析导致的 RangeError 报错",
    "修复了自动托管模式下设备反复开关的循环逻辑问题",
    "修复了 Next.js 版本不匹配导致的 Turbopack 启动错误"
  ])
  
  const [actionLabel, setActionLabel] = useState("前往体验新功能")
  const [actionUrl, setActionUrl] = useState("/mcp-store")
  
  const [loading, setLoading] = useState(false)

  const addItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, list: string[]) => {
    setter([...list, ""])
  }

  const updateItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, list: string[], index: number, value: string) => {
    const newList = [...list]
    newList[index] = value
    setter(newList)
  }

  const removeItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, list: string[], index: number) => {
    const newList = [...list]
    newList.splice(index, 1)
    setter(newList)
  }

  const handleSend = async () => {
    if (!version.trim()) {
      toast.error("请输入版本号")
      return
    }

    const content = {
      version,
      date,
      title,
      features: features.filter(i => i.trim()),
      improvements: improvements.filter(i => i.trim()),
      fixes: fixes.filter(i => i.trim()),
      action: actionLabel.trim() && actionUrl.trim() ? {
          label: actionLabel.trim(),
          url: actionUrl.trim()
      } : undefined
    }

    if (content.features.length === 0 && content.improvements.length === 0 && content.fixes.length === 0) {
        toast.error("请至少输入一项更新内容")
        return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/admin/announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            content: JSON.stringify(content),
            type: 'changelog'
        })
      })

      const data = await res.json()

      if (res.ok) {
        toast.success("更新日志推送成功")
        // Reset form
        setVersion("")
        setFeatures([])
        setImprovements([])
        setFixes([])
        setActionLabel("前往体验新功能")
        setActionUrl("/mcp-store")
      } else {
        toast.error(data.error || "发送失败")
      }
    } catch (error) {
      console.error(error)
      toast.error("发送失败，请检查网络")
    } finally {
      setLoading(false)
    }
  }

  const renderList = (
    title: string, 
    icon: React.ReactNode, 
    list: string[], 
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    placeholder: string
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </Label>
        <Button variant="ghost" size="sm" onClick={() => addItem(setter, list)} className="h-6 w-6 p-0 rounded-full">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-2">
        {list.map((item, index) => (
          <div key={index} className="flex gap-2">
            <Input 
              value={item} 
              onChange={(e) => updateItem(setter, list, index, e.target.value)}
              placeholder={placeholder}
              className="h-8 text-sm"
            />
            <Button variant="ghost" size="icon" onClick={() => removeItem(setter, list, index)} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {list.length === 0 && (
            <div className="text-xs text-muted-foreground italic px-2">暂无条目，点击 + 添加</div>
        )}
      </div>
    </div>
  )

  return (
    <Card className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl border-white/40 dark:border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-blue-500" />
          发布更新日志
        </CardTitle>
        <CardDescription>
          以精美的卡片形式向用户推送版本更新、功能改进与修复日志。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>版本号 (Version)</Label>
                <Input placeholder="v1.0.0" value={version} onChange={(e) => setVersion(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label>发布日期 (Date)</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
        </div>
        
        <div className="space-y-2">
            <Label>标题 (Title)</Label>
            <Input placeholder="系统更新公告" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="space-y-6 pt-2">
            {renderList("新功能 (Features)", <Rocket className="h-4 w-4 text-blue-500"/>, features, setFeatures, "新增了...")}
            {renderList("优化改进 (Improvements)", <Sparkles className="h-4 w-4 text-amber-500"/>, improvements, setImprovements, "优化了...")}
            {renderList("问题修复 (Fixes)", <Bug className="h-4 w-4 text-red-500"/>, fixes, setFixes, "修复了...")}
        </div>

        <div className="space-y-4 pt-4 border-t border-dashed">
            <Label className="text-sm font-semibold">行动按钮 (Call to Action)</Label>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">按钮文字</Label>
                    <Input placeholder="前往体验" value={actionLabel} onChange={(e) => setActionLabel(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">跳转链接</Label>
                    <Input placeholder="/monitor" value={actionUrl} onChange={(e) => setActionUrl(e.target.value)} />
                </div>
            </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSend} 
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                发送中...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                推送更新
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
