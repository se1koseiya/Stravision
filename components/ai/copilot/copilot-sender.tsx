"use client"

/**
 * Copilot 侧栏专用 sender（2026-10-22 拆分）
 *
 * ── 为什么不再和 AI 助手的 sender 共用一个组件 ──────────────────────────────
 * 用户定调：「copilot 的 sender 不要和 ai-assistant 的 sender 公用，这是两个不同的业务」。
 * 两条业务线的工具条根本不是一回事：
 *
 *   · AI 助手（app/ai-assistant）＝ 种植对话工作台：
 *     种植场景技能、连接器（插件 / 技能）、模型选择器、上下文容量、语音通话。
 *   · Copilot 侧栏（components/ai/copilot）＝ 当前页面的副驾：
 *     只做「看一眼 / 截一张 / 问一句 / 让它动手」，挂在 400px 窄栏里，
 *     连工具列表都恒为空（插件面板属于 AI 助手侧）。
 *
 * 共用只会让两边互相迁就 —— 前车之鉴就是为了让 AI 助手的模式行跑起来，
 * 给 Copilot 加了 `hideAbilityToggles` / `voicePlacement` 这种
 * 「把对方功能关掉」的开关。现在各养一份，各自只留本业务要的控件：
 *
 *      ＋ 加素材 ｜ 截图 ｜ 权限 ｜ … ｜ 语音 ｜ 发送
 *
 * 视觉语言（沉浸光感 + 折叠↔展开弹簧补间 + 附件 chip）与主助手同源同形，
 * 但代码各走各的：改这里不会碰坏主助手，反之亦然。
 */

import React, { useRef, useState, useCallback, useEffect, useLayoutEffect, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import { Sender } from "@ant-design/x"
import { Flex } from "antd"
import type { ChatAttachment } from "@/app/ai-assistant/types"
import { formatIcon } from "@/app/ai-assistant/_components/format-icon"
import { IconCheck, IconClose, IconDown, IconPaperclip, IconPlus, IconShield } from "@/components/icon"
import { VoiceInputButton } from "@/components/ai/voice-input-button"
import { getVoiceInputActive, subscribeVoiceInputActive } from "@/lib/voice/asr/voice-input-status"

/** SSR 下用 useEffect 兜底（避免 useLayoutEffect 的服务端警告），客户端即 useLayoutEffect */
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

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
 *    外加一处卡死：`attachmentOpen` 一旦置 true 就没人清，**永久**顶住 `collapsed`
 *    的判定 —— 于是"发送后附件区本该消失，却留下一个空的上传占位框，整块收不回去"。
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

// Agent 操作权限模式（与 AI 助手同名同义，但各自定义：谁的 UI 归谁）
export type CopilotApprovalMode = "request" | "auto" | "full"

const APPROVAL_MODES: { key: CopilotApprovalMode; label: string; desc: string; icon: React.ReactNode }[] = [
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

/**
 * 「有附件、但一个字都没打」时喂给 Sender 的占位值 —— 唯一用途是**点亮发送键**。
 * antd X 的发送键可用性只看输入框文本，不认识我们外挂的附件；
 * 空格（而非零宽字符）是有意的：提交时 `text.trim()` 能把它清干净。
 */
const ATTACHMENT_VALUE_PLACEHOLDER = " "

export interface CopilotSenderProps {
  input: string
  setInput: (value: string) => void
  onSend: (text: string) => void
  isLoading: boolean
  attachments: ChatAttachment[]
  onSelectFiles: React.ChangeEventHandler<HTMLInputElement>
  onRemoveAttachment: (index: number) => void
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void
  /** 文件拖到 sender 上落点 */
  onDropFiles?: (files: File[]) => void
  enableReasoning: boolean
  setEnableReasoning: (v: boolean) => void
  enablePlanning: boolean
  setEnablePlanning: (v: boolean) => void
  enableSearch: boolean
  setEnableSearch: (v: boolean) => void
  onCancel?: () => void
  darkMode?: boolean
  approvalMode?: CopilotApprovalMode
  setApprovalMode?: (mode: CopilotApprovalMode) => void
  /** 截图入口（紧挨「＋」：两者同族 —— 都是「往这条消息里加一张图」） */
  screenshotSlot?: React.ReactNode
  /** 语音入口（右簇、发送键左侧） */
  voiceSlot?: React.ReactNode
  /**
   * 语音输入（本地 sherpa-onnx 识别，说话转草稿）。
   * 放左簇「截图」之后 —— 与「＋ / 截图」同族（往这条消息里投内容）。
   * 右簇那枚是**语音通话**，两者语义不同，别合并。默认 false（零回归）。
   */
  enableVoiceInput?: boolean
}

export function CopilotSender({
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
  onCancel,
  darkMode = false,
  approvalMode = "request",
  setApprovalMode,
  screenshotSlot,
  voiceSlot,
  enableVoiceInput = false,
}: CopilotSenderProps) {
  const senderRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  /* 文件拖到 sender 上的悬停态：只驱动一条落点描边（见根节点 onDragOver） */
  const [dragOver, setDragOver] = useState(false)
  const [plusMenuOpen, setPlusMenuOpen] = useState(false)
  const [approvalPanelOpen, setApprovalPanelOpen] = useState(false)

  /* 语音持续转写状态：由 `VoiceInputButton` 广播（见 lib/voice/asr/voice-input-status）。
     提前到这里取，是因为下面的 `collapsed` 判定要用它 —— 转写中绝不收起，
     否则麦克风按钮随工具栏一起消失，用户就没法点"结束"了。 */
  const voiceActive = useSyncExternalStore(subscribeVoiceInputActive, getVoiceInputActive, () => false)

  /* 「向上弹出」的面板：定位交给 portal 版定位器（祖先链有 overflow:hidden + backdrop-filter，
     就地渲染必被裁 —— 详见 useSenderPopover 注释） */
  const plusPop = useSenderPopover()
  const approvalPop = useSenderPopover()

  /**
   * ── 折叠 / 展开 两态 ──────────────────────────────────────────────────
   * 折叠 = 单行白玻璃胶囊（只有 placeholder + 发送键）；
   * 展开 = 多行输入 + 「＋ / 截图 / 权限 / 语音 / 发送」整条工具条。
   * 聚焦或点任意处 → 展开；指针按到外面（或 Tab 走）且输入为空 → 收回。
   * 保护：有内容 / 有附件 / 正在生成 / 浮层打开时绝不收起。
   */
  const [focused, setFocused] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  /**
   * 「用户是用 Tab 键把焦点挪走的」标记 —— 收起只认两种用户动作：
   * ① 指针按到 sender 外 ② Tab 走了。焦点被程序化抢走（antd Modal focus trap 等）
   * 不算离开，否则会出现「点一下让它聚焦，它反而收起」。
   */
  const tabAwayRef = useRef(false)
  const collapsed =
    !focused &&
    !input.trim() &&
    attachments.length === 0 &&
    !isLoading &&
    !plusMenuOpen &&
    !approvalPanelOpen &&
    /* 转写中保持展开：麦克风按钮必须一直够得着（否则只能等 10s 静音自动结束） */
    !voiceActive

  /**
   * 收起 = 「在 sender 外面按下鼠标」。
   * 三种「虽然不在 root 里但属于自己」的情况放行：
   *   ① antd 浮层 portal 到 body；② 本组件的两个面板 [data-sender-popover]；
   *   ③ 展开动画期间点在同一位置（root 尚未撑开）。
   */
  useEffect(() => {
    if (collapsed) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node | null
      if (!t) return
      const root = rootRef.current
      if (root && root.contains(t)) return
      if ((t as HTMLElement).closest?.(
        '[data-sender-popover], .ant-dropdown, .ant-select-dropdown, .ant-popover, .ant-picker-dropdown'
      )) return
      setFocused(false)
    }
    document.addEventListener("mousedown", onDown, true)
    return () => document.removeEventListener("mousedown", onDown, true)
  }, [collapsed])

  /**
   * ── 折叠 ↔ 展开 的**高度补间**（2026-09-25 用户反馈：「伸缩动画生硬难看」）────────
   *
   * 病因：两态之间是**高度突变**（折叠 40px 单行 → 展开 ~125px 多行 + 工具栏），
   *       而 CSS 无法对 `height:auto` 做 transition —— 原来只有圆角 / 光环在 0.42s 里
   *       慢慢变形，外壳尺寸却是「啪」地一下到位（工具栏同时被瞬间塞进来），
   *       于是出现「慢慢变形的框 + 瞬间跳变的内容」这种错位感。
   *
   * 处方（纯视觉层，不动任何功能节点 / props / handler）：
   *   · **弹簧补间**：height 无法用 CSS transition（auto 高度），所以用 WAAPI 按上面那条
   *     阻尼弹簧曲线补：[过冲 → 回位]，跟 CSS 圆角用的是同一条曲线
   *     （见 SPRING_LINEAR），所以「尺寸」「圆角」「光环」是一次呼吸出来的。
   *   · 补间期间临时 overflow:hidden：工具栏不是"跳出来"，而是跟着盒子被**揭开**。
   *   · 补间期间**摘掉 backdrop-filter**：高度每变一帧就要重采一次背景模糊，
   *     这是这段动画唯一真正贵的东西（copilot 收拢动画早有同款先例）。
   *   · 🚨 **终点漂移矫正**（2026-09-26 用户实锤「过渡期间要矫正高度→卡顿」）：
   *     翻转瞬间量到的高度可能是**过时**的（antd 的 textarea autoSize 晚一帧才把
   *     1 行撑到 2 行）→ 补间在 111px 结束、盒子随后「啪」到 126px = 跳变。
   *     现在补间前几帧盯着 scrollHeight（盒子被压矮时它 = 内容自然高度），
   *     一旦发现内容长高了，就从**当前弹簧位置**无缝改道到新终点续跑剩余时长，
   *     全程一条运动轨迹，没有二次跳变。
   *   · 结束后立刻恢复原样式；打字时 autoSize 的高度变化**不参与补间**
   *     （只有折叠态翻转才补），避免逐行打字时肉眼可见的抽搐。
   */
  const senderHeightRef = useRef<number | null>(null)
  const prevCollapsedRef = useRef(collapsed)
  const morphAnimRef = useRef<Animation | null>(null)
  useIsoLayoutEffect(() => {
    const el = senderRef.current?.nativeElement as HTMLElement | undefined
    if (!el) return
    /* 先停掉可能还在跑的上一条补间（restore 会复位样式并回写真实落定高度），
       然后挂 morphing 类（🚨 关掉 textarea 自带高度过渡）再量终点：
       不然量到的是 textarea 还在爬的中间高度，补间结束必然再「矫正」跳一下。 */
    morphAnimRef.current?.cancel()
    el.classList.add("sender-morphing")
    el.style.overflow = "hidden"
    const height = el.getBoundingClientRect().height
    const prevHeight = senderHeightRef.current
    senderHeightRef.current = height
    const wasCollapsed = prevCollapsedRef.current
    prevCollapsedRef.current = collapsed
    // 只有「折叠态翻转」才补间；首帧、打字撑高、内容不变时直接放过
    if (
      prevHeight == null ||
      wasCollapsed === collapsed ||
      Math.abs(prevHeight - height) < 2 ||
      typeof el.animate !== "function"
    ) {
      el.classList.remove("sender-morphing")
      el.style.overflow = ""
      return
    }

    const startTween = (from: number, to: number, dur: number) =>
      el.animate(
        /* 弹簧曲线直接展开成关键帧：linear 插值即可，肉眼看就是振子运动 */
        SPRING_SAMPLES.map(p => ({ height: `${from + (to - from) * p}px` })),
        { duration: Math.max(120, dur), easing: "linear", fill: "none" }
      )

    let target = height
    let t0 = performance.now()
    let anim = startTween(prevHeight, target, MORPH_MS)
    morphAnimRef.current = anim
    /* 动画中途再翻转（疯狂点输入框）时样式必须复位，否则会把 + 菜单等浮层裁掉。
       复位时顺手把「真实落定高度」写回 ref：不然终点若与翻转时测量值有偏差，
       下一次翻转就会从过时的 prevHeight 起跳（又一处跳变源）。
       🚨 只处理「当前生效」的那条动画：漂移改道会 cancel 旧动画，
       旧动画的 oncancel 不能把新动画刚挂上的 morphing 类摘掉。 */
    const restore = () => {
      if (morphAnimRef.current !== anim) return
      el.classList.remove("sender-morphing")
      el.style.overflow = ""
      senderHeightRef.current = el.getBoundingClientRect().height
      morphAnimRef.current = null
    }
    anim.onfinish = restore
    anim.oncancel = restore

    /* ── 终点漂移监视：只盯补间前 2/3 时段（漂移都发生在开头一两帧）──
       🚨 只在**展开方向**启用：收回时内容变矮，scrollHeight = 被动画压着的高度
       （比终点大），拿来当「自然高度」会误触发矫正、把收回补间往回拽。 */
    const expanding = target > prevHeight
    const watchDrift = () => {
      if (morphAnimRef.current !== anim) return
      const elapsed = performance.now() - t0
      /* 盒子被动画压着时，scrollHeight 就是内容的自然高度 */
      const natural = el.scrollHeight
      if (expanding && elapsed < MORPH_MS * 0.66 && natural > target + 2) {
        const progress = Math.min(1, elapsed / MORPH_MS)
        const current = prevHeight + (target - prevHeight) * springAt(progress)
        /* 先摘引用再 cancel：oncancel 里的 restore 看到 ref 不匹配就不会复位样式 */
        morphAnimRef.current = null
        anim.cancel()
        target = natural
        t0 = performance.now()
        anim = startTween(current, target, MORPH_MS - elapsed + 120)
        morphAnimRef.current = anim
        anim.onfinish = restore
        anim.oncancel = restore
      }
      if (elapsed < MORPH_MS) requestAnimationFrame(watchDrift)
    }
    requestAnimationFrame(watchDrift)
  })

  /* 🚨 2026-10-22 拆分时删掉的一段（原样留在 AI 助手那份里，Copilot 不需要）：
     · 知识库集合 `/` 补全（kbCollections + 两条 fetch）
     · MCP 插件下拉（toolMenuItems / handleToolSelect / insertToolTag）
     · 探索页「在对话中试用」→ berry:mention-tool 事件监听
     这三样都属于「插件 / 技能」域，按用户定调归 AI 助手；Copilot 侧栏只做
     「看一眼 / 截一张 / 问一句 / 让它动手」，输入框不需要 skill tag 与斜杠菜单。
     ⚠️ 别因为「看起来更完整」把 slashItems 搬回来 —— 那会连带拽回 80+ 技能列表。 */

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
   *
   * 🚨 2026-10-24 五次修订（用户：「也弄上光晕，然后呢把它外圈的那个蓝色去掉，
   *    换上光晕。设计规范跟那个 AI 助手页面一样」）：
   *    · 删掉「0 0 0 4px」那圈**蓝色 spread 环**（折叠灰青 / 展开亮蓝两套都删），
   *      连带删掉 `sender-ring-in`（蓝环从 0 扩散到 7px 再回落）——
   *      边界改由**极细的线**立住，不再靠一圈彩环。
   *    · 呼吸改用中性灰阴影（与主助手同一条 keyframes 参数）。
   *    · 语音持续转写时，外圈亮**主题 emerald 光环**（白芯高光 + 透明窗的 conic
   *      扫光），配色/动画与主助手 `chat-sender-input.tsx` 逐字同源。
   *    · 折叠态是 999px 全胶囊、展开是 16px 圆角，所以描边走 `inset` 阴影而不是
   *      `border`：antd 这里是 content-box，加 1px border 会把 40px 撑成 42px（实测）。
   *    ⛔ 别再往 `.ant-sender` 上加任何 `0 0 0 Npx` 的彩色环。
   */

  /**
   * ── 语音光环配色（2026-10-24）──────────────────────────────────────────
   *
   * `voiceActive` 已在组件顶部取好（`collapsed` 判定要用）。这里只放颜色：
   * 与 AI 助手 `app/ai-assistant/_components/chat-sender-input.tsx` **完全同源** ——
   * 通透感来自「白色高光芯 + 两侧极淡薄荷」，而不是一圈实色描边。
   */
  const voiceGlowCore = darkMode ? "rgba(255,255,255,0.94)" : "rgba(255,255,255,0.88)"
  const voiceGlowEdge = darkMode ? "rgba(110,231,183,0.58)" : "rgba(52,211,153,0.46)"
  const voiceGlowRing = darkMode ? "rgba(110,231,183,0.12)" : "rgba(16,185,129,0.09)"
  const voiceGlowHalo = darkMode ? "rgba(52,211,153,0.26)" : "rgba(16,185,129,0.18)"

  const senderImmersiveStyle = (
    <style>{`
      /* 生成中：柔光缓慢呼吸（只动 box-shadow，没有任何硬边） */
      @keyframes sender-soft-breathe {
        0%, 100% { box-shadow: 0 1px 2px rgba(24,24,27,0.04), 0 10px 26px -20px rgba(24,24,27,0.18); }
        50%      { box-shadow: 0 1px 3px rgba(24,24,27,0.07), 0 16px 36px -20px rgba(24,24,27,0.30); }
      }

      /* ── 工具栏按钮错峰上浮（展开时依次落位，而非「啪」地一起出现） ── */
      @keyframes sender-chip-in {
        from { opacity: 0; transform: translateY(5px) scale(0.94); }
        to   { opacity: 1; transform: translateY(0)   scale(1); }
      }
      /* ── 整条 footer 跟着盒子「浮出水面」（配合 JS 的高度补间，
             而不是在盒子还没长出来时就整条塞进去）── */
      @keyframes sender-footer-in {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      /* ── 形态补间：宽度也走同一条弹簧曲线 ──────────────────────────────
       *   写进 CSS 而不是内联 style，是为了能用「重复声明」做优雅降级：
       *   第二条 linear() 缓动不被支持时整条声明被丢弃 → 自动回落到上面的
       *   cubic-bezier，而不是退化成浏览器默认的 ease。 */
      .sender-morph-host {
        transition: max-width ${MORPH_MS}ms cubic-bezier(.22,1,.36,1);
        transition-timing-function: ${SPRING_LINEAR};
      }
      /* ── 补间期间摘掉毛玻璃 ────────────────────────────────────────────
       *   高度每帧变化 → backdrop-filter 每帧重采一次背景模糊，这是整段动画里
       *   唯一真正昂贵的一步（copilot 收拢动画早有同款先例）。氛围渐变本身很平滑，
       *   blur(14px) 开与不开几乎无差，肉眼看不到切换。 */
      .sender-immersive.sender-morphing {
        -webkit-backdrop-filter: none !important;
        backdrop-filter: none !important;
      }
      /* ── 🚨 补间期间必须同时关掉 textarea 自带的高度过渡 ─────────────────
       *   antd 的 .ant-input 对 height 有 ~.2s transition：翻转瞬间盒子自然高度
       *   还在爬（真机实测展开 142.4→收尾跳 135、收回 64.3→跳 40）——
       *   这才是「补间结束再矫正一下」跳变的真身。morphing 期间把它关掉，
       *   自然高度在翻转那一帧就一步到位，补间终点即真实终点，零矫正。 */
      .sender-immersive.sender-morphing textarea,
      .sender-immersive.sender-morphing .ant-sender-input {
        transition: none !important;
      }

      /* ══ 本体：透明核 + 1px 极淡描边 ═══════════════════════════════════
       *  🚨 2026-09-25 三次修订（用户：「跟他一模一样，你没发现 sender 没有背景吗」）：
       *     sender **不要任何实心底** —— 芯子完全透明，面板自己的氛围渐变直接透上来。
       *     为了不让文字糊在氛围光上，补一层 backdrop-filter 做「无底色玻璃」：
       *     它不改变亮度/色相（渐变是平滑的，模糊前后几乎一致），只压掉高频噪点。
       *
       *  🚨 2026-10-24 五次修订：那圈 4px 蓝/灰青 spread 环整圈删掉（见上方修订说明），
       *     换成「1px 极淡灰线 + 几乎不带色的轻阴影」——与主助手 .sender-immersive 同参数。
       *     折叠 全胶囊 / 展开 圆角 16，两态只切「圆角」，transition 一跑仍是形态渐变。 */
      .sender-immersive.ant-sender {
        position: relative;
        overflow: visible;
        border-radius: 999px !important;
        /* 不画 border：留 1px 实边框会把 40px 撑成 42px（实测）；
           改用 inset 阴影画这条线，几何尺寸零影响。 */
        border: none !important;
        /* ★ 没有背景：内芯全透明，极细线由下面的 inset 阴影提供 */
        background: transparent !important;
        -webkit-backdrop-filter: blur(calc(14px * var(--dc-mat-scale, 1))) saturate(1.06);
        backdrop-filter: blur(calc(14px * var(--dc-mat-scale, 1))) saturate(1.06);
        /* ① inset 0 0 0 1px = 那条近乎看不见的灰线（落在氛围底上 ≈ rgb(230,231,234)）
           ② ③ 贴地一档 + 远处一层，都不带色相，只把卡片从底面上"托起来" */
        box-shadow:
          inset 0 0 0 1px rgba(24,24,27,0.09),
          0 1px 2px rgba(24,24,27,0.04),
          0 12px 28px -20px rgba(24,24,27,0.18) !important;
        transition:
          border-radius ${MORPH_MS}ms cubic-bezier(.22,1,.36,1),
          box-shadow   ${MORPH_MS}ms cubic-bezier(.22,1,.36,1),
          background   .3s  ease;
        /* 🚨 圆角**绝不能用弹簧**：999px→16px 是「变小」，弹簧过冲会把它冲到 16 以下，
           被浏览器钳到 0 = 中途闪现直角矩形（2026-09-26 用户截图实锤）。
           所以圆角保持单调缓出；弹簧只给 box-shadow（过冲 = 阴影多弹一下，无钳位问题）。
           不支持 linear() 的浏览器整条声明被丢弃 → 自动回落上面的 cubic-bezier。 */
        transition-timing-function: cubic-bezier(.22,1,.36,1), ${SPRING_LINEAR}, ease;
      }
      /* 展开/聚焦：只收圆角；⛔ 不要再加彩色 spread 环 / 扩散脉冲（用户明确否掉） */
      .sender-immersive.ant-sender[data-collapsed="false"] {
        border-radius: 16px !important;
      }

      /* ═══ 语音持续转写：输入框外圈的主题色光环（2026-10-24）═══════════════
         与 AI 助手 app/ai-assistant/_components/chat-sender-input.tsx 同一套：
           · 底光 —— 整圈 1.2px 主题色淡光，慢呼吸（说明"在听"）
           · 扫光 —— 一道更亮的白芯弧沿边框绕圈跑（说明"在转写"）
         🚨 只有 [data-voice-active="true"] 时才存在；其余时刻这层压根不渲染。
         ⛔ 这不是 2026-09 被否掉的「外面一圈蓝色」——彩色只在语音工作的几秒里出现。 */
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
        /* 本组件不画 border，光环直接贴在外壳边界上 */
        inset: 0;
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
          inset 0 0 0 1px rgba(24,24,27,0.09),
          0 1px 2px rgba(24,24,27,0.04),
          0 12px 28px -20px rgba(24,24,27,0.18),
          0 0 26px -10px ${voiceGlowHalo} !important;
      }

      /* ── 折叠态：参考稿那条单行白胶囊 ── */
      .sender-immersive.ant-sender[data-collapsed="true"] {
        /* 40px 高：8 padding + 24 行高 + 8 padding（与参考稿 40 CSS px 一致） */
        min-height: 40px !important;
      }
      .sender-immersive.ant-sender[data-collapsed="true"] .ant-sender-content {
        padding: 0 8px 0 10px;
      }
      .sender-immersive.ant-sender[data-collapsed="true"] textarea {
        padding: 8px 0 !important;
        font-size: 15px;
        line-height: 24px;
      }
      /* 发送键浮到胶囊右端，与单行输入同一行（参考稿版式） */
      .sender-immersive.ant-sender[data-collapsed="true"] .ant-sender-footer {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        width: auto;
        height: auto;
        margin: 0;
        padding: 0;
        border: 0;
        background: transparent;
        /* 收回时发送键也不要「闪现」：从小一档浮到胶囊右端（-50% 居中必须保留，
           所以不能用 sender-footer-in，那条动画的 to 是 translateY(0)） */
        animation: sender-send-in .30s cubic-bezier(.22,1,.36,1) both;
        animation-timing-function: ${SPRING_LINEAR};
      }
      @keyframes sender-send-in {
        from { opacity: 0; transform: translateY(-50%) scale(0.88); }
        to   { opacity: 1; transform: translateY(-50%) scale(1); }
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
        padding: 0 10px !important;
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

      /* ── 发送键：31px 圆，**三态**（2026-10-24 对齐主助手）─────────────────
       *  原来这里是一刀切 #EFF1F5 浅灰底 + 淡灰箭头 —— 那是 2026-09 参考稿的静态值，
       *  被判过「永远看着不可用」：输入框里打满了字，发送键还是灰的。
       *  现在与 app/ai-assistant/_components/chat-sender-input.tsx 完全同源：
       *    :disabled     极淡底 + 淡箭头（真的不能发）
       *    :not(:disabled) 黑圆 + 白箭头（能发，一眼可辨）
       *    dark 各自一套（暗底上用浅实心才够对比）
       * ⛔ 别再合并成一条 —— 三态就是「输入框有没有内容」唯一的视觉回执。 */
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
      .sender-immersive.ant-sender .ant-sender-actions-list-presets button:disabled,
      .sender-immersive.ant-sender .ant-sender-actions-btn:disabled {
        background: rgba(24,24,27,0.06) !important;
        color: rgba(24,24,27,0.38) !important;
        cursor: default;
      }
      /* 可发送 / 生成中（停止）：黑圆 + 白箭头 */
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

      /* 生成中（loading）：环呼吸，提示「正在跑」 */
      .sender-immersive.ant-sender[data-streaming="true"] {
        animation: sender-soft-breathe 2.4s ease-in-out infinite;
      }

      /* ── 暗色版：同样**没有背景 + 没有彩环**，只有 1px 淡边与中性阴影 ── */
      .sender-immersive-dark.ant-sender {
        background: transparent !important;
        box-shadow:
          inset 0 0 0 1px rgba(255,255,255,0.11),
          0 1px 2px rgba(0,0,0,0.35),
          0 16px 36px -22px rgba(0,0,0,0.75) !important;
      }
      /* 暗色语音态：把 halo 换成暗底版（见上方 voiceGlow* 变量）
         🚨 必须单独写一条 (0,4,0)：上面那条是 (0,3,0)，会盖掉暗色本体那圈白描边。 */
      [data-voice-active="true"] .sender-immersive-dark.ant-sender {
        box-shadow:
          inset 0 0 0 1px rgba(255,255,255,0.11),
          0 1px 2px rgba(0,0,0,0.35),
          0 16px 36px -22px rgba(0,0,0,0.75),
          0 0 26px -10px ${voiceGlowHalo} !important;
      }
      .sender-immersive-dark.ant-sender textarea::placeholder {
        color: #7b7b85 !important;
      }
      /* 暗色发送键同样三态：待命淡、可发送亮（暗底上用浅实心才够对比） */
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

  /**
   * ══ 白卡皮肤（appearance="card"）══════════════════════════════════════════
   *
   * 2026-10-01 用户：「我是想要统一成最开始那个 matechat 为 0 的状态那个输入框。样式统一。」
   *
   * 即：把上面那套「透明核 + 蓝色描边环」的悬浮胶囊，换成首页欢迎卡
   * （components/ai/matechat-home.tsx 的 C 色板）那张**白玻璃圆角卡**。
   *
   * 为什么写成「叠加覆盖」而不是另起一份组件：
   *   · 功能节点（+ 附件 / 思考 / 研究 / 权限 / 通话 / 停止 / 附件预览 / Slash 建议）
   *     全部长在上面那棵树里，另起一份 = 必然分叉，下一个 bug 就修两处；
   *   · chip 的 hover 材质膜 / 启用态配色都定义在 senderImmersiveStyle 里，
   *     且选择器带 `.sender-immersive` —— 只要外壳仍挂这个类，它们照常生效。
   *
   * 特异性说明（为什么下面基本不用 !important 也能赢）：
   *   · 沉浸光感那几条 = `.sender-immersive.ant-sender[data-collapsed="false"]`
   *     → 3 个类 + 1 属性 = (0,4,0)
   *   · 本块 = `.sender-immersive.sender-card.ant-sender[data-collapsed="false"]`
   *     → 4 个类 + 1 属性 = (0,5,0)，稳压一头。
   *   · 只有沉浸光感里**显式写了 !important** 的（圆角 / 边框 / 底色 / 投影）必须用
   *     !important 对冲。代价：box-shadow 被 !important 钉死后 CSS 动画盖不上去了，
   *     所以「生成中呼吸」不再动 box-shadow，改为切描边色（见 [data-streaming]）。
   */

  return (
    <div
      ref={rootRef}
      data-sender-root=""
      /* 语音持续转写中 → 点亮输入卡外圈的主题色光环（见上面那段 CSS） */
      data-voice-active={voiceActive ? "true" : undefined}
      style={{
        width: "100%",
        padding: "var(--sender-inset-y, 16px) var(--sender-inset, 16px)",
        borderRadius: 20,
        boxShadow: dragOver ? "0 0 0 3px rgba(5,150,105,0.30)" : undefined,
        transition: "box-shadow .18s ease",
      }}
      onDragOver={(e) => {
        if (!onDropFiles) return
        if (!Array.from(e.dataTransfer?.types || []).includes("Files")) return
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={(e) => {
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
      onFocusCapture={() => {
        tabAwayRef.current = false
        setFocused(true)
      }}
      onMouseDown={() => {
        tabAwayRef.current = false
        setFocused(true)
      }}
      onKeyDown={(e) => {
        if (e.key === "Tab") tabAwayRef.current = true
      }}
      onBlurCapture={(e) => {
        if (!tabAwayRef.current) return
        tabAwayRef.current = false
        const root = e.currentTarget
        const next = e.relatedTarget as Node | null
        if (next && root.contains(next)) return
        setFocused(false)
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
        style={{
          maxWidth: collapsed ? 560 : 1120,
          margin: "0 auto",
        }}
        className="no-focus-ring sender-morph-host"
      >
        <Sender
          ref={senderRef}
          /* 附件也计入「有内容」：不然截了图没打字时发送键是灰的（见 ATTACHMENT_VALUE_PLACEHOLDER） */
          value={input || (attachments.length > 0 ? ATTACHMENT_VALUE_PLACEHOLDER : "")}
          onChange={(nextVal) => {
            const next =
              !input && nextVal.startsWith(ATTACHMENT_VALUE_PLACEHOLDER)
                ? nextVal.slice(ATTACHMENT_VALUE_PLACEHOLDER.length)
                : nextVal
            setInput(next)
          }}
          onSubmit={(text) => {
            if (!text.trim() && attachments.length === 0) return
            onSend(text)
          }}
          onCancel={onCancel}
          loading={isLoading}
          header={
            attachments.length > 0 ? (
              <AttachmentChips
                items={attachments.map((a, i) => ({
                  index: i,
                  name: a.name,
                  dataUrl: a.dataUrl || "",
                  format: a.format || "",
                  status: a.status,
                  error: a.error,
                }))}
                onRemove={onRemoveAttachment}
                darkMode={darkMode}
              />
            ) : undefined
          }
          placeholder={collapsed ? "请告诉我您遇到的问题" : "输入 / 获取建议，或发送消息开始对话"}
          suffix={false}
          autoSize={{ minRows: collapsed ? 1 : 2, maxRows: 6 }}
          onPaste={onPaste as any}
          className={`sender-immersive${darkMode ? " sender-immersive-dark" : ""}`}
          data-collapsed={collapsed ? "true" : "false"}
          data-streaming={isLoading ? "true" : undefined}
          classNames={{ input: "!shadow-none !outline-none" }}
          footer={(actionNode) =>
            collapsed ? (
              /* 折叠态：只留发送键，浮到胶囊右端 */
              <Flex justify="flex-end" align="center">{actionNode}</Flex>
            ) : (
              <Flex justify="space-between" align="center" style={{ position: "relative", flexWrap: "nowrap" }}>
                {/* 左簇：＋ 加素材 ｜ 截图 ｜ 权限（三段，各管一摊） */}
                <Flex gap={2} align="center" style={{ minWidth: 0, flexWrap: "nowrap", overflow: "hidden" }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <button
                      ref={plusPop.btnRef}
                      onClick={() => {
                        if (plusMenuOpen) {
                          setPlusMenuOpen(false)
                          plusPop.close()
                          return
                        }
                        plusPop.open(260, -4)
                        setPlusMenuOpen(true)
                      }}
                      onBlur={() =>
                        setTimeout(() => {
                          setPlusMenuOpen(false)
                          plusPop.close()
                        }, 200)
                      }
                      title="更多选项"
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

                    {/* ＋ 面板 —— 必须 portal 到 body：祖先链两层 overflow:hidden + 沉浸材质的
                        包含块效应，就地渲染必被裁（用户实测「点 + 就被截断」）。 */}
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

                        <div style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "8px 12px", marginTop: 2,
                        }}>
                          <span style={{ fontSize: 13.5, fontWeight: 500, color: darkMode ? "#d4d4d8" : "#3F3F46" }}>
                            联网搜索
                          </span>
                          <button
                            onClick={() => setEnableSearch(!enableSearch)}
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
                      </div>,
                      document.body,
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.docx,.xlsx,.pptx,.md,.markdown,.txt,.log,.csv,.tsv,.json,.html,.htm"
                      onChange={(e) => {
                        onSelectFiles(e)
                        setPlusMenuOpen(false)
                      }}
                      className="hidden"
                    />
                  </div>

                  {/* 截图入口（调用方传入；纯图标钮，与「＋」并排成「加东西」两兄弟） */}
                  {screenshotSlot}

                  {/* 权限模式 — 向上弹出面板（只有盾牌 + 箭头，悬停给当前档位名） */}
                  {setApprovalMode && (
                    <div style={{ position: "relative", marginLeft: 6 }}>
                      <button
                        ref={approvalPop.btnRef}
                        onClick={() => {
                          if (approvalPanelOpen) {
                            setApprovalPanelOpen(false)
                            approvalPop.close()
                            return
                          }
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
                        <IconDown size={12} style={{ transition: "transform 0.2s", transform: approvalPanelOpen ? "rotate(180deg)" : "none" }} />
                      </button>

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
                </Flex>

                {/* 右簇：语音通话 + 语音输入 + 发送键
                    🚨 2026-10-24：语音输入从「＋」那一簇挪到这里、紧挨发送键 ——
                    与 AI 助手（app/ai-assistant/_components/chat-sender-input.tsx）同版式：
                    「说话」和「打字」是同一个动作的两种输入，手指不该横跨整条工具条。 */}
                <Flex align="center" gap={10} style={{ flexShrink: 0 }}>
                  {voiceSlot}
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
            )
          }
        />
      </div>
    </div>
  )
}
