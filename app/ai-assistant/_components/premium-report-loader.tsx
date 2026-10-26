"use client"

/**
 * 🍓 报告生成进度卡片 — Ant Design + XCard + A2UI 协议
 *
 * 1. 视觉层：Ant Design Card / Progress / Tag / Flex / Space / Button / Typography
 * 2. 渲染层：XCard.Box（统一入口，通过 BerryXCard 包装）
 * 3. 协议层：A2UI v0.9 commands + berry-realm-catalog-v1
 *
 * 颜色统一 BERRY_THEME.primary (#059669)，与 AI 助手主对话流一致
 */

import { useMemo } from "react"
import { Card, Progress, Tag, Flex, Space, Typography, Button, Row, Col, Avatar } from "antd"
import { BerryXCard } from "@/components/ui/berry-xcard"
import { buildCommands } from "@/lib/a2ui/berry-protocol"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import type { A2UICommand_v0_9, ActionPayload } from "@ant-design/x-card"
import { IconBrain, IconCheckOne, IconClose, IconCpu, IconFileText, IconLoading, IconSeedling } from "@/components/icon";

const { Text, Title } = Typography

// ===== 4 步进度定义 =====
const STEPS = [
  { label: "数据捕获", desc: "验证并拉取温室 IoT 终端环境数据", icon: IconSeedling, key: "capture" },
  { label: "指标分析", desc: "提取空气与土壤传感器核心指标", icon: IconCpu, key: "metric" },
  { label: "大模诊断", desc: "基于草莓专家知识库开展智能诊断", icon: IconBrain, key: "diagnosis" },
  { label: "视觉编排", desc: "渲染响应式大厂UI卡片与交互图表", icon: IconFileText, key: "render" },
] as const

export function PremiumReportLoader({
  reportTitle = "分析报告",
  htmlContent = "",
  isComplete = false,
  onCancel,
}: {
  reportTitle?: string
  htmlContent?: string
  isComplete?: boolean
  onCancel?: () => void
}) {
  const cleanHtml = htmlContent.trim()

  // 阶段判定（基于 token 扫描）
  let currentStep = 0
  let progress = 10
  let activeStatusText = "正在初始化环境监测报告容器..."

  if (isComplete) {
    currentStep = 4
    progress = 100
    activeStatusText = "✓ 编译成功，已生成精美可视化画布"
  } else if (cleanHtml.length === 0) {
    currentStep = 0
    progress = 15
    activeStatusText = "正在唤醒 AI 引擎并捕获物联网实时数据..."
  } else {
    const hasSuggestions = /(建议|措施|调控|策略|农事|决策|Control|Suggestion|Action)/i.test(cleanHtml)
    const hasAnalysis = /(分析|诊断|评估|数据研判|质量评估|Quality|Analysis|Diagnosis)/i.test(cleanHtml)
    const hasMetrics = /(温度|湿度|光照|土壤|CO2|二氧化碳|指标|卡片|传感器|Sensor|Metric|Value)/i.test(cleanHtml)

    if (hasSuggestions) {
      currentStep = 3
      progress = 85
      activeStatusText = "正在基于农业知识库生成智能调控与农事建议..."
    } else if (hasAnalysis) {
      currentStep = 2
      progress = 60
      activeStatusText = "正在开展温室数据多维智能研判与环境诊断..."
    } else if (hasMetrics) {
      currentStep = 1
      progress = 35
      activeStatusText = "正在编排今日核心物联网传感器指标卡片..."
    } else {
      currentStep = 0
      progress = 20
      activeStatusText = "正在构建报告头部与全局品牌样式系统..."
    }
  }

  // ===== A2UI 命令构建（v0.9） =====
  const surfaceId = `report-loader-${Date.now()}`
  const a2uiCommands: A2UICommand_v0_9[] = useMemo(() => {
    return buildCommands(
      surfaceId,
      [
        { id: 'report-header', component: 'CardHeader',
          title: `正在生成：${reportTitle}`,
          subtitle: activeStatusText,
          icon: 'FileText',
          status: isComplete ? 'success' : 'processing' },
        { id: 'progress', component: 'Metric',
          title: '生成进度', value: String(progress), unit: '%',
          color: BERRY_THEME.primary },
        { id: 'steps', component: 'TaskList', tasks: STEPS.map((s, idx) => ({
          title: s.label,
          desc: s.desc,
          status: idx < currentStep ? 'success' : idx === currentStep ? 'processing' : 'pending',
          icon: s.key,
        })) },
        { id: 'cancel-btn', component: 'ActionButton',
          label: '取消生成', action: 'cancel-report',
          type: 'default', icon: 'CloseOutlined' },
      ],
      ['report-header', 'progress', 'steps', 'cancel-btn']
    )
  }, [surfaceId, reportTitle, activeStatusText, isComplete, progress, currentStep])

  // ===== A2UI Action 处理 =====
  const handleAction = (payload: ActionPayload) => {
    if (payload.name === 'cancel-report') onCancel?.()
  }

  // ===== 兜底渲染（Ant Design 直渲） =====
  const fallbackUI = (
    <Card
      bordered
      style={{
        background: BERRY_THEME.gradients.cardHero(BERRY_THEME.primary),
        borderColor: `${BERRY_THEME.primary}25`,
        borderRadius: 16,
        boxShadow: BERRY_THEME.shadow.sm,
        marginBlock: 16,
        overflow: 'hidden',
      }}
      styles={{ body: { padding: 0 } }}
    >
      {/* ============ 顶部进度条 ============ */}
      <Progress
        percent={progress}
        showInfo={false}
        size="small"
        strokeColor={{ '0%': BERRY_THEME.primary, '100%': BERRY_THEME.primaryHover }}
        trailColor="rgba(0,0,0,0.04)"
        style={{ margin: 0 }}
      />

      <div style={{ padding: '20px 24px 18px' }}>
        {/* ============ Header 区 ============ */}
        <Flex align="flex-start" justify="space-between" gap={16} style={{ marginBlockEnd: 20 }}>
          <Flex align="center" gap={14} style={{ minWidth: 0, flex: 1 }}>
            <Avatar
              size={48}
              shape="square"
              icon={<IconFileText style={{ fontSize: 22 }} />}
              style={{
                background: `linear-gradient(135deg, ${BERRY_THEME.primary} 0%, ${BERRY_THEME.primaryHover} 100%)`,
                borderRadius: 10,
                flexShrink: 0,
              }}
            />
            <Flex vertical gap={4} style={{ minWidth: 0, flex: 1 }}>
              <Title
                level={5}
                style={{
                  margin: 0, fontSize: 15, fontWeight: 600, lineHeight: 1.4,
                  color: 'rgba(0,0,0,0.88)',
                }}
              >
                正在生成：{reportTitle}
              </Title>
              <Space size={6} align="center" style={{ minWidth: 0 }}>
                {!isComplete && (
                  <IconLoading
                    style={{ color: BERRY_THEME.primary, fontSize: 13 }}
                    className="animate-spin"
                  />
                )}
                <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.5 }}>
                  {activeStatusText}
                </Text>
              </Space>
            </Flex>
          </Flex>

          {/* 右侧大百分比指示器 */}
          <Flex
            vertical
            align="center"
            justify="center"
            gap={2}
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: `linear-gradient(135deg, ${BERRY_THEME.primary}15 0%, ${BERRY_THEME.primary}08 100%)`,
              border: `2px solid ${BERRY_THEME.primary}40`,
              flexShrink: 0,
            }}
          >
            <span style={{
              fontSize: 16, fontWeight: 700, lineHeight: 1,
              color: BERRY_THEME.primary,
            }}>
              {progress}
            </span>
            <span style={{ fontSize: 10, color: BERRY_THEME.primaryText, fontWeight: 500, lineHeight: 1 }}>
              %
            </span>
          </Flex>
        </Flex>

        {/* ============ 4 步进度网格 ============ */}
        <Row gutter={[10, 10]} style={{ marginBlockEnd: 16 }}>
          {STEPS.map((step, idx) => {
            const Icon = step.icon
            const isDone = currentStep > idx
            const isActive = currentStep === idx

            return (
              <Col xs={12} sm={6} key={step.key}>
                <div
                  style={{
                    position: 'relative',
                    height: '100%',
                    minHeight: 96,
                    padding: '12px 12px 10px',
                    borderRadius: 10,
                    background: isActive
                      ? `linear-gradient(135deg, ${BERRY_THEME.primary}18 0%, ${BERRY_THEME.primary}06 100%)`
                      : isDone
                        ? `${BERRY_THEME.primary}08`
                        : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${
                      isActive ? `${BERRY_THEME.primary}50` : isDone ? `${BERRY_THEME.primary}25` : 'rgba(0,0,0,0.06)'
                    }`,
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {/* "进行中" 徽章 — 右上角 */}
                  {isActive && (
                    <Tag
                      color="processing"
                      style={{
                        position: 'absolute',
                        top: 8, right: 8,
                        margin: 0,
                        fontSize: 10,
                        lineHeight: '16px',
                        padding: '0 6px',
                        borderRadius: 4,
                        fontWeight: 600,
                      }}
                    >
                      进行中
                    </Tag>
                  )}

                  {/* 图标 + 步骤号 */}
                  <Flex align="center" justify="space-between" gap={8}>
                    <div
                      style={{
                        width: 30, height: 30, borderRadius: 999,
                        background: isActive
                          ? BERRY_THEME.primary
                          : isDone
                            ? `${BERRY_THEME.primary}20`
                            : 'rgba(0,0,0,0.05)',
                        color: isActive ? '#fff' : isDone ? BERRY_THEME.primary : 'rgba(0,0,0,0.35)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: isActive ? `0 3px 8px ${BERRY_THEME.primary}50` : 'none',
                        transition: 'all 0.3s',
                      }}
                    >
                      {isDone
                        ? <IconCheckOne style={{ fontSize: 16 }} />
                        : <Icon style={{ fontSize: 15 }} />
                      }
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, lineHeight: 1,
                      color: isActive
                        ? BERRY_THEME.primary
                        : isDone
                          ? `${BERRY_THEME.primary}80`
                          : 'rgba(0,0,0,0.35)',
                    }}>
                      0{idx + 1}
                    </span>
                  </Flex>

                  {/* 标签 */}
                  <div style={{
                    fontSize: 13, fontWeight: 600, lineHeight: 1.3,
                    color: isActive
                      ? BERRY_THEME.primaryText
                      : isDone
                        ? 'rgba(0,0,0,0.75)'
                        : 'rgba(0,0,0,0.4)',
                    paddingRight: isActive ? 36 : 0,
                  }}>
                    {step.label}
                  </div>

                  {/* 描述 */}
                  <div style={{
                    fontSize: 11, lineHeight: 1.45,
                    color: isActive
                      ? 'rgba(0,0,0,0.6)'
                      : isDone
                        ? 'rgba(0,0,0,0.5)'
                        : 'rgba(0,0,0,0.35)',
                    marginTop: 'auto',
                  }}>
                    {step.desc}
                  </div>
                </div>
              </Col>
            )
          })}
        </Row>

        {/* ============ Footer：取消按钮 ============ */}
        {!isComplete && onCancel && (
          <Flex justify="flex-end" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 12, marginTop: 4 }}>
            <Button
              size="small"
              type="text"
              icon={<IconClose />}
              onClick={onCancel}
              style={{ color: 'rgba(0,0,0,0.45)' }}
            >
              取消生成
            </Button>
          </Flex>
        )}
      </div>
    </Card>
  )

  return (
    <BerryXCard
      surfaceId={surfaceId}
      commands={a2uiCommands}
      onAction={handleAction}
      components={{}}  // 报告生成场景下 A2UI 协议仅描述结构（走兜底直渲）
      fallback={fallbackUI}
      timeout={400}
    />
  )
}
