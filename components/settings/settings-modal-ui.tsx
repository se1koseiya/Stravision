"use client";

/**
 * 设置类弹窗版式原子（AI 设置弹窗 / 设备管理弹窗共用）
 *
 * 🚨 2026-09-21 抽取自 components/ai-settings-dialog.tsx（零视觉变更的纯搬迁）。
 * 抽出的目的：设备管理弹窗要求「UI 设计与 AI 助手的设置一模一样」，
 * 共用同一套原子（Row / Card / GroupTitle / GreenSwitch / Dropdown）
 * 与同一个 CSS 变量作用域区块，避免两份实现日后漂移。
 *
 * 主题机制（与设置弹窗一致）：根节点挂 `.{scopeClass}` + `data-settings-theme`，
 * 亮/暗两套 token 全在 CSS 变量里，深层子面板无需感知主题。
 */

import { Select, Switch } from "antd";

/* ------------------------------------------------------------------ */
/* 主题作用域样式                                                       */
/* ------------------------------------------------------------------ */

/**
 * 🚨 窗口圆角必须作用在 `.ant-modal-container`（antd v6 视觉层）这一层，
 * 同时把外层 `.ant-modal`（定位层，默认带白底+阴影）清成透明，
 * 否则白底会从圆角外漏出一圈，看起来像「多包了一层容器」。
 */
export function SettingsModalStyle({
  modalClass,
  scopeClass,
}: {
  /** Modal 的 rootClassName，例如 "ai-settings-modal" */
  modalClass: string;
  /** 作用域类名，例如 "ai-settings-scope" */
  scopeClass: string;
}) {
  return (
    <style>{`
      /* 外层 .ant-modal 只做定位容器：去底去影去圆角，视觉全部交给 container。 */
      .ant-modal.${modalClass} { background: transparent; box-shadow: none; border-radius: 0; padding: 0; }
      /* ── 设置弹窗主题作用域（2026-09-20 深色适配）──
         全部内联颜色走 CSS 变量，根节点 data-settings-theme 切换亮/暗两套 token，
         深层子面板（Row/Card/GroupTitle/各 Panel）无需感知主题。 */
      .${scopeClass} {
        --set-bg: #FAFAFA;
        --set-sidebar-bg: #F7F7F8;
        --set-border: #EDEEEF;
        --set-row-border: #F4F4F5;
        --set-card-bg: #FFFFFF;
        --set-card-border: #EDEEEF;
        --set-subcard-bg: #FAFAFA;
        --set-subcard-border: #F0F0F1;
        --set-text: #18181B;
        --set-text-body: #52525B;
        --set-text-secondary: #8F959E;
        --set-text-tertiary: #A8ADB4;
        --set-accent-border: #D6E4FF;
        --set-nav-active-bg: #EFEFF0;
        --set-nav-hover-bg: #F0F0F1;
        --set-nav-text: #52525B;
        --set-chip-bg: #F4F4F5;
        --set-chip-text: #52525B;
        --set-hover-fill: #EFEFF0;
        --set-plus: #C4C7CC;
      }
      .${scopeClass}[data-settings-theme="dark"] {
        --set-bg: #18181B;
        --set-sidebar-bg: #1D1D21;
        --set-border: #2A2A30;
        --set-row-border: #26262B;
        --set-card-bg: #1F1F24;
        --set-card-border: #2E2E34;
        --set-subcard-bg: #26262B;
        --set-subcard-border: #2E2E34;
        --set-text: #E4E4E7;
        --set-text-body: #A1A1AA;
        --set-text-secondary: #9CA0A8;
        --set-text-tertiary: #6E7278;
        --set-accent-border: rgba(5, 150, 105, .35);
        --set-nav-active-bg: #2E2E34;
        --set-nav-hover-bg: #26262B;
        --set-nav-text: #A1A1AA;
        --set-chip-bg: #2E2E34;
        --set-chip-text: #A1A1AA;
        --set-hover-fill: #2E2E34;
        --set-plus: #5A5E66;
      }
    `}</style>
  );
}

/* ------------------------------------------------------------------ */
/* 版式原子                                                             */
/* ------------------------------------------------------------------ */

/** 卡片内一行：左标题+描述，右控件 */
export function Row({
  title,
  desc,
  children,
  vertical = false,
  last = false,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
  vertical?: boolean;
  last?: boolean;
}) {
  const border = last ? {} : { borderBottom: "1px solid var(--set-row-border)" };
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
    );
  }
  return (
    <div
      /* set-row / set-row-ctrl：窄屏（手机）下设置弹窗把行改成纵向堆叠用，
         见 components/ai-settings-dialog.tsx 的 SETTINGS_NARROW_CSS。类名只加不加样式。 */
      className="set-row"
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
      <div className="set-row-ctrl" style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        {children}
      </div>
    </div>
  );
}

/**
 * 白色圆角卡片容器（深色模式自动切换为暗卡片）
 *
 * 🚨 圆角走 `--set-card-radius`（缺省 10px = AI 设置弹窗原样）。
 * 设备接入族界面（设备管理抽屉 / 接入抽屉）在外层把该变量设为 16，
 * 与面板 20 形成同心关系；改这一处即改那一族界面的所有卡片。
 */
export function Card({ children }: { children: React.ReactNode }) {
  return (
    /* set-card：只加类不加样式（与 .set-row 同一条约定）。玻璃化后的设置弹窗
       （.ai-set-glass）靠它给实色卡片补一层极轻的投影 —— 纯白卡压在磨砂玻璃上，
       若没有投影，边界只剩一条 1px 线，读起来像"贴纸"而不是"浮起的卡"。 */
    <div className="set-card" style={{ background: "var(--set-card-bg)", border: "1px solid var(--set-card-border)", borderRadius: "var(--set-card-radius, 10px)", overflow: "hidden" }}>
      {children}
    </div>
  );
}

/** 分组小标题（灰小字） */
export function GroupTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, color: "var(--set-text-secondary)", margin: "4px 0 10px", lineHeight: "20px" }}>{children}</div>
  );
}

/** 绿色胶囊开关 */
export function GreenSwitch(props: React.ComponentProps<typeof Switch>) {
  return (
    <Switch
      {...props}
      style={{ backgroundColor: props.checked ? "#12B76A" : undefined, ...(props.style || {}) }}
    />
  );
}

/** 统一下拉宽度 */
export function Dropdown(props: React.ComponentProps<typeof Select>) {
  return <Select {...props} style={{ minWidth: 132, ...(props.style || {}) }} />;
}
