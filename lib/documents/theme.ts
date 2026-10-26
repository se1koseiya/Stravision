/**
 * 生成物视觉令牌（晨雾松 emerald × zinc）
 *
 * ## 为什么单独抽这一层
 *
 * 生成 docx / pptx / pdf / xlsx 时，颜色与字号原本散落在各渲染器里，
 * 于是「同一份内容导出成四种格式」会得到四种深浅不同的绿 ——
 * 这种不一致一眼就能被用户看出来，而且很难靠肉眼调齐。
 *
 * 这里把
 *   · 色板（emerald 主色 / zinc 中性色 / 语义色）
 *   · 字号阶梯
 *   · 间距与圆角
 * 收敛成**唯一来源**，四个渲染器只准从这里取色。
 *
 * ⚠️ 与 landing-v4 同源（亮 #059669 / 暗 #34D399），保证「站内看到的绿」与「导出的绿」是同一个。
 *
 * ## 关于中文字体
 *
 * 三种格式的字体写法不同（OOXML 要 eastAsia / PDF 要嵌子集 / HTML 要 font-family），
 * 但字体族的选择必须一致，否则同一份报告在 Word 与 PPT 里行高不一样、页数也不一样。
 */

/** 主色（晨雾松） */
export const EMERALD = {
  /** 亮色模式下的主色（用于打印/白底文档） */
  light: '059669',
  /** 暗色模式下的主色（屏幕上更亮一档才压得住底色） */
  dark: '34D399',
  /** 深压印色：大段色块 / 章节封面用 */
  deep: '065F46',
  /** 淡底：表头、卡片底、代码块底 */
  wash: 'ECFDF5',
}

/** 中性色（zinc 系，与项目 tailwind 默认一致） */
export const ZINC = {
  ink: '1F2328',
  body: '3F4642',
  mute: '5A6460',
  faint: '8A9490',
  hairline: 'E3E8E6',
  surface: 'F6F7F7',
  white: 'FFFFFF',
  /** 暗底文档用（PDF 不区分，PPT 暗色模板预留） */
  darkBg: '101413',
}

/** 语义色 —— 一对一，禁止混用 */
export const SEMANTIC = {
  /** 危险 / 负向 */
  danger: 'DC2626',
  /** 警告 */
  warn: 'D97706',
  /** 正常 / 正向 */
  ok: '059669',
  /** 信息 */
  info: '0284C7',
}

/**
 * 字体族。
 *
 * HarmonyOS Sans SC 与站内一致；导出物里额外给一组跨平台回退，
 * 因为用户很可能在没有该字体的电脑（客户机、投影电脑）上打开。
 */
export const FONT_FAMILY = 'HarmonyOS Sans SC'
export const FONT_FALLBACK = 'Microsoft YaHei, PingFang SC, Source Han Sans SC, Noto Sans CJK SC, sans-serif'
export const MONO_FAMILY = 'JetBrains Mono, Consolas, Menlo, monospace'

/** 16:9 画布（EMU）—— pptx 唯一单位 */
export const SLIDE_EMU = { w: 12192000, h: 6858000 }

/** 安全边距（EMU，0.625in）与内容宽度 */
export const SLIDE_MARGIN_X = 571500

/**
 * 字号阶梯（pt）。
 *
 * 为什么是这几个值：投影/打印混合场景下的实测可读区间 ——
 * 小于 12pt 在投影上会糊，大于 44pt 一页放不下几个字。
 */
export const TYPE = {
  coverTitle: 44,
  sectionTitle: 36,
  slideTitle: 32,
  lead: 20,
  body: 16,
  caption: 12,
  footer: 10,
}

/** 间距（EMU，1vp = 12700 EMU；这里给常用档位） */
export const SPACE = {
  xs: 45720, // 3.6pt
  sm: 91440, // 7.2pt
  md: 137160,
  lg: 228600,
  xl: 342900,
}

/** 圆角：接入三级同心，见项目设计系统 */
export const RADIUS = { sm: 4, md: 8, lg: 16, xl: 20, full: 32 }

/** 16:9 画布的 pt 尺寸（= SLIDE_EMU / 12700），前端预览按这个逻辑尺寸排版 */
export const SLIDE_PT = {
  w: SLIDE_EMU.w / 12700, // 960
  h: SLIDE_EMU.h / 12700, // 540
}

/**
 * PPTX 版式度量（pt）。
 *
 * 渲染器（写 OOXML）与前端预览（写 HTML）**共用这一份数值**：
 * 两边各写一套时，预览里看着正好、下载打开才发现文字压到页脚上 ——
 * 这类偏差只有把文件真正打开才看得见，是最难发现的一类 bug。
 */
export const SLIDE_METRICS = {
  titleY: 34,
  titleH: 50,
  ruleY: 90,
  ruleW: 56,
  ruleH: 2.5,
  bodyY: 112,
  /** 正文区下边界（给页脚留 54pt） */
  bodyBottom: SLIDE_PT.h - 54,
  footerY: SLIDE_PT.h - 34,
  /** 封面：左侧主色竖条 + 标题压在下方三分之一 */
  coverStripW: 14,
  coverX: 96,
  coverTitleY: 286,
  coverSubtitleY: 452,
  coverRuleY: 506,
  /** 章节页：主色满底 + 白色大标题 */
  sectionX: 96,
  sectionY: 276,
}

/** 取主色（按明暗） */
export function accent(isDark: boolean): string {
  return isDark ? EMERALD.dark : EMERALD.light
}
