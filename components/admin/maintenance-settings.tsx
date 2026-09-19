
"use client"

import { useState, useEffect } from "react"
import { Button, Switch, Input, Typography, Spin, Card } from "antd"
import { toast } from "sonner"
import { IconCaution, IconCheckOne, IconLoading } from "@/components/icon";

const { Text, Title } = Typography

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
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
        <Spin indicator={<IconLoading style={{ fontSize: 24 }} spin />} />
      </div>
    )
  }

  return (
    <Card style={{ border: "1px solid #EDEEEF" }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: 16,
        borderRadius: 6,
        border: '1px solid #EDEEEF',
        background: '#FFFFFF'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Title level={5} style={{ margin: 0 }}>系统维护模式</Title>
            {config.enabled ? (
              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                padding: '2px 8px', 
                borderRadius: 4, 
                fontSize: 12, 
                fontWeight: 500, 
                background: '#FFF7E6',
                color: '#FA8C16',
                border: '1px solid #FFD591'
              }}>
                开启中
              </span>
            ) : (
              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                padding: '2px 8px', 
                borderRadius: 4, 
                fontSize: 12, 
                fontWeight: 500, 
                background: '#F6FFED',
                color: '#52C41A',
                border: '1px solid #B7EB8F'
              }}>
                运行中
              </span>
            )}
          </div>
          <Text type="secondary" style={{ fontSize: 14 }}>
            开启后，除管理员外的所有用户访问系统将被重定向到维护页面。
          </Text>
        </div>
        <Switch
          checked={config.enabled}
          onChange={(checked) => setConfig({ ...config, enabled: checked })}
        />
      </div>

      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 16, 
        transition: 'all 0.3s',
        opacity: config.enabled ? 1 : 0.6,
        pointerEvents: config.enabled ? 'auto' : 'none'
      }}>
        <div>
          <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>维护标题</Text>
          <Input
            value={config.title}
            onChange={(e) => setConfig({ ...config, title: e.target.value })}
            placeholder="例如：系统升级维护中"
          />
        </div>
        
        <div>
          <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>维护说明</Text>
          <Input.TextArea
            value={config.message}
            onChange={(e) => setConfig({ ...config, message: e.target.value })}
            placeholder="请填写维护原因和预计恢复时间..."
            rows={4}
          />
        </div>

        <div>
          <Button 
            type="primary"
            onClick={handleSave} 
            loading={saving}
            style={config.enabled ? { background: '#FA8C16', borderColor: '#FA8C16' } : {}}
            icon={config.enabled ? <IconCaution /> : <IconCheckOne />}
          >
            {config.enabled ? "保存并开启维护" : "保存设置"}
          </Button>
        </div>
      </div>
    </div>
    </Card>
  )
}
