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
 *   │ │ AI 服务  │ └───────────────────────────────────┘ │ │
 *   │ └──────────┴───────────────────────────────────────┘ │
 *   └──────────────────────────────────────────────────────┘
 *   · 左栏灰底 + 分组小标题 + 选中项浅灰圆角块（无边框）
 *   · 右栏 = 大标题 + 分组小标题 + 白卡片；行 = 左标题/描述 + 右控件
 *   · 开关为绿色胶囊；右上角 × 关闭
 *
 * 分区：个人资料 / 通用 / 外观 / 个性化 / 记忆与进化 / AI 服务 / 语音助手 /
 *       摄像头与设备 / 助理设置 / 数据管理 / 安全中心 / 关于
 *
 * 🚨 「模型」分区已于 2026-10-11 并入「AI 服务」（用户：两者功能重合＝过度设计）。
 *    老 key "model" 仍可作深链（SECTION_ALIAS 会规范化到 "ai-services"），但左栏不再单列。
 *
 * 🚨 「个人资料」= 原 /settings 独立页面（2026-10-05 并入），**不再有独立页面**；
 *    任何指向账号资料的入口都应 `openSettings("profile")`，不要再路由到 /settings。
 */

import { useFeedback } from "@/lib/ui/feedback"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import {
  App,
  Button,
  ConfigProvider,
  Drawer,
  Empty,
  Input,
  Modal,
  Slider,
  Space,
  Tag,
  theme as antdTheme,
  Tooltip,
  Typography,
} from "antd"
import type { UserPublic } from "@/lib/db/user-service"
import { IS_DESKTOP_APP } from "@/lib/desktop-mode"
import { IconBackgroundColor, IconCamera, IconCertificate, IconClose, IconCloudStorage, IconDatabaseNetwork, IconDelete, IconDownload, IconEdit, IconEmotionHappy, IconExport, IconInfo, IconLight, IconPlus, IconRefresh, IconSave, IconSetting, IconSettingTwo, IconUpload, IconUser, IconVolumeNotice } from "@/components/icon";
// 沉浸光感材质：厚度三档（流畅/轻柔/精美）的读写与文案唯一来源，见 components/device/material-css.ts
import {
  readActiveLevel,
  saveUserLevel,
  type MaterialLevel,
} from "@/components/device/material-css";
// 材质厚度预览卡：2026-09-29 抽成独立组件，与产品更新页 /whats-new 共用同一个真组件，不再各写一版
import { MaterialLevelPicker } from "@/components/settings/material-level-picker";
// 窗口不透明度（桌面透传）：读写 + 应用 + 水合前预置的唯一出口
import {
  applyGlassAlpha,
  glassShellActive,
  readGlassAlpha,
  GLASS_ALPHA_DEFAULT_DARK,
  GLASS_ALPHA_DEFAULT_LIGHT,
  GLASS_ALPHA_MIN,
  GLASS_ALPHA_MAX,
} from "@/lib/ui/glass-alpha";
// 版式原子 + 主题作用域样式：与设备管理弹窗共用（见文件头注释），此处仅做零视觉变更的搬迁
import {
  Card,
  Dropdown,
  GreenSwitch,
  GroupTitle,
  Row,
  SettingsModalStyle,
} from "@/components/settings/settings-modal-ui";
// 上下文偏好：仅用纯函数层（常量 / 归一化 / 预设换算），不 import DB 服务，避免把 pg 拖进浏览器
import {
  CONTEXT_WINDOW_PRESETS,
  DEFAULT_USER_CONTEXT_PREFS,
  MAX_TRIGGER_RATIO,
  MIN_TRIGGER_RATIO,
  presetFromWindowTokens,
  windowTokensFromPreset,
} from "@/lib/ai/context/context-prefs";
// antd 侧字体唯一源（禁止在此写字面量，见 lib/theme/antd-scope-theme.ts 顶部说明）
import { ANTD_FONT_FAMILY } from "@/lib/theme/antd-scope-theme";

const { Text } = Typography

/* ------------------------------------------------------------------ */
/* 「AI 服务」分区：内嵌原管理后台的提供商管理面板                        */
/* ------------------------------------------------------------------ */

/**
 * 懒加载：AIProvidersManager 是个 2000 行的重组件（含 @lobehub/icons 品牌图标），
 * 直接静态 import 会把它塞进设置弹窗的首屏 chunk。用 dynamic 保证**只有真正点开
 * 「AI 服务」分区**时才去拉这块代码 —— 多数用户从不打开它，不该为它付下载成本。
 */
const LazyAIProvidersManager = dynamic(
  () => import("@/components/admin/ai-providers-manager").then((m) => m.AIProvidersManager),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: 40, textAlign: "center", color: "var(--set-text-secondary)", fontSize: 13 }}>
        正在加载 AI 服务…
      </div>
    ),
  },
)

/**
 * 内嵌面板的两段补丁 CSS：
 * ① `.ai-svc-embed .ant-card` —— 把 antd 卡片底色统一到设置卡片层级。antd 深色 token 的
 *    卡片底色比 `--set-card-bg` 更深，不平一下会在设置里显得「脱层」。
 * ② `.ai-svc-portal` —— 面板里的 Modal 是 portal 到 body 的，会脱离 `.ai-settings-scope`，
 *    拿不到 `--set-*` 令牌（只能命中写死的浅色 fallback），深色下就会浅字压深底。
 *    按 html.dark 补一份同名令牌即可 —— next-themes 用 attribute="class"（见 app/layout.tsx），
 *    无需组件感知当前主题。
 */
const AI_SVC_EMBED_CSS = `
.ai-svc-embed .ant-card {
  background: var(--set-card-bg);
}
.ai-svc-portal {
  --set-text: #18181B;
  --set-text-body: #52525B;
  --set-text-secondary: #8F959E;
  --set-card-bg: #FFFFFF;
  --set-card-border: #EDEEEF;
  --set-subcard-bg: #FAFAFA;
  --set-chip-bg: #F4F4F5;
  --set-accent-border: #D6E4FF;
}
html.dark .ai-svc-portal {
  --set-text: #E4E4E7;
  --set-text-body: #A1A1AA;
  --set-text-secondary: #9CA0A8;
  --set-card-bg: #1F1F24;
  --set-card-border: #2E2E34;
  --set-subcard-bg: #26262B;
  --set-chip-bg: #2E2E34;
  --set-accent-border: rgba(5, 150, 105, .35);
}
`

/* ------------------------------------------------------------------ */
/* 「语音助手」/「摄像头与设备」分区：内嵌原管理后台的两块配置            */
/* ------------------------------------------------------------------ */

/** 懒加载占位（与上面 AI 服务同款，避免三处各写一份） */
function PanelLoading({ label }: { label: string }) {
  return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--set-text-secondary)", fontSize: 13 }}>
      {label}
    </div>
  )
}

/**
 * 同样按需加载：这两个组件原先是管理后台整页用的，只有点开对应分区才拉代码。
 * 各自加 `variant="embedded"` 走设置版式，与后台整页版共用同一份数据逻辑。
 */
const LazyVoiceSettings = dynamic(
  () => import("@/components/admin/voice-settings").then((m) => m.VoiceSettings),
  { ssr: false, loading: () => <PanelLoading label="正在加载语音设置…" /> },
)

const LazyCameraSettings = dynamic(
  () => import("@/components/admin/camera-settings").then((m) => m.CameraSettings),
  { ssr: false, loading: () => <PanelLoading label="正在加载摄像头设置…" /> },
)

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
  | "profile"
  | "general"
  | "appearance"
  | "personalization"
  | "memory"
  | "ai-services"
  /** @deprecated 2026-10-11 与「AI 服务」合并，保留为**深链别名**（见 SECTION_ALIAS）。
   *  AI 助手顶栏「管理设置」仍传 "model"，规范化后落到 ai-services，左栏不再单列此项。 */
  | "model"
  | "voice"
  | "devices"
  | "assistant"
  | "data"
  | "security"
  | "about"

/**
 * 🚨 分区别名 → 规范分区（2026-10-11）。
 *
 * 起因：用户指出「AI 服务和模型好多功能都重合了，这是过度设计」——
 * 两者都在管理「服务商 / 默认模型」，其中「模型」分区还只是把 provider 渲染成 Tag
 * 再配两个跳回「AI 服务」的按钮，纯绕路。合并后只留「AI 服务」一个分区。
 *
 * 但**旧 key 不能直接删**：`app/ai-assistant/page.tsx` 的「管理设置」菜单、
 * 以及任何外部 `openSettings("model")` 都还在传 "model"。所以统一在**入口处规范化**，
 * 让 `section` state 永远只持有规范 key —— 这样左栏高亮、右栏大标题（都按 key 查表）
 * 自动正确，不必在每个消费点各写一份判断。
 */
const SECTION_ALIAS: Partial<Record<SettingsSection, SettingsSection>> = {
  model: "ai-services",
}

/** 把历史/别名分区收敛为规范分区 */
function normalizeSection(s: SettingsSection | undefined): SettingsSection {
  if (!s) return "personalization"
  return SECTION_ALIAS[s] ?? s
}

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
/* 导航                                                                */
/* ------------------------------------------------------------------ */

function buildNav(): NavGroup[] {
  return [
    {
      title: "",
      items: [
        // 2026-10-05：原 `/settings` 独立页面（账号资料）收进设置弹窗，成为「个人资料」分区。
        // 放在第一位：用户从头像菜单「个人设置」进来就能直接看到，不用再找。
        { key: "profile", label: "个人资料", icon: <IconUser /> },
        { key: "general", label: "通用", icon: <IconSetting /> },
        { key: "appearance", label: "外观", icon: <IconBackgroundColor /> },
      ],
    },
    {
      title: "功能",
      items: [
        { key: "personalization", label: "个性化", icon: <IconEmotionHappy /> },
        { key: "memory", label: "记忆与进化", icon: <IconLight /> },
        // 2026-10-01：原「模型」分区里只是一个跳转管理后台的按钮（桌面端体验很割裂），
        // 现把管理后台的核心面板（提供商 / 密钥 / 模型清单 / 默认模型）整体内嵌为独立分区，
        // 设置内闭环，不再 window.location 跳出。
        //
        // 🚨 2026-10-11：用户指出「AI 服务」与「模型」功能高度重合（都在管服务商 + 默认模型，
        // 「模型」里还只放了两块只读展示 + 两个跳回本分区的按钮）＝过度设计 → **两者合并**。
        // 合并后这一项同时承担：选默认模型（日常）＋ 管理服务商（配置）；运维类配置
        // （知识库 Embedding / 联网搜索 / 知识库全局参数 / 积分制度）收进面板内「高级设置」。
        // 旧 "model" key 仍可作深链用（SECTION_ALIAS 规范化），但左栏不再单列。
        { key: "ai-services", label: "AI 服务", icon: <IconCloudStorage /> },
        // 2026-10-01：原管理后台的「语音助手配置」「监控摄像头配置」两块，按用户要求
        // 一并收进设置弹窗，并改用设置版式原子（原组件加 variant="embedded" 复用，
        // 不复制第二份实现）。管理后台仍保留整页版，两处共用同一份数据逻辑。
        { key: "voice", label: "语音助手", icon: <IconVolumeNotice /> },
        { key: "devices", label: "摄像头与设备", icon: <IconCamera /> },
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

/**
 * 窄屏（手机）版式补丁（2026-10-05 大改：全屏 sheet 化 + 灵动岛避让）
 *
 * 起因：弹窗宽 `min(920px, 94vw)` 在 390px 视口下不横向溢出，但**左栏仍固定 196px**，
 * 右栏被压到 ~170px → 中文标题逐字竖排（实测「用户名」竖成一条）。
 *
 * v2（2026-10-05 用户要求「设置也根据移动端重新做适配」）：
 *   ≤720px 时整个弹窗变成 **iOS 全屏 sheet**（100vw × 100dvh、无圆角、无浮层留白），
 *   顶部吃掉灵动岛/状态栏（env(safe-area-inset-top)，依赖根布局 viewport-fit=cover），
 *   底部吃掉 Home Indicator；分区导航保持顶部横向 chips + 下方单栏内容
 *   （与 iOS 系统设置一致的形态）。分组小标题在横排里没有意义 → 隐藏。
 *
 * ⚠️ 必须 `!important`：弹窗宽高、左栏 196px、scope 高度 min(720px,84vh)
 *    都是 inline style，优先级高于类选择器。
 */
const SETTINGS_NARROW_CSS = `
@media (max-width: 720px) {
  /* ── 全屏 sheet：占满视口，去掉居中浮层的留白与圆角 ── */
  .ai-settings-modal .ant-modal {
    max-width: 100vw !important;
    width: 100vw !important;
    margin: 0 !important;
    top: 0 !important;
    padding-bottom: 0 !important;
  }
  .ai-settings-modal .ant-modal-container {
    border-radius: 0 !important;
    min-height: 100dvh !important;
    background: var(--set-bg) !important;
  }
  /* ── 主体：纵向布局 + 全屏高（覆盖 inline 的 min(720px, 84vh)）── */
  .ai-settings-scope {
    flex-direction: column !important;
    height: 100dvh !important;
    min-height: 100dvh !important;
  }
  /* ── 顶部导航栏（原左栏）：顶部吃掉灵动岛/状态栏 ── */
  .ai-settings-scope > div:first-child {
    width: 100% !important;
    border-right: none !important;
    border-bottom: 1px solid var(--set-border) !important;
    padding-top: max(env(safe-area-inset-top), 12px) !important;
    flex-shrink: 0 !important;
  }
  .ai-settings-scope .set-nav-scroll {
    display: flex !important;
    flex-direction: row !important;
    align-items: center;
    gap: 4px;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0 8px 10px !important;
  }
  .ai-settings-scope .set-nav-scroll > div { display: flex !important; flex: 0 0 auto; margin-bottom: 0 !important; }
  .ai-settings-scope .set-nav-group-title { display: none !important; }
  .ai-settings-scope .set-nav-item { width: auto !important; white-space: nowrap; padding: 6px 12px !important; }
  /* ── 内容栏：标题行收紧，底部吃掉 Home Indicator ── */
  .ai-settings-scope > div:last-child > div:first-child {
    padding-top: 12px !important;
    padding-bottom: 8px !important;
  }
  .ai-settings-scope > div:last-child > div:last-child {
    padding-bottom: max(env(safe-area-inset-bottom), 24px) !important;
  }
  /* 行改成纵向堆叠：左右布局在 367px 宽里会把标题挤成逐字竖排（实测「用户名」竖成一条）。
     控件另起一行并撑满，input/select 的固定 280px 宽也一并放开。 */
  .ai-settings-scope .set-row { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
  .ai-settings-scope .set-row-ctrl { justify-content: flex-start !important; flex-wrap: wrap !important; }
  .ai-settings-scope .ant-input,
  .ai-settings-scope .ant-input-affix-wrapper,
  .ai-settings-scope .ant-select,
    .ai-settings-scope .ant-input-number { width: 100% !important; max-width: 100% !important; }
}
`

/* ------------------------------------------------------------------ */
/* 设置弹窗 · 沉浸光感（玻璃化）                                        */
/* ------------------------------------------------------------------ */

/**
 * 设置弹窗的玻璃化补丁（2026-10-24）
 *
 * ── 为什么它该是玻璃 ──
 *   设置弹窗是「与页面内容重叠的交互层」（HDS 场景规范里的 Z 轴 ①），官方对
 *   「半模态 / 弹框（内容多）」给的档位就是 ULTRA。材质本体**不在本文件重写** ——
 *   容器上直接挂 `.dc-mat .dc-mat--ultra`（唯一源 components/device/material-css.ts），
 *   这里只补三件材质做不到的事：
 *     ① **画布让位**：scope / 右栏的实色底（--set-bg）必须变透明，否则玻璃被自己的
 *        实色底整块盖住 —— 用户 2026-10-24 说的「设置弹窗好像没用上沉浸光感」就是这一条：
 *        当时 container 与 scope 各写了一份 #FAFAFA 实色，材质就算挂上也透不出任何东西；
 *     ② **内容层仍实色**：卡片保持 --set-card-bg（规范：内容不用玻璃），只补轻投影；
 *     ③ **遮罩减淡**：antd 默认 rgba(0,0,0,.45) 会把背后的景整片压死，玻璃就无光可吸。
 *
 * ── 边界（两条都必须留）──
 *   · 窄屏 ≤720px = 全屏 sheet，背后没有任何景可言 → 回实色且不做 blur（省电）；
 *   · 「沉浸光感」关闭（html[data-mat-level="off"]）→ 回实色，投影退回普通弹窗级。
 *
 * ⚠️ 特异性都要算准：SettingsModalStyle 里 `.ai-settings-scope[data-settings-theme="dark"]`
 *    是 (0,2,0)，所以下面覆盖变量时必须带 `[data-settings-theme]`（凑到 (0,3,0)），
 *    否则暗色那份实色变量会赢回来，暗色下就又变回一块实心板。
 */
const SETTINGS_GLASS_CSS = `
/* ── ① 弹窗容器：材质本体（.dc-mat .dc-mat--ultra）已在 classNames 上，
      这里只做两件材质自己做不到的事：
      (a) 底色必须**显式取 --mat-bg**：antd 给「.ant-modal-container」写了
          「background: var(--ant-color-bg-elevated)」（亮 #fff / 暗 #1f1f1f），
          特异性 (0,2,0) 压过「.dc-mat」的 (0,1,0) —— 不显式接管的话，
          材质只剩 backdrop-filter 在空转，弹窗仍是一块不透明的板（2026-10-24 实测）；
      (b) 投影换成"弹窗级"量级 —— 材质基类的 box-shadow 是
          「var(--mat-shadow), var(--mat-edge)」，改变量即可保留那道内缘光。 ── */
.ai-settings-modal .ant-modal-container.ai-set-glass.dc-mat--ultra{
  background-color: var(--mat-bg) !important;
  border-color: var(--mat-border) !important;
  /* 厚度：ULTRA 档默认 .62 白。设置弹窗面积大（920×640）、背后又是设备页那种高饱和卡片，
     .62 会把 LED 色盘那类大色块整片糊上来，读起来"花"。压到 .74 仍然透光透形，但不再抢字。 */
  --mat-bg: rgba(255, 255, 255, .74);
  --mat-shadow: 0 2px 8px rgba(15, 23, 42, .05), 0 32px 80px -28px rgba(15, 23, 42, .32);
}
/**
 * 暗色不走官方 ULTRA 的「叠白 .78」——
 * 那一档在小面积浮层（Copilot 侧栏）上是"被光照亮"，但 920×640 一整块 .78 白叠在暗底上
 * 合成出接近 #3A3A42 的**浅灰板**：既不像暗色界面，又比内部卡片（#1F1F24）亮，
 * 层级直接反转成"卡片是挖进去的凹槽"。这里改用「深色玻璃」：底色贴近画布、
 * 靠 backdrop-filter 的 saturate/brightness 透出背后的光，再把卡片抬到比底亮一档。
 */
html.dark .ai-settings-modal .ant-modal-container.ai-set-glass{
  --mat-bg: rgba(24, 24, 28, .74);
  --mat-border: rgba(255, 255, 255, .10);
  --mat-shadow: 0 2px 8px rgba(0, 0, 0, .45), 0 40px 96px -32px rgba(0, 0, 0, .85);
}

/* ── ② 画布让位：scope / 左右栏的实色底透明，露出材质本体 ──
      左栏不再叠一层白玻璃（两层白叠起来左栏会比右栏还亮，导航"浮"起来），
      改用极淡中性膜 —— 原设计里 #F7F7F8 本来就比 #FAFAFA 暗一档。 */
.ai-set-glass .ai-settings-scope[data-settings-theme]{
  --set-bg: transparent;
  --set-sidebar-bg: rgba(120, 120, 128, .055);
  --set-border: rgba(15, 23, 42, .07);
  --set-row-border: rgba(15, 23, 42, .05);
  --set-nav-hover-bg: rgba(120, 120, 128, .08);
  --set-nav-active-bg: rgba(120, 120, 128, .12);
  --set-hover-fill: rgba(120, 120, 128, .10);
}
html.dark .ai-set-glass .ai-settings-scope[data-settings-theme]{
  --set-sidebar-bg: rgba(255, 255, 255, .035);
  --set-border: rgba(255, 255, 255, .08);
  --set-row-border: rgba(255, 255, 255, .06);
  --set-nav-hover-bg: rgba(255, 255, 255, .05);
  --set-nav-active-bg: rgba(255, 255, 255, .08);
  --set-hover-fill: rgba(255, 255, 255, .07);
  /* 卡片必须比玻璃底亮一档（暗底上"同色卡"等于没有卡，与 ios-widget 同一条推理）。
     深色玻璃底合成后约 #1E1E22 —— 沿用原来的 #1F1F24 会与底几乎同色、轮廓整片消失。 */
  --set-card-bg: #26262C;
  --set-card-border: rgba(255, 255, 255, .09);
  --set-subcard-bg: #2C2C33;
  --set-subcard-border: rgba(255, 255, 255, .08);
}

/* ── ③ 内容层：实色卡片 + 一层极轻投影（玻璃底上靠投影说明"浮起"） ── */
.ai-set-glass .set-card{
  box-shadow: 0 1px 2px rgba(15, 23, 42, .04), 0 6px 16px -12px rgba(15, 23, 42, .18);
}
html.dark .ai-set-glass .set-card{
  box-shadow: 0 1px 2px rgba(0, 0, 0, .35), 0 10px 24px -16px rgba(0, 0, 0, .70);
}

/* ── ④ 遮罩：压到"看得见背后、又知道被挡住"的程度。
      模糊只给 2px：太多会把弹窗旁边的页面糊成一块脏灰，反而没有"景"的感觉。 ── */
.ai-settings-mask{
  background: rgba(15, 23, 42, .20) !important;
  -webkit-backdrop-filter: blur(2px) saturate(1.05);
  backdrop-filter: blur(2px) saturate(1.05);
}
html.dark .ai-settings-mask{
  background: rgba(0, 0, 0, .38) !important;
}

/* ── ⑤ 关闭沉浸光感：容器带 .ai-set-solid（材质类已被 useMaterialOff 摘掉）──
      这里只给设计值。⚠️ 不要试图用 CSS 覆盖材质类的关闭档 —— material-css 那条
      「html[data-mat-level="off"] :is(... .dc-mat--ultra ...):not(...) 四个」是 (0,6,1)+!important，
      压不过（实测会被刷成纯白 #fff，暗色下就是一块白板）。摘类才是正解。 */
.ai-settings-modal .ant-modal-container.ai-set-solid{
  background-color: #FAFAFA;
  border: 1px solid rgba(15, 23, 42, .06);
  box-shadow: 0 12px 40px rgba(0, 0, 0, .16);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
html.dark .ai-settings-modal .ant-modal-container.ai-set-solid{
  background-color: #18181B;
  border-color: rgba(255, 255, 255, .08);
  box-shadow: 0 12px 40px rgba(0, 0, 0, .55);
}
html[data-mat-level="off"] .ai-settings-mask{
  background: rgba(0, 0, 0, .45) !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}

/* ── ⑥ 窄屏 = 全屏 sheet：背后没有景，玻璃不成立 ──
      （SETTINGS_NARROW_CSS 里那条 background: var(--set-bg) 取不到值 ——
       container 不在 scope 作用域内，原本是靠 inline 背景撑着的，现在 inline 已交给材质，
       所以这里必须显式给实色，否则全屏 sheet 会露底。） */
@media (max-width: 720px){
  .ai-settings-modal .ant-modal-container.ai-set-glass.dc-mat--ultra{
    background-color: #FAFAFA !important;
    border-color: transparent !important;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
    box-shadow: none !important;
    --mat-edge: inset 0 0 0 0 rgba(0, 0, 0, 0);
  }
  html.dark .ai-settings-modal .ant-modal-container.ai-set-glass.dc-mat--ultra{
    background-color: #18181B !important;
  }
  .ai-settings-mask{
    background: rgba(0, 0, 0, .45) !important;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
  }
  .ai-set-glass .ai-settings-scope[data-settings-theme]{
    --set-bg: #FAFAFA;
    --set-sidebar-bg: #F7F7F8;
  }
  html.dark .ai-set-glass .ai-settings-scope[data-settings-theme]{
    --set-bg: #18181B;
    --set-sidebar-bg: #1D1D21;
    --set-card-bg: #1F1F24;
    --set-card-border: #2E2E34;
    --set-subcard-bg: #26262B;
  }
}
`

/* ------------------------------------------------------------------ */
/* 主组件                                                              */
/* ------------------------------------------------------------------ */

/**
 * 只读「沉浸光感是否被关掉」（html[data-mat-level="off"]）。
 *
 * ── 为什么不能用 useAdaptiveMaterialLevel ──
 *   那个 hook 会跑设备探测 + 帧预算看门狗；设置弹窗本身就是全站最重的一块 blur
 *   （920×640、64px 模糊），让它再带一个看门狗，会因为"弹窗自己卡"而降档 → 用户越开设置越糊。
 *   这里只要一个布尔：关了就摘掉材质类。
 *
 * ── 为什么必须摘类，而不是用 CSS 覆盖 ──
 *   material-css 的关闭档规则是 `html[data-mat-level="off"] :is(..., .dc-mat--ultra, ...)
 *   :not(...)×4 { background-color: var(--dc-solid-card) !important }`，特异性算下来 (0,6,1)，
 *   任何"在组件里另写一条 !important"都压不过它（实测容器被刷成纯白 #fff，暗色下成白板）。
 *   把类摘掉，那条规则就压根不匹配 —— 比堆特异性干净得多。
 *   副作用是好的：用户在设置里关掉开关的**当场**就能看到弹窗从玻璃变实色。
 */
function useMaterialOff() {
  /* 初值直接读 <html>：弹窗是懒加载的，挂载时档位早已写在 html 上。
     若初值给 false，关闭档下首帧会挂上材质类、再被摘掉 —— 那一下白闪在暗色里很明显。 */
  const [off, setOff] = useState(
    () => typeof document !== "undefined" && document.documentElement.dataset.matLevel === "off",
  )
  useEffect(() => {
    const root = document.documentElement
    const sync = () => setOff(root.dataset.matLevel === "off")
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(root, { attributes: true, attributeFilter: ["data-mat-level"] })
    return () => mo.disconnect()
  }, [])
  return off
}

export function AISettingsDialog({
  open,
  onOpenChange,
  initialSection,
  onVoiceSettingsChange,
}: AISettingsDialogProps) {
  const { modal } = App.useApp()
  // 规范化：外部可能传老 key（如 AI 助手「管理设置」传 "model"），统一收敛后再存进 state，
  // 这样左栏高亮与右栏大标题（都按 key 查 nav 表）无需各自处理别名。
  const [section, setSection] = useState<SettingsSection>(normalizeSection(initialSection))
  const nav = useMemo(() => buildNav(), [])
  // 主题跟随全局 next-themes（2026-09-20 深色适配）：容器 CSS 变量 + antd darkAlgorithm 双轨
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  /* 沉浸光感关闭时不挂材质类（原因见 useMaterialOff 注释） */
  const matOff = useMaterialOff()

  useEffect(() => {
    if (open) setSection(normalizeSection(initialSection))
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
      /* 桌面端固定 920；窄屏（移动端从个人中心进设置）按视口收敛，避免横向溢出 */
      width="min(920px, 94vw)"
      centered
      /* 🚨 antd v6 已把 destroyOnClose 改名为 destroyOnHidden（旧名控制台告警） */
      destroyOnHidden
      /* 🚨 antd v6 已把 maskClosable 标记为 deprecated（控制台告警），改用 mask.closable */
      mask={{ closable: false }}
      rootClassName="ai-settings-modal"
      /**
       * 🚨 窗口圆角必须作用在这两层，缺一不可：
       * - `.ant-modal`（外层）默认带白底 + box-shadow，若不清掉，圆角外会漏出一圈白边，
       *   看起来就像「多包了一层容器」；
       * - 真正承载视觉的窗口是 `.ant-modal-container`（antd v6 已由 content 更名），
       *   背景 + 圆角 + 裁切 + 阴影都在它身上。
       *
       * 🚨 2026-10-24 玻璃化：底色 / 描边 / 阴影**一律交给 CSS 的 .ai-set-glass**
       *   （它同时挂了材质本体 `dc-mat dc-mat--ultra`）。这里绝不能再写 background
       *   或 boxShadow —— inline 优先级最高，会把 --mat-bg 与「内缘光 + 投影」整条盖掉，
       *   材质等于白挂（与 Copilot 侧栏同一条坑，见 copilot-sidebar.tsx 的注释）。
       */
      classNames={{
        container: `ai-set-glass${matOff ? " ai-set-solid" : " dc-mat dc-mat--ultra"}`,
        mask: "ai-settings-mask",
      }}
      styles={{
        body: { padding: 0 },
        container: {
          padding: 0,
          borderRadius: 12,
          overflow: "hidden",
        },
      }}
    >
      <SettingsModalStyle modalClass="ai-settings-modal" scopeClass="ai-settings-scope" />
      <style>{SETTINGS_NARROW_CSS}</style>
      <style>{SETTINGS_GLASS_CSS}</style>
      {/* 🚨 这里必须显式给 colorPrimary：
          设置里内嵌了后台组件（AI 服务 / 摄像头 / 语音），那些组件原本跑在 /admin 的
          ConfigProvider（colorPrimary #059669）下；只切 algorithm 不切主色的话，
          它们会掉回 antd 默认蓝 —— 与设置里的绿色开关、绿边选中共存，一眼就“不适配主题色”。
          取 #12B76A 与设置内既有强调色（GreenSwitch）保持一致。

          🚨 fontFamily 不可省（2026-10-11 用户：「setting 的文本字体给我统一好吗」）：
          antd v6 把字体做成 CSS 变量 --ant-font-family（默认 = -apple-system/Segoe UI 系统栈），
          定义在它的变量宿主（.css-var-root）上并向所有 antd 组件下发 —— 于是弹窗内
          「从宿主往下」的一切（含弹窗自己的 .ai-settings-scope 左栏/标题/描述）全部掉回系统字体，
          与弹窗外的全站鸿蒙黑体两副面孔（实测 42 个文本节点里 41 个是 -apple-system，仅标题 1 个是鸿蒙）。
          ⛔ 别在这里写字面量 —— 取值一律走 ANTD_FONT_FAMILY（antd 侧唯一源，见 lib/theme/antd-scope-theme.ts）。 */}
      <ConfigProvider
        theme={{
          algorithm: isDark ? antdTheme.darkAlgorithm : undefined,
          token: { colorPrimary: "#12B76A", fontFamily: ANTD_FONT_FAMILY },
        }}
      >
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
          {/* 🚨 data-lenis-prevent 不可省（两个滚动容器都要）：全站滚轮由 React Lenis 接管，
              只有 composedPath 上带这个属性的容器才放行滚动。没有它，左栏/右栏的
              overflow-y:auto 就是摆设 —— 滚轮怎么滚 scrollTop 都恒为 0（2026-10-05 实测）。 */}
          <div data-lenis-prevent className="set-nav-scroll" style={{ flex: 1, overflowY: "auto", padding: "0 8px 16px" }}>
            {nav.map((g, gi) => (
              <div key={gi} style={{ marginBottom: g.title ? 14 : 4 }}>
                {g.title && (
                  <div className="set-nav-group-title" style={{ fontSize: 12, color: "var(--set-text-tertiary)", padding: "0 8px 6px" }}>{g.title}</div>
                )}
                {g.items.map((it) => {
                  const active = section === it.key
                  return (
                    <button
                      key={it.key}
                      type="button"
                      className="set-nav-item"
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

          {/* 同上：右栏也必须 data-lenis-prevent，否则内容长了（如「个人资料」）滚不动 */}
          <div data-lenis-prevent style={{ flex: 1, overflowY: "auto", padding: "0 24px 24px" }}>
            <Panel
              section={section}
              registerDirty={(fn) => (dirtyRef.current = fn)}
              onNavigate={(s) => setSection(s)}
            />
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
  onNavigate,
}: {
  section: SettingsSection
  registerDirty: (fn: () => boolean) => void
  /** 切换分区（供子面板做「去 XX 设置」这类站内跳转，替代跳出到管理后台） */
  onNavigate: (section: SettingsSection) => void
}) {
  switch (section) {
    case "profile":
      return <ProfilePanel registerDirty={registerDirty} />
    case "general":
      return <GeneralPanel registerDirty={registerDirty} />
    case "appearance":
      return <AppearancePanel registerDirty={registerDirty} />
    case "personalization":
      return <PersonalizationPanel registerDirty={registerDirty} />
    case "memory":
      return <MemoryPanel />
    // 合并后的单一分区：默认模型 + 服务商管理 + 高级设置。
    // "model" 是 2026-10-11 合并前的老 key，正常已被 normalizeSection 收敛，
    // 这里再兜一次（fallthrough），确保任何绕过规范化的调用也不会落进 default 变成空白面板。
    case "ai-services":
    case "model":
      return <AIServicesPanel />
    case "voice":
      return <VoicePanel registerDirty={registerDirty} />
    case "devices":
      return <DevicesPanel registerDirty={registerDirty} />
    case "assistant":
      return <AssistantPanel registerDirty={registerDirty} />
    case "data":
      return <DataPanel />
    case "security":
      return <SecurityPanel onNavigate={onNavigate} />
    case "about":
      return <AboutPanel />
    default:
      return null
  }
}

/* ------------------------------------------------------------------ */
/* AI 服务（内嵌原管理后台的提供商管理）                                 */
/* ------------------------------------------------------------------ */

/**
 * 桌面端 / Web 端都把「加服务商、填 API Key、建模型清单」收进设置弹窗。
 *
 * 🚨 视觉真正对齐设置 UI（2026-10-01 二次改造，用户明确要求「UI 要适配设置的 UI」）：
 *   ① 删掉内层强制浅色的 ConfigProvider —— 面板内的 antd 组件改为继承设置弹窗的
 *      亮/暗算法，深色下 Button / Input / Select / Tag 不再一律浅色；
 *   ② 删掉原先的「白底画框」（那只是把管理后台的浅色整块搬过来），改用设置的
 *      `Card` 原子，深色自动变暗卡片，与管理后台页面各用各的底、不互相牵制；
 *   ③ 面板源码里写死的结构色（卡片边框 / 浅底 / 正文文字）已批量换成
 *      `var(--set-*, 原浅色)`：在设置作用域内跟随主题令牌，在 /admin 页面
 *      （无令牌）命中 fallback 原浅色，管理后台视觉零变化；
 *   ④ 面板内 Modal 走 portal 脱离作用域，用 AI_SVC_EMBED_CSS 里的 `.ai-svc-portal` 补令牌；
 *   ⑤ 不再套外层 Card —— 面板本身就是一组卡片，再包一层会变成「卡片套卡片」，
 *      违反项目铁律「一层容器」，只用 `.ai-svc-embed` 统一卡片底色。
 */
function AIServicesPanel() {
  return (
    <>
      <GroupTitle>模型与服务商</GroupTitle>
      {/* 面板内自上而下：① 默认模型（日常最常改）→ ② 服务商列表（加/删/编辑/Key/模型清单）
          → ③ 高级设置（默认收起：知识库 Embedding / 联网搜索 / 知识库全局参数 / 积分制度）。
          ②③ 的顺序与折叠由 AIProvidersManager 的 embedded 分支决定，见那个文件。 */}
      <div className="ai-svc-embed">
        <LazyAIProvidersManager variant="embedded" />
      </div>

      {/* 桌面端没有 /admin 页面，不渲染这条；Web 端保留运维入口。
          合并「模型」分区前，这条挂在「模型」面板底部，随合并搬迁至此，功能不减。 */}
      {!IS_DESKTOP_APP && (
        <>
          <div style={{ height: 20 }} />
          <GroupTitle>管理后台</GroupTitle>
          <Card>
            <Row
              title="完整管理后台"
              desc="用户管理、安全策略、日志等运维功能仍在管理后台。"
              last
            >
              <Button
                size="small"
                onClick={() => {
                  window.location.href = "/admin"
                }}
              >
                打开管理后台
              </Button>
            </Row>
          </Card>
        </>
      )}

      <style>{AI_SVC_EMBED_CSS}</style>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 语音助手（内嵌原管理后台的语音助手配置）                              */
/* ------------------------------------------------------------------ */

function VoicePanel({ registerDirty }: { registerDirty: (fn: () => boolean) => void }) {
  const dirtyRef = useRef(false)
  const handleDirty = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty
  }, [])
  useEffect(() => {
    registerDirty(() => dirtyRef.current)
  }, [registerDirty])
  return <LazyVoiceSettings variant="embedded" onDirtyChange={handleDirty} />
}

/* ------------------------------------------------------------------ */
/* 摄像头与设备（内嵌原管理后台的摄像头配置）                            */
/* ------------------------------------------------------------------ */

function DevicesPanel({ registerDirty }: { registerDirty: (fn: () => boolean) => void }) {
  const dirtyRef = useRef(false)
  const handleDirty = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty
  }, [])
  useEffect(() => {
    registerDirty(() => dirtyRef.current)
  }, [registerDirty])
  return <LazyCameraSettings variant="embedded" onDirtyChange={handleDirty} />
}

/* ------------------------------------------------------------------ */
/* 个人资料                                                            */
/* ------------------------------------------------------------------ */

/**
 * 个人资料保存成功后广播的事件名 —— 头像 / 用户名在顶栏、个人中心等处是各自拉取的，
 * 发个事件让关心它的组件自行刷新（与 `berry:devices-changed` 同一套习惯）。
 * 当前没有监听方时派发是空操作，不会报错。
 */
export const PROFILE_UPDATED_EVENT = "berry:profile-updated"

/** 旧配额视图（未开通积分制度时的展示） */
interface ProfileQuotaInfo {
  daily_limit: number
  daily_usage: number
  balance: number
}

/** 积分视图（token 计费 × 模型倍率 × 全局倍率） */
interface ProfileCreditInfo {
  membership?: string
  monthlyQuota: number
  monthlyUsed: number
  monthlyRemaining: number
  balance: number
  totalRemaining: number
  canUse: boolean
}

const AVATAR_MIME = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
const AVATAR_MAX_BYTES = 5 * 1024 * 1024

/**
 * 原 `/settings` 独立页面（头像 / 用户名 / 邮箱 / 账户详情 / AI 积分）2026-10-05 并入设置弹窗，
 * 独立页面已删除。
 *
 * 🚨 不是简单搬家，三处刻意不同：
 *   ① 版式换成设置弹窗的 GroupTitle + Card + Row 原子，亮/暗跟随设置令牌，
 *      不再自带页面外壳（导航条 / Hero / 入场动效）—— 进设置就该是设置的样子；
 *   ② 未保存的编辑会被弹窗的「有未保存的修改」关闭确认接住（registerDirty）；
 *   ③ 头像上传成功只改表单值，仍需点「保存更改」落库（与旧页面一致，避免误以为已生效）。
 */
function ProfilePanel({ registerDirty }: { registerDirty: (fn: () => boolean) => void }) {
  const { message } = useFeedback()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserPublic | null>(null)
  const [username, setUsername] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [quota, setQuota] = useState<ProfileQuotaInfo | null>(null)
  const [credit, setCredit] = useState<ProfileCreditInfo | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  /** registerDirty 只注册一次（闭包会过期），关闭确认 / 保存都必须读 ref 快照 */
  const formRef = useRef({ username: "", avatarUrl: "" })
  const dirtyRef = useRef(false)
  useEffect(() => {
    formRef.current = { username, avatarUrl }
  }, [username, avatarUrl])
  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])
  useEffect(() => {
    registerDirty(() => dirtyRef.current)
  }, [registerDirty])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/auth/me")
      const data = await res.json()
      const u: UserPublic | null = data?.authenticated ? data.user : null
      if (u) {
        setUser(u)
        setUsername(u.username ?? "")
        setAvatarUrl(u.avatar_url || "")
      }
      // 桌面端 BYOK：用户自带 API Key，没有积分 / 配额概念，跳过
      if (!IS_DESKTOP_APP) {
        const s = await fetch("/api/user/settings")
          .then((r) => r.json())
          .catch(() => null)
        if (s?.quota) setQuota(s.quota as ProfileQuotaInfo)
        if (s?.credit) setCredit(s.credit as ProfileCreditInfo)
      }
      setDirty(false)
    } catch {
      message.error("加载个人资料失败")
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => {
    void load()
  }, [load])

  const uploadAvatar = async (file: File) => {
    if (!AVATAR_MIME.includes(file.type)) {
      message.error("只支持 JPG、PNG、GIF 和 WebP 格式的图片")
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      message.error("图片大小不能超过 5MB")
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("avatar", file)
      const res = await fetch("/api/user/upload-avatar", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "上传失败")
      setAvatarUrl(data.avatar_url)
      setDirty(true)
      message.success("头像已上传，记得点「保存更改」")
    } catch (e) {
      message.error(e instanceof Error ? e.message : "上传失败")
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/user/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formRef.current.username.trim(),
          avatar_url: formRef.current.avatarUrl.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "保存失败")
      const u = data.user as UserPublic
      setUser(u)
      setUsername(u.username ?? "")
      setAvatarUrl(u.avatar_url || "")
      setDirty(false)
      message.success("个人资料已保存")
      window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT))
    } catch (e) {
      message.error(e instanceof Error ? e.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--set-text-secondary)", fontSize: 13 }}>加载中…</div>
  }
  if (!user) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--set-text-secondary)", fontSize: 13 }}>
        未登录或会话已过期，请重新登录后查看个人资料。
      </div>
    )
  }

  const initial = (username || user.email || "?").charAt(0).toUpperCase()
  /**
   * 🚨 `/api/auth/me` 的 created_at 是**字符串化的毫秒时间戳**（如 "1772874358746"），
   * 不是 ISO 串 —— 直接 `new Date(字符串)` 会得到 Invalid Date（旧 /settings 页面就是这么坏的）。
   * 这里先 Number() 再构造日期，取不到就显示「—」，绝不把 Invalid Date 摆到界面上。
   */
  const createdAt = (() => {
    const raw = (user as unknown as { created_at?: string | number }).created_at
    if (raw === undefined || raw === null || raw === "") return "—"
    const ms = typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : raw
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("zh-CN")
  })()
  const usedPct = credit && credit.monthlyQuota > 0 ? Math.min(100, (credit.monthlyUsed / credit.monthlyQuota) * 100) : 0
  const usedUp = !!credit && credit.monthlyQuota > 0 && credit.monthlyUsed >= credit.monthlyQuota

  return (
    <>
      <GroupTitle>头像</GroupTitle>
      <Card>
        <Row title="头像" desc="支持 JPG、PNG、GIF、WebP 格式，最大 5MB。" vertical last>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 72,
                height: 72,
                flexShrink: 0,
                borderRadius: "50%",
                overflow: "hidden",
                background: "var(--set-subcard-bg)",
                border: "1px solid var(--set-card-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- 头像可能是任意外链，next/image 需逐个配域名
                <img src={avatarUrl} alt="头像" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 22, color: "var(--set-text-secondary)" }}>{initial}</span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Button size="small" icon={<IconUpload />} loading={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? "上传中…" : "更换头像"}
              </Button>
              {avatarUrl && (
                <Button
                  size="small"
                  onClick={() => {
                    setAvatarUrl("")
                    setDirty(true)
                    if (fileRef.current) fileRef.current.value = ""
                  }}
                >
                  移除头像
                </Button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  // 清空 value：否则连选同一个文件不会再触发 change
                  e.target.value = ""
                  if (f) void uploadAvatar(f)
                }}
                style={{ display: "none" }}
              />
            </div>
          </div>
        </Row>
      </Card>

      <div style={{ height: 20 }} />
      <GroupTitle>基本信息</GroupTitle>
      <Card>
        <Row title="用户名" desc="显示在对话、评论与设备协作中的名称。">
          <Input
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              setDirty(true)
            }}
            style={{ width: 280 }}
            placeholder="请输入用户名"
          />
        </Row>
        <Row title="邮箱地址" desc="登录账号，注册后不可修改。">
          <Input value={user.email || ""} disabled style={{ width: 280 }} />
        </Row>
        <Row title="头像链接" desc="直接填图片地址；留空则使用上方上传的头像。" last>
          <Input
            value={avatarUrl}
            onChange={(e) => {
              setAvatarUrl(e.target.value)
              setDirty(true)
            }}
            style={{ width: 280 }}
            placeholder="https://…"
          />
        </Row>
      </Card>

      <div style={{ height: 20 }} />
      <GroupTitle>账户详情</GroupTitle>
      <Card>
        <Row title="用户 ID">
          <Text style={{ fontSize: 13, color: "var(--set-text-body)", fontFamily: "var(--ant-font-family-code)" }}>{user.id}</Text>
        </Row>
        <Row title="注册时间">
          <Text style={{ fontSize: 13, color: "var(--set-text-body)" }}>{createdAt}</Text>
        </Row>
        <Row title="角色权限" last>
          <Tag style={{ margin: 0, borderRadius: 999 }}>{user.role || "USER"}</Tag>
        </Row>
      </Card>

      {/* 桌面端 BYOK 无积分概念，整块不显示 */}
      {!IS_DESKTOP_APP && (credit || quota) && (
        <>
          <div style={{ height: 20 }} />
          <GroupTitle>AI 积分</GroupTitle>
          <Card>
            {credit ? (
              <>
                <Row title="会员等级">
                  <Tag style={{ margin: 0, borderRadius: 999 }}>{(credit.membership || "FREE").toUpperCase()}</Tag>
                </Row>
                <Row title="本月额度">
                  <Text style={{ fontSize: 13, color: "var(--set-text-body)" }}>
                    {credit.monthlyQuota > 0 ? `${credit.monthlyQuota.toFixed(0)} 积分` : "0 积分"}
                  </Text>
                </Row>
                <Row title="本月已用" desc={credit.monthlyQuota > 0 ? `共 ${credit.monthlyQuota.toFixed(0)} 积分` : undefined}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 120,
                        height: 6,
                        borderRadius: 999,
                        background: "var(--set-chip-bg)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${usedPct}%`,
                          background: usedUp ? "#DC2626" : "#12B76A",
                          transition: "width .2s ease",
                        }}
                      />
                    </div>
                    <Text style={{ fontSize: 13, color: "var(--set-text-body)" }}>{credit.monthlyUsed.toFixed(2)}</Text>
                  </div>
                </Row>
                <Row title="本月剩余">
                  <Text style={{ fontSize: 13, color: "#059669" }}>{credit.monthlyRemaining.toFixed(2)} 积分</Text>
                </Row>
                <Row title="充值积分余额" last>
                  <Text style={{ fontSize: 13, color: "var(--set-text-body)" }}>{credit.balance.toFixed(2)} 积分</Text>
                </Row>
              </>
            ) : quota ? (
              <>
                <Row title="会员等级">
                  <Tag style={{ margin: 0, borderRadius: 999 }}>{(user.membership || "FREE").toUpperCase()}</Tag>
                </Row>
                <Row title="每日限额">
                  <Text style={{ fontSize: 13, color: "var(--set-text-body)" }}>
                    {quota.daily_limit >= 999999 ? "无限" : `${quota.daily_limit} 次/天`}
                  </Text>
                </Row>
                <Row title="今日已用">
                  <Text style={{ fontSize: 13, color: "var(--set-text-body)" }}>
                    {quota.daily_usage}
                    {quota.daily_limit < 999999 && quota.daily_limit > 0 ? ` / ${quota.daily_limit}` : ""}
                  </Text>
                </Row>
                <Row title="额外余额" last>
                  <Text style={{ fontSize: 13, color: "var(--set-text-body)" }}>{quota.balance} 次</Text>
                </Row>
              </>
            ) : null}
          </Card>
          <div style={{ fontSize: 12, color: "var(--set-text-secondary)", lineHeight: "20px", marginTop: 10 }}>
            每次 AI 回复按 token 计费（输入 + 输出×权重 ÷ 每积分 token 数 × 模型倍率 × 全局倍率），
            回复完成后在消息气泡右下角显示本次消耗。
          </div>
        </>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, paddingTop: 18 }}>
        {dirty && (
          <Text style={{ fontSize: 12, color: "var(--set-text-secondary)" }}>有未保存的修改</Text>
        )}
        <Button size="small" type="primary" icon={<IconSave />} loading={saving} disabled={!dirty} onClick={save}>
          保存更改
        </Button>
      </div>
    </>
  )
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
  const { theme: globalTheme, setTheme, resolvedTheme } = useTheme()
  const theme = globalTheme ?? "system"

  /**
   * 沉浸光感 · 总开关 + 材质厚度（2026-09-26）：
   * · 总开关 = 「关闭沉浸光感」—— 关掉后全站不再做任何背景模糊，材质换纯色（见 material-css.ts 的 off 档）。
   * · 三档厚度 = 流畅 / 轻柔 / 精美，**即时生效**（saveUserLevel 立刻写 <html> 并广播，
   *   不用点保存、不用刷新）。没选过时显示自动探测出的档位。
   */
  const [matLevel, setMatLevel] = useState<MaterialLevel>("exquisite")
  /** 关掉之后再打开时回到哪一档 —— 不记住的话每次重开都要重选一遍，很烦 */
  const [lastOn, setLastOn] = useState<MaterialLevel>("exquisite")

  /**
   * 桌面透视（窗口不透明度，2026-10-23）
   *
   * 只有「窗口真的在透传桌面」时才有意义 —— 桌面端主进程把窗口做成 transparent，
   * 画布那层 rgba 的 alpha 就是这里的百分比（详见 lib/ui/glass-alpha.ts）。
   * 浏览器 / 未启用玻璃壳时画布本来就是实色，滑杆是个假控件，所以直接不渲染。
   */
  const [glassOn, setGlassOn] = useState(false)
  const [glassPct, setGlassPct] = useState(
    Math.round((resolvedTheme === "dark" ? GLASS_ALPHA_DEFAULT_DARK : GLASS_ALPHA_DEFAULT_LIGHT) * 100),
  )

  useEffect(() => {
    const on = glassShellActive()
    setGlassOn(on)
    if (!on) return
    const saved = readGlassAlpha()
    setGlassPct(
      Math.round(
        (saved ?? (resolvedTheme === "dark" ? GLASS_ALPHA_DEFAULT_DARK : GLASS_ALPHA_DEFAULT_LIGHT)) * 100,
      ),
    )
  }, [resolvedTheme])

  const applyGlass = (pct: number) => {
    setGlassPct(pct)
    applyGlassAlpha(pct / 100)
  }

  useEffect(() => {
    registerDirty(() => false)
    // 打开面板时对齐当前**实际生效**的档位（用户偏好 > html 上的真值 > 满配）
    const cur = readActiveLevel()
    setMatLevel(cur)
    if (cur !== "off") setLastOn(cur)
  }, [registerDirty])

  const applyTheme = (t: string) => {
    setTheme(t)
  }

  const applyMatLevel = (lv: MaterialLevel) => {
    setMatLevel(lv)
    if (lv !== "off") setLastOn(lv)
    saveUserLevel(lv)
  }

  const matOn = matLevel !== "off"

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

      <div style={{ height: 20 }} />
      <GroupTitle>沉浸光感</GroupTitle>
      <Card>
        <Row
          title="沉浸光感"
          desc="全站的毛玻璃材质与光感。关闭后表面回到纯色、不再做任何背景模糊 —— 观感最简洁，也是最省电的一档（backdrop-filter 是整站最贵的属性，每帧都要重采样背景）。"
        >
          <GreenSwitch checked={matOn} onChange={(v) => applyMatLevel(v ? lastOn : "off")} />
        </Row>
        <Row
          vertical
          title="材质厚度"
          desc="卡片、面板与控件那层毛玻璃的模糊强度。越厚越通透细腻，性能开销也越高；设备偏老或发热明显时选「流畅」。"
          last={!glassOn}
        >
          {/* 总开关关掉时，厚度这一排整体dim 掉并禁止点选 —— 选了也不会生效，
              与其让用户点了没反应，不如明说"现在不参与"。 */}
          <div
            aria-disabled={!matOn}
            style={{
              opacity: matOn ? 1 : 0.4,
              pointerEvents: matOn ? undefined : "none",
              transition: "opacity .18s ease",
            }}
          >
            <MaterialLevelPicker value={lastOn} onChange={applyMatLevel} />
          </div>
        </Row>

        {/* 桌面透视 —— 只有桌面端玻璃壳（窗口 transparent）才有意义，浏览器里不渲染。
            口径：百分比 = **画布那层的不透明度**，所以「越往左越透」。 */}
        {glassOn && (
          <Row
            vertical
            title="桌面透视"
            desc="窗口背后是系统给的一层磨砂（桌面被实时模糊后透上来），这一项决定这层磨砂被画布压掉多少：越往左越透（糊影更明显），越往右越实（字更清楚）。只影响桌面端窗口，拖完立即生效。"
            last
          >
            <div style={{ padding: "0 10px" }}>
              <Slider
                min={Math.round(GLASS_ALPHA_MIN * 100)}
                max={Math.round(GLASS_ALPHA_MAX * 100)}
                step={1}
                value={glassPct}
                onChange={applyGlass}
                tooltip={{ formatter: (v) => `${v}%` }}
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginTop: 2,
              }}
            >
              <span style={{ fontSize: 12, color: "var(--set-text-secondary)" }}>
                当前 {glassPct}%{glassPct >= 96 ? "（几乎不透）" : glassPct <= 40 ? "（很透）" : ""}
              </span>
              <Button
                type="text"
                size="small"
                onClick={() =>
                  applyGlass(
                    Math.round(
                      (resolvedTheme === "dark" ? GLASS_ALPHA_DEFAULT_DARK : GLASS_ALPHA_DEFAULT_LIGHT) * 100,
                    ),
                  )
                }
              >
                恢复默认
              </Button>
            </div>
          </Row>
        )}
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
  const { modal } = App.useApp()

  const { message } = useFeedback()
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
  const { modal } = App.useApp()

  const { message } = useFeedback()
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
/* 助理设置                                                            */
/* ------------------------------------------------------------------ */

function AssistantPanel({ registerDirty }: { registerDirty: (fn: () => boolean) => void }) {
  const { message } = useFeedback()
  const [voiceMode, setVoiceMode] = useState("manual")
  const [autoStart, setAutoStart] = useState(true)
  const [ports, setPorts] = useState<Record<string, number> | null>(null)

  /**
   * 🎛️ 上下文与压缩（2026-10-11 用户要求「用户可在设置里自定义上下文容量，
   * 以及到什么容量会自动压缩」）。
   *
   * 与上面 voiceMode / autoStart 走 localStorage 不同：这两项**服务端要读**
   * （/api/chat 决定预算与压缩时机），所以存到用户级 user_preferences，
   * 走 /api/user/context-prefs。改完立即生效于下一轮对话，无需保存按钮。
   */
  const [ctxWindow, setCtxWindow] = useState<string>("auto")
  const [ctxTrigger, setCtxTrigger] = useState<number>(DEFAULT_USER_CONTEXT_PREFS.compressionTriggerRatio)
  const [ctxSaving, setCtxSaving] = useState(false)

  /** 保存上下文偏好（增量 PATCH），成功后用服务端返回值回显 */
  const saveCtxPrefs = async (patch: { windowTokens?: number | null; compressionTriggerRatio?: number }) => {
    setCtxSaving(true)
    try {
      const res = await fetch("/api/user/context-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // 偏好读的是「当前值」，不能吃到任何缓存（否则保存后可能读到旧值）
        cache: "no-store",
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data?.prefs) {
        setCtxWindow(presetFromWindowTokens(data.prefs.windowTokens))
        setCtxTrigger(data.prefs.compressionTriggerRatio)
      }
    } catch {
      message.error("上下文设置保存失败，请重试")
    } finally {
      setCtxSaving(false)
    }
  }

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
    // 读取用户级上下文偏好（失败保持默认，不影响面板其他部分）
    fetch("/api/user/context-prefs", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.prefs) return
        setCtxWindow(presetFromWindowTokens(d.prefs.windowTokens))
        setCtxTrigger(d.prefs.compressionTriggerRatio)
      })
      .catch(() => {})
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
        <Row title="打开应用即进入助手" desc="启动后直接进入 AI 助手页面并自动开始新对话。">
          <GreenSwitch
            checked={autoStart}
            onChange={(v) => {
              setAutoStart(v)
              persist({ autoStart: v })
            }}
          />
        </Row>
      </Card>

      <div style={{ height: 20 }} />
      <GroupTitle>上下文与压缩</GroupTitle>
      <Card>
        <Row
          title="上下文容量"
          desc="单轮对话可用的上下文上限。设小会提前压缩、更省额度；不会超过所选模型自身的窗口。"
        >
          <Dropdown
            value={ctxWindow}
            disabled={ctxSaving}
            onChange={(v) => {
              // Dropdown 的 onChange 值类型是 unknown（ComponentProps<typeof Select>），
              // 这里显式收敛成字符串，避免 unknown 逃逸到下游客串 / 状态里。
              const val = String(v)
              // 先回显再落库：网络慢时不让选择器「弹回旧值」
              setCtxWindow(val)
              saveCtxPrefs({ windowTokens: windowTokensFromPreset(val) })
            }}
            options={CONTEXT_WINDOW_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
          />
        </Row>
        <Row
          title="自动压缩"
          desc="上下文用量达到输入预算的该比例时，较早的对话会被自动折叠为摘要；最近几轮始终原文保留。"
          last
        >
          <div style={{ width: 232, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Slider
                min={Math.round(MIN_TRIGGER_RATIO * 100)}
                max={Math.round(MAX_TRIGGER_RATIO * 100)}
                step={5}
                value={Math.round(ctxTrigger * 100)}
                disabled={ctxSaving}
                // 拖动过程只更新本地显示，松手才落库（避免高频 PATCH）
                onChange={(v) => setCtxTrigger((v as number) / 100)}
                onChangeComplete={(v) => saveCtxPrefs({ compressionTriggerRatio: (v as number) / 100 })}
                tooltip={{ formatter: (v) => `${v}%` }}
              />
            </div>
            <span
              style={{
                fontSize: 13,
                color: "var(--set-text-body)",
                fontVariantNumeric: "tabular-nums",
                width: 34,
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              {Math.round(ctxTrigger * 100)}%
            </span>
          </div>
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
                      style={{ margin: 0, borderRadius: 999, fontFamily: "var(--ant-font-family-code)", fontSize: 11.5 }}
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
          <Tag style={{ margin: 0, borderRadius: 6, fontFamily: "var(--ant-font-family-code)" }}>Ctrl / ⌘</Tag>
          <span style={{ margin: "0 4px", color: "var(--set-plus)" }}>+</span>
          <Tag style={{ margin: 0, borderRadius: 6, fontFamily: "var(--ant-font-family-code)" }}>K</Tag>
        </Row>
        <Row title="新建对话" desc="立即开始一轮新的对话。" last>
          <Tag style={{ margin: 0, borderRadius: 6, fontFamily: "var(--ant-font-family-code)" }}>Ctrl / ⌘</Tag>
          <span style={{ margin: "0 4px", color: "var(--set-plus)" }}>+</span>
          <Tag style={{ margin: 0, borderRadius: 6, fontFamily: "var(--ant-font-family-code)" }}>N</Tag>
        </Row>
      </Card>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 数据管理                                                            */
/* ------------------------------------------------------------------ */

function DataPanel() {
  const { message } = useFeedback()
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

function SecurityPanel({ onNavigate }: { onNavigate: (section: SettingsSection) => void }) {
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
          // 原按钮跳 /settings 页面改密码 —— 那个页面压根没有改密码功能（死链）。
          // 2026-10-05 个人资料并入设置后，这里直接站内跳到「个人资料」分区。
          <Row title="个人资料" desc="头像、用户名与账号信息都在「个人资料」里修改。" last>
            <Button size="small" onClick={() => onNavigate("profile")}>
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
  const { message } = useFeedback()
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
