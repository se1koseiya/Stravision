"use client"

import { useState, useEffect } from "react"
import { Card, Switch, Typography, Button, Tag } from "antd"
import { toast } from "sonner"
import { LoadingOutlined, FireOutlined, SaveOutlined, RotateLeftOutlined } from "@ant-design/icons"

interface AIFeatureConfig {
  enableTaskList: boolean
  enableDeviceBento: boolean
  enableControlBento: boolean
  enableMonitor: boolean
  enableScheduledTasks: boolean
  enableChart: boolean
  enableSpectral: boolean
  enableReasoning: boolean
  enableSources: boolean
  enableToolUsed: boolean
  enableScheduleTask: boolean
  enableDeviceControl: boolean
  enableVisionInspection: boolean
  enableHTMLPreview: boolean
  enableWebPreview: boolean
}

const DEFAULT_CONFIG: AIFeatureConfig = {
  enableTaskList: true,
  enableDeviceBento: true,
  enableControlBento: true,
  enableMonitor: true,
  enableScheduledTasks: true,
  enableChart: true,
  enableSpectral: true,
  enableReasoning: true,
  enableSources: true,
  enableToolUsed: true,
  enableScheduleTask: true,
  enableDeviceControl: true,
  enableVisionInspection: true,
  enableHTMLPreview: true,
  enableWebPreview: true,
}

const FEATURE_DESCRIPTIONS: Record<keyof AIFeatureConfig, { label: string; description: string; tag: string }> = {
  enableTaskList: {
    label: "任务规划器",
    description: "显示 AI 的任务执行流程和进度（<TASK_LIST> 标签）",
    tag: "<TASK_LIST>"
  },
  enableDeviceBento: {
    label: "设备状态卡片",
    description: "显示环境数据和传感器读数（<DEVICE_BENTO> 标签）",
    tag: "<DEVICE_BENTO>"
  },
  enableControlBento: {
    label: "设备控制面板",
    description: "显示设备控制界面（<CONTROL_BENTO> 标签）",
    tag: "<CONTROL_BENTO>"
  },
  enableMonitor: {
    label: "监控画面",
    description: "显示摄像头实时监控（<MONITOR> 标签）",
    tag: "<MONITOR>"
  },
  enableScheduledTasks: {
    label: "定时任务列表",
    description: "显示系统定时任务管理界面（<SCHEDULED_TASKS> 标签）",
    tag: "<SCHEDULED_TASKS>"
  },
  enableChart: {
    label: "数据图表",
    description: "显示数据可视化图表（<CHART> 标签，支持折线/柱状/面积/饼图）",
    tag: "<CHART>"
  },
  enableSpectral: {
    label: "光谱数据",
    description: "显示光谱分析数据（<SPECTRAL> 标签）",
    tag: "<SPECTRAL>"
  },
  enableReasoning: {
    label: "思考过程",
    description: "显示 AI 的推理思维链（<REASONING> 标签）",
    tag: "<REASONING>"
  },
  enableSources: {
    label: "引用来源",
    description: "显示回答的参考来源和引用（<SOURCES> 标签）",
    tag: "<SOURCES>"
  },
  enableToolUsed: {
    label: "工具调用记录",
    description: "显示 MCP 工具的调用过程（<TOOL_USED> 标签）",
    tag: "<TOOL_USED>"
  },
  enableScheduleTask: {
    label: "定时任务创建",
    description: "允许 AI 创建定时任务（<SCHEDULE_TASK> 标签）",
    tag: "<SCHEDULE_TASK>"
  },
  enableDeviceControl: {
    label: "设备控制指令",
    description: "允许 AI 输出设备控制 JSON 指令（继电器、云台等）",
    tag: "JSON Control"
  },
  enableVisionInspection: {
    label: "AI 视觉巡检",
    description: "允许 AI 使用摄像头进行视觉巡检和画面分析",
    tag: "move_camera_and_look"
  },
  enableHTMLPreview: {
    label: "HTML 预览",
    description: "显示 HTML 代码的实时预览",
    tag: "HTML Preview"
  },
  enableWebPreview: {
    label: "网页预览",
    description: "显示网页内容预览（<WEB_PREVIEW> 标签）",
    tag: "<WEB_PREVIEW>"
  },
}

export function AIFeaturesSettings() {
  const [config, setConfig] = useState<AIFeatureConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/ai-features")
      if (res.ok) {
        const data = await res.json()
        setConfig({ ...DEFAULT_CONFIG, ...data })
      }
    } catch (error) {
      console.error("Failed to fetch AI features config:", error)
      toast.error("加载配置失败")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/ai-features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      if (res.ok) {
        toast.success("AI 功能配置已保存", {
          description: "新配置将在下次 AI 回复时生效",
        })
      } else {
        throw new Error("Failed to save")
      }
    } catch (error) {
      console.error("Failed to save AI features config:", error)
      toast.error("保存配置失败")
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG)
    toast.info("已重置为默认配置", {
      description: "请点击保存按钮以应用更改",
    })
  }

  const handleToggle = (key: keyof AIFeatureConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const enabledCount = Object.values(config).filter(Boolean).length
  const totalCount = Object.keys(config).length

  if (loading) {
    return (
      <Card style={{ border: "1px solid #EDEEEF" }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '48px' }}>
          <LoadingOutlined style={{ fontSize: '24px', color: '#8F959E' }} />
        </div>
      </Card>
    )
  }

  return (
    <Card
      style={{ border: "1px solid #EDEEEF" }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FireOutlined style={{ color: '#1677ff' }} />
          AI 功能开关
        </div>
      }
      extra={
        <Tag style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          {enabledCount}/{totalCount} 已启用
        </Tag>
      }
      styles={{ body: { paddingTop: '16px' } }}
    >
      {/* UI 组件类 */}
      <div style={{ marginBottom: '24px' }}>
        <Typography.Text strong style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#1677ff', display: 'inline-block' }} />
          UI 组件类
        </Typography.Text>
        <div style={{ paddingLeft: '8px', borderLeft: '2px solid #EDEEEF' }}>
          {(['enableTaskList', 'enableDeviceBento', 'enableControlBento', 'enableMonitor', 'enableScheduledTasks', 'enableChart', 'enableSpectral'] as const).map((key) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', padding: '8px 0' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Typography.Text style={{ fontSize: '14px', fontWeight: 500 }}>{FEATURE_DESCRIPTIONS[key].label}</Typography.Text>
                  <code style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F2F3F5', fontFamily: 'monospace' }}>
                    {FEATURE_DESCRIPTIONS[key].tag}
                  </code>
                </div>
                <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                  {FEATURE_DESCRIPTIONS[key].description}
                </Typography.Text>
              </div>
              <Switch checked={config[key]} onChange={() => handleToggle(key)} />
            </div>
          ))}
        </div>
      </div>

      {/* 功能增强类 */}
      <div style={{ marginBottom: '24px' }}>
        <Typography.Text strong style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#1677ff', display: 'inline-block' }} />
          功能增强类
        </Typography.Text>
        <div style={{ paddingLeft: '8px', borderLeft: '2px solid #EDEEEF' }}>
          {(['enableReasoning', 'enableSources', 'enableToolUsed'] as const).map((key) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', padding: '8px 0' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Typography.Text style={{ fontSize: '14px', fontWeight: 500 }}>{FEATURE_DESCRIPTIONS[key].label}</Typography.Text>
                  <code style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F2F3F5', fontFamily: 'monospace' }}>
                    {FEATURE_DESCRIPTIONS[key].tag}
                  </code>
                </div>
                <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                  {FEATURE_DESCRIPTIONS[key].description}
                </Typography.Text>
              </div>
              <Switch checked={config[key]} onChange={() => handleToggle(key)} />
            </div>
          ))}
        </div>
      </div>

      {/* 操作执行类 */}
      <div style={{ marginBottom: '24px' }}>
        <Typography.Text strong style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#FA8C16', display: 'inline-block' }} />
          操作执行类
        </Typography.Text>
        <div style={{ paddingLeft: '8px', borderLeft: '2px solid #EDEEEF' }}>
          {(['enableScheduleTask', 'enableDeviceControl', 'enableVisionInspection'] as const).map((key) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', padding: '8px 0' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Typography.Text style={{ fontSize: '14px', fontWeight: 500 }}>{FEATURE_DESCRIPTIONS[key].label}</Typography.Text>
                  <code style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F2F3F5', fontFamily: 'monospace' }}>
                    {FEATURE_DESCRIPTIONS[key].tag}
                  </code>
                </div>
                <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                  {FEATURE_DESCRIPTIONS[key].description}
                </Typography.Text>
              </div>
              <Switch checked={config[key]} onChange={() => handleToggle(key)} />
            </div>
          ))}
        </div>
      </div>

      {/* 预览类 */}
      <div style={{ marginBottom: '24px' }}>
        <Typography.Text strong style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#1677ff', display: 'inline-block' }} />
          预览类
        </Typography.Text>
        <div style={{ paddingLeft: '8px', borderLeft: '2px solid #EDEEEF' }}>
          {(['enableHTMLPreview', 'enableWebPreview'] as const).map((key) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', padding: '8px 0' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Typography.Text style={{ fontSize: '14px', fontWeight: 500 }}>{FEATURE_DESCRIPTIONS[key].label}</Typography.Text>
                  <code style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F2F3F5', fontFamily: 'monospace' }}>
                    {FEATURE_DESCRIPTIONS[key].tag}
                  </code>
                </div>
                <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                  {FEATURE_DESCRIPTIONS[key].description}
                </Typography.Text>
              </div>
              <Switch checked={config[key]} onChange={() => handleToggle(key)} />
            </div>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #EDEEEF' }}>
        <Button
          type="primary"
          onClick={handleSave}
          loading={saving}
          icon={<SaveOutlined />}
          style={{ flex: 1 }}
        >
          保存配置
        </Button>
        <Button
          onClick={handleReset}
          disabled={saving}
          icon={<RotateLeftOutlined />}
        >
          重置
        </Button>
      </div>

      <div style={{ fontSize: '12px', color: '#8F959E', backgroundColor: '#F7F8FA', padding: '12px', borderRadius: '6px', marginTop: '16px', border: '1px solid #EDEEEF' }}>
        <strong>提示：</strong>关闭某个功能后，AI 将不会输出对应的标签，前端也不会渲染相关组件。
        这可以用于调试或临时禁用某些功能。
      </div>
    </Card>
  )
}
