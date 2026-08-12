"use client"

import { Dropdown } from "antd"
import type { MenuProps } from "antd"
import { Copy, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useMemo, type ReactNode } from "react"

const ICON_STROKE = 1.75

interface MessageContextMenuProps {
  children: ReactNode
  message: {
    id: number
    content: string
    created_at: number
    sender_id: number
  }
  isMe: boolean
  onRecall?: (messageId: number) => void
  onCopy?: (content: string) => void
}

export function MessageContextMenu({
  children,
  message,
  isMe,
  onRecall,
  onCopy
}: MessageContextMenuProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    toast.success("已复制到剪贴板")
    onCopy?.(message.content)
  }

  const handleRecall = () => {
    // 2 分钟内可撤回；时间窗在点击时检查，避免渲染期调用 impure 的 Date.now
    if (!onRecall) return
    if (Date.now() - message.created_at > 120000) {
      toast.error("消息已超过 2 分钟，无法撤回")
      return
    }
    onRecall(message.id)
  }

  const items = useMemo<MenuProps["items"]>(() => {
    const list: MenuProps["items"] = [
      {
        key: "copy",
        label: "复制",
        icon: <Copy className="h-4 w-4" strokeWidth={ICON_STROKE} />,
        onClick: handleCopy
      }
    ]
    if (isMe && onRecall) {
      list.push({
        key: "recall",
        label: "撤回消息",
        danger: true,
        icon: <Trash2 className="h-4 w-4" strokeWidth={ICON_STROKE} />,
        onClick: handleRecall
      })
    }
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMe, onRecall, message])

  return (
    <Dropdown
      menu={{ items }}
      trigger={["contextMenu"]}
    >
      <div className="cursor-default">{children}</div>
    </Dropdown>
  )
}
