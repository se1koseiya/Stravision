"use client"

import React, { useMemo, useCallback, useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Card, Button, Typography, Tooltip } from "antd"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import { IconCaution, IconCheck, IconCopy, IconDown, IconRefresh, IconUp } from "@/components/icon";

const { Text, Paragraph } = Typography

export interface RateLimitErrorCardProps {
  rawMessage?: string
  errorCode?: string
  statusCode?: number
  retryAfter?: string
  onRetry?: () => void
  title?: string
  description?: string
  className?: string
  style?: React.CSSProperties
}

const DEFAULT_RAW = `Request failed: 429 - {"error":"AI API Error: 429 - {"error":"{"code":"1305","message":"该模型当前访问量过大，请您稍后再试"}}"}`

function parseError(raw: string): { code: string; message: string } {
  try {
    const codeMatch = raw.match(/"code"\s*:\s*"?(\d+)"?/)
    const msgMatch = raw.match(/"message"\s*:\s*"([^"]+)"/)
    return {
      code: codeMatch?.[1] ?? "1305",
      message: msgMatch?.[1] ?? "该模型当前访问量过大，请您稍后再试",
    }
  } catch {
    return { code: "1305", message: raw }
  }
}

export function RateLimitErrorCard({
  rawMessage = DEFAULT_RAW,
  errorCode,
  statusCode = 429,
  onRetry,
  title = "请求过于频繁",
  description,
  className,
  style,
}: RateLimitErrorCardProps) {
  const [copied, setCopied] = useState(false)
  const [rawOpen, setRawOpen] = useState(false)

  const parsed = useMemo(() => parseError(rawMessage), [rawMessage])
  const code = errorCode ?? parsed.code
  const message = description ?? parsed.message

  const handleCopy = useCallback(() => {
    const text = `HTTP ${statusCode} · code ${code} · ${message}`
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(
        () => { setCopied(true); setTimeout(() => setCopied(false), 1500) }
      )
    }
  }, [statusCode, code, message])

  const fallbackUI = (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      style={style}
    >
      <Card
        size="small"
        bordered
        styles={{ body: { padding: 0 } }}
        style={{
          background: '#ffffff',
          borderColor: 'rgba(0, 0, 0, 0.06)',
          borderRadius: BERRY_THEME.radius.lg,
          boxShadow: 'none',
          marginBlock: 12,
          overflow: 'hidden',
        }}
      >
        {/* 顶部状态条：1px danger 色 */}
        <div
          style={{
            height: 2,
            background: BERRY_THEME.status.error,
            width: '100%',
          }}
        />

        {/* 主体内容 */}
        <div style={{ padding: '14px 16px' }}>
          {/* 头部：图标 + 标题 + 状态标签组 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <IconCaution
              size={16}
              color={BERRY_THEME.status.error}
              strokeWidth={2}
              style={{ flexShrink: 0 }}
            />
            <Text
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: 'rgba(0, 0, 0, 0.88)',
                lineHeight: 1.4,
                flex: 1,
                minWidth: 0,
              }}
            >
              {title}
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 400,
                  color: BERRY_THEME.status.error,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: `${BERRY_THEME.status.error}10`,
                  border: `1px solid ${BERRY_THEME.status.error}20`,
                  lineHeight: '16px',
                }}
              >
                {code}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 400,
                  color: BERRY_THEME.status.warning,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: `${BERRY_THEME.status.warning}10`,
                  border: `1px solid ${BERRY_THEME.status.warning}20`,
                  lineHeight: '16px',
                }}
              >
                HTTP {statusCode}
              </span>
            </div>
          </div>

          {/* 描述 */}
          <Paragraph
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 400,
              color: 'rgba(0, 0, 0, 0.65)',
              lineHeight: 1.6,
              paddingLeft: 24,
            }}
          >
            {message}
          </Paragraph>
        </div>

        {/* 分隔线 */}
        <div style={{ height: 1, background: 'rgba(0, 0, 0, 0.04)', margin: '0 16px' }} />

        {/* 原始错误折叠区（sources 区，颜色更浅） */}
        <div style={{ padding: '4px 16px' }}>
          <button
            onClick={() => setRawOpen(!rawOpen)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 0',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 400,
              color: 'rgba(0, 0, 0, 0.45)',
              textAlign: 'left',
            }}
          >
            {rawOpen ? <IconUp size={12} strokeWidth={2} /> : <IconDown size={12} strokeWidth={2} />}
            <span>查看原始错误信息</span>
          </button>
          {rawOpen && (
            <pre
              style={{
                margin: '0 0 8px 0',
                padding: '8px 10px',
                fontSize: 11,
                lineHeight: 1.5,
                color: 'rgba(0, 0, 0, 0.45)',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                background: 'rgba(0, 0, 0, 0.02)',
                borderRadius: BERRY_THEME.radius.sm,
                border: '1px solid rgba(0, 0, 0, 0.04)',
                maxHeight: 120,
                overflow: 'auto',
                fontWeight: 400,
              }}
            >
              {rawMessage}
            </pre>
          )}
        </div>

        {/* 分隔线 */}
        <div style={{ height: 1, background: 'rgba(0, 0, 0, 0.04)', margin: '0 16px' }} />

        {/* 操作区：右对齐 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '10px 16px',
          }}
        >
          <Tooltip title={copied ? "已复制" : "复制错误摘要"}>
            <Button
              size="small"
              type="text"
              icon={copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
              onClick={handleCopy}
              style={{
                color: 'rgba(0, 0, 0, 0.55)',
                fontWeight: 400,
                fontSize: 12,
                height: 28,
              }}
            >
              {copied ? "已复制" : "复制"}
            </Button>
          </Tooltip>
          {onRetry && (
            <Button
              size="small"
              type="primary"
              icon={<IconRefresh size={13} />}
              onClick={onRetry}
              style={{
                background: BERRY_THEME.primary,
                borderColor: BERRY_THEME.primary,
                fontWeight: 400,
                fontSize: 12,
                height: 28,
                boxShadow: 'none',
              }}
            >
              重新发送
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  )

  return fallbackUI
}

export default RateLimitErrorCard
