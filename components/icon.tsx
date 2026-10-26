"use client";

/**
 * 统一图标入口（全站图标基础设施）— 🔷 100% HarmonyOS Symbol，**无兜底**
 *
 * 迁移记录：
 * - 2026-09-19：从 @icon-park/react 全量迁移到 lucide-react（IconPark 描边在
 *   14–20px 偏细、转角 miter 偏尖）。
 * - 2026-09-25：图标主体切换到 **HarmonyOS Symbol**（华为 HarmonyOS 主题图标库，
 *   https://developer.huawei.com/consumer/cn/design/harmonyos-symbol/）。
 * - 2026-09-25（二轮）：**取消 lucide 兜底**。首轮把 197 个图标换成 HarmonyOS，
 *   51 个「HarmonyOS 没有对应图标」的概念仍回退 lucide —— 结果是同一屏里
 *   描边（lucide 2px round）与填充轮廓（HarmonyOS）两套画风混排，观感割裂。
 *   现改为：51 个概念全部重映射到**语义最接近的 HarmonyOS 字形**
 *   （哪怕语义略松，也要保证全站只有一套画风），248/248 全部命中。
 *
 * ── 图标来源（唯一来源）────────────────────────────────────────────
 * `HARMONY_SYMBOL_ICON_MAP[图标名]` → `HARMONY_SYMBOL_PATHS[字形名]` → 渲染字形。
 * 字形数据见 `@/components/harmonyos-symbol-data`（自动生成，wght=400）。
 * 未命中时**不再回退任何第三方图标库**，而是渲染醒目的占位方框并在 dev 报错
 * （见 {@link createMissingIcon}）—— 目的是让"漏映射"当场暴露，而不是静默换画风。
 * 运行时自检清单见 {@link UNMAPPED_ICONS}（现应恒为空数组）。
 *
 * 🚨 因此 `createIcon(_base, displayName)` 的第二个参数 `displayName` 是**分发键**，
 *    它必须严格等于 `HARMONY_SYMBOL_ICON_MAP` 里的项目图标名（如 `"IconHome"`）。
 *    新增/改动图标时别写错，否则会渲染成占位方框。
 *
 * ── 设计要点 ──────────────────────────────────────────────────────
 * - **API 完全向后兼容**：248 个具名导出的名字与 props 不变，
 *   ~230 个调用方文件（`import { IconX } from "@/components/icon"`）零改动。
 * - `size` 同时支持 number / string（内部做兜底转换）
 * - 统一包一层 `<span style={{display:'inline-flex', lineHeight:0, verticalAlign:'middle'}}>`，
 *   避免 inline SVG 撑高行盒（与迁移前行为一致）
 * - 🚨 `verticalAlign: 'middle'` 是**图标与文字对齐的关键**，勿删：
 *   行内（非 flex 行）使用时，span 的基线 = 图标底边，`baseline` 会让图标压在文字基线上
 *   → 图标视觉上偏高 3–6.5px。实测（`_calib2.mjs`，40 组 图标尺寸×字号 组合）：
 *     baseline → |Δ| 均值 3.31 / 峰值 6.50；middle → 0.87 / 1.45，且 **Δ 与图标尺寸无关**
 *     （-0.22em 等长度值会随图标尺寸漂移，均值 1.39，故不用）。
 *   在 flex/grid 容器里 `vertical-align` 会被忽略，因此对已有的 `flex items-center` 行零影响。
 *   `style` 在最后合并，调用方仍可用 `style={{verticalAlign:'baseline'}}` 显式覆盖。
 * - 🚨 外层 span 恒带 `data-icon`（2026-10-22）：globals.css 用
 *   `[data-icon]:has(+ span|a|b|…)` 命中「图标紧跟文字」的行，再给 1/8 自身高度的
 *   光学下移 —— flex 行里 vertical-align 失效，这是唯一一处能把「图标中心」
 *   拉到「文字视觉中心」的钩子。**别删这个属性**，删了全站图标又会偏高 2px。
 *   纯图标按钮（后面没有文字兄弟）天然不命中，保持几何居中。
 * - ⚠️ **`strokeWidth` 对图标无效**：HarmonyOS Symbol 是**填充轮廓**
 *   （外轮廓 + 反向内轮廓形成镂空），不是描边图形，没有"线宽"概念 ——
 *   其粗细由字体 `wght` 轴决定，本文件统一使用官方 Regular（400），
 *   经与原 lucide `strokeWidth=2` 的同尺寸对照实测，两者视觉权重基本一致。
 *   签名保留（被解构后丢弃）仅为了不影响 ~230 个既有调用方传参。
 * - `theme` / `spin` 为 IconPark 时代的历史 props，保留签名不再使用：
 *   `spin` 映射为 CSS 旋转动画；`theme` 忽略。
 *
 * 用法：
 * ```tsx
 * import { IconHome, IconSearch } from "@/components/icon";
 * <IconHome />
 * <IconSearch size={20} />
 * ```
 *
 * @see https://developer.huawei.com/consumer/cn/design/harmonyos-symbol/
 */

import * as React from "react";

import {
  HARMONY_SYMBOL_ICON_MAP,
  HARMONY_SYMBOL_PATHS,
  HARMONY_SYMBOL_TRANSFORM,
} from "@/components/harmonyos-symbol-data";

export type IconTheme = "outline" | "filled" | "two-tone" | "multi-color";

/**
 * 历史遗留的「全局描边宽度」常量。
 *
 * ⚠️ **对当前图标已完全无效**：HarmonyOS Symbol 是填充轮廓，没有线宽概念，
 *    `strokeWidth` 会被 {@link createSymbolIcon} 解构后丢弃。
 *    保留导出只是为了让旧代码 `import { DEFAULT_STROKE_WIDTH }` 不报错，
 *    数值仍是当年 lucide 的官方默认值 2。
 */
export const DEFAULT_STROKE_WIDTH = 2;

/** 图标 viewBox 尺寸基准（HarmonyOS Symbol 设计盒 1:1，映射后同样落在 24×24） */
const ICON_BASE_SIZE = 24;

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, "size" | "color" | "ref"> {
  /** 尺寸（px），默认 16。字符串会按 px 解析，解析失败回退 16 */
  size?: number | string;
  /** 颜色，默认 currentColor（继承父级文字颜色） */
  color?: string | string[];
  /** @deprecated IconPark 时代的主题参数，现在无效，保留仅为兼容旧调用 */
  theme?: IconTheme;
  /** @deprecated 填充轮廓图标没有线宽，传了也会被忽略 */
  strokeWidth?: number;
  /** 是否旋转动画 */
  spin?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 把 size（可能是 `"16px"` / `"1.2em"` / `16`）归一化成 svg 的 width/height 数字。
 */
function normalizeSize(size: number | string | undefined): number {
  if (typeof size === "number") return Number.isFinite(size) ? size : 16;
  if (typeof size === "string") {
    const parsed = parseFloat(size);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 16;
}

/** 外层 span 的公共样式（行盒不撑高 + 光学对齐 + 旋转动画），详见文件头注释 */
function outerSpanStyle(
  spin: boolean | undefined,
  style: React.CSSProperties | undefined
): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 0,
    // 行内使用时的光学对齐（详见文件头注释）；flex 容器内会被忽略
    verticalAlign: "middle",
    ...(spin ? { animation: "stravision-icon-spin 1s linear infinite" } : null),
    ...style,
  };
}

/**
 * 内层 svg 的尺寸约束。
 *
 * 🚨 保持正方形：调用方常用 className="size-3"/"w-3.5 h-3.5" 给外层盒子定尺寸，
 * 而 svg 仍是 size 指定的 16px。svg 作为 flex item 默认会被**只压主轴**，
 * 于是出现 12×16 这类被纵向拉伸的畸形图标（实测 device-control / subscription /
 * my-mcp 等多处）。flexShrink:0 先禁止非等比压缩，再用 max-width/height:100%
 * 做**等比**收窄，使图标最终等于外层盒子声明的尺寸（size-3 → 12×12）。
 */
const INNER_SVG_STYLE: React.CSSProperties = {
  flexShrink: 0,
  maxWidth: "100%",
  maxHeight: "100%",
};

/**
 * 把 HarmonyOS Symbol 字形（字体单位路径 d）包成统一 API 的图标组件。
 *
 * 渲染要点：
 * - 字形是**填充轮廓** → `fill={color}`；镂空靠 `fill-rule="nonzero"` +
 *   字体自身的反向内轮廓，与 HarmonyOS 系统内渲染完全一致。
 * - 路径保留字体原始整数坐标，靠 `<g transform>` 映射到 24×24 viewBox，
 *   无损且体积最小（见 `harmonyos-symbol-data.ts` 头部说明）。
 * - `strokeWidth` 对符号图标无意义（无描边概念），在此剔除，避免透传到 DOM。
 */
function createSymbolIcon(pathData: string, symbolName: string, displayName: string) {
  const Wrapped = React.forwardRef<HTMLSpanElement, IconProps>(function Icon(
    {
      size = 16,
      color = "currentColor",
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      theme: _theme,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      strokeWidth: _strokeWidth,
      spin,
      className,
      style,
      ...rest
    },
    ref
  ) {
    const px = normalizeSize(size);
    const fill = Array.isArray(color) ? color[0] : color;

    return (
      <span ref={ref} className={className} style={outerSpanStyle(spin, style)} data-icon="">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${ICON_BASE_SIZE} ${ICON_BASE_SIZE}`}
          width={px}
          height={px}
          fill={fill}
          style={INNER_SVG_STYLE}
          {...rest}
        >
          {/* 字形坐标为字体单位（upem=1000），仅在 group 上做一次坐标变换 */}
          <g transform={HARMONY_SYMBOL_TRANSFORM}>
            <path d={pathData} fillRule="nonzero" />
          </g>
        </svg>
      </span>
    );
  });
  Wrapped.displayName = displayName;
  return Wrapped;
}

/**
 * 未映射图标的占位渲染 —— **不再回退第三方图标库**（见文件头「取消 lucide 兜底」）。
 *
 * 全站 248 个图标名都已命中 HarmonyOS Symbol，正常情况永不触发；只有
 * `scripts/harmonyos-symbol/generate.mjs` 的 `PROJECT_TO_SYMBOL` 漏了某个新图标名
 * 而数据未重新生成时才会出现。此时渲染一个**虚线方框**（跟随 currentColor），
 * 让问题在 UI 上肉眼可见、在 dev 控制台报错，而不是静默换成另一种画风。
 */
function createMissingIcon(displayName: string) {
  const Wrapped = React.forwardRef<HTMLSpanElement, IconProps>(function Icon(
    {
      size = 16,
      // 这些 props 不适用于纯 SVG 透传（color/strokeWidth 是自定义类型），
      // 必须解构掉，否则 `...rest` 展开到 <svg> 会触发 TS2322。
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      color: _color,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      theme: _theme,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      strokeWidth: _strokeWidth,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      spin: _spin,
      className,
      style,
      ...rest
    },
    ref
  ) {
    const px = normalizeSize(size);

    return (
      <span ref={ref} className={className} style={outerSpanStyle(false, style)} data-icon="">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${ICON_BASE_SIZE} ${ICON_BASE_SIZE}`}
          width={px}
          height={px}
          fill="none"
          style={INNER_SVG_STYLE}
          {...rest}
        >
          <rect
            x="2.75"
            y="2.75"
            width="18.5"
            height="18.5"
            rx="3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
        </svg>
      </span>
    );
  });
  Wrapped.displayName = displayName;
  return Wrapped;
}

/**
 * 图标工厂 —— 全站唯一的图标创建入口。
 *
 * 🚨 `displayName` 是**分发键**，必须严格等于项目图标名（如 `"IconHome"`）：
 *   命中 {@link HARMONY_SYMBOL_ICON_MAP} → HarmonyOS Symbol 字形；
 *   未命中 → 占位方框 + dev 报错（**无第三方兜底**）。
 *
 */
export function createIcon(displayName: string) {
  const symbolName = HARMONY_SYMBOL_ICON_MAP[displayName];
  const pathData = symbolName ? HARMONY_SYMBOL_PATHS[symbolName] : undefined;
  if (pathData) return createSymbolIcon(pathData, symbolName, displayName);

  if (process.env.NODE_ENV !== "production") {
    console.error(
      `[icon] 「${displayName}」没有 HarmonyOS Symbol 映射 —— 请在 ` +
        `scripts/harmonyos-symbol/generate.mjs 的 PROJECT_TO_SYMBOL 里补上对应字形名，` +
        `再重新生成 components/harmonyos-symbol-data.ts。`
    );
  }
  return createMissingIcon(displayName);
}

/**
 * 全部图标名清单（单一事实来源）。
 *
 * 每个名字都必须能在 `harmonyos-symbol-data.ts` 的 `HARMONY_SYMBOL_ICON_MAP`
 * 里查到字形，否则渲染成占位方框（见 {@link createMissingIcon}）。
 * 名字由 `scripts/harmonyos-symbol/generate.mjs` 的 `PROJECT_TO_SYMBOL` 驱动，
 * 两边必须一致 —— 新增图标请先补 PROJECT_TO_SYMBOL 再重新生成数据。
 */
export const ICON_EXPORT_NAMES = [
  "IconHome",
  "IconLayoutTwo",
  "IconSidebarPanel",
  "IconHamburgerButton",
  "IconLeft",
  "IconRight",
  "IconUp",
  "IconDown",
  "IconArrowLeft",
  "IconArrowRight",
  "IconArrowUp",
  "IconArrowUpSolid",
  "IconArrowDown",
  "IconArrowRightUp",
  "IconArrowCircleUp",
  "IconSort",
  "IconExchange",
  "IconDrag",
  "IconFullScreen",
  "IconFullScreenOne",
  "IconOffScreen",
  "IconOffScreenOne",
  "IconMonitor",
  "IconIpad",
  "IconPhone",
  "IconLaptop",
  "IconPlus",
  "IconMinus",
  "IconClose",
  "IconCloseOne",
  "IconCheck",
  "IconCheckOne",
  "IconCheckCorrect",
  "IconCopy",
  "IconEdit",
  "IconDelete",
  "IconRotate",
  "IconTool",
  "IconSave",
  "IconDownload",
  "IconUpload",
  "IconShare",
  "IconSend",
  "IconSearch",
  "IconFilter",
  "IconRefresh",
  "IconUndo",
  "IconRedo",
  "IconPin",
  "IconLink",
  "IconLinkOut",
  "IconLinkIn",
  "IconUnlink",
  "IconPreviewOpen",
  "IconPreviewClose",
  "IconLock",
  "IconUnlock",
  "IconKey",
  "IconPower",
  "IconPencil",
  "IconScan",
  "IconScanCode",
  "IconZoomIn",
  "IconZoomOut",
  "IconExport",
  "IconClickTap",
  "IconPlusCross",
  "IconSquareSmall",
  "IconAttention",
  "IconCaution",
  "IconInfo",
  "IconHelp",
  "IconLoading",
  "IconCloseRemind",
  "IconRemind",
  "IconRemindDisable",
  "IconShield",
  "IconShieldCheck",
  "IconCertificate",
  "IconTrophy",
  "IconStar",
  "IconFileText",
  "IconFileCode",
  "IconFileAddition",
  "IconFileEditing",
  "IconFileSearch",
  "IconFilePdf",
  "IconFilePpt",
  "IconFileWord",
  "IconFileZip",
  "IconFolder",
  "IconFolderOpen",
  "IconFolderPlus",
  "IconFolderMinus",
  "IconFolderSettings",
  "IconFolderUpload",
  "IconBook",
  "IconBookOne",
  "IconBookOpen",
  "IconBookmark",
  "IconBookshelf",
  "IconNotebook",
  "IconList",
  "IconListTwo",
  "IconListCheckbox",
  "IconColumn",
  "IconGridFour",
  "IconBox",
  "IconPaperclip",
  "IconUser",
  "IconPeoples",
  "IconAddUser",
  "IconPeopleDelete",
  "IconComment",
  "IconComments",
  "IconCommentAdd",
  "IconCommentDashed",
  "IconMail",
  "IconPhoneOff",
  "IconMicrophone",
  "IconVoiceOff",
  "IconAnnouncement",
  "IconInbox",
  "IconCustomer",
  "IconChartHistogram",
  "IconChartLine",
  "IconChartPie",
  "IconTrendingUp",
  "IconTrendingDown",
  "IconDashboard",
  "IconDatabaseNetwork",
  "IconServer",
  "IconCloudStorage",
  "IconHardDisk",
  "IconCpu",
  "IconTime",
  "IconTimer",
  "IconCalendar",
  "IconHistory",
  "IconAlarmClock",
  "IconSchedule",
  "IconCamera",
  "IconVideo",
  "IconVideoOne",
  "IconVideocamera",
  "IconPicture",
  "IconMusic",
  "IconWifi",
  "IconCloseWifi",
  "IconSignal",
  "IconApi",
  "IconRouter",
  "IconNavigation",
  "IconLocalPin",
  "IconMapDraw",
  "IconEarth",
  "IconGlobe",
  "IconCompass",
  "IconTarget",
  "IconAiming",
  "IconLightning",
  "IconThunderbolt",
  "IconFire",
  "IconWater",
  "IconWind",
  "IconThermometer",
  "IconSun",
  "IconMoon",
  "IconLeaf",
  "IconTree",
  "IconSeedling",
  "IconExperiment",
  "IconMedicineChest",
  "IconCloudy",
  "IconCloudyNight",
  "IconFog",
  "IconLightRain",
  "IconHeavyRain",
  "IconSnow",
  "IconSunny",
  "IconThunderstorm",
  "IconSetting",
  "IconSettingOne",
  "IconSettingTwo",
  "IconSwitch",
  "IconBackgroundColor",
  "IconLight",
  "IconMagic",
  "IconMagicWand",
  "IconEmotionHappy",
  "IconCrown",
  "IconHexagonOne",
  "IconRound",
  "IconRoundCaliper",
  "IconSquare",
  "IconDot",
  "IconCd",
  "IconRocket",
  "IconBrain",
  "IconRobot",
  "IconCode",
  "IconTerminal",
  "IconBug",
  "IconGithub",
  "IconGithubOne",
  "IconTwitter",
  "IconLogout",
  "IconCompression",
  "IconHandUp",
  "IconQuote",
  "IconBill",
  "IconWallet",
  "IconDollar",
  "IconCurrency",
  "IconTag",
  "IconTicket",
  "IconBriefcase",
  "IconBuildingFour",
  "IconShop",
  "IconDegreeHat",
  "IconTranslate",
  "IconFingerprint",
  "IconApplicationOne",
  "IconConnect",
  "IconFan",
  "IconHashtagKey",
  "IconHeadphoneSound",
  "IconHeart",
  "IconHtmlFive",
  "IconLayers",
  "IconMerge",
  "IconMore",
  "IconNetworkTree",
  "IconPause",
  "IconPlay",
  "IconPlayOne",
  "IconRadio",
  "IconScissors",
  "IconSunrise",
  "IconSunset",
  "IconVolumeMute",
  "IconVolumeNotice",
  "IconWaves",
  "IconZip",
  "IconEdit3",
  "IconWand",
  "IconPocket",
  "IconVolumeOff",
  "IconCloudUpload",
] as const;

export type IconName = (typeof ICON_EXPORT_NAMES)[number];

/** 全部图标名清单（便于调试 / 遍历） */
export const ICON_NAMES: readonly IconName[] = ICON_EXPORT_NAMES;

/**
 * 未命中 HarmonyOS Symbol 映射的图标名清单 —— **现应恒为空数组**。
 *
 * 取消 lucide 兜底后，这里不再是"预期兜底清单"，而是**回归哨兵**：
 * 一旦非空，说明 `scripts/harmonyos-symbol/generate.mjs` 的 `PROJECT_TO_SYMBOL`
 * 与 `components/icon.tsx` 的导出名单脱节（漏了一项没映射），需要补映射并重新生成数据。
 * 验收脚本 `_probe_harmonyos_icons.cjs` 会断言它为空。
 */
export const UNMAPPED_ICONS: readonly IconName[] = ICON_EXPORT_NAMES.filter(
  (name) => !HARMONY_SYMBOL_PATHS[HARMONY_SYMBOL_ICON_MAP[name] ?? ""]
);

/** 项目图标名 → 实际使用 HarmonyOS Symbol 字形名（仅命中项） */
export const HARMONY_ICON_USAGE: Record<string, string> = Object.fromEntries(
  ICON_EXPORT_NAMES
    .filter((name) => HARMONY_SYMBOL_PATHS[HARMONY_SYMBOL_ICON_MAP[name] ?? ""])
    .map((name) => [name, HARMONY_SYMBOL_ICON_MAP[name]])
);

// ────────────────────────────────────────────────────────────────
// 具名导出（248 个名字与迁移前 1:1 对应，保证调用方零改动）
// ────────────────────────────────────────────────────────────────

export const IconAddUser = createIcon("IconAddUser");
export const IconAiming = createIcon("IconAiming");
export const IconAlarmClock = createIcon("IconAlarmClock");
export const IconAnnouncement = createIcon("IconAnnouncement");
export const IconApi = createIcon("IconApi");
export const IconApplicationOne = createIcon("IconApplicationOne");
export const IconArrowCircleUp = createIcon("IconArrowCircleUp");
export const IconArrowDown = createIcon("IconArrowDown");
export const IconArrowLeft = createIcon("IconArrowLeft");
export const IconArrowRight = createIcon("IconArrowRight");
export const IconArrowRightUp = createIcon("IconArrowRightUp");
export const IconArrowUp = createIcon("IconArrowUp");
export const IconArrowUpSolid = createIcon("IconArrowUpSolid");
export const IconAttention = createIcon("IconAttention");
export const IconBackgroundColor = createIcon("IconBackgroundColor");
export const IconBill = createIcon("IconBill");
export const IconBook = createIcon("IconBook");
export const IconBookOne = createIcon("IconBookOne");
export const IconBookOpen = createIcon("IconBookOpen");
export const IconBookmark = createIcon("IconBookmark");
export const IconBookshelf = createIcon("IconBookshelf");
export const IconBox = createIcon("IconBox");
export const IconBrain = createIcon("IconBrain");
export const IconBriefcase = createIcon("IconBriefcase");
export const IconBug = createIcon("IconBug");
export const IconBuildingFour = createIcon("IconBuildingFour");
export const IconCalendar = createIcon("IconCalendar");
export const IconCamera = createIcon("IconCamera");
export const IconCaution = createIcon("IconCaution");
export const IconCd = createIcon("IconCd");
export const IconCertificate = createIcon("IconCertificate");
export const IconChartHistogram = createIcon("IconChartHistogram");
export const IconChartLine = createIcon("IconChartLine");
export const IconChartPie = createIcon("IconChartPie");
export const IconCheck = createIcon("IconCheck");
export const IconCheckCorrect = createIcon("IconCheckCorrect");
export const IconCheckOne = createIcon("IconCheckOne");
export const IconClickTap = createIcon("IconClickTap");
export const IconClose = createIcon("IconClose");
export const IconCloseOne = createIcon("IconCloseOne");
export const IconCloseRemind = createIcon("IconCloseRemind");
export const IconCloseWifi = createIcon("IconCloseWifi");
export const IconCloudStorage = createIcon("IconCloudStorage");
export const IconCloudUpload = createIcon("IconCloudUpload");
export const IconCloudy = createIcon("IconCloudy");
export const IconCloudyNight = createIcon("IconCloudyNight");
export const IconCode = createIcon("IconCode");
export const IconColumn = createIcon("IconColumn");
export const IconComment = createIcon("IconComment");
export const IconCommentAdd = createIcon("IconCommentAdd");
export const IconComments = createIcon("IconComments");
export const IconCommentDashed = createIcon("IconCommentDashed");
export const IconCompass = createIcon("IconCompass");
export const IconCompression = createIcon("IconCompression");
export const IconConnect = createIcon("IconConnect");
export const IconCopy = createIcon("IconCopy");
export const IconCpu = createIcon("IconCpu");
export const IconCrown = createIcon("IconCrown");
export const IconCurrency = createIcon("IconCurrency");
export const IconCustomer = createIcon("IconCustomer");
export const IconDashboard = createIcon("IconDashboard");
export const IconDatabaseNetwork = createIcon("IconDatabaseNetwork");
export const IconDegreeHat = createIcon("IconDegreeHat");
export const IconDelete = createIcon("IconDelete");
export const IconDollar = createIcon("IconDollar");
export const IconDot = createIcon("IconDot");
export const IconDown = createIcon("IconDown");
export const IconDownload = createIcon("IconDownload");
export const IconDrag = createIcon("IconDrag");
export const IconEarth = createIcon("IconEarth");
export const IconEdit = createIcon("IconEdit");
export const IconEdit3 = createIcon("IconEdit3");
export const IconEmotionHappy = createIcon("IconEmotionHappy");
export const IconExchange = createIcon("IconExchange");
export const IconExperiment = createIcon("IconExperiment");
export const IconExport = createIcon("IconExport");
export const IconFan = createIcon("IconFan");
export const IconFileAddition = createIcon("IconFileAddition");
export const IconFileCode = createIcon("IconFileCode");
export const IconFileEditing = createIcon("IconFileEditing");
export const IconFilePdf = createIcon("IconFilePdf");
export const IconFilePpt = createIcon("IconFilePpt");
export const IconFileSearch = createIcon("IconFileSearch");
export const IconFileText = createIcon("IconFileText");
export const IconFileWord = createIcon("IconFileWord");
export const IconFileZip = createIcon("IconFileZip");
export const IconFilter = createIcon("IconFilter");
export const IconFingerprint = createIcon("IconFingerprint");
export const IconFire = createIcon("IconFire");
export const IconFog = createIcon("IconFog");
export const IconFolder = createIcon("IconFolder");
export const IconFolderMinus = createIcon("IconFolderMinus");
export const IconFolderOpen = createIcon("IconFolderOpen");
export const IconFolderPlus = createIcon("IconFolderPlus");
export const IconFolderSettings = createIcon("IconFolderSettings");
export const IconFolderUpload = createIcon("IconFolderUpload");
export const IconFullScreen = createIcon("IconFullScreen");
export const IconFullScreenOne = createIcon("IconFullScreenOne");
export const IconGithub = createIcon("IconGithub");
export const IconGithubOne = createIcon("IconGithubOne");
export const IconGlobe = createIcon("IconGlobe");
export const IconGridFour = createIcon("IconGridFour");
export const IconHamburgerButton = createIcon("IconHamburgerButton");
export const IconHandUp = createIcon("IconHandUp");
export const IconHardDisk = createIcon("IconHardDisk");
export const IconHashtagKey = createIcon("IconHashtagKey");
export const IconHeadphoneSound = createIcon("IconHeadphoneSound");
export const IconHeart = createIcon("IconHeart");
export const IconHeavyRain = createIcon("IconHeavyRain");
export const IconHelp = createIcon("IconHelp");
export const IconHexagonOne = createIcon("IconHexagonOne");
export const IconHistory = createIcon("IconHistory");
export const IconHome = createIcon("IconHome");
export const IconHtmlFive = createIcon("IconHtmlFive");
export const IconInbox = createIcon("IconInbox");
export const IconInfo = createIcon("IconInfo");
export const IconIpad = createIcon("IconIpad");
export const IconKey = createIcon("IconKey");
export const IconLaptop = createIcon("IconLaptop");
export const IconLayers = createIcon("IconLayers");
export const IconLayoutTwo = createIcon("IconLayoutTwo");
export const IconLeaf = createIcon("IconLeaf");
export const IconLeft = createIcon("IconLeft");
export const IconLight = createIcon("IconLight");
export const IconLightning = createIcon("IconLightning");
export const IconLightRain = createIcon("IconLightRain");
export const IconLink = createIcon("IconLink");
export const IconLinkIn = createIcon("IconLinkIn");
export const IconLinkOut = createIcon("IconLinkOut");
export const IconList = createIcon("IconList");
export const IconListCheckbox = createIcon("IconListCheckbox");
export const IconListTwo = createIcon("IconListTwo");
export const IconLoading = createIcon("IconLoading");
export const IconLocalPin = createIcon("IconLocalPin");
export const IconLock = createIcon("IconLock");
export const IconLogout = createIcon("IconLogout");
export const IconMagic = createIcon("IconMagic");
export const IconMagicWand = createIcon("IconMagicWand");
export const IconMail = createIcon("IconMail");
export const IconMapDraw = createIcon("IconMapDraw");
export const IconMedicineChest = createIcon("IconMedicineChest");
export const IconMerge = createIcon("IconMerge");
export const IconMicrophone = createIcon("IconMicrophone");
export const IconMinus = createIcon("IconMinus");
export const IconMonitor = createIcon("IconMonitor");
export const IconMoon = createIcon("IconMoon");
export const IconMore = createIcon("IconMore");
export const IconMusic = createIcon("IconMusic");
export const IconNavigation = createIcon("IconNavigation");
export const IconNetworkTree = createIcon("IconNetworkTree");
export const IconNotebook = createIcon("IconNotebook");
export const IconOffScreen = createIcon("IconOffScreen");
export const IconOffScreenOne = createIcon("IconOffScreenOne");
export const IconPaperclip = createIcon("IconPaperclip");
export const IconPause = createIcon("IconPause");
export const IconPencil = createIcon("IconPencil");
export const IconPeopleDelete = createIcon("IconPeopleDelete");
export const IconPeoples = createIcon("IconPeoples");
export const IconPhone = createIcon("IconPhone");
export const IconPhoneOff = createIcon("IconPhoneOff");
export const IconPicture = createIcon("IconPicture");
export const IconPin = createIcon("IconPin");
export const IconPlay = createIcon("IconPlay");
export const IconPlayOne = createIcon("IconPlayOne");
export const IconPlus = createIcon("IconPlus");
export const IconPlusCross = createIcon("IconPlusCross");
export const IconPocket = createIcon("IconPocket");
export const IconPower = createIcon("IconPower");
export const IconPreviewClose = createIcon("IconPreviewClose");
export const IconPreviewOpen = createIcon("IconPreviewOpen");
export const IconQuote = createIcon("IconQuote");
export const IconRadio = createIcon("IconRadio");
export const IconRedo = createIcon("IconRedo");
export const IconRefresh = createIcon("IconRefresh");
export const IconRemind = createIcon("IconRemind");
export const IconRemindDisable = createIcon("IconRemindDisable");
export const IconRight = createIcon("IconRight");
export const IconRobot = createIcon("IconRobot");
export const IconRocket = createIcon("IconRocket");
export const IconRotate = createIcon("IconRotate");
export const IconRound = createIcon("IconRound");
export const IconRoundCaliper = createIcon("IconRoundCaliper");
export const IconRouter = createIcon("IconRouter");
export const IconSave = createIcon("IconSave");
export const IconScan = createIcon("IconScan");
export const IconScanCode = createIcon("IconScanCode");
export const IconSchedule = createIcon("IconSchedule");
export const IconScissors = createIcon("IconScissors");
export const IconSearch = createIcon("IconSearch");
export const IconSeedling = createIcon("IconSeedling");
export const IconSend = createIcon("IconSend");
export const IconServer = createIcon("IconServer");
export const IconSetting = createIcon("IconSetting");
export const IconSettingOne = createIcon("IconSettingOne");
export const IconSettingTwo = createIcon("IconSettingTwo");
export const IconShare = createIcon("IconShare");
export const IconShield = createIcon("IconShield");
export const IconShieldCheck = createIcon("IconShieldCheck");
export const IconShop = createIcon("IconShop");
export const IconSidebarPanel = createIcon("IconSidebarPanel");
export const IconSignal = createIcon("IconSignal");
export const IconSnow = createIcon("IconSnow");
export const IconSort = createIcon("IconSort");
export const IconSquare = createIcon("IconSquare");
export const IconSquareSmall = createIcon("IconSquareSmall");
export const IconStar = createIcon("IconStar");
export const IconSun = createIcon("IconSun");
export const IconSunny = createIcon("IconSunny");
export const IconSunrise = createIcon("IconSunrise");
export const IconSunset = createIcon("IconSunset");
export const IconSwitch = createIcon("IconSwitch");
export const IconTag = createIcon("IconTag");
export const IconTarget = createIcon("IconTarget");
export const IconTerminal = createIcon("IconTerminal");
export const IconThermometer = createIcon("IconThermometer");
export const IconThunderbolt = createIcon("IconThunderbolt");
export const IconThunderstorm = createIcon("IconThunderstorm");
export const IconTicket = createIcon("IconTicket");
export const IconTime = createIcon("IconTime");
export const IconTimer = createIcon("IconTimer");
export const IconTool = createIcon("IconTool");
export const IconTranslate = createIcon("IconTranslate");
export const IconTree = createIcon("IconTree");
export const IconTrendingDown = createIcon("IconTrendingDown");
export const IconTrendingUp = createIcon("IconTrendingUp");
export const IconTrophy = createIcon("IconTrophy");
export const IconTwitter = createIcon("IconTwitter");
export const IconUndo = createIcon("IconUndo");
export const IconUnlink = createIcon("IconUnlink");
export const IconUnlock = createIcon("IconUnlock");
export const IconUp = createIcon("IconUp");
export const IconUpload = createIcon("IconUpload");
export const IconUser = createIcon("IconUser");
export const IconVideo = createIcon("IconVideo");
export const IconVideoOne = createIcon("IconVideoOne");
export const IconVideocamera = createIcon("IconVideocamera");
export const IconVoiceOff = createIcon("IconVoiceOff");
export const IconVolumeMute = createIcon("IconVolumeMute");
export const IconVolumeNotice = createIcon("IconVolumeNotice");
export const IconVolumeOff = createIcon("IconVolumeOff");
export const IconWallet = createIcon("IconWallet");
export const IconWand = createIcon("IconWand");
export const IconWater = createIcon("IconWater");
export const IconWaves = createIcon("IconWaves");
export const IconWifi = createIcon("IconWifi");
export const IconWind = createIcon("IconWind");
export const IconZip = createIcon("IconZip");
export const IconZoomIn = createIcon("IconZoomIn");
export const IconZoomOut = createIcon("IconZoomOut");
