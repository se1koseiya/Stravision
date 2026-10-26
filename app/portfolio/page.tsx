"use client"

/**
 * 作品集 · 莓界 Berry Realm 设计档案 —— 路由 /portfolio
 *
 * ── 这一版的视觉语言：瑞士网格 · 工程档案 ──────────────────────
 *   参考 Vercel（shadow-as-border / 三个字重 / 无彩色装饰）与
 *   IBM Carbon（0 圆角 / 无阴影 / 背景色分层 / 8px 网格 / 单一强调色）：
 *     · 圆角一律 0；只有标签是 24px 胶囊（Carbon 的唯一例外）
 *     · 不用任何 box-shadow，层级靠底色分层（白 → #F4F4F4 → #E8E8E8）
 *     · 1px 发丝线承担全部分割，正文与元信息分栏对齐成同一根竖轴
 *     · 大字用 400 字重 + 负字距，靠「字号 + 颜色」而不是「粗细」立层级
 *     · 编号 / 标签 / 元信息用等宽体大写
 *   一句话：这份档案本身是印刷品，所以它不带圆角 —— 圆角是产品控件的
 *   语言，只在产品界面里出现（见附录 A）。
 *
 * ── 内容原则（用户明确提的）────────────────────────────────────
 *   每一条决策都必须回答四件事，缺一不可：
 *     场景（用户当时在做什么）→ 问题（他卡在哪）→ 决策（我改了什么）
 *     → 理由（为什么这么做）
 *   不写「赋能 / 协同 / 闭环」这类空词；不编造用户原话与数据。
 *   所有「原来怎么样」都能从产品真实信息架构与截图里推出来。
 *
 * ── 事实来源（不编造）─────────────────────────────────────────
 *   截图 = public/portfolio 下 28 张真实产品截图（用户提供）；
 *   六个一级入口 = components/page-navigation.tsx 逐字；
 *   五个工作台欢迎词 = components/ai/copilot/page-configs.ts 逐字；
 *   工具名 = toggle_relay / automation_canvas_apply（真实工具）；
 *   字阶 / 圆角 / 间距 / 材质档位 / 语义色 = 项目 token。
 *
 * ── 截图友好三条硬约束 ────────────────────────────────────────
 *   ① 全页静态完整：无 IntersectionObserver 淡入、无数字滚动、无动画
 *   ② 禁 position:fixed 装饰控件（主题切换放在封面页脚的文字流里）
 *   ③ 封面即完整一屏，方便单独截首屏
 *
 * ── 与项目一致 ───────────────────────────────────────────────
 *   色 = 晨雾松 emerald × zinc（亮 #059669 / 暗 #34D399）；
 *   字 = 正文继承 HarmonyOS Sans；图标 = @/components/icon（唯一源）。
 */

import { useEffect, useState, type ReactNode } from "react"
import { useTheme } from "next-themes"

import { useDesktopHeaderHost } from "@/components/desktop/desktop-window-chrome"
import {
  IconChartHistogram,
  IconCloudy,
  IconComment,
  IconMagic,
  IconSettingTwo,
  IconThunderbolt,
} from "@/components/icon"

/* ═══════════════════════════════════════════════════════════════
   样式表（⚠️ 模板串内不得出现任何反引号）
   ═══════════════════════════════════════════════════════════════ */
const PG_CSS = `
/* ── token：亮色 ─────────────────────────────────────────────── */
.pg {
  --pg-bg: #FFFFFF;
  --pg-sunk: #F4F4F4;
  --pg-sunk-2: #E8E8E8;
  --pg-fg: #161616;
  --pg-fg-2: #525252;
  --pg-fg-3: #8D8D8D;
  --pg-line: #C6C6C6;
  --pg-line-2: #E0E0E0;
  --pg-brand: #059669;
  --pg-brand-sunk: rgba(5, 150, 105, .10);
  --pg-inv-bg: #161616;
  --pg-inv-fg: #F4F4F4;
  --pg-inv-fg-2: #A4A4A4;
  --pg-inv-line: #393939;
  --pg-col: 132px;
  --pg-gap: 32px;
  --pg-mono: ui-monospace, SFMono-Regular, "Cascadia Mono", Consolas,
    "Liberation Mono", Menlo, monospace;
  font-family: var(--font-ui);
  font-size: 16px;
  color: var(--pg-fg);
  background: var(--pg-bg);
  font-variant-numeric: tabular-nums;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
/* ── token：暗色 ─────────────────────────────────────────────── */
.dark .pg {
  --pg-bg: #0A0D0B;
  --pg-sunk: #121714;
  --pg-sunk-2: #1B221E;
  --pg-fg: #F2F5F3;
  --pg-fg-2: #A8B2AC;
  --pg-fg-3: #6F7A74;
  --pg-line: #2E3733;
  --pg-line-2: #1F2724;
  --pg-brand: #34D399;
  --pg-brand-sunk: rgba(52, 211, 153, .13);
  --pg-inv-bg: #F2F5F3;
  --pg-inv-fg: #0A0D0B;
  --pg-inv-fg-2: #5C665F;
  --pg-inv-line: #CFD6D1;
}

/* ── 骨架 ────────────────────────────────────────────────────── */
.pg-band { background: var(--pg-bg); }
.pg-band--sunk { background: var(--pg-sunk); }
.pg-band--inv { background: var(--pg-inv-bg); color: var(--pg-inv-fg); }
.pg-band + .pg-band { border-top: 1px solid var(--pg-line); }
.pg-wrap {
  margin: 0 auto; width: 100%; max-width: 1400px;
  padding: 0 clamp(20px, 3.4vw, 52px);
}

/* ── 排印 ────────────────────────────────────────────────────── */
.pg-d1 { font-size: clamp(38px, 5.4vw, 74px); font-weight: 400; line-height: 1.1; letter-spacing: -.02em; }
.pg-d2 { font-size: clamp(22px, 2.5vw, 34px); font-weight: 400; line-height: 1.3; letter-spacing: -.014em; }
.pg-h3 { font-size: 17px; font-weight: 500; line-height: 1.5; letter-spacing: -.006em; }
.pg-bd { font-size: 15.5px; line-height: 1.82; color: var(--pg-fg-2); }
.pg-bd b { color: var(--pg-fg); font-weight: 600; }
.pg-sm { font-size: 13px; line-height: 1.7; color: var(--pg-fg-3); }
.pg-mono {
  font-family: var(--pg-mono); font-size: 11px; font-weight: 500;
  letter-spacing: .16em; text-transform: uppercase;
}

/* ── 标签（全站唯一带圆角的东西，24px 胶囊）──────────────────── */
.pg-tag {
  display: inline-flex; align-items: center; height: 20px; padding: 0 9px;
  border-radius: 24px; white-space: nowrap;
  background: var(--pg-brand-sunk); color: var(--pg-brand);
  font-family: var(--pg-mono); font-size: 10px; font-weight: 500;
  letter-spacing: .08em; text-transform: uppercase;
}
.pg-tag--gray { background: var(--pg-sunk); color: var(--pg-fg-2); }
.dark .pg-tag--gray { background: var(--pg-sunk-2); }
.pg-tag--inv { background: rgba(255, 255, 255, .12); color: var(--pg-inv-fg); }
.dark .pg-tag--inv { background: var(--pg-sunk-2); color: var(--pg-inv-fg-2); }

/* ═══════════════ 封面：杂志式（全幅实拍 + 纸底标题带）═══════════ */
.pgc { display: flex; flex-direction: column; min-height: 100vh; background: var(--pg-bg); }
.pgc-plate {
  position: relative; height: 52vh; min-height: 300px;
  overflow: hidden; background: var(--pg-sunk);
  border-bottom: 1px solid var(--pg-line);
}
.pgc-plate img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: 54% 46%; }
.pgc-words { flex: 1; display: flex; flex-direction: column; }
.pgc-mast {
  display: flex; align-items: baseline; justify-content: space-between; gap: 20px;
  padding: 20px 0 12px; border-bottom: 1px solid var(--pg-line);
}
.pgc-mast-l { font-size: 13px; font-weight: 600; letter-spacing: .2em; }
.pgc-mast-l i {
  font-style: normal; margin-left: 10px; font-family: var(--pg-mono);
  font-size: 10.5px; font-weight: 500; letter-spacing: .12em;
  color: var(--pg-fg-3); text-transform: uppercase;
}
.pgc-mast-r {
  font-family: var(--pg-mono); font-size: 10.5px; font-weight: 500;
  letter-spacing: .14em; text-transform: uppercase; color: var(--pg-fg-3);
  text-align: right;
}
.pgc-main {
  flex: 1; display: grid; align-items: start;
  grid-template-columns: minmax(0, 1fr) minmax(0, 400px);
  gap: var(--pg-gap); padding: 34px 0 30px;
}
.pgc-h1 { margin: 0; font-size: clamp(48px, 8.6vw, 116px); font-weight: 400; line-height: .96; letter-spacing: -.035em; }
.pgc-sub {
  margin-top: 18px; font-family: var(--pg-mono); font-size: 11.5px; font-weight: 500;
  letter-spacing: .14em; text-transform: uppercase; color: var(--pg-fg-2);
}
.pgc-lede { margin: 20px 0 0; max-width: 46ch; font-size: 15.5px; line-height: 1.82; color: var(--pg-fg-2); }
.pgc-lede b { color: var(--pg-fg); font-weight: 600; }
.pgc-lines { margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--pg-line); }
.pgc-lines li { display: flex; gap: 14px; padding: 11px 0; border-bottom: 1px solid var(--pg-line-2); }
.pgc-lines i {
  flex: 0 0 auto; font-style: normal; font-family: var(--pg-mono);
  font-size: 10.5px; font-weight: 500; letter-spacing: .1em;
  color: var(--pg-brand); padding-top: 3px;
}
.pgc-lines span { font-size: 13.5px; line-height: 1.6; color: var(--pg-fg-2); }
.pgc-foot {
  display: flex; align-items: center; justify-content: space-between; gap: 20px;
  padding: 14px 0 22px; border-top: 1px solid var(--pg-line);
}
.pgc-foot-k { font-family: var(--pg-mono); font-size: 10.5px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: var(--pg-fg-3); }
.pg-tg { display: inline-flex; gap: 2px; }
.pg-tg button {
  cursor: pointer; padding: 5px 13px; border: 1px solid var(--pg-line);
  background: transparent; color: var(--pg-fg-2);
  font-family: var(--pg-mono); font-size: 10.5px; font-weight: 500;
  letter-spacing: .12em; text-transform: uppercase;
}
.pg-tg button + button { border-left: 0; }
.pg-tg button[data-on="1"] { background: var(--pg-fg); border-color: var(--pg-fg); color: var(--pg-bg); }

/* ── 章头 ────────────────────────────────────────────────────── */
.pgh {
  display: grid; grid-template-columns: var(--pg-col) minmax(0, 1fr);
  gap: var(--pg-gap); align-items: start;
  padding: 62px 0 30px; border-bottom: 1px solid var(--pg-line);
}
.pgh-k { padding-top: 6px; color: var(--pg-fg-3); }
.pgh-t { font-size: clamp(25px, 3vw, 42px); font-weight: 400; line-height: 1.17; letter-spacing: -.018em; margin: 0; }
.pgh-d { margin: 16px 0 0; max-width: 68ch; font-size: 15.5px; line-height: 1.82; color: var(--pg-fg-2); }
.pgh-d b { color: var(--pg-fg); font-weight: 600; }

/* ── 元信息条（封面正下方）───────────────────────────────────── */
.pgmeta { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1px solid var(--pg-line); }
.pgmeta-c { padding: 24px 26px 26px 0; }
.pgmeta-c + .pgmeta-c { padding-left: 26px; border-left: 1px solid var(--pg-line-2); }
.pgmeta-k { color: var(--pg-fg-3); }
.pgmeta-v { margin-top: 10px; font-size: 14px; line-height: 1.7; color: var(--pg-fg-2); }
.pgmeta-v b { color: var(--pg-fg); font-weight: 600; }

/* ── 目录 ────────────────────────────────────────────────────── */
.pgtoc { border-top: 1px solid var(--pg-line); }
.pgtoc-i {
  display: grid; grid-template-columns: 76px minmax(0, 1fr) minmax(0, 280px);
  gap: var(--pg-gap); align-items: baseline;
  padding: 14px 0; border-bottom: 1px solid var(--pg-line-2);
}
.pgtoc-no { font-family: var(--pg-mono); font-size: 11.5px; font-weight: 500; letter-spacing: .1em; color: var(--pg-brand); }
.pgtoc-t { font-size: 15.5px; line-height: 1.5; }
.pgtoc-x { font-size: 12.5px; line-height: 1.6; color: var(--pg-fg-3); text-align: right; }

/* ── 决策记录 ────────────────────────────────────────────────── */
.pgr { border-top: 1px solid var(--pg-line); padding-bottom: 62px; }
.pgr:first-of-type { border-top: 0; }
.pgr-h {
  display: grid; grid-template-columns: var(--pg-col) minmax(0, 1fr) minmax(0, 220px);
  gap: var(--pg-gap); align-items: baseline; padding: 30px 0 22px;
}
.pgr-no { font-family: var(--pg-mono); font-size: 13px; font-weight: 500; letter-spacing: .08em; color: var(--pg-brand); }
.pgr-t { margin: 0; font-size: clamp(20px, 2vw, 28px); font-weight: 400; line-height: 1.3; letter-spacing: -.012em; }
.pgr-tags { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
.pgr-row {
  display: grid; grid-template-columns: var(--pg-col) minmax(0, 1fr);
  gap: var(--pg-gap); padding: 15px 0; border-top: 1px solid var(--pg-line-2);
}
.pgr-k { padding-top: 4px; color: var(--pg-fg-3); }
.pgr-v { max-width: 66ch; font-size: 15.5px; line-height: 1.82; color: var(--pg-fg-2); }
.pgr-v b { color: var(--pg-fg); font-weight: 600; }
.pgr-v em { font-style: normal; font-family: var(--pg-mono); font-size: 13px; color: var(--pg-fg); }
.pgr-figs { padding-left: calc(var(--pg-col) + var(--pg-gap)); display: grid; gap: 26px; margin-top: 30px; }
.pgr-fig { border: 1px solid var(--pg-line); background: var(--pg-bg); }
.pgr-fig img { display: block; width: 100%; height: auto; }
.pgr-fig figcaption {
  display: flex; gap: 10px; align-items: baseline;
  margin-top: 10px; font-size: 12.5px; line-height: 1.6; color: var(--pg-fg-3);
}
.pgr-fig figcaption i {
  font-style: normal; font-family: var(--pg-mono); font-size: 10.5px;
  letter-spacing: .1em; color: var(--pg-brand); flex: 0 0 auto;
}
.pgr-g2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }

/* ── 入口表（六入口，D-01 用）────────────────────────────────── */
.pg-nav { border-top: 1px solid var(--pg-line); }
.pg-nav-i {
  display: grid; grid-template-columns: 30px minmax(0, 190px) minmax(0, 1fr);
  gap: 18px; align-items: center; padding: 12px 0;
  border-bottom: 1px solid var(--pg-line-2);
}
.pg-nav-ic { display: grid; place-items: center; color: var(--pg-fg-2); }
.pg-nav-l { font-size: 14.5px; font-weight: 500; letter-spacing: -.008em; }
.pg-nav-q { font-size: 13.5px; line-height: 1.6; color: var(--pg-fg-3); }

/* ── 引文带 ──────────────────────────────────────────────────── */
.pgq { max-width: 34ch; font-size: clamp(21px, 2.5vw, 33px); font-weight: 400; line-height: 1.34; letter-spacing: -.014em; }

/* ── 附录 A：规格表 ──────────────────────────────────────────── */
.pgspec { display: grid; grid-template-columns: var(--pg-col) minmax(0, 1fr); gap: var(--pg-gap); padding: 20px 0; border-top: 1px solid var(--pg-line-2); }
.pgspec-k { padding-top: 4px; color: var(--pg-fg-3); }
.pgspec-v { display: grid; gap: 14px; }
.pgsw { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); border: 1px solid var(--pg-line); }
.pgsw-i + .pgsw-i { border-left: 1px solid var(--pg-line); }
.pgsw-c { height: 84px; }
.pgsw-m { padding: 11px 12px 13px; border-top: 1px solid var(--pg-line); }
.pgsw-h { font-family: var(--pg-mono); font-size: 11px; font-weight: 500; letter-spacing: .06em; }
.pgsw-l { margin-top: 5px; font-size: 11.5px; line-height: 1.5; color: var(--pg-fg-3); }
.pgtags { display: flex; flex-wrap: wrap; gap: 8px; }
.pgtag-s {
  display: inline-flex; align-items: center; height: 22px; padding: 0 10px;
  border-radius: 24px; font-size: 12px; font-weight: 500;
}
.pgscale { display: flex; align-items: baseline; gap: 22px; flex-wrap: wrap; }
.pgrule { display: grid; gap: 10px; }
.pgrule-r { display: grid; grid-template-columns: 34px 60px minmax(0, 1fr); gap: 14px; align-items: center; font-size: 12.5px; color: var(--pg-fg-2); }
.pgrule-n { font-family: var(--pg-mono); font-size: 11px; color: var(--pg-fg-3); }
.pgrule-b { height: 12px; background: var(--pg-brand-sunk); border: 1px solid var(--pg-brand); }

/* ── 附录 B：界面清单 ────────────────────────────────────────── */
.pgidx { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 40px; }
.pgidx-i {
  display: grid; grid-template-columns: 76px minmax(0, 1fr);
  gap: 16px; align-items: center;
  padding: 12px 0; border-bottom: 1px solid var(--pg-line-2);
}
.pgidx-t { width: 76px; aspect-ratio: 1.942 / 1; overflow: hidden; border: 1px solid var(--pg-line); background: var(--pg-sunk); }
.pgidx-t img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: 50% 32%; }
.pgidx-p { font-family: var(--pg-mono); font-size: 11px; font-weight: 500; letter-spacing: .04em; color: var(--pg-fg-3); }
.pgidx-n { margin-top: 4px; font-size: 13.5px; line-height: 1.55; }

/* ── 收尾 ────────────────────────────────────────────────────── */
.pgend { display: grid; grid-template-columns: var(--pg-col) minmax(0, 1fr) minmax(0, 300px); gap: var(--pg-gap); align-items: end; }
.pgend-r { text-align: right; }

@media (max-width: 1024px) {
  .pg { --pg-col: 96px; --pg-gap: 22px; }
  .pgc-main { grid-template-columns: minmax(0, 1fr); }
  .pgc-plate { height: 40vh; }
  .pgmeta { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pgmeta-c:nth-child(3) { border-left: 0; padding-left: 0; }
  .pgmeta-c:nth-child(n+3) { border-top: 1px solid var(--pg-line-2); }
  .pgr-h, .pgend { grid-template-columns: var(--pg-col) minmax(0, 1fr); }
  .pgr-tags { grid-column: 2; justify-content: flex-start; margin-top: 10px; }
  .pgend-r { text-align: left; grid-column: 2; }
  .pgr-figs { padding-left: 0; }
  .pgr-g2 { grid-template-columns: minmax(0, 1fr); }
  .pgtoc-i { grid-template-columns: 68px minmax(0, 1fr); }
  .pgtoc-x { grid-column: 2; text-align: left; }
  .pgidx { grid-template-columns: minmax(0, 1fr); }
  .pgsw { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .pgsw-i:nth-child(4) { border-left: 0; }
  .pg-nav-i { grid-template-columns: 30px minmax(0, 1fr); }
  .pg-nav-q { grid-column: 2; }
}
@media (max-width: 640px) {
  .pg-hide-s { display: none; }
}
`

/* ═══════════════════════════════════════════════════════════════
   真实截图台账（public/portfolio 下 28 张，全部由用户提供）
   ═══════════════════════════════════════════════════════════════ */
const SHOTS: Record<string, { light: string; dark?: string }> = {
  "monitor-light": { light: "/portfolio/monitor-light.webp" },
  "monitor-dark": { light: "/portfolio/monitor-dark.webp" },
  dashboard: { light: "/portfolio/dashboard.webp" },
  "copilot-monitor": { light: "/portfolio/copilot-monitor.webp", dark: "/portfolio/copilot-monitor-dark.webp" },
  "copilot-dashboard": { light: "/portfolio/copilot-dashboard.webp" },
  "copilot-device-control": { light: "/portfolio/copilot-device-control.webp" },
  "copilot-automation": { light: "/portfolio/copilot-automation.webp" },
  "copilot-toggle-relay": { light: "/portfolio/copilot-toggle-relay.webp" },
  "canvas-editing": { light: "/portfolio/canvas-editing.webp" },
  "canvas-updated": { light: "/portfolio/canvas-updated.webp" },
  "canvas-copilot": { light: "/portfolio/canvas-copilot.webp" },
  "device-overview": { light: "/portfolio/device-overview.webp" },
  "device-control-3d": { light: "/portfolio/device-control-3d.webp" },
  "camera-gimbal": { light: "/portfolio/camera-gimbal.webp" },
  "diag-chat": { light: "/portfolio/diag-chat.webp" },
  "diag-analysis": { light: "/portfolio/diag-analysis.webp" },
  "diag-treatment": { light: "/portfolio/diag-treatment.webp" },
  records: { light: "/portfolio/records.webp" },
  "records-list": { light: "/portfolio/records-list.webp" },
  "records-followup": { light: "/portfolio/records-followup.webp" },
  "ai-home": { light: "/portfolio/ai-home-light.webp", dark: "/portfolio/ai-home-dark.webp" },
  "ai-empty": { light: "/portfolio/ai-empty-light.webp", dark: "/portfolio/ai-empty-dark.webp" },
  "ai-assistant": { light: "/portfolio/ai-assistant.webp" },
  "settings-appearance": { light: "/portfolio/settings-appearance.webp" },
  "settings-provider": { light: "/portfolio/settings-provider.webp" },
}

/* ═══════════════════════════════════════════════════════════════
   内容
   ═══════════════════════════════════════════════════════════════ */

/** 六个一级入口（components/page-navigation.tsx 逐字）+ 它替用户回答的问题 */
const NAV_ITEMS = [
  { icon: IconCloudy, label: "农作物监测", q: "现在棚里怎么样？" },
  { icon: IconSettingTwo, label: "硬件设备控制", q: "我要开或关哪个设备？" },
  { icon: IconChartHistogram, label: "数据看板", q: "这几天的趋势说明了什么？" },
  { icon: IconThunderbolt, label: "自动化", q: "什么情况下该自动做什么？" },
  { icon: IconMagic, label: "AI 助手", q: "我不想自己找，直接问行不行？" },
  { icon: IconComment, label: "聊天", q: "这件事我要找谁说？" },
]

/** 封面导语：三条最锋利的结论，对应到正文编号 */
const COVER_LINES = [
  { no: "D-01", t: "六个一级入口，每个只负责回答一个问题。" },
  { no: "D-03", t: "报警要说「怎么办」，不能只说「超了」。" },
  { no: "D-07", t: "只存「我怎么判的」是日志；存了「后来好了没」才是资产。" },
]

type Row = { k: string; v: ReactNode }
type Fig = { k: string; src: string; alt: string; cap: string }
type Decision = { no: string; title: string; tags: string[]; rows: Row[]; figs: Fig[] }

const RECORDS: Decision[] = [
  {
    no: "D-01",
    title: "一级结构按「用户要做什么」切，不按功能模块堆",
    tags: ["导航", "全站"],
    rows: [
      {
        k: "场景",
        v: <>一个种植户打开平台，想先确认「今天棚里怎么样」。</>,
      },
      {
        k: "问题",
        v: (
          <>
            原来的一级结构是功能模块的平铺。用户找的不是「环境数据」这个模块，是「有没有事」这个答案
            —— 他得先猜这件事被归到哪个菜单下面。猜错了就来回点，找路本身变成了一项工作。
          </>
        ),
      },
      {
        k: "决策",
        v: (
          <>
            六个一级入口，<b>每个只负责回答一个问题</b>。入口名旁边直接写出它回答的那句话，
            让用户按「我要做什么」认路，而不是按模块名记路。
          </>
        ),
      },
      {
        k: "理由",
        v: (
          <>
            用户记的是「我要做什么」，不是「它在哪个菜单」。
            把入口和问题绑死，用户就不需要先学会平台的分类法 —— 这一层学习成本是我该替他付的。
          </>
        ),
      },
    ],
    figs: [],
  },
  {
    no: "D-02",
    title: "一屏之内，先给结论",
    tags: ["数据看板", "农作物监测"],
    rows: [
      { k: "场景", v: <>早上六点打开平台，只想确认昨晚棚里有没有出事。</> },
      {
        k: "问题",
        v: (
          <>
            环境数据在农作物监测、设备开关在硬件设备控制、趋势在数据看板 —— 同一件事被拆在三处。
            想看清楚得来回切三次页面，再自己在脑子里拼起来。看得越多，反而越不敢下判断。
          </>
        ),
      },
      {
        k: "决策",
        v: (
          <>
            看板顶部先给一段<b>能读完的结论</b>（今天怎么样、有没有要处理的），趋势放中间，
            环境要素明细垫底。超阈值和离线设备自动前置，不用用户自己找。
          </>
        ),
      },
      {
        k: "理由",
        v: (
          <>
            用户问的是「好不好」，不是「多少」。数字是论据，不是答案。
            把结论摆在数据前面，等于替用户完成了第一轮判断 —— 他不必先「会看图表」，也能「看懂结论」。
          </>
        ),
      },
      { k: "代价", v: <>一屏能放的图表变少了。用信息密度换判断速度，这个交换划算。</> },
    ],
    figs: [{ k: "D-02", src: "dashboard", alt: "数据看板：顶部结论卡、中部趋势、底部环境要素", cap: "结论卡 → 趋势 → 要素明细。三段的顺序就是用户判断的顺序。" }],
  },
  {
    no: "D-03",
    title: "报警要说「怎么办」，不能只说「超了」",
    tags: ["病虫害诊断", "病历"],
    rows: [
      { k: "场景", v: <>叶片上出现褐色斑点，拍照上传，想知道这是什么、要不要打药。</> },
      {
        k: "问题",
        v: (
          <>
            原来只给一个结果和一个红色标记。是病害还是缺素、严重到什么程度、现在该做什么 ——
            页面不说话。用户拿到的不是答案，是一个需要自己解释的信号，判断权被推回到个人经验上。
          </>
        ),
      },
      {
        k: "决策",
        v: (
          <>
            结论卡先说清「什么病、多严重、怎么办」；病斑位置在图上直接框出来，对得上原图；
            防治建议<b>按代价从低到高排</b>：环境调控 → 物理防治 → 生物防治 → 化学防治。
          </>
        ),
      },
      {
        k: "理由",
        v: (
          <>
            种植户真正怕的不是问题本身，是<b>做错</b>。所以建议不能只给一个「最优解」，
            要给「先试哪个、代价多大、有没有残留」。把不花钱、不留残留的排在前面，选择权还在用户手上。
          </>
        ),
      },
      { k: "边界", v: <>化学防治排在最后并给出安全间隔期 —— 不是禁用，是不鼓励一上来就用。</> },
    ],
    figs: [
      { k: "D-03", src: "diag-analysis", alt: "病虫害诊断详情：左图带病斑定位框，右栏四个 Tab", cap: "病斑框对得上用户自己拍的那张图，所以结论是可核对的，不是黑箱。" },
      { k: "D-03", src: "diag-treatment", alt: "防治建议：按代价从低到高排序", cap: "同一条建议里写清做法、药剂与安全间隔期 —— 用户要的是能照着做的句子。" },
    ],
  },
  {
    no: "D-04",
    title: "从「找设备」变成「说要做什么」",
    tags: ["硬件设备控制", "AI 助手"],
    rows: [
      { k: "场景", v: <>要关 3 号棚的水泵，或者把补光灯打开。</> },
      {
        k: "问题",
        v: (
          <>
            设备节点按接线关系铺在大棚实景上 —— 位置是对的，但用户找的是「风扇」，不是「接线」。
            老用户靠位置记忆硬扛，新用户第一次基本找不到。
          </>
        ),
      },
      {
        k: "决策",
        v: (
          <>
            每个操作都留一个自然语言入口：对着当前这一屏说一句话，助手直接下发。
            调用 <em>toggle_relay</em> 之后，页面上对应的开关同步亮起。
          </>
        ),
      },
      {
        k: "理由",
        v: (
          <>
            自然语言是唯一对所有人都成立的入口 —— 会种地的人不一定看得懂接线图。
            让用户用自己的词描述意图，比让他学一套导航术语便宜得多。
          </>
        ),
      },
      {
        k: "约束",
        v: (
          <>
            助手读的是「当前这一屏」，所以「帮我关风扇」不需要先说是哪个棚 —— <b>上下文来自页面，不来自用户复述</b>。
          </>
        ),
      },
    ],
    figs: [{ k: "D-04", src: "copilot-toggle-relay", alt: "设备控制页：靠近莓小智侧栏，页面上开关同步亮起", cap: "说一句话，页面上对应的开关同步亮起 —— 动作有可见的落点。" }],
  },
  {
    no: "D-05",
    title: "助手能动手，但只在能动手的地方，而且能撤",
    tags: ["自动化", "AI 助手"],
    rows: [
      { k: "场景", v: <>让助手去改一条自动化规则。</> },
      {
        k: "问题",
        v: (
          <>
            不敢用。怕它在页面上乱动，动完还找不回来 ——
            一个不可控的助手，比没有助手更麻烦。
          </>
        ),
      },
      {
        k: "决策",
        v: (
          <>
            只有自动化编辑器能改画布，其余页面它只读；改的时候新增节点高亮、边改边提示「正在修改画布…」；
            改完给结果「画布已更新 · 2 处改动」，并且可以撤回。
          </>
        ),
      },
      {
        k: "理由",
        v: (
          <>
            权限是设计出来的，不是提示出来的。<b>可撤销是用户敢按的前提</b> ——
            他愿意用，助手才真的省事；愿意用来自「随时能反悔」。
          </>
        ),
      },
      {
        k: "约束",
        v: (
          <>
            哪些工具挂在哪一页写在页面配置里，不靠模型自觉。用户在监测页说「帮我关风扇」，
            它先说要跳到设备控制页 —— 而不是在错误的页面上乱动。
          </>
        ),
      },
    ],
    figs: [
      { k: "D-05", src: "canvas-editing", alt: "自动化画布：莓小智正在修改画布", cap: "改的过程中有状态提示，用户知道它在动、动的是哪一块。" },
      { k: "D-05", src: "canvas-updated", alt: "自动化画布已更新，2 处改动，可撤销", cap: "改完给一句可核对的结果，并且留一个撤回的出口。" },
    ],
  },
  {
    no: "D-06",
    title: "用「描述」代替「读图」",
    tags: ["自动化"],
    rows: [
      { k: "场景", v: <>种植户想设一条「温度超过 32 度就开风机」。</> },
      {
        k: "问题",
        v: (
          <>
            节点连线是工程师的语言：条件、动作、连线都画在图上，但读不出「什么时候会自动做什么」。
            会种地的人不一定会读流程图 —— <b>最该用自动化的人，用不了自动化</b>。
          </>
        ),
      },
      { k: "决策", v: <>描述需求 → 助手改画布 → 改动高亮。用户只需要说出想要的效果。</> },
      {
        k: "理由",
        v: (
          <>
            把「画图」降级成「描述」。用户的表达成本从「学会读一张流程图」降到「说一句人话」，
            中间那层翻译交给助手。
          </>
        ),
      },
    ],
    figs: [{ k: "D-06", src: "copilot-automation", alt: "自动化页的莓小智侧栏，可直接描述规则需求", cap: "侧栏的场景化推荐问题，把「我不知道能问什么」这一步也省掉了。" }],
  },
  {
    no: "D-07",
    title: "把「这一次怎么处理的」变成能回看的记录",
    tags: ["病历", "病虫害诊断"],
    rows: [
      { k: "场景", v: <>一个月后，同样的斑点又出现了。</> },
      {
        k: "问题",
        v: (
          <>
            这次的判断依据、当时拍的照片、最后用的办法，都没有地方存。
            经验留在个人脑子里 —— 换个人值班，就得从零再判一遍。
          </>
        ),
      },
      {
        k: "决策",
        v: (
          <>
            诊断自动入档；病历详情左栏保留当时的诊断与严重度，下面直接回填疗效：
            <b>痊愈 / 好转 / 无变化 / 恶化</b>。
          </>
        ),
      },
      {
        k: "理由",
        v: (
          <>
            只存「我怎么判的」是日志，存了「后来好了没」才是资产。
            <b>没有回填疗效，「病程」就不成立</b> —— 这一步决定了这份记录下一次有没有用。
          </>
        ),
      },
      { k: "代价", v: <>多了一步操作。用户可以跳过，但整份病历的价值建立在这一步上。</> },
    ],
    figs: [
      { k: "D-07", src: "records-list", alt: "病历面板：统计条 + 状态筛选 + 列表", cap: "总数、待处置、处置中、已解决一次给全，用户先看到全局再决定看哪条。" },
      { k: "D-07", src: "records-followup", alt: "病历详情：当前诊断 + 回填本次复诊", cap: "右侧保住当时的诊断，回填疗效不用重新回忆上下文。" },
    ],
  },
  {
    no: "D-08",
    title: "颜色承担信息，不承担装饰",
    tags: ["全站"],
    rows: [
      { k: "场景", v: <>满屏圆角方块，红绿黄都在抢注意力。</> },
      {
        k: "问题",
        v: (
          <>
            同一个绿色既表示「在线」又表示「重点」，同一个红色既表示「危险」又表示「取消」。
            颜色既当装饰又当语义，用户学不会，最后就全部忽略。
          </>
        ),
      },
      {
        k: "决策",
        v: (
          <>
            色、字、圆角、间距收敛成一套 token，所有业务模块复用；<b>语义色一对一</b> ——
            正常走翠绿、警示走琥珀、危险走红、中性走灰。品牌绿只留在「可以操作」的地方。
          </>
        ),
      },
      {
        k: "理由",
        v: (
          <>
            颜色承担信息的时候，用户不用读字。反过来，一个颜色背上两种含义，它就什么也传达不了。
          </>
        ),
      },
      {
        k: "边界",
        v: <>这条规则也管住了我自己：档案页本身不带圆角 —— 圆角是产品控件的语言，只在产品界面里出现。</>,
      },
    ],
    figs: [{ k: "D-08", src: "monitor-light", alt: "农作物监测页：环境曲线与环境要素卡片", cap: "曲线上只有一条强调色的线；其余全部是中性灰。颜色越少，颜色越准。" }],
  },
  {
    no: "D-09",
    title: "能力不绑死在一家模型上",
    tags: ["AI 服务商"],
    rows: [
      { k: "场景", v: <>想换一个更强、或者更便宜的模型。</> },
      {
        k: "问题",
        v: (
          <>
            AI 能力写死在代码里，换模型要改代码、发版本 ——
            一个本该由运营决定的事，变成了工程排期。
          </>
        ),
      },
      {
        k: "决策",
        v: <>服务商是列表：选服务商 → 填密钥 → 测连接 → 选模型。密钥可现场验证，模型按需启用。</> ,
      },
      {
        k: "理由",
        v: (
          <>
            能力是资产，模型是供应商。把供应商做成可替换的，能力才不会被一家绑住；
            用户在界面上就能完成切换，一行代码都不用改。
          </>
        ),
      },
    ],
    figs: [{ k: "D-09", src: "settings-provider", alt: "添加 AI 服务商：四步表单", cap: "四步走完就能用。密钥可现场验证，填错当场知道。" }],
  },
]

/** 附录 A · 色板 */
const SWATCHES = [
  { c: "#059669", h: "#059669", l: "品牌主色（亮）" },
  { c: "#34D399", h: "#34D399", l: "品牌主色（暗）" },
  { c: "#047857", h: "#047857", l: "亮底强调文字" },
  { c: "#161616", h: "#161616", l: "主文字 / 墨色" },
  { c: "#F4F4F4", h: "#F4F4F4", l: "次级底（分层用）" },
  { c: "#8D8D8D", h: "#8D8D8D", l: "三级文字" },
]

/** 附录 A · 字阶（项目 token） */
const TYPE_SCALE = ["11", "12", "14", "16", "18", "20"]
/** 附录 A · 圆角阶梯（产品控件，不是本档案页） */
const RADII = [4, 8, 16, 20, 32]
/** 附录 A · 间距阶梯（8 的倍数） */
const GAPS = [8, 16, 24, 32]
/** 附录 A · 材质厚度三档（components/device/material-css.ts） */
const GRADES = [
  { l: "流畅", f: "×0.2", d: "模糊最轻、开销最低。设备偏老或发热明显时选它。" },
  { l: "轻柔", f: "×0.78", d: "通透与流畅兼顾，默认档。" },
  { l: "精美", f: "×1", d: "完整模糊与光感，最厚。" },
]
/** 附录 A · 语义色一对一 */
const STATUS = [
  { l: "在线", c: "#059669", bg: "rgba(5,150,105,.10)" },
  { l: "执行中", c: "#2563EB", bg: "rgba(37,99,235,.10)" },
  { l: "待复核", c: "#D97706", bg: "rgba(217,119,6,.10)" },
  { l: "告警", c: "#DC2626", bg: "rgba(220,38,38,.10)" },
  { l: "已归档", c: "#6B7280", bg: "rgba(107,114,128,.10)" },
]

/** 附录 B · 界面清单 */
const SURFACES: { p: string; k: string; n: string }[] = [
  { p: "/monitor", k: "monitor-light", n: "农作物监测 · 环境曲线与环境要素" },
  { p: "/dashboard", k: "dashboard", n: "数据看板 · 结论、趋势、要素" },
  { p: "/device-control", k: "device-control-3d", n: "设备控制 · 大棚实景与设备节点" },
  { p: "/device-control", k: "device-overview", n: "设备总览 · 在线与离线" },
  { p: "/device-control", k: "camera-gimbal", n: "摄像头云台 · 现场画面" },
  { p: "/automation", k: "canvas-copilot", n: "自动化 · 画布与助手同屏" },
  { p: "/automation", k: "canvas-editing", n: "自动化 · 助手修改中" },
  { p: "/automation", k: "canvas-updated", n: "自动化 · 改完可撤销" },
  { p: "/ai-assistant", k: "ai-home", n: "AI 助手 · 空态与推荐问题" },
  { p: "/ai-assistant", k: "ai-assistant", n: "AI 助手 · 对话中" },
  { p: "/ai-assistant", k: "copilot-monitor", n: "监测页内嵌助手 · 上下文来自当前屏" },
  { p: "/ai-assistant", k: "copilot-dashboard", n: "看板页内嵌助手" },
  { p: "/ai-assistant", k: "copilot-device-control", n: "设备页内嵌助手" },
  { p: "/ai-assistant", k: "copilot-automation", n: "自动化页内嵌助手" },
  { p: "/diagnosis", k: "diag-chat", n: "病虫害诊断 · 对话区" },
  { p: "/diagnosis", k: "diag-analysis", n: "病虫害诊断 · 标注与依据" },
  { p: "/diagnosis", k: "diag-treatment", n: "病虫害诊断 · 防治建议" },
  { p: "/records", k: "records", n: "病历 · 概览" },
  { p: "/records", k: "records-list", n: "病历 · 列表与筛选" },
  { p: "/records", k: "records-followup", n: "病历 · 回填复诊" },
  { p: "设置", k: "settings-appearance", n: "外观 · 沉浸光感与材质厚度" },
  { p: "设置", k: "settings-provider", n: "AI 服务商 · 接入与启用" },
]

/* ═══════════════════════════════════════════════════════════════
   基础元件
   ═══════════════════════════════════════════════════════════════ */

function Band({
  id, kind, children, top,
}: { id?: string; kind?: "sunk" | "inv"; children: ReactNode; top?: boolean }) {
  const cls = ["pg", "pg-band", kind === "sunk" ? "pg-band--sunk" : "", kind === "inv" ? "pg-band--inv" : ""]
    .filter(Boolean).join(" ")
  return (
    <section id={id} data-shot={id} className={cls} style={top ? { borderTop: 0 } : undefined}>
      <div className="pg-wrap">{children}</div>
    </section>
  )
}

function Head({ k, t, d }: { k: string; t: string; d?: ReactNode }) {
  return (
    <header className="pgh">
      <span className="pgh-k pg-mono">{k}</span>
      <div>
        <h2 className="pgh-t">{t}</h2>
        {d ? <p className="pgh-d">{d}</p> : null}
      </div>
    </header>
  )
}

function Figure({ f }: { f: Fig }) {
  return (
    <figure className="pgr-fig" style={{ margin: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={f.src} alt={f.alt} />
      <figcaption><i>{f.k}</i><span>{f.cap}</span></figcaption>
    </figure>
  )
}

/* ═══════════════════════════════════════════════════════════════
   页面
   ═══════════════════════════════════════════════════════════════ */

export default function PortfolioPage() {
  useDesktopHeaderHost()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const q = new URLSearchParams(location.search).get("t")
    if (q === "dark" || q === "light") setTheme(q)
  }, [setTheme])
  useEffect(() => {
    const prev = document.title
    document.title = "莓界 Berry Realm · 界面设计档案"
    return () => { document.title = prev }
  }, [])

  const isDark = mounted && resolvedTheme === "dark"
  const cur = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : ""
  const src = (k: string) => {
    const s = SHOTS[k]
    if (!s) return "/portfolio/" + k + ".webp"
    return isDark && s.dark ? s.dark : s.light
  }

  return (
    <div className="pg">
      <style>{PG_CSS}</style>

      {/* ═════════════ 封面：杂志式（全幅实拍 + 纸底标题带）═════════════ */}
      <section id="cover" data-shot="cover" className="pgc">
        <div className="pgc-plate">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src("device-control-3d")} alt="莓界设备控制页：大棚实景与设备节点" />
        </div>

        <div className="pgc-words">
          <div className="pg-wrap" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div className="pgc-mast">
              <span className="pgc-mast-l">
                BERRY REALM<i>莓界 · 智慧温室协同管理平台</i>
              </span>
              <span className="pgc-mast-r">界面设计档案<br />NO.01 · 2026</span>
            </div>

            <div className="pgc-main">
              <div>
                <h1 className="pgc-h1">莓界</h1>
                <div className="pgc-sub">Interface Design Archive</div>
                <p className="pgc-lede">
                  九个决策。每一条都写清楚三件事：<b>用户当时在做什么、他卡在哪、我为什么这么改</b>。
                  没写出来的那些，是还没想明白的。
                </p>
              </div>

              <ol className="pgc-lines">
                {COVER_LINES.map((l) => (
                  <li key={l.no}>
                    <i>{l.no}</i>
                    <span>{l.t}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="pgc-foot">
              <span className="pgc-foot-k">Stravision Design · 晨雾松 Emerald × Zinc</span>
              <span className="pg-tg" role="group" aria-label="主题">
                {(["light", "dark"] as const).map((t) => (
                  <button key={t} type="button" data-on={cur === t ? "1" : "0"} onClick={() => setTheme(t)}>
                    {t === "light" ? "Light" : "Dark"}
                  </button>
                ))}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════ 元信息 + 目录 ═════════════ */}
      <Band id="index">
        <div className="pgmeta">
          {[
            { k: "平台", v: <><b>莓界 Berry Realm</b> · 智慧温室协同管理平台</> },
            { k: "范围", v: <>6 个一级入口 · 5 个工作台 · <b>28</b> 张界面素材</> },
            { k: "载体", v: <>Next.js Web 端 + Electron 桌面端</> },
            { k: "本档案", v: <><b>9</b> 条决策 · 3 个附录 · 2026</> },
          ].map((m) => (
            <div className="pgmeta-c" key={m.k}>
              <div className="pgmeta-k pg-mono">{m.k}</div>
              <div className="pgmeta-v">{m.v}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: "52px 0 12px" }}>
          <div className="pg-mono" style={{ color: "var(--pg-fg-3)" }}>目录 · Contents</div>
        </div>

        <div className="pgtoc">
          {RECORDS.map((r) => (
            <div className="pgtoc-i" key={r.no}>
              <span className="pgtoc-no">{r.no}</span>
              <span className="pgtoc-t">{r.title}</span>
              <span className="pgtoc-x">{r.tags.join(" · ")}</span>
            </div>
          ))}
          {[
            { no: "A", t: "视觉规格：色、字、圆角、间距、状态、材质", x: "Token" },
            { no: "B", t: "界面清单：全部素材与它属于哪一屏", x: "Assets" },
            { no: "C", t: "没做完的部分", x: "Open" },
          ].map((r) => (
            <div className="pgtoc-i" key={r.no}>
              <span className="pgtoc-no">附录 {r.no}</span>
              <span className="pgtoc-t">{r.t}</span>
              <span className="pgtoc-x">{r.x}</span>
            </div>
          ))}
        </div>
      </Band>

      {/* ═════════════ D-01 … D-09 ═════════════ */}
      <Band id="decisions" kind="sunk">
        <Head
          k="决策记录"
          t="九个决策，以及它们各自解决的问题"
          d={
            <>
              每一条都按同一套字段写：<b>场景</b>（用户当时在做什么）、<b>问题</b>（他卡在哪）、
              <b>决策</b>（我改了什么）、<b>理由</b>（为什么这么做）。有代价和边界的也一并写出来
              —— 没写代价的决策，通常是还没想清楚。
            </>
          }
        />

        {RECORDS.map((r, i) => (
          <article className="pgr" key={r.no} style={i === 0 ? { borderTop: 0 } : undefined}>
            <div className="pgr-h">
              <span className="pgr-no">{r.no}</span>
              <h3 className="pgr-t">{r.title}</h3>
              <div className="pgr-tags">
                {r.tags.map((t) => <span className="pg-tag pg-tag--gray" key={t}>{t}</span>)}
              </div>
            </div>

            {r.rows.map((row) => (
              <div className="pgr-row" key={row.k}>
                <span className="pgr-k pg-mono">{row.k}</span>
                <div className="pgr-v">{row.v}</div>
              </div>
            ))}

            {r.no === "D-01" ? (
              <div className="pgr-figs">
                <div className="pg-nav">
                  {NAV_ITEMS.map((n) => (
                    <div className="pg-nav-i" key={n.label}>
                      <span className="pg-nav-ic"><n.icon size={16} /></span>
                      <span className="pg-nav-l">{n.label}</span>
                      <span className="pg-nav-q">「{n.q}」</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {r.figs.length === 1 ? (
              <div className="pgr-figs"><Figure f={{ ...r.figs[0], src: src(r.figs[0].src) }} /></div>
            ) : null}
            {r.figs.length > 1 ? (
              <div className="pgr-figs">
                <div className="pgr-g2">
                  {r.figs.map((f) => <Figure key={f.src} f={{ ...f, src: src(f.src) }} />)}
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </Band>

      {/* ═════════════ 附录 A · 视觉规格 ═════════════ */}
      <Band id="spec">
        <Head
          k="附录 A"
          t="视觉规格"
          d={
            <>
              下面这套 token 是所有业务模块共用的。它不服务于「好看」，服务于
              <b>同一种含义在任何一屏都长同一样子</b>。
            </>
          }
        />

        <div style={{ paddingTop: 30 }}>
          <div className="pgspec">
            <span className="pgspec-k pg-mono">色板</span>
            <div className="pgsw">
              {SWATCHES.map((s) => (
                <div className="pgsw-i" key={s.h}>
                  <div className="pgsw-c" style={{ background: s.c }} />
                  <div className="pgsw-m">
                    <div className="pgsw-h">{s.h}</div>
                    <div className="pgsw-l">{s.l}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pgspec">
            <span className="pgspec-k pg-mono">字阶</span>
            <div className="pgspec-v">
              <div className="pgscale">
                {TYPE_SCALE.map((t) => (
                  <span key={t} style={{
                    fontSize: Number(t), fontWeight: t === "20" ? 500 : 400, letterSpacing: "-.012em",
                    color: t === "11" || t === "12" ? "var(--pg-fg-3)" : "var(--pg-fg)", lineHeight: 1,
                    fontFamily: "var(--pg-mono)",
                  }}>{t}</span>
                ))}
              </div>
              <p className="pg-sm" style={{ margin: 0, maxWidth: "64ch" }}>
                11 / 12 / 14 / 16 / 18 / 20，六级封顶。正文 16、图注 13、标签 11。
                层级靠字号与颜色拉开，不靠加粗 —— 通篇只有一个 600 字重。
              </p>
            </div>
          </div>

          <div className="pgspec">
            <span className="pgspec-k pg-mono">圆角</span>
            <div className="pgspec-v">
              <div className="pgscale">
                {RADII.map((r) => (
                  <div key={r} style={{ textAlign: "center" }}>
                    <div style={{ width: 40, height: 40, borderRadius: r, background: "var(--pg-brand-sunk)", border: "1px solid var(--pg-brand)" }} />
                    <div className="pg-mono" style={{ marginTop: 8, color: "var(--pg-fg-3)", letterSpacing: ".06em" }}>{r}</div>
                  </div>
                ))}
              </div>
              <p className="pg-sm" style={{ margin: 0, maxWidth: "64ch" }}>
                4 / 8 / 16 / 20 / 32，产品控件的阶梯。截图与标本框不在这套里 —— 它们是<b>直角</b>，
                属于图像层。本档案页自己也是直角，因为它是一份印刷品。
              </p>
            </div>
          </div>

          <div className="pgspec">
            <span className="pgspec-k pg-mono">间距</span>
            <div className="pgspec-v">
              <div className="pgrule">
                {GAPS.map((g) => (
                  <div className="pgrule-r" key={g}>
                    <span className="pgrule-n">{g}</span>
                    <span className="pgrule-b" style={{ width: g * 3 }} />
                    <span>{g === 8 ? "组件内" : g === 16 ? "组件间" : g === 24 ? "卡片间" : "章节内"}</span>
                  </div>
                ))}
              </div>
              <p className="pg-sm" style={{ margin: 0, maxWidth: "64ch" }}>
                8vp 网格起步，所有值都是 8 的倍数。呼吸感来自空白，不来自卡片。
              </p>
            </div>
          </div>

          <div className="pgspec">
            <span className="pgspec-k pg-mono">状态</span>
            <div className="pgspec-v">
              <div className="pgtags">
                {STATUS.map((s) => (
                  <span className="pgtag-s" key={s.l} style={{ color: s.c, background: s.bg }}>{s.l}</span>
                ))}
              </div>
              <p className="pg-sm" style={{ margin: 0, maxWidth: "64ch" }}>
                <b>严禁两个语义共用一色</b>：正常走翠绿、警示走琥珀、危险走红、中性走灰。
                颜色本身承担信息，不承担装饰。
              </p>
            </div>
          </div>

          <div className="pgspec">
            <span className="pgspec-k pg-mono">材质</span>
            <div className="pgspec-v">
              {GRADES.map((g) => (
                <div key={g.l} style={{
                  display: "grid", gridTemplateColumns: "64px 72px minmax(0, 1fr)", gap: 16,
                  alignItems: "baseline", padding: "11px 0", borderBottom: "1px solid var(--pg-line-2)",
                }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{g.l}</span>
                  <span className="pg-mono" style={{ color: "var(--pg-fg-3)", letterSpacing: ".06em" }}>blur {g.f}</span>
                  <span className="pg-sm" style={{ margin: 0 }}>{g.d}</span>
                </div>
              ))}
              <p className="pg-sm" style={{ margin: 0, maxWidth: "64ch" }}>
                三档是<b>同一套 blur 乘系数</b>，不是三套样式 —— 所以切换时版式不会跳。
                另外还有一个「关闭」，它不是「更薄的第四档」，而是退出整个材质体系。
              </p>
            </div>
          </div>

          <div className="pgspec">
            <span className="pgspec-k pg-mono">容器</span>
            <div className="pgspec-v">
              <p className="pg-bd" style={{ margin: 0, maxWidth: "64ch" }}>
                <b>一个视觉区域，只留一层容器。</b>有底色或边框的容器，一层就够了；
                文字直接排在画布上，不用再套一层白卡，卡片里也不再嵌卡片。
                之前满屏圆角方块，就是这条规则被破掉的结果。
              </p>
            </div>
          </div>
        </div>
      </Band>

      {/* ═════════════ 附录 B · 界面清单 ═════════════ */}
      <Band id="assets" kind="sunk">
        <Head
          k="附录 B"
          t="界面清单"
          d={<>全部素材，以及每一张属于哪一屏。做档案的意义在于可核对 —— 上面每条决策都能在这里找到证据。</>}
        />
        <div style={{ paddingTop: 26 }}>
          <div className="pgidx">
            {SURFACES.map((s) => (
              <div className="pgidx-i" key={s.k + s.p}>
                <div className="pgidx-t">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src(s.k)} alt={s.n} loading="lazy" />
                </div>
                <div>
                  <div className="pgidx-p">{s.p}</div>
                  <div className="pgidx-n">{s.n}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Band>

      {/* ═════════════ 附录 C · 没做完的部分 ═════════════ */}
      <Band id="open" kind="inv">
        <Head k="附录 C" t="没做完的部分" />
        <div style={{ padding: "34px 0 56px" }}>
          <p className="pgq" style={{ margin: 0 }}>它现在会说结论、也会给依据。但它还不会在用户说「这个判断不对」之后重新看一遍图。</p>
        </div>
        <div className="pgr-row" style={{ borderTopColor: "var(--pg-inv-line)" }}>
          <span className="pgr-k pg-mono" style={{ color: "var(--pg-inv-fg-2)" }}>下一步</span>
          <div className="pgr-v" style={{ color: "var(--pg-inv-fg-2)" }}>
            把「纠正」也做成一次可回看的记录 —— 用户驳回之后，助手要能重新看一遍依据，
            并把这次驳回留在病历里。只存判断、不存纠正，库里缺的正好是最有价值的那一半。
          </div>
        </div>
        <div className="pgr-row" style={{ borderTopColor: "var(--pg-inv-line)" }}>
          <span className="pgr-k pg-mono" style={{ color: "var(--pg-inv-fg-2)" }}>还没解</span>
          <div className="pgr-v" style={{ color: "var(--pg-inv-fg-2)" }}>
            疗效回填仍然依赖用户主动填。多数人会跳过，那这一步就白设计了 —— 怎么把它的成本降到接近零，是下一版要回答的问题。
          </div>
        </div>

        <div style={{ padding: "48px 0 0" }}>
          <div className="pgend" style={{ paddingTop: 20, borderTop: "1px solid var(--pg-inv-line)" }}>
            <span className="pgr-k pg-mono" style={{ color: "var(--pg-inv-fg-2)" }}>署名</span>
            <span style={{ fontSize: 15 }}>Stravision Design</span>
            <span className="pgend-r pg-mono" style={{ color: "var(--pg-inv-fg-2)" }}>
              Berry Realm · 2026 · 晨雾松 Emerald × Zinc
            </span>
          </div>
        </div>
        <div style={{ height: 64 }} />
      </Band>
    </div>
  )
}
