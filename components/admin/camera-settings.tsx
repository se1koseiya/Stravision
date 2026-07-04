"use client"

import { useState, useEffect } from "react"
import { Button, Input, Card, Typography } from "antd"
import { toast } from "sonner"
import { CameraOutlined, SaveOutlined } from "@ant-design/icons"

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
      <Card title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CameraOutlined />
          监控摄像头配置
        </div>
      }>
        <div style={{ textAlign: 'center', padding: '32px', color: '#8c8c8c' }}>
          加载摄像头配置中...
        </div>
      </Card>
    )
  }

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CameraOutlined style={{ color: '#1890ff' }} />
          监控摄像头配置
        </div>
      }
    >
      <form onSubmit={handleSave}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <Typography.Text strong style={{ display: 'block', marginBottom: '8px' }}>
              温室摄像头 A 流媒体地址
            </Typography.Text>
            <Input
              id="cameraAUrl"
              type="url"
              placeholder="https://player.xstrive.com/video/live?videoUrl=..."
              value={urls.cameraAUrl}
              onChange={(e) => handleChange("cameraAUrl", e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '14px' }}
            />
            <Typography.Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
              主摄像头的 HLS 或直播源地址，配置后将在监控页和 AI 视觉巡检中生效。
            </Typography.Text>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <Typography.Text strong style={{ display: 'block', marginBottom: '8px' }}>
              温室摄像头 B 流媒体地址
            </Typography.Text>
            <Input
              id="cameraBUrl"
              type="url"
              placeholder="https://player.xstrive.com/video/live?videoUrl=..."
              value={urls.cameraBUrl}
              onChange={(e) => handleChange("cameraBUrl", e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '14px' }}
            />
            <Typography.Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
              备用摄像头的 HLS 或直播源地址，留空则代表该摄像头未接入。
            </Typography.Text>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={saving}
            icon={<SaveOutlined />}
          >
            {saving ? "保存中..." : "保存摄像头配置"}
          </Button>
        </div>
      </form>
    </Card>
  )
}
