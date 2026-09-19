"use client"

import React, { useEffect, useState } from "react"
import { Button, Card, Tag, Tooltip, theme } from "antd"
import { IconClose, IconDown, IconUp } from "@/components/icon";

export interface MemoryItem {
  key: string
  label: string
  value: string
  confidence: number
}

interface MemoryProfileBarProps {
  /**
   * 直接给定要展示的记忆条目（用于预览/演示场景）。
   * 不传则走 /api/ai/memory-profile 真实拉取——线上用法保持不变。
   */
  items?: MemoryItem[]
  /** 初始是否展开条目列表（默认收起） */
  defaultExpanded?: boolean
}

/**
 * "AI 已记住你" 记忆感知条（Ant Design 实现）
 *
 * 在对话首页展示 AI 记住的用户关键信息（棚号/品种/目标/偏好），
 * 让"越用越懂你"这个亮点直接可见。
 *
 * 遵循平台 UI 准则：扁平、细边框、左对齐、无渐变无阴影、克制。
 * 图标沿用 lucide-react，明暗主题交由页面 ConfigProvider 的 token 适配。
 */
export function MemoryProfileBar({ items, defaultExpanded = false }: MemoryProfileBarProps = {}) {
  const { token } = theme.useToken()
  const [memories, setMemories] = useState<MemoryItem[]>(items ?? [])
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(!items)

  useEffect(() => {
    if (items) {
      setMemories(items)
      setLoading(false)
      return
    }
    let cancelled = false
    fetch("/api/ai/memory-profile")
      .then(res => (res.ok ? res.json() : { memories: [] }))
      .then(data => {
        if (!cancelled) {
          setMemories(Array.isArray(data?.memories) ? data.memories : [])
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [items])

  // 加载中 / 无记忆 / 已关闭 均不渲染
  if (loading || dismissed || memories.length === 0) return null

  const hasMore = memories.length > 3
  const display = expanded ? memories : memories.slice(0, 3)

  return (
    <Card
      variant="outlined"
      style={{
        marginTop: 16,
        borderRadius: expanded ? 12 : 999,
        background: token.colorFillQuaternary,
        transition: "border-radius 0.2s ease",
      }}
      styles={{ body: { padding: 0 } }}
    >
      {/* 头部：可点击展开/收起 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: expanded ? "8px 12px" : "6px 12px 6px 7px",
          cursor: hasMore ? "pointer" : "default",
        }}
        onClick={() => hasMore && setExpanded(v => !v)}
      >
        {/* IP 头像（草莓头招手形象，裁头部位） */}
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            overflow: "hidden",
            flexShrink: 0,
            background: token.colorBgContainer,
            border: `1px solid ${token.colorBorderSecondary}`,
            display: "inline-block",
          }}
        >
          <img
            src="/ip/sayhi.png"
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "50% 15%",
              display: "block",
            }}
          />
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: token.colorText }}>
          我已记住你
        </span>
        <span
          style={{
            fontSize: 11,
            color: token.colorTextTertiary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            minWidth: 0,
          }}
        >
          {memories.slice(0, 2).map(m => m.value).join(" · ")}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
          {hasMore && (expanded
            ? <IconUp size={11} style={{ color: token.colorTextTertiary }} />
            : <IconDown size={11} style={{ color: token.colorTextTertiary }} />)}
          <Button
            type="text"
            size="small"
            aria-label="关闭"
            icon={<IconClose size={12} />}
            onClick={(e) => { e.stopPropagation(); setDismissed(true) }}
            style={{ color: token.colorTextQuaternary, minWidth: 20, height: 20, padding: 0 }}
          />
        </span>
      </div>

      {/* 记忆条目（展开时展示全部） */}
      {expanded && (
        <div
          style={{
            padding: "4px 12px 12px",
            borderTop: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {display.map(m => (
              <Tooltip key={m.key} title={`置信度 ${(m.confidence * 100).toFixed(0)}%`}>
                <Tag
                  style={{
                    margin: 0,
                    borderRadius: 999,
                    padding: "2px 10px",
                    fontSize: 12,
                    color: token.colorText,
                    background: token.colorBgContainer,
                  }}
                >
                  <span style={{ color: token.colorTextTertiary, fontWeight: 500, marginRight: 4 }}>
                    {m.label}
                  </span>
                  {m.value}
                </Tag>
              </Tooltip>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
