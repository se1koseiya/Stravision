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
import { toast } from "@/lib/ui/feedback"
import type { UserPublic, UserRole } from "@/lib/db/user-service"
import { IconAddUser, IconClose, IconPlus, IconShield, IconUser } from "@/components/icon";
import { useMaterialCss } from "@/components/device/immersive-card"

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
  /* 弹窗由 radix portal 到 body —— 拿不到页面容器的样式作用域，
     所以这里自己保证沉浸光感材质样式已注入（详见 useMaterialCss 的注释）。 */
  useMaterialCss()

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
      {/* 分组小标题：与「操作日志」同一套字阶（mon-group-title 定义在 monitor 页的材质样式里） */}
      <h3 className="mon-group-title text-zinc-500 dark:text-zinc-400 mb-3">成员</h3>
      <div className="flex items-center gap-4">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <div className="flex -space-x-2.5 cursor-pointer group">
              {loading ? (
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
              ) : displayMembers.length > 0 ? (
                displayMembers.map((member) => (
                  <Avatar key={member.id} className="border-2 border-white/85 dark:border-zinc-800 w-10 h-10 transition-transform group-hover:scale-105">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-cyan-500 text-white text-sm">
                      {member.username?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                ))
              ) : (
                <div className="text-sm text-zinc-400 dark:text-zinc-500">暂无成员</div>
              )}
            </div>
          </DialogTrigger>

          {canManageMembers ? (
            /* 「+ / +N」= 交互控件（允许的例外），走材质控件档：
               品牌色玻璃膜（.dc-ctrl--brand-soft 亮态配品牌墨绿字，暗态配亮绿字）——
               不再写「浅绿底 + 白描边」那种一次性配色，材质与全站控件是同一套。 */
            <Button
              size="icon"
              variant="ghost"
              className="dc-ctrl--brand-soft dc-ctrl--press rounded-full h-10 w-10 text-br-brand-ink"
              onClick={() => setDialogOpen(true)}
            >
              {remainingCount > 0 ? (
                <span className="font-bold text-xs">+{remainingCount}</span>
              ) : (
                <IconPlus className="w-4 h-4" />
              )}
            </Button>
          ) : remainingCount > 0 ? (
            <div className="dc-ctrl--ghost rounded-full h-10 w-10 flex items-center justify-center">
              <span className="font-bold text-xs text-zinc-500 dark:text-zinc-400">+{remainingCount}</span>
            </div>
          ) : null}

          {/* 弹层 = HDS ULTRA_THICK 档（规范里「菜单、对话框」归这一档，几乎不透明以保可读）。
              挂的两个类各管一件事：
                dc-mat          → 材质本体（低 alpha 半透明底 + backdrop 模糊 + 1px 受光边 + 边缘光）
                dc-mat--ultra   → 只声明 --mat-* 变量（64px 模糊 / alpha .62）
              两者都是**未分层**样式，会盖掉 DialogContent 自带的 bg-background / border /
              shadow-lg —— 那三样正是「一块不透明白板」的来源。
              ⚠️ 遮罩同理要调轻：原来的 bg-black/80 把背后压成近黑，磨砂材质无光可透，
                 等于白挂。这里改 25% + 轻模糊：背景仍看得清轮廓（沉浸），弹层才有背景可糊。
                 通过新增的 overlayClassName 传入 —— 不传时全站既有 Dialog 行为不变。 */}
          <DialogContent
            className="dc-mat dc-mat--ultra mon-float sm:max-w-md"
            overlayClassName="mon-float-overlay"
          >
            <DialogHeader>
              <DialogTitle>成员管理</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* 成员列表 */}
              {/* 成员列表：行与行之间只用 hairline 分隔（.mon-sep 同族的 divide），
                  不给每行铺灰底块 —— 弹层里再套一叠圆角块就是「矩形套矩形」。 */}
              <div className="max-h-64 overflow-y-auto divide-y divide-zinc-900/8 dark:divide-white/10">
                {members.map((member) => {
                  const RoleIcon = ROLE_ICONS[member.role]
                  return (
                    <div key={member.id} className="flex items-center justify-between py-2.5">
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
                          className="dc-ctrl--press h-8 w-8 text-muted-foreground hover:text-red-500"
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
                <div className="pt-4 border-t border-zinc-900/8 dark:border-white/10">
                  <Label className="text-sm font-medium mb-2 block">添加新成员</Label>
                  <div className="flex gap-2">
                    {/* 输入框 = 控件档（.dc-ctrl--field）：压在弹层材质之上，alpha 比弹层更低，
                        让弹层的色光继续透上来 —— 而不是铺一块死白片（截图里那个白输入框）。
                        ⚠️ focus 环必须走 outline：Input 自带的 focus-visible:ring-[3px] 是
                           box-shadow 通道，会被材质的 box-shadow 整条覆盖（ring 会直接消失）。 */}
                    <Input
                      type="email"
                      placeholder="输入用户邮箱"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                      className="dc-ctrl--field h-10 text-sm focus-visible:ring-0 focus-visible:border-transparent focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-primary/40 focus-visible:outline-offset-2"
                    />
                    {/* 主按钮 = 品牌色 CTA 档：光放在**边缘与外部**（上缘 1px 受光 + 品牌色外发光），
                        填充保持接近实底 —— 白字对比度不因降 alpha 而垮掉。 */}
                    <Button
                      onClick={handleAddMember}
                      disabled={addingMember}
                      className="dc-ctrl--brand dc-ctrl--press shrink-0 h-10 rounded-[10px] text-white"
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
