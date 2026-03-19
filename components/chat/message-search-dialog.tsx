"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Message {
  id: number
  sender_id: number
  content: string
  created_at: number
  type?: string
}

interface MessageSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  messages: Message[]
  onSelectMessage: (messageId: number) => void
}

export function MessageSearchDialog({
  open,
  onOpenChange,
  messages,
  onSelectMessage
}: MessageSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredMessages = messages.filter(msg =>
    msg.content.toLowerCase().includes(searchQuery.toLowerCase()) &&
    msg.type !== 'image' && msg.type !== 'audio'
  )

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>搜索消息</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索消息内容..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
          {searchQuery && (
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px] mt-4">
          {searchQuery && (
            <div className="space-y-2">
              {filteredMessages.length > 0 ? (
                filteredMessages.map(msg => (
                  <button
                    key={msg.id}
                    onClick={() => {
                      onSelectMessage(msg.id)
                      onOpenChange(false)
                    }}
                    className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs text-muted-foreground">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                    <p className="text-sm line-clamp-2">
                      {msg.content.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, i) =>
                        part.toLowerCase() === searchQuery.toLowerCase() ? (
                          <mark key={i} className="bg-yellow-200 dark:bg-yellow-900">
                            {part}
                          </mark>
                        ) : (
                          part
                        )
                      )}
                    </p>
                  </button>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  未找到匹配的消息
                </div>
              )}
            </div>
          )}
          {!searchQuery && (
            <div className="text-center text-muted-foreground py-8">
              输入关键词搜索消息
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
