"use client"

/**
 * RateLimitErrorCard · 方案 A · Editorial
 *
 * 设计哲学：编辑设计 / Apple 风格
 * - 纯白底 + 1px 极细边框 + 无阴影
 * - 字号差建立层级：32 / 14 / 12 / 11
 * - 红色仅出现在语义位置（顶部 2px 短线 + 错误码徽章）
 * - 不出现 emoji、icon、彩色 chip、tag
 * - 重点：用排版本身承担信息层级
 */

import React, { useMemo, useCallback, useState } from "react"
import { motion } from "framer-motion"
import { BERRY_THEME } from "@/lib/ui/berry-theme"

export interface RateLimitErrorCardProps {
  rawMessage?: string
  errorCode?: string
  statusCode?: number
  onRetry?: () => void
  title?: string
  description?: string
  className?: string
  style?: React.CSSProperties
}

const DEFAULT_RAW = `Request failed: 429 - {"error":"AI API Error: 429 - {"error":"{"code":"1305","message":"该模型当前访问量过大，请您稍后再试"}}"}`

function parseError(raw: string): { code: string; message: string } {
  const codeMatch = raw.match(/"code"\s*:\s*"?(\d+)"?/)
  const msgMatch = raw.match(/"message"\s*:\s*"([^"]+)"/)
  return {
    code: codeMatch?.[1] ?? "1305",
    message: msgMatch?.[1] ?? "该模型当前访问量过大，请您稍后再试",
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
  const parsed = useMemo(() => parseError(rawMessage), [rawMessage])
  const code = errorCode ?? parsed.code
  const message = description ?? parsed.message

  const handleCopy = useCallback(() => {
    const text = `HTTP ${statusCode} · ${code} · ${message}`
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
    }
  }, [statusCode, code, message])

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      style={{
        ...style,
        fontFamily: 'var(--font-sans), -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", system-ui, sans-serif',
      }}
    >
      <article
        style={{
          background: '#ffffff',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          borderRadius: 10,
          padding: '24px 28px 20px',
          position: 'relative',
          marginBlock: 12,
        }}
      >
        {/* 顶部 24px 红色短线（不是色条，是排版中的"破折号"） */}
        <div
          style={{
            width: 24,
            height: 2,
            background: BERRY_THEME.status.error,
            marginBottom: 20,
            borderRadius: 1,
          }}
        />

        {/* 序号 — 12px 小字，建立出版物感 */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(0, 0, 0, 0.4)',
            marginBottom: 12,
            fontFeatureSettings: '"tnum" 1',
          }}
        >
          Error · {String(statusCode)}
        </div>

        {/* 主标题 — 24px 衬线感字重 600 */}
        <h3
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 600,
            lineHeight: 1.3,
            letterSpacing: '-0.01em',
            color: 'rgba(0, 0, 0, 0.92)',
            marginBottom: 8,
          }}
        >
          {title}
        </h3>

        {/* 描述 — 14px 行高 1.6 略缩进 */}
        <p
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 400,
            lineHeight: 1.6,
            color: 'rgba(0, 0, 0, 0.6)',
            marginBottom: 20,
            maxWidth: '92%',
          }}
        >
          {message}
        </p>

        {/* 元信息行 — 极简水平排列，无 chip 无 tag */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            paddingTop: 16,
            borderTop: '1px solid rgba(0, 0, 0, 0.06)',
            fontSize: 12,
            color: 'rgba(0, 0, 0, 0.5)',
            fontFeatureSettings: '"tnum" 1',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'rgba(0, 0, 0, 0.35)' }}>code</span>
            <span
              style={{
                color: BERRY_THEME.status.error,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontWeight: 500,
              }}
            >
              {code}
            </span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'rgba(0, 0, 0, 0.35)' }}>http</span>
            <span
              style={{
                color: 'rgba(0, 0, 0, 0.65)',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontWeight: 500,
              }}
            >
              {statusCode}
            </span>
          </span>
          <span style={{ flex: 1 }} />

          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
                color: BERRY_THEME.primary,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontFamily: 'inherit',
              }}
            >
              重试
              <span style={{ fontSize: 14, lineHeight: 1, transform: 'translateY(-0.5px)' }}>→</span>
            </button>
          )}
          <button
            onClick={handleCopy}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 400,
              color: 'rgba(0, 0, 0, 0.5)',
              fontFamily: 'inherit',
            }}
          >
            {copied ? "已复制" : "复制"}
          </button>
        </div>

        {/* 原始错误 — 默认隐藏,鼠标 hover 标题时不展开;靠 details 实现 */}
        <details
          style={{
            marginTop: 14,
            fontSize: 11,
            color: 'rgba(0, 0, 0, 0.4)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          <summary
            style={{
              cursor: 'pointer',
              listStyle: 'none',
              fontSize: 11,
              userSelect: 'none',
              width: 'fit-content',
            }}
          >
            <span style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>raw</span>
            <span style={{ color: 'rgba(0, 0, 0, 0.3)', marginLeft: 8 }}>show original error</span>
          </summary>
          <pre
            style={{
              margin: '8px 0 0',
              padding: 10,
              fontSize: 10.5,
              lineHeight: 1.5,
              color: 'rgba(0, 0, 0, 0.45)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              background: 'rgba(0, 0, 0, 0.02)',
              borderRadius: 6,
              maxHeight: 100,
              overflow: 'auto',
            }}
          >
            {rawMessage}
          </pre>
        </details>
      </article>
    </motion.div>
  )
}

export default RateLimitErrorCard
