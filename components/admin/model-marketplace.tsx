"use client"

import { useState, useEffect, useMemo } from "react"
import { Input, Card, Tag, Button, Select, Typography, Spin } from "antd"
import { toast } from "sonner"
import {
  SearchOutlined,
  FilterOutlined,
  FireOutlined,
  GlobalOutlined,
  ThunderboltOutlined,
  CloudServerOutlined,
  CheckCircleOutlined,
  StarOutlined,
  EyeOutlined,
  RobotOutlined,
} from "@ant-design/icons"
import type { AIProvider, ProviderModel } from "./ai-providers-manager"

const { Text } = Typography

// ====== 图标映射 ======

const MODEL_ICON_MAP: Record<string, React.ReactNode> = {
  qwen: <FireOutlined />,
  deepseek: <ThunderboltOutlined />,
  openai: <CloudServerOutlined />,
  xiaomi: <ThunderboltOutlined />,
  sparkles: <FireOutlined />,
}

function getModelIcon(icon?: string) {
  return MODEL_ICON_MAP[icon || ""] || <CheckCircleOutlined />
}

// ====== 模型卡片 ======

function ModelCard({
  model,
  providerName,
  providerType,
  providerEnabled,
  isDefaultProvider,
}: {
  model: ProviderModel
  providerName: string
  providerType: string
  providerEnabled: boolean
  isDefaultProvider: boolean
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <Card
      style={{
        border: `1px solid ${hovered ? '#1677ff' : '#EDEEEF'}`,
        opacity: !providerEnabled || !model.enabled ? 0.5 : 1,
        cursor: !providerEnabled ? "not-allowed" : "pointer",
        overflow: "hidden",
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 顶部：图标 + 名称 + 状态 */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#F2F3F5",
            color: model.enabled ? "#1677ff" : "#8F959E",
          }}>
            {getModelIcon(model.icon)}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Text strong style={{
                fontSize: 14,
                color: model.enabled ? "#1F2329" : "#8F959E",
              }}>
                {model.name}
              </Text>
              {model.enabled ? (
                <CheckCircleOutlined style={{ color: "#52C41A", fontSize: 14 }} />
              ) : (
                <div style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  border: "1px solid #EDEEEF",
                }} />
              )}
            </div>
            <Text style={{ fontFamily: "monospace", fontSize: 12, color: "#8F959E", marginTop: 2 }}>{model.id}</Text>
          </div>
        </div>

        {isDefaultProvider && (
          <Tag color="gold" style={{ fontSize: 10 }}>
            <StarOutlined /> 默认源
          </Tag>
        )}
      </div>

      {/* 描述 */}
      {model.description && (
        <Text style={{ fontSize: 12, color: "#8F959E", display: "block", marginBottom: 12, lineHeight: 1.6 }} ellipsis={{ rows: 2 }}>
          {model.description}
        </Text>
      )}

      {/* 标签行 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {model.supportsVision && (
          <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
            <EyeOutlined /> 视觉
          </Tag>
        )}
        {model.supportsReasoning && (
          <Tag color="purple" style={{ fontSize: 10, margin: 0 }}>
            <RobotOutlined /> 推理
          </Tag>
        )}
        <Tag style={{ fontSize: 10, margin: 0 }}>{providerName}</Tag>
      </div>
    </Card>
  )
}

// ====== 主组件 ======

export function ModelMarketplace() {
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterCapability, setFilterCapability] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("enabled")
  const [sortBy, setSortBy] = useState<string>("provider")

  useEffect(() => {
    fetch("/api/admin/ai-providers")
      .then(r => r.json())
      .then(d => setProviders(d.providers || []))
      .catch(() => toast.error("加载失败"))
      .finally(() => setLoading(false))
  }, [])

  // 展平模型 + 搜索过滤 + 排序
  const flatModels = useMemo(() => {
    let items: (ProviderModel & { providerId: string; providerName: string; providerType: string; providerEnabled: boolean; isDefaultProvider: boolean })[] = []

    providers.forEach(p => {
      p.models.forEach(m => {
        items.push({
          ...m,
          providerId: p.id,
          providerName: p.name,
          providerType: p.type,
          providerEnabled: p.enabled,
          isDefaultProvider: !!p.isDefault,
        })
      })
    })

    // 搜索
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.providerName.toLowerCase().includes(q) ||
        (m.description || "").toLowerCase().includes(q)
      )
    }

    // 类型过滤
    if (filterType !== "all") {
      items = items.filter(m => m.providerType === filterType)
    }

    // 能力过滤
    if (filterCapability === "vision") {
      items = items.filter(m => m.supportsVision)
    } else if (filterCapability === "reasoning") {
      items = items.filter(m => m.supportsReasoning)
    } else if (filterCapability === "both") {
      items = items.filter(m => m.supportsVision && m.supportsReasoning)
    }

    // 状态过滤
    if (filterStatus === "enabled") {
      items = items.filter(m => m.enabled)
    } else if (filterStatus === "disabled") {
      items = items.filter(m => !m.enabled)
    }

    // 排序
    switch (sortBy) {
      case "name":
        items.sort((a, b) => a.name.localeCompare(b.name))
        break
      case "provider":
        items.sort((a, b) => a.providerName.localeCompare(b.providerName) || a.name.localeCompare(b.name))
        break
      case "type":
        items.sort((a, b) => a.providerType.localeCompare(b.providerType) || a.name.localeCompare(b.name))
        break
    }

    return items
  }, [providers, search, filterType, filterCapability, filterStatus, sortBy])

  // 统计
  const stats = useMemo(() => ({
    total: providers.reduce((s, p) => s + p.models.length, 0),
    enabled: providers.reduce((s, p) => s + p.models.filter(m => m.enabled).length, 0),
    vision: providers.reduce((s, p) => s + p.models.filter(m => m.enabled && m.supportsVision).length, 0),
    reasoning: providers.reduce((s, p) => s + p.models.filter(m => m.enabled && m.supportsReasoning).length, 0),
    providers: providers.length,
  }), [providers])

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 头部统计 */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1F2329", letterSpacing: "-0.025em", margin: 0 }}>AI 模型市场</h2>
        <p style={{ fontSize: 14, color: "#8F959E", marginTop: 4 }}>
          浏览所有已配置提供商的可用模型，共 {stats.total} 个模型（{stats.enabled} 个启用中）
        </p>
      </div>

      {/* 统计卡片 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {[
          { label: "总模型", value: stats.total, icon: <RobotOutlined />, color: "#8F959E" },
          { label: "已启用", value: stats.enabled, icon: <CheckCircleOutlined />, color: "#8F959E" },
          { label: "视觉模型", value: stats.vision, icon: <EyeOutlined />, color: "#8F959E" },
          { label: "推理模型", value: stats.reasoning, icon: <RobotOutlined />, color: "#8F959E" },
          { label: "提供商", value: stats.providers, icon: <GlobalOutlined />, color: "#8F959E" },
        ].map(s => (
          <Card key={s.label} style={{ padding: "12px 16px", border: "1px solid #EDEEEF" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ color: s.color }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#1F2329" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#8F959E" }}>{s.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 搜索和筛选栏 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Input
            placeholder="搜索模型名称、ID、描述..."
            prefix={<SearchOutlined style={{ color: "#8F959E" }} />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200 }}
          />
          <Select
            value={filterType}
            onChange={setFilterType}
            style={{ width: 140 }}
            options={[
              { label: "全部类型", value: "all" },
              { label: "OpenAI 兼容", value: "openai" },
              { label: "百炼 DashScope", value: "dashscope" },
              { label: "自定义", value: "custom" },
            ]}
          />
          <Select
            value={filterCapability}
            onChange={setFilterCapability}
            style={{ width: 130 }}
            options={[
              { label: "全部能力", value: "all" },
              { label: "视觉", value: "vision" },
              { label: "推理", value: "reasoning" },
              { label: "视觉+推理", value: "both" },
            ]}
          />
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 110 }}
            options={[
              { label: "已启用", value: "enabled" },
              { label: "已禁用", value: "disabled" },
              { label: "全部", value: "all" },
            ]}
          />
          <Select
            value={sortBy}
            onChange={setSortBy}
            style={{ width: 120 }}
            options={[
              { label: "按提供商", value: "provider" },
              { label: "按名称", value: "name" },
              { label: "按类型", value: "type" },
            ]}
          />
        </div>
      </div>

      {/* 结果计数 */}
      <div style={{ fontSize: 12, color: "#8F959E", fontWeight: 500 }}>
        显示 {flatModels.length} / {stats.total} 个模型
      </div>

      {/* 模型网格 */}
      {flatModels.length === 0 ? (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 64,
          textAlign: "center",
        }}>
          <FilterOutlined style={{ fontSize: 40, color: "#EDEEEF", marginBottom: 16 }} />
          <p style={{ fontSize: 14, color: "#8F959E" }}>没有匹配的模型</p>
          <Button
            type="text"
            size="small"
            onClick={() => {
              setSearch("")
              setFilterType("all")
              setFilterCapability("all")
              setFilterStatus("enabled")
            }}
          >
            清除所有筛选
          </Button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {flatModels.map((m) => (
            <ModelCard
              key={`${m.providerId}-${m.id}`}
              model={m}
              providerName={m.providerName}
              providerType={m.providerType}
              providerEnabled={m.providerEnabled}
              isDefaultProvider={m.isDefaultProvider}
            />
          ))}
        </div>
      )}

      {/* 按提供商分组视图提示 */}
      {flatModels.length > 0 && (
        <div style={{ paddingTop: 24, borderTop: "1px solid #EDEEEF" }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#8F959E", marginBottom: 12 }}>
            按提供商分布
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {providers.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12 }}>
                <span style={{ fontWeight: 500, color: "#646A73", minWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.name}
                </span>
                <div style={{ flex: 1, height: 8, backgroundColor: "#F2F3F5", borderRadius: 4, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 4,
                      transition: "all 0.5s",
                      backgroundColor: "#1677ff",
                      width: `${(p.models.length / Math.max(1, stats.total)) * 100}%`,
                    }}
                  />
                </div>
                <span style={{ color: "#8F959E", tabularNums: true, width: 48, textAlign: "right" }}>
                  {p.models.length}/{p.models.filter(m => m.enabled).length}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
