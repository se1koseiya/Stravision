"use client";

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { UserPublic } from "@/lib/db/user-service"
import {
  User, Sun, Moon, Shield, LogOut, ExternalLink, ChevronRight,
  Sprout, GraduationCap, Cog, Check, Settings, Info, X,
} from "lucide-react"

type SettingsTab = "general" | "about"

const VOICE_SETTINGS_KEY = 'xiaozhi-voice-settings'

export interface VoiceSettings {
  enabled: boolean
  voice: string
  readAloud: boolean
}

export function getVoiceSettings(): VoiceSettings {
  if (typeof window === 'undefined') return { enabled: true, voice: 'Tina', readAloud: true }
  try {
    const saved = localStorage.getItem(VOICE_SETTINGS_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // 旧 TTS 音色（Mochi/Cherry/Chelsie）Omni 实时模型不支持，迁移到 Tina
      const v = parsed.voice
      const migratedVoice = !v || ['Mochi', 'Cherry', 'Chelsie'].includes(v) ? 'Tina' : v
      return { enabled: parsed.enabled ?? true, voice: migratedVoice, readAloud: parsed.readAloud ?? true }
    }
  } catch { }
  return { enabled: true, voice: 'Tina', readAloud: true }
}

export function saveVoiceSettings(settings: VoiceSettings) {
  if (typeof window === 'undefined') return
  localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(settings))
}

interface AISettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: UserPublic | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 外部调用方传入的聚合设置对象，保持既有契约
  onSave?: (settings: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 同上
  onVoiceSettingsChange?: (settings: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 同上
  voiceSettings?: any
  /** 当前选中的 AI 角色 id */
  persona?: string
  /** 角色切换回调 */
  onPersonaChange?: (personaId: string) => void
}

/** AI 角色定义（与后端 persona-system.ts 对齐） */
const AI_PERSONAS = [
  { id: 'expert', name: '草莓种植专家', tagline: '农艺师视角 · 数据驱动 · 深度专业', Icon: Sprout },
  { id: 'friendly', name: '新手友好向导', tagline: '通俗易懂 · 循序渐进 · 手把手教', Icon: GraduationCap },
  { id: 'engineer', name: '智慧农业工程师', tagline: '系统视角 · 设备联动 · 自动化优先', Icon: Cog },
] as const

export function AISettingsDialog({ open, onOpenChange, user, persona = 'expert', onPersonaChange }: AISettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general")
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("darkMode") === "true" || document.documentElement.classList.contains("dark")
    return false
  })

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 打开时从 DOM 同步外部状态
    setDarkMode(document.documentElement.classList.contains("dark"))
  }, [open])

  const toggleDarkMode = () => {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem("darkMode", String(next))
    if (next) document.documentElement.classList.add("dark")
    else document.documentElement.classList.remove("dark")
  }

  const maskEmail = (email: string): string => {
    if (!email || !email.includes("@")) return email
    const [local, domain] = email.split("@")
    if (local.length <= 2) return `${local[0]}***@${domain}`
    return `${local[0]}${"*".repeat(local.length - 2)}${local.slice(-1)}@${domain}`
  }

  const currentPersona = AI_PERSONAS.find(p => p.id === persona)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 overflow-hidden gap-0 border-none shadow-2xl rounded-t-2xl sm:rounded-2xl [&>button]:hidden w-full max-h-[85dvh] sm:max-w-[760px] sm:h-[620px] left-0 bottom-0 top-auto translate-x-0 translate-y-0 sm:left-[50%] sm:top-[50%] sm:bottom-auto sm:translate-x-[-50%] sm:translate-y-[-50%]"
        style={{ background: "#fff" }}
      >
        <DialogTitle className="sr-only">AI 助手设置</DialogTitle>
        <div className="flex flex-col sm:flex-row h-full">
          {/* 手机端顶部拖拽指示条 */}
          <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0 bg-[#fafafa]">
            <div className="w-9 h-1 rounded-full bg-black/15" />
          </div>

          {/* ===== 导航栏（手机端顶部横向 / PC端左侧纵向） ===== */}
          <nav className="flex sm:flex-col flex-row items-center sm:items-stretch gap-1 sm:gap-0.5 px-3 sm:px-3 py-2 sm:py-4 bg-[#fafafa] border-b sm:border-b-0 sm:border-r border-[#e9e9ec] shrink-0 sm:w-[176px]">
            <div className="hidden sm:block px-2 pb-3 text-[12px] font-medium text-zinc-400">设置</div>

            <NavItem active={activeTab === "general"} onClick={() => setActiveTab("general")} icon={<Settings className="w-[15px] h-[15px]" strokeWidth={1.6} />}>
              通用
            </NavItem>
            <NavItem active={activeTab === "about"} onClick={() => setActiveTab("about")} icon={<Info className="w-[15px] h-[15px]" strokeWidth={1.6} />}>
              关于
            </NavItem>

            {/* 手机端关闭按钮 */}
            <button
              onClick={() => onOpenChange(false)}
              className="sm:hidden ml-auto flex items-center justify-center w-8 h-8 rounded-md border-none bg-transparent text-zinc-400 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </nav>

          {/* ===== 右侧内容区 ===== */}
          <div className="flex-1 flex flex-col bg-white min-h-0">
            {/* 标题行 */}
            <div className="flex items-center justify-between h-[52px] pr-4 pl-5 sm:pl-7 shrink-0">
              <h2 className="text-[15px] font-medium text-zinc-900">
                {activeTab === "general" ? "通用" : "关于"}
              </h2>
              <button
                onClick={() => onOpenChange(false)}
                className="hidden sm:flex w-7 h-7 items-center justify-center rounded-md border-none bg-transparent text-zinc-400 hover:text-zinc-700 hover:bg-[#f4f4f5] cursor-pointer transition-all duration-150 active:scale-90"
                aria-label="关闭"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            {/* ---- 通用 Tab ---- */}
            {activeTab === "general" && (
              <div className="flex-1 overflow-y-auto px-5 sm:px-7 pb-7 space-y-6">
                {/* 账户 */}
                <div className="flex items-center gap-3.5 pt-1 animate-in fade-in-0 duration-200">
                  <div className="w-12 h-12 rounded-full bg-[#f4f4f5] flex items-center justify-center shrink-0 overflow-hidden">
                    {user?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-[20px] h-[20px] text-zinc-400" strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-medium text-zinc-900 truncate">{user?.username || "用户"}</div>
                    <div className="text-[12px] text-zinc-400 mt-0.5 tabular-nums">莓小智号 {user?.uid || "---"}</div>
                  </div>
                </div>

                {/* 账户设置 */}
                <section className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200 delay-[40ms]">
                  <GroupTitle>账户</GroupTitle>
                  <Card>
                    <SettingRow
                      icon={<User className="w-[15px] h-[15px]" strokeWidth={1.6} />}
                      label="账号信息"
                      value={maskEmail(user?.email || "")}
                    />
                    <SettingRow
                      icon={darkMode
                        ? <Moon className="w-[15px] h-[15px]" strokeWidth={1.6} />
                        : <Sun className="w-[15px] h-[15px]" strokeWidth={1.6} />}
                      label="主题色彩"
                      value={darkMode ? "深色" : "浅色"}
                      onClick={toggleDarkMode}
                    />
                    <SettingRow
                      icon={<Shield className="w-[15px] h-[15px]" strokeWidth={1.6} />}
                      label="隐私与权限"
                    />
                  </Card>
                </section>

                {/* AI 助手角色 */}
                <section className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200 delay-[80ms]">
                  <GroupTitle>AI 助手角色</GroupTitle>
                  <Card>
                    <div className="p-3.5">
                      <div className="grid grid-cols-3 gap-2.5">
                        {AI_PERSONAS.map(p => {
                          const isCurrent = p.id === persona
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => onPersonaChange?.(p.id)}
                              className={cn(
                                "relative flex flex-col items-center gap-2.5 rounded-[10px] border bg-white px-3 py-4 cursor-pointer transition-all duration-150 active:scale-[0.98]",
                                isCurrent
                                  ? "border-[#1677ff]"
                                  : "border-[#e9e9ec] hover:border-[#d4d4d8] hover:bg-[#fafafa] hover:-translate-y-px"
                              )}
                            >
                              {isCurrent && (
                                <Check className="absolute top-2 right-2 w-3.5 h-3.5 text-[#1677ff] animate-in zoom-in-50 fade-in-0 duration-150" strokeWidth={2.5} />
                              )}
                              <p.Icon
                                className={cn("w-[18px] h-[18px] transition-colors", isCurrent ? "text-zinc-800" : "text-zinc-400")}
                                strokeWidth={1.6}
                              />
                              <span className={cn(
                                "text-[12px] leading-tight text-center transition-colors",
                                isCurrent ? "text-zinc-900 font-medium" : "text-zinc-600"
                              )}>
                                {p.name}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                      <p key={persona} className="mt-3 px-0.5 text-[12px] leading-relaxed text-zinc-400 animate-in fade-in-0 duration-150">
                        {currentPersona?.tagline || '选择不同视角的 AI 专家，回答风格会有明显差异'}
                      </p>
                    </div>
                  </Card>
                </section>

                {/* 退出登录 */}
                <section className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200 delay-[120ms]">
                  <Card>
                    <SettingRow
                      icon={<LogOut className="w-[15px] h-[15px]" strokeWidth={1.6} />}
                      label="退出登录"
                      danger
                      hasArrow={false}
                      onClick={() => { localStorage.removeItem("token"); window.location.href = "/login" }}
                    />
                  </Card>
                </section>
              </div>
            )}

            {/* ---- 关于 Tab ---- */}
            {activeTab === "about" && (
              <div className="flex-1 overflow-y-auto px-5 sm:px-7 pb-7 space-y-6">
                <section className="pt-1 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
                  <GroupTitle>协议与帮助</GroupTitle>
                  <Card>
                    <AboutLink label="服务协议" href="/terms" />
                    <AboutLink label="隐私协议" href="/privacy" />
                    <AboutLink label="侵权投诉指引" href="/help" />
                    <AboutLink label="使用政策" href="/terms" />
                    <AboutLink label="客服中心" href="/help" />
                  </Card>
                </section>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** 侧栏导航项 */
function NavItem({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center sm:justify-start gap-2 h-8 flex-1 sm:flex-none sm:w-full px-2.5 rounded-md border text-[13px] cursor-pointer transition-all duration-150 active:scale-[0.98]",
        active
          ? "bg-white border-[#e9e9ec] text-zinc-900 font-medium shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          : "bg-transparent border-transparent text-zinc-500 hover:bg-[#f0f0f2] hover:text-zinc-700"
      )}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

/** 分组小标题 */
function GroupTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 px-0.5 text-[12px] font-medium text-zinc-400">{children}</div>
}

/** 分组卡片容器 */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-[#e9e9ec] overflow-hidden bg-white">
      {children}
    </div>
  )
}

/** 设置行 */
function SettingRow({
  icon,
  label,
  value,
  hasArrow = true,
  danger = false,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value?: React.ReactNode
  hasArrow?: boolean
  danger?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "group flex w-full items-center gap-3 h-11 px-3.5 border-none bg-transparent text-left transition-colors duration-150",
        "[&+&]:border-t [&+&]:border-[#f4f4f5]",
        onClick ? "cursor-pointer active:bg-[#f4f4f5]" : "cursor-default",
        danger ? "hover:bg-[#fef2f2]" : "hover:bg-[#fafafa]"
      )}
    >
      <span className={cn(
        "shrink-0 flex items-center transition-colors duration-150",
        danger ? "text-[#e5484d]" : "text-zinc-400 group-hover:text-zinc-500"
      )}>
        {icon}
      </span>
      <span className={cn("flex-1 text-[13px]", danger ? "text-[#e5484d]" : "text-zinc-800")}>{label}</span>
      {value != null && value !== "" && (
        <span className="shrink-0 text-[12px] text-zinc-400 tabular-nums truncate max-w-[200px]">{value}</span>
      )}
      {hasArrow && (
        <ChevronRight
          className="w-3.5 h-3.5 shrink-0 text-zinc-300 transition-transform duration-150 group-hover:translate-x-0.5"
          strokeWidth={1.75}
        />
      )}
    </button>
  )
}

/** 关于链接行 */
function AboutLink({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      className="group flex w-full items-center justify-between h-11 px-3.5 no-underline transition-colors duration-150 hover:bg-[#fafafa] active:bg-[#f4f4f5] [&+&]:border-t [&+&]:border-[#f4f4f5]"
      style={{ color: "inherit" }}
    >
      <span className="text-[13px] text-zinc-800">{label}</span>
      <ExternalLink className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-400 transition-all duration-150 group-hover:translate-x-px group-hover:-translate-y-px" strokeWidth={1.6} />
    </a>
  )
}