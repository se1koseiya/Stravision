"use client"

import React, { useRef, useState, useMemo, useCallback, useEffect, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import { Sender, Suggestion, type SenderProps } from "@ant-design/x"
import type { GetProp } from "antd"
import { Button, Flex, Divider, Dropdown, Badge } from "antd"
import type { MenuProps } from "antd"
import type { GetProp } from "antd/es/config-provider/context"
import type { FlexProps } from "antd"
import type { ChatAttachment } from "@/app/ai-assistant/types"
import { formatIcon } from "@/app/ai-assistant/_components/format-icon"
import { IconApi, IconArrowRight, IconBookOpen, IconBookshelf, IconBrain, IconCertificate, IconChartLine, IconCheck, IconClose, IconDown, IconFileText, IconGlobe, IconGridFour, IconLightning, IconPaperclip, IconPlus, IconShield } from "@/components/icon";
import { VoiceInputButton } from "@/components/ai/voice-input-button";
import {
  getVoiceInputActive,
  subscribeVoiceInputActive,
} from "@/lib/voice/asr/voice-input-status"
import { SenderModeRow, type SenderModeItem } from "@/components/ai/sender-modes"

const Switch = Sender.Switch


/** 折叠/展开形态补间参数：与 CSS 的圆角 / 光环过渡严格同拍 */
const MORPH_MS = 420

/**
 * ── 工具栏「向上弹出面板」的公共定位器（2026-09-29）─────────────────────
 *
 * 病因（用户：「点那个 + UI 会被截断」）：面板原本是留在原地的 `position: absolute`，
 * 而它的祖先链上有两层 `overflow: hidden` ——
 *   ① 左簇 Flex（防 chip 溢出换行，见下面 Flex 的注释）
 *   ② **侧栏根节点**：`dc-mat dc-mat--ultra fixed ... overflow-hidden`
 * 更麻烦的是根节点带着沉浸材质（backdrop-filter）—— 它会让后代 `position: fixed`
 * 的包含块**变成它自己**，于是"改成 fixed 就逃出来了"这条捷径同样失效，还是被裁。
 * 唯一可靠解法：面板 portal 到 `document.body`，再按触发按钮的 rect 反推视口坐标。
 *
 * 面板宽度取**最宽的那一个**做 clamp，保证左右都不越出视口。
 */
function useSenderPopover() {
  const btnRef = useRef<HTMLButtonElement>(null)
  const cfgRef = useRef({ width: 260, offsetX: -4 })
  const [anchor, setAnchor] = useState<{ left: number; bottom: number } | null>(null)

  const sync = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const { width, offsetX } = cfgRef.current
    setAnchor({
      left: Math.max(8, Math.min(r.left + offsetX, window.innerWidth - width - 8)),
      /* bottom 是"距视口底边的距离"：面板底边贴按钮顶边再让 8px */
      bottom: Math.max(8, window.innerHeight - r.top + 8),
    })
  }, [])

  /** 打开：记下这次面板的宽度/横向偏移，再定位 */
  const open = useCallback((width: number, offsetX: number) => {
    cfgRef.current = { width, offsetX }
    sync()
  }, [sync])

  const close = useCallback(() => setAnchor(null), [])

  /* 视口变化时跟随（侧栏是 fixed，正常不会动；主要是 resize 场景） */
  useEffect(() => {
    if (!anchor) return
    window.addEventListener("resize", sync)
    return () => window.removeEventListener("resize", sync)
  }, [anchor, sync])

  return { btnRef, anchor, open, close }
}

/**
 * ── 待发送附件条（sender 里**唯一**一处附件预览）────────────────────────
 *
 * 🚨 2026-10-21 精简（用户：「这个 sender 附件设计过度了重复了」）：
 *    原来同一个附件被画了**三遍** ——
 *      ① 58×58 缩略图行（文档没有预览图，只剩一枚不知所云的回形针方块）
 *      ② 「附件 (N)」可折叠标题栏（还自带一个 × 关闭钮）
 *      ③ antd <Attachments> 文件卡 + 「点击或拖拽文件上传」加号占位框
 *    外加一处卡死：`attachmentOpen` 一旦置 true 就没人清，**永久**顶住「该收起」的判定
 *    —— 于是"发送后附件区本该消失，却留下一个空的上传占位框，整块收不回去"。
 *
 * 现在收敛成**一行紧凑 chip**（与对话流里 DocumentCard 同族：淡边 + 浅底 + 裸图标）：
 *      [缩略图/格式图标] 文件名 ···· ×
 *   · 没有标题栏、没有折叠态、没有添加占位框 —— 有附件才出现，发出去就消失；
 *   · 图片给 22px 缩略图，文档给 formatIcon() 的格式图标（与消息里的文档卡同一张表）；
 *   · 上传中/失败只做**状态着色**，不再另起一套 UI。
 *
 * 位置：挂在 Sender 的 `header`（文本输入区**上方**）。
 * ⚠️ 刻意**不**放进 footer —— `senderImmersiveStyle` 里那条
 *    `.ant-sender-footer button { height:auto; border-radius:999px } !important`
 *    会把这里的删除钮压成 14px 药丸（已验收的通配规则，不要去改它）。
 *
 * ⚠️ 删除钮**内联**在 chip 右端（不做绝对定位的右上角浮钮）：
 *    老实现那枚 `top:-5/right:-5` 浮钮踩过「overflow-x-auto 把另一个方向的
 *    visible 计算成 auto → 浮钮被裁掉一角、Playwright 点不到」的坑，
 *    内联在同一条 flex 里任何 overflow 容器都安全，也少一层堆叠。
 */
function AttachmentChips({
  items,
  onRemove,
  darkMode,
}: {
  items: Array<{
    index: number
    name: string
    /** 图片 = data URL；文档 = ""（走服务端 fileId） */
    dataUrl: string
    /** pdf / docx / xlsx / …（用于挑格式图标） */
    format: string
    status?: ChatAttachment["status"]
    error?: string
  }>
  onRemove: (index: number) => void
  darkMode: boolean
}) {
  if (items.length === 0) return null

  return (
    <div
      data-sender-attachment-strip
      className="flex items-center gap-2 overflow-x-auto"
      style={{ padding: "10px 12px 4px" }}
    >
      {items.map((it) => {
        const Icon = formatIcon(it.format)
        const isImage = it.dataUrl.startsWith("data:image/")
        const isError = it.status === "error"
        const isUploading = it.status === "uploading"
        const border = isError
          ? darkMode ? "rgba(248,113,113,0.45)" : "rgba(220,38,38,0.32)"
          : darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"
        const surface = isError
          ? darkMode ? "rgba(248,113,113,0.12)" : "rgba(254,242,242,0.92)"
          : darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.035)"

        return (
          <div
            key={`${it.index}-${it.name}`}
            data-sender-attachment-chip={isError ? "error" : isUploading ? "uploading" : "ready"}
            title={isError ? (it.error || "添加失败") : isUploading ? "正在上传…" : it.name}
            className="flex shrink-0 items-center"
            style={{
              height: 34,
              maxWidth: 240,
              padding: "0 4px 0 5px",
              gap: 7,
              borderRadius: 10,
              border: `1px solid ${border}`,
              background: surface,
              opacity: isUploading ? 0.65 : 1,
              transition: "opacity .2s, border-color .2s, background .2s",
            }}
          >
            {/* 前导：图片缩略图 / 文档格式图标（同一个尺寸，行内节奏才齐） */}
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                overflow: "hidden",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid ${darkMode ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)"}`,
                background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)",
                color: isError
                  ? darkMode ? "#f87171" : "#dc2626"
                  : darkMode ? "#a1a1aa" : "#71717A",
              }}
            >
              {isImage ? (
                /* 内联 data URL，不走 next/image（它要求远端 loader / 固定尺寸） */
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.dataUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <Icon size={13} strokeWidth={1.8} />
              )}
            </span>

            <span
              style={{
                fontSize: 12.5,
                fontWeight: 500,
                lineHeight: "18px",
                color: isError
                  ? darkMode ? "#fca5a5" : "#b91c1c"
                  : darkMode ? "#e4e4e7" : "#3f3f46",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 168,
              }}
            >
              {it.name}
            </span>

            {/* 移除：普通 button + aria-label，不用 disabled（禁用按钮收不到鼠标事件，
                连 title 提示都不会弹，见 `.ant-sender-footer` 那条同族坑） */}
            <button
              type="button"
              aria-label={`移除 ${it.name}`}
              title={`移除 ${it.name}`}
              onClick={() => onRemove(it.index)}
              className="flex items-center justify-center"
              style={{
                width: 18,
                height: 18,
                padding: 0,
                flexShrink: 0,
                borderRadius: 999,
                border: "none",
                background: "transparent",
                color: darkMode ? "#a1a1aa" : "#71717A",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.07)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
              }}
            >
              <IconClose size={11} strokeWidth={2.5} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

/**
 * ── 灵动岛同款的「阻尼弹簧」曲线 ─────────────────────────────────────
 *
 * 之前用的是 cubic-bezier(.22,1,.36,1)：那是一条**单调、缓出**的曲线——
 * 平滑但「没有弹性」，跟 iOS 灵动岛那种「吸一下、过冲、再回位」的手感完全不同。
 *
 * 现在换成解析式二阶阻尼振子（欠阻尼），一套参数同时喂给两条通道：
 *   · JS  → WAAPI 关键帧（负责 height，因为 height:auto 无法 CSS transition）
 *   · CSS → linear() 缓动（负责圆角 / 光环 / 宽度），不支持 linear() 的老浏览器
 *          会因为「重复声明」自动回落到下面那条 cubic-bezier，不炸样式。
 *
 * ζ(阻尼比) 决定手感：ζ=0.62 → 过冲约 8%，够弹但不至于晃像果冻。
 */
const SPRING_ZETA = 0.62
const SPRING_OMEGA = 20.5
const springAt = (t: number) => {
  const wd = SPRING_OMEGA * Math.sqrt(1 - SPRING_ZETA * SPRING_ZETA)
  return 1 - Math.exp(-SPRING_ZETA * SPRING_OMEGA * t) * (Math.cos(wd * t) + (SPRING_ZETA * SPRING_OMEGA / wd) * Math.sin(wd * t))
}
/** 0→1（含过冲）的归一化采样，最后一个采样点已基本收敛 */
const SPRING_SAMPLES: number[] = Array.from({ length: 33 }, (_, i) => springAt((i / 32) * (MORPH_MS / 1000)))
/** CSS linear() 缓动串：把同一条弹簧曲线交给原生 transition / animation */
const SPRING_LINEAR = `linear(${SPRING_SAMPLES.map(v => v.toFixed(4)).join(", ")})`
type SuggestionItems = Exclude<GetProp<typeof Suggestion, "items">, () => void>

// Agent 操作权限模式
export type ApprovalMode = "request" | "auto" | "full"

const APPROVAL_MODES: { key: ApprovalMode; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    key: "request",
    label: "请求批准",
    desc: "执行设备控制、文件编辑等操作前始终确认",
    icon: <IconShield size={14} />,
  },
  {
    key: "auto",
    label: "替我审批",
    desc: "仅对高风险操作（如删除文件、修改配置）请求确认",
    icon: <IconShield size={14} />,
  },
  {
    key: "full",
    label: "完全访问权限",
    desc: "莓小智可自主执行所有工具操作，无需逐一确认",
    icon: <IconShield size={14} />,
  },
]

const IconStyle = { fontSize: 16 }

/**
 * 「有附件、但一个字都没打」时喂给 Sender 的占位值 —— 唯一用途是**点亮发送键**。
 * 为什么必须这么做见下方 `<Sender value=...>` 的注释；用普通空格（而非零宽字符）
 * 是因为提交时 `text.trim()` 能把它清干净，零宽字符会被当成真内容发出去。
 */
const ATTACHMENT_VALUE_PLACEHOLDER = " "

export interface ChatSenderProps {
  input: string
  setInput: (value: string) => void
  onSend: (text: string) => void
  isLoading: boolean
  attachments: ChatAttachment[]
  onSelectFiles: React.ChangeEventHandler<HTMLInputElement>
  onRemoveAttachment: (index: number) => void
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void
  /**
   * 文件拖到 sender 上落点（可选）。
   *
   * 2026-10-21：拖拽落点原先是挂在 antd `<Attachments getDropContainer>` 上的，
   * 而那个组件住在「附件 (N)」折叠面板**里面** —— 面板没打开时它压根没挂载，
   * 拖拽等于没反应。附件面板精简掉之后，落点改挂到 sender 根节点上，
   * 不传此参则不做拖拽落点（移动端等只支持选图的调用方自然保持原样）。
   */
  onDropFiles?: (files: File[]) => void
  enableReasoning: boolean
  setEnableReasoning: (v: boolean) => void
  enablePlanning: boolean
  setEnablePlanning: (v: boolean) => void
  enableSearch: boolean
  setEnableSearch: (v: boolean) => void
  availableTools: Array<{ name: string; displayName?: string; description?: string; icon?: string; iconBg?: string }>
  onCancel?: () => void
  darkMode?: boolean
  approvalMode?: ApprovalMode
  setApprovalMode?: (mode: ApprovalMode) => void
  /** 输入框 footer 右侧插槽（发送按钮左侧）：动态模型选择器等（2026-09-19 工作台 Copilot 用） */
  modelSelector?: React.ReactNode
  /** 输入框 footer 右侧插槽（模型选择器左侧）：上下文容量指示器等 */
  contextMeter?: React.ReactNode
  /** 输入框 footer 左侧插槽末尾：语音入口等（2026-09-24 工作台 Copilot 通话入口用） */
  voiceSlot?: React.ReactNode
  /**
   * 输入框 footer 左簇「+」**之后**的插槽：截图入口等（2026-10-14 工作台 Copilot 截图用）。
   *
   * 为什么挨着「+」：两者语义同族 —— 「往这条消息里加东西」（+ 加已有文件，截图现取一张）。
   * 放在左簇末尾会让它被读成"又一个能力开关"，与「深度思考 / 研究」混为一谈。
   *
   * ⚠️ 调用方请复用 `.sender-chip.sender-chip--icon`（纯图标钮）以吃到统一 hover 材质，
   *    并**不要**在窄面板下给它加文字 —— 400px 侧栏的工具栏本来就没余量（见下方窄态压缩规则）。
   */
  screenshotSlot?: React.ReactNode
  /**
   * 是否显示「语音输入」麦克风（2026-10-24）。
   *
   * 说一句话 → 本地 sherpa-onnx 识别 → 文字追加进草稿。位置在**右簇、发送键左边**
   * （用户 2026-10-24 定：「＋」旁的语音识别挪到发送键左边，同时撤掉语音通话）：
   * 「说话」和「打字」是同一个动作的两个输入方式，手指不该横跨整条工具条。
   *
   * 🚨 默认 false：移动端、落地页等调用方不传就完全看不到这枚钮，零回归。
   */
  enableVoiceInput?: boolean
  /**
   * ── 工具栏精简（2026-10-14 工作台 Copilot：用户「sender 太乱太丑了」+ 参考稿）──
   *
   * true 时**隐藏「深度思考 / 研究」两枚能力开关**，工具栏收敛成
   * `+ ／ 截图 ／ 权限 ／ 语音 ／ 发送`（对齐参考稿：一排只有「加东西 + 语音 + 发送」）。
   *
   * 🚨 只摘 UI，**不动 state / handler**：
   *    · 深度思考恒为调用方给的默认值（Copilot 侧本就在 line「默认开启」）；
   *    · 联网检索仍有出口 —— 「+」面板里的「联网搜索」开关。
   *    · 主助手页不传此参 → 工具栏逐字保持原样（它有 modes 行，形态本来不同）。
   */
  hideAbilityToggles?: boolean
  /**
   * 语音插槽的落位（2026-10-14 参考稿：麦克风与发送键同组，落在输入框右端）。
   *
   * `"left"`（默认）= 左簇末尾，历史行为，主助手页 / 旧调用方逐字不变；
   * `"right"` = 右簇、**紧邻发送键**（上下文指示器 / 模型选择器之后）。
   */
  voicePlacement?: "left" | "right"
  /**
   * ── 能力 / 模式行（2026-10-01 用户：「把这些放到 sender」+「你看看人家的」）──
   *
   * 参考稿输入框的行为：
   *   · 未选择时 = 一排**扁平无边框**的图文按钮（快速回答 / AI 生图 / 写作 / 解题…）
   *   · 选中后   = 整排收起，只留那一枚「淡绿底 + 墨绿字 + ×」的小胶囊
   * 我们原样吸收：`modes` 传进来，`activeMode` 决定收不收。
   *
   * 数据由业务侧组装（见 `components/ai/farm-skills.tsx` 的 `farmSkillsToModes()`），
   * sender 本身不认识任何业务词。
   *
   * 不传 `modes` 时（Copilot 侧栏等旧调用方）保持旧行为：工具栏照旧只有
   * 深度思考 / 研究 / 权限 —— 零破坏。
   */
  modes?: SenderModeItem[]
  /** 当前选中的模式 key；null / undefined = 未进入任何模式 */
  activeMode?: string | null
  setActiveMode?: (key: string | null) => void
  /**
   * ── 卡片上方的浮层插槽（2026-10-16）────────────────────────────────
   *
   * 渲染在 `.sender-morph-host` **内部**、输入卡之上 ⇒ 自动继承与卡片完全相同的
   * 宽度约束（`maxWidth: 1120 + margin: 0 auto`），左右边缘与输入卡严格对齐。
   *
   * 唯一使用者 = AI 助手的「高风险工具执行前确认条」（`ToastConfirm`）。
   * 🚨 别再在调用方自己套一层宽度约束 —— 那会变成第四处 1120 字面量
   *    （见 MEMORY 铁律「对话区宽度三处同源 = 1120」）。
   */
  overlay?: React.ReactNode
  /**
   * ── 工具栏「业务化精简态」（2026-10-21 用户参考图 + 「按业务设计」）──────
   *
   * 参考图给的是**结构**（左侧业务动作、右侧生成设置），具体放什么必须按业务来：
   *
   *   左簇（往这条消息里投入什么）
   *     `＋`          —— 添加照片 / 文件（病虫害照片、报表文档；点即开文件选择器）
   *     `连接器 ⌄`   —— 业务能力总入口，一个面板三组：
   *                      · 技能：5 条种植场景（巡检 / 病虫害 / 环境 / 策略 / 研究）
   *                        + 已启用技能数与「技能商店」入口（技能由后端自动路由）
   *                      · 插件：已装 MCP 工具（天气 / 搜索 / 光谱…），点即指定给本条消息
   *                      · 内置：联网搜索 / 深度思考 / 计划模式 三个开关（平台自带能力）
   *     `🛡 名称 ⌄`    —— 操作权限三档（请求批准 / 替我审批 / 完全访问权限）
   *
   *   右簇（怎么生成这条回复）
   *     上下文容量 ｜ 模型选择器 ｜ 语音输入 ｜ 发送键
   *     （语音输入 = 说话转文字进草稿，2026-10-24 由「＋」旁挪到发送键左边）
   *
   * 未选中场景时工具条只有 `＋ 连接器 权限` 三枚（参考图那种干净感）；
   * 一旦进入某个种植场景，场景胶囊（绿色 × ）**留在工具条上**，随时看得见、退得掉。
   *
   * ⚠️ 只影响显式传 `"minimal"` 的调用方（AI 助手主页）；
   *    不传（默认 `"full"`）的调用方——Copilot 侧栏 / 移动端 / 落地页——
   *    工具条与「+」面板逐字保持原状，零回归。
   */
  toolbarMode?: "full" | "minimal"
  /** minimal 态：已启用的技能数（连接器面板里那行状态文案用；不传则不显示） */
  skillCount?: number
  /** minimal 态：连接器面板「技能 · 商店」入口（打开技能商店） */
  onManageSkills?: () => void
  /** minimal 态：连接器面板「插件 · 商店」入口（打开插件商店） */
  onManagePlugins?: () => void
}

export function ChatSenderInput({
  input,
  setInput,
  onSend,
  isLoading,
  attachments,
  onSelectFiles,
  onRemoveAttachment,
  onPaste,
  onDropFiles,
  enableReasoning,
  setEnableReasoning,
  enablePlanning,
  setEnablePlanning,
  enableSearch,
  setEnableSearch,
  availableTools,
  onCancel,
  darkMode = false,
  approvalMode = "request",
  setApprovalMode,
  modelSelector,
  contextMeter,
  voiceSlot,
  screenshotSlot,
  enableVoiceInput = false,
  modes,
  activeMode = null,
  setActiveMode,
  overlay,
  hideAbilityToggles = false,
  voicePlacement = "left",
  toolbarMode = "full",
  skillCount,
  onManageSkills,
  onManagePlugins,
}: ChatSenderProps) {
  const senderRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  /* 文件拖到 sender 上的悬停态：只驱动一条落点描边（见根节点 onDragOver） */
  const [dragOver, setDragOver] = useState(false)
  const [activeSkill, setActiveSkill] = useState<SenderProps['skill'] | null>(null)
  const [plusMenuOpen, setPlusMenuOpen] = useState(false)
  const [approvalPanelOpen, setApprovalPanelOpen] = useState(false)
  const [pluginSubOpen, setPluginSubOpen] = useState(false)
  /* 「连接器」面板（minimal 态）：技能 / 插件 / 内置能力三组 */
  const [connectorOpen, setConnectorOpen] = useState(false)

  /**
   * 业务化精简态（2026-10-21）——见 props 注释。
   * 派生量而不是两套渲染树：工具条节点都还在，只是按需显隐，
   * 「full 态逐字不变」是结构上保证的，不靠两边手工同步。
   */
  const minimalToolbar = toolbarMode === "minimal"

  /* 「向上弹出」的面板：定位交给 portal 版定位器（为什么必须 portal，见 useSenderPopover） */
  const plusPop = useSenderPopover()
  const approvalPop = useSenderPopover()
  const connectorPop = useSenderPopover()

  /**
   * ── 常开态（2026-10-22 用户：「ai 助手页面的 sender 就给我正常敞开，
   *     不要给我搞那个伸缩，那个伸缩是 copilot 专用的」）────────────────
   *
   * 主助手的输入框**恒为展开**：多行输入 + 整条业务工具条，没有胶囊折叠态、
   * 没有高度补间、没有「点外面就收起」。那条伸缩动画（WAAPI 弹簧 + 终点漂移矫正）
   * 整套搬去了 Copilot 侧栏自己的 sender（components/ai/copilot/copilot-sender.tsx）——
   * 两个业务各养一份，改这里不会碰坏 Copilot，反之亦然。
   */

  /* ── 能力 / 模式行（2026-10-01）──────────────────────────────────────────
     参考稿的行为：未选中 = 一排扁平胶囊；选中 = 整排收起，只留一枚绿色 × 胶囊。
     状态由调用方持有（受控），sender 只负责「怎么进、怎么退」这两条动作。

     为什么自己不做 state：`activeMode` 要能被页面在发送/换会话时重置，
     也要能和 `enableSearch` 这类工具开关保持一致 —— 状态放在两边一定会漂移。 */
  const modeList = modes ?? []
  const activeModeItem = activeMode ? modeList.find((m) => m.key === activeMode) ?? null : null
  const hasModeRow = modeList.length > 0

  /* 进入模式：换 placeholder → 顺带开工具 → （可选）灌起始文案 → 聚焦 */
  const enterMode = (m: SenderModeItem) => {
    setActiveMode?.(m.key)
    if (m.search) setEnableSearch(true)
    if (m.seed) setInput(m.seed)
    // 依赖图片的模式（如病虫害识别）：进入的同一拍唤起文件选择器，
    // 把「选能力」和「给图」连成一个动作。
    // 放在 rAF 里发起 —— setInput 触发的重渲染会打断同步 click() 的用户手势上下文。
    if (m.pickImage) {
      requestAnimationFrame(() => fileInputRef.current?.click())
    }
    requestAnimationFrame(() => {
      const ta = document.querySelector<HTMLTextAreaElement>(".ant-sender textarea")
      if (!ta) return
      ta.focus()
      const len = ta.value.length
      try { ta.setSelectionRange(len, len) } catch {}
    })
  }
  /* 退出模式：把「进模式时顺带打开的工具」关掉，别留下看不见的副作用 */
  const exitMode = () => {
    if (activeModeItem?.search) setEnableSearch(false)
    setActiveMode?.(null)
    requestAnimationFrame(() => {
      document.querySelector<HTMLTextAreaElement>(".ant-sender textarea")?.focus()
    })
  }


  // 知识库集合（个人 + 市场）— 用于 / 命令补全
  const [kbCollections, setKbCollections] = useState<Array<{ id: number; name: string; source: "personal" | "market"; official?: number }>>([])

  // 拉取个人 KB 集合 + AI 可访问的市场 KB 集合
  useEffect(() => {
    let aborted = false
    ;(async () => {
      try {
        const [personalRes, aiRes] = await Promise.all([
          fetch("/api/knowledge/collections?includeArchived=0").then(r => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
          fetch("/api/knowledge/market/ai-collections?limit=200").then(r => r.ok ? r.json() : { list: [] }).catch(() => ({ list: [] }))
        ])
        if (aborted) return
        const personal: Array<{ id: number; name: string; source: "personal" | "market"; official?: number }> = (personalRes?.items || [])
          .filter((c: any) => c && c.name)
          .map((c: any) => ({ id: c.id, name: c.name, source: "personal" as const }))
        const market: Array<{ id: number; name: string; source: "personal" | "market"; official?: number }> = (aiRes?.list || [])
          .filter((c: any) => c && c.name)
          .map((c: any) => ({ id: c.id, name: c.name, source: "market" as const, official: c.official }))
        setKbCollections([...personal, ...market])
      } catch {
        // 静默失败，slash 菜单只显示 4 个默认指令
      }
    })()
    return () => { aborted = true }
  }, [])

  /* 待发送附件条的数据。
     「是不是图片」用 dataUrl 前缀判而不是 `type` 字段 —— 粘贴进来的文件 type
     可能为空，但 data URL 的 `data:image/` 一定是真的；文档的 dataUrl 是空串。 */
  const attachmentChipItems = useMemo(
    () =>
      attachments.map((att, i) => {
        const raw = (att as { name?: string; format?: string }).format
          || (att.name || "").split(".").pop()
          || ""
        return {
          index: i,
          name: att.name || `附件 ${i + 1}`,
          dataUrl: att.dataUrl || "",
          format: raw.toLowerCase(),
          status: att.status,
          error: att.error,
        }
      }),
    [attachments],
  )

  /* header 槽 = 输入区上方那一行附件 chip（没有附件就整块不渲染，不占高度）。
     🚨 刻意**不再**有「附件 (N)」折叠标题栏与 antd <Attachments> 上传占位框 ——
        见 AttachmentChips 顶部注释：那是同一份附件的第三、第四次重复，
        且折叠状态会永久卡住「该收起」的判定，发送后收不回去。 */
  const senderHeader = useMemo(
    () => (
      <AttachmentChips items={attachmentChipItems} onRemove={onRemoveAttachment} darkMode={darkMode} />
    ),
    [attachmentChipItems, onRemoveAttachment, darkMode],
  )

  // MCP tool dropdown
  const toolMenuItems: MenuProps["items"] = useMemo(
    () =>
      availableTools.map((t) => ({
        key: t.name,
        icon: <IconLightning size={14} />,
        label: t.displayName || t.name,
      })),
    [availableTools],
  )

  const handleToolSelect: MenuProps["onClick"] = useCallback(
    (info: any) => {
      const tool = availableTools.find((t) => t.name === info.key)
      const toolName = tool?.displayName || tool?.name || String(info.key || "")
      insertToolTag(toolName, tool?.name || info.key)
    },
    [availableTools],
  )

  // 将工具作为 skill tag 插入输入框
  const insertToolTag = useCallback((displayName: string, name: string) => {
    const skillData: SenderProps['skill'] = {
      value: name,
      title: displayName,
      closable: true,
    }
    setActiveSkill(skillData)
    // 聚焦输入框让用户继续输入
    senderRef.current?.focus?.()
  }, [])

  // 监听探索页面的"在对话中试用"事件，自动插入工具 tag
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.toolName) {
        // 从 availableTools 中查找匹配项
        const tool = availableTools.find(
          t => (t.displayName || t.name) === detail.toolName || t.name === detail.toolName
        )
        const name = tool?.name || detail.toolName.toLowerCase().replace(/\s+/g, '_')
        insertToolTag(detail.toolName, name)
      }
    }
    window.addEventListener('berry:mention-tool', handler)
    return () => window.removeEventListener('berry:mention-tool', handler)
  }, [availableTools, insertToolTag])

  const slashItems: SuggestionItems = useMemo(() => {
    const base: SuggestionItems = [
      { label: "生成报告", value: "/report", icon: <IconFileText size={14} className="text-[#059669]" /> },
      { label: "环境诊断", value: "/diagnose", icon: <IconChartLine size={14} className="text-[#059669]" /> },
      { label: "深度推理", value: "/reason", icon: <IconBrain size={14} className="text-[#059669]" /> },
      { label: "全网检索", value: "/search", icon: <IconGlobe size={14} className="text-[#059669]" /> },
    ]
    if (kbCollections.length === 0) return base
    const kbItems: SuggestionItems = kbCollections.slice(0, 20).map(c => {
      const tag = c.source === "personal" ? "个人"
        : c.official === 1 ? "官方"
        : "市场"
      return {
        label: `[${tag}] ${c.name}`,
        value: `/${c.name}`,
        icon: c.source === "personal"
          ? <IconBookOpen size={14} className="text-emerald-600" />
          : c.official === 1
            ? <IconShield size={14} className="text-[#059669]" />
            : <IconBookshelf size={14} className="text-[#059669]" />
      }
    })
    return [...base, ...kbItems]
  }, [kbCollections])

  // + 菜单向上弹出动画
  const plusPanelStyle = (
    <style>{`
      @keyframes plus-panel-up {
        from { opacity: 0; transform: translateY(6px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
    `}</style>
  )

  /**
   * ── 沉浸光感输入框（sender-immersive） ─────────────────────────────
   *
   * 用户要求「给输入框组件用上沉浸光感的效果」（参考图 = 华为 AI 助手胶囊输入框）。
   * 参考稿实测（原图 1:1）：输入框 720×80、圆角 = 高/2（全胶囊）、白玻璃底、
   * 外圈一圈浅蓝灰柔光。
   *
   * ⚠️ 演进记录：第一版照参考稿做了「白玻璃底 + 渐变描边 + 聚焦流光环」，
   *    但在**纯白侧栏**上玻璃底毫无意义（白叠白），只剩描边与光环 → 变成一圈矩形。
   *    见下方 2026-09-25 修订说明。
   *
   * 🚨 实现约束：**只加视觉层，不动任何功能节点**。
   *    做法 = 给 <Sender> 挂一个 class + 一层 scoped CSS，不改动
   *    附件头 / + 菜单 / 计划模式 / 思考 / 联网 / 权限模式 / 语音插槽 /
   *    模型选择器 / 发送按钮 的任何一个 props 或 handler。
   *
   * 🚨 2026-09-25 二次修订（用户反馈「sender 去掉背景啊，sender 后面有个矩形」）：
   *    经 CDP 逐层 dump + 截图逐像素扫描定位，那个「矩形」来自本段 CSS 自己画的
   *    三处**硬边**：
   *      ① background 的 border-box 渐变描边 —— 1px 实描边，就是一圈方框
   *      ② box-shadow 的 `0 0 0 3px` spread 环 —— 外扩一圈硬边浅蓝光环
   *      ③ ::after 的 conic-gradient 流光环 —— 聚焦/生成时常亮，3px 硬边彩色环，
   *         最像「sender 后面有个矩形」（输入时必然可见）
   *    实测证据（截图 rgb 游程，白底侧栏）：输入框左右各有一圈
   *      rgb(228,238,251) / rgb(224,240,253) 的 3~6px 蓝色硬边带。
   *
   *    现在 ①②③ 全部移除，只保留「纯模糊、无 spread、低透明度」的柔光：
   *      - 没有填充色 → 真·「去掉背景」，不再有任何矩形底色
   *      - 没有描边 / spread 环 / 伪元素环 → 物理上无法再形成硬边矩形
   *      - backdrop-filter 保留 → 有彩色底时仍是磨砂沉浸感（白底上零副作用）
   *      - 生成中改用柔光呼吸（纯 box-shadow 动画）继续提示「正在跑」
   *
   * 🚨 2026-09-25 四次修订（用户反馈「伸缩 sender 动画生硬难看」）：
   *    外壳尺寸（40px 单行 ↔ ~125px 多行+工具栏）是**瞬间跳变**的，CSS 无法对
   *    height:auto 做 transition；只有圆角 / 光环在慢慢补间 → 「慢慢变形的框 +
   *    瞬间跳出来的工具栏」两层节奏打架，就是用户看到的生硬。
   *    修法 = **JS 高度补间**（见 useIsoLayoutEffect 处的注释）：翻转折叠态时用
   *    Web Animations API 把 height 从旧值补到新值，420ms + 同一条缓动曲线，
   *    与圆角/光环严格同拍；补间期间 overflow:hidden，工具栏像被揭开而不是跳出来。
   *    打字时的 autoSize 撑高**不参与补间**（否则每行抖动），只有折叠态翻转才补。
   */
  /* 语音正在持续转写 → 输入卡外圈点亮一圈主题色光环。
     状态由 VoiceInputButton 广播（它才是最懂"麦克风开没开、有没有句子在识别"的人），
     这里只负责画。SSR 阶段恒 false，不会闪。 */
  const voiceActive = useSyncExternalStore(
    subscribeVoiceInputActive,
    getVoiceInputActive,
    () => false,
  )
  /* 光环的配色（2026-10-24 二改：用户说原先太深，要 WorkBuddy 那种「通透、干净」）。
     🚨 关键认知：**通透感来自白芯高光，不是来自饱和的彩色**。
        之前用 rgba(5,150,105,.95) 一整条深绿弧 → 像拿记号笔描的边，又重又脏。
        现在峰值是白色高光，两侧只垫极淡的薄荷绿：
        亮色下淡绿细线负责可见度（白在浅底上看不出），暗色下白高光负责通透。
     外发光也压薄：-10px 的扩散 + 低 alpha，只留一层"雾"，不糊成光团。 */
  const voiceGlowCore = darkMode ? "rgba(255,255,255,0.94)" : "rgba(255,255,255,0.88)"
  const voiceGlowEdge = darkMode ? "rgba(110,231,183,0.58)" : "rgba(52,211,153,0.46)"
  const voiceGlowRing = darkMode ? "rgba(110,231,183,0.12)" : "rgba(16,185,129,0.09)"
  const voiceGlowHalo = darkMode ? "rgba(52,211,153,0.26)" : "rgba(16,185,129,0.18)"

  const senderImmersiveStyle = (
    <style>{`
      /* 生成中：极轻的呼吸（只动中性阴影，⛔ 不许再用蓝色外环） */
      @keyframes sender-soft-breathe {
        0%, 100% { box-shadow: 0 1px 2px rgba(24,24,27,0.04), 0 10px 26px -20px rgba(24,24,27,0.18); }
        50%      { box-shadow: 0 1px 3px rgba(24,24,27,0.07), 0 16px 36px -20px rgba(24,24,27,0.30); }
      }

      /* ── 工具栏按钮错峰上浮（展开时依次落位，而非「啪」地一起出现） ── */
      @keyframes sender-chip-in {
        from { opacity: 0; transform: translateY(5px) scale(0.94); }
        to   { opacity: 1; transform: translateY(0)   scale(1); }
      }
      /* ── 整条 footer 浮出水面（挂载时一次，不是形态补间）── */
      @keyframes sender-footer-in {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      /* 🚨 2026-10-22：原来这里还有「宽度弹簧补间」（.sender-morph-host 的
         max-width 过渡 + 补间期间摘毛玻璃 + 关掉 textarea 自带高度过渡）——
         主助手改为常开态后宽度恒定 1120，这三块全部失去作用，已删除。
         补间相关逻辑整套在 components/ai/copilot/copilot-sender.tsx 里继续生效。
         容器上的 sender-morph-host 类名保留：它只是个稳定锚点（且 page.tsx 的
         注释按这个名字引用 1120 宽度约束）。 */

      /* ══ 本体：透明核 + 1px 极淡描边 ═══════════════════════════════════
       *  🚨 2026-09-25 三次修订（用户：「跟他一模一样，你没发现 sender 没有背景吗」）：
       *     sender **不要任何实心底** —— 芯子完全透明，面板自己的氛围渐变直接透上来。
       *     为了不让文字糊在氛围光上，补一层 backdrop-filter 做「无底色玻璃」：
       *     它不改变亮度/色相（渐变是平滑的，模糊前后几乎一致），只压掉高频噪点。
       *
       *  🚨 2026-10-22 常开态：主助手不再有「单行胶囊」那一态，圆角写死 16px。
       *
       *  🚨 2026-10-22 极简（用户：「外面一圈不要有蓝色的，参考这样极简」）：
       *     原来那圈 0 0 0 4px rgba(74,130,232,.40) 的**蓝色 spread 环**整圈删掉，
       *     换成「1px 极淡灰边 + 一层几乎不带色的轻阴影」——
       *     边界靠**极细的线**立住，而不是靠一圈彩环。同理：
       *       · 挂载时的 sender-ring-in（蓝环从 0 扩散到 7px 再回落）整条删除；
       *       · 生成中的呼吸改成中性灰阴影（见上面 sender-soft-breathe）。
       *     ⛔ 别再把任何 0 0 0 Npx 的彩色环加回来 —— 用户要的就是没有那圈。
       *     元素上仍保留 data-collapsed="false"：它只是下面几十条规则的选择器
       *     锚点，删属性等于改特异性与层叠顺序，不值当。 */
      .sender-immersive.ant-sender {
        position: relative;
        overflow: visible;
        border-radius: 16px !important;
        /* 极细描边（参考稿：1px、近乎看不见的灰，落在氛围底上 ≈ rgb(230,231,234)） */
        border: 1px solid rgba(24,24,27,0.09) !important;
        /* ★ 没有背景：内芯全透明，只有这圈 1px 线 */
        background: transparent !important;
        -webkit-backdrop-filter: blur(calc(14px * var(--dc-mat-scale, 1))) saturate(1.06);
        backdrop-filter: blur(calc(14px * var(--dc-mat-scale, 1))) saturate(1.06);
        /* 极轻阴影：贴地一档 + 远处一层，都不带色相，只为把卡片从底面上「托起来」 */
        box-shadow:
          0 1px 2px rgba(24,24,27,0.04),
          0 12px 28px -20px rgba(24,24,27,0.18) !important;
        transition: background .3s ease, box-shadow .3s ease, border-color .3s ease;
      }


      /* ═══ 语音持续转写：输入框外圈的主题色光环（2026-10-24）═══════════════
         用户原话：「在识别的过程中发送框周围要有一圈光晕在绕着这个输入框，
                   代表着正在转写的状态。颜色就用平台的主题色」。
         两层叠出来的效果：
           · 底光 —— 整圈 1.5px 主题色淡光，慢呼吸（说明"在听"）
           · 扫光 —— 一道更亮的弧沿边框绕圈跑（说明"在转写"）
         🚨 只有 [data-voice-active="true"] 时才存在；其余时刻这层压根不渲染。
         ⛔ 不是静态彩色 ring —— 2026-09 被否掉的是「外面一圈蓝色」那种；
            这里的彩色只在"语音正在工作"的几秒里出现，是状态指示，不是装饰。 */
      @property --voice-sweep {
        syntax: "<angle>";
        inherits: false;
        initial-value: 0deg;
      }
      @keyframes voice-glow-sweep {
        to { --voice-sweep: 360deg; }
      }
      @keyframes voice-glow-breathe {
        0%, 100% { opacity: .62; }
        50%      { opacity: 1; }
      }

      [data-voice-active="true"] .sender-immersive.ant-sender::after {
        content: "";
        position: absolute;
        /* 压住那 1px 描边，光环才有"贴着卡片"的感觉 */
        inset: -1px;
        border-radius: inherit;
        /* 只留 1.2px 的一圈：靠 padding + content-box 遮罩挖空内部 */
        padding: 1.2px;
        pointer-events: none;
        z-index: 2;
        background:
          conic-gradient(
            from var(--voice-sweep),
            transparent 0deg,
            ${voiceGlowEdge} 24deg,
            ${voiceGlowCore} 46deg,
            ${voiceGlowEdge} 68deg,
            transparent 98deg,
            transparent 360deg
          ),
          linear-gradient(${voiceGlowRing}, ${voiceGlowRing});
        -webkit-mask:
          linear-gradient(#000 0 0) content-box,
          linear-gradient(#000 0 0);
        -webkit-mask-composite: xor;
        mask:
          linear-gradient(#000 0 0) content-box,
          linear-gradient(#000 0 0);
        mask-composite: exclude;
        animation:
          voice-glow-sweep 2.6s linear infinite,
          voice-glow-breathe 3.2s ease-in-out infinite;
      }
      /* 外圈再撒一点同名色的柔光，让"发光"有厚度（不是画上去的线）。
         扩散半径压到 -10px：宁可薄薄一层雾，也不要糊成光团。 */
      [data-voice-active="true"] .sender-immersive.ant-sender {
        box-shadow:
          0 1px 2px rgba(24,24,27,0.04),
          0 12px 28px -20px rgba(24,24,27,0.18),
          0 0 26px -10px ${voiceGlowHalo} !important;
      }


      /* ── 输入区：无内底色（白核已由本体提供）+ 参考稿占位符配色 ── */
      .sender-immersive.ant-sender textarea,
      .sender-immersive.ant-sender .ant-sender-input {
        background: transparent !important;
      }
      .sender-immersive.ant-sender textarea::placeholder {
        color: #A1A3A4 !important;   /* 参考稿实测 (161,163,164) */
        font-size: 15px;
      }

      /* footer 内部无硬线（参考稿输入框里没有分割线） */
      .sender-immersive.ant-sender .ant-sender-footer {
        border-top-color: transparent !important;
      }

      /* ── 🚨 展开态 footer 内距（2026-09-27 用户实锤「sender ui 都被挤出去了」）──────
       * 病因（CDP 实测，Copilot 400px 侧栏 / 胶囊内宽 330px）：
       *   左侧控件簇「+ 28 + 深度思考 89.4 + 研究 65 + 权限 51.5 + 通话 63」= 298.9px，
       *   右侧发送键 31px → 合计 329.9px / 可用 330px = **0 余量**。
       *   一旦字体渲染或图标稍有偏差就必然溢出，而且控件紧贴胶囊内壁 ——
       *   4px 蓝色光环（box-shadow spread）本来就画在外壳边界内侧，
       *   控件零内距时就被光环「切穿」，观感就是「UI 被挤出去/压在框线上」。
       * 处方：给展开态 footer 左右各留 10px 内距（折叠态另有 absolute 定位，不受影响），
       *   并把控件簇的整体间隙交给 flex gap 统一控制，不再靠每个 chip 自己 marginLeft 凑。
       *   ⚠️ 只加内距、不缩控件：内距 10+10=20px 由下方 chip 的 padding 微调补偿
       *      （11px → 9px，横向每颗省 4px，四颗共省 16px），净增 4px，仍有余量。 */
      .sender-immersive.ant-sender[data-collapsed="false"] .ant-sender-footer {
        /* 🚨 2026-10-22 极简微调（用户实锤截图「内部元素都压到容器边缘了」）：
           原来这里写的是 padding: 0 12px —— 上下内距被一并清零，
           量出来**发送键底边距卡片底边只剩 1px**（那 1px 还是卡片自己的 border），
           右下角看起来就是按钮「贴死在边框上」。
           现在左右 14 / 下 12 / 上 4：按钮到右边 15、到底边 13（含 1px 边框），
           四个角的呼吸感一致，也不会把卡片撑高太多。 */
        padding: 4px 14px 12px !important;
      }
      /* 展开态 chip 横向内距微收：为上面的 footer 内距腾出空间，视觉几乎无差
         🚨 2026-09-29：「+」现在也挂 .sender-chip（为了拿统一 hover 材质），
         必须排除纯图标钮 —— 否则左右各吃 9px，28px 圆里只剩 10px 内容宽，
         16px 的加号被压成 10×16 的畸变图标（探针实测）。 */
      .sender-immersive.ant-sender[data-collapsed="false"] .ant-sender-footer .sender-chip:not(.sender-chip--icon) {
        padding-left: 9px !important;
        padding-right: 9px !important;
      }
      /* ── 工具栏「控件语汇」统一（2026-09-29 用户反馈：「工具栏还是太乱了」）────
       * 病因（对照截图逐控件量测）：同一行里同时存在三套形态 ——
       *   ① 「+」是 6px 圆角方钮，跟旁边 999 胶囊不是一个物种（hover 时才看得出来）；
       *   ② 「深度思考 / 研究 / 权限」是 999 胶囊，但高度靠 padding(5px) 撑，
       *      三者实测 27 / 27 / 26px 参差；
       *   ③ 「通话」是**常驻实底绿胶囊**，视觉权重压过真正高频的「深度思考」，
       *      而且和「研究」开启态的绿底撞色，语义没法区分。
       * 三者叠加 → 圆角语言不一 + 高度不齐 + 同屏「蓝实底 … 绿实底」两块强调色夹着
       * 三个无底控件，「实-虚-虚-虚-实」把一行切成很碎的节奏。
       * 处方：把「高 28 / 圆角 999 / 默认无底 / hover 同一套材质膜」定为工具栏**唯一语汇**，
       *   所有控件（含插槽塞进来的通话）一律套用；强调色只留给「已开启的开关」。
       * 🚨 纯外观层：不动任何 props / handler / 功能节点。图标尺寸刻意不在此写死
       *    （「+」要保留 16px，由 .sender-chip--icon 在别处排除压缩规则）。 */
      .sender-immersive.ant-sender[data-collapsed="false"] .ant-sender-footer .sender-chip {
        height: 28px !important;
        min-height: 28px !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 999px !important;
        border: none !important;
        flex-shrink: 0;
      }
      /* 纯图标钮（+）：内距归零 + 正方形收口，把 28px 全部留给那枚 16px 图标
         （上面几条 .sender-chip 内距规则都已被 :not(.sender-chip--icon) 排除，
          这里再兜一道底线，防止将来新增规则又把它挤变形）。 */
      .sender-immersive.ant-sender[data-collapsed="false"] .ant-sender-footer .sender-chip--icon {
        padding: 0 !important;
        width: 28px !important;
        height: 28px !important;
        min-width: 28px !important;
      }
      /* ── 展开态 footer 深度兜底（2026-09-27）───────────────────────────────
       * 上面那套「内距 10 + chip 收 2px」在 400px 侧栏下已把余量从 0 拉到约 20px。
       * 但侧栏还能被拖到更窄（normal 400 → 视口压缩时 maxWidth: calc(100vw - 24px)），
       * 所以再补一条兜底：文字 chip 可收缩、文本按需省略，
       * 而不是把右簇顶出外壳（横向溢出被裁 = 用户看到的「UI 被挤出去」）。
       * 🚨 不要给 footer 行盒加 flex-wrap！实测（见下方注释）会把发送键折到第二行，
       *    胶囊高度从 125 涨到 144，工具栏「掉一行」——那是比溢出更糟的观感。
       *    正确做法是让内容**收缩**（min-width:0 + ellipsis），行数恒定。 */
      .sender-immersive.ant-sender[data-collapsed="false"] .ant-sender-footer .sender-chip:not(.sender-chip--icon) {
        min-width: 0 !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }

      /* 展开时整条 footer 延后 60ms 浮出：等盒子先把高度长出来再露面，
         避免「工具栏先出现、外壳后到位」的错位（配合上面的 JS 高度补间） */
      .sender-immersive.ant-sender[data-collapsed="false"] .ant-sender-footer {
        animation: sender-footer-in .40s cubic-bezier(.22,1,.36,1) .06s both;
        animation-timing-function: ${SPRING_LINEAR};
      }
      /* ── 工具栏 chip（深度思考 / 研究 / 权限 / 通话 / 模型）：参考稿全胶囊形态 ──
       *   注意：发送键在 .ant-sender-actions-list-presets 里，由下面**更靠后 + 更高特异性**
       *   的规则单独接管 31px 圆，这里不能写死宽高（否则会把 chip 压成圆、裁掉文字）。 */
      .sender-immersive.ant-sender .ant-sender-footer button {
        height: auto !important;
        border-radius: 999px !important;
        border: none !important;
        transition: background .22s ease, color .22s ease,
                    transform .26s cubic-bezier(.22,1,.36,1) !important;
      }
      /* 展开态：chip 逐个错峰上浮（优雅地「落位」，不是一起弹出） */
      .sender-immersive.ant-sender[data-collapsed="false"] .ant-sender-footer button {
        animation: sender-chip-in .40s cubic-bezier(.22,1,.36,1) both;
        animation-timing-function: ${SPRING_LINEAR};
      }
      .sender-immersive.ant-sender[data-collapsed="false"] .ant-sender-footer > *:nth-child(1) button,
      .sender-immersive.ant-sender[data-collapsed="false"] .ant-sender-footer > *:nth-child(2) button { animation-delay: .02s; }
      .sender-immersive.ant-sender[data-collapsed="false"] .ant-sender-footer > *:nth-child(3) button { animation-delay: .07s; }
      .sender-immersive.ant-sender[data-collapsed="false"] .ant-sender-footer > *:nth-child(4) button { animation-delay: .12s; }
      .sender-immersive.ant-sender[data-collapsed="false"] .ant-sender-footer > *:nth-child(5) button { animation-delay: .17s; }

      /* ── 模式胶囊（能力行）2026-10-01 ──────────────────────────────────────
       * 上面那条通配规则（button 的 height:auto + border-radius:999px，双 !important）
       * 是给「沉浸光感的圆胶囊 chip」写的（靠 padding 撑高、全胶囊）。模式胶囊是有**固定
       * 30px 高 + 8px 圆角**的扁平按钮，被那条一压就变成 14px 高的药丸 ——
       * 实测：图标 14px 顶到上下边、文字被夹扁，整排看着像一排小药片。
       *
       * 🚨 不去改上面那条通配规则：它的特异性已经被 Copilot 侧栏的版式验收过
       *    （MEMORY「复用控件类」血案），动它要连带复验 400px 窄面板。
       *    这里用**更高特异性**（多一个类 + 元素选择器 = (0,4,1) > (0,3,1)）顶回来。
       *    两个 appearance 各自取值：沉浸光感沿用它的 999 语汇（不覆盖 radius），
       *    白卡在 senderCardStyle 里覆盖成 8px（对齐参考稿那排扁平胶囊）。
       *    ⚠️ 本注释块在 JS 模板串里，**一个反引号都不能出现**（写了会直接把模板串截断）。 */
      .sender-immersive.ant-sender .ant-sender-footer button.sender-mode-chip {
        height: 30px !important;
      }
      /* pill 里那枚 16px 圆形 ×：同样被通配规则压成 14px，补回正方形命中区 */
      .sender-immersive.ant-sender .ant-sender-footer button.sender-mode-pill__x {
        height: 16px !important;
      }

      /* ── chip 的沉浸光感（2026-09-26）──
       *   参考稿的 chip 静止态是**无底**的，所以静止态一律不动（不偏离已验收的版式）；
       *   材质只出现在两个「该有反馈」的时刻：hover 与启用态。
       *   原来这两处是 JS 写死的实色（#f4f4f5 / 淡蓝），观感是「贴了一块灰」；
       *   现在换成 半透底 + 背景模糊 + 上缘受光（HDS 材质四件套的控件版），
       *   同一块 chip 会跟着背后的内容一起呼吸 —— 这就是「光感穿越层级」。
       *   ⚠️ 因此必须把 JSX 里那两处 inline background 删掉：inline 优先级高于本表，
       *      留一个 transparent 就会把 hover 背景整条压掉（改了等于没改）。 */
      .sender-immersive.ant-sender .ant-sender-footer button.sender-chip {
        background: transparent;
      }
      .sender-immersive.ant-sender .ant-sender-footer button.sender-chip:hover {
        /* ⚠️ 浅色态**不能叠白**（2026-09-26 复核修正）：
           胶囊本体 background 是 transparent，背后就是 #f7f7f9 / 白画布 ——
           叠一层白膜 = 与底同色，hover 等于没反应（同 .dc-mat--neutral 那条教训）。
           改走「极淡中性灰膜」保证比底深一档，玻璃感仍由 blur + 上缘受光承担。
           深色态不受影响，照旧叠白。 */
        background: ${darkMode ? "rgba(255,255,255,0.10)" : "rgba(120,120,128,0.12)"} !important;
        -webkit-backdrop-filter: blur(calc(12px * var(--dc-mat-scale, 1))) saturate(1.9);
        backdrop-filter: blur(calc(12px * var(--dc-mat-scale, 1))) saturate(1.9);
        box-shadow: inset 0 1px 0 ${darkMode ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.72)"},
                    0 4px 14px -10px rgba(0,0,0,0.16) !important;
      }
      /* 启用态两种色：blue = 深度思考（参考稿亮蓝）、brand = 研究（品牌宝石绿）。
         两色都必须保留「上缘受光 + 外投影」这两笔光 —— 否则又是"贴了块色"，
         而不是一块被光照着的介质。 */
      .sender-immersive.ant-sender .ant-sender-footer button.sender-chip[data-on="blue"] {
        background: ${darkMode ? "rgba(74,130,232,0.24)" : "rgba(74,130,232,0.12)"} !important;
        -webkit-backdrop-filter: blur(calc(14px * var(--dc-mat-scale, 1))) saturate(2.2);
        backdrop-filter: blur(calc(14px * var(--dc-mat-scale, 1))) saturate(2.2);
        box-shadow: inset 0 1px 0 ${darkMode ? "rgba(138,180,255,0.30)" : "rgba(39,88,238,0.20)"},
                    0 4px 16px -10px ${darkMode ? "rgba(74,130,232,0.45)" : "rgba(39,88,238,0.30)"} !important;
      }
      .sender-immersive.ant-sender .ant-sender-footer button.sender-chip[data-on="brand"] {
        background: ${darkMode ? "rgba(0,148,86,0.26)" : "rgba(0,148,86,0.10)"} !important;
        -webkit-backdrop-filter: blur(calc(14px * var(--dc-mat-scale, 1))) saturate(2.2);
        backdrop-filter: blur(calc(14px * var(--dc-mat-scale, 1))) saturate(2.2);
        box-shadow: inset 0 1px 0 ${darkMode ? "rgba(52,211,153,0.30)" : "rgba(0,148,86,0.20)"},
                    0 4px 16px -10px ${darkMode ? "rgba(0,148,86,0.50)" : "rgba(0,148,86,0.28)"} !important;
      }

      /* ── 发送键：三态，不再「一刀切灰」 ────────────────────────────────
       * 🚨 2026-10-22 修正（用户指截图：「一些细节问题给我把控好，你看这里，设计问题」）：
       *    原规则把**所有**发送键都写死成 #EFF1F5 底 + #BEC0C3 箭头（照抄参考稿的**空态**），
       *    结果打了字之后按钮**还是灰的** —— 视觉上永远「不可点」，这是真 bug 不是配色偏好。
       * 现在按可用性分三态：
       *   · 待命（disabled，没内容）：极淡中性底 + 中灰箭头 —— 看得出是个按钮，但明显待命；
       *   · 可发送（有文字 / 有附件）：近黑实心 + 白箭头（参考稿那颗黑圆）；
       *   · 生成中（loading）：由 antd 换成停止键，同样走「可发送」的黑实心，语义一致。
       * ⛔ 别再退回「一个颜色管三态」。 */
      .sender-immersive.ant-sender .ant-sender-actions-list-presets button,
      .sender-immersive.ant-sender .ant-sender-actions-btn {
        width: 31px !important;
        height: 31px !important;
        min-width: 31px !important;
        flex: 0 0 31px !important;
        border-radius: 999px !important;
        border: none !important;
        box-shadow: none !important;
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        transition: background .22s ease, color .22s ease,
                    transform .28s cubic-bezier(.22,1,.36,1) !important;
      }
      /* 待命态：没有可发的东西（底色比纯白略深一档，箭头 38% 保证还认得出是箭头） */
      .sender-immersive.ant-sender .ant-sender-actions-list-presets button:disabled,
      .sender-immersive.ant-sender .ant-sender-actions-btn:disabled {
        background: rgba(24,24,27,0.06) !important;
        color: rgba(24,24,27,0.38) !important;
      }
      /* 可发送 / 生成中：黑圆 + 白箭头 */
      .sender-immersive.ant-sender .ant-sender-actions-list-presets button:not(:disabled),
      .sender-immersive.ant-sender .ant-sender-actions-btn:not(:disabled) {
        background: #18181B !important;
        color: #FFFFFF !important;
      }
      .sender-immersive.ant-sender .ant-sender-actions-list-presets button:not(:disabled):hover,
      .sender-immersive.ant-sender .ant-sender-actions-btn:not(:disabled):hover {
        background: #303036 !important;
        transform: scale(1.06);
      }
      .sender-immersive.ant-sender .ant-sender-actions-list-presets button:active,
      .sender-immersive.ant-sender .ant-sender-actions-btn:active {
        transform: scale(0.93);
      }

      /* ── 生成中的转圈：必须和黑圆同心、且不许探出圆外 ────────────────────
       * 🚨 2026-10-22（用户实锤截图：黑圆 + 一圈灰环错位、环从右下角探出来被卡片圆角切掉）：
       *    antd X 的 loading 图标写死了 width/height = token.controlHeight（=32px），
       *    且 vertical-align: top，而我们的键是 31px —— 图标比容器大 1px、还被顶偏 3px，
       *    于是那圈"转圈"整个歪到黑圆外面去了。
       * 处方：比按钮小一圈（27px）并强制居中 ⇒ 转圈完整落在黑圆内部，同心且不会被裁。 */
      .sender-immersive.ant-sender .ant-sender-actions-btn-loading-icon {
        width: 27px !important;
        height: 27px !important;
        display: block !important;
        vertical-align: middle !important;
      }
      .sender-immersive.ant-sender .ant-sender-actions-btn-loading-button {
        padding: 0 !important;
        border: 0 !important;
      }
      /* 转圈取 currentColor：亮色主题=黑键白环、暗色主题=浅键深环，跟着按钮前景色自动翻。
         轨道压到 28% —— 否则实心赛道和旋转弧同色，看起来就只是"一圈灰"，读不出在转。 */
      .sender-immersive.ant-sender .ant-sender-actions-btn-loading-icon circle {
        stroke: currentColor !important;
      }
      .sender-immersive.ant-sender .ant-sender-actions-btn-loading-icon circle:first-of-type {
        opacity: .28;
      }

      /* ── 模型选择器触发器：沿用工具条的 999 胶囊语汇 ────────────────────
       * antd 默认给 10px 圆角，平时无底看不出来，一 hover 就露出"圆角矩形"，
       * 与旁边一圈 999 胶囊不是同一个物种。 */
      .sender-immersive.ant-sender .ant-sender-footer .ant-btn:not(.ant-btn-circle) {
        border-radius: 999px !important;
      }

      /* 生成中（loading）：环呼吸，提示「正在跑」 */
      .sender-immersive.ant-sender[data-streaming="true"] {
        animation: sender-soft-breathe 2.4s ease-in-out infinite;
      }

      /* ── 暗色版：同样**没有背景 + 没有彩环**，只有 1px 淡边与中性阴影 ── */
      .sender-immersive-dark.ant-sender {
        background: transparent !important;
        border-color: rgba(255,255,255,0.11) !important;
        box-shadow:
          0 1px 2px rgba(0,0,0,0.35),
          0 16px 36px -22px rgba(0,0,0,0.75) !important;
      }
      .sender-immersive-dark.ant-sender textarea::placeholder {
        color: #7b7b85 !important;
      }
      /* 暗色下的发送键同样三态：待命淡、可发送亮（暗底上用浅实心才够对比） */
      .sender-immersive-dark.ant-sender .ant-sender-actions-list-presets button:disabled,
      .sender-immersive-dark.ant-sender .ant-sender-actions-btn:disabled {
        background: rgba(255,255,255,0.08) !important;
        color: rgba(255,255,255,0.34) !important;
      }
      .sender-immersive-dark.ant-sender .ant-sender-actions-list-presets button:not(:disabled),
      .sender-immersive-dark.ant-sender .ant-sender-actions-btn:not(:disabled) {
        background: #F4F4F5 !important;
        color: #18181B !important;
      }
      .sender-immersive-dark.ant-sender .ant-sender-actions-list-presets button:not(:disabled):hover,
      .sender-immersive-dark.ant-sender .ant-sender-actions-btn:not(:disabled):hover {
        background: #FFFFFF !important;
        color: #18181B !important;
      }

      /* 尊重系统「减弱动态效果」偏好：关掉一切过渡与脉冲 */
      @media (prefers-reduced-motion: reduce) {
        .sender-immersive.ant-sender,
        .sender-immersive.ant-sender[data-collapsed="false"],
        .sender-immersive.ant-sender[data-streaming="true"],
        .sender-immersive.ant-sender[data-collapsed="false"] .ant-sender-footer button {
          animation: none !important;
          transition: none !important;
        }
      }
    `}</style>
  )

  return (
    <div
      data-sender-root=""
      /* 语音持续转写中 → 点亮输入卡外圈的主题色光环（见上面那条 CSS） */
      data-voice-active={voiceActive ? "true" : undefined}
      /* 左右/上下留白走 CSS 变量：主页沿用 16px，Copilot 侧栏按参考稿收紧到 22/14px
         （参考稿实测：胶囊核 360 CSS px，面板内两侧各留 22px）。 */
      style={{
        width: "100%",
        padding: "var(--sender-inset-y, 16px) var(--sender-inset, 16px)",
        /* 拖文件悬停时的落点描边：内联在这层，不去和 .ant-sender 的
           `box-shadow !important`（圆角/光环那套）抢优先级 */
        borderRadius: 20,
        boxShadow: dragOver ? "0 0 0 3px rgba(5,150,105,0.30)" : undefined,
        transition: "box-shadow .18s ease",
      }}
      /* ── 文件拖放落点（2026-10-21）─────────────────────────────────────
         老落点挂在 antd <Attachments getDropContainer> 上，而那个组件住在
         「附件 (N)」折叠面板里 —— 面板没打开时它压根没挂载，拖拽等于没反应。
         现在落点是 sender 整块（含附件 chip 行），拖到哪都能放手。 */
      onDragOver={(e) => {
        if (!onDropFiles) return
        if (!Array.from(e.dataTransfer?.types || []).includes("Files")) return
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={(e) => {
        // 在子元素之间移动也会触发 dragleave —— 只有真的离开 root 才撤描边
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
        setDragOver(false)
      }}
      onDrop={(e) => {
        if (!onDropFiles) return
        const files = Array.from(e.dataTransfer?.files || [])
        setDragOver(false)
        if (!files.length) return
        e.preventDefault()
        onDropFiles(files)
      }}
    >
      <style>{`
        .no-focus-ring .ant-sender textarea:focus,
        .no-focus-ring .ant-sender textarea:focus-visible,
        .no-focus-ring .ant-sender .ant-input:focus,
        .no-focus-ring .ant-sender .ant-input-outlined:focus,
        .no-focus-ring .ant-sender .ant-input-outlined:focus-within,
        .no-focus-ring .ant-sender textarea.ant-input {
          box-shadow: none !important;
          outline: none !important;
          border-color: transparent !important;
        }
      `}</style>
      {plusPanelStyle}
      {senderImmersiveStyle}
      <div
        /* 常开态：宽度恒 1120，与对话消息区（chat-bubble-list 的 1120）严格对齐。
           主助手没有折叠胶囊态，所以这里不存在 560 那个收窄值。 */
        style={{ maxWidth: 1120, margin: "0 auto" }}
        className="no-focus-ring sender-morph-host"
      >
        {/* 卡片上方的浮层插槽（确认条等）—— 见 props 注释：放这一层才对得齐卡片 */}
        {overlay}
        <Suggestion items={slashItems} onSelect={(val) => setInput(`${val} `)}>
          {({ onTrigger, onKeyDown: onSlashKeyDown }) => (
            <Sender
              ref={senderRef}
              /**
               * 🚨 附件也计入「有内容」（2026-10-14）：antd X 的发送键可用性**只看输入框文本**
               *    （Sender.js → `onSendDisabled: !innerValue`），它压根不认识我们外挂的附件。
               *    后果：用户截了图 / 贴了图但没打字时，发送键是灰的、点不动也回车不了 ——
               *    发送逻辑明明允许（onSubmit 的守卫是「无文字 **且** 无附件」才拦），
               *    卡在按钮这一层，用户只会以为"图发不出去"。
               *    这里在附件非空时塞一个空格占位点亮按钮；用户一开始打字，它就被真实输入替换。
               *    空格（而非零宽字符）是有意的：提交时 `text.trim()` 能把它清干净。
               */
              value={input || (attachments.length > 0 ? ATTACHMENT_VALUE_PLACEHOLDER : "")}
              skill={activeSkill || undefined}
              onRemoveSkill={() => setActiveSkill(null)}
              onChange={(nextVal) => {
                /* 剥掉上面的占位空格 —— 它只存在于「用户一个字都还没打」的时候 */
                const next =
                  !input && nextVal.startsWith(ATTACHMENT_VALUE_PLACEHOLDER)
                    ? nextVal.slice(ATTACHMENT_VALUE_PLACEHOLDER.length)
                    : nextVal
                if (next.endsWith("/") && (next.length === 1 || /\s\/$/.test(next)))
                  onTrigger()
                else if (!next.startsWith("/")) onTrigger(false)
                setInput(next)
              }}
              onSubmit={(text) => {
                if (!text.trim() && attachments.length === 0) return
                // 将 skill 信息附加到发送内容，供消息气泡渲染标签
                const skillInfo = activeSkill ? ` [tool:${activeSkill.value}]` : ""
                onSend(text + skillInfo)
                // 延迟清除 skill 标签，避免同步 setState 触发无限重渲染
                requestAnimationFrame(() => setActiveSkill(null))
              }}
              onCancel={onCancel}
              loading={isLoading}
              header={senderHeader}
              /* 占位文案（2026-10-22 对齐新参考图）：
                 「今天帮你做些什么？」+ 两个真能用得上的动作 ——
                 `＋` 是加照片/文件（工具栏第一枚），`/` 唤起斜杠技能与指令。
                 模式优先：进了「病虫害识别」就换成该场景的引导语。 */
              placeholder={
                activeModeItem?.placeholder
                  ? activeModeItem.placeholder
                  : "今天帮你做些什么？＋ 添加照片或文件，/ 调用技能与指令"
              }
              suffix={false}
              /* 常开态：恒 2 行起手（不再有折叠胶囊的单行形态） */
              autoSize={{ minRows: 2, maxRows: 6 }}
              onPaste={onPaste as any}
              onKeyDown={(e: React.KeyboardEvent) => onSlashKeyDown(e)}
              /**
               * 沉浸光感外观（senderImmersiveStyle）——恒为展开态。
               * 主助手没有折叠/伸缩（那是 Copilot 自己的事），这里只吃展开态的样式。
               */
              className={`sender-immersive${darkMode ? " sender-immersive-dark" : ""}`}
              data-collapsed="false"
              data-streaming={isLoading ? "true" : undefined}
              /* 当前模式 key —— 纯验收锚点（参考稿里整卡的描边是不变的，模式只体现在
                 那一枚绿色胶囊上，所以这里刻意**不给它写任何样式规则**）。 */
              data-mode={activeModeItem ? activeModeItem.key : undefined}
              classNames={{ input: "!shadow-none !outline-none" }}
              footer={(actionNode) => (
                <Flex justify="space-between" align="center" style={{ position: "relative", flexWrap: "nowrap" }}>
                  {/* 左侧：+ 菜单 + 思考 + 研究 + 权限模式
                      2026-09-27：间距统一由这里的 flex gap 控制（原为各 chip 自写 marginLeft 凑，
                      Copilot 400px 侧栏下总宽 329.9px / 可用 330px = 0 余量 → 必然拥挤溢出）。
                      2026-10-22 极简：定成**唯一一档 6px**，并删掉各段自带的 marginLeft ——
                      原来「组内 gap 2 + 组间 6」两档叠出来实测是 6/8/6 参差，
                      一行里出现三种节奏正是「看着乱」的来源。间距只由一个数字说了算。
                      flexWrap:nowrap + 左簇 overflow:hidden → 真窄到极限时宁可省略文字，
                      也绝不换行（换行会让胶囊高度跳一档，比溢出更难看 —— 实测过）。 */}
                  <Flex gap={6} align="center" style={{ minWidth: 0, flexWrap: "nowrap", overflow: "hidden" }}>
                    {/* ＋：minimal 态 = **只加素材**（照片 / 文件），点一下直开文件选择器。
                        为什么不再是菜单：业务上「往里加东西」和「挂能力」是两件事 ——
                        文件/照片走这里，插件与技能走右边的「连接器」，各管一摊。
                        full 态保持历史行为（展开「+」面板：附件 / 计划 / 联网 / 插件）。 */}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <button
                        ref={plusPop.btnRef}
                        onClick={() => {
                          if (minimalToolbar) {
                            fileInputRef.current?.click()
                            return
                          }
                          if (plusMenuOpen) {
                            setPlusMenuOpen(false)
                            setPluginSubOpen(false)
                            plusPop.close()
                            return
                          }
                          plusPop.open(260, -4)
                          setPlusMenuOpen(true)
                        }}
                        onBlur={() => {
                          if (minimalToolbar) return
                          setTimeout(() => {
                            setPlusMenuOpen(false)
                            setPluginSubOpen(false)
                            plusPop.close()
                          }, 200)
                        }}
                        title="添加照片或文件"
                        /* 2026-09-29 工具栏整理：方角图标钮 → 与其他控件同一套「圆胶囊语汇」。
                           sender-chip 拿到统一的 hover 材质膜；sender-chip--icon 只是
                           声明「我是纯图标钮」，用来把 copilot 窄面板的 13px 图标压缩规则排除掉
                           （+ 没有文字，图标独自承担视觉，压到 13px 会在 28px 圆里发虚）。 */
                        className="sender-chip sender-chip--icon"
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: 28, height: 28, borderRadius: 999,
                          border: "none", background: "transparent",
                          cursor: "pointer", flexShrink: 0,
                          color: darkMode ? "#a1a1aa" : "#71717A",
                        }}
                      >
                        <IconPlus size={16} />
                      </button>

                      {/* + 展开面板 —— 🚨 必须 portal 到 body：
                          它的祖先链上有两层 overflow:hidden（左簇 Flex + 侧栏根节点），
                          而侧栏根节点带沉浸材质（backdrop-filter 会另建包含块），
                          连 position:fixed 都逃不掉 → 就地渲染必被裁（用户实测「点 + 就被截断」）。 */}
                      {plusMenuOpen && plusPop.anchor && createPortal(
                        <div
                          data-sender-popover="plus"
                          onMouseDown={(e) => e.preventDefault()}
                          style={{
                            position: "fixed",
                            left: plusPop.anchor.left,
                            bottom: plusPop.anchor.bottom,
                            zIndex: 3000,
                            width: 260,
                            borderRadius: 16,
                            padding: "10px 10px 6px",
                            background: darkMode ? "#27272a" : "#fff",
                            border: darkMode ? "1px solid #3f3f46" : "1px solid #e4e4e7",
                            boxShadow: darkMode
                              ? "0 20px 50px rgba(0,0,0,0.5)"
                              : "0 10px 40px rgba(0,0,0,0.15)",
                            transformOrigin: "bottom left",
                            animation: "plus-panel-up 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
                          }}
                        >
                          {/* 添加照片和文件 */}
                          <button
                            onClick={() => {
                              fileInputRef.current?.click()
                              setPlusMenuOpen(false)
                            }}
                            style={{
                              display: "flex", alignItems: "center", gap: 9,
                              width: "100%", padding: "8px 12px", borderRadius: 10,
                              border: "none", background: "transparent", cursor: "pointer",
                              color: darkMode ? "#d4d4d8" : "#3F3F46",
                              fontSize: 13.5, fontWeight: 500,
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = darkMode ? "#3f3f46" : "#f4f4f5"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                          >
                            <IconPaperclip style={{ fontSize: 16 }} />
                            添加照片和文件
                          </button>

                          {/* 计划模式（任务规划） */}
                          <div style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "8px 12px", marginTop: 2,
                          }}>
                            <span style={{ fontSize: 13.5, fontWeight: 500, color: darkMode ? "#d4d4d8" : "#3F3F46" }}>
                              计划模式
                            </span>
                            <button
                              onClick={() => setEnablePlanning(!enablePlanning)}
                              style={{
                                width: 34, height: 20, borderRadius: 999,
                                border: "none", cursor: "pointer",
                                background: enablePlanning ? (darkMode ? "rgba(0,148,86,0.20)" : "rgba(0,148,86,0.18)") : (darkMode ? "#3f3f46" : "#d4d4d8"),
                                position: "relative", transition: "background 0.2s",
                                flexShrink: 0,
                              }}
                            >
                              <span style={{
                                position: "absolute", top: 2,
                                left: enablePlanning ? 16 : 2,
                                width: 16, height: 16, borderRadius: "50%",
                                background: "#fff",
                                transition: "left 0.2s ease",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                              }} />
                            </button>
                          </div>

                          {/* 联网搜索（原「追求目标」——2026-10-14 工具栏精简后，
                              这是「研究 / 联网检索」唯一的开关入口，文案改成用户认得的词） */}
                          <div style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "8px 12px", marginTop: 2,
                          }}>
                            <span style={{ fontSize: 13.5, fontWeight: 500, color: darkMode ? "#d4d4d8" : "#3F3F46" }}>
                              联网搜索
                            </span>
                            <button
                              onClick={() => {
                                // 内置 web_search / deep_research 工具由服务端无条件注入，无需安装任何 MCP
                                setEnableSearch(!enableSearch)
                              }}
                              style={{
                                width: 34, height: 20, borderRadius: 999,
                                border: "none", cursor: "pointer",
                                background: enableSearch ? (darkMode ? "rgba(0,148,86,0.20)" : "rgba(0,148,86,0.18)") : (darkMode ? "#3f3f46" : "#d4d4d8"),
                                position: "relative", transition: "background 0.2s",
                                flexShrink: 0,
                              }}
                            >
                              <span style={{
                                position: "absolute", top: 2,
                                left: enableSearch ? 16 : 2,
                                width: 16, height: 16, borderRadius: "50%",
                                background: "#fff",
                                transition: "left 0.2s ease",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                              }} />
                            </button>
                          </div>

                          {/* 插件（MCP 工具子菜单） */}
                          {availableTools.length > 0 && (
                            <div style={{ position: "relative" }}>
                              <button
                                onClick={() => setPluginSubOpen(!pluginSubOpen)}
                                style={{
                                  display: "flex", alignItems: "center", justifyContent: "space-between",
                                  width: "100%", padding: "8px 12px", marginTop: 2, marginBottom: 2,
                                  borderRadius: 10, border: "none", background:
                                    pluginSubOpen ? (darkMode ? "#3f3f46" : "#f4f4f5") : "transparent",
                                  cursor: "pointer",
                                  color: darkMode ? "#d4d4d8" : "#3F3F46",
                                  fontSize: 13.5, fontWeight: 500,
                                  transition: "background 0.15s",
                                }}
                                onMouseEnter={(e) => !pluginSubOpen && (e.currentTarget.style.background = darkMode ? "#3f3f46" : "#f4f4f5")}
                                onMouseLeave={(e) => !pluginSubOpen && (e.currentTarget.style.background = "transparent")}
                              >
                                <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                  <IconGridFour size={16} />
                                  插件
                                </span>
                                <IconDown size={13} style={{ opacity: 0.45, transition: "transform 0.2s", transform: pluginSubOpen ? "rotate(180deg)" : "none" }} />
                              </button>

                              {/* 插件子列表 — 向上弹出 */}
                              {pluginSubOpen && (
                                <div
                                  onMouseDown={(e) => e.preventDefault()}
                                  style={{
                                    position: "absolute",
                                    bottom: "calc(100% + 8px)",
                                    left: -4,
                                    zIndex: 1100,
                                    width: 260,
                                    maxHeight: 320,
                                    overflowY: "auto",
                                    borderRadius: 16,
                                    padding: "10px 8px 12px",
                                    background: darkMode ? "#27272a" : "#fff",
                                    border: darkMode ? "1px solid #3f3f46" : "1px solid #e4e4e7",
                                    boxShadow: darkMode
                                      ? "0 20px 50px rgba(0,0,0,0.5)"
                                      : "0 12px 40px rgba(0,0,0,0.15)",
                                    transformOrigin: "bottom left",
                                    animation: "plus-panel-up 0.18s cubic-bezier(0.16, 1, 0.3, 1) both",
                                  }}
                                >
                                  {/* 子列表标题 */}
                                  <Flex align="center" justify="space-between" style={{ padding: "0 10px 6px" }}>
                                    <span style={{ fontSize: 11.5, fontWeight: 600, color: darkMode ? "#a1a1aa" : "#A1A1AA" }}>
                                      {availableTools.length} 个已安装插件
                                    </span>
                                  </Flex>

                                  {/* MCP 服务列表 */}
                                  {availableTools.map((tool) => (
                                    <button
                                      key={tool.name}
                                      onClick={() => {
                                        handleToolSelect({ key: tool.name })
                                        setPluginSubOpen(false)
                                        setPlusMenuOpen(false)
                                      }}
                                      style={{
                                        display: "flex", alignItems: "center", gap: 10,
                                        width: "100%", padding: "7px 10px", marginTop: 1,
                                        borderRadius: 8, border: "none", cursor: "pointer",
                                        background: "transparent",
                                        color: darkMode ? "#d4d4d8" : "#3F3F46",
                                        textAlign: "left", transition: "background 0.15s",
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.background = darkMode ? "#3f3f46" : "#f4f4f5"}
                                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                    >
                                      {/* 真实图标 */}
                                      {tool.icon ? (
                                        <img
                                          src={tool.icon}
                                          alt={tool.displayName || tool.name}
                                          style={{
                                            width: 28, height: 28, borderRadius: 8,
                                            objectFit: "cover",
                                            flexShrink: 0,
                                            background: tool.iconBg || (darkMode ? "#3f3f46" : "#f4f4f5"),
                                            padding: tool.icon?.startsWith("http") ? 3 : 0,
                                          }}
                                          onError={(e) => {
                                            ;(e.target as HTMLImageElement).style.display = "none"
                                          }}
                                        />
                                      ) : (
                                        <div style={{
                                          width: 28, height: 28, borderRadius: 8,
                                          display: "flex", alignItems: "center", justifyContent: "center",
                                          background: darkMode ? "#3f3f46" : "#f4f4f5",
                                          flexShrink: 0,
                                        }}>
                                          <IconLightning size={13} style={{ color: "#059669" }} />
                                        </div>
                                      )}
                                      <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 500 }}>{tool.displayName || tool.name}</div>
                                        {tool.description && (
                                          <div style={{ fontSize: 11, opacity: 0.5, lineHeight: 1.35, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {typeof tool.description === "string"
                                              ? tool.description
                                              : tool.description?.[0]?.text || ""}
                                          </div>
                                        )}
                                      </div>
                                    </button>
                                  ))}

                                  {availableTools.length === 0 && (
                                    <div style={{ padding: "20px 12px", textAlign: "center", fontSize: 12.5, opacity: 0.45 }}>
                                      暂无已安装的插件
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>,
                        document.body,
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        /* 「添加照片和文件」就该能选**文件**：原先这里只有 `image/*`，
                           于是 .docx/.pdf 在选择框里根本看不见，只能靠粘贴/拖拽混进来
                           （与它旁边那行「支持图片、视频、音频、文档」的文案互相打脸）。
                           白名单与 upload-document.ts 的可解析后缀对齐；旧版 Office 等
                           不在这里拦，交给服务端给出准确解释（那里的设计本就如此）。 */
                        accept="image/*,.pdf,.docx,.xlsx,.pptx,.md,.markdown,.txt,.log,.csv,.tsv,.json,.html,.htm"
                        onChange={(e) => {
                          onSelectFiles(e)
                          setPlusMenuOpen(false)
                        }}
                        className="hidden"
                      />
                    </div>

                    {/* ── 连接器（minimal 态）───────────────────────────────────────
                        2026-10-21 用户定调：「+ 和 连接器 是分开的，连接器就是插件和 skill」。
                        于是这里承载**能力**，与「+ 加素材」严格分工：
                          · 技能：种植场景（巡检 / 病虫害 / 环境 / 策略 / 研究）+ 已启用技能数
                                  （技能由后端按问题自动路由，这里只负责「进场景」与「去装新的」）
                          · 插件：已装 MCP 工具（天气 / 搜索 / 光谱…），点一下 = 指定给本条消息
                          · 内置：联网搜索 / 深度思考 / 计划模式（平台自带能力开关）
                        面板同样 portal 到 body —— 祖先链的 overflow:hidden + backdrop-filter
                        会把 fixed 也困住（同「+」面板，见 useSenderPopover 的注释）。 */}
                    {minimalToolbar && (
                      <div style={{ position: "relative", flexShrink: 0, marginLeft: 4 }}>
                        <button
                          ref={connectorPop.btnRef}
                          onClick={() => {
                            if (connectorOpen) {
                              setConnectorOpen(false)
                              connectorPop.close()
                              return
                            }
                            connectorPop.open(320, -4)
                            setConnectorOpen(true)
                            setPlusMenuOpen(false)
                          }}
                          onBlur={() =>
                            setTimeout(() => {
                              setConnectorOpen(false)
                              connectorPop.close()
                            }, 200)
                          }
                          title="连接器：插件与技能"
                          className="sender-chip"
                          data-open={connectorOpen ? "true" : undefined}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "5px 11px", borderRadius: 999,
                            border: "none", background: "transparent", cursor: "pointer",
                            color: darkMode ? "#a1a1aa" : "#71717A",
                            fontSize: 13, fontWeight: 500, whiteSpace: "nowrap",
                          }}
                        >
                          <IconApi size={14} />
                          <span>连接器</span>
                          <IconDown
                            size={12}
                            style={{
                              opacity: 0.6,
                              transition: "transform 0.2s",
                              transform: connectorOpen ? "rotate(180deg)" : "none",
                            }}
                          />
                        </button>

                        {connectorOpen && connectorPop.anchor && createPortal(
                          <div
                            data-sender-popover="connector"
                            onMouseDown={(e) => e.preventDefault()}
                            style={{
                              position: "fixed",
                              left: connectorPop.anchor.left,
                              bottom: connectorPop.anchor.bottom,
                              zIndex: 3000,
                              width: 320,
                              maxHeight: "min(70vh, 520px)",
                              overflowY: "auto",
                              borderRadius: 16,
                              padding: "10px 10px 8px",
                              background: darkMode ? "#27272a" : "#fff",
                              border: darkMode ? "1px solid #3f3f46" : "1px solid #e4e4e7",
                              boxShadow: darkMode
                                ? "0 20px 50px rgba(0,0,0,0.5)"
                                : "0 10px 40px rgba(0,0,0,0.15)",
                              transformOrigin: "bottom left",
                              animation: "plus-panel-up 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
                            }}
                          >
                            {/* ── 技能：种植场景（点即进模式；选中那枚高亮）──────── */}
                            <Flex align="center" justify="space-between" style={{ padding: "2px 8px 6px" }}>
                              <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: 0.3, color: darkMode ? "#a1a1aa" : "#A1A1AA" }}>
                                技能
                              </span>
                              {onManageSkills && (
                                <button
                                  onClick={() => {
                                    setConnectorOpen(false)
                                    connectorPop.close()
                                    onManageSkills()
                                  }}
                                  style={{
                                    border: "none", background: "transparent", cursor: "pointer",
                                    fontSize: 11.5, color: darkMode ? "#34D399" : "#059669",
                                    padding: "2px 4px", borderRadius: 6,
                                  }}
                                >
                                  技能商店 ›
                                </button>
                              )}
                            </Flex>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 8px" }}>
                              {modeList.map((m) => {
                                const isActive = m.key === activeMode
                                return (
                                  <button
                                    key={m.key}
                                    onClick={() => {
                                      enterMode(m)
                                      setConnectorOpen(false)
                                      connectorPop.close()
                                    }}
                                    style={{
                                      display: "inline-flex", alignItems: "center", gap: 5,
                                      height: 30, padding: "0 10px", borderRadius: 8,
                                      border: "none", cursor: "pointer",
                                      fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap",
                                      background: isActive
                                        ? (darkMode ? "rgba(0,148,86,0.22)" : "rgba(5,150,105,0.10)")
                                        : (darkMode ? "rgba(255,255,255,0.06)" : "rgba(24,24,27,0.04)"),
                                      color: isActive
                                        ? (darkMode ? "#6EE7B7" : "#047857")
                                        : (darkMode ? "#d4d4d8" : "#3F3F46"),
                                      transition: "background .15s, color .15s",
                                    }}
                                    onMouseEnter={(e) => {
                                      if (isActive) return
                                      e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.10)" : "rgba(24,24,27,0.07)"
                                    }}
                                    onMouseLeave={(e) => {
                                      if (isActive) return
                                      e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.06)" : "rgba(24,24,27,0.04)"
                                    }}
                                  >
                                    {m.icon}
                                    {m.label}
                                  </button>
                                )
                              })}
                            </div>
                            {typeof skillCount === "number" && skillCount > 0 && (
                              <div style={{ padding: "8px 10px 2px", fontSize: 11, lineHeight: 1.5, color: darkMode ? "#71717A" : "#a1a1aa" }}>
                                已启用 {skillCount} 个技能，AI 会按问题自动匹配
                              </div>
                            )}

                            <div style={{ height: 1, background: darkMode ? "#3f3f46" : "#f0f0f2", margin: "10px 6px 8px" }} />

                            {/* ── 插件：已装 MCP 工具（点即指定给本条消息）──────────── */}
                            <Flex align="center" justify="space-between" style={{ padding: "0 8px 4px" }}>
                              <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: 0.3, color: darkMode ? "#a1a1aa" : "#A1A1AA" }}>
                                插件
                              </span>
                              {onManagePlugins && (
                                <button
                                  onClick={() => {
                                    setConnectorOpen(false)
                                    connectorPop.close()
                                    onManagePlugins()
                                  }}
                                  style={{
                                    border: "none", background: "transparent", cursor: "pointer",
                                    fontSize: 11.5, color: darkMode ? "#34D399" : "#059669",
                                    padding: "2px 4px", borderRadius: 6,
                                  }}
                                >
                                  插件商店 ›
                                </button>
                              )}
                            </Flex>
                            {availableTools.length === 0 ? (
                              <div style={{ padding: "6px 10px 8px", fontSize: 11.5, lineHeight: 1.5, color: darkMode ? "#71717A" : "#a1a1aa" }}>
                                还没有安装插件 —— 天气、搜索、光谱等外部数据源都在插件商店里
                              </div>
                            ) : (
                              <div style={{ padding: "0 2px" }}>
                                {availableTools.map((tool) => (
                                  <button
                                    key={tool.name}
                                    onClick={() => {
                                      handleToolSelect({ key: tool.name } as any)
                                      setConnectorOpen(false)
                                      connectorPop.close()
                                    }}
                                    style={{
                                      display: "flex", alignItems: "center", gap: 9,
                                      width: "100%", padding: "6px 8px", marginTop: 1,
                                      borderRadius: 8, border: "none", cursor: "pointer",
                                      background: "transparent", textAlign: "left",
                                      color: darkMode ? "#d4d4d8" : "#3F3F46",
                                      transition: "background .15s",
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = darkMode ? "#3f3f46" : "#f4f4f5"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                  >
                                    {tool.icon ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={tool.icon}
                                        alt=""
                                        style={{ width: 24, height: 24, borderRadius: 7, objectFit: "cover", flexShrink: 0, background: tool.iconBg || (darkMode ? "#3f3f46" : "#f4f4f5") }}
                                      />
                                    ) : (
                                      <span style={{
                                        width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        background: darkMode ? "#3f3f46" : "#f4f4f5",
                                      }}>
                                        <IconLightning size={12} style={{ color: "#059669" }} />
                                      </span>
                                    )}
                                    <span style={{ minWidth: 0 }}>
                                      <span style={{ display: "block", fontSize: 12.5, fontWeight: 500, lineHeight: 1.4 }}>
                                        {tool.displayName || tool.name}
                                      </span>
                                      {tool.description && (
                                        <span style={{
                                          display: "block", fontSize: 11, opacity: 0.5, lineHeight: 1.35,
                                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                        }}>
                                          {typeof tool.description === "string" ? tool.description : ""}
                                        </span>
                                      )}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}

                            <div style={{ height: 1, background: darkMode ? "#3f3f46" : "#f0f0f2", margin: "10px 6px 6px" }} />

                            {/* ── 内置能力：三个开关（平台自带，不用装）──────────────── */}
                            <div style={{ padding: "0 8px 4px", fontSize: 11.5, fontWeight: 600, letterSpacing: 0.3, color: darkMode ? "#a1a1aa" : "#A1A1AA" }}>
                              内置能力
                            </div>
                            {[
                              { key: "search", label: "联网搜索", desc: "检索最新资料", on: enableSearch, toggle: () => setEnableSearch(!enableSearch) },
                              { key: "reasoning", label: "深度思考", desc: "推理更充分，更慢", on: enableReasoning, toggle: () => setEnableReasoning(!enableReasoning) },
                              { key: "planning", label: "计划模式", desc: "先出计划再执行", on: enablePlanning, toggle: () => setEnablePlanning(!enablePlanning) },
                            ].map((item) => (
                              <div
                                key={item.key}
                                style={{
                                  display: "flex", alignItems: "center", justifyContent: "space-between",
                                  padding: "6px 8px", borderRadius: 8,
                                }}
                              >
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 12.5, fontWeight: 500, color: darkMode ? "#d4d4d8" : "#3F3F46", lineHeight: 1.5 }}>
                                    {item.label}
                                  </div>
                                  <div style={{ fontSize: 11, lineHeight: 1.35, color: darkMode ? "#71717A" : "#a1a1aa" }}>
                                    {item.desc}
                                  </div>
                                </div>
                                <button
                                  onClick={item.toggle}
                                  role="switch"
                                  aria-checked={item.on}
                                  aria-label={item.label}
                                  style={{
                                    width: 34, height: 20, borderRadius: 999,
                                    border: "none", cursor: "pointer", flexShrink: 0,
                                    background: item.on
                                      ? (darkMode ? "rgba(0,148,86,0.20)" : "rgba(0,148,86,0.18)")
                                      : (darkMode ? "#3f3f46" : "#d4d4d8"),
                                    position: "relative", transition: "background 0.2s",
                                  }}
                                >
                                  <span style={{
                                    position: "absolute", top: 2,
                                    left: item.on ? 16 : 2,
                                    width: 16, height: 16, borderRadius: "50%",
                                    background: "#fff",
                                    transition: "left 0.2s ease",
                                    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                                  }} />
                                </button>
                              </div>
                            ))}
                          </div>,
                          document.body,
                        )}
                      </div>
                    )}

                    {/* 截图入口插槽（2026-10-14 工作台 Copilot 用）。
                        挨着「+」是有意的：两者同族 —— 都是「往这条消息里加一张图」，
                        只是「+」取已有文件、截图现取一张。 */}
                    {screenshotSlot}

                    {/* 思考（深度思考）— 内联按钮
                        2026-10-14：Copilot 侧栏传 hideAbilityToggles 时不渲染（工具栏精简）。
                        2026-10-21：minimal 态也撤下 —— 入口移到「+」面板的开关行（见上方面板）。 */}
                    {!hideAbilityToggles && !minimalToolbar && (
                    <button
                      onClick={() => setEnableReasoning(!enableReasoning)}
                      title="深度思考：让模型进行更深入的推理"
                      className="inline-flex items-center gap-1.5 sender-chip"
                      data-on={enableReasoning ? "blue" : undefined}
                      style={{
                        /* 间距由外层 Flex gap={3} 统一控制（原为 marginLeft:2，见上） */
                        /* 参考稿「深度思考」chip 形态：全胶囊 */
                        padding: "5px 11px",
                        borderRadius: 999,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                        /* 启用态配色仍取自参考稿「深度思考」chip 实测：淡蓝底 + rgb(39,88,238) 亮蓝字。
                           底色的**实色部分**移到 senderImmersiveStyle 的 .sender-chip[data-on] 里，
                           那里是半透 + 背景模糊 + 上缘受光的材质版（字色仍原样）。 */
                        color: enableReasoning
                          ? (darkMode ? "#8ab4ff" : "#2758EE")
                          : (darkMode ? "#a1a1aa" : "#71717A"),
                        transition: "all 0.2s",
                      }}
                    >
                      <IconBrain size={14} strokeWidth={2} />
                      <span>深度思考</span>
                    </button>
                    )}

                    {/* 研究（联网搜索 / 深度研究）— 内联按钮
                        2026-10-01：/ai-assistant 主页把「研究」作为**模式**放进了下面的
                        能力行（`modes` 里的一条），所以这里只在**没传 modes 的旧调用方**
                        （Copilot 侧栏等）保留这枚独立开关，行为与历史版本逐字一致。
                        2026-10-14：Copilot 侧栏也关掉了（hideAbilityToggles）——
                        联网检索改由「+ → 联网搜索」切换，这枚 chip 只负责占宽。 */}
                    {!hasModeRow && !hideAbilityToggles && (
                    <button
                      onClick={() => setEnableSearch(!enableSearch)}
                      title="联网搜索：让模型检索最新信息，也可深度研究并沉淀到知识库"
                      className="inline-flex items-center gap-1.5 sender-chip"
                      data-on={enableSearch ? "brand" : undefined}
                      style={{
                        padding: "5px 11px",
                        borderRadius: 999,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                        /* 启用态仍是品牌绿（同参考稿），但底子换成半透 + 背景模糊 + 上缘受光，
                           见 senderImmersiveStyle 的 .sender-chip[data-on="brand"]。 */
                        color: enableSearch
                          ? "#059669"
                          : (darkMode ? "#a1a1aa" : "#71717A"),
                        transition: "all 0.2s",
                      }}
                    >
                      <IconGlobe size={14} strokeWidth={2} />
                      <span>研究</span>
                    </button>
                    )}

                    {/* 能力 / 模式行（2026-10-01 用户：「把这些放到 sender」+「你看看人家的」）
                        —— 未选中 = 一排扁平图文胶囊；选中 = 整排收起，只留一枚绿色 × 胶囊。
                        组件在 components/ai/sender-modes.tsx，与落地页首屏同源。
                        2026-10-21 minimal 态：整排收进「+ → 种植能力」子菜单，
                        这里只保留「已选中」那一枚胶囊（退出入口不丢）。 */}
                    {hasModeRow && !minimalToolbar && (
                      <SenderModeRow
                        modes={modeList}
                        activeKey={activeMode}
                        darkMode={darkMode}
                        disabled={isLoading}
                        onEnter={enterMode}
                        onExit={exitMode}
                      />
                    )}

                    {/* 权限模式 — 向上弹出面板（间距交给左簇的 gap 6，这里不再自带 margin） */}
                    {setApprovalMode && (
                      <div style={{ position: "relative" }}>
                        <button
                          ref={approvalPop.btnRef}
                          onClick={() => {
                            if (approvalPanelOpen) {
                              setApprovalPanelOpen(false)
                              approvalPop.close()
                              return
                            }
                            /* 权限面板 300px 宽，原 left:-8 */
                            approvalPop.open(300, -8)
                            setApprovalPanelOpen(true)
                            setPlusMenuOpen(false)
                          }}
                          onBlur={() =>
                            setTimeout(() => {
                              setApprovalPanelOpen(false)
                              approvalPop.close()
                            }, 200)
                          }
                          /* 权限 chip：与另两个 chip 同一套 hover 材质（.sender-chip）。
                             ⚠️ 原来的 inline background:"transparent" 必须去掉 ——
                                inline 会压掉 CSS 里的 hover 底色，等于材质不生效。
                             2026-09-29：补 title —— 这枚 chip 只有「盾牌 + 箭头」没有文字，
                             新用户不知道它是干嘛的；悬停给出当前模式名，零宽度成本地补上语义。 */
                          title={`操作权限：${APPROVAL_MODES.find((m) => m.key === approvalMode)?.label ?? "请求批准"}`}
                          className="sender-chip"
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "5px 11px", borderRadius: 999,
                            border: "none", cursor: "pointer",
                            color: darkMode ? "#a1a1aa" : "#71717A",
                            fontSize: 13, whiteSpace: "nowrap",
                          }}
                        >
                          <IconShield size={14} />
                          {/* 2026-09-24：只留盾牌图标（用户要求去掉「请求批准」文字），模式仍可点开面板切换。
                             2026-10-21 minimal 态（参考稿「🛡 替我审批 ⌄」）：把**当前模式名**显式画出来，
                             箭头保留 —— 三个模式名就是三档语义，看得见才选得对。 */}
                          {minimalToolbar && (
                            <span style={{ fontSize: 13 }}>
                              {APPROVAL_MODES.find((m) => m.key === approvalMode)?.label ?? "请求批准"}
                            </span>
                          )}
                          <IconDown size={12} style={{ transition: "transform 0.2s", transform: approvalPanelOpen ? "rotate(180deg)" : "none" }} />
                        </button>

                        {/* 权限模式向上弹出面板 —— 同「+」：portal 到 body，否则被侧栏 overflow:hidden 裁掉 */}
                        {approvalPanelOpen && approvalPop.anchor && createPortal(
                          <div
                            data-sender-popover="approval"
                            onMouseDown={(e) => e.preventDefault()}
                            style={{
                              position: "fixed",
                              left: approvalPop.anchor.left,
                              bottom: approvalPop.anchor.bottom,
                              zIndex: 3000,
                              width: 300,
                              borderRadius: 16,
                              padding: "12px 0 10px",
                              background: darkMode ? "#27272a" : "#fff",
                              border: darkMode ? "1px solid #3f3f46" : "1px solid #e4e4e7",
                              boxShadow: darkMode
                                ? "0 20px 50px rgba(0,0,0,0.5)"
                                : "0 10px 40px rgba(0,0,0,0.15)",
                              transformOrigin: "bottom left",
                              animation: "plus-panel-up 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
                            }}
                          >
                            {/* 标题行 */}
                            <Flex justify="space-between" align="center" style={{ padding: "0 14px 6px" }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: darkMode ? "#d4d4d8" : "#3F3F46" }}>
                                应如何批准 BerryZ 操作？
                              </span>
                              <a
                                href="#"
                                onClick={(e) => e.preventDefault()}
                                style={{ fontSize: 11.5, color: "#059669", textDecoration: "underline" }}
                              >
                                了解更多
                              </a>
                            </Flex>

                            {/* 选项列表 */}
                            <div style={{ padding: "2px 8px" }}>
                              {APPROVAL_MODES.map((m) => {
                                const isActive = m.key === approvalMode
                                return (
                                  <button
                                    key={m.key}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => { setApprovalMode(m.key); setApprovalPanelOpen(false) }}
                                    style={{
                                      display: "flex", alignItems: "flex-start", gap: 10,
                                      width: "100%", padding: "9px 12px", marginTop: 2,
                                      borderRadius: 10, border: "none", cursor: "pointer",
                                      background: isActive
                                        ? (darkMode ? "#3f3f46" : "#f4f4f5")
                                        : "transparent",
                                      color: darkMode ? "#d4d4d8" : "#3F3F46",
                                      textAlign: "left", transition: "all 0.2s ease",
                                    }}
                                    onMouseEnter={(e) => !isActive && (e.currentTarget.style.background = darkMode ? "#323232" : "#fafafa")}
                                    onMouseLeave={(e) => !isActive && (e.currentTarget.style.background = "transparent")}
                                    onMouseDownCapture={(e) => (e.currentTarget.style.background = darkMode ? "#3a3a3e" : "#ececec")}
                                  >
                                    <span style={{ flexShrink: 0, marginTop: 1 }}>{m.icon}</span>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ fontWeight: 500, fontSize: 13.5 }}>{m.label}</span>
                                        {isActive && <IconCheck size={14} strokeWidth={2.5} />}
                                      </div>
                                      <span style={{ fontSize: 11.5, opacity: 0.55, lineHeight: 1.45, marginTop: 2, display: "block" }}>
                                        {m.desc}
                                      </span>
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          </div>,
                          document.body,
                        )}
                      </div>
                    )}
                    {/* minimal 态：场景整排收进「连接器」面板后，**已选中**的那枚绿色 × 胶囊
                        仍留在工具条（权限右侧）—— 用户得看得见「现在是什么场景」，
                        也得够得着「退出」。未选中时不占位（参考图工具条只有三枚）。 */}
                    {minimalToolbar && activeModeItem && (
                      <div>
                        <SenderModeRow
                          modes={modeList}
                          activeKey={activeMode}
                          darkMode={darkMode}
                          disabled={isLoading}
                          onEnter={enterMode}
                          onExit={exitMode}
                        />
                      </div>
                    )}
                    {/* 语音入口插槽（2026-09-24 工作台 Copilot：给莓小智打电话）
                        voicePlacement="right" 时不在这里渲染，改挂到右簇发送键左侧。
                        ⚠️ 2026-10-24 起 AI 助手页不再使用它：那枚「语音通话」入口已撤，
                        语音只保留 sender 自绘的「语音输入」（右簇发送键左边）。 */}
                    {voicePlacement === "left" && voiceSlot && !minimalToolbar}
                  </Flex>

                  {/* 右侧：上下文容量指示器（可选）+ 模型选择胶囊（可选）+ 语音（可选）+ 发送按钮 */}
                  <Flex align="center" gap={10} style={{ flexShrink: 0 }}>
                    {contextMeter}
                    {modelSelector}
                    {voicePlacement === "right" && voiceSlot && !minimalToolbar}
                    {/* 语音输入（2026-10-24）：说话 → 本地 sherpa-onnx 识别 → 追加进草稿。
                        2026-10-24 二改（用户定）：从「＋」旁边挪到**发送键左边** ——
                        「说话」和「打字」是同一件事（把这条消息送出去），
                        手指不该横跨整条工具条才能按到它。
                        同时**撤掉原来的「语音通话」入口**：语音只留这一个，别再并存两个麦克风。 */}
                    {enableVoiceInput && (
                      <VoiceInputButton
                        getDraft={() => input}
                        onDraft={(next) => setInput(next)}
                        darkMode={darkMode}
                        disabled={isLoading}
                      />
                    )}
                    {actionNode}
                  </Flex>
                </Flex>
              )}
            />
          )}
        </Suggestion>
      </div>
    </div>
  )
}
