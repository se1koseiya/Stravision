"use client"

import { useState, useEffect } from "react"
import { Button, Typography, Spin, Card, Popconfirm } from "antd"
import { LoadingOutlined, UploadOutlined, UndoOutlined } from "@ant-design/icons"
import { toast } from "sonner"
import { ImageCropper } from "@/components/admin/image-cropper"

const { Text, Title } = Typography

interface AppIconState {
  url: string | null
  updatedAt: number
  /** 统一走 /logo.png 预览，直观反映全站实际生效效果 */
  previewUrl: string
  isCustom: boolean
}

export function BrandingSettings() {
  const [state, setState] = useState<AppIconState>({
    url: null,
    updatedAt: 0,
    previewUrl: "/logo.png",
    isCustom: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cropperOpen, setCropperOpen] = useState(false)
  const [previewFailed, setPreviewFailed] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/settings/branding")
      if (res.ok) {
        const data = await res.json()
        setState({
          url: data.url ?? null,
          updatedAt: data.updatedAt ?? 0,
          previewUrl: data.previewUrl ?? "/logo.png",
          isCustom: Boolean(data.isCustom),
        })
      } else {
        toast.error("获取应用图标配置失败")
      }
    } catch (error) {
      console.error("Failed to fetch branding settings:", error)
      toast.error("获取应用图标配置失败")
    } finally {
      setLoading(false)
    }
  }

  /** 裁剪完成后立即落库，管理员无需二次确认 */
  const handleCropped = async (url: string) => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "保存失败")

      setState({
        url: data.url,
        updatedAt: data.updatedAt,
        previewUrl: data.previewUrl,
        isCustom: true,
      })
      setPreviewFailed(false)
      toast.success("应用图标已更新，全站即时生效")
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "保存失败")
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings/branding", { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "重置失败")

      setState({
        url: null,
        updatedAt: 0,
        previewUrl: data.previewUrl ?? "/logo.png",
        isCustom: false,
      })
      setPreviewFailed(false)
      toast.success("已恢复为默认图标")
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "重置失败")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
      </div>
    )
  }

  return (
    <Card style={{ border: "1px solid #EDEEEF" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>应用图标</Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            统一管理站点图标。更新后浏览器标签页 / 收藏夹图标、PWA 安装图标、侧边栏品牌位与邮件模板中的
            Logo 会同步替换，无需重新部署。
          </Text>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            padding: 16,
            borderRadius: 6,
            border: "1px solid #EDEEEF",
            background: "#FFFFFF",
          }}
        >
          {/* 当前图标预览 */}
          <div
            style={{
              width: 72,
              height: 72,
              flexShrink: 0,
              borderRadius: 8,
              border: "1px solid #EDEEEF",
              background: "#FAFAFA",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {previewFailed ? (
              <Text type="secondary" style={{ fontSize: 12 }}>加载失败</Text>
            ) : (
              <img
                src={state.previewUrl}
                alt="当前应用图标"
                width={72}
                height={72}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                onError={() => setPreviewFailed(true)}
              />
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Text strong style={{ fontSize: 14 }}>当前图标</Text>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 500,
                  ...(state.isCustom
                    ? { background: "#E6F4FF", color: "#1677FF", border: "1px solid #91CAFF" }
                    : { background: "#FAFAFA", color: "#8C8C8C", border: "1px solid #EDEEEF" }),
                }}
              >
                {state.isCustom ? "自定义图标" : "系统默认"}
              </span>
            </div>

            <Text type="secondary" style={{ fontSize: 13 }}>
              建议上传正方形图片，尺寸 512 × 512，PNG 格式，不超过 2MB；系统会自动裁切并压缩存储。
            </Text>

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <Button
                type="primary"
                icon={<UploadOutlined />}
                loading={saving}
                onClick={() => setCropperOpen(true)}
              >
                {state.isCustom ? "更换图标" : "上传图标"}
              </Button>

              {state.isCustom && (
                <Popconfirm
                  title="恢复默认图标"
                  description="将删除已上传的自定义图标，站点图标恢复为系统默认。"
                  okText="确认恢复"
                  cancelText="取消"
                  onConfirm={handleReset}
                >
                  <Button icon={<UndoOutlined />} disabled={saving}>
                    恢复默认
                  </Button>
                </Popconfirm>
              )}
            </div>
          </div>
        </div>

        <Text type="secondary" style={{ fontSize: 12 }}>
          提示：图标已即时替换，若浏览器标签页仍显示旧图标，属于浏览器自身的图标缓存，刷新页面或重开标签即可。
        </Text>
      </div>

      <ImageCropper
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        onCropComplete={handleCropped}
        aspect={1}
        title="裁切应用图标"
      />
    </Card>
  )
}
