"use client"

/**
 * 语音助手配置
 *
 * 🚨 两端共用同一份数据逻辑（2026-10-01）：
 *   - variant="page"（默认）：管理后台 `/admin` 的原有版式，视觉零变更；
 *   - variant="embedded"：内嵌到 AI 设置弹窗，改用设置版式原子
 *     （GroupTitle + Card + Row + GreenSwitch），颜色走 `--set-*` 令牌；
 *     当前架构（纯 Omni）下 VAD 参数本就不生效，内嵌版收敛成一句说明，
 *     精细参数仍留在管理后台「语音测试」页，避免用户在设置里调一个不起作用的开关。
 */

import { useState, useEffect, useCallback } from "react"
import { Card as AntdCard, Typography, Space, Button, Input, InputNumber, Select, Switch, Slider, Tag, Divider, Alert, Tooltip, Popconfirm } from "antd"

import { toast } from "@/lib/ui/feedback"
import { IconApi, IconAttention, IconCheckOne, IconDelete, IconRefresh, IconSave, IconVolumeNotice } from "@/components/icon"
// 设置版式原子：仅 embedded 使用，所需 CSS 变量由设置弹窗根节点提供
import { Card, GreenSwitch, GroupTitle, Row } from "@/components/settings/settings-modal-ui"

const { Text, Title, Paragraph } = Typography

// ---- 类型定义（与后端 settings-service.ts 对齐） ----
type VoiceArchitecture = "cascade" | "omni"

interface TtsVoiceOption {
  value: string
  label: string
}

interface TtsApiConfig {
  endpoint: string
  model: string
  defaultVoice: string
  voices: TtsVoiceOption[]
  audioFormat: "mp3" | "wav" | "pcm"
  sampleRate: number
}

interface AsrApiConfig {
  endpoint: string
  model: string
  defaultLanguage: string
  defaultDialect: string
}

interface VadConfig {
  silenceThreshold: number
  silenceDurationMs: number
  speechStartMs: number
  maxSegmentMs: number
  minSpeechMs: number
  adaptiveNoiseFloor: boolean
}

interface VoiceServerConfig {
  architecture: VoiceArchitecture
  providerId: string | null
  tts: TtsApiConfig
  asr: AsrApiConfig
  vad: VadConfig
  readAloud: boolean
  apiKeyConfigured?: boolean
  providerName?: string | null
}

/** AI 提供商选项（从 /api/admin/ai-providers 获取） */
interface AIProviderOption {
  id: string
  name: string
  type: string
  enabled: boolean
  apiKeyMasked: string
}

export function VoiceSettings({
  variant = "page",
  onDirtyChange,
}: {
  variant?: "page" | "embedded"
  /** 内嵌时上报「有未保存修改」，供设置弹窗关闭前确认 */
  onDirtyChange?: (dirty: boolean) => void
} = {}) {
  const [config, setConfig] = useState<VoiceServerConfig | null>(null)
  /** 最近一次落库的快照，用于判断是否有未保存修改 */
  const [savedConfig, setSavedConfig] = useState<VoiceServerConfig | null>(null)
  const [providers, setProviders] = useState<AIProviderOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const embedded = variant === "embedded"

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true)
      const [cfgRes, provRes] = await Promise.all([
        fetch("/api/admin/settings/voice"),
        fetch("/api/admin/ai-providers"),
      ])
      if (cfgRes.ok) {
        const data = await cfgRes.json()
        setConfig(data)
        setSavedConfig(data)
      } else {
        toast.error("加载语音配置失败")
      }
      if (provRes.ok) {
        const provData = await provRes.json()
        // 只显示已启用的提供商
        const enabled = (provData.providers || []).filter((p: AIProviderOption) => p.enabled)
        setProviders(enabled)
      }
    } catch {
      toast.error("加载配置失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  useEffect(() => {
    if (!config || !savedConfig) {
      onDirtyChange?.(false)
      return
    }
    onDirtyChange?.(JSON.stringify(config) !== JSON.stringify(savedConfig))
  }, [config, savedConfig, onDirtyChange])

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!config) return
    try {
      setSaving(true)
      const payload = { ...config, apiKeyConfigured: undefined, providerName: undefined }
      const res = await fetch("/api/admin/settings/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "保存失败")
      }
      setSavedConfig(config)
      toast.success("语音配置已保存")
      fetchConfig()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    try {
      setSaving(true)
      const res = await fetch("/api/admin/settings/voice", { method: "DELETE" })
      if (!res.ok) throw new Error("重置失败")
      toast.success("已恢复默认配置")
      fetchConfig()
    } catch {
      toast.error("重置失败")
    } finally {
      setSaving(false)
    }
  }

  const updateVad = (patch: Partial<VadConfig>) => {
    if (!config) return
    setConfig({ ...config, vad: { ...config.vad, ...patch } })
  }

  /* ------------------------------------------------------------------ */
  /* 内嵌设置弹窗：设置版式                                               */
  /* ------------------------------------------------------------------ */

  if (embedded) {
    if (loading) {
      return (
        <>
          <GroupTitle>语音助手</GroupTitle>
          <Card>
            <div style={{ padding: "28px 20px", textAlign: "center", color: "var(--set-text-secondary)", fontSize: 13 }}>
              正在读取语音配置…
            </div>
          </Card>
        </>
      )
    }

    if (!config) {
      return (
        <Alert type="error" showIcon title="语音配置加载失败" description="请稍后重试，或到管理后台检查语音服务状态。" />
      )
    }

    return (
      <>
        <GroupTitle>语音助手</GroupTitle>
        <Card>
          <Row
            title="语音架构"
            desc="纯 Omni 一体化：直接使用实时全模态模型（Qwen-Omni-Realtime 系列），识别、理解、合成一体，低延迟并支持语音打断。"
          >
            <Tag style={{ margin: 0, borderRadius: 999, fontSize: 11.5 }}>Omni 一体化</Tag>
          </Row>
          <Row
            title="默认朗读 AI 回复"
            desc="关闭后，语音对话仅显示文字，不播放 TTS 音频。"
            last
          >
            <GreenSwitch
              checked={config.readAloud}
              onChange={(v) => setConfig({ ...config, readAloud: v })}
            />
          </Row>
        </Card>

        <div style={{ height: 20 }} />
        <GroupTitle>语音服务</GroupTitle>
        <Card>
          <Row
            title="服务提供商"
            desc="语音模块与 AI 助手共用同一套提供商配置，选定后 TTS / ASR 自动复用其 API Key。"
          >
            <Select
              value={config.providerId ?? undefined}
              onChange={(v) => setConfig({ ...config, providerId: v ?? null })}
              style={{ minWidth: 260 }}
              placeholder="选择已配置的提供商"
              allowClear
              options={providers.map((p) => ({
                value: p.id,
                label: `${p.name}（${p.type}）`,
              }))}
            />
          </Row>
          <Row title="接口密钥" desc="密钥取自上面所选提供商，无需在语音模块单独填写。" last>
            {config.apiKeyConfigured ? (
              <Tag icon={<IconCheckOne />} color="success" style={{ margin: 0, borderRadius: 999, fontSize: 11.5 }}>
                已就绪{config.providerName ? `（${config.providerName}）` : ""}
              </Tag>
            ) : (
              <Tag icon={<IconAttention />} color="warning" style={{ margin: 0, borderRadius: 999, fontSize: 11.5 }}>
                未配置
              </Tag>
            )}
          </Row>
        </Card>

        <div style={{ height: 20 }} />
        <GroupTitle>语音活动检测</GroupTitle>
        <Card>
          <Row
            title="由服务端自动断句"
            desc="当前架构下由服务端 VAD 处理，本机无需调参；如需精细调节静音阈值、断句时长等，可在管理后台的语音测试页设置。"
            last
          >
            <Tag style={{ margin: 0, borderRadius: 999, fontSize: 11.5 }}>服务端处理</Tag>
          </Row>
        </Card>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <Popconfirm title="确定恢复默认配置？" onConfirm={handleReset} okText="确定" cancelText="取消">
            <Button disabled={saving} icon={<IconDelete />}>
              恢复默认
            </Button>
          </Popconfirm>
          <Button type="primary" onClick={() => handleSave()} loading={saving} icon={<IconSave />}>
            保存配置
          </Button>
        </div>
      </>
    )
  }

  /* ------------------------------------------------------------------ */
  /* 管理后台整页：保持既有版式                                            */
  /* ------------------------------------------------------------------ */

  if (loading) return <div>加载语音配置中...</div>
  if (!config) return <Alert title="配置加载失败" type="error" />

  return (
    <AntdCard
      style={{ border: "1px solid #EDEEEF" }}
      title={
        <Space>
          <IconVolumeNotice style={{ color: "#059669" }} />
          <span>语音助手配置</span>
          <Tag color="purple">Omni 一体化</Tag>
        </Space>
      }
      extra={
        <Space>
          <Button size="small" type="link" onClick={() => { window.location.href = "/admin" }}>
            TTS/ASR 参数
          </Button>
          <Popconfirm title="确定恢复默认配置？" onConfirm={handleReset} okText="确定" cancelText="取消">
            <Button type="text" icon={<IconDelete />} size="small">重置</Button>
          </Popconfirm>
          <Button type="text" icon={<IconRefresh />} onClick={fetchConfig} size="small" />
        </Space>
      }
    >
      <form onSubmit={handleSave}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* ===== 1. 架构模式（纯 Omni） ===== */}
          <section>
            <Title level={5} style={{ marginTop: 0 }}>1. 语音架构模式</Title>
            <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
              纯 Omni 一体化架构：直接使用阿里云实时全模态模型（Qwen-Omni-Realtime 系列），ASR+LLM+TTS 一体化，低延迟、支持语音打断。
            </Paragraph>
            <Tag color="purple">目前仅支持 Omni 一体化架构</Tag>

            <Divider style={{ margin: "12px 0" }} />

            <Space>
              <Text>默认朗读 AI 回复：</Text>
              <Switch
                checked={config.readAloud}
                onChange={(v) => setConfig({ ...config, readAloud: v })}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                关闭后，语音对话仅显示文字，不播放 TTS 音频
              </Text>
            </Space>
          </section>

          <Divider />

          {/* ===== 2. AI 提供商（统一管理） ===== */}
          <section>
            <Title level={5}>
              <Space>
                <IconApi />
                2. AI 提供商（与 AI 助理共用）
              </Space>
            </Title>
            <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
              语音模块的 API Key 与 AI 助理页面使用同一套提供商配置，实现全局 AI 功能统一管理。
              选择一个已配置的 AI 提供商，TTS/ASR 将自动使用其 API Key。
            </Paragraph>

            <div style={{ maxWidth: 480 }}>
              <Text>语音服务提供商</Text>
              <Select
                value={config.providerId ?? undefined}
                onChange={(v) => setConfig({ ...config, providerId: v ?? null })}
                style={{ width: "100%", marginTop: 4 }}
                placeholder="选择已配置的 AI 提供商"
                allowClear
                options={providers.map((p) => ({
                  value: p.id,
                  label: `${p.name}（${p.type}）· Key: ${p.apiKeyMasked}`,
                }))}
              />
              <div style={{ marginTop: 8 }}>
                {config.apiKeyConfigured ? (
                  <Tag icon={<IconCheckOne />} color="success">
                    API Key 已就绪{config.providerName ? `（来源：${config.providerName}）` : ""}
                  </Tag>
                ) : (
                  <Tag icon={<IconAttention />} color="warning">
                    API Key 未配置，请在 AI 提供商中设置
                  </Tag>
                )}
              </div>
            </div>

            <Alert
              type="info"
              showIcon
              style={{ marginTop: 12 }}
              title={
                <span>
                  TTS/ASR 的专用端点、模型、音色等参数请在
                  <Button type="link" size="small" style={{ padding: "0 4px" }} onClick={() => { window.location.href = "/admin" }}>
                    语音测试
                  </Button>
                  页面中配置。
                </span>
              }
            />
          </section>

          <Divider />

          {/* ===== 3. VAD 参数（Omni 架构由服务端 VAD 处理，此处不生效） ===== */}
          <section style={{ opacity: 0.5, pointerEvents: "none" }}>
            <Title level={5}>3. VAD 语音活动检测参数</Title>
            <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
              纯 Omni 架构下由服务端 VAD 自动断句，本地 VAD 参数不生效。
            </Paragraph>

            <VadSliderRow
              label="静音阈值（RMS 能量）"
              value={config.vad.silenceThreshold}
              min={0.005}
              max={0.2}
              step={0.005}
              formatter={(v) => v!.toFixed(3)}
              onChange={(v) => updateVad({ silenceThreshold: v })}
              hint="低于此能量值视为安静，范围 0.005 ~ 0.2"
            />
            <VadSliderRow
              label="静音断句时长（ms）"
              value={config.vad.silenceDurationMs}
              min={300}
              max={3000}
              step={100}
              formatter={(v) => `${v} ms`}
              onChange={(v) => updateVad({ silenceDurationMs: v })}
              hint="持续静音多久认为一句话结束。对话场景推荐 400-600ms"
            />
            <VadSliderRow
              label="说话开始判定（ms）"
              value={config.vad.speechStartMs}
              min={100}
              max={2000}
              step={50}
              formatter={(v) => `${v} ms`}
              onChange={(v) => updateVad({ speechStartMs: v })}
              hint="持续有声多久才认为真正开始说话（防噪声误触发）"
            />
            <VadSliderRow
              label="最短有效语音（ms）"
              value={config.vad.minSpeechMs}
              min={100}
              max={1500}
              step={50}
              formatter={(v) => `${v} ms`}
              onChange={(v) => updateVad({ minSpeechMs: v })}
              hint="短于此时长的语音视为噪声丢弃"
            />
            <VadSliderRow
              label="最长单段时长（ms）"
              value={config.vad.maxSegmentMs}
              min={5000}
              max={60000}
              step={1000}
              formatter={(v) => `${(v as number) / 1000} s`}
              onChange={(v) => updateVad({ maxSegmentMs: v })}
              hint="超过此时长强制断句"
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, padding: "8px 0", borderTop: "1px solid #f4f4f5" }}>
              <div>
                <Text>自适应噪声底</Text>
                <Paragraph type="secondary" style={{ fontSize: 11, margin: 0 }}>
                  自动适应环境噪声，推荐开启
                </Paragraph>
              </div>
              <Switch
                checked={config.vad.adaptiveNoiseFloor}
                onChange={(v) => updateVad({ adaptiveNoiseFloor: v })}
              />
            </div>
          </section>

          {/* ===== 保存按钮 ===== */}
          <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 12, borderTop: "1px solid #F4F4F5" }}>
            <Space>
              <Button onClick={fetchConfig}>取消</Button>
              <Button type="primary" htmlType="submit" loading={saving} icon={<IconSave />}>
                保存配置
              </Button>
            </Space>
          </div>
        </div>
      </form>
    </AntdCard>
  )
}

/** VAD 滑块行 */
function VadSliderRow({
  label,
  value,
  min,
  max,
  step,
  formatter,
  onChange,
  hint,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  formatter: (v: number | undefined) => string
  onChange: (v: number) => void
  hint: string
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <Text>{label}</Text>
        <Text style={{ color: "#059669" }}>{formatter(value)}</Text>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        tooltip={false}
      />
      <Text type="secondary" style={{ fontSize: 11 }}>{hint}</Text>
    </div>
  )
}
