"use client"

import { useState, useEffect } from "react"
import { Button, Input, Card, Typography, Space } from "antd"
import { toast } from "sonner"
import { SafetyCertificateOutlined, SaveOutlined, ReloadOutlined } from "@ant-design/icons"

const { Text } = Typography

interface RateLimitConfig {
  limit: number
  windowMs: number
  violationLimit: number
  banDuration: number
}

export function RateLimitSettings() {
  const [config, setConfig] = useState<RateLimitConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchConfig = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/settings/rate-limit")
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
      }
    } catch (error) {
      toast.error("Failed to load settings")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return

    try {
      setSaving(true)
      const res = await fetch("/api/admin/settings/rate-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      if (!res.ok) {
        throw new Error("Failed to save settings")
      }

      toast.success("Settings saved successfully")
    } catch (error) {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (key: keyof RateLimitConfig, value: string) => {
    if (!config) return
    const numValue = parseInt(value)
    if (isNaN(numValue)) return
    setConfig({ ...config, [key]: numValue })
  }

  if (loading) return <div>Loading settings...</div>
  if (!config) return <div>Error loading settings</div>

  return (
    <Card
      title={
        <Space>
          <SafetyCertificateOutlined style={{ color: "#8b5cf6" }} />
          <span>Auto-Ban Thresholds</span>
        </Space>
      }
      extra={
        <Button
          type="text"
          icon={<ReloadOutlined />}
          onClick={fetchConfig}
        />
      }
    >
      <form onSubmit={handleSave}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Text>Max Requests (per window)</Text>
              <Input
                type="number"
                value={config.limit}
                onChange={(e) => handleChange("limit", e.target.value)}
                min={1}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Maximum requests allowed before rate limiting triggers.
              </Text>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Text>Window Duration (ms)</Text>
              <Input
                type="number"
                value={config.windowMs}
                onChange={(e) => handleChange("windowMs", e.target.value)}
                min={1000}
                step={1000}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Time window in milliseconds (e.g., 60000 = 1 minute).
              </Text>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Text>Violation Limit</Text>
              <Input
                type="number"
                value={config.violationLimit}
                onChange={(e) => handleChange("violationLimit", e.target.value)}
                min={1}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Number of rate limit violations before IP is auto-banned.
              </Text>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Text>Ban Duration (ms)</Text>
              <Input
                type="number"
                value={config.banDuration}
                onChange={(e) => handleChange("banDuration", e.target.value)}
                min={1000}
                step={1000}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                How long the IP remains banned (e.g., 86400000 = 24 hours).
              </Text>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              disabled={saving}
              icon={<SaveOutlined />}
            >
              {saving ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  )
}
