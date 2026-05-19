"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Camera, Save } from "lucide-react"

interface CameraUrls {
  cameraAUrl: string
  cameraBUrl: string
}

export function CameraSettings() {
  const [urls, setUrls] = useState<CameraUrls>({ cameraAUrl: "", cameraBUrl: "" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchUrls = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/greenhouse/cameras")
      if (res.ok) {
        const data = await res.json()
        setUrls({
          cameraAUrl: data.cameraAUrl || "",
          cameraBUrl: data.cameraBUrl || ""
        })
      } else {
        toast.error("加载摄像头配置失败")
      }
    } catch (error) {
      toast.error("加载摄像头配置失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUrls()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      const res = await fetch("/api/greenhouse/cameras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(urls),
      })

      if (!res.ok) {
        throw new Error("保存失败")
      }

      toast.success("摄像头配置保存成功", {
        description: "监控页面和 AI 视觉动作现在将使用新的摄像头地址"
      })
    } catch (error) {
      toast.error("保存配置失败")
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (key: keyof CameraUrls, value: string) => {
    setUrls(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg shadow-none">
        <CardContent className="p-8 text-center text-zinc-500">
          加载摄像头配置中...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg shadow-none">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-medium">监控摄像头配置</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cameraAUrl">温室摄像头 A 流媒体地址</Label>
              <Input
                id="cameraAUrl"
                type="url"
                placeholder="https://player.xstrive.com/video/live?videoUrl=..."
                value={urls.cameraAUrl}
                onChange={(e) => handleChange("cameraAUrl", e.target.value)}
                className="font-mono text-sm bg-zinc-50 dark:bg-zinc-800"
              />
              <p className="text-xs text-muted-foreground">
                主摄像头的 HLS 或直播源地址，配置后将在监控页和 AI 视觉巡检中生效。
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cameraBUrl">温室摄像头 B 流媒体地址</Label>
              <Input
                id="cameraBUrl"
                type="url"
                placeholder="https://player.xstrive.com/video/live?videoUrl=..."
                value={urls.cameraBUrl}
                onChange={(e) => handleChange("cameraBUrl", e.target.value)}
                className="font-mono text-sm bg-zinc-50 dark:bg-zinc-800"
              />
              <p className="text-xs text-muted-foreground">
                备用摄像头的 HLS 或直播源地址，留空则代表该摄像头未接入。
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={saving} className="bg-primary hover:bg-emerald-700 text-white">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "保存中..." : "保存摄像头配置"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
