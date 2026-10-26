"use client"

import { useMemo, useState } from "react"
import { Modal, Input, Button, Empty } from "antd"
import type { ChatMessage } from "@/lib/chat/chat-types"
import { formatChatTime } from "@/lib/chat/chat-types"
import { IconClose, IconSearch } from "@/components/icon";

interface MessageSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  messages: ChatMessage[]
  onSelectMessage: (messageId: number) => void
}

const ICON_STROKE = 1.75

/** 转义正则特殊字符，避免用户输入导致 RegExp 构造抛错白屏 */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function MessageSearchDialog({
  open,
  onOpenChange,
  messages,
  onSelectMessage
}: MessageSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // 仅搜索文本消息，排除图片/语音/视频/文件等 placeholder 内容
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return messages.filter(msg =>
      (msg.type === "text" || !msg.type) &&
      msg.content.toLowerCase().includes(q)
    )
  }, [messages, searchQuery])

  // 安全构造高亮正则（已转义）
  const highlightRegex = useMemo(() => {
    if (!searchQuery.trim()) return null
    try {
      return new RegExp(`(${escapeRegExp(searchQuery)})`, "gi")
    } catch (e) {
      console.error("[MessageSearchDialog highlightRegex]", e)
      return null
    }
  }, [searchQuery])

  const renderContent = (content: string) => {
    if (!highlightRegex) return content
    return content.split(highlightRegex).map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-900">
          {part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      )
    )
  }

  return (
    <Modal
      open={open}
      onCancel={() => onOpenChange(false)}
      title="搜索消息"
      footer={null}
      width={720}
    >
      <div className="relative mt-2">
        <IconSearch
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
          strokeWidth={ICON_STROKE}
        />
        <Input
          placeholder="搜索消息内容..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          autoFocus
          suffix={searchQuery ? (
            <Button
              type="text"
              size="small"
              shape="circle"
              icon={<IconClose className="h-3.5 w-3.5" strokeWidth={ICON_STROKE} />}
              onClick={() => setSearchQuery("")}
            />
          ) : null}
        />
      </div>

      <div className="h-[400px] mt-4 overflow-y-auto" data-lenis-prevent>
        {searchQuery ? (
          <div className="space-y-2">
            {filteredMessages.length > 0 ? (
              filteredMessages.map(msg => (
                <button
                  key={msg.id}
                  onClick={() => {
                    onSelectMessage(msg.id)
                    onOpenChange(false)
                  }}
                  className="w-full text-left p-3 rounded-lg hover:bg-br-surface-3 transition-colors"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs text-muted-foreground">
                      {formatChatTime(msg.created_at)}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-2">
                    {renderContent(msg.content)}
                  </p>
                </button>
              ))
            ) : (
              <Empty description="未找到匹配的消息" className="py-8" />
            )}
          </div>
        ) : (
          <Empty description="输入关键词搜索消息" className="py-8" />
        )}
      </div>
    </Modal>
  )
}
