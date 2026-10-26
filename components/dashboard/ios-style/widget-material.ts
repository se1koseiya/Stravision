/**
 * dashboard / iOS 小组件的页面侧补充
 *
 * 分工（单一来源）：
 *   components/device/material-css.ts  → 材质**数值**（--mat-* + .dc-mat 材质本体 + 档位 + 场景轴）
 *   本文件                              → 小组件卡 .ios-widget 的 hover / 色彩身份 / 编辑态补充
 *   绝不复制任何 --mat-* 数值 —— 档位写两处必漂移。
 *
 * ── 2026-10-22：本页的氛围层（.dash-atmos）已按用户要求**整层删除** ──
 *   旧设计是「先铺一层斜向色带 + 4 盏径向柔光，玻璃才有光可透」。
 *   这条推理本身没错，但它换来的是一整页彩色光斑 —— 用户判定「好丑」。
 *   于是判据被上收到 material-css.ts 的「场景轴」：
 *     有景（氛围光 / 桌面壁纸 / 真实内容）→ 玻璃；
 *     无景（本页这种纯色画布）→ 实色表面，且不挂 backdrop-filter。
 *   本页现在属于「无景」，所以不仅有玻璃、连 .dash-atmos 这个类也一并撤掉。
 * ⚠️ 不要再加回来。要让本页重新有氛围光，先问用户 —— 这是一次明确的产品决定，不是遗漏。
 */
export const DASHBOARD_MATERIAL_CSS = `
/* 强度仍明显低于设备控制页（那边色带 .20/.21）：dashboard 是 iOS 小组件风，
   光斑一重整页就变成"彩色页面"，小组件自己的呼吸感反而没了。 */

/* —— 浅色态：近白画布上玻璃要当「透镜」，不能当「更亮的板」 ——
   本页画布是 #F7F7F8（luma≈247）。沿用卡片档的 brightness 1.03 会把卡面推到 254，
   再叠 .34 白 —— 卡内色度被白底吃掉、亮度又顶到上限，整张卡读起来和实色白一模一样
   （实测卡内 A/B Δ = 0.33/255，也就是"改了等于没改"）。
   近白背景上的正确读法：**不加亮**（brightness 1.0），把背后的色度**放大**（saturate 2.4）
   —— 材质于是成为"把环境色聚起来的一块介质"，而不是一块更白的板。
   ⚠️ 用 html 前缀正是为了精确落在两档之间：
      html .ios-widget      (0,1,1) → 压过 .dc-mat--regular       (0,1,0)  ← 浅色态生效
      .dark .dc-mat--regular(0,2,0) → 压过 html .ios-widget                 ← 暗态仍用卡片档（暗底靠抬升出光感）
      这样不必再写一遍暗态数值，也不会和 material-css 抢。 */
html .ios-widget{
  --mat-bright: 1.0;
  --mat-sat: 2.4;
  --mat-cont: 1.03;
}

/* —— 小组件卡：材质本体 = .dc-mat + .dc-mat--regular（material-css.ts，唯一来源）——
   这里只补 dashboard 自己的三件事：
     ① hover 抬一档阴影（"受光增强"的直读）
     ② 每个小组件自己的色彩身份光晕 —— --w-tint 由卡片组件内联传入；
        静止态不加光（材质的光是事件驱动的，见 material-css 的"静止态无光"原则）
     ③ 编辑态（拖拽排列中）把阴影撤掉，网格才不会"糊"成一片
   ⚠️ 内联样式优先级高于任何 CSS 类 → 卡面不能有内联 background / border / box-shadow，
      否则材质静默失效（ios-widget-card.tsx 里有交代）。 */
.ios-widget{ --w-glow: 0 0 rgba(0,0,0,0); }
.dark .ios-widget{
  --mat-shadow: 0 1px 2px rgba(0,0,0,.34), 0 14px 34px -16px rgba(0,0,0,.50);
}
.ios-widget:hover{
  --mat-shadow: 0 2px 6px rgba(0,0,0,.05), 0 18px 40px -18px rgba(0,0,0,.16);
  box-shadow: var(--mat-shadow), var(--mat-edge), var(--w-glow);
}
.dark .ios-widget:hover{
  --mat-shadow: 0 2px 8px rgba(0,0,0,.44), 0 22px 46px -18px rgba(0,0,0,.62);
}
.ios-widget--editing,
.ios-widget--editing:hover{ box-shadow: none !important; }

/* —— ④ 按压点光源（卡片级 · HDS 六特性之④）——
   为什么小组件卡最后才补上按压光：它是**可拖拽**的网格单元，"按下"同时意味着"开始拖拽"，
   所以这里只做光、不做缩放 —— 缩放交给 react-grid-layout 的拖拽/放置，
   两套 transform 写在一起必然打架（这也是 .dc-ctrl--press 不能直接挂在卡上的原因）。
   光的位置由 pointerdown 时的 --imv-gx/--imv-gy 给出，与 ImmersiveCard 共用同一套
   变量名与关键帧（dc-imv-bloom 是全局的，见 material-css.ts）—— 同一页两处按压光
   因此是同一种"光"，不会各演一套。 */
.ios-widget-glow{
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  border-radius: inherit;
  opacity: 0;
  /* plus-lighter：把光"加"到材质上而不是盖一层白膜 —— 暗底才真的会发亮 */
  mix-blend-mode: plus-lighter;
  background-image: radial-gradient(circle var(--imv-gr, 34px) at var(--imv-gx, 50%) var(--imv-gy, 50%),
      var(--imv-glow-a, rgba(255,255,255,.70)) 0%,
      var(--imv-glow-b, rgba(255,255,255,.30)) 40%,
      rgba(255,255,255,0) 74%);
  transition: opacity .36s ease;
}
.ios-widget:active .ios-widget-glow{
  opacity: 1;
  animation: dc-imv-bloom .62s cubic-bezier(.2,.72,.3,1) both;
}
/* 亮色画布上白光会被近白背景吃掉 → 亮态的光晕换成极淡的灰调，暗态保持白光 */
:root .ios-widget-glow{ --imv-glow-a: rgba(120,132,128,.34); --imv-glow-b: rgba(120,132,128,.14); }
.dark .ios-widget-glow{ --imv-glow-a: rgba(255,255,255,.50); --imv-glow-b: rgba(255,255,255,.20); }
/* 低配 / 省电 / 关闭沉浸光感：只保留静态材质（关闭档连材质都换纯色，见 material-css.ts），光效整条关掉 */
html[data-mat-level="smooth"] .ios-widget-glow,
html[data-mat-level="off"] .ios-widget-glow{ display: none; }
@media (prefers-reduced-motion: reduce){
  .ios-widget:active .ios-widget-glow{ animation: none }
}

/* —— 移除小组件时的「收」：先内收 + 失焦，粒子同时迸出 ——
   时长必须和 components/dashboard/widget-dissolve.ts 的 DISSOLVE_HOLD_MS 对齐（300ms）：
   收完才轮到网格回流，节奏是「卡收掉 → 其余卡片上移补位」，不是"瞬间消失 + 布局跳一下"。 */
@keyframes wds-card-out{
  0%{ transform: scale(1); opacity: 1; filter: blur(0) }
  55%{ transform: scale(.965); opacity: .62; filter: blur(1.5px) }
  100%{ transform: scale(.9); opacity: 0; filter: blur(6px) }
}
.wds-card-out{
  animation: wds-card-out .3s cubic-bezier(.4,0,.72,.24) forwards !important;
  pointer-events: none;
}
`
