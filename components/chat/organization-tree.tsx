"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Tooltip } from "antd"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { chatClient } from "@/lib/chat/chat-client"
import type { ChatOrganization } from "@/lib/chat/chat-types"
import { CreateOrganizationDialog } from "./create-organization-dialog"
import { IconBuildingFour, IconDelete, IconDown, IconNetworkTree, IconPeoples, IconPlus, IconRefresh, IconRight } from "@/components/icon";

const ICON_STROKE = 1.75

interface OrganizationTreeProps {
  /** 当前选中的组织 id（高亮显示） */
  selectedOrgId?: number | null
  /** 点击组织节点回调（用于在右侧详情面板展示） */
  onSelectOrg?: (org: ChatOrganization) => void
  /** 当前登录用户角色（用于 admin 按钮显隐） */
  currentUserRole?: string
}

/**
 * 组织架构树（用于 chat-sidebar 通讯录 → 组织架构 tab 的 260px 列）
 *
 * 视觉（蓝聊风格）：
 * - 顶部：管理员可见的「创建组织架构」入口（与群聊列表的「发起群聊」对齐）
 * - 树形列表（支持展开/折叠、点击选中）
 * - 空状态：暂无组织架构
 */
export function OrganizationTree({
  selectedOrgId,
  onSelectOrg,
  currentUserRole
}: OrganizationTreeProps) {
  const isAdmin = currentUserRole === "admin" || currentUserRole === "super_admin"
  const [organizations, setOrganizations] = useState<ChatOrganization[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [syncingId, setSyncingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const fetchOrganizations = useCallback(async () => {
    setLoading(true)
    const r = await chatClient.listOrganizations()
    setLoading(false)
    if (r.ok && r.organizations) {
      setOrganizations(r.organizations)
      // 默认展开所有顶级节点
      setExpandedIds(prev => {
        const next = new Set(prev)
        r.organizations!.forEach(o => {
          if (o.parent_id === null) next.add(o.id)
        })
        return next
      })
    } else if (!r.ok) {
      toast.error(r.error || "获取组织列表失败")
    }
  }, [])

  useEffect(() => {
    fetchOrganizations()
  }, [fetchOrganizations])

  // 构建树形结构
  const tree = useMemo(() => {
    const map = new Map<number, ChatOrganization & { children: ChatOrganization[] }>()
    organizations.forEach(o => map.set(o.id, { ...o, children: [] }))
    const roots: (ChatOrganization & { children: ChatOrganization[] })[] = []
    organizations.forEach(o => {
      const node = map.get(o.id)!
      if (o.parent_id && map.has(o.parent_id)) {
        map.get(o.parent_id)!.children.push(node)
      } else {
        roots.push(node)
      }
    })
    return roots
  }, [organizations])

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSync = async (org: ChatOrganization) => {
    setSyncingId(org.id)
    const r = await chatClient.syncOrganizationMembers(org.id)
    setSyncingId(null)
    if (r.ok) {
      toast.success(r.message || "同步完成")
      fetchOrganizations()
    } else {
      toast.error(r.error || "同步失败")
    }
  }

  const handleDelete = async (org: ChatOrganization) => {
    if (!window.confirm(`确定删除组织「${org.name}」？该操作会连同所有子组织和成员关系一并删除。`)) {
      return
    }
    setDeletingId(org.id)
    const r = await chatClient.deleteOrganization(org.id)
    setDeletingId(null)
    if (r.ok) {
      toast.success(r.message || "组织已删除")
      fetchOrganizations()
    } else {
      toast.error(r.error || "删除失败")
    }
  }

  const renderNode = (
    node: ChatOrganization & { children: ChatOrganization[] },
    depth: number
  ) => {
    const hasChildren = node.children.length > 0
    const expanded = expandedIds.has(node.id)
    const isSelected = selectedOrgId === node.id
    const indent = depth * 16

    return (
      <div key={node.id}>
        <div
          className={cn(
            "group flex items-center gap-1.5 pr-2 pl-1 py-2 cursor-pointer transition-colors",
            isSelected
              ? "bg-[#f0f2f5]"
              : "hover:bg-black/[0.03]"
          )}
          style={{ paddingLeft: 8 + indent }}
          onClick={() => onSelectOrg?.(node)}
        >
          {/* 展开/折叠 */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleExpand(node.id)
              }}
              className="size-5 shrink-0 flex items-center justify-center text-[rgba(0,0,0,0.45)] hover:text-[rgba(0,0,0,0.75)]"
            >
              {expanded
                ? <IconDown size={14} strokeWidth={1.75} />
                : <IconRight size={14} strokeWidth={1.75} />}
            </button>
          ) : (
            <span className="size-5 shrink-0" />
          )}

          {/* 图标 */}
          <span
            className={cn(
              "size-7 rounded-md flex items-center justify-center shrink-0",
              depth === 0
                ? "bg-[#f0f5ff] text-[#2f54eb]"
                : "bg-[#fafafa] text-[rgba(0,0,0,0.55)]"
            )}
          >
            <IconBuildingFour size={15} strokeWidth={1.75} />
          </span>

          {/* 名称 */}
          <div className="flex-1 min-w-0">
            <div className="text-[14px] text-[rgba(0,0,0,0.88)] truncate" style={{ fontWeight: 400 }}>
              {node.name}
            </div>
          </div>

          {/* 成员数 */}
          <span className="text-[11px] text-[rgba(0,0,0,0.4)] shrink-0 flex items-center gap-1">
            <IconPeoples size={11} strokeWidth={1.75} />
            {node.member_count ?? 0}
          </span>

          {/* 管理员操作按钮（hover 显示） */}
          {isAdmin && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Tooltip title="同步现有大棚成员到本组织">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSync(node)
                  }}
                  disabled={syncingId === node.id}
                  className="size-6 flex items-center justify-center text-[rgba(0,0,0,0.45)] hover:text-[#1677ff] disabled:opacity-50"
                >
                  <IconRefresh size={12} strokeWidth={1.75} className={syncingId === node.id ? "animate-spin" : ""} />
                </button>
              </Tooltip>
              <Tooltip title="删除组织">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(node)
                  }}
                  disabled={deletingId === node.id}
                  className="size-6 flex items-center justify-center text-[rgba(0,0,0,0.45)] hover:text-[#ff4d4f] disabled:opacity-50"
                >
                  <IconDelete size={12} strokeWidth={1.75} />
                </button>
              </Tooltip>
            </div>
          )}
        </div>

        {/* 子节点 */}
        {hasChildren && expanded && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="py-1">
      {/* 顶部：创建组织按钮（管理员可见，与群聊列表的「发起群聊」对齐） */}
      {isAdmin && (
        <button
          onClick={() => setCreateOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-black/[0.03] transition-colors"
        >
          <span className="size-9 rounded-full bg-[#f0f5ff] flex items-center justify-center text-[#2f54eb]">
            <IconPlus size={18} strokeWidth={ICON_STROKE} />
          </span>
          <span className="text-[14px] text-[rgba(0,0,0,0.7)]">创建组织架构</span>
        </button>
      )}

      {/* 树形列表 */}
      {loading ? (
        <div className="flex items-center justify-center text-[13px] text-[rgba(0,0,0,0.35)] py-8">
          加载中...
        </div>
      ) : tree.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-[13px] text-[rgba(0,0,0,0.35)] py-16">
          <IconNetworkTree size={28} strokeWidth={1.5} className="mb-2 opacity-40" />
          <span>暂无组织架构</span>
          {isAdmin && (
            <span className="text-[11px] text-[rgba(0,0,0,0.3)] mt-1">
              点击上方按钮创建第一个组织
            </span>
          )}
        </div>
      ) : (
        <div>
          {tree.map(node => renderNode(node, 0))}
        </div>
      )}

      {/* 创建组织对话框 */}
      <CreateOrganizationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        organizations={organizations}
        onCreated={fetchOrganizations}
      />
    </div>
  )
}

/**
 * 组织成员角色标签
 */
export const ORG_ROLE_LABELS: Record<string, string> = {
  owner: "所有者",
  admin: "管理员",
  member: "成员",
  super_admin: "超级管理员"
}
