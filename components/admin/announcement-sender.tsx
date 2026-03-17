
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Send, Megaphone, Loader2 } from "lucide-react"

export function AnnouncementSender() {
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!content.trim()) {
      toast.error("请输入公告内容")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/admin/announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() })
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(data.message || "公告发送成功")
        setContent("")
      } else {
        toast.error(data.error || "发送失败")
      }
    } catch (error) {
      console.error(error)
      toast.error("发送失败，请检查网络")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl border-white/40 dark:border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-emerald-500" />
          发布系统公告
        </CardTitle>
        <CardDescription>
          以“莓小智”的身份向所有用户发送更新总结或通知。消息将直接出现在用户的聊天列表中。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="输入公告内容... (支持换行)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[200px] bg-white/50 dark:bg-black/20 resize-none focus-visible:ring-emerald-500"
        />
        <div className="flex justify-end">
          <Button 
            onClick={handleSend} 
            disabled={loading || !content.trim()}
            className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                发送中...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                立即发送
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
