"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Monitor, Loader2 } from "lucide-react"

export function MonitorVersionSettings() {
  const [version, setVersion] = useState<'beautiful' | 'ugly'>('beautiful')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/admin/monitor-version")
      .then((res) => res.json())
      .then((data) => {
        if (data.version) setVersion(data.version)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const handleSave = async (newVersion: 'beautiful' | 'ugly') => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/monitor-version", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: newVersion }),
      })

      if (!res.ok) throw new Error("Failed to save")
      setVersion(newVersion)
      toast.success("监控页面版本已更新")
    } catch (error) {
      toast.error("更新失败")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg shadow-none">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="size-4 animate-spin text-zinc-500" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Monitor className="size-4 text-violet-500" />
          监控页面版本控制
        </CardTitle>
        <CardDescription className="text-xs">
          选择向普通用户展示的 /monitor 页面风格
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3">
          <div 
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${version === 'beautiful' ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10' : 'border-zinc-200 dark:border-zinc-800 hover:border-violet-200'}`}
            onClick={() => handleSave('beautiful')}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">✨ 现代美观版 (当前默认)</h4>
                <p className="text-xs text-zinc-500 mt-1">包含灵动岛、发光动效、高级动画与现代 UI 设计</p>
              </div>
              <div className={`size-4 rounded-full border flex items-center justify-center ${version === 'beautiful' ? 'border-violet-500' : 'border-zinc-300'}`}>
                {version === 'beautiful' && <div className="size-2 rounded-full bg-violet-500" />}
              </div>
            </div>
          </div>

          <div 
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${version === 'ugly' ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10' : 'border-zinc-200 dark:border-zinc-800 hover:border-violet-200'}`}
            onClick={() => handleSave('ugly')}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">🧱 简陋复古版 (特别丑)</h4>
                <p className="text-xs text-zinc-500 mt-1">基础的原生 HTML 元素，无复杂样式，工业级复古风格</p>
              </div>
              <div className={`size-4 rounded-full border flex items-center justify-center ${version === 'ugly' ? 'border-violet-500' : 'border-zinc-300'}`}>
                {version === 'ugly' && <div className="size-2 rounded-full bg-violet-500" />}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
