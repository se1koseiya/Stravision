"use client";

/* ------------------------------------------------------------
   ToolCallsSection —— 工具调用链（折叠头 + 竖向链路）
   ─────────────────────────────────────────────────────────────
   移植自外部参考实现，保留其全部对外 API 与视觉语言：

     · 折叠头：去重后的分类图标「斜叠」排布（±8° 交替 + 层级堆叠）
               + 文案 + 可旋转 180° 的箭头
     · 展开体：竖向链路 —— 图标列（含连接线） + 内容列
               （工具名 / 分类名 / 可点开的参数与返回值面板）

   与参考实现的差异（均为项目约定所迫，逐条列出便于回归）：

     1. **图标唯一源** = `@/components/icon`（HarmonyOS Symbol），
        ⛔ 不引入 hugeicons；分类键改为工具语义（search/scrape/weather…）。
     2. `CompactMarkdown` → `CompactContent`（`tool-calls-section-utils`），
        零新依赖，JSON / 纯文本两路渲染。
     3. 折叠动画改为**内容驱动高度**（grid 行 0fr↔1fr），
        参考实现写死的高度上限会把长链路截断。
     4. 圆角走项目阶梯 8 / 16（参考实现的 12px 不在阶梯内）。
     5. 新增五个可选 prop（不影响参考用法的默认行为）：
        `label`               —— 覆盖折叠头文案（默认「调用了 N 个工具」）
        `detailSlot`          —— 在 Input/Output 之上插入自定义内容（用于挂子步骤）
        `status` 字段         —— 条目状态着色（active / error / completed / pending）
        `autoCollapseWhen`    —— 条件成立时延迟 `autoCollapseDelayMs`（默认 1200）
                                 自动收起整条链，条件恢复则自动展开
        `autoCollapseDelayMs` —— 自动折叠延迟
     6. **图标一律裸字形**：参考实现在图标外套了一层圆角描边卡片
        （`rounded-lg border bg-*`），实测头部斜叠簇会变成"四张重叠的卡片"，很笨重；
        现改为不画背景 / 不画边框，状态色直接落在字形上。需要卡片感时由调用方
        用 `renderIcon` 自行包裹（默认渲染器不再提供）。
   ------------------------------------------------------------ */

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { IconDown, IconLoading } from "@/components/icon";
import { cn } from "@/lib/utils";
import {
  formatToolName,
  getCategoryMeta,
  getToolCategoryIcon,
} from "@/components/ui/tool-calls-section-utils/tool-icons";
import { CompactContent } from "@/components/ui/tool-calls-section-utils/compact-markdown";

// ============================================================================
// Types
// ============================================================================

export type ToolCallStatus = "pending" | "active" | "completed" | "error";

export interface ToolCallEntry {
  /** Name of the tool that was called */
  tool_name: string;
  /** Category/integration the tool belongs to (e.g., "gmail", "search", "memory") */
  tool_category: string;
  /** Human-readable message describing what the tool did */
  message?: string;
  /** Whether to show the category label (default: true) */
  show_category?: boolean;
  /** Unique ID for this tool call */
  tool_call_id?: string;
  /** Input parameters passed to the tool */
  inputs?: Record<string, unknown>;
  /** Output/result from the tool */
  output?: string;
  /** URL to custom icon for integrations */
  icon_url?: string;
  /** Friendly name for the integration (e.g., "Linear", "Slack") */
  integration_name?: string;
  /** 条目状态：active 高亮 + 旋转态，error 红色，completed / pending 中性 */
  status?: ToolCallStatus;
  /** 右侧元信息（耗时等），已本地化，参考实现没有这一栏 */
  meta?: string;
}

export interface IntegrationInfo {
  iconUrl?: string;
  name?: string;
}

export interface ToolCallsSectionProps {
  /** Array of tool call entries to display */
  toolCalls: ToolCallEntry[];
  /** Optional map of integration IDs to their info for icon/name lookup */
  integrations?: Map<string, IntegrationInfo>;
  /** Maximum number of icons to show in the stacked display (default: 10) */
  maxIconsToShow?: number;
  /** Whether to start with the accordion expanded (default: false) */
  defaultExpanded?: boolean;
  /** Custom class name for the container */
  className?: string;
  /** Custom icon size (default: 21) */
  iconSize?: number;
  /** Custom icon renderer override */
  renderIcon?: (call: ToolCallEntry, size: number) => ReactNode;
  /** Custom content renderer override for inputs/outputs */
  renderContent?: (content: unknown) => ReactNode;
  /** 折叠头文案覆盖（默认「调用了 N 个工具」） */
  label?: ReactNode;
  /** 展开面板顶部的自定义内容（用于挂子步骤 / 补充说明） */
  detailSlot?: (call: ToolCallEntry, index: number) => ReactNode;
  /**
   * 满足"可以自动折叠"的条件时（如本轮执行已结束），延迟 `autoCollapseDelayMs`
   * 把整条链收起；条件重新为 false（新一轮开始）会自动展开。
   * 默认 `false` = 保持参考实现的手动折叠行为。
   */
  autoCollapseWhen?: boolean;
  /** 自动折叠的延迟（毫秒），默认 1200 */
  autoCollapseDelayMs?: number;
}

/** 自动折叠的默认延迟：够看清最后一步完成，又不至于等得心焦 */
const DEFAULT_AUTO_COLLAPSE_DELAY_MS = 1200;

// ============================================================================
// Helpers
// ============================================================================

function ChevronIcon({
  isExpanded,
  size = 18,
  className = "",
}: {
  isExpanded: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <IconDown
      size={size}
      className={cn(
        "transition-transform duration-200",
        isExpanded && "rotate-180",
        className,
      )}
    />
  );
}

/**
 * 状态 → 图标**字形**配色（语义色一对一：ok=翠绿 / danger=红 / 其余中性）。
 *
 * ⚠️ 只给颜色，**不给任何外框**：图标外层不再有圆角描边卡片，
 *    状态只能靠字形自身的颜色表达（active 翠绿 / error 红 / pending 极浅）。
 */
function iconToneClass(status?: ToolCallStatus): string {
  switch (status) {
    case "active":
      return "text-[#059669] dark:text-emerald-400";
    case "error":
      return "text-red-500 dark:text-red-400";
    case "pending":
      return "text-zinc-300 dark:text-zinc-600";
    default:
      return "text-zinc-500 dark:text-zinc-400";
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function ToolCallsSection({
  toolCalls,
  integrations,
  maxIconsToShow = 10,
  defaultExpanded = false,
  className,
  iconSize = 21,
  renderIcon,
  renderContent,
  label,
  detailSlot,
  autoCollapseWhen = false,
  autoCollapseDelayMs = DEFAULT_AUTO_COLLAPSE_DELAY_MS,
}: ToolCallsSectionProps) {
  /* ------------------------------------------------------------------
     折叠头展开态（三条规则，全部纯推导，不在 effect 里同步 setState）
       · 用户手动点过 → 以用户为准；
       · `autoCollapseWhen` 满足 + 已过延迟 → 自动折叠；
       · 其余（进行中 / 未开自动折叠）→ 按 `defaultExpanded`。
     "已过延迟"用**内容快照 key** 表达：折叠记的是当时那份内容的 key，
     内容一变（新一轮调用）key 自然不匹配 ⇒ 自动展开，无需重置任何状态。
     ------------------------------------------------------------------ */
  const statusKey = toolCalls.map((c) => c.status ?? "").join("|");
  const contentKey = `${toolCalls.length}|${statusKey}`;
  const [autoCollapsedKey, setAutoCollapsedKey] = useState<string | null>(null);
  /** 用户手动操作过折叠头？null = 没干预过，自动行为继续生效 */
  const [userCollapseChoice, setUserCollapseChoice] = useState<boolean | null>(null);

  const autoCollapsed = autoCollapseWhen && autoCollapsedKey === contentKey;
  const headerExpanded =
    userCollapseChoice ?? (autoCollapseWhen ? !autoCollapsed : defaultExpanded);

  /** 用户显式点开的条目 */
  const [userOpen, setUserOpen] = useState<Set<number>>(new Set());
  /** 用户显式收起的条目（用于压过"进行中自动展开"） */
  const [userClosed, setUserClosed] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!autoCollapseWhen || userCollapseChoice !== null) return;
    // setState 落在定时器回调里（异步）—— 同步写在 effect 体会被
    // react-hooks/set-state-in-effect 拦下。
    // ⚠️ 内容还在追加时（流式/逐条注入）contentKey 一直在变 → 计时不断重置，
    //    只有真正"停下来满 X 毫秒"才折叠，这正好是要的语义。
    const timer = setTimeout(() => setAutoCollapsedKey(contentKey), autoCollapseDelayMs);
    return () => clearTimeout(timer);
  }, [autoCollapseWhen, userCollapseChoice, contentKey, autoCollapseDelayMs]);

  // Create a lookup map for custom integrations by id
  const integrationLookup = useMemo(() => {
    if (integrations) return integrations;
    return new Map<string, IntegrationInfo>();
  }, [integrations]);

  // Helper to get icon_url with fallback to integrations lookup
  const getIconUrl = (call: ToolCallEntry): string | undefined => {
    if (call.icon_url) return call.icon_url;
    const integration = integrationLookup.get(call.tool_category);
    return integration?.iconUrl;
  };

  // Helper to get integration_name with fallback to integrations lookup
  const getIntegrationName = (call: ToolCallEntry): string | undefined => {
    if (call.integration_name) return call.integration_name;
    const integration = integrationLookup.get(call.tool_category);
    return integration?.name;
  };

  /* 行级展开态是**纯推导**的，不用 effect 同步：
       · 用户点开过 → 一直展开
       · 当前正在执行 → 默认展开（工具跑起来时能直接看到参数）
       · 其余 → 收起                                                        */
  const activeIndexes = useMemo(() => {
    const set = new Set<number>();
    statusKey.split("|").forEach((status, index) => {
      if (status === "active") set.add(index);
    });
    return set;
  }, [statusKey]);

  const isCallOpen = (index: number): boolean => {
    if (userOpen.has(index)) return true;
    if (userClosed.has(index)) return false;
    return activeIndexes.has(index);
  };

  const toggleCallExpansion = (index: number) => {
    if (isCallOpen(index)) {
      setUserOpen((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
      setUserClosed((prev) => new Set(prev).add(index));
    } else {
      setUserClosed((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
      setUserOpen((prev) => new Set(prev).add(index));
    }
  };

  if (toolCalls.length === 0) return null;

  // Default icon renderer：**裸字形**，图标外面不再套圆角描边卡片。
  // `size-8` 只是一个不可见对齐盒（跟行左侧的连接线、以及折叠头各图标等宽），
  // 不画背景 / 不画边框 / 不留圆角 —— 需要"卡片感"时由调用方用 renderIcon 自己给。
  const defaultRenderIcon = (call: ToolCallEntry, size: number) => (
    <span
      data-tool-call-icon
      data-status={call.status ?? "none"}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center transition-colors",
        iconToneClass(call.status),
      )}
    >
      {getToolCategoryIcon(
        call.tool_category || "general",
        size,
        getIconUrl(call),
      )}
    </span>
  );

  const iconRenderer = renderIcon || defaultRenderIcon;

  // Default content renderer
  const defaultRenderContent = (content: unknown) => (
    <CompactContent content={content} />
  );

  const contentRenderer = renderContent || defaultRenderContent;

  const count = toolCalls.length;

  // Render stacked rotated icons (deduplicated by category for cleaner display)
  const renderStackedIcons = () => {
    const seenCategories = new Set<string>();
    const uniqueIcons = toolCalls.filter((call) => {
      const category = call.tool_category || "general";
      if (seenCategories.has(category)) return false;
      seenCategories.add(category);
      return true;
    });
    const displayIcons = uniqueIcons.slice(0, maxIconsToShow);

    return (
      // px-1 -mx-1：斜叠图标旋转后会多出 ~2px 包围盒，靠内边距吸收，
      // 否则容器 scrollWidth > clientWidth（负外边距把视觉位置还原）
      // -space-x-1（不是 -2）：外框去掉后字形之间再压 8px 会糊成一团，
      // 让出 4px 重叠即可维持"簇"的观感。
      <div data-tool-calls-stack className="flex min-h-8 items-center -space-x-1 px-1 -mx-1">
        {displayIcons.map((call, index) => (
          <div
            key={`${call.tool_name}-${index}`}
            data-tool-calls-stack-icon
            data-rotate={
              displayIcons.length > 1
                ? index % 2 === 0
                  ? "8deg"
                  : "-8deg"
                : "0deg"
            }
            className="relative flex min-w-8 items-center justify-center"
            style={{
              rotate:
                displayIcons.length > 1
                  ? index % 2 === 0
                    ? "8deg"
                    : "-8deg"
                  : "0deg",
              zIndex: index,
            }}
          >
            {/* 头部图标栈只表达"跑过哪些分类"，不表达进度 ——
                pending 的极浅字形（zinc-300）在栈里会像缺一块，统一按中性渲染 */}
            {iconRenderer(
              call.status === "pending" ? { ...call, status: undefined } : call,
              iconSize,
            )}
          </div>
        ))}
        {uniqueIcons.length > maxIconsToShow && (
          <div
            data-tool-calls-stack-more
            className="z-0 flex min-h-8 min-w-6 items-center justify-center text-[11px] font-normal text-zinc-400 tabular-nums dark:text-zinc-500"
          >
            +{uniqueIcons.length - maxIconsToShow}
          </div>
        )}
      </div>
    );
  };

  return (
    <div data-tool-calls-section className={cn("w-fit max-w-[35rem]", className)}>
      {/* Collapsible Header */}
      <button
        type="button"
        data-tool-calls-header
        data-expanded={headerExpanded ? "true" : "false"}
        aria-expanded={headerExpanded}
        onClick={() => setUserCollapseChoice(!headerExpanded)}
        className="flex cursor-pointer items-center gap-2 py-2 text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        {renderStackedIcons()}
        <span className="text-xs font-medium transition-all duration-200">
          {label ?? `调用了 ${count} 个工具`}
        </span>
        <ChevronIcon isExpanded={headerExpanded} />
      </button>

      {/* Collapsible Content —— 内容驱动高度（0fr ↔ 1fr），长链路不会被截断 */}
      <div
        className={cn(
          "grid transition-all duration-200 ease-out",
          headerExpanded
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-0 pt-1">
            {toolCalls.map((call, index) => {
              const hasCategoryText =
                call.show_category !== false &&
                !!call.tool_category &&
                call.tool_category !== "unknown";
              // ⚠️ 先算 detailSlot 结果再判 hasDetails —— 否则「有 slot 但返回 null」
              // 的条目会展开出一个空灰面板（还带多余的箭头）。
              const detailNode = detailSlot ? detailSlot(call, index) : null;
              const hasDetails =
                !!call.inputs || !!call.output || !!detailNode;
              const isCallExpanded = isCallOpen(index);
              const isActive = call.status === "active";
              const isError = call.status === "error";

              return (
                <div
                  key={call.tool_call_id ?? `${call.tool_name}-step-${index}`}
                  data-tool-call-row={index}
                  data-status={call.status ?? "none"}
                  className="flex items-stretch gap-2"
                >
                  {/* Icon column with connector line */}
                  <div className="flex flex-col items-center self-stretch">
                    <div className="flex min-h-8 min-w-8 shrink-0 items-center justify-center">
                      {iconRenderer(call, iconSize)}
                    </div>
                    {index < toolCalls.length - 1 && (
                      <div
                        data-tool-call-connector
                        className="w-px min-h-4 flex-1 bg-zinc-300 dark:bg-zinc-700"
                      />
                    )}
                  </div>

                  {/* Content column */}
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      data-tool-call-title
                      data-expanded={isCallExpanded ? "true" : "false"}
                      className={cn(
                        "group/parent flex w-full items-center gap-1 text-left",
                        hasDetails ? "cursor-pointer" : "cursor-default",
                        !hasCategoryText ? "pt-2" : "",
                      )}
                      onClick={() => hasDetails && toggleCallExpansion(index)}
                    >
                      <span
                        className={cn(
                          "text-xs font-medium break-words transition-colors",
                          isActive
                            ? "text-zinc-900 dark:text-zinc-100"
                            : isError
                              ? "text-red-600 dark:text-red-400"
                              : "text-zinc-600 dark:text-zinc-400",
                          hasDetails &&
                            !isActive &&
                            !isError &&
                            "group-hover/parent:text-zinc-900 dark:group-hover/parent:text-zinc-100",
                        )}
                      >
                        {call.message || formatToolName(call.tool_name)}
                      </span>
                      {isActive && (
                        <IconLoading
                          size={12}
                          className="shrink-0 animate-spin text-[#059669]"
                        />
                      )}
                      {hasDetails && (
                        <ChevronIcon
                          isExpanded={isCallExpanded}
                          size={14}
                          className="text-zinc-400 dark:text-zinc-500"
                        />
                      )}
                      {call.meta && (
                        <span className="ml-auto shrink-0 pl-2 font-mono text-[11px] text-zinc-400 tabular-nums dark:text-zinc-500">
                          {call.meta}
                        </span>
                      )}
                    </button>

                    {hasCategoryText && (
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        {getIntegrationName(call) ||
                          getCategoryMeta(call.tool_category).label}
                      </p>
                    )}

                    {isCallExpanded && hasDetails && (
                      <div
                        data-tool-call-detail
                        className="mt-2 mb-3 w-fit max-w-full min-w-0 space-y-2 rounded-2xl bg-zinc-100 p-3 text-[11px] dark:bg-zinc-800/50"
                      >
                        {detailNode}
                        {call.inputs && Object.keys(call.inputs).length > 0 && (
                          <div className="flex flex-col">
                            <span className="mb-1 font-medium text-zinc-400 dark:text-zinc-500">
                              Input
                            </span>
                            {contentRenderer(call.inputs)}
                          </div>
                        )}
                        {call.output && (
                          <div className="flex flex-col">
                            <span className="mb-1 font-medium text-zinc-400 dark:text-zinc-500">
                              Output
                            </span>
                            {contentRenderer(call.output)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ToolCallsSection;
