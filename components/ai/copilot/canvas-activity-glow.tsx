"use client"

/**
 * CanvasActivityGlow —— 「AI 正在改画布」时的屏幕边缘光效
 *
 * 设计意图（2026-09-21 用户要求：AI 改画布时屏幕周围要有一点好看的动效体现智能）：
 *  - 一束光沿屏幕四边首尾相接绕行（上→右→下→左），像"思维在画布外围流动"
 *  - 外层再叠一圈更厚、更虚的光晕（blur）做体积感
 *  - 四角有脉冲角标，内侧有极淡的呼吸渐晕，整体不遮挡任何内容（pointer-events:none）
 *  - 底部居中出现状态胶囊，说明"正在做什么"
 *
 * 2026-09-21 二次修订（用户反馈「消失得太快，还没看到就没了」）：
 *  - 内部强制 **最短可见时长**（minVisibleMs）：模型改画布只要 0.3~0.6s，原实现光效寿命
 *    ≈1.3s，肉眼只瞥到一下。现在即使 active 立刻变 false，也会补足到最短时长，退场再加 450ms 淡出。
 *  - 新增 **done 相位**：执行完成后整体由蓝紫转绿 + 胶囊打勾，明确告诉用户"改完了"，
 *    而不是让光效无声无息地消失。
 *
 * 实现刻意 **不用 mask-composite / conic-gradient 遮罩**：那类写法在部分内核下退化成
 * 整屏色块。这里只用 4 条 2px 的光带 + background-position 动画，任何浏览器都稳。
 *
 * 2026-09-21 三次修订（用户要求：「把左边那个改成 BerryOrb，并且为工作中的表情」）：
 *  - 胶囊左端的静态四角星图标 → 换成 **BerryOrb** 动画小球，表情随相位走。
 *
 * 2026-10-27 四次修订（用户：「把 ai 操作的光晕那个胶囊美化一下很丑的。用上沉浸光感。
 *                        然后把形象换成 grokbot。」）：
 *  - ① 形象 → **Grok Bot**（BerryOrb `variant="orb"`，即 components/smoothui/grok-orb-body.tsx
 *    的 SVG 形象，原型 grok-bot-emoji）。为什么必须换：
 *      旧版走 `variant="auto"`，24px 时命中 berry-orb 的 clipTooSmall 分支 → 只显示
 *      working.webp 的**静态首帧**，一颗 24px 的模糊色块，既不动也看不出是脸。
 *      Grok Bot 是纯 SVG：body 铺满视口、眼睛占 body 约 53%，26px 时眼球 ≈13px，
 *      **每一帧都在动**（眨眼 / 眼位漂移 / 身体微晃），小尺寸下反而更清晰、
 *      也才有"它在干活"的智能感。
 *  - ② 胶囊 → **沉浸光感材质**（见下方 CSS「底部状态胶囊」一节的注释）。
 *  - ③ 顺带把 tone 的色相贯通到形象：思考=靛蓝眼、控设备=电光青眼、完成=翠绿眼，
 *    与胶囊的内缘光/外投影同一色相，不再是"蓝边浅底 + 紫绿混点"的一锅乱炖。
 *
 * 触发方：CopilotSidebar 监听前端工具（client tool）调用生命周期，active 即显示。
 */

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useRef, useState } from "react"

import BerryOrb, { type OrbPalette } from "@/components/smoothui/berry-orb"

export interface CanvasActivityGlowProps {
  /** 是否正在执行前端工具（如改画布） */
  active: boolean
  /** 状态胶囊文案，如「莓小智正在修改画布…」 */
  label?: string
  /** 执行阶段：running = 正在做；done = 已做完（整体转绿 + 胶囊打勾） */
  phase?: "running" | "done"
  /**
   * 光效色调（2026-09-25 新增）：
   *  - think  = 思维蓝紫粉（默认，AI 在改画布 / 改页面）：蓝 → 紫 → 粉
   *  - device = 电光青蓝（AI 在控制设备）：青 → 冰青 → 天蓝 → 靛 的 4 段连续渐变
   * 🚨 device 的配色经过三次修订，别再改回去：
   *    v1 品牌绿 → 用户「光的颜色不要是绿色因为和平台主题色撞了。所以就看不清」
   *                （设备页本身是绿主场，绿光扫在绿底上糊掉）
   *    v2 暖琥珀金 → 用户「用科技一点的！！！感觉不高级不智能这个颜色！要渐变的那种」
   *    v3 电光青蓝渐变 = 科技感 + 高级 + 多色渐变，且与 think 零重叠色相便于分辨。
   */
  tone?: "think" | "device"
  /** 暗色主题（浅色下需要更强的光，深色下更亮更饱和） */
  dark?: boolean
  /**
   * 最短可见时长（ms）。执行太快时用它把存在感补够，避免"闪一下"。
   * 含 450ms 退场淡出，所以总寿命 ≈ minVisibleMs + 450。
   */
  minVisibleMs?: number
}

const CSS = `
.cag-root { position: absolute; inset: 0; overflow: hidden; border-radius: 14px; }

/* ===== 光带扫动（2px 主光 + 更厚的光晕） ===== */
.cag-sweep-h, .cag-sweep-v { position: absolute; background-repeat: no-repeat; }
.cag-sweep-h {
  left: 0; right: 0; height: 2px;
  background-image: linear-gradient(90deg, rgba(59,130,246,0) 0%, rgba(59,130,246,.15) 22%, rgba(59,130,246,.95) 44%, rgba(167,139,250,1) 54%, rgba(236,72,153,.9) 66%, rgba(236,72,153,0) 88%);
  background-size: 240% 100%;
  animation: cagSweepX 2.6s linear infinite;
}
.cag-sweep-v {
  top: 0; bottom: 0; width: 2px;
  background-image: linear-gradient(180deg, rgba(59,130,246,0) 0%, rgba(59,130,246,.15) 22%, rgba(59,130,246,.95) 44%, rgba(167,139,250,1) 54%, rgba(236,72,153,.9) 66%, rgba(236,72,153,0) 88%);
  background-size: 100% 240%;
  animation: cagSweepY 2.6s linear infinite;
}
.cag-sweep-t { top: 0; }
.cag-sweep-b { bottom: 0; animation-delay: -1.3s; }
.cag-sweep-l { left: 0; }
.cag-sweep-r { right: 0; animation-delay: -1.3s; }

.cag-halo { position: absolute; filter: blur(14px); opacity: .5; }
.cag-halo.cag-sweep-h { height: 22px; }
.cag-halo.cag-sweep-v { width: 22px; }

@keyframes cagSweepX {
  from { background-position: -130% 0; }
  to   { background-position: 230% 0; }
}
@keyframes cagSweepY {
  from { background-position: 0 -130%; }
  to   { background-position: 0 230%; }
}

/* ===== done 相位：整体由「思维蓝紫」转「完成绿」 ===== */
.cag-root.cag-done .cag-sweep-h {
  background-image: linear-gradient(90deg, rgba(0,148,86,0) 0%, rgba(0,148,86,.16) 22%, rgba(0,148,86,.95) 44%, rgba(52,211,153,1) 54%, rgba(132,204,22,.9) 66%, rgba(132,204,22,0) 88%);
  animation-duration: 1.9s;
}
.cag-root.cag-done .cag-sweep-v {
  background-image: linear-gradient(180deg, rgba(0,148,86,0) 0%, rgba(0,148,86,.16) 22%, rgba(0,148,86,.95) 44%, rgba(52,211,153,1) 54%, rgba(132,204,22,.9) 66%, rgba(132,204,22,0) 88%);
  animation-duration: 1.9s;
}
.cag-root.cag-done .cag-breathe {
  box-shadow:
    inset 0 0 26px rgba(0,148,86,.22),
    inset 0 0 70px rgba(52,211,153,.14),
    inset 0 0 120px rgba(132,204,22,.07);
}
.cag-root.cag-done .cag-corner::before,
.cag-root.cag-done .cag-corner::after {
  background: linear-gradient(90deg, #34d399, #6ee7b7, #bef264);
}
@keyframes cagCornerDone {
  0%, 100% { opacity: .45; box-shadow: 0 0 6px rgba(52,211,153,.5); }
  50%      { opacity: 1;   box-shadow: 0 0 16px rgba(110,231,183,.95); }
}
.cag-root.cag-done .cag-corner::before,
.cag-root.cag-done .cag-corner::after { animation-name: cagCornerDone; }

/* ===== 内侧呼吸渐晕 ===== */
.cag-breathe {
  position: absolute; inset: 0; border-radius: 14px;
  box-shadow:
    inset 0 0 26px rgba(59,130,246,.20),
    inset 0 0 70px rgba(139,92,246,.12),
    inset 0 0 120px rgba(236,72,153,.06);
  animation: cagBreathe 2.6s ease-in-out infinite;
  transition: box-shadow .4s ease;
}
@keyframes cagBreathe {
  0%, 100% { opacity: .55; }
  50%      { opacity: 1; }
}

/* ===== 四角脉冲角标 ===== */
.cag-corner { position: absolute; width: 26px; height: 26px; opacity: .9; }
.cag-corner::before, .cag-corner::after {
  content: ""; position: absolute; background: linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6);
  border-radius: 2px;
  animation: cagCorner 2.6s ease-in-out infinite;
}
.cag-corner::before { width: 100%; height: 2px; }
.cag-corner::after  { width: 2px; height: 100%; }
.cag-corner-tl { top: 6px; left: 6px; }
.cag-corner-tr { top: 6px; right: 6px; transform: scaleX(-1); }
.cag-corner-bl { bottom: 6px; left: 6px; transform: scaleY(-1); }
.cag-corner-br { bottom: 6px; right: 6px; transform: scale(-1, -1); }
@keyframes cagCorner {
  0%, 100% { opacity: .35; box-shadow: 0 0 6px rgba(96,165,250,.5); }
  50%      { opacity: 1;   box-shadow: 0 0 14px rgba(167,139,250,.9); }
}

/* ============================================================
   ===== 底部状态胶囊 · 沉浸光感材质（2026-10-27 重做）=====

   ── 旧版为什么"很丑"（用户原话）──
     全是硬碰硬的重色，没有一处是"光"：
       · 86% 不透明白底（rgba(255,255,255,.86)）—— 背后什么都没有透上来；
       · 85% 蓝边 + 一层蓝色大投影 —— 读起来是"白板上贴了条蓝胶带"；
       · 三个跳动点用 emerald→purple 双色渐变，跟 tone 的色相体系互相打架。

   ── 新版按 HDS 材质「四件套 + 光感」落地 ──
     （与 components/device/material-css.ts 同源，那套是项目里唯一被认可的材质语言）
       ① 低 alpha 底     .46（亮）/ .54（暗）—— 让背后的光透上来，这是通透的本体，
                          不是"看起来淡"；alpha 一高，背后色光在数学上就被冲淡了。
       ② materialFilter  backdrop-filter 里的 saturate(1.7) + brightness(1.06)：
                          把背后的彩色光吸上来并抬亮 —— 官方说的「光感穿越层级」。
                          模糊半径乘 --dc-mat-scale，跟随用户选的材质厚度档位。
       ③ 1px 高光边     受光面在上缘（inset 0 1px 0 近白），不是一圈均匀描边。
       ④ 内缘光 + 带色外投影  材质**自己发光**：外投影带 tone 色，而不是被一块黑布托着。

   ── 关键：胶囊自带一片「景」 ──
     沉浸光感的场景轴判据是「背后真的有光可吸」。胶囊贴在页面底部，背后常常是
     空白画布 —— 那样 backdrop-filter 无处可采，玻璃就退化成一块灰白板。
     所以 .cag-pill-halo 垫在玻璃**背后**：一层 blur(13px) 的 tone 色雾（低 alpha、
     无边界，不是色带也不是光斑）。它同时干两件事：给玻璃提供可吸的光，以及
     让胶囊"悬在光里"而不是"贴在地上"。

   ── 变量分层，消费规则只有一条 ──
     旧版是 20+ 条 box-shadow 在 theme × tone × done 三个维度上互相覆盖（后写的赢），
     改一处颜色要翻半天。现在：theme（亮/暗）→ tone（think/device）→ phase（running/done）
     只在**变量层**做组合覆盖，.cag-pill 只消费。
     🚨 变量必须定义在 [data-cag-theme] / .cag-pill-stack-done 上（pill 的**祖先或自身**）：
        halo 是 pill 的兄弟节点，写在 pill 内部的元素上它拿不到。

   ── 居中写法（别改）──
     🚨 居中不要用 left:50% + translateX(-50%)：framer-motion 会给胶囊写内联
     transform（y/scale 入场动画），会把 translateX 整个覆盖掉 → 实测偏右半个身位。
     改用外层 flex 容器居中，胶囊自己不做位移。
     注意：本段在 JS 模板字符串里，注释中**不能出现反引号**，否则会截断模板导致编译失败。
   ============================================================ */

.cag-pill-wrap {
  position: absolute; left: 0; right: 0; bottom: 26px;
  display: flex; justify-content: center;
}
/* 玻璃 + 背后雾光的定位容器：halo 要能溢出到胶囊外，不能用 overflow:hidden */
.cag-pill-stack { position: relative; display: inline-flex; }

/* 背后雾光 = 沉浸光感的「景」。大范围、无边界、低 alpha，只呼吸不流动
   （⛔ 不要做成斜向色带/多盏高 alpha 光斑 —— 用户明确否过「好丑」） */
.cag-pill-halo {
  position: absolute; left: -26px; right: -26px; top: -18px; bottom: -18px;
  border-radius: 999px;
  background: var(--cag-halo);
  filter: blur(13px);
  opacity: var(--cag-halo-op, .9);
  pointer-events: none;
  animation: cagHaloBreath 3.6s ease-in-out infinite;
}
@keyframes cagHaloBreath {
  0%, 100% { transform: scale(.985); opacity: calc(var(--cag-halo-op, .9) * .62); }
  50%      { transform: scale(1.03);  opacity: var(--cag-halo-op, .9); }
}

/* ── 材质变量：亮色（默认 = think running）── */
[data-cag-theme="light"] {
  --cag-bg: rgba(255,255,255,.46);
  --cag-sheen: linear-gradient(180deg, rgba(255,255,255,.66) 0%, rgba(255,255,255,.12) 44%, rgba(255,255,255,0) 100%);
  --cag-line: rgba(255,255,255,.80);
  --cag-edge:
    inset 0 0 1px rgba(255,255,255,.92),
    inset 0 1px 0 rgba(255,255,255,.96),
    inset 0 0 22px -9px rgba(129,140,248,.60);
  --cag-shadow:
    0 10px 26px -14px rgba(30,41,59,.42),
    0 2px 6px -3px rgba(15,23,42,.12),
    0 0 0 .5px rgba(15,23,42,.03);
  --cag-ink: #3f3f46;
  --cag-dot: #6366f1;
  --cag-halo: radial-gradient(56% 132% at 50% 52%, rgba(129,140,248,.34) 0%, rgba(96,165,250,.20) 44%, rgba(255,255,255,0) 74%);
  --cag-halo-op: .9;
}

/* ── 材质变量：暗色（暗底永远叠白/亮色，且 alpha 更低；光感靠 brightness 抬）── */
[data-cag-theme="dark"] {
  --cag-bg: rgba(38,38,42,.54);
  --cag-sheen: linear-gradient(180deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,.02) 44%, rgba(0,0,0,.12) 100%);
  --cag-line: rgba(255,255,255,.14);
  --cag-edge:
    inset 0 0 1px rgba(255,255,255,.20),
    inset 0 1px 0 rgba(255,255,255,.22),
    inset 0 0 24px -9px rgba(129,140,248,.55);
  --cag-shadow:
    0 12px 32px -16px rgba(0,0,0,.90),
    0 0 30px -10px rgba(99,102,241,.55),
    0 0 0 .5px rgba(255,255,255,.05);
  --cag-ink: #ededf0;
  --cag-dot: #a5b4fc;
  --cag-halo: radial-gradient(56% 132% at 50% 52%, rgba(129,140,248,.40) 0%, rgba(56,189,248,.22) 44%, rgba(0,0,0,0) 74%);
  --cag-halo-op: 1;
}

/* ── tone=device：电光青蓝。只换色相（内缘光 / 雾光 / 圆点），材质本身不动 ──
   ⚠️ 形象（Grok Bot）**不参与** tone 切换 —— 它是平台 AI 的身份色，恒定品牌绿。 */
[data-cag-tone="device"] {
  --cag-dot: #0e7490;
  --cag-halo: radial-gradient(56% 132% at 50% 52%, rgba(34,211,238,.38) 0%, rgba(56,189,248,.22) 44%, rgba(255,255,255,0) 74%);
  --cag-edge:
    inset 0 0 1px rgba(255,255,255,.92),
    inset 0 1px 0 rgba(255,255,255,.96),
    inset 0 0 22px -9px rgba(34,211,238,.70);
}
[data-cag-theme="dark"][data-cag-tone="device"] {
  --cag-dot: #67e8f9;
  --cag-halo: radial-gradient(56% 132% at 50% 52%, rgba(34,211,238,.36) 0%, rgba(99,102,241,.22) 44%, rgba(0,0,0,0) 74%);
  --cag-edge:
    inset 0 0 1px rgba(255,255,255,.20),
    inset 0 1px 0 rgba(255,255,255,.22),
    inset 0 0 24px -9px rgba(34,211,238,.50);
}

/* ── phase=done：think 转翠绿（完成语义）──
   ⚠️ 只改 ink / dot / 雾光，**不动底色与模糊、也不动形象颜色** ——
      胶囊的"材质"与 AI 的身份色都是恒定项，换相位不换它们，否则完成瞬间会像换了个组件。 */
.cag-pill-stack-done {
  --cag-ink: #065f46;
  --cag-dot: #059669;
  --cag-halo: radial-gradient(56% 132% at 50% 52%, rgba(52,211,153,.34) 0%, rgba(132,204,22,.16) 44%, rgba(255,255,255,0) 74%);
  --cag-edge:
    inset 0 0 1px rgba(255,255,255,.92),
    inset 0 1px 0 rgba(255,255,255,.96),
    inset 0 0 22px -9px rgba(52,211,153,.58);
}
[data-cag-theme="dark"] .cag-pill-stack-done {
  --cag-ink: #a7f3d0;
  --cag-dot: #6ee7b7;
  --cag-halo: radial-gradient(56% 132% at 50% 52%, rgba(52,211,153,.38) 0%, rgba(132,204,22,.18) 44%, rgba(0,0,0,0) 74%);
  --cag-edge:
    inset 0 0 1px rgba(255,255,255,.20),
    inset 0 1px 0 rgba(255,255,255,.22),
    inset 0 0 24px -9px rgba(52,211,153,.52);
}
/* device 的完成态**不回绿**（沿用 v4 定稿：完成语义交给文案+表情，色相全程青蓝） */
[data-cag-tone="device"] .cag-pill-stack-done {
  --cag-ink: #0b4a5c;
  --cag-dot: #0891b2;
  --cag-halo: radial-gradient(56% 132% at 50% 52%, rgba(34,211,238,.38) 0%, rgba(99,102,241,.18) 44%, rgba(255,255,255,0) 74%);
  --cag-edge:
    inset 0 0 1px rgba(255,255,255,.92),
    inset 0 1px 0 rgba(255,255,255,.96),
    inset 0 0 22px -9px rgba(103,232,249,.60);
}
[data-cag-theme="dark"][data-cag-tone="device"] .cag-pill-stack-done {
  --cag-ink: #a5f3fc;
  --cag-dot: #67e8f9;
  --cag-halo: radial-gradient(56% 132% at 50% 52%, rgba(103,232,249,.40) 0%, rgba(99,102,241,.20) 44%, rgba(0,0,0,0) 74%);
  --cag-edge:
    inset 0 0 1px rgba(255,255,255,.22),
    inset 0 1px 0 rgba(255,255,255,.24),
    inset 0 0 24px -9px rgba(103,232,249,.55);
}

/* ── 材质消费（唯一一条）── */
.cag-pill {
  position: relative; z-index: 1;
  display: inline-flex; align-items: center; gap: 9px;
  padding: 6px 15px 6px 6px; border-radius: 999px;
  font-size: 13px; font-weight: 600; letter-spacing: .01em; line-height: 1.2;
  white-space: nowrap;
  color: var(--cag-ink);
  background-color: var(--cag-bg);
  background-image: var(--cag-sheen);
  border: 1px solid var(--cag-line);
  box-shadow: var(--cag-shadow), var(--cag-edge);
  -webkit-backdrop-filter: blur(calc(20px * var(--dc-mat-scale, 1))) saturate(1.70) brightness(1.06) contrast(1.02);
  backdrop-filter: blur(calc(20px * var(--dc-mat-scale, 1))) saturate(1.70) brightness(1.06) contrast(1.02);
  transition: color .35s ease, border-color .35s ease, box-shadow .35s ease, background-color .35s ease;
}
/* 文案：给一点光学补偿 —— 胶囊里左侧有个深色球，纯居中会显得字偏上 */
.cag-label { display: inline-block; padding-top: .5px; }

/* 三点：单色（跟随 tone 的 dot），比旧版的双色渐变收敛得多 */
.cag-dots { display: inline-flex; align-items: center; gap: 3px; margin-left: 1px; }
.cag-dots i {
  width: 4px; height: 4px; border-radius: 50%; display: block;
  background: var(--cag-dot);
  animation: cagDot 1.15s ease-in-out infinite;
}
.cag-dots i:nth-child(2) { animation-delay: .18s; }
.cag-dots i:nth-child(3) { animation-delay: .36s; }
@keyframes cagDot {
  0%, 100% { transform: translateY(0) scale(.82); opacity: .32; }
  50%      { transform: translateY(-2.5px) scale(1); opacity: 1; }
}

/* ===== 形象槽位（Grok Bot · 统一品牌绿）=====
   🚨 槽位固定深墨绿底，**不随主题 / tone / phase 变**（2026-10-27 用户：「grokorb 统一用那个品牌绿」）：
      · 球体本身是品牌绿渐变（#35E39B → #00B368）+ 白眼睛，见上方 GROKBOT_EMERALD_PALETTE；
      · 槽位底色必须"深且带绿" —— 深空蓝会让绿球边缘泛脏，纯黑则让球失去呼应；
      · 外圈 1px 亮绿描边 + 一层绿辉光，是球与玻璃胶囊之间的分界线（缺了它就"浮"不进胶囊）。
      · 不用 light 版配色（白球 + 浅蓝描边）压在白胶囊上只剩两道细线，旧版截图实测确认。
   ⚠️ overflow:hidden 是必要的：GrokOrbBody 的 svg 设了 overflow:visible，
      不裁会在胶囊里溢出发虚的一圈。 */
.cag-orb {
  position: relative;
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; flex: 0 0 26px;
  border-radius: 50%;
  overflow: hidden;
  background: radial-gradient(circle at 50% 34%, #0d2a21, #04120e 78%);
  box-shadow:
    0 0 0 1px rgba(53,227,155,.50),
    0 0 14px -3px rgba(0,179,104,.70),
    inset 0 1px 1px rgba(255,255,255,.16),
    inset 0 -3px 7px -3px rgba(0,0,0,.38);
  transition: box-shadow .35s ease;
}

/* ============================================================
   ===== tone="device"：控制设备 = 电光青蓝 Cyber Cyan =====
   🚨 四次修订记录（别走回头路，每一步都是用户原话）：
     ① v1 品牌绿 → 「光的颜色不要是绿色因为和平台主题色撞了。所以就看不清」
        原因：设备控制页本身就是绿主场（绿按钮 / 绿开关 / 浅绿氛围光），
        绿光带扫在绿底上直接糊掉，全屏只剩"页面在发绿"，等于没有反馈。
     ② v2 暖琥珀金 → 「用科技一点的！！！感觉不高级不智能这个颜色！要渐变的那种」
        原因：单色暖金偏"警示灯 / 工业仪表"，没有科技感。
     ③ v3 青蓝渐变（亮色系 #22D3EE 起）→ 实拍复核：**浅底上发白发灰，像雾不像光**
        原因：cyan-400 在白底对比不足，且浅色下 halo 过重 → 全屏淡蓝薄雾。
     ④ v4（当前）**浅 / 深双套色 + 电光亮核**：
        · 浅色底走**深色系**青蓝（cyan-700 → cyan-600 → sky-500 → indigo-600），
          白底上才有"电光"的实色对比；
        · 深色底走**亮色系**（cyan-400 → cyan-300 → sky-400 → indigo-400），暗底发光；
        · 渐变中段插一道**近白亮核**（overexposed core）—— 这是"发光"与"渐变条"的
          分水岭：真实光源中心一定过曝，只有色相过渡会显得像塑料。
   取色语汇：青 → 冰青 → 近白 → 天蓝 → 靛 = 数据流 / 能量传输 / 电流，
             科技产品的通用视觉语言，也是"高级感"的来源。
   与 think 的区分：think = 蓝 #3B82F6 → 紫 #A78BFA → 粉 #EC4899，
             device 完全不含紫 / 粉，一眼分辨"改画布"还是"动设备"。
   落点：整段置于 CSS 最后（同权重后写者赢），且**显式覆盖 done 相位**
        —— 品牌绿已从本 tone 彻底移除，running / done 全程零绿。
   ============================================================ */
/* --- 光晕：加厚但**浅色下收敛透明度**（否则变雾）--- */
[data-cag-tone="device"] .cag-halo { filter: blur(20px); opacity: .34; }
[data-cag-tone="device"] .cag-halo.cag-sweep-h { height: 26px; }
[data-cag-tone="device"] .cag-halo.cag-sweep-v { width: 26px; }
[data-cag-theme="dark"][data-cag-tone="device"] .cag-halo { opacity: .5; }

/* --- running · 浅色底：深色系青蓝（白底可读）--- */
[data-cag-tone="device"] .cag-sweep-h {
  background-image: linear-gradient(90deg,
    rgba(14,116,144,0) 0%,
    rgba(14,116,144,.42) 16%,
    rgba(8,145,178,1) 32%,
    rgba(34,211,238,1) 42%,
    rgba(224,255,255,1) 50%,
    rgba(56,189,248,1) 58%,
    rgba(79,70,229,.96) 72%,
    rgba(79,70,229,0) 90%);
}
[data-cag-tone="device"] .cag-sweep-v {
  background-image: linear-gradient(180deg,
    rgba(14,116,144,0) 0%,
    rgba(14,116,144,.42) 16%,
    rgba(8,145,178,1) 32%,
    rgba(34,211,238,1) 42%,
    rgba(224,255,255,1) 50%,
    rgba(56,189,248,1) 58%,
    rgba(79,70,229,.96) 72%,
    rgba(79,70,229,0) 90%);
}
[data-cag-tone="device"] .cag-breathe {
  box-shadow:
    inset 0 0 26px rgba(8,145,178,.20),
    inset 0 0 74px rgba(56,189,248,.13),
    inset 0 0 128px rgba(79,70,229,.08);
}

/* --- 四角角标：加大到 36px（HUD 取景框），深青→亮青发光 --- */
[data-cag-tone="device"] .cag-corner { width: 36px; height: 36px; }
[data-cag-tone="device"] .cag-corner::before,
[data-cag-tone="device"] .cag-corner::after {
  background: linear-gradient(90deg, #0e7490, #0891b2, #22d3ee);
}
@keyframes cagCornerDevice {
  0%, 100% { opacity: .4;  box-shadow: 0 0 7px rgba(8,145,178,.55); }
  50%      { opacity: 1;   box-shadow: 0 0 16px rgba(34,211,238,.95); }
}
[data-cag-tone="device"] .cag-corner::before,
[data-cag-tone="device"] .cag-corner::after { animation-name: cagCornerDevice; }

/* --- running · 深色底：亮色系青蓝（暗底发光）--- */
[data-cag-theme="dark"][data-cag-tone="device"] .cag-sweep-h {
  background-image: linear-gradient(90deg,
    rgba(6,182,212,0) 0%,
    rgba(6,182,212,.28) 16%,
    rgba(34,211,238,1) 32%,
    rgba(103,232,249,1) 42%,
    rgba(240,255,255,1) 50%,
    rgba(125,211,252,1) 58%,
    rgba(129,140,248,.96) 72%,
    rgba(129,140,248,0) 90%);
}
[data-cag-theme="dark"][data-cag-tone="device"] .cag-sweep-v {
  background-image: linear-gradient(180deg,
    rgba(6,182,212,0) 0%,
    rgba(6,182,212,.28) 16%,
    rgba(34,211,238,1) 32%,
    rgba(103,232,249,1) 42%,
    rgba(240,255,255,1) 50%,
    rgba(125,211,252,1) 58%,
    rgba(129,140,248,.96) 72%,
    rgba(129,140,248,0) 90%);
}
[data-cag-theme="dark"][data-cag-tone="device"] .cag-breathe {
  box-shadow:
    inset 0 0 34px rgba(34,211,238,.30),
    inset 0 0 90px rgba(56,189,248,.20),
    inset 0 0 150px rgba(99,102,241,.12);
}
[data-cag-theme="dark"][data-cag-tone="device"] .cag-corner::before,
[data-cag-theme="dark"][data-cag-tone="device"] .cag-corner::after {
  background: linear-gradient(90deg, #06b6d4, #22d3ee, #67e8f9);
}

/* --- done：整体提亮 + 扫速加快，但仍**保持青蓝** --- */
[data-cag-tone="device"] .cag-root.cag-done .cag-sweep-h {
  background-image: linear-gradient(90deg,
    rgba(8,145,178,0) 0%,
    rgba(8,145,178,.46) 16%,
    rgba(6,182,212,1) 32%,
    rgba(103,232,249,1) 42%,
    rgba(236,254,255,1) 50%,
    rgba(56,189,248,1) 58%,
    rgba(99,102,241,.96) 72%,
    rgba(99,102,241,0) 90%);
  animation-duration: 1.9s;
}
[data-cag-tone="device"] .cag-root.cag-done .cag-sweep-v {
  background-image: linear-gradient(180deg,
    rgba(8,145,178,0) 0%,
    rgba(8,145,178,.46) 16%,
    rgba(6,182,212,1) 32%,
    rgba(103,232,249,1) 42%,
    rgba(236,254,255,1) 50%,
    rgba(56,189,248,1) 58%,
    rgba(99,102,241,.96) 72%,
    rgba(99,102,241,0) 90%);
  animation-duration: 1.9s;
}
[data-cag-tone="device"] .cag-root.cag-done .cag-breathe {
  box-shadow:
    inset 0 0 28px rgba(6,182,212,.26),
    inset 0 0 80px rgba(56,189,248,.17),
    inset 0 0 136px rgba(99,102,241,.10);
}
@keyframes cagCornerDeviceDone {
  0%, 100% { opacity: .52; box-shadow: 0 0 7px rgba(34,211,238,.6); }
  50%      { opacity: 1;   box-shadow: 0 0 18px rgba(165,243,252,.95); }
}
[data-cag-tone="device"] .cag-root.cag-done .cag-corner::before,
[data-cag-tone="device"] .cag-root.cag-done .cag-corner::after {
  background: linear-gradient(90deg, #06b6d4, #67e8f9, #a5f3fc);
  animation-name: cagCornerDeviceDone;
}
[data-cag-theme="dark"][data-cag-tone="device"] .cag-root.cag-done .cag-sweep-h {
  background-image: linear-gradient(90deg,
    rgba(34,211,238,0) 0%,
    rgba(34,211,238,.3) 16%,
    rgba(103,232,249,1) 32%,
    rgba(165,243,252,1) 42%,
    rgba(245,255,255,1) 50%,
    rgba(125,211,252,1) 58%,
    rgba(129,140,248,.96) 72%,
    rgba(129,140,248,0) 90%);
}
[data-cag-theme="dark"][data-cag-tone="device"] .cag-root.cag-done .cag-sweep-v {
  background-image: linear-gradient(180deg,
    rgba(34,211,238,0) 0%,
    rgba(34,211,238,.3) 16%,
    rgba(103,232,249,1) 32%,
    rgba(165,243,252,1) 42%,
    rgba(245,255,255,1) 50%,
    rgba(125,211,252,1) 58%,
    rgba(129,140,248,.96) 72%,
    rgba(129,140,248,0) 90%);
}
[data-cag-theme="dark"][data-cag-tone="device"] .cag-root.cag-done .cag-breathe {
  box-shadow:
    inset 0 0 38px rgba(103,232,249,.34),
    inset 0 0 96px rgba(56,189,248,.22),
    inset 0 0 158px rgba(129,140,248,.14);
}
[data-cag-theme="dark"][data-cag-tone="device"] .cag-root.cag-done .cag-corner::before,
[data-cag-theme="dark"][data-cag-tone="device"] .cag-root.cag-done .cag-corner::after {
  background: linear-gradient(90deg, #22d3ee, #67e8f9, #a5f3fc);
}

/* 胶囊与形象的 device done 覆盖已在「材质变量」一节完成 —— 这里只留暗色态下
   外侧 halo（整屏光带）的亮度微调，避免两条规则又打架。 */
[data-cag-theme="dark"][data-cag-tone="device"] .cag-root.cag-done .cag-halo { opacity: .52; }
`

/** 退场淡出时长（ms）—— 也要足够被看见，不能"啪"地消失 */
const EXIT_MS = 450

/**
 * Grok Bot 的配色 —— **统一品牌绿**（2026-10-27 用户二次要求：「grokorb 统一用那个品牌绿」）
 *
 * 🚨 不要再按 tone（think / device）或 phase（running / done）分色。
 *    前一版让形象跟着 tone 走（思考=靛蓝眼、控设备=电光青眼、完成=翠绿眼），
 *    用户明确否决：形象是**平台 AI 的化身**，它的颜色是身份，不是状态指示器 ——
 *    状态由文案 / 胶囊内缘光 / 三点颜色表达就够了。
 *
 * 取色 = 品牌绿（对齐 EMERALD_ORB_PALETTE，AI 助手首页招呼语那颗球）：
 *   #26D294 → #00825A（在 EMERALD 的 #35E39B / #00B368 上各压深一档）——
 *   实拍 26px 复核：原始亮端放在白眼睛旁边只剩很小的亮度差，眼睛会糊在球里认不出；
 *   压深一档后白眼睛才立得住，色相仍是同一个品牌绿族（不是"深翠"）。
 *   眼睛走**纯白 + 深绿投影**：投影只负责给眼睛描一圈暗边（亮绿球上白眼睛的边界
 *   全靠这一圈），不是发光；背景够亮，眼睛不需要再亮。
 *
 * halo 显式关掉：外层 halo 会让 26px 的球在胶囊里发虚，光由 .cag-orb 的
 * box-shadow 自己给（见 CSS），两处都亮会糊成一团。
 */
const GROKBOT_EMERALD_PALETTE: Partial<OrbPalette> = {
  bodyGradientStops: ["#26D294", "#00825A"],
  bodyStroke: "rgba(0,150,90,0.38)",
  eye: "#FFFFFF",
  eyeActive: "#FFFFFF",
  eyeGlow: "rgba(6,60,40,0.85)",
  particle: "rgba(255,255,255,0.9)",
  haloActive: "none",
  haloInactive: "none",
}

export function CanvasActivityGlow({
  active,
  label = "莓小智正在修改画布…",
  phase = "running",
  tone = "think",
  dark = false,
  minVisibleMs = 3400,
}: CanvasActivityGlowProps) {
  /**
   * mounted 与 active 解耦：active 变 false 后还要把最短可见时长补满，再淡出。
   * 🚨 不能用 `active` 直接控制 AnimatePresence —— 那样执行一快就闪一下没了。
   */
  const [mounted, setMounted] = useState(active)
  const shownAtRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (active) {
      // 每一轮（含连续两次调用）都重新计时，保证新的一次也有完整的可见时长
      shownAtRef.current = Date.now()
      if (!mounted) setMounted(true)
      return
    }
    if (!mounted) return
    const wait = Math.max(0, minVisibleMs - (Date.now() - shownAtRef.current))
    timerRef.current = setTimeout(() => setMounted(false), wait)
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [active, mounted, minVisibleMs])

  const done = phase === "done"
  /**
   * 🚨 记住最后一次有效文案：宿主在收尾时会把 activity 置 null，label 随之变 undefined。
   * 但光效还要按最短时长继续挂着，若此时回落到默认文案就会出现"文案跳变"（比如通用页
   * 闪一下「莓小智正在修改画布…」）。所以这里冻结最后一次非空 label。
   *
   * ⚠️ 2026-10-27：原来是 `lastLabelRef` + 在 render 期间写 ref，
   *    eslint 的 react-hooks/refs 判为「Cannot access refs during render」（3 个 error，
   *    写这个组件的当天就在）。现在改成官方推荐的「渲染期派生 state」模式
   *    （React 文档 You Might Not Need an Effect 那一节）：
   *    label 变了就在渲染期间同步到 frozenLabel，React 会丢弃本次输出并立刻重渲染，
   *    不会多一次绘制，也不需要 effect —— 语义与原来的 ref 冻结完全一致。
   */
  const [frozenLabel, setFrozenLabel] = useState(label)
  if (label && label !== frozenLabel) setFrozenLabel(label)
  const effectiveLabel = label || frozenLabel || ""
  /**
   * 去掉文案末尾的省略号 —— **running 与 done 都一样**。
   * 理由：胶囊右侧那三个跳动点本身就是"进行中"的动效语言，文案再挂一个「…」
   * 是同一件事说两遍（实拍效果是「正在修改画布… •••」，标点重复、右侧发挤）。
   * 只吃「…」和「...」，不动中文句号「。」和单个英文句点。
   */
  const displayLabel = effectiveLabel.replace(/(?:…+|\.{3,})$/, "").trimEnd()

  /* Grok Bot 形象恒定用品牌绿：不随 tone / phase 换色（见文件上方常量注释）。
     所以这里不再需要 useMemo —— 常量对象直接传下去即可。 */

  return (
    <AnimatePresence>
      {mounted && (
        <motion.div
          key="canvas-activity-glow"
          data-copilot-canvas-glow=""
          data-cag-theme={dark ? "dark" : "light"}
          data-cag-tone={tone}
          data-cag-phase={phase}
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: EXIT_MS / 1000, ease: "easeInOut" }}
          style={{ position: "fixed", inset: 0, zIndex: 190, pointerEvents: "none" }}
        >
          <style>{CSS}</style>

          <div className={`cag-root${done ? " cag-done" : ""}`}>
            {/* 厚光晕（先画，落在主光带外侧） */}
            <div className="cag-sweep-h cag-halo cag-sweep-t" />
            <div className="cag-sweep-h cag-halo cag-sweep-b" />
            <div className="cag-sweep-v cag-halo cag-sweep-l" />
            <div className="cag-sweep-v cag-halo cag-sweep-r" />

            {/* 主光带 */}
            <div className="cag-sweep-h cag-sweep-t" />
            <div className="cag-sweep-h cag-sweep-b" />
            <div className="cag-sweep-v cag-sweep-l" />
            <div className="cag-sweep-v cag-sweep-r" />

            {/* 内侧呼吸渐晕 */}
            <div className="cag-breathe" />

            {/* 四角角标 */}
            <span className="cag-corner cag-corner-tl" />
            <span className="cag-corner cag-corner-tr" />
            <span className="cag-corner cag-corner-bl" />
            <span className="cag-corner cag-corner-br" />
          </div>

          {/* 状态胶囊（外层 flex 容器负责居中；stack 负责"雾光垫在玻璃背后"） */}
          <div className="cag-pill-wrap">
            <div className={`cag-pill-stack${done ? " cag-pill-stack-done" : ""}`}>
              <span className="cag-pill-halo" />

              <motion.div
                className="cag-pill"
                data-cag-pill=""
                initial={{ opacity: 0, y: 10, scale: .96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: .97 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="cag-orb" aria-hidden>
                  {/* 🚨 variant="orb" 是必须的：走 auto/video 时 26px 会命中
                      berry-orb 的 clipTooSmall 分支，只显示静态首帧（一颗看不出脸的色块）。 */}
                  <BerryOrb
                    variant="orb"
                    size="26px"
                    theme="dark"
                    isActive={!done}
                    expression={done ? "happy" : "working"}
                    paused={false}
                    trails={false}
                    palette={GROKBOT_EMERALD_PALETTE}
                  />
                </span>
                <span className="cag-label">{displayLabel}</span>
                {!done && (
                  <span className="cag-dots">
                    <i />
                    <i />
                    <i />
                  </span>
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default CanvasActivityGlow
