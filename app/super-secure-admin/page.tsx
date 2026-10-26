"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "@/lib/ui/feedback"
import type { UserPublic } from "@/lib/db/user-service"

type CameraUrls = { cameraAUrl: string; cameraBUrl: string }

export default function SuperSecureAdminPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [urls, setUrls] = useState<CameraUrls>({ cameraAUrl: "", cameraBUrl: "" })

  const canEdit = useMemo(() => currentUser?.role === "super_admin", [currentUser?.role])

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/auth/me")
        const data = await res.json()
        if (!data?.authenticated || !data?.user) {
          router.replace("/super-secure-admin-entry")
          return
        }
        const user = data.user as UserPublic
        setCurrentUser(user)
        if (user.role !== "super_admin") {
          router.replace("/")
          return
        }

        const cfgRes = await fetch("/api/greenhouse/cameras")
        if (cfgRes.ok) {
          const cfg = (await cfgRes.json()) as Partial<CameraUrls>
          setUrls({
            cameraAUrl: typeof cfg.cameraAUrl === "string" ? cfg.cameraAUrl : "",
            cameraBUrl: typeof cfg.cameraBUrl === "string" ? cfg.cameraBUrl : ""
          })
        } else {
          const err = await cfgRes.json().catch(() => ({}))
          toast.error(err?.error || "加载摄像头地址失败")
        }
      } catch {
        router.replace("/super-secure-admin-entry")
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [router])

  const handleSave = async () => {
    if (!canEdit) return
    setSaving(true)
    try {
      const res = await fetch("/api/greenhouse/cameras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(urls)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error || "保存失败")
        return
      }
      toast.success("已保存")
    } catch {
      toast.error("保存失败")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen w-full bg-black/95" />
  }

  return (
    <div className="min-h-screen w-full bg-black/95 p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl border-red-900/30 bg-black text-red-500 shadow-lg shadow-red-900/20">
        <CardHeader className="border-b border-red-900/30">
          <CardTitle className="font-mono tracking-widest text-red-600 uppercase">
            Super Secure Admin
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-red-700 font-mono text-xs uppercase">温室摄像头 A 地址</Label>
              <Input
                value={urls.cameraAUrl}
                onChange={(e) => setUrls((prev) => ({ ...prev, cameraAUrl: e.target.value }))}
                className="bg-black border-red-900/50 text-red-500 placeholder:text-red-900/50 focus-visible:ring-red-900 font-mono"
                placeholder="https://... / rtsp://... / rtmp://..."
                disabled={!canEdit || saving}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-red-700 font-mono text-xs uppercase">温室摄像头 B 地址</Label>
              <Input
                value={urls.cameraBUrl}
                onChange={(e) => setUrls((prev) => ({ ...prev, cameraBUrl: e.target.value }))}
                className="bg-black border-red-900/50 text-red-500 placeholder:text-red-900/50 focus-visible:ring-red-900 font-mono"
                placeholder="https://... / rtsp://... / rtmp://..."
                disabled={!canEdit || saving}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={!canEdit || saving}
              className="bg-red-950 hover:bg-red-900 text-red-500 border border-red-900/50 font-mono uppercase tracking-wider"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

