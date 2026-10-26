"use client"

import { useEffect, useMemo, useState } from "react"
import { Modal, Input, Button, Avatar } from "antd"
import { toast } from "@/lib/ui/feedback"
import { cn } from "@/lib/utils"
import { chatClient } from "@/lib/chat/chat-client"
import type { ChatUser } from "@/lib/chat/chat-types"
import { IconAddUser, IconCheck, IconPeoples, IconSearch } from "@/components/icon";

interface CreateGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  friends: ChatUser[]
  onCreated?: () => void
}

/**
 * 创建群组对话框（蓝聊设计稿风格）
 *
 * 视觉结构：
 * - 头部：图标 + 标题 + 副标题
 * - 群组名称输入区
 * - 成员选择区：搜索 + 列表 + 选中计数
 * - 底部：取消 + 创建
 */
export function CreateGroupDialog({ open, onOpenChange, friends, onCreated }: CreateGroupDialogProps) {
  const [name, setName] = useState("")
  const [keyword, setKeyword] = useState("")
  const [selected, setSelected] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setName("")
      setKeyword("")
      setSelected([])
    }
  }, [open])

  const filteredFriends = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return friends
    return friends.filter(f => f.username.toLowerCase().includes(q) || f.email.toLowerCase().includes(q))
  }, [friends, keyword])

  const toggle = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("请输入群组名称")
      return
    }
    setSubmitting(true)
    const r = await chatClient.createGroup(name.trim(), selected)
    setSubmitting(false)

    if (r.ok) {
      toast.success("群组创建成功")
      onOpenChange(false)
      onCreated?.()
    } else {
      toast.error(r.error || "创建群组失败")
    }
  }

  return (
    <Modal
      open={open}
      onCancel={() => onOpenChange(false)}
      footer={null}
      destroyOnClose
      width={480}
      centered
      closable={false}
      styles={{
        container: { padding: 0, borderRadius: 12, overflow: "hidden" },
        body: { padding: 0 }
      }}
    >
      {/* 头部 */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <span className="size-10 rounded-xl bg-br-brand-soft flex items-center justify-center shrink-0">
            <IconPeoples size={20} strokeWidth={2} className="text-br-brand-ink" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[16px] text-br-text-1" style={{ fontWeight: 500 }}>
              创建群组
            </h3>
            <p className="text-[12px] text-br-text-2 mt-0.5">
              建立一个多人会话空间，邀请好友一起协作
            </p>
          </div>
        </div>
      </div>

      <div className="h-px bg-br-line" />

      {/* 群组名称 */}
      <div className="px-6 pt-5">
        <label className="block text-[12px] text-br-text-2 mb-2" style={{ fontWeight: 500 }}>
          群组名称
        </label>
        <Input
          size="large"
          placeholder="例如：项目研发组"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          showCount
          className="!rounded-lg"
        />
      </div>

      {/* 成员选择 */}
      <div className="px-6 pt-4 pb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-[12px] text-br-text-2" style={{ fontWeight: 500 }}>
            邀请成员
          </label>
          {selected.length > 0 && (
            <span className="text-[11px] text-br-brand-ink" style={{ fontWeight: 500 }}>
              已选 {selected.length} 人
            </span>
          )}
        </div>

        {/* 搜索框 */}
        <Input
          placeholder="搜索好友..."
          size="middle"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          prefix={<IconSearch size={14} strokeWidth={2} className="text-br-text-3" />}
          allowClear
          className="!rounded-lg mb-2"
        />

        {/* 列表 */}
        <div
          className="h-52 rounded-lg border border-br-line bg-br-surface-2 overflow-y-auto p-1"
          data-lenis-prevent
        >
          {friends.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[12px] text-br-text-3">
              <IconAddUser size={28} strokeWidth={2} className="mb-2 opacity-40" />
              <span>暂无好友可添加</span>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[12px] text-br-text-3">
              未找到匹配的好友
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredFriends.map(friend => {
                const checked = selected.includes(friend.id)
                return (
                  <label
                    key={friend.id}
                    className={cn(
                      "flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors",
                      checked
                        ? "bg-br-brand-soft"
                        : "hover:bg-br-surface-3"
                    )}
                  >
                    <span
                      className={cn(
                        "size-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors",
                        checked
                          ? "bg-br-brand border-br-brand"
                          : "bg-br-surface border-br-line-strong"
                      )}
                    >
                      {checked && <IconCheck size={11} strokeWidth={2.5} className="text-white" />}
                    </span>
                    <Avatar
                      size={28}
                      src={friend.avatar_url || undefined}
                      className="shrink-0"
                      style={{ backgroundColor: "var(--br-brand-soft)", color: "var(--br-brand-ink)" }}
                    >
                      {friend.username[0]?.toUpperCase()}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-br-text-1 truncate" style={{ fontWeight: 500 }}>
                        {friend.username}
                      </div>
                    </div>
                    {/* 隐藏原生 checkbox，但保留可访问性 */}
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggle(friend.id)}
                    />
                  </label>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-br-line" />

      {/* 底部操作 */}
      <div className="px-6 py-3 flex items-center justify-end gap-2 bg-br-surface-2">
        <Button
          size="middle"
          className="!rounded-lg"
          onClick={() => onOpenChange(false)}
        >
          取消
        </Button>
        <Button
          type="primary"
          size="middle"
          loading={submitting}
          className="!rounded-lg !shadow-none"
          onClick={handleCreate}
        >
          创建群组
        </Button>
      </div>
    </Modal>
  )
}
