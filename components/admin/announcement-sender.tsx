
"use client"

import { useState } from "react"
import { Card, Input, Button } from "antd"
import { toast } from "@/lib/ui/feedback"
import { IconCustomer, IconLoading, IconSend } from "@/components/icon";

const { TextArea } = Input

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
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconCustomer style={{ color: '#059669' }} />
          发布系统公告
        </div>
      }
      style={{ border: "1px solid #EDEEEF" }}
    >
      <div style={{ marginBottom: '16px' }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#8F959E' }}>
          以"莓小智"的身份向所有用户发送更新总结或通知。消息将直接出现在用户的聊天列表中。
        </p>
      </div>
      <TextArea
        placeholder="输入公告内容... (支持换行)"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        autoSize={{ minRows: 8, maxRows: 12 }}
        style={{ marginBottom: '16px', fontSize: '14px' }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="primary"
          onClick={handleSend}
          loading={loading}
          disabled={!content.trim()}
          icon={<IconSend />}
        >
          立即发送
        </Button>
      </div>
    </Card>
  )
}
