"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Settings as SettingsIcon } from "@/components/animate-ui/icons/settings"
import { InfoCircleOutlined } from '@ant-design/icons'
import { cn } from "@/lib/utils"
import type { UserPublic } from "@/lib/db/user-service"
import { Smartphone, Sun, Shield, LogOut, ExternalLink, ChevronRight } from "lucide-react"

type SettingsTab = "general" | "about"

const VOICE_SETTINGS_KEY = 'xiaozhi-voice-settings'

export interface VoiceSettings {
  enabled: boolean
  voice: string
  readAloud: boolean
}

export function getVoiceSettings(): VoiceSettings {
  if (typeof window === 'undefined') return { enabled: true, voice: 'Mochi', readAloud: true }
  try {
    const saved = localStorage.getItem(VOICE_SETTINGS_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return { enabled: parsed.enabled ?? true, voice: parsed.voice || 'Mochi', readAloud: parsed.readAloud ?? true }
    }
  } catch { }
  return { enabled: true, voice: 'Mochi', readAloud: true }
}

export function saveVoiceSettings(settings: VoiceSettings) {
  if (typeof window === 'undefined') return
  localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(settings))
}

interface AISettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: UserPublic | null
  onSave?: (settings: any) => void
  onVoiceSettingsChange?: (settings: any) => void
  voiceSettings?: any
}

export function AISettingsDialog({ open, onOpenChange, user }: AISettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general")
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("darkMode") === "true" || document.documentElement.classList.contains("dark")
    return false
  })

  useEffect(() => {
    if (!open) return
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 overflow-hidden gap-0 border-none shadow-2xl rounded-t-2xl sm:rounded-2xl [&>button]:hidden w-full max-h-[85dvh] sm:max-w-[720px] left-0 bottom-0 top-auto translate-x-0 translate-y-0 sm:left-[50%] sm:top-[50%] sm:bottom-auto sm:translate-x-[-50%] sm:translate-y-[-50%]"
        style={{ background: "#fff" }}
      >
        <DialogTitle className="sr-only">AI 助手设置</DialogTitle>
        <div className="flex flex-col sm:flex-row h-full">
          {/* 手机端顶部拖拽指示条 */}
          <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0 bg-[#f7f6f3]">
            <div className="w-9 h-1 rounded-full bg-black/15" />
          </div>
          {/* ===== 导航栏（手机端顶部横向 / PC端左侧纵向） ===== */}
          <div className="flex sm:flex-col flex-row items-center sm:items-stretch gap-2 sm:gap-2 px-4 sm:px-4 pt-3 sm:pt-6 pb-2 sm:pb-4 bg-[#f7f6f3] border-b sm:border-b-0 sm:border-r border-black/5 shrink-0">
            <h2 className="text-[15px] font-semibold text-[#1a1a1a] sm:mb-5 sm:pl-1 hidden sm:block">设置</h2>

            {/* 通用 */}
            <button
              onClick={() => setActiveTab("general")}
              className="flex items-center justify-center sm:justify-start gap-2 px-4 sm:px-3 py-2 rounded-lg border-none cursor-pointer text-[13px] transition-all flex-1 sm:flex-none"
              style={{
                background: activeTab === "general" ? "#ebeae6" : "transparent",
                color: activeTab === "general" ? "#1a1a1a" : "#888",
                fontWeight: activeTab === "general" ? 500 : 400,
              }}
            >
              <SettingsIcon size={15} />
              <span>通用</span>
            </button>

            {/* 关于 */}
            <button
              onClick={() => setActiveTab("about")}
              className="flex items-center justify-center sm:justify-start gap-2 px-4 sm:px-3 py-2 rounded-lg border-none cursor-pointer text-[13px] transition-all flex-1 sm:flex-none"
              style={{
                background: activeTab === "about" ? "#ebeae6" : "transparent",
                color: activeTab === "about" ? "#1a1a1a" : "#888",
                fontWeight: activeTab === "about" ? 500 : 400,
              }}
            >
              <InfoCircleOutlined style={{ fontSize: 14 }} />
              <span>关于</span>
            </button>

            {/* 手机端关闭按钮 */}
            <button
              onClick={() => onOpenChange(false)}
              className="sm:hidden flex items-center justify-center w-9 h-9 rounded-lg border-none cursor-pointer text-[#888] text-xl bg-transparent"
            >
              ×
            </button>
          </div>

          {/* ===== 右侧内容区 ===== */}
          <div className="flex-1 flex flex-col bg-white relative min-h-0">
            {/* 关闭按钮 — PC端 */}
            <button
              onClick={() => onOpenChange(false)}
              className="hidden sm:flex absolute top-[18px] right-[18px] w-7 h-7 items-center justify-center rounded-md border-none cursor-pointer text-[#bbb] text-base bg-transparent transition-colors hover:text-[#666]"
            >
              ×
            </button>

            {/* ---- 通用 Tab ---- */}
            {activeTab === "general" && (
              <div className="flex-1 overflow-y-auto px-5 sm:px-9 pt-5 sm:pt-10 pb-6">
                {/* 用户信息 */}
                <div className="flex items-center gap-3.5 mb-8">
                  {/* 头像：浅灰底笑脸 */}
                  <div className="w-[52px] h-[52px] rounded-full bg-[#f0efec] flex items-center justify-center shrink-0 overflow-hidden">
                    {user?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span style={{ fontSize: 22 }}>☺</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[17px] font-medium text-[#1a1a1a] truncate">{user?.username || "用户"}</div>
                    <div className="text-xs text-[#bbb] mt-0.5">莓小智号：{user?.uid || "---"}</div>
                  </div>
                </div>

                {/* 设置项列表 */}
                <div className="flex flex-col">
                  <SettingRow
                    icon={<Smartphone size={15} strokeWidth={1.5} />}
                    label="账号信息"
                    value={maskEmail(user?.email || "")}
                  />

                  <SettingRow
                    icon={<Sun size={15} strokeWidth={1.5} />}
                    label="主题色彩"
                    value={
                      <span
                        onClick={(e) => { e.stopPropagation(); toggleDarkMode() }}
                        className="text-xs text-[#aaa] cursor-pointer flex items-center gap-1"
                      >
                        {darkMode ? "深色模式" : "浅色模式"}
                        <ChevronRight size={11} />
                      </span>
                    }
                  />

                  <SettingRow
                    icon={<Shield size={15} strokeWidth={1.5} />}
                    label="隐私与权限"
                  />

                  {/* 分隔线 */}
                  <div className="border-t border-[#f0f0f0] my-2" />

                  <SettingRow
                    icon={<LogOut size={15} strokeWidth={1.5} />}
                    label="退出登录"
                    onClick={() => { localStorage.removeItem("token"); window.location.href = "/login" }}
                  />
                </div>
              </div>
            )}

            {/* ---- 关于 Tab ---- */}
            {activeTab === "about" && (
              <div className="flex-1 overflow-y-auto px-5 sm:px-9 pt-5 sm:pt-10 pb-6">
                <div className="flex flex-col">
                  <AboutLink label="服务协议" href="/terms" />
                  <AboutLink label="隐私协议" href="/privacy" />
                  <AboutLink label="侵权投诉指引" href="/help" />
                  <AboutLink label="使用政策" href="/terms" />
                  <AboutLink label="客服中心" href="/help" />
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** 设置行 */
function SettingRow({
  icon,
  label,
  value,
  hasArrow = true,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value?: React.ReactNode
  hasArrow?: boolean
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 4px",
        cursor: onClick ? "pointer" : "default",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.background = "#fafafa" }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ color: "#bbb", width: 18, display: "flex", justifyContent: "center" }}>{icon}</span>
        <span style={{ fontSize: 14, color: "#333" }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#bbb", fontSize: 13 }}>
        {value && <span>{value}</span>}
        {hasArrow && <ChevronRight size={14} strokeWidth={1.5} />}
      </div>
    </div>
  )
}

/** 关于链接行 */
function AboutLink({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 4px", cursor: "pointer", textDecoration: "none",
        transition: "background 0.15s", color: "inherit",
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = "#fafafa"}
      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
    >
      <span style={{ fontSize: 14, color: "#333" }}>{label}</span>
      <ExternalLink size={13} strokeWidth={1.5} style={{ color: "#ddd" }} />
    </a>
  )
}
