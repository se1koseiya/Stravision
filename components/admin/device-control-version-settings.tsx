"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { LayoutPanelTop, Loader2 } from "lucide-react"

export function DeviceControlVersionSettings() {
  const [version, setVersion] = useState<'full' | 'simplified'>('full')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/admin/device-control-version")
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

  const handleSave = async (newVersion: 'full' | 'simplified') => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/device-control-version", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: newVersion }),
      })

      if (!res.ok) throw new Error("Failed to save")
      setVersion(newVersion)
      toast.success("设备控制页面版本已更新")
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
          <LayoutPanelTop className="size-4 text-blue-500" />
          设备控制页面版本控制
        </CardTitle>
        <CardDescription className="text-xs">
          选择向普通用户展示的 /device-control 页面风格
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3">
          <div 
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${version === 'full' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-zinc-200 dark:border-zinc-800 hover:border-blue-200'}`}
            onClick={() => handleSave('full')}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">🎛️ 完整版 (当前默认)</h4>
                <p className="text-xs text-zinc-500 mt-1">包含所有控制卡片，包括「丝杆滑台（摄像头云台）」</p>
              </div>
              <div className={`size-4 rounded-full border flex items-center justify-center ${version === 'full' ? 'border-blue-500' : 'border-zinc-300'}`}>
                {version === 'full' && <div className="size-2 rounded-full bg-blue-500" />}
              </div>
            </div>
          </div>

          <div 
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${version === 'simplified' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-zinc-200 dark:border-zinc-800 hover:border-blue-200'}`}
            onClick={() => handleSave('simplified')}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">🧹 极简版</h4>
                <p className="text-xs text-zinc-500 mt-1">隐藏了「丝杆滑台（摄像头云台）」高级控制卡片</p>
              </div>
              <div className={`size-4 rounded-full border flex items-center justify-center ${version === 'simplified' ? 'border-blue-500' : 'border-zinc-300'}`}>
                {version === 'simplified' && <div className="size-2 rounded-full bg-blue-500" />}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
