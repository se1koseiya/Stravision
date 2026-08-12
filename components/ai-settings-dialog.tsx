"use client";

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Settings as SettingsIcon } from "@/components/animate-ui/icons/settings"
import { InfoCircleOutlined } from '@ant-design/icons'
import { Select, Switch, Slider, ConfigProvider } from 'antd'
import { cn } from "@/lib/utils"
import type { UserPublic } from "@/lib/db/user-service"
import { Smartphone, Sun, Shield, LogOut, ExternalLink, ChevronRight, Sprout, GraduationCap, Cog, Check, Mic, SlidersHorizontal } from "lucide-react"
import { getVoiceConfig, saveVoiceConfig, type VoiceConfig } from "@/lib/voice"

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
  // 语音配置（架构 / 音色 / 朗读 / VAD 参数），与 @/lib/voice 配置层同步
  const [voiceCfg, setVoiceCfg] = useState<VoiceConfig>(() => getVoiceConfig())

  useEffect(() => {
    if (!open) return
    setDarkMode(document.documentElement.classList.contains("dark"))
    setVoiceCfg(getVoiceConfig())
  }, [open])

  const updateVoiceCfg = (partial: Partial<VoiceConfig>) => {
    const next = saveVoiceConfig(partial)
    setVoiceCfg(next)
  }
  const updateVad = (partial: Partial<VoiceConfig["vad"]>) => {
    setVoiceCfg((prev) => {
      const merged = { ...prev, vad: { ...prev.vad, ...partial } }
      saveVoiceConfig({ vad: merged.vad })
      return merged
    })
  }

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
                  <div className="border-t border-[#f0f0f0] my-3" />

                  {/* AI 助手角色选择 */}
                  <div className="py-2">
                    <div className="flex items-center justify-between px-1 mb-3">
                      <div className="flex items-center gap-2">
                        <Cog size={15} strokeWidth={1.5} className="text-[#888]" />
                        <span className="text-[14px] text-[#1a1a1a]">AI 助手角色</span>
                      </div>
                      <span className="text-[11px] text-[#bbb]">切换回答风格</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {AI_PERSONAS.map(p => {
                        const isCurrent = p.id === persona
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => onPersonaChange?.(p.id)}
                            className={cn(
                              "relative flex flex-col items-center gap-2 rounded-xl border px-2 py-3 transition-all",
                              isCurrent
                                ? "border-[#1677ff] bg-[#1677ff]/[0.04]"
                                : "border-[#ececec] hover:border-[#1677ff]/40 hover:bg-[#fafafa]"
                            )}
                          >
                            {isCurrent && (
                              <span className="absolute top-1.5 right-1.5">
                                <Check size={11} strokeWidth={2.5} className="text-[#1677ff]" />
                              </span>
                            )}
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                              style={{ background: isCurrent ? '#1677ff' : '#f0efec' }}
                            >
                              <p.Icon
                                size={17}
                                strokeWidth={1.75}
                                className={isCurrent ? "text-white" : "text-[#888]"}
                              />
                            </div>
                            <span className={cn(
                              "text-[12px] font-medium text-center leading-tight",
                              isCurrent ? "text-[#1677ff]" : "text-[#555]"
                            )}>
                              {p.name}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-[11.5px] text-[#aaa] mt-2 px-1 leading-relaxed">
                      {AI_PERSONAS.find(p => p.id === persona)?.tagline || '选择不同视角的 AI 专家，回答风格会有明显差异'}
                    </p>
                  </div>

                  {/* 分隔线 */}
                  <div className="border-t border-[#f0f0f0] my-3" />

                  {/* ===== 语音助手配置 ===== */}
                  <ConfigProvider
                    theme={{
                      token: {
                        colorPrimary: "#1677ff",
                        borderRadius: 8,
                        colorText: "#1a1a1a",
                        colorTextSecondary: "#888",
                        fontSize: 13,
                      },
                    }}
                  >
                    <div className="py-2">
                      <div className="flex items-center justify-between px-1 mb-3">
                        <div className="flex items-center gap-2">
                          <Mic size={15} strokeWidth={1.75} className="text-[#888]" />
                          <span className="text-[14px] text-[#1a1a1a]">语音助手</span>
                        </div>
                        <span className="text-[11px] text-[#bbb]">架构与参数</span>
                      </div>

                      {/* 架构模式（纯 Omni） */}
                      <div className="px-1 mb-3">
                        <div className="text-[12px] text-[#888] mb-1.5">识别架构</div>
                        <div
                          className="flex items-center rounded-lg border border-[#1677ff33] bg-[#1677ff14] px-3"
                          style={{ height: 32 }}
                        >
                          <span className="text-[12px] font-medium text-[#1677ff]">一体化 Omni</span>
                        </div>
                        <p className="text-[11px] text-[#bbb] mt-1.5 leading-relaxed">
                          麦克风 → WebSocket → Qwen-Omni-Realtime 实时模型 → PCM 播放（低延迟、支持语音打断）
                        </p>
                      </div>

                      {/* 音色 + 自动朗读 */}
                      <div className="grid grid-cols-2 gap-3 px-1 mb-3">
                        <div>
                          <div className="text-[12px] text-[#888] mb-1.5">Omni 音色</div>
                          <Select
                            value={voiceCfg.voice}
                            onChange={(v) => updateVoiceCfg({ voice: v })}
                            size="middle"
                            className="w-full"
                            options={[
                              { value: "Tina", label: "Tina（女声·温婉）" },
                              { value: "Cindy", label: "Cindy（女声·台湾口音）" },
                              { value: "Liora Mira", label: "Liora Mira（女声·温柔）" },
                              { value: "Sunnybobi", label: "Sunnybobi（女声·活泼）" },
                              { value: "Serena", label: "Serena（女声·专业）" },
                              { value: "Maia", label: "Maia（女声·知性）" },
                              { value: "Qiao", label: "Qiao（女声·甜美）" },
                              { value: "Ethan", label: "Ethan（男声·阳光）" },
                              { value: "Raymond", label: "Raymond（男声·清亮）" },
                              { value: "Theo Calm", label: "Theo Calm（男声·沉稳）" },
                              { value: "Harvey", label: "Harvey（男声·低沉）" },
                              { value: "Evan", label: "Evan（男声·青春）" },
                            ]}
                          />
                        </div>
                        <div>
                          <div className="text-[12px] text-[#888] mb-1.5">朗读 AI 回复</div>
                          <div
                            className="flex items-center justify-between rounded-lg border border-[#ececec] px-3"
                            style={{ height: 32 }}
                          >
                            <span className="text-[12px] text-[#555]">
                              {voiceCfg.readAloud ? "已开启" : "已关闭"}
                            </span>
                            <Switch
                              size="small"
                              checked={voiceCfg.readAloud}
                              onChange={(v) => updateVoiceCfg({ readAloud: v })}
                            />
                          </div>
                        </div>
                      </div>

                      {/* VAD 参数（Omni 架构由服务端 VAD 处理，此处不生效） */}
                      <div
                        className={cn(
                          "rounded-xl border border-[#f0f0f0] px-3 py-3 transition-opacity",
                          "opacity-40 pointer-events-none"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-1.5">
                            <SlidersHorizontal size={13} strokeWidth={1.75} className="text-[#888]" />
                            <span className="text-[12px] font-medium text-[#555]">VAD 语音活动检测</span>
                          </div>
                          <span className="text-[10px] text-[#bbb]">Omni 由服务端 VAD 处理</span>
                        </div>

                        <VadSlider
                          label="静音阈值"
                          hint="RMS 能量低于此值视为安静"
                          min={0.005}
                          max={0.2}
                          step={0.005}
                          value={voiceCfg.vad.silenceThreshold}
                          formatter={(v) => v!.toFixed(3)}
                          onChange={(v) => updateVad({ silenceThreshold: v })}
                        />
                        <VadSlider
                          label="静音断句时长"
                          hint="持续静音多久认为一句话结束"
                          min={300}
                          max={3000}
                          step={100}
                          value={voiceCfg.vad.silenceDurationMs}
                          formatter={(v) => `${v} ms`}
                          onChange={(v) => updateVad({ silenceDurationMs: v })}
                        />
                        <VadSlider
                          label="最短有效语音"
                          hint="短于此时长的语音视为噪声丢弃"
                          min={100}
                          max={1500}
                          step={50}
                          value={voiceCfg.vad.minSpeechMs}
                          formatter={(v) => `${v} ms`}
                          onChange={(v) => updateVad({ minSpeechMs: v })}
                        />
                        <VadSlider
                          label="最长单段时长"
                          hint="超过此时长强制断句"
                          min={5000}
                          max={60000}
                          step={1000}
                          value={voiceCfg.vad.maxSegmentMs}
                          formatter={(v) => `${(v as number) / 1000} s`}
                          onChange={(v) => updateVad({ maxSegmentMs: v })}
                        />

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#f5f5f5]">
                          <span className="text-[11.5px] text-[#888]">自适应噪声底（推荐开启）</span>
                          <Switch
                            size="small"
                            checked={voiceCfg.vad.adaptiveNoiseFloor}
                            onChange={(v) => updateVad({ adaptiveNoiseFloor: v })}
                          />
                        </div>
                      </div>
                    </div>
                  </ConfigProvider>

                  {/* 分隔线 */}
                  <div className="border-t border-[#f0f0f0] my-3" />

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

/** VAD 参数滑块行：标签 + 数值 + 滑块 + 说明 */
function VadSlider({
  label,
  hint,
  min,
  max,
  step,
  value,
  formatter,
  onChange,
}: {
  label: string
  hint: string
  min: number
  max: number
  step: number
  value: number
  formatter: (v: number | undefined) => string
  onChange: (v: number) => void
}) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[11.5px] text-[#555]">{label}</span>
        <span className="text-[11px] text-[#1677ff] tabular-nums">{formatter(value)}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        tooltip={false}
        style={{ marginBlock: 2 }}
      />
      <div className="text-[10.5px] text-[#bbb] leading-tight">{hint}</div>
    </div>
  )
}
