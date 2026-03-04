"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react"

interface MaintenanceConfig {
  enabled: boolean
  title: string
  message: string
}

export function MaintenanceSettings() {
  const [config, setConfig] = useState<MaintenanceConfig>({
    enabled: false,
    title: "",
    message: ""
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/settings/maintenance")
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
      }
    } catch (error) {
      console.error("Failed to fetch maintenance settings:", error)
      toast.error("获取维护设置失败")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      })

      if (!res.ok) throw new Error("Failed to save")
      
      const data = await res.json()
      setConfig(data)
      toast.success(data.enabled ? "系统维护模式已开启" : "系统维护模式已关闭")
    } catch (error) {
      console.error(error)
      toast.error("保存失败")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 rounded-xl border border-black/5 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">系统维护模式</h3>
            {config.enabled ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                开启中
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                运行中
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            开启后，除管理员外的所有用户访问系统将被重定向到维护页面。
          </p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
        />
      </div>

      <div className={`space-y-4 transition-all duration-300 ${config.enabled ? 'opacity-100' : 'opacity-60'}`}>
        <div className="grid gap-2">
          <Label htmlFor="title">维护标题</Label>
          <Input
            id="title"
            value={config.title}
            onChange={(e) => setConfig({ ...config, title: e.target.value })}
            placeholder="例如：系统升级维护中"
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="message">维护说明</Label>
          <Textarea
            id="message"
            value={config.message}
            onChange={(e) => setConfig({ ...config, message: e.target.value })}
            placeholder="请填写维护原因和预计恢复时间..."
            className="min-h-[100px]"
          />
        </div>

        <div className="pt-2">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className={config.enabled ? "bg-amber-500 hover:bg-amber-600" : ""}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                {config.enabled ? <AlertTriangle className="mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                {config.enabled ? "保存并开启维护" : "保存设置"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
