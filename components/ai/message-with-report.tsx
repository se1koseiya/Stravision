"use client"

import React, { useMemo } from "react"
import { ReportRenderer } from "./report-renderer"
import ReactMarkdown from "react-markdown"
import { Card, Progress, Tag, Space, Flex, Typography, Button } from "antd"
import { BerryXCard } from "@/components/ui/berry-xcard"
import { buildCommands } from "@/lib/a2ui/berry-protocol"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import type { ActionPayload, A2UICommand_v0_9 } from "@ant-design/x-card"
import { IconBrain, IconCheckOne, IconClose, IconCpu, IconFileText, IconLoading, IconSeedling } from "@/components/icon";

const { Text, Title } = Typography

interface MessageWithReportProps {
  content: string
  role: 'user' | 'assistant'
  onCancel?: () => void
}

interface PremiumReportLoaderProps {
  reportTitle?: string
  htmlContent?: string
  isComplete?: boolean
  onCancel?: () => void
}

// ===== 4 步进度定义 =====
const STEPS = [
  { label: "数据捕获", desc: "验证并拉取温室 IoT 终端环境数据", icon: IconSeedling, key: "capture" },
  { label: "指标分析", desc: "提取空气与土壤传感器核心指标", icon: IconCpu, key: "metric" },
  { label: "大模诊断", desc: "基于草莓专家知识库开展智能诊断", icon: IconBrain, key: "diagnosis" },
  { label: "视觉编排", desc: "渲染响应式大厂UI卡片与交互图表", icon: IconFileText, key: "render" },
] as const

/**
 * Premium report loader — Ant Design + XCard + A2UI 协议三件套
 *
 * 1. 视觉层：Ant Design Card / Progress / Tag / Flex
 * 2. 渲染层：XCard.Box（统一入口）
 * 3. 协议层：A2UI v0.9 commands + berry-realm-catalog-v1
 *
 * 颜色统一 BERRY_THEME.primary (#059669)，与 AI 助手主对话流一致
 */
function PremiumReportLoader({ reportTitle = "分析报告", htmlContent = "", isComplete = false, onCancel }: PremiumReportLoaderProps) {
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
        // 报告容器
        { id: 'report-header', component: 'CardHeader',
          title: `正在生成：${reportTitle}`,
          subtitle: activeStatusText,
          icon: 'FileText',
          status: isComplete ? 'success' : 'processing' },
        { id: 'progress', component: 'Metric',
          title: '生成进度', value: String(progress), unit: '%',
          color: BERRY_THEME.primary },
        // 4 个步骤（TaskList）
        { id: 'steps', component: 'TaskList', tasks: STEPS.map((s, idx) => ({
          title: s.label,
          desc: s.desc,
          status: idx < currentStep ? 'success' : idx === currentStep ? 'processing' : 'pending',
          icon: s.key,
        })) },
        // 取消按钮
        { id: 'cancel-btn', component: 'ActionButton',
          label: '取消生成', action: 'cancel-report',
          type: 'default', icon: 'CloseOutlined' },
      ],
      ['report-header', 'progress', 'steps', 'cancel-btn']
    )
  }, [surfaceId, reportTitle, activeStatusText, isComplete, progress, currentStep])

  // ===== A2UI Action 处理 =====
  const handleAction = (payload: ActionPayload) => {
    if (payload.name === 'cancel-report') {
      onCancel?.()
    }
  }

  // ===== 兜底渲染（Ant Design 直渲） =====
  const fallbackUI = (
    <Card
      size="small"
      bordered
      style={{
        background: BERRY_THEME.gradients.cardHero(BERRY_THEME.primary),
        borderColor: `${BERRY_THEME.primary}30`,
        borderRadius: BERRY_THEME.radius.lg,
        boxShadow: BERRY_THEME.shadow.sm,
        marginBlock: 16,
      }}
      styles={{ body: { padding: 16 } }}
    >
      {/* 进度条 */}
      <Progress
        percent={progress}
        showInfo={false}
        strokeColor={{
          '0%': BERRY_THEME.primary,
          '100%': BERRY_THEME.primaryHover,
        }}
        trailColor="rgba(0,0,0,0.04)"
        style={{ marginBlockEnd: 12 }}
      />

      {/* Header */}
      <Flex align="center" justify="space-between" style={{ marginBlockEnd: 12 }}>
        <Flex align="center" gap={10}>
          <Flex
            align="center"
            justify="center"
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: BERRY_THEME.primary,
            }}
          >
            <IconFileText style={{ color: '#fff', fontSize: 18 }} />
          </Flex>
          <Flex vertical gap={2}>
            <Title level={5} style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
              正在生成：{reportTitle}
            </Title>
            <Space size={6} align="center">
              {!isComplete && <IconLoading style={{ color: BERRY_THEME.primary, fontSize: 12 }} spin />}
              <Text type="secondary" style={{ fontSize: 12 }}>
                {activeStatusText}
              </Text>
            </Space>
          </Flex>
        </Flex>

        <Tag
          color={isComplete ? 'success' : 'processing'}
          style={{ borderRadius: 999, fontSize: 11, fontWeight: 600, padding: '0 8px' }}
        >
          {progress}%
        </Tag>
      </Flex>

      {/* 4 步进度卡 */}
      <Flex gap={8} wrap="wrap" style={{ marginBlockEnd: 12 }}>
        {STEPS.map((step, idx) => {
          const Icon = step.icon
          const isDone = currentStep > idx
          const isActive = currentStep === idx
          const bgColor = isActive
            ? `${BERRY_THEME.primary}15`
            : isDone
              ? `${BERRY_THEME.primary}08`
              : 'transparent'
          const borderColor = isActive
            ? `${BERRY_THEME.primary}60`
            : isDone
              ? `${BERRY_THEME.primary}30`
              : 'rgba(0,0,0,0.06)'
          const iconBg = isActive
            ? BERRY_THEME.primary
            : isDone
              ? `${BERRY_THEME.primary}30`
              : 'rgba(0,0,0,0.05)'
          const iconColor = isActive ? '#fff' : isDone ? BERRY_THEME.primary : 'rgba(0,0,0,0.35)'
          const labelColor = isActive
            ? BERRY_THEME.primaryText
            : isDone
              ? 'rgba(0,0,0,0.65)'
              : 'rgba(0,0,0,0.35)'

          return (
            <div
              key={step.key}
              style={{
                flex: '1 1 0',
                minWidth: 120,
                padding: 10,
                borderRadius: 10,
                background: bgColor,
                border: `1px solid ${borderColor}`,
                transition: 'all 0.3s',
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: iconBg, color: iconColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: isActive ? `0 2px 6px ${BERRY_THEME.primary}40` : 'none',
                }}
              >
                {isDone ? <IconCheckOne style={{ fontSize: 14 }} /> : <Icon style={{ fontSize: 14 }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Flex align="center" justify="space-between" gap={4}>
                  <Text style={{ fontSize: 12, fontWeight: 600, color: labelColor }}>
                    {step.label}
                  </Text>
                  {isActive && (
                    <Tag
                      color="processing"
                      style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 4px' }}
                    >
                      进行中
                    </Tag>
                  )}
                </Flex>
                <Text type="secondary" style={{ fontSize: 10, lineHeight: 1.4, display: 'block', marginTop: 2 }}>
                  {step.desc}
                </Text>
              </div>
            </div>
          )
        })}
      </Flex>

      {/* Footer：取消按钮 */}
      {!isComplete && onCancel && (
        <Flex justify="flex-end">
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
    </Card>
  )

  return (
    <BerryXCard
      surfaceId={surfaceId}
      commands={a2uiCommands}
      onAction={handleAction}
      components={{}}  // 报告生成场景下无自定义 A2UI 组件（走兜底直渲）
      fallback={fallbackUI}
      timeout={400}
    />
  )
}

/**
 * 检测消息中是否包含HTML报告
 * 报告格式: [REPORT:title]html内容[/REPORT]
 */
function extractReport(content: string): {
  hasReport: boolean
  isComplete: boolean
  reportTitle?: string
  reportHtml?: string
  remainingContent: string
} {
  // Try matching complete report first
  const completeReportRegex = /\[REPORT:([^\]]+)\]([\s\S]*?)\[\/REPORT\]/
  const completeMatch = content.match(completeReportRegex)

  if (completeMatch) {
    return {
      hasReport: true,
      isComplete: true,
      reportTitle: completeMatch[1],
      reportHtml: completeMatch[2].trim(),
      remainingContent: content.replace(completeReportRegex, '').trim()
    }
  }

  // If not complete, try matching incomplete report (streaming)
  const incompleteReportRegex = /\[REPORT:([^\]]+)\]([\s\S]*?)$/
  const incompleteMatch = content.match(incompleteReportRegex)

  if (incompleteMatch) {
    return {
      hasReport: true,
      isComplete: false,
      reportTitle: incompleteMatch[1],
      reportHtml: incompleteMatch[2].trim(),
      remainingContent: content.replace(incompleteReportRegex, '').trim()
    }
  }

  return {
    hasReport: false,
    isComplete: false,
    remainingContent: content
  }
}

export function MessageWithReport({ content, role, onCancel }: MessageWithReportProps) {
  const { hasReport, isComplete, reportTitle, reportHtml, remainingContent } = extractReport(content)

  if (role === 'user') {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 常规消息内容 */}
      {remainingContent && (
        <div className="prose prose-sm dark:prose-invert max-w-none text-left">
          <ReactMarkdown>{remainingContent}</ReactMarkdown>
        </div>
      )}

      {/* 报告渲染 */}
      {hasReport && (
        isComplete ? (
          reportHtml && (
            <ReportRenderer
              htmlContent={reportHtml}
              reportTitle={reportTitle}
              reportId={`report_${Date.now()}`}
            />
          )
        ) : (
          <PremiumReportLoader
            reportTitle={reportTitle}
            htmlContent={reportHtml || ""}
            isComplete={false}
            onCancel={onCancel}
          />
        )
      )}
    </div>
  )
}
