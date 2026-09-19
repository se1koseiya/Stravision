"use client";

/**
 * 设置弹窗（AISettingsDialog）
 *
 * 🚨 版式严格对齐 WorkBuddy 设置弹窗（用户 2026-09-19 明确要求）：
 *   ┌──────────────────────────────────────────────────────┐
 *   │ 设置                                      ×          │
 *   │ ┌──────────┬───────────────────────────────────────┐ │
 *   │ │ 通用     │ 通用                                  │ │  ← 右栏大标题
 *   │ │ 外观     │ 常规                                  │ │  ← 分组小标题（灰）
 *   │ │ ─功能─   │ ┌───────────────────────────────────┐ │ │
 *   │ │ 个性化   │ │ 语言          [简体中文 ▾]        │ │ │  ← 白卡片
 *   │ │ 记忆…    │ │ 字体大小      [———o———]           │ │ │
 *   │ │ 模型     │ └───────────────────────────────────┘ │ │
 *   │ └──────────┴───────────────────────────────────────┘ │
 *   └──────────────────────────────────────────────────────┘
 *   · 左栏灰底 + 分组小标题 + 选中项浅灰圆角块（无边框）
 *   · 右栏 = 大标题 + 分组小标题 + 白卡片；行 = 左标题/描述 + 右控件
 *   · 开关为绿色胶囊；右上角 × 关闭
 *
 * 分区：通用 / 外观 / 个性化 / 记忆与进化 / 模型 / 助理设置 / 数据管理 / 安全中心 / 关于
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTheme } from "next-themes"
import {
  App,
  Button,
  ConfigProvider,
  Drawer,
  Empty,
  Input,
  Modal,
  Select,
  Slider,
  Space,
  Switch,
  Tag,
  theme as antdTheme,
  Tooltip,
  Typography,
} from "antd"
import type { UserPublic } from "@/lib/db/user-service"
import { IS_DESKTOP_APP } from "@/lib/desktop-mode"
import { IconBackgroundColor, IconCertificate, IconClose, IconCloudStorage, IconDatabaseNetwork, IconDelete, IconDownload, IconEdit, IconEmotionHappy, IconExport, IconInfo, IconLight, IconPlus, IconRefresh, IconRobot, IconSetting, IconSettingTwo, IconUpload } from "@/components/icon";

const { Text } = Typography

/* ------------------------------------------------------------------ */
/* 语音设置（向后兼容：多处以 getVoiceSettings() 读取）                 */
/* ------------------------------------------------------------------ */

const VOICE_SETTINGS_KEY = "xiaozhi-voice-settings"

export interface VoiceSettings {
  enabled: boolean
  voice: string
  readAloud: boolean
}

/**
 * 读取本地语音设置。
 * 🚨 旧 TTS 音色（Mochi/Cherry/Chelsie）Omni 实时模型不支持 → 一律迁移到 Tina。
 */
export function getVoiceSettings(): VoiceSettings {
  if (typeof window === "undefined") return { enabled: true, voice: "Tina", readAloud: true }
  try {
    const saved = localStorage.getItem(VOICE_SETTINGS_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      const v = parsed.voice
      const migratedVoice = !v || ["Mochi", "Cherry", "Chelsie"].includes(v) ? "Tina" : v
      return {
        enabled: parsed.enabled ?? true,
        voice: migratedVoice,
        readAloud: parsed.readAloud ?? true,
      }
    }
  } catch {
    /* ignore */
  }
  return { enabled: true, voice: "Tina", readAloud: true }
}

export function saveVoiceSettings(settings: VoiceSettings) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

export type SettingsSection =
  | "general"
  | "appearance"
  | "personalization"
  | "memory"
  | "model"
  | "assistant"
  | "data"
  | "security"
  | "about"

export interface AISettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: UserPublic | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 保持既有调用契约
  onSave?: (settings: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 同上
  onVoiceSettingsChange?: (settings: any) => void
  persona?: string
  onPersonaChange?: (personaId: string) => void
  /** 打开时定位到哪个分区（默认「个性化」） */
  initialSection?: SettingsSection
}

interface NavGroup {
  title: string
  items: Array<{ key: SettingsSection; label: string; icon: React.ReactNode }>
}

/* ------------------------------------------------------------------ */
/* 版式原子（对齐 WorkBuddy）                                          */
/* ------------------------------------------------------------------ */

/** 卡片内一行：左标题+描述，右控件 */
function Row({
  title,
  desc,
  children,
  vertical = false,
  last = false,
}: {
  title: string
  desc?: string
  children: React.ReactNode
  vertical?: boolean
  last?: boolean
}) {
  const border = last ? {} : { borderBottom: "1px solid var(--set-row-border)" }
  if (vertical) {
    return (
      <div style={{ padding: "16px 20px", ...border }}>
        <div style={{ fontSize: 14, color: "var(--set-text)", lineHeight: "22px" }}>{title}</div>
        {desc && (
          <div style={{ fontSize: 13, color: "var(--set-text-secondary)", marginTop: 2, marginBottom: 10, lineHeight: "20px" }}>
            {desc}
          </div>
        )}
        {children}
      </div>
    )
  }
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
        padding: "16px 20px",
        minHeight: 64,
        ...border,
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, color: "var(--set-text)", lineHeight: "22px" }}>{title}</div>
        {desc && (
          <div style={{ fontSize: 13, color: "var(--set-text-secondary)", marginTop: 2, lineHeight: "20px" }}>{desc}</div>
        )}
      </div>
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        {children}
      </div>
    </div>
  )
}

/** 白色圆角卡片容器（深色模式自动切换为暗卡片） */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--set-card-bg)", border: "1px solid var(--set-card-border)", borderRadius: 10, overflow: "hidden" }}>
      {children}
    </div>
  )
}

/** 分组小标题（灰小字） */
function GroupTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, color: "var(--set-text-secondary)", margin: "4px 0 10px", lineHeight: "20px" }}>{children}</div>
  )
}

/** 绿色胶囊开关 */
function GreenSwitch(props: React.ComponentProps<typeof Switch>) {
  return (
    <Switch
      {...props}
      style={{ backgroundColor: props.checked ? "#12B76A" : undefined, ...(props.style || {}) }}
    />
  )
}

/** 统一下拉宽度 */
function Dropdown(props: React.ComponentProps<typeof Select>) {
  return <Select {...props} style={{ minWidth: 132, ...(props.style || {}) }} />
}

/* ------------------------------------------------------------------ */
/* 导航                                                                */
/* ------------------------------------------------------------------ */

function buildNav(): NavGroup[] {
  return [
    {
      title: "",
      items: [
        { key: "general", label: "通用", icon: <IconSetting /> },
        { key: "appearance", label: "外观", icon: <IconBackgroundColor /> },
      ],
    },
    {
      title: "功能",
      items: [
        { key: "personalization", label: "个性化", icon: <IconEmotionHappy /> },
        { key: "memory", label: "记忆与进化", icon: <IconLight /> },
        { key: "model", label: "模型", icon: <IconRobot /> },
        { key: "assistant", label: "助理设置", icon: <IconSettingTwo /> },
      ],
    },
    {
      title: "数据与安全",
      items: [
        { key: "data", label: "数据管理", icon: <IconDatabaseNetwork /> },
        { key: "security", label: "安全中心", icon: <IconCertificate /> },
      ],
    },
    {
      title: "",
      items: [{ key: "about", label: "关于", icon: <IconInfo /> }],
    },
  ]
}

/* ------------------------------------------------------------------ */
/* 主组件                                                              */
/* ------------------------------------------------------------------ */

export function AISettingsDialog({
  open,
  onOpenChange,
  initialSection,
  onVoiceSettingsChange,
}: AISettingsDialogProps) {
  const { modal } = App.useApp()
  const [section, setSection] = useState<SettingsSection>(initialSection || "personalization")
  const nav = useMemo(() => buildNav(), [])
  // 主题跟随全局 next-themes（2026-09-20 深色适配）：容器 CSS 变量 + antd darkAlgorithm 双轨
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  useEffect(() => {
    if (open) setSection(initialSection || "personalization")
  }, [open, initialSection])

  /**
   * 🚨 兼容既有调用契约：调用方（ai-assistant 页）用 onVoiceSettingsChange 监听
   * 「是否朗读」；这里在弹窗打开时同步一次当前语音设置，避免其状态过期。
   */
  useEffect(() => {
    if (!open) return
    try {
      onVoiceSettingsChange?.(getVoiceSettings())
    } catch {
      /* ignore */
    }
  }, [open, onVoiceSettingsChange])

  /** 子面板注册「是否有未保存修改」，关闭时据此确认 */
  const dirtyRef = useRef<() => boolean>(() => false)

  const requestClose = () => {
    if (!dirtyRef.current()) {
      onOpenChange(false)
      return
    }
    modal.confirm({
      title: "有未保存的修改",
      content: "关闭后这些修改会丢失，确定要关闭吗？",
      okText: "放弃修改并关闭",
      okButtonProps: { danger: true },
      cancelText: "继续编辑",
      onOk: () => onOpenChange(false),
    })
  }

  return (
    <Modal
      open={open}
      onCancel={requestClose}
      footer={null}
      closable={false}
      width={920}
      centered
      destroyOnClose
      maskClosable={false}
      rootClassName="ai-settings-modal"
      /**
       * 🚨 窗口圆角必须作用在这两层，缺一不可：
       * - `.ant-modal`（外层）默认带白底 + box-shadow，若不清掉，圆角外会漏出一圈白边，
       *   看起来就像「多包了一层容器」；
       * - 真正承载视觉的窗口是 `.ant-modal-container`（antd v6 已由 content 更名），
       *   背景 + 圆角 + 裁切 + 阴影都在它身上。
       */
      styles={{
        body: { padding: 0 },
        container: {
          padding: 0,
          background: isDark ? "#18181B" : "#FAFAFA",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: isDark ? "0 12px 40px rgba(0, 0, 0, .55)" : "0 12px 40px rgba(0, 0, 0, .16)",
        },
      }}
    >
      <style>{`
        /* 外层 .ant-modal 只做定位容器：去底去影去圆角，视觉全部交给 container，
           否则白底会从圆角外漏出一圈，看起来像多套了一层容器。 */
        .ant-modal.ai-settings-modal { background: transparent; box-shadow: none; border-radius: 0; padding: 0; }
        /* ── 设置弹窗主题作用域（2026-09-20 深色适配）──
           全部内联颜色走 CSS 变量，根节点 data-settings-theme 切换亮/暗两套 token，
           深层子面板（Row/Card/GroupTitle/各 Panel）无需感知主题。 */
        .ai-settings-scope {
          --set-bg: #FAFAFA;
          --set-sidebar-bg: #F7F7F8;
          --set-border: #EDEEEF;
          --set-row-border: #F2F3F5;
          --set-card-bg: #FFFFFF;
          --set-card-border: #EDEEEF;
          --set-subcard-bg: #FAFAFA;
          --set-subcard-border: #F0F0F1;
          --set-text: #1F2329;
          --set-text-secondary: #8F959E;
          --set-text-tertiary: #A8ADB4;
          --set-nav-active-bg: #EFEFF0;
          --set-nav-hover-bg: #F0F0F1;
          --set-nav-text: #52525B;
          --set-chip-bg: #F4F4F5;
          --set-chip-text: #52525B;
          --set-hover-fill: #EFEFF0;
          --set-plus: #C4C7CC;
        }
        .ai-settings-scope[data-settings-theme="dark"] {
          --set-bg: #18181B;
          --set-sidebar-bg: #1D1D21;
          --set-border: #2A2A30;
          --set-row-border: #26262B;
          --set-card-bg: #1F1F24;
          --set-card-border: #2E2E34;
          --set-subcard-bg: #26262B;
          --set-subcard-border: #2E2E34;
          --set-text: #E4E4E7;
          --set-text-secondary: #9CA0A8;
          --set-text-tertiary: #6E7278;
          --set-nav-active-bg: #2E2E34;
          --set-nav-hover-bg: #26262B;
          --set-nav-text: #A1A1AA;
          --set-chip-bg: #2E2E34;
          --set-chip-text: #A1A1AA;
          --set-hover-fill: #2E2E34;
          --set-plus: #5A5E66;
        }
      `}</style>
      <ConfigProvider theme={isDark ? { algorithm: antdTheme.darkAlgorithm } : undefined}>
      <div className="ai-settings-scope" data-settings-theme={isDark ? "dark" : "light"} style={{ display: "flex", height: "min(720px, 84vh)", background: "var(--set-bg)" }}>
        {/* ── 左栏 ── */}
        <div
          style={{
            width: 196,
            flexShrink: 0,
            background: "var(--set-sidebar-bg)",
            borderRight: "1px solid var(--set-border)",
            display: "flex",
            flexDirection: "column",
            paddingTop: 14,
          }}
        >
          <div style={{ fontSize: 13, color: "var(--set-text-secondary)", padding: "0 16px 12px" }}>设置</div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 16px" }}>
            {nav.map((g, gi) => (
              <div key={gi} style={{ marginBottom: g.title ? 14 : 4 }}>
                {g.title && (
                  <div style={{ fontSize: 12, color: "var(--set-text-tertiary)", padding: "0 8px 6px" }}>{g.title}</div>
                )}
                {g.items.map((it) => {
                  const active = section === it.key
                  return (
                    <button
                      key={it.key}
                      type="button"
                      onClick={() => setSection(it.key)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 10px",
                        marginBottom: 2,
                        border: "none",
                        borderRadius: 8,
                        background: active ? "var(--set-nav-active-bg)" : "transparent",
                        color: active ? "var(--set-text)" : "var(--set-nav-text)",
                        fontSize: 13.5,
                        fontFamily: "inherit",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "background .12s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!active) e.currentTarget.style.background = "var(--set-nav-hover-bg)"
                      }}
                      onMouseLeave={(e) => {
                        if (!active) e.currentTarget.style.background = "transparent"
                      }}
                    >
                      <span
                        style={{ fontSize: 15, display: "inline-flex", color: active ? "var(--set-text)" : "var(--set-text-secondary)" }}
                      >
                        {it.icon}
                      </span>
                      {it.label}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* ── 右栏 ── */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "var(--set-bg)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "18px 24px 14px",
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 600, color: "var(--set-text)" }}>
              {nav.flatMap((g) => g.items).find((i) => i.key === section)?.label || "设置"}
            </div>
            <button
              type="button"
              onClick={requestClose}
              aria-label="关闭设置"
              style={{
                width: 28,
                height: 28,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                borderRadius: 6,
                background: "transparent",
                color: "var(--set-text-secondary)",
                cursor: "pointer",
                fontSize: 15,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--set-hover-fill)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <IconClose />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 24px" }}>
            <Panel section={section} registerDirty={(fn) => (dirtyRef.current = fn)} />
          </div>
        </div>
      </div>
      </ConfigProvider>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* 内容分发                                                            */
/* ------------------------------------------------------------------ */

function Panel({
  section,
  registerDirty,
}: {
  section: SettingsSection
  registerDirty: (fn: () => boolean) => void
}) {
  switch (section) {
    case "general":
      return <GeneralPanel registerDirty={registerDirty} />
    case "appearance":
      return <AppearancePanel registerDirty={registerDirty} />
    case "personalization":
      return <PersonalizationPanel registerDirty={registerDirty} />
    case "memory":
      return <MemoryPanel />
    case "model":
      return <ModelPanel />
    case "assistant":
      return <AssistantPanel registerDirty={registerDirty} />
    case "data":
      return <DataPanel />
    case "security":
      return <SecurityPanel />
    case "about":
      return <AboutPanel />
    default:
      return null
  }
}

/* ------------------------------------------------------------------ */
/* 通用                                                                */
/* ------------------------------------------------------------------ */

function GeneralPanel({ registerDirty }: { registerDirty: (fn: () => boolean) => void }) {
  const [lang, setLang] = useState("zh-CN")
  const [fontScale, setFontScale] = useState(100)

  useEffect(() => {
    registerDirty(() => false) // 即时生效，无需确认
    try {
      const raw = localStorage.getItem("stravision.ui.prefs")
      if (raw) {
        const p = JSON.parse(raw)
        if (typeof p.fontScale === "number") setFontScale(p.fontScale)
        if (typeof p.lang === "string") setLang(p.lang)
      }
    } catch {
      /* ignore */
    }
  }, [registerDirty])

  const persist = (p: Record<string, unknown>) => {
    try {
      const raw = localStorage.getItem("stravision.ui.prefs")
      const cur = raw ? JSON.parse(raw) : {}
      localStorage.setItem("stravision.ui.prefs", JSON.stringify({ ...cur, ...p }))
    } catch {
      /* ignore */
    }
  }

  const persistFont = (v: number) => {
    setFontScale(v)
    persist({ fontScale: v })
    document.documentElement.style.fontSize = `${(v / 100) * 16}px`
  }

  return (
    <>
      <GroupTitle>常规</GroupTitle>
      <Card>
        <Row title="语言" desc="界面显示语言。">
          <Dropdown
            value={lang}
            onChange={(v) => {
              setLang(v)
              persist({ lang: v })
            }}
            options={[
              { value: "zh-CN", label: "简体中文" },
              { value: "en-US", label: "English" },
            ]}
          />
        </Row>
        <Row title="字体大小" desc="调整界面文字的整体大小。" last>
          <div style={{ width: 268, paddingRight: 6 }}>
            <Slider
              min={85}
              max={125}
              step={5}
              value={fontScale}
              onChange={persistFont}
              marks={{ 85: "小", 100: "默认", 125: "大" }}
              tooltip={{ formatter: (v) => `${v}%` }}
            />
          </div>
        </Row>
      </Card>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 外观                                                                */
/* ------------------------------------------------------------------ */

function AppearancePanel({ registerDirty }: { registerDirty: (fn: () => boolean) => void }) {
  // 主题统一走全局 next-themes（与其他页面同一主题系统，2026-09-20）
  // 旧版私有 key localStorage["stravision.theme"] 弃用；light/dark/system 直接映射 next-themes theme
  const { theme: globalTheme, setTheme } = useTheme()
  const theme = globalTheme ?? "system"

  useEffect(() => {
    registerDirty(() => false)
  }, [registerDirty])

  const applyTheme = (t: string) => {
    setTheme(t)
  }

  return (
    <>
      <GroupTitle>主题</GroupTitle>
      <Card>
        <Row title="主题外观" desc="「跟随系统」会自动匹配操作系统的深浅色设置。" last>
          <Dropdown
            value={theme}
            onChange={applyTheme}
            options={[
              { value: "system", label: "跟随系统" },
              { value: "light", label: "浅色" },
              { value: "dark", label: "深色" },
            ]}
          />
        </Row>
      </Card>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 个性化                                                              */
/* ------------------------------------------------------------------ */

interface PersonalizationData {
  responseStyle: string
  loadingGreeting: string
  showChangeDetails: boolean
  customInstructions: string
  userAddress: string
  assistantName: string
  personaDescription: string
  memoryEnabled: boolean
}

function PersonalizationPanel({ registerDirty }: { registerDirty: (fn: () => boolean) => void }) {
  const { message, modal } = App.useApp()
  const [settings, setSettings] = useState<PersonalizationData | null>(null)
  const [styles, setStyles] = useState<Array<{ id: string; label: string; description: string }>>([])
  const [limit, setLimit] = useState(1500)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const settingsRef = useRef<PersonalizationData | null>(null)
  const dirtyRef = useRef(false)
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])
  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])
  useEffect(() => {
    registerDirty(() => dirtyRef.current)
  }, [registerDirty])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/user/personalization")
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      setSettings(data.settings)
      setStyles(data.styles ?? [])
      if (data.limits?.customInstructions) setLimit(data.limits.customInstructions)
      setDirty(false)
    } catch {
      message.error("加载个性化设置失败")
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => {
    void load()
  }, [load])

  const save = useCallback(async () => {
    const cur = settingsRef.current
    if (!cur) return
    setSaving(true)
    try {
      const res = await fetch("/api/user/personalization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cur),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "保存失败")
      setSettings(data.settings)
      setDirty(false)
      message.success("已保存，下次对话生效")
    } catch (e) {
      message.error(e instanceof Error ? e.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }, [message])

  const patch = (p: Partial<PersonalizationData>) => {
    setSettings((prev) => (prev ? { ...prev, ...p } : prev))
    setDirty(true)
  }

  const handleReset = () => {
    modal.confirm({
      title: "恢复默认个性化设置？",
      content: "将清除回复风格、自定义指令、称呼与人格设定，此操作不可撤销。",
      okText: "恢复默认",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        try {
          const res = await fetch("/api/user/personalization", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "reset" }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data?.error || "重置失败")
          setSettings(data.settings)
          setDirty(false)
          message.success("已恢复默认设置")
        } catch (e) {
          message.error(e instanceof Error ? e.message : "重置失败")
        }
      },
    })
  }

  if (loading || !settings) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--set-text-secondary)" }}>加载中…</div>
  }

  const currentStyle = styles.find((s) => s.id === settings.responseStyle)

  return (
    <>
      <GroupTitle>回复偏好</GroupTitle>
      <Card>
        <Row title="回复风格" desc={currentStyle?.description || "选择助手回复的默认语气"}>
          <Dropdown
            value={settings.responseStyle}
            onChange={(v) => patch({ responseStyle: v })}
            options={styles.map((s) => ({ value: s.id, label: s.label }))}
            optionRender={(opt) => {
              const s = styles.find((x) => x.id === opt.value)
              return (
                <div style={{ padding: "2px 0" }}>
                  <div style={{ fontSize: 13, color: "var(--set-text)" }}>{s?.label}</div>
                  <div style={{ fontSize: 11, color: "var(--set-text-secondary)" }}>{s?.description}</div>
                </div>
              )
            }}
          />
        </Row>
        <Row title="加载欢迎语" desc="对话回复较慢时，用一句话陪伴等待（留空则不显示）。">
          <Input
            value={settings.loadingGreeting}
            onChange={(e) => patch({ loadingGreeting: e.target.value })}
            placeholder="例如：正在查看你的棚…"
            maxLength={120}
            style={{ width: 240 }}
          />
        </Row>
        <Row title="展示变更过程详情" desc="在模型输出过程中展示并加载文件变更的过程详情。" last>
          <GreenSwitch checked={settings.showChangeDetails} onChange={(v) => patch({ showChangeDetails: v })} />
        </Row>
      </Card>

      <div style={{ height: 20 }} />
      <GroupTitle>自定义指令</GroupTitle>
      <Card>
        <Row
          vertical
          title="给助手定几条规则，后续对所有任务都生效"
          desc="例如：回答先给结论再展开；涉及用药时必须提醒安全间隔期。"
          last
        >
          <Input.TextArea
            value={settings.customInstructions}
            onChange={(e) => patch({ customInstructions: e.target.value })}
            placeholder="例如：回答先给结论再展开…"
            maxLength={limit}
            autoSize={{ minRows: 5, maxRows: 10 }}
            showCount
          />
        </Row>
      </Card>

      <div style={{ height: 20 }} />
      <GroupTitle>称呼与身份</GroupTitle>
      <Card>
        <Row title="助手对你的称呼" desc="助手在回复中如何称呼你。">
          <Input
            value={settings.userAddress}
            onChange={(e) => patch({ userAddress: e.target.value })}
            placeholder="例如：Zarx"
            maxLength={50}
            style={{ width: 240 }}
          />
        </Row>
        <Row title="助手的名字" desc="你希望怎样称呼这位助手。">
          <Input
            value={settings.assistantName}
            onChange={(e) => patch({ assistantName: e.target.value })}
            placeholder="莓小智"
            maxLength={50}
            style={{ width: 240 }}
          />
        </Row>
        <Row
          vertical
          title="助手的人设 / 人格描述"
          desc="用自然语言描述你希望助手具备的性格与行事方式，会作为人格设定注入对话。"
          last
        >
          <Input.TextArea
            value={settings.personaDescription}
            onChange={(e) => patch({ personaDescription: e.target.value })}
            placeholder="例如：你是莓小智，一位务实的智慧农业管家，说话直接不客套，遇到数据先给结论再给依据…"
            maxLength={4000}
            autoSize={{ minRows: 4, maxRows: 8 }}
          />
        </Row>
      </Card>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
        {dirty && (
          <Text type="warning" style={{ fontSize: 12, marginRight: "auto" }}>
            有未保存的修改
          </Text>
        )}
        <Button size="small" icon={<IconRefresh />} onClick={handleReset}>
          恢复默认
        </Button>
        <Button size="small" type="primary" loading={saving} disabled={!dirty} onClick={save}>
          保存
        </Button>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 记忆与进化                                                          */
/* ------------------------------------------------------------------ */

interface MemoryItem {
  key: string
  label: string
  value: string
}

function MemoryPanel() {
  const { message, modal } = App.useApp()
  const [items, setItems] = useState<MemoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [draft, setDraft] = useState<MemoryItem[]>([])
  const [saving, setSaving] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState("")
  const [importing, setImporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [memRes, perRes] = await Promise.all([
        fetch("/api/user/memory"),
        fetch("/api/user/personalization"),
      ])
      if (memRes.ok) {
        const d = await memRes.json()
        setItems(Array.isArray(d?.memories) ? d.memories : [])
      }
      if (perRes.ok) {
        const d = await perRes.json()
        if (typeof d?.settings?.memoryEnabled === "boolean") setEnabled(d.settings.memoryEnabled)
      }
    } catch {
      message.error("加载记忆失败")
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => {
    void load()
  }, [load])

  const toggleEnabled = async (v: boolean) => {
    setEnabled(v)
    try {
      const res = await fetch("/api/user/personalization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memoryEnabled: v }),
      })
      if (!res.ok) throw new Error()
      message.success(v ? "已开启对话记忆生成" : "已关闭：助手不再从对话中提取记忆")
    } catch {
      setEnabled(!v)
      message.error("设置失败")
    }
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/user/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memories: draft }),
      })
      if (!res.ok) throw new Error()
      const d = await res.json()
      setItems(Array.isArray(d?.memories) ? d.memories : [])
      setEditOpen(false)
      message.success("记忆已更新")
    } catch {
      message.error("保存失败")
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    modal.confirm({
      title: "清空全部记忆？",
      content: "助手将忘记所有已记住的关于你的信息，此操作不可撤销。",
      okText: "清空",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        try {
          const res = await fetch("/api/user/memory", { method: "DELETE" })
          if (!res.ok) throw new Error()
          setItems([])
          message.success("记忆已清空")
        } catch {
          message.error("清空失败")
        }
      },
    })
  }

  const handleExport = () => {
    if (items.length === 0) {
      message.info("暂无可导出的记忆")
      return
    }
    const md = ["# 莓小智记忆档案", "", ...items.map((i) => `## ${i.label}\n${i.value}`), ""].join("\n")
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `莓小智记忆-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(a.href)
    message.success("已导出记忆文件")
  }

  const doImport = async () => {
    if (!importText.trim()) {
      message.warning("请粘贴要导入的记忆内容")
      return
    }
    setImporting(true)
    try {
      const res = await fetch("/api/user/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", markdown: importText }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || "导入失败")
      setItems(Array.isArray(d?.memories) ? d.memories : [])
      setImportOpen(false)
      setImportText("")
      message.success("导入成功")
    } catch (e) {
      message.error(e instanceof Error ? e.message : "导入失败")
    } finally {
      setImporting(false)
    }
  }

  const grouped = useMemo(() => {
    const g: Record<string, MemoryItem[]> = { 身份与场地: [], 偏好与习惯: [], 其他: [] }
    for (const it of items) {
      const k = it.key
      if (k.startsWith("custom_")) g["其他"].push(it)
      else if (/name|greenhouse|farm|device|location/.test(k)) g["身份与场地"].push(it)
      else if (/prefer|habit|variety|style/.test(k)) g["偏好与习惯"].push(it)
      else g["其他"].push(it)
    }
    return g
  }, [items])

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--set-text-secondary)" }}>加载中…</div>
  }

  return (
    <>
      <GroupTitle>记忆生成</GroupTitle>
      <Card>
        <Row
          title="允许助手记住我"
          desc="从对话中提取并记住你的偏好与习惯，让后续对话更连贯。关闭后助手不再生成新记忆，已有记忆保留。"
          last
        >
          <GreenSwitch checked={enabled} onChange={toggleEnabled} />
        </Row>
      </Card>

      <div style={{ height: 20 }} />
      <GroupTitle>记忆管理</GroupTitle>
      <Card>
        <Row title="管理记忆内容" desc={`当前已记住 ${items.length} 条信息，可编辑、导入或导出。`}>
          <Space size={8}>
            <Tooltip title="重置（清空全部）">
              <Button size="small" icon={<IconRefresh />} onClick={handleReset}>
                重置
              </Button>
            </Tooltip>
            <Button
              size="small"
              icon={<IconEdit />}
              onClick={() => {
                setDraft(items.map((i) => ({ ...i })))
                setEditOpen(true)
              }}
            >
              编辑
            </Button>
            <Button size="small" icon={<IconUpload />} onClick={() => setImportOpen(true)}>
              导入
            </Button>
            <Button size="small" icon={<IconDownload />} onClick={handleExport}>
              导出
            </Button>
          </Space>
        </Row>
        <Row vertical title="记忆内容" desc="以下是莓小智当前存储的关于你的记忆，对话时会自然引用。" last>
          {items.length === 0 ? (
            <div style={{ padding: "16px 0" }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<span style={{ fontSize: 13, color: "var(--set-text-secondary)" }}>还没有记忆，多聊聊它就记住了</span>}
              />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {Object.entries(grouped)
                .filter(([, arr]) => arr.length > 0)
                .map(([title, arr]) => (
                  <div key={title}>
                    <div style={{ fontSize: 12.5, color: "var(--set-nav-text)", marginBottom: 8 }}>{title}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {arr.map((it) => (
                        <div
                          key={it.key}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            padding: "10px 12px",
                            background: "var(--set-subcard-bg)",
                            border: "1px solid var(--set-subcard-border)",
                            borderRadius: 8,
                          }}
                        >
                          <Tag
                            style={{
                              margin: 0,
                              flexShrink: 0,
                              background: "var(--set-chip-bg)",
                              border: "none",
                              color: "var(--set-chip-text)",
                              fontSize: 11.5,
                              borderRadius: 999,
                              padding: "1px 9px",
                            }}
                          >
                            {it.label}
                          </Tag>
                          <span style={{ fontSize: 13, color: "var(--set-text)", lineHeight: "20px", wordBreak: "break-word" }}>
                            {it.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Row>
      </Card>

      <Drawer
        title="编辑记忆"
        open={editOpen}
        onClose={() => setEditOpen(false)}
        width={520}
        extra={
          <Space>
            <Button onClick={() => setEditOpen(false)}>取消</Button>
            <Button type="primary" loading={saving} onClick={saveEdit}>
              保存
            </Button>
          </Space>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {draft.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无记忆" />}
          {draft.map((it, idx) => (
            <div key={it.key} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <Input
                  size="small"
                  value={it.label}
                  placeholder="标签"
                  onChange={(e) => {
                    const next = [...draft]
                    next[idx] = { ...it, label: e.target.value }
                    setDraft(next)
                  }}
                  style={{ width: 160 }}
                />
                <Input.TextArea
                  value={it.value}
                  placeholder="记忆内容"
                  autoSize={{ minRows: 2, maxRows: 5 }}
                  onChange={(e) => {
                    const next = [...draft]
                    next[idx] = { ...it, value: e.target.value }
                    setDraft(next)
                  }}
                />
              </div>
              <Button
                size="small"
                danger
                type="text"
                icon={<IconDelete />}
                onClick={() => setDraft(draft.filter((_, i) => i !== idx))}
              />
            </div>
          ))}
          <Button
            type="dashed"
            icon={<IconPlus />}
            onClick={() => setDraft([...draft, { key: `custom_${Date.now()}`, label: "自定义", value: "" }])}
          >
            添加一条记忆
          </Button>
        </div>
      </Drawer>

      <Modal
        title="导入记忆"
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        onOk={doImport}
        okText="导入"
        cancelText="取消"
        confirmLoading={importing}
        width={620}
      >
        <div style={{ fontSize: 13, color: "var(--set-text-secondary)", marginBottom: 10, lineHeight: "20px" }}>
          粘贴 Markdown 格式的记忆内容，按 <Text code>## 标题</Text> 分段，标题会作为标签。
        </div>
        <Input.TextArea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          autoSize={{ minRows: 8, maxRows: 16 }}
          placeholder={"## 称呼\nZarx\n\n## 大棚信息\n1号棚，红颜草莓"}
        />
      </Modal>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 模型                                                                */
/* ------------------------------------------------------------------ */

function ModelPanel() {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(true)
  const [providers, setProviders] = useState<Array<{ id: string; name: string; enabled?: boolean }>>([])
  const [defaultModel, setDefaultModel] = useState("")
  const [models, setModels] = useState<Array<{ id: string; name?: string }>>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/admin/ai-providers")
        if (res.ok) {
          const d = await res.json()
          const list = Array.isArray(d) ? d : d?.providers || []
          setProviders(list.filter((p: { enabled?: boolean }) => p.enabled !== false))
        }
      } catch {
        /* ignore */
      }
      try {
        const res = await fetch("/api/admin/default-model")
        if (res.ok) {
          const d = await res.json()
          setDefaultModel(d?.modelId || d?.defaultModelId || "")
        }
      } catch {
        /* ignore */
      }
      try {
        const res = await fetch("/api/admin/ai-models")
        if (res.ok) {
          const d = await res.json()
          setModels(Array.isArray(d) ? d : d?.models || [])
        }
      } catch {
        /* ignore */
      }
      setLoading(false)
    })()
  }, [])

  const saveModel = async (v: string) => {
    setDefaultModel(v)
    setSaving(true)
    try {
      const res = await fetch("/api/admin/default-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: v }),
      })
      if (!res.ok) throw new Error()
      message.success("默认模型已更新")
    } catch {
      message.error("保存失败")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--set-text-secondary)" }}>加载中…</div>
  }

  return (
    <>
      <GroupTitle>模型服务</GroupTitle>
      <Card>
        <Row
          title="已配置的 AI 服务"
          desc={providers.length ? `共 ${providers.length} 个服务商已启用` : "还没有配置 AI 服务商"}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end", maxWidth: 320 }}>
            {providers.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 13 }}>
                未配置
              </Text>
            ) : (
              providers.map((p) => (
                <Tag key={p.id} style={{ margin: 0, borderRadius: 999 }}>
                  {p.name}
                </Tag>
              ))
            )}
          </div>
        </Row>
        <Row title="默认模型" desc="AI 助手选「自动」时使用该模型；可直接输入任意模型 id。" last>
          <Select
            showSearch
            allowClear
            placeholder="选择或输入模型 id"
            value={defaultModel || undefined}
            onChange={saveModel}
            loading={saving}
            style={{ width: 280 }}
            options={models.map((m) => ({ value: m.id, label: m.name || m.id }))}
            filterOption={(input, opt) =>
              String(opt?.value || "")
                .toLowerCase()
                .includes(input.toLowerCase())
            }
          />
        </Row>
      </Card>

      <div style={{ height: 20 }} />
      <GroupTitle>高级</GroupTitle>
      <Card>
        <Row
          title="完整的模型与供应商管理"
          desc="添加或删除服务商、管理模型清单、浏览模型市场。"
          last={!IS_DESKTOP_APP}
        >
          <Button
            size="small"
            icon={<IconCloudStorage />}
            onClick={() => {
              window.location.href = "/admin?section=ai-providers"
            }}
          >
            打开管理后台
          </Button>
        </Row>
        {!IS_DESKTOP_APP && (
          <Row title="模型市场" desc="浏览并一键接入平台已适配的模型。" last>
            <Button
              size="small"
              onClick={() => {
                window.location.href = "/admin?section=model-marketplace"
              }}
            >
              浏览市场
            </Button>
          </Row>
        )}
      </Card>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 助理设置                                                            */
/* ------------------------------------------------------------------ */

function AssistantPanel({ registerDirty }: { registerDirty: (fn: () => boolean) => void }) {
  const [voiceMode, setVoiceMode] = useState("manual")
  const [autoStart, setAutoStart] = useState(true)
  const [ports, setPorts] = useState<Record<string, number> | null>(null)

  useEffect(() => {
    registerDirty(() => false)
    try {
      const raw = localStorage.getItem("stravision.assistant.prefs")
      if (raw) {
        const p = JSON.parse(raw)
        if (p.voiceMode) setVoiceMode(p.voiceMode)
        if (typeof p.autoStart === "boolean") setAutoStart(p.autoStart)
      }
    } catch {
      /* ignore */
    }
    if (IS_DESKTOP_APP) {
      const bridge = (
        window as unknown as {
          stravisionDesktop?: { getBackendInfo?: () => Promise<{ ports?: Record<string, number> }> }
        }
      ).stravisionDesktop
      bridge
        ?.getBackendInfo?.()
        .then((r) => setPorts(r?.ports || null))
        .catch(() => {})
    }
  }, [registerDirty])

  const persist = (p: Record<string, unknown>) => {
    try {
      const raw = localStorage.getItem("stravision.assistant.prefs")
      const cur = raw ? JSON.parse(raw) : {}
      localStorage.setItem("stravision.assistant.prefs", JSON.stringify({ ...cur, ...p }))
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <GroupTitle>对话</GroupTitle>
      <Card>
        <Row title="语音对话方式" desc="「按需唤起」只在点击麦克风后开始收音，更省资源。">
          <Dropdown
            value={voiceMode}
            onChange={(v) => {
              setVoiceMode(v)
              persist({ voiceMode: v })
            }}
            options={[
              { value: "manual", label: "按需唤起" },
              { value: "always", label: "常驻监听" },
            ]}
          />
        </Row>
        <Row title="打开应用即进入助手" desc="启动后直接进入 AI 助手页面并自动开始新对话。" last>
          <GreenSwitch
            checked={autoStart}
            onChange={(v) => {
              setAutoStart(v)
              persist({ autoStart: v })
            }}
          />
        </Row>
      </Card>

      {IS_DESKTOP_APP && (
        <>
          <div style={{ height: 20 }} />
          <GroupTitle>本机运行状态</GroupTitle>
          <Card>
            <Row title="本地服务端口" desc="应用内置服务的监听端口，供排查问题使用。">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end", maxWidth: 340 }}>
                {ports ? (
                  Object.entries(ports).map(([k, v]) => (
                    <Tag
                      key={k}
                      style={{ margin: 0, borderRadius: 999, fontFamily: "monospace", fontSize: 11.5 }}
                    >
                      {k} {String(v)}
                    </Tag>
                  ))
                ) : (
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    读取中…
                  </Text>
                )}
              </div>
            </Row>
            <Row title="重新运行配置向导" desc="需要重新填写 AI Key、消息服务等本地配置时使用。" last>
              <Button
                size="small"
                icon={<IconSetting />}
                onClick={() => {
                  const bridge = (
                    window as unknown as { stravisionDesktop?: { openSetup?: () => Promise<unknown> } }
                  ).stravisionDesktop
                  bridge?.openSetup?.()
                }}
              >
                打开向导
              </Button>
            </Row>
          </Card>
        </>
      )}

      <div style={{ height: 20 }} />
      <GroupTitle>快捷键</GroupTitle>
      <Card>
        <Row title="唤起助手" desc="在应用内快速打开助手对话。">
          <Tag style={{ margin: 0, borderRadius: 6, fontFamily: "monospace" }}>Ctrl / ⌘</Tag>
          <span style={{ margin: "0 4px", color: "var(--set-plus)" }}>+</span>
          <Tag style={{ margin: 0, borderRadius: 6, fontFamily: "monospace" }}>K</Tag>
        </Row>
        <Row title="新建对话" desc="立即开始一轮新的对话。" last>
          <Tag style={{ margin: 0, borderRadius: 6, fontFamily: "monospace" }}>Ctrl / ⌘</Tag>
          <span style={{ margin: "0 4px", color: "var(--set-plus)" }}>+</span>
          <Tag style={{ margin: 0, borderRadius: 6, fontFamily: "monospace" }}>N</Tag>
        </Row>
      </Card>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 数据管理                                                            */
/* ------------------------------------------------------------------ */

function DataPanel() {
  const { message } = App.useApp()
  const [stats, setStats] = useState<{ memories: number; sessions: number } | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const [m, s] = await Promise.all([
          fetch("/api/user/memory").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/sessions").then((r) => (r.ok ? r.json() : null)),
        ])
        setStats({
          memories: Array.isArray(m?.memories) ? m.memories.length : 0,
          sessions: Array.isArray(s) ? s.length : Array.isArray(s?.sessions) ? s.sessions.length : 0,
        })
      } catch {
        setStats({ memories: 0, sessions: 0 })
      }
    })()
  }, [])

  return (
    <>
      <GroupTitle>存储用量</GroupTitle>
      <Card>
        <Row title="对话记录" desc="你与助手的历史会话数量。">
          <Text style={{ fontSize: 14, color: "var(--set-text)" }}>{stats?.sessions ?? "—"} 条</Text>
        </Row>
        <Row title="记忆条目" desc="助手已记住的关于你的信息条数。" last>
          <Text style={{ fontSize: 14, color: "var(--set-text)" }}>{stats?.memories ?? "—"} 条</Text>
        </Row>
      </Card>

      <div style={{ height: 20 }} />
      <GroupTitle>导出与清理</GroupTitle>
      <Card>
        <Row title="导出全部记忆" desc="下载 Markdown 格式的记忆档案，便于迁移或备份。">
          <Button
            size="small"
            icon={<IconExport />}
            onClick={async () => {
              try {
                const res = await fetch("/api/user/memory")
                const d = await res.json()
                const list: MemoryItem[] = Array.isArray(d?.memories) ? d.memories : []
                if (list.length === 0) {
                  message.info("暂无可导出的记忆")
                  return
                }
                const md = [
                  "# 莓小智记忆档案",
                  "",
                  ...list.map((i) => `## ${i.label}\n${i.value}`),
                  "",
                ].join("\n")
                const blob = new Blob([md], { type: "text/markdown;charset=utf-8" })
                const a = document.createElement("a")
                a.href = URL.createObjectURL(blob)
                a.download = `莓小智记忆-${new Date().toISOString().slice(0, 10)}.md`
                a.click()
                URL.revokeObjectURL(a.href)
                message.success("已导出")
              } catch {
                message.error("导出失败")
              }
            }}
          >
            导出记忆
          </Button>
        </Row>
        <Row title="清空全部记忆" desc="助手将忘记所有已记住的信息，此操作不可撤销。" last>
          <Button
            size="small"
            danger
            icon={<IconDelete />}
            onClick={async () => {
              try {
                const res = await fetch("/api/user/memory", { method: "DELETE" })
                if (!res.ok) throw new Error()
                setStats((s) => (s ? { ...s, memories: 0 } : s))
                message.success("记忆已清空")
              } catch {
                message.error("清空失败")
              }
            }}
          >
            清空
          </Button>
        </Row>
      </Card>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 安全中心                                                            */
/* ------------------------------------------------------------------ */

function SecurityPanel() {
  const [user, setUser] = useState<{ email?: string; username?: string; role?: string } | null>(null)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUser(d?.user || null))
      .catch(() => {})
  }, [])

  return (
    <>
      <GroupTitle>账号</GroupTitle>
      <Card>
        <Row title="当前账号" desc="你正在使用的账号信息。">
          <Text style={{ fontSize: 14, color: "var(--set-text)" }}>{user?.email || user?.username || "—"}</Text>
        </Row>
        <Row title="角色" desc="决定你可访问的功能范围。" last={IS_DESKTOP_APP}>
          <Tag style={{ margin: 0, borderRadius: 999 }}>{user?.role || "—"}</Tag>
        </Row>
        {!IS_DESKTOP_APP && (
          <Row title="修改密码" desc="定期更换密码可以提升账号安全性。" last>
            <Button size="small" onClick={() => (window.location.href = "/settings")}>
              前往修改
            </Button>
          </Row>
        )}
      </Card>

      <div style={{ height: 20 }} />
      <GroupTitle>安全设置</GroupTitle>
      <Card>
        <Row title="登录验证" desc="登录与注册时的验证码防护，用于阻挡自动化攻击。" last={IS_DESKTOP_APP}>
          <Tag color="green" style={{ margin: 0, borderRadius: 999 }}>
            已开启
          </Tag>
        </Row>
        {!IS_DESKTOP_APP && (
          <Row title="登录设备与会话" desc="查看当前已登录的设备，必要时可强制下线。" last>
            <Button size="small" onClick={() => (window.location.href = "/admin?section=security")}>
              查看
            </Button>
          </Row>
        )}
      </Card>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 关于                                                                */
/* ------------------------------------------------------------------ */

function AboutPanel() {
  const { message } = App.useApp()
  const [version, setVersion] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [ready, setReady] = useState(false)

  const bridge = (
    window as unknown as {
      stravisionDesktop?: {
        getBackendInfo?: () => Promise<{ version?: string }>
        checkForUpdate?: () => Promise<{
          ok?: boolean
          ready?: boolean
          currentVersion?: string
          latestVersion?: string
          error?: string
        }>
        installUpdate?: () => Promise<unknown>
        openLogs?: () => Promise<unknown>
        restartApp?: () => Promise<unknown>
      }
    }
  ).stravisionDesktop

  useEffect(() => {
    if (!IS_DESKTOP_APP) {
      // Web：从 build info 拿版本（没有就用占位）
      setVersion(process.env.NEXT_PUBLIC_APP_VERSION || null)
      return
    }
    bridge
      ?.getBackendInfo?.()
      .then((r) => setVersion(r?.version || null))
      .catch(() => {})
  }, [bridge])

  const checkUpdate = async () => {
    if (!bridge?.checkForUpdate) {
      message.info("网页版随服务端一同更新，刷新页面即可")
      return
    }
    setChecking(true)
    try {
      const r = await bridge.checkForUpdate()
      if (!r?.ok) {
        message.error(`检查更新失败：${r?.error ?? "未知错误"}`)
        return
      }
      if (r.ready) {
        setReady(true)
        message.success(`新版本 v${r.latestVersion ?? ""} 已下载完成，可立即安装`)
      } else if (r.latestVersion && r.latestVersion !== r.currentVersion) {
        message.info(`发现新版本 v${r.latestVersion}，正在后台下载，完成后会提示你`)
      } else {
        message.success(`已是最新版本（v${r.currentVersion ?? ""}）`)
      }
    } catch {
      message.error("检查更新失败")
    } finally {
      setChecking(false)
    }
  }

  return (
    <>
      <GroupTitle>版本信息</GroupTitle>
      <Card>
        <Row title="应用版本" desc={IS_DESKTOP_APP ? "本机桌面应用版本。" : "当前服务端版本。"}>
          <Space>
            <Text style={{ fontSize: 14, color: "var(--set-text)" }}>{version || "—"}</Text>
            {ready && (
              <Button size="small" type="primary" onClick={() => bridge?.installUpdate?.()}>
                立即重启安装
              </Button>
            )}
            <Button size="small" loading={checking} onClick={checkUpdate}>
              检查更新
            </Button>
          </Space>
        </Row>
        <Row title="运行形态" desc="当前应用的部署方式。" last>
          <Tag style={{ margin: 0, borderRadius: 999 }}>{IS_DESKTOP_APP ? "桌面端（本机）" : "网页版"}</Tag>
        </Row>
      </Card>

      {IS_DESKTOP_APP && (
        <>
          <div style={{ height: 20 }} />
          <GroupTitle>维护</GroupTitle>
          <Card>
            <Row title="运行日志与重启" desc="排查启动或运行问题时使用。" last>
              <Space size={8}>
                <Button
                  size="small"
                  onClick={async () => {
                    try {
                      await bridge?.openLogs?.()
                    } catch {
                      message.error("打开日志失败")
                    }
                  }}
                >
                  打开日志目录
                </Button>
                <Button
                  size="small"
                  danger
                  onClick={() =>
                    Modal.confirm({
                      title: "重启应用？",
                      content: "应用将立即退出并重新启动，未保存的输入会丢失。",
                      okText: "重启",
                      cancelText: "取消",
                      onOk: () => bridge?.restartApp?.(),
                    })
                  }
                >
                  重启应用
                </Button>
              </Space>
            </Row>
          </Card>
        </>
      )}

      <div style={{ height: 20 }} />
      <GroupTitle>协议与帮助</GroupTitle>
      <Card>
        <Row title="服务协议与隐私政策" desc="了解我们如何提供服务与保护你的数据。">
          <Space size={8}>
            <Button size="small" onClick={() => (window.location.href = "/terms")}>
              服务协议
            </Button>
            <Button size="small" onClick={() => (window.location.href = "/privacy")}>
              隐私政策
            </Button>
          </Space>
        </Row>
        <Row title="帮助与反馈" desc="遇到问题可以查看帮助文档或提交反馈。" last>
          <Space size={8}>
            <Button size="small" onClick={() => (window.location.href = "/help")}>
              帮助中心
            </Button>
            <Button size="small" onClick={() => (window.location.href = "/changelog")}>
              更新日志
            </Button>
          </Space>
        </Row>
      </Card>
    </>
  )
}
