"use client"

/**
 * 邀请通知按钮（Ant Design 规范）
 *
 * 设计原则：
 * - 外层 Popover 8px 圆角，内部所有元素无圆角（避免圆角套圆角）
 * - 三段式：Header（标题+计数） / Body（列表） / Footer（链接）
 * - 颜色、间距、字号全部使用 AntD token
 */

import { useEffect, useRef, useState, useCallback } from "react"
import { Badge, Popover, ConfigProvider } from "antd"
import { toast } from "@/lib/ui/feedback"
import InvitationList from "./invitation-list"
import { IconClose, IconRemind } from "@/components/icon";

interface IncomingInvitation {
  id: number
  collection_id: number
  collection_name: string
  inviter_id: number
  inviter_name: string
  inviter_avatar: string | null
  role: string
  message: string | null
  created_at: number
}

const COLOR = {
  primary: "#059669",
  text: "rgba(0,0,0,0.88)",
  secondary: "rgba(0,0,0,0.65)",
  tertiary: "rgba(0,0,0,0.45)",
  divider: "#F4F4F5",
  fillHover: "#fafafa",
  error: "#DC2626"
}

export function InvitationNotifier() {
  const [pendingCount, setPendingCount] = useState(0)
  const [open, setOpen] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  const refreshCount = useCallback(async () => {
    try {
      const res = await fetch("/api/knowledge/invitations?direction=received&status=pending&limit=100", {
        credentials: "include"
      })
      const data = await res.json()
      const list = Array.isArray(data?.items) ? data.items : []
      setPendingCount(list.length)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    refreshCount()
    const t = setInterval(refreshCount, 30_000)
    return () => clearInterval(t)
  }, [refreshCount])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!window.EventSource) return

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      const es = new EventSource("/api/user-events/stream")
      eventSourceRef.current = es

      es.onmessage = (e) => {
        try {
          const evt = JSON.parse(e.data)
          if (evt?.type === "new_invitation" && evt.invitation) {
            const inv = evt.invitation as IncomingInvitation
            setPendingCount((c) => c + 1)
            toast.success("收到新的协作邀请", {
              description: `${inv.inviter_name} 邀请你协作「${inv.collection_name}」`,
              duration: 6000,
              action: {
                label: "查看",
                onClick: () => setOpen(true)
              }
            })
          }
        } catch {
          // ignore
        }
      }

      es.onerror = () => {
        es.close()
        reconnectTimer = setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      eventSourceRef.current?.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [])

  const content = (
    <div style={{ width: 380 }}>
      {/* Header：纯文本 + 计数，无图标徽标 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: `1px solid ${COLOR.divider}`
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: COLOR.text, lineHeight: 1 }}>
            协作邀请
          </span>
          {pendingCount > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 18,
                height: 18,
                padding: "0 5px",
                fontSize: 11,
                fontWeight: 500,
                color: "#ffffff",
                background: COLOR.primary,
                borderRadius: 9,
                lineHeight: 1
              }}
            >
              {pendingCount}
            </span>
          )}
        </div>
        <IconClose
          onClick={() => setOpen(false)}
          style={{
            fontSize: 12,
            color: COLOR.tertiary,
            cursor: "pointer",
            padding: 4,
            transition: "color 0.15s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = COLOR.text
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = COLOR.tertiary
          }}
        />
      </div>

      {/* Body：列表，无 padding，列表项自己控制 padding */}
      <div style={{ maxHeight: 440, overflowY: "auto" }}>
        <InvitationList
          showTabs
          defaultTab="pending"
          limit={20}
          inline
          onInvitationChange={refreshCount}
          onOpenCollection={() => setOpen(false)}
        />
      </div>

      {/* Footer：纯链接，无背景色 */}
      <div
        style={{
          padding: "10px 16px",
          borderTop: `1px solid ${COLOR.divider}`,
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center"
        }}
      >
        <a
          href="/activity"
          style={{
            fontSize: 12,
            color: COLOR.primary,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
            transition: "opacity 0.15s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.85"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1"
          }}
        >
          查看全部活动
          <span style={{ fontSize: 10, marginLeft: 2 }}>→</span>
        </a>
      </div>
    </div>
  )

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: COLOR.primary,
          borderRadius: 8
        }
      }}
    >
      <Popover
        content={content}
        trigger="click"
        open={open}
        onOpenChange={setOpen}
        placement="bottomRight"
        overlayInnerStyle={{
          padding: 0,
          borderRadius: 8,
          border: `1px solid ${COLOR.divider}`,
          boxShadow: "0 6px 16px rgba(0,0,0,0.08), 0 3px 6px rgba(0,0,0,0.04)"
        }}
        arrow={false}
      >
        <Badge
          count={pendingCount}
          size="small"
          offset={[-2, 2]}
          color={COLOR.error}
        >
          <button
            type="button"
            aria-label="协作邀请"
            style={{
              width: 32,
              height: 32,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: pendingCount > 0 ? COLOR.primary : COLOR.secondary,
              borderRadius: 6,
              transition: "background 0.15s, color 0.15s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = COLOR.fillHover
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
            }}
          >
            <IconRemind style={{ fontSize: 16 }} />
          </button>
        </Badge>
      </Popover>
    </ConfigProvider>
  )
}
