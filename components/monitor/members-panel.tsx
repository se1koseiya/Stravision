"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import type { UserPublic, UserRole } from "@/lib/db/user-service"
import { IconAddUser, IconClose, IconPlus, IconShield, IconUser } from "@/components/icon";

interface MembersPanelProps {
  currentUser: UserPublic | null
  initialMembers?: UserPublic[]
}

const ROLE_LABELS: Record<UserRole, string> = {
  user: "普通用户",
  admin: "管理员",
  super_admin: "超级管理员"
}

const ROLE_ICONS: Record<UserRole, typeof IconUser> = {
  user: IconUser,
  admin: IconShield,
  super_admin: IconShield
}

export function MembersPanel({ currentUser, initialMembers = [] }: MembersPanelProps) {
  const [members, setMembers] = useState<UserPublic[]>(initialMembers)
  const [loading, setLoading] = useState(!initialMembers.length)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [addingMember, setAddingMember] = useState(false)
  const [email, setEmail] = useState("")

  const canManageMembers = currentUser?.role === "admin" || currentUser?.role === "super_admin"

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    try {
      const res = await fetch("/api/members")
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members || [])
      }
    } catch (error) {
      console.error("获取成员列表失败:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async () => {
    if (!email.trim()) {
      toast.error("请输入邮箱地址")
      return
    }

    setAddingMember(true)
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() })
      })

      const data = await res.json()

      if (res.ok) {
        toast.success("成员添加成功")
        setEmail("")
        setDialogOpen(false)
        fetchMembers()
      } else {
        toast.error(data.error || "添加失败")
      }
    } catch (error) {
      toast.error("添加成员失败")
    } finally {
      setAddingMember(false)
    }
  }

  const handleRemoveMember = async (memberId: number) => {
    if (!confirm("确定要移除该成员吗？")) return

    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "DELETE"
      })

      if (res.ok) {
        toast.success("成员已移除")
        fetchMembers()
      } else {
        const data = await res.json()
        toast.error(data.error || "移除失败")
      }
    } catch (error) {
      toast.error("移除成员失败")
    }
  }

  const displayMembers = members.slice(0, 6)
  const remainingCount = Math.max(0, members.length - 6)

  return (
    <div>
      <h3 className="text-muted-foreground dark:text-muted-foreground font-medium mb-4">成员</h3>
      <div className="flex items-center gap-4">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <div className="flex -space-x-3 cursor-pointer group">
              {loading ? (
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
              ) : displayMembers.length > 0 ? (
                displayMembers.map((member) => (
                  <Avatar key={member.id} className="border-2 border-white dark:border-slate-800 w-10 h-10 transition-transform group-hover:scale-105">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-cyan-500 text-white text-sm">
                      {member.username?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">暂无成员</div>
              )}
            </div>
          </DialogTrigger>

          {canManageMembers ? (
            <Button 
              size="icon" 
              variant="secondary" 
              className="rounded-full h-10 w-10 bg-emerald-100/80 text-emerald-700 hover:bg-emerald-100 border border-white/60 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 dark:border-emerald-800/50"
              onClick={() => setDialogOpen(true)}
            >
              {remainingCount > 0 ? (
                <span className="font-bold text-xs">+{remainingCount}</span>
              ) : (
                <IconPlus className="w-4 h-4" />
              )}
            </Button>
          ) : remainingCount > 0 ? (
            <div className="rounded-full h-10 w-10 bg-muted dark:bg-card flex items-center justify-center">
              <span className="font-bold text-xs text-muted-foreground">+{remainingCount}</span>
            </div>
          ) : null}

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>成员管理</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* 成员列表 */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {members.map((member) => {
                  const RoleIcon = ROLE_ICONS[member.role]
                  return (
                    <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-card/50">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-cyan-500 text-white text-sm">
                            {member.username?.charAt(0)?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium flex items-center gap-1.5">
                            {member.username}
                            {member.id === currentUser?.id && (
                              <span className="text-xs text-primary dark:text-emerald-400">(我)</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <RoleIcon className="w-3 h-3" />
                            {ROLE_LABELS[member.role]}
                          </div>
                        </div>
                      </div>
                      {/* 移除按钮逻辑：
                          - 不能移除自己
                          - 不能移除超级管理员
                          - 超级管理员可以移除管理员和普通用户
                          - 管理员只能移除普通用户
                      */}
                      {canManageMembers && 
                       member.id !== currentUser?.id && 
                       member.role !== "super_admin" &&
                       (currentUser?.role === "super_admin" || member.role === "user") && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-red-500"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <IconClose className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* 添加成员表单 - 仅管理员可见 */}
              {canManageMembers && (
                <div className="pt-4 border-t">
                  <Label className="text-sm font-medium mb-2 block">添加新成员</Label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="输入用户邮箱"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                    />
                    <Button 
                      onClick={handleAddMember} 
                      disabled={addingMember}
                      className="shrink-0"
                    >
                      <IconAddUser className="w-4 h-4 mr-1" />
                      添加
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    添加的成员将获得设备操作权限
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
