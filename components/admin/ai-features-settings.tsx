"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, Sparkles, Save, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"

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
    description: "显示 ECharts/Vega-Lite 可视化图表（<CHART> 标签）",
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
      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg shadow-none">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg shadow-none">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Sparkles className="size-4 text-purple-500" />
              AI 功能开关
            </CardTitle>
            <CardDescription className="text-sm">
              控制 AI 助手的所有标签输出功能
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {enabledCount}/{totalCount} 已启用
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* UI 组件类 */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
            <div className="size-1.5 rounded-full bg-blue-500" />
            UI 组件类
          </h3>
          <div className="space-y-3 pl-3 border-l-2 border-zinc-100 dark:border-zinc-800">
            {(['enableTaskList', 'enableDeviceBento', 'enableControlBento', 'enableMonitor', 'enableScheduledTasks', 'enableChart', 'enableSpectral'] as const).map((key) => (
              <div key={key} className="flex items-start justify-between gap-4 py-2">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={key} className="text-sm font-medium cursor-pointer">
                      {FEATURE_DESCRIPTIONS[key].label}
                    </Label>
                    <code className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                      {FEATURE_DESCRIPTIONS[key].tag}
                    </code>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {FEATURE_DESCRIPTIONS[key].description}
                  </p>
                </div>
                <Switch
                  id={key}
                  checked={config[key]}
                  onCheckedChange={() => handleToggle(key)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 功能增强类 */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
            <div className="size-1.5 rounded-full bg-primary" />
            功能增强类
          </h3>
          <div className="space-y-3 pl-3 border-l-2 border-zinc-100 dark:border-zinc-800">
            {(['enableReasoning', 'enableSources', 'enableToolUsed'] as const).map((key) => (
              <div key={key} className="flex items-start justify-between gap-4 py-2">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={key} className="text-sm font-medium cursor-pointer">
                      {FEATURE_DESCRIPTIONS[key].label}
                    </Label>
                    <code className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                      {FEATURE_DESCRIPTIONS[key].tag}
                    </code>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {FEATURE_DESCRIPTIONS[key].description}
                  </p>
                </div>
                <Switch
                  id={key}
                  checked={config[key]}
                  onCheckedChange={() => handleToggle(key)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 操作执行类 */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
            <div className="size-1.5 rounded-full bg-amber-500" />
            操作执行类
          </h3>
          <div className="space-y-3 pl-3 border-l-2 border-zinc-100 dark:border-zinc-800">
            {(['enableScheduleTask', 'enableDeviceControl', 'enableVisionInspection'] as const).map((key) => (
              <div key={key} className="flex items-start justify-between gap-4 py-2">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={key} className="text-sm font-medium cursor-pointer">
                      {FEATURE_DESCRIPTIONS[key].label}
                    </Label>
                    <code className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                      {FEATURE_DESCRIPTIONS[key].tag}
                    </code>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {FEATURE_DESCRIPTIONS[key].description}
                  </p>
                </div>
                <Switch
                  id={key}
                  checked={config[key]}
                  onCheckedChange={() => handleToggle(key)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 预览类 */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
            <div className="size-1.5 rounded-full bg-purple-500" />
            预览类
          </h3>
          <div className="space-y-3 pl-3 border-l-2 border-zinc-100 dark:border-zinc-800">
            {(['enableHTMLPreview', 'enableWebPreview'] as const).map((key) => (
              <div key={key} className="flex items-start justify-between gap-4 py-2">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={key} className="text-sm font-medium cursor-pointer">
                      {FEATURE_DESCRIPTIONS[key].label}
                    </Label>
                    <code className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                      {FEATURE_DESCRIPTIONS[key].tag}
                    </code>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {FEATURE_DESCRIPTIONS[key].description}
                  </p>
                </div>
                <Switch
                  id={key}
                  checked={config[key]}
                  onCheckedChange={() => handleToggle(key)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                保存配置
              </>
            )}
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            disabled={saving}
            className="border-zinc-300 dark:border-zinc-700"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            重置
          </Button>
        </div>

        <div className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg">
          <strong>提示：</strong>关闭某个功能后，AI 将不会输出对应的标签，前端也不会渲染相关组件。
          这可以用于调试或临时禁用某些功能。
        </div>
      </CardContent>
    </Card>
  )
}
