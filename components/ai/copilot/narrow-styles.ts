/**
 * Copilot 窄栏（400px）业务卡片兼容样式
 *
 * 【为什么独立成文件】
 * 主助手消息区是 960px 宽的舒适区，业务卡片（巡检卡 720px、bento 两列网格、
 * 表格/代码块/Mermaid/HTML 预览等）都是按宽屏设计的。Copilot 侧栏常态只有
 * 400px（内容区 ~352px），这些卡片会被挤压/溢出/被裁切。
 *
 * 逐个改 20+ 个卡片组件会波及主助手页面，风险高；这里改为**容器层作用域降级**：
 * 只有挂了 `.copilot-narrow` 的滚动容器（= 侧栏常态尺寸）内部才生效，
 * 放大态（720px）自动恢复原版式，主助手页面零影响。
 *
 * 【降级策略】
 * 1. 内联 max-width 的宽卡片 → 铺满容器（不越界、不裁切）
 * 2. 表格 / 代码块 / 图表 / HTML 预览 → 允许横向滚动（细滚动条）
 * 3. 多列 bento / 网格 → 单列
 * 4. flex 行允许换行（避免标题+按钮挤成一团）
 * 5. 字号与内边距收敛；底部 90px 留白（主助手浮层输入用）在侧栏收掉
 *
 * 【选择器说明】
 * - React 内联样式序列化**无空格**（`max-width:960px`），故两种写法都匹配一遍
 * - 卡片根节点多为内联样式，`[style*="..."]` 属性选择器是唯一能命中它们的手段
 */

export const COPILOT_NARROW_CSS = `
/* ── 1. 宽卡片铺满容器（内联 max-width 一律降级为 100%） ── */
.copilot-narrow [style*="max-width"] { max-width: 100% !important; }
.copilot-narrow .ant-bubble-content,
.copilot-narrow .ant-bubble-content > * { max-width: 100% !important; }

/* ── 2. 媒体与宽内容不越界 ── */
.copilot-narrow img,
.copilot-narrow video,
.copilot-narrow canvas,
.copilot-narrow iframe,
.copilot-narrow pre,
.copilot-narrow table { max-width: 100% !important; }
.copilot-narrow img,
.copilot-narrow video { height: auto !important; }

/* ── 3. 超宽内容允许横向滚动（表格/代码/图表/HTML 预览/Mermaid） ── */
.copilot-narrow pre,
.copilot-narrow table,
.copilot-narrow [class*="mermaid"],
.copilot-narrow [class*="Mermaid"],
.copilot-narrow [class*="preview"],
.copilot-narrow [class*="Preview"],
.copilot-narrow [class*="chart"],
.copilot-narrow [class*="Chart"] { overflow-x: auto !important; }

/* ── 4. 多列网格 / bento → 单列 ── */
.copilot-narrow [style*="grid-template-columns"] { grid-template-columns: minmax(0, 1fr) !important; }

/* ── 5. flex 行允许换行（标题 + 操作按钮不互相挤压） ── */
.copilot-narrow .ant-bubble-content [style*="display:flex"],
.copilot-narrow .ant-bubble-content [style*="display: flex"] { flex-wrap: wrap !important; }

/* ── 6. 表格 / 代码字号与内边距收敛 ── */
.copilot-narrow table { font-size: 12.5px !important; }
.copilot-narrow th,
.copilot-narrow td { padding: 6px 8px !important; white-space: normal !important; }
.copilot-narrow pre,
.copilot-narrow pre code { font-size: 12px !important; }

/* ── 7. 消息列表留白收敛（原 24px 16px 90px，90px 是主助手浮层输入位） ── */
.copilot-narrow [style*="max-width:960px"],
.copilot-narrow [style*="max-width: 960px"] { padding: 16px 12px 20px !important; }

/* ── 8. 长串（URL / 长英文 / 无空格 token）断行，避免撑破 ── */
.copilot-narrow { overflow-wrap: anywhere; word-break: break-word; }

/* ── 8.5 表格专项：table 不是 block container，overflow 不生效
        → 改 display:block 才能横向滚动；宽度取内容宽（不被 max-width 压成窄条） ── */
.copilot-narrow table {
  display: block !important;
  width: max-content !important;
  max-width: none !important;
  min-width: 100% !important;
  overflow-x: auto !important;
}

/* ── 8.6 antd 响应式栅格专项：Col 断点（sm/md/lg/xl）跟随【视口】而非容器，
        桌面大视口 + 400px 窄容器会错出 4/6 列（如 DeviceBentoGrid xl=6 → 4 列竖条）
        → sm 及以上断点一律压成 2 列（xs 保持原样，视口 <576 时本来就是 2 列） ── */
.copilot-narrow [class*="ant-col-sm-"],
.copilot-narrow [class*="ant-col-md-"],
.copilot-narrow [class*="ant-col-lg-"],
.copilot-narrow [class*="ant-col-xl-"],
.copilot-narrow [class*="ant-col-xxl-"] {
  flex: 0 0 50% !important;
  max-width: 50% !important;
}
/* 2 列化后原按 4 列算的竖分栏线必然错位 → 去掉竖线（行分隔 borderBottom 保留） */
.copilot-narrow [class*="ant-col-"] { border-right: none !important; }
/* 等高填充：Row(flex) 把 Col stretch 拉高时，内容格填满 Col，
   避免不等高格子下方露出 Row 的灰底（截图中灰色空块的来源）；
   父级非 stretch 时 height:100% 自动回退 auto，无副作用 */
.copilot-narrow [class*="ant-col-"] > div { height: 100%; }

/* ── 8.7 tailwind 网格专项（grid-cols-N 类定义在样式表，属性选择器覆盖不到）
        → auto-fit 自适应：352px 容器下 grid-cols-4/6 自动落成 2 列 ── */
.copilot-narrow [class*="grid-cols-"] {
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) !important;
}

/* ── 9. 兜底：窄视口下即使处于放大态（720 被 vw 压窄）也走同样的核心降级 ── */
@media (max-width: 560px) {
  .copilot-bubbles [style*="max-width"] { max-width: 100% !important; }
  .copilot-bubbles .ant-bubble-content > * { max-width: 100% !important; }
  .copilot-bubbles [style*="grid-template-columns"] { grid-template-columns: minmax(0, 1fr) !important; }
  .copilot-bubbles pre,
  .copilot-bubbles table { max-width: 100% !important; overflow-x: auto !important; }
}
`
