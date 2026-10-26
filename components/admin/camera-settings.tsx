"use client"

/**
 * 监控摄像头配置
 *
 * 🚨 两端共用同一份数据逻辑（2026-10-01）：
 *   - variant="page"（默认）：管理后台 `/admin` 的原有版式，视觉零变更；
 *   - variant="embedded"：内嵌到 AI 设置弹窗，改用设置版式原子
 *     （GroupTitle + Card + Row），颜色全部走 `--set-*` 令牌，亮/暗自动切换。
 *   不复制第二份实现，避免两边日后漂移。
 */

import { useCallback, useEffect, useState } from "react"
import { Alert, Button, Input, Card as AntdCard, Tag, Typography } from "antd"
import { toast } from "@/lib/ui/feedback"
import { IS_DESKTOP_APP } from "@/lib/desktop-mode"
import { IconCamera, IconRefresh, IconSave } from "@/components/icon"
// 设置版式原子：仅 embedded 使用，所需 CSS 变量由设置弹窗根节点提供
import { Card, GroupTitle, Row } from "@/components/settings/settings-modal-ui"

interface CameraUrls {
  cameraAUrl: string
  cameraBUrl: string
}

const EMPTY_URLS: CameraUrls = { cameraAUrl: "", cameraBUrl: "" }

export function CameraSettings({
  variant = "page",
  onDirtyChange,
}: {
  variant?: "page" | "embedded"
  /** 内嵌时上报「有未保存修改」，供设置弹窗关闭前确认 */
  onDirtyChange?: (dirty: boolean) => void
} = {}) {
  const [urls, setUrls] = useState<CameraUrls>(EMPTY_URLS)
  /** 最近一次成功读取/保存的快照，用于判断是否有未保存修改 */
  const [savedUrls, setSavedUrls] = useState<CameraUrls>(EMPTY_URLS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const embedded = variant === "embedded"

  const fetchUrls = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/greenhouse/cameras")
      if (res.ok) {
        const data = await res.json()
        const next = {
          cameraAUrl: data.cameraAUrl || "",
          cameraBUrl: data.cameraBUrl || "",
        }
        setUrls(next)
        setSavedUrls(next)
      } else {
        toast.error("加载摄像头配置失败")
      }
    } catch {
      toast.error("加载摄像头配置失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUrls()
  }, [fetchUrls])

  useEffect(() => {
    onDirtyChange?.(
      urls.cameraAUrl !== savedUrls.cameraAUrl || urls.cameraBUrl !== savedUrls.cameraBUrl,
    )
  }, [urls, savedUrls, onDirtyChange])

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault()
    try {
      setSaving(true)
      const res = await fetch("/api/greenhouse/cameras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(urls),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "保存失败")
      }

      setSavedUrls(urls)
      toast.success("摄像头配置保存成功", {
        description: IS_DESKTOP_APP
          ? "已永久保存到本机，重启应用后依然有效"
          : "监控页面和 AI 视觉动作现在将使用新的摄像头地址",
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存配置失败")
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (key: keyof CameraUrls, value: string) => {
    setUrls((prev) => ({ ...prev, [key]: value }))
  }

  /* ------------------------------------------------------------------ */
  /* 内嵌设置弹窗：设置版式                                               */
  /* ------------------------------------------------------------------ */

  if (embedded) {
    if (loading) {
      return (
        <>
          <GroupTitle>监控摄像头</GroupTitle>
          <Card>
            <div style={{ padding: "28px 20px", textAlign: "center", color: "var(--set-text-secondary)", fontSize: 13 }}>
              正在读取摄像头配置…
            </div>
          </Card>
        </>
      )
    }

    return (
      <>
        <GroupTitle>监控摄像头</GroupTitle>
        <Card>
          <Row
            title="摄像头 A · 主画面"
            desc="主摄像头的 HLS 或直播源地址。保存后将在监控页与 AI 视觉巡检中生效。"
            vertical
          >
            <Input
              id="cameraAUrl"
              type="url"
              placeholder="https://player.xstrive.com/video/live?videoUrl=..."
              value={urls.cameraAUrl}
              onChange={(e) => handleChange("cameraAUrl", e.target.value)}
              style={{ fontSize: 13 }}
            />
          </Row>
          <Row
            title="摄像头 B · 备用画面"
            desc="备用摄像头的 HLS 或直播源地址；留空表示该摄像头未接入。"
            vertical
            last
          >
            <Input
              id="cameraBUrl"
              type="url"
              placeholder="https://player.xstrive.com/video/live?videoUrl=..."
              value={urls.cameraBUrl}
              onChange={(e) => handleChange("cameraBUrl", e.target.value)}
              style={{ fontSize: 13 }}
            />
          </Row>
        </Card>

        {IS_DESKTOP_APP && (
          <>
            <div style={{ height: 20 }} />
            <GroupTitle>桌面端</GroupTitle>
            <Card>
              <Row
                title="地址会永久保存在本机"
                desc="保存后写入本机配置，重启应用、甚至重建本地数据都无需重新填写。"
                last
              >
                <Tag style={{ margin: 0, borderRadius: 999, fontSize: 11.5 }}>本机生效</Tag>
              </Row>
            </Card>
          </>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <Button onClick={fetchUrls} disabled={saving} icon={<IconRefresh />}>
            重新读取
          </Button>
          <Button type="primary" onClick={() => handleSave()} loading={saving} icon={<IconSave />}>
            保存摄像头配置
          </Button>
        </div>
      </>
    )
  }

  /* ------------------------------------------------------------------ */
  /* 管理后台整页：保持既有版式                                            */
  /* ------------------------------------------------------------------ */

  if (loading) {
    return (
      <AntdCard
        style={{ border: "1px solid #EDEEEF" }}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <IconCamera />
            监控摄像头配置
          </div>
        }
      >
        <div style={{ textAlign: "center", padding: "32px", color: "#8F959E" }}>
          加载摄像头配置中...
        </div>
      </AntdCard>
    )
  }

  return (
    <AntdCard
      style={{ border: "1px solid #EDEEEF" }}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <IconCamera style={{ color: "#059669" }} />
          监控摄像头配置
        </div>
      }
    >
      <form onSubmit={handleSave}>
        <div style={{ marginBottom: "16px" }}>
          {IS_DESKTOP_APP && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: "16px" }}
              title="地址会永久保存在本机"
              description="保存后写入本机配置，重启应用、甚至重建本地数据都无需重新填写。"
            />
          )}

          <div style={{ marginBottom: "16px" }}>
            <Typography.Text strong style={{ display: "block", marginBottom: "8px" }}>
              温室摄像头 A 流媒体地址
            </Typography.Text>
            <Input
              id="cameraAUrl"
              type="url"
              placeholder="https://player.xstrive.com/video/live?videoUrl=..."
              value={urls.cameraAUrl}
              onChange={(e) => handleChange("cameraAUrl", e.target.value)}
              style={{ fontSize: "14px" }}
            />
            <Typography.Text type="secondary" style={{ fontSize: "12px", display: "block", marginTop: "4px" }}>
              主摄像头的 HLS 或直播源地址，配置后将在监控页和 AI 视觉巡检中生效。
            </Typography.Text>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <Typography.Text strong style={{ display: "block", marginBottom: "8px" }}>
              温室摄像头 B 流媒体地址
            </Typography.Text>
            <Input
              id="cameraBUrl"
              type="url"
              placeholder="https://player.xstrive.com/video/live?videoUrl=..."
              value={urls.cameraBUrl}
              onChange={(e) => handleChange("cameraBUrl", e.target.value)}
              style={{ fontSize: "14px" }}
            />
            <Typography.Text type="secondary" style={{ fontSize: "12px", display: "block", marginTop: "4px" }}>
              备用摄像头的 HLS 或直播源地址，留空则代表该摄像头未接入。
            </Typography.Text>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "8px" }}>
          <Button type="primary" htmlType="submit" loading={saving} icon={<IconSave />}>
            {saving ? "保存中..." : "保存摄像头配置"}
          </Button>
        </div>
      </form>
    </AntdCard>
  )
}
