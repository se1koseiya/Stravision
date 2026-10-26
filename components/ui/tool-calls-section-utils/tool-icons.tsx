"use client";

/* ------------------------------------------------------------
   工具调用链 · 分类图标与名称工具
   ─────────────────────────────────────────────────────────────
   移植自 ToolCallsSection 参考实现的 `tool-icons`，做了两处项目化改造：

     1. **图标唯一源 = `@/components/icon`**（全站 100% HarmonyOS Symbol，
        ⛔ 不再引入 hugeicons / lucide 等第三方图标库，避免同屏两套画风）。
     2. 分类键从"集成 ID（gmail / google_calendar）"改为"工具语义"
        （search / scrape / weather / …），因为 berry-realm 的工具是
        `mcp_xxx` / `web_search` 这类语义化工具名，没有 SaaS 集成概念。
   ------------------------------------------------------------ */

import type { ReactNode } from "react";

import {
  IconApi,
  IconBrain,
  IconChartLine,
  IconCode,
  IconCpu,
  IconDatabaseNetwork,
  IconGlobe,
  IconHistory,
  IconLocalPin,
  IconSearch,
  IconSeedling,
  IconSunny,
  IconTool,
  IconWater,
} from "@/components/icon";

/**
 * 与 `@/components/icon` 的图标组件类型完全一致。
 * ⚠️ 不能手写 `ComponentType<SVGProps<…>>`：项目图标是包了一层 span 的
 *    `ForwardRefExoticComponent<IconProps & RefAttributes<HTMLSpanElement>>`，
 *    手写签名会导致整张分类表类型不兼容。
 */
export type ToolIconComponent = typeof IconTool;

export type ToolCategoryId =
  | "search"
  | "scrape"
  | "weather"
  | "spectrum"
  | "history"
  | "route"
  | "soil"
  | "irrigation"
  | "device"
  | "data"
  | "knowledge"
  | "research"
  | "code"
  | "thinking"
  | "general";

export interface ToolCategoryMeta {
  id: ToolCategoryId;
  /** 中文分类名（显示在工具名下方，对应参考图里 "Gmail" / "Google Calendar" 的位置） */
  label: string;
  Icon: ToolIconComponent;
}

/** 分类定义表 —— 下标即 `ToolCategoryId` */
export const TOOL_CATEGORIES: Record<ToolCategoryId, Omit<ToolCategoryMeta, "id">> = {
  search: { label: "网页搜索", Icon: IconSearch },
  scrape: { label: "网页抓取", Icon: IconGlobe },
  weather: { label: "天气数据", Icon: IconSunny },
  spectrum: { label: "光谱传感", Icon: IconChartLine },
  history: { label: "历史数据", Icon: IconHistory },
  route: { label: "路线规划", Icon: IconLocalPin },
  soil: { label: "土壤数据", Icon: IconSeedling },
  irrigation: { label: "灌溉数据", Icon: IconWater },
  device: { label: "设备控制", Icon: IconCpu },
  data: { label: "数据查询", Icon: IconDatabaseNetwork },
  knowledge: { label: "知识库", Icon: IconApi },
  research: { label: "深度研究", Icon: IconBrain },
  code: { label: "代码执行", Icon: IconCode },
  thinking: { label: "思考", Icon: IconBrain },
  general: { label: "通用工具", Icon: IconTool },
};

/**
 * 关键词 → 分类。**顺序敏感**：
 *   1. 越"专有"的词越靠前 —— `deep_research` 含 "search"、`sensor_history_query`
 *      含 "query"，若把 `search` 放前面会被截胡（实测踩过）。
 *   2. 不收"query"这种泛词：`weather_query` / `device_query` 都会被它误判成搜索。
 */
const CATEGORY_KEYWORDS: Array<[ToolCategoryId, string[]]> = [
  ["research", ["deep_research", "research", "研究"]],
  ["knowledge", ["knowledge", "memory", "rag", "知识", "记忆"]],
  ["history", ["history", "历史", "trend"]],
  ["weather", ["weather", "天气"]],
  ["spectrum", ["spectrum", "光谱", "channel"]],
  ["route", ["route", "路线", "amap", "map"]],
  ["soil", ["soil", "土壤"]],
  ["irrigation", ["irrigation", "灌溉", "valve"]],
  ["device", ["device", "relay", "control", "设备"]],
  ["scrape", ["scrape", "crawl", "firecrawl", "fetch", "抓取", "网页"]],
  ["search", ["search", "搜索", "brave", "exa"]],
  ["data", ["sensor", "metric", "data", "sql", "db", "数据"]],
  ["code", ["code", "exec", "python", "shell", "代码"]],
];

/** 工具名 → 分类元数据（命中不到时回退 `general`） */
export function resolveToolCategory(toolName?: string): ToolCategoryMeta {
  const raw = (toolName || "").toLowerCase();
  if (raw) {
    for (const [id, words] of CATEGORY_KEYWORDS) {
      if (words.some((w) => raw.includes(w))) {
        return { id, ...TOOL_CATEGORIES[id] };
      }
    }
  }
  return { id: "general", ...TOOL_CATEGORIES.general };
}

/** 直接按分类 id 取元数据（未知 id 回退 `general`） */
export function getCategoryMeta(category?: string): ToolCategoryMeta {
  const key = (category || "").toLowerCase() as ToolCategoryId;
  if (key && key in TOOL_CATEGORIES) {
    return { id: key, ...TOOL_CATEGORIES[key] };
  }
  return resolveToolCategory(category);
}

/**
 * 分类 → 图标节点。
 *
 * ⚠️ 与参考实现签名不同：第三参 `iconUrl` 仍保留（自定义集成 logo 走图片），
 *    但第二参改为纯数字 `size`（参考实现传的是 `{ width, height }`，
 *    而项目图标组件只认 `size`）。
 */
export function getToolCategoryIcon(
  category: string,
  size: number,
  iconUrl?: string,
): ReactNode {
  if (iconUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconUrl}
        alt=""
        width={size}
        height={size}
        // 尺寸跟随 `size`（即字形字号），不再 `size-full` 撑满外层盒子 ——
        // 外层已无卡片，logo 若撑到 32px 会比旁边的矢量字形大一圈。
        className="shrink-0 object-contain"
      />
    );
  }
  const { Icon } = getCategoryMeta(category);
  return <Icon size={size} />;
}

/**
 * 工具名 → 人类可读名称（`mcp_firecrawl_scrape` → `Firecrawl Scrape`）。
 * 只在条目没给 `message` 时兜底。
 */
export function formatToolName(name: string): string {
  if (!name) return "";
  return name
    .replace(/^mcp_/i, "")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
