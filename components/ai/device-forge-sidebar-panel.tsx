"use client"

import React, { useEffect, useState } from "react"
import {
  Alert, Button, Drawer, Empty, Flex, Tag, Typography, theme,
} from "antd"
import { deviceForgeStore, type DeviceForgeCardData } from "@/lib/state/device-forge-store"
import { useDeviceForgeSnapshot, ForgeFormFields, ForgeStepsTimeline, useDeviceForgeActions } from "@/components/ai/device-forge-card"
import { IconCheckOne, IconConnect, IconCpu, IconLoading, IconPencil, IconSend } from "@/components/icon";

/**
 * DeviceForgeSidebarPanel — AI 助手页右侧「设备接入面板」（antd Drawer 实现）
 *
 * 实时展示 AI 正在生成的设备接入表单：生成步骤状态（失败步骤/原因逐条）+
 * 与对话内卡片共享同一 store 的完整可编辑表单 + 「装入莓小智 / 发布技能工坊」行动按钮。
 *
 * 排版基调（v2 反拥挤）：16px 网格留白、13px 正文、区块间 14~16px 呼吸。
 */
interface DeviceForgeSidebarPanelProps {
  /** 左侧栏是否展开（Drawer 靠右吸附，保留该 prop 仅为调用方兼容） */
  sidebarOpen?: boolean
  darkMode?: boolean
  /** 对话发送回调（发布技能时把 usageDoc 交给 AI 走 create_skill_from_doc） */
  onSendMessage?: (text: string) => void
}

const TYPE_LABELS: Record<string, string> = { relay: '继电器', sensor: '传感器', camera: '摄像头', stepper: '位控电机' }

function ForgeStatusHeader({ card }: { card: DeviceForgeCardData }) {
  const { token } = theme.useToken()
  const draft = card.draft
  const hasIssues = card.issues.some(i => i.level === 'error') || (card.dryRun?.metrics || []).some(m => !m.ok)
  return (
    <Flex align="center" gap={12}>
      <div
        style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: token.colorPrimaryBg, color: token.colorPrimary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <IconCpu size={17} />
      </div>
      <Flex vertical style={{ minWidth: 0, flex: 1 }} gap={2}>
        <Typography.Text strong ellipsis style={{ fontSize: 14, lineHeight: '20px' }}>
          {draft?.name || card.subject || '设备接入'}
        </Typography.Text>
        <Typography.Text type="secondary" ellipsis style={{ fontSize: 12, lineHeight: '18px' }}>
          {draft?.type ? TYPE_LABELS[draft.type] || draft.type : ''}{draft?.category ? ` · ${draft.category}` : ''}
          {card.subject && draft?.name !== card.subject ? ` · 源自「${card.subject}」` : ''}
        </Typography.Text>
      </Flex>
      {hasIssues ? (
        <Tag color="error" style={{ marginInlineEnd: 0, flexShrink: 0 }}>存在问题</Tag>
      ) : (
        <Tag color="success" style={{ marginInlineEnd: 0, flexShrink: 0 }}>配置就绪</Tag>
      )}
    </Flex>
  )
}

export function DeviceForgeSidebarPanel({ onSendMessage }: DeviceForgeSidebarPanelProps) {
  const { token } = theme.useToken()
  const snap = useDeviceForgeSnapshot()
  const { card, form, panelOpen, sessionId, installStatus, installedDevice, installError } = snap
  const [closedSession, setClosedSession] = useState<string | null>(null)
  // actions 执行状态存 store（卡片与面板共享），此处只需操作函数
  const actions = useDeviceForgeActions((card ?? { status: 'failed', issues: [] }) as DeviceForgeCardData, onSendMessage)

  // 新会话自动打开（同一会话手动关闭后不再自动弹）
  useEffect(() => {
    if (!sessionId) return
    if (closedSession !== sessionId) {
      deviceForgeStore.setPanelOpen(true)
    }
  }, [sessionId, closedSession])

  const handleClose = () => {
    setClosedSession(sessionId || 'closed')
    deviceForgeStore.setPanelOpen(false)
  }

  const hasData = !!card && !!card.draft && !!form
  const loading = installStatus === 'loading'
  const done = installStatus === 'success' && !!installedDevice

  return (
    <Drawer
      open={panelOpen}
      onClose={handleClose}
      placement="right"
      width={400}
      mask={false}
      title={
        <Flex align="center" gap={10}>
          <IconCpu size={15} style={{ color: token.colorPrimary }} />
          <Typography.Text strong style={{ fontSize: 14 }}>设备接入面板</Typography.Text>
          {loading && <IconLoading size={13} className="animate-spin" style={{ color: token.colorPrimary }} />}
        </Flex>
      }
      styles={{ body: { padding: '16px 18px 24px' } }}
    >
      {!card ? (
        <Flex vertical align="center" justify="center" style={{ height: 240, gap: 12 }}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={null} style={{ marginBottom: 0 }} />
          <Typography.Text type="secondary" style={{ fontSize: 12.5, textAlign: 'center', lineHeight: 1.8 }}>
            让 AI 根据设备文档生成接入配置时，<br />这里会实时展示进度与可编辑表单
          </Typography.Text>
        </Flex>
      ) : !hasData ? (
        <Alert
          type="error"
          showIcon
          title={<span style={{ fontSize: 13 }}>{card.error || '设备接入配置生成失败'}</span>}
        />
      ) : (
        <Flex vertical gap={16}>
          <ForgeStatusHeader card={card} />
          <ForgeStepsTimeline steps={snap.steps} />

          {card.description && (
            <Typography.Paragraph type="secondary" style={{ fontSize: 12.5, lineHeight: 1.7, marginBottom: 0 }}>
              {card.description}
            </Typography.Paragraph>
          )}

          <Flex vertical gap={8}>
            <Flex align="center" gap={6} style={{ fontSize: 12, color: token.colorTextTertiary, fontWeight: 600 }}>
              <IconPencil size={12} />
              <span>接入配置（与对话卡片同步修改）</span>
            </Flex>
            {form && (
              <div style={{ borderRadius: 10, border: `1px solid ${token.colorSplit}`, padding: '16px' }}>
                <ForgeFormFields form={form} onPatch={f => deviceForgeStore.patchForm(f)} />
              </div>
            )}
          </Flex>

          {/* 行动按钮 */}
          {form && (
            <Flex gap={10} wrap="wrap">
              <Button
                type="primary"
                icon={done ? <IconCheckOne size={14} /> : <IconConnect size={14} />}
                loading={loading}
                disabled={done}
                onClick={() => actions.handleInstall(form)}
                style={{ flex: 1, fontWeight: 600 }}
              >
                {done ? '已装入平台' : loading ? '正在写入…' : '装入莓小智'}
              </Button>
              {card.usageDoc && !loading && onSendMessage && (
                <Button
                  icon={<IconSend size={14} />}
                  onClick={() => {
                    const ok = actions.handlePublishSkill()
                    if (ok) deviceForgeStore.setPanelOpen(false)
                  }}
                >
                  发布技能工坊
                </Button>
              )}
            </Flex>
          )}
          {installStatus === 'error' && installError && (
            <Alert type="error" showIcon title={<span style={{ fontSize: 12.5 }}>{installError}</span>} />
          )}
          {done && (
            <Alert
              type="success"
              showIcon
              title={
                <span style={{ fontSize: 12.5, lineHeight: 1.7 }}>
                  设备「{installedDevice?.name}」已装入平台。到 设备控制 / 监控 / 数据看板 页面查看新设备卡片
                  {card.draft?.type === 'sensor' ? '（MQTT 订阅已生效，收到上报数据后出数）' : ''}。
                </span>
              }
            />
          )}
        </Flex>
      )}
    </Drawer>
  )
}
