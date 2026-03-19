"use client"

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Copy, Trash2, Reply, Forward } from "lucide-react"
import { toast } from "sonner"

interface MessageContextMenuProps {
  children: React.ReactNode
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
  const canRecall = isMe && (Date.now() - message.created_at < 120000) // 2分钟内

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    toast.success("已复制到剪贴板")
    onCopy?.(message.content)
  }

  const handleRecall = () => {
    if (canRecall && onRecall) {
      onRecall(message.id)
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={handleCopy}>
          <Copy className="mr-2 h-4 w-4" />
          复制
        </ContextMenuItem>
        {canRecall && (
          <ContextMenuItem onClick={handleRecall} className="text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            撤回消息
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
