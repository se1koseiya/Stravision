"use client"

import { useEffect, useMemo, useState } from "react"
import { Modal, Input, Button, Select } from "antd"
import { toast } from "sonner"
import { chatClient } from "@/lib/chat/chat-client"
import type { ChatOrganization } from "@/lib/chat/chat-types"
import { IconNetworkTree, IconRight } from "@/components/icon";

interface CreateOrganizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 现有组织列表（用于父级选择） */
  organizations: ChatOrganization[]
  /** 预填的父级 id（点击某节点下的"新建子组织"时使用） */
  defaultParentId?: number | null
  onCreated?: () => void
}

/**
 * 创建组织架构对话框（蓝聊设计稿风格，参考 CreateGroupDialog）
 *
 * 视觉结构：
 * - 头部：图标 + 标题 + 副标题
 * - 组织名称输入（带字符计数）
 * - 上级组织选择（可选，支持层级关系）
 * - 描述（可选）
 * - 底部：取消 + 创建
 */
export function CreateOrganizationDialog({
  open,
  onOpenChange,
  organizations,
  defaultParentId,
  onCreated
}: CreateOrganizationDialogProps) {
  const [name, setName] = useState("")
  const [parentId, setParentId] = useState<number | null>(null)
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName("")
      setDescription("")
      setParentId(defaultParentId ?? null)
    }
  }, [open, defaultParentId])

  // 构建带层级缩进的选项列表
  const parentOptions = useMemo(() => {
    const map = new Map<number, ChatOrganization>()
    organizations.forEach(o => map.set(o.id, o))

    // 计算每个节点的深度（基于 parent_id 链）
    const depthOf = (org: ChatOrganization): number => {
      let depth = 0
      let cur: ChatOrganization | undefined = org
      const visited = new Set<number>()
      while (cur?.parent_id && !visited.has(cur.id)) {
        visited.add(cur.id)
        cur = map.get(cur.parent_id)
        depth++
        if (!cur) break
      }
      return depth
    }

    return organizations
      .map(o => ({
        value: o.id,
        label: `${"\u00A0\u00A0\u00A0\u00A0".repeat(depthOf(o))}${o.name}`,
        rawName: o.name
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "zh-CN"))
  }, [organizations])

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("请输入组织名称")
      return
    }
    setSubmitting(true)
    const r = await chatClient.createOrganization({
      name: trimmed,
      parentId,
      description: description.trim() || null
    })
    setSubmitting(false)

    if (r.ok) {
      toast.success(r.message || "组织创建成功")
      onOpenChange(false)
      onCreated?.()
    } else {
      toast.error(r.error || "创建组织失败")
    }
  }

  return (
    <Modal
      open={open}
      onCancel={() => onOpenChange(false)}
      footer={null}
      destroyOnHidden
      width={480}
      centered
      closable={false}
      styles={{
        content: { padding: 0, borderRadius: 12, overflow: "hidden" },
        body: { padding: 0 }
      }}
    >
      {/* 头部 */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <span className="size-10 rounded-xl bg-[#f0f5ff] flex items-center justify-center shrink-0">
            <IconNetworkTree size={20} strokeWidth={1.75} className="text-[#2f54eb]" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[16px] text-[rgba(0,0,0,0.88)]" style={{ fontWeight: 500 }}>
              创建组织架构
            </h3>
            <p className="text-[12px] text-[rgba(0,0,0,0.45)] mt-0.5">
              建立部门、团队节点，邀请成员加入后自动成为大棚成员并出现在通讯录
            </p>
          </div>
        </div>
      </div>

      <div className="h-px bg-black/[0.06]" />

      {/* 组织名称 */}
      <div className="px-6 pt-5">
        <label className="block text-[12px] text-[rgba(0,0,0,0.65)] mb-2" style={{ fontWeight: 500 }}>
          组织名称 <span className="text-[#ff4d4f]">*</span>
        </label>
        <Input
          size="large"
          placeholder="例如：种植部、技术组"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          showCount
          className="!rounded-lg"
        />
      </div>

      {/* 上级组织 */}
      <div className="px-6 pt-4">
        <label className="block text-[12px] text-[rgba(0,0,0,0.65)] mb-2" style={{ fontWeight: 500 }}>
          上级组织
        </label>
        <Select
          size="large"
          placeholder="作为顶级组织（无上级）"
          value={parentId ?? undefined}
          onChange={(v) => setParentId(v ?? null)}
          options={parentOptions}
          allowClear
          className="w-full !rounded-lg"
          style={{ width: "100%" }}
          notFoundContent="暂无其他组织"
          suffixIcon={<IconRight size={14} strokeWidth={1.75} className="text-[rgba(0,0,0,0.25)] rotate-90" />}
        />
        <p className="text-[11px] text-[rgba(0,0,0,0.35)] mt-1.5">
          可选。选择后将作为该上级组织的下级节点，形成层级关系。
        </p>
      </div>

      {/* 描述 */}
      <div className="px-6 pt-4 pb-5">
        <label className="block text-[12px] text-[rgba(0,0,0,0.65)] mb-2" style={{ fontWeight: 500 }}>
          描述（可选）
        </label>
        <Input.TextArea
          size="large"
          placeholder="例如：负责大棚日常种植管理与运维"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
          showCount
          autoSize={{ minRows: 2, maxRows: 4 }}
          className="!rounded-lg"
        />
      </div>

      <div className="h-px bg-black/[0.06]" />

      {/* 底部操作 */}
      <div className="px-6 py-3 flex items-center justify-end gap-2 bg-[#fafafa]">
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
          创建组织
        </Button>
      </div>
    </Modal>
  )
}
