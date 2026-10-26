"use client"

import { useEffect, useState } from "react"
import { Modal, Input, Button } from "antd"
import { toast } from "@/lib/ui/feedback"
import { chatClient } from "@/lib/chat/chat-client"
import { IconClose, IconSearch } from "@/components/icon";

interface AddFriendDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSent?: () => void
}

/**
 * 添加好友弹窗（蓝聊设计稿严格复刻 - 图3左上）
 *
 * 结构：
 * - 标题"添加好友" + 右上角 X 关闭
 * - 浅灰圆角搜索框（放大镜 + 占位"输入手机号或账号"）
 * - 底部按钮：蓝色渐变"确定"（左）+ 浅灰"取消"（右）
 */
export function AddFriendDialog({ open, onOpenChange, onSent }: AddFriendDialogProps) {
  const [identifier, setIdentifier] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) setIdentifier("")
  }, [open])

  const handleSubmit = async () => {
    const trimmed = identifier.trim()
    if (!trimmed) {
      toast.error("请输入手机号或账号")
      return
    }
    setSubmitting(true)
    const r = await chatClient.sendFriendRequest(trimmed)
    setSubmitting(false)

    if (r.ok) {
      toast.success(r.message || "请求已发送")
      onOpenChange(false)
      onSent?.()
    } else {
      toast.error(r.error || "发送请求失败")
    }
  }

  return (
    <Modal
      open={open}
      onCancel={() => onOpenChange(false)}
      footer={null}
      destroyOnClose
      width={420}
      centered
      closable={false}
      styles={{
        container: { padding: 0, borderRadius: 10, overflow: "hidden", boxShadow: "var(--br-shadow-lg)" },
        body: { padding: 0 }
      }}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <h3 className="text-[16px] text-br-text-1" style={{ fontWeight: 500 }}>
          添加好友
        </h3>
        <button
          onClick={() => onOpenChange(false)}
          className="size-7 flex items-center justify-center rounded-full text-br-text-3 hover:text-br-text-1 hover:bg-br-surface-3 transition-colors"
        >
          <IconClose size={18} strokeWidth={2} />
        </button>
      </div>

      {/* 输入区 */}
      <div className="px-6 pb-5">
        <Input
          size="large"
          prefix={<IconSearch size={16} strokeWidth={2} className="text-br-text-3 mr-1" />}
          placeholder="输入手机号或账号"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          onPressEnter={() => !submitting && handleSubmit()}
          autoFocus
          className="!rounded-lg !bg-br-surface-3 !border-0 hover:!bg-br-surface-4 !text-[14px] !h-10"
        />
      </div>

      {/* 按钮区 */}
      <div className="flex items-center justify-center gap-3 px-6 pb-5">
        <Button
          size="large"
          loading={submitting}
          className="!w-[120px] !h-9 !rounded-lg !border-0 !font-medium !text-white !shadow-sm"
          style={{ background: "var(--br-brand)" }}
          onClick={handleSubmit}
        >
          确定
        </Button>
        <Button
          size="large"
          className="!w-[120px] !h-9 !rounded-lg !bg-br-surface-3 !border-0 !text-br-text-1 hover:!bg-br-surface-4 hover:!text-br-text-1"
          onClick={() => onOpenChange(false)}
        >
          取消
        </Button>
      </div>
    </Modal>
  )
}
