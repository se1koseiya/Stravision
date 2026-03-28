"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { LayoutDashboard, Loader2 } from "lucide-react"

export function DashboardVersionSettings() {
  const [version, setVersion] = useState<'full' | 'simplified'>('full')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/admin/dashboard-version")
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
      const res = await fetch("/api/admin/dashboard-version", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: newVersion }),
      })

      if (!res.ok) throw new Error("Failed to save")
      setVersion(newVersion)
      toast.success("仪表盘页面版本已更新")
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
          <LayoutDashboard className="size-4 text-emerald-500" />
          仪表盘页面版本控制
        </CardTitle>
        <CardDescription className="text-xs">
          选择向普通用户展示的 /dashboard 页面风格
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3">
          <div 
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${version === 'full' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-zinc-200 dark:border-zinc-800 hover:border-emerald-200'}`}
            onClick={() => handleSave('full')}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">✨ 完整版 (当前默认)</h4>
                <p className="text-xs text-zinc-500 mt-1">包含所有图表卡片，包括「光谱分析数据」</p>
              </div>
              <div className={`size-4 rounded-full border flex items-center justify-center ${version === 'full' ? 'border-emerald-500' : 'border-zinc-300'}`}>
                {version === 'full' && <div className="size-2 rounded-full bg-emerald-500" />}
              </div>
            </div>
          </div>

          <div 
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${version === 'simplified' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-zinc-200 dark:border-zinc-800 hover:border-emerald-200'}`}
            onClick={() => handleSave('simplified')}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">🧹 极简版</h4>
                <p className="text-xs text-zinc-500 mt-1">隐藏了「光谱分析数据」卡片</p>
              </div>
              <div className={`size-4 rounded-full border flex items-center justify-center ${version === 'simplified' ? 'border-emerald-500' : 'border-zinc-300'}`}>
                {version === 'simplified' && <div className="size-2 rounded-full bg-emerald-500" />}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
