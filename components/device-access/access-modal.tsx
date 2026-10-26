"use client"

/**
 * 设备接入弹窗外壳（AccessModal）
 *
 * 【为什么是居中弹窗】设备管理的次级流程（配连接、接设备、看详情）是「设备管理弹窗」的下一层，
 * 必须与主弹窗同一种形态（居中 Modal）——用户明确否决过右侧抽屉（2026-10-21）。
 * 长表单靠：
 *   · 内容区滚动（唯一滚动容器，footer 不进滚动区），
 *   · 高度上限 min(78vh, 760px)，不撑破视口也不再套内层滚动条。
 *
 * 【圆角唯一源】= ACCESS_RADIUS：
 *   panel 20（弹窗容器）/ card 16（卡片、可选项瓦片）/ control 8（输入框、按钮、导航项、图标底座）/ chip 999（胶囊）
 * 🚨 三级是「外 > 内」的同心关系（20 > 16 > 8），新增元素只能落在这三档，别再出现 6 / 10 / 12。
 */

import type { CSSProperties, ReactNode } from "react"
import { useState } from "react"
import { useTheme } from "next-themes"
import { ConfigProvider, Modal, theme as antdTheme } from "antd"
import { IconArrowDown, IconClose } from "@/components/icon"
import { SettingsModalStyle } from "@/components/settings/settings-modal-ui"

/** 圆角三档（唯一源）；数字单位 px */
export const ACCESS_RADIUS = {
  /** 弹窗容器 */
  panel: 20,
  /** 卡片、可选项瓦片、分组容器 */
  card: 16,
  /** 输入框、按钮、导航项、图标底座 */
  control: 8,
  /** 胶囊标签 */
  chip: 999,
} as const

/** 设备接入族界面的主题作用域类名（CSS 变量 --set-* 只在这个类下生效） */
export const ACCESS_SCOPE = "device-access-scope"

/**
 * 设备接入自有变量（--acc-*）：只在 --set-* 不够用时才加，避免污染设置弹窗的共享 token。
 * 🚨 亮/暗两套必须成对写，缺一套就会出现「暗色下白底」。
 */
export const ACCESS_LOCAL_CSS = `
.device-access-scope, .device-manager-scope {
  --set-card-radius: 16px;
  --acc-tile-active-bg: #ECFDF5;
  --acc-code-bg: #18181B;
  --acc-code-text: #D4D4D8;
  --acc-ai-ring: rgba(5, 150, 105, .62);
  --acc-ai-halo: rgba(5, 150, 105, .26);
}
.device-access-scope[data-settings-theme="dark"], .device-manager-scope[data-settings-theme="dark"] {
  --acc-tile-active-bg: rgba(5, 150, 105, .16);
  --acc-code-bg: #111113;
  --acc-code-text: #D4D4D8;
  --acc-ai-ring: rgba(52, 211, 153, .72);
  --acc-ai-halo: rgba(52, 211, 153, .34);
}

/* ===== AI 预填字段「框外光圈」=====
   用户要求（2026-10-21）：「ai 修改的焦点输入框外做光圈」。
   · 画在**控件外侧**：wrapper 只做定位，光环用 ::after 的 inset:-3px 向外扩一圈，
     所以永远不吃控件的 border / 不影响布局（绝对定位 + pointer-events:none）。
   · 生命周期内置：5.2s 单次播放（呼吸两下 → 淡出），播完 opacity 归 0 自动消失，
     不需要 JS 定时器，也不会因为父组件重渲染而重启（className 不变 = 不重挂）。
   · 变量走 --acc-ai-*，亮/暗两套成对定义在上面的 scope 里。 */
@keyframes accAiRingPulse {
  0%   { opacity: 0; }
  9%   { opacity: 1; }
  38%  { opacity: .34; }
  66%  { opacity: 1; }
  88%  { opacity: .5; }
  100% { opacity: 0; }
}
.acc-ai-fill { --acc-ai-r: 8px; position: relative; display: block; border-radius: var(--acc-ai-r); }
.acc-ai-fill--inline { display: inline-block; }
.acc-ai-fill--card { --acc-ai-r: 16px; }
.acc-ai-fill::after {
  content: "";
  position: absolute;
  inset: -3px;
  border-radius: calc(var(--acc-ai-r) + 3px);
  pointer-events: none;
  box-shadow: 0 0 0 1.5px var(--acc-ai-ring), 0 0 16px 3px var(--acc-ai-halo);
  animation: accAiRingPulse 5.2s cubic-bezier(.4, 0, .2, 1) both;
}
@media (prefers-reduced-motion: reduce) {
  .acc-ai-fill::after { animation-duration: .01s; }
}
`

/** antd 组件的 token（主色 + 圆角），所有设备接入界面共用，避免各面板各写一套 */
export function AccessThemeProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: "#059669",
          borderRadius: ACCESS_RADIUS.control,
          borderRadiusLG: ACCESS_RADIUS.card,
          borderRadiusSM: 6,
        },
      }}
    >
      {children}
    </ConfigProvider>
  )
}

export interface AccessModalProps {
  open: boolean
  onClose: () => void
  /** 弹窗标题（左侧图标 + 文字请在调用点拼好） */
  title: ReactNode
  /** 标题下的一行说明 */
  subtitle?: ReactNode
  /** 标题行下方、内容区上方的固定条（如向导步骤条），不随内容滚动 */
  top?: ReactNode
  /** 标题行右侧的附加操作（如状态标签） */
  extra?: ReactNode
  /** 底部固定操作栏；不传则不占位 */
  footer?: ReactNode
  /** 弹窗宽度（px，窄屏自动收敛到 94vw） */
  width?: number
  /** 叠在主弹窗之上时的层级 */
  zIndex?: number
  children: ReactNode
}

export function AccessModal({
  open,
  onClose,
  title,
  subtitle,
  top,
  extra,
  footer,
  width = 580,
  zIndex = 1100,
  children,
}: AccessModalProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const containerStyle: CSSProperties = {
    padding: 0,
    background: isDark ? "#18181B" : "#FAFAFA",
    borderRadius: ACCESS_RADIUS.panel,
    overflow: "hidden",
    boxShadow: isDark ? "0 12px 40px rgba(0,0,0,.55)" : "0 12px 40px rgba(0,0,0,.16)",
  }

  return (
    <Modal
      open={open}
      footer={null}
      closable={false}
      centered
      destroyOnHidden
      mask={{ closable: false }}
      /**
       * 🚨 必须关 focus trap（2026-10-21 用户实锤：「弹窗开着时 sender 点一下就收起 / 要点很多下」）。
       * antd v6 Modal 默认 `focusable.trap=true`（`@rc-component/util` 的 `useLockFocus`）：
       * 弹窗开着时它监听全局 focusin，只要焦点离开弹窗就**强行拽回**弹窗内
       * （实测拽回「关闭」钮 → textarea 拿到焦点 2ms 内被抢走）。
       * 而设备接入弹窗的设计就是「弹窗 × Copilot 并用」（Copilot 辅助填表单），
       * Copilot 输入框在弹窗之外 ⇒ trap 一开必打架，输入框永远抢不过弹窗。
       * 关掉 trap 只是放开 Tab 焦点串圈，弹窗自身的交互/关闭逻辑零变化。
       */
      focusable={{ trap: false }}
      width={`min(${width}px, 94vw)`}
      zIndex={zIndex}
      rootClassName="device-access-modal"
      styles={{ body: { padding: 0 }, container: containerStyle }}
    >
      <SettingsModalStyle modalClass="device-access-modal" scopeClass={ACCESS_SCOPE} />
      <style>{ACCESS_LOCAL_CSS}</style>
      <AccessThemeProvider>
        <div
          className={ACCESS_SCOPE}
          data-settings-theme={isDark ? "dark" : "light"}
          style={{
            display: "flex",
            flexDirection: "column",
            /* 上限而不是固定高度：内容短时弹窗自然收紧，长表单才滚动 */
            maxHeight: "min(78vh, 760px)",
            background: "var(--set-bg)",
          }}
        >
          {/* 标题行：固定，不随内容滚动 */}
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "16px 18px 14px 20px",
              borderBottom: "1px solid var(--set-border)",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--set-text)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 0,
                }}
              >
                {title}
              </div>
              {subtitle && (
                <div style={{ fontSize: 12, color: "var(--set-text-secondary)", marginTop: 3, lineHeight: "18px" }}>
                  {subtitle}
                </div>
              )}
            </div>
            {extra}
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭"
              style={{
                width: 28,
                height: 28,
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                borderRadius: ACCESS_RADIUS.control,
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

          {top && (
            <div style={{ flexShrink: 0, padding: "14px 20px 2px" }}>{top}</div>
          )}

          {/* 内容区：唯一滚动容器 */}
          <div
            data-lenis-prevent
            style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 20px 20px" }}
          >
            {children}
          </div>

          {/* 操作栏：固定底部，绝不放进滚动内容里 */}
          {footer && (
            <div
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 8,
                padding: "12px 20px",
                borderTop: "1px solid var(--set-border)",
                background: "var(--set-bg)",
              }}
            >
              {footer}
            </div>
          )}
        </div>
      </AccessThemeProvider>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* 版式原子（三个面板共用，避免各写一套圆角/间距）                        */
/* ------------------------------------------------------------------ */

/**
 * AI 预填光圈（唯一源）—— 2026-10-21 用户要求「ai 修改的焦点输入框外做光圈」。
 *
 * 用法：把 antd 控件（或一张属性卡）包起来即可，`on` 由「这个值是不是 Copilot 填的」决定。
 * · 光圈画在**外侧**（::after inset:-3px），不改控件自身 border / 不吃布局 / 不拦点击；
 * · 5.2s 呼吸 + 淡出，纯 CSS，无定时器、无额外 state；
 * · `inline`：Switch 这类行内控件用，否则 wrapper 撑满整行、光圈横铺一条；
 * · `tone="card"`：包整卡（属性行等）时把圆角跟到 16，保持同心关系。
 */
export function AiGlow({
  on,
  inline,
  tone = "control",
  children,
}: {
  on?: boolean
  inline?: boolean
  tone?: "control" | "card"
  children: ReactNode
}) {
  if (!on) return <>{children}</>
  const cls = ["acc-ai-fill", inline ? "acc-ai-fill--inline" : "", tone === "card" ? "acc-ai-fill--card" : ""]
    .filter(Boolean)
    .join(" ")
  return <span className={cls}>{children}</span>
}

/** 分组小标题；extra 放右侧的次要操作 */
export function SectionLabel({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        margin: "18px 0 8px",
        fontSize: 12.5,
        color: "var(--set-text-secondary)",
        lineHeight: "18px",
      }}
    >
      <span>{children}</span>
      {extra}
    </div>
  )
}

/**
 * 折叠块：把「不改也能跑」的参数收起来，让首屏只留必填项。
 * 刻意不用 antd Collapse —— 它的圆角/内边距自成一套，会破坏 20/16/8 的同心关系。
 */
export function Collapsible({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: ReactNode
  /** 收起状态下右侧的补充说明（如「3 项」） */
  hint?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div
      style={{
        border: "1px solid var(--set-card-border)",
        borderRadius: ACCESS_RADIUS.card,
        background: "var(--set-card-bg)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 14px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 13,
          color: "var(--set-text)",
        }}
      >
        <span style={{ flex: 1, textAlign: "left" }}>{title}</span>
        {hint && <span style={{ fontSize: 11.5, color: "var(--set-text-tertiary)" }}>{hint}</span>}
        <span
          style={{
            display: "inline-flex",
            color: "var(--set-text-secondary)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .18s ease",
          }}
        >
          <IconArrowDown size={14} />
        </span>
      </button>
      {open && (
        <div style={{ padding: "4px 14px 14px", borderTop: "1px solid var(--set-row-border)" }}>{children}</div>
      )}
    </div>
  )
}

/** 协议/模板这类可选瓦片：横向紧凑，选中只换描边+淡底，不做整块高亮 */
export function Tile({
  active,
  onClick,
  icon,
  label,
  desc,
}: {
  active: boolean
  onClick: () => void
  icon?: ReactNode
  label: ReactNode
  desc?: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 3,
        padding: "10px 12px",
        minWidth: 0,
        borderRadius: ACCESS_RADIUS.card,
        border: `1px solid ${active ? "#059669" : "var(--set-card-border)"}`,
        background: active ? "var(--acc-tile-active-bg)" : "var(--set-card-bg)",
        color: active ? "#059669" : "var(--set-text-body)",
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left",
        transition: "border-color .12s ease, background .12s ease",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>
        {icon}
        {label}
      </span>
      {desc && (
        <span
          style={{
            fontSize: 11,
            lineHeight: "15px",
            color: "var(--set-text-secondary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "100%",
          }}
        >
          {desc}
        </span>
      )}
    </button>
  )
}
