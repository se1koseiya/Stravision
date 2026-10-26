import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

/**
 * radix ScrollArea —— 自绘滚动条版的滚动容器（2026-10-11 统一改造）
 * ---------------------------------------------------------------------------
 * 全站滚动条（含这里）由 app/globals.css 的 Unified Scrollbar 段统一负责，
 * 本组件只负责把 radix 的 DOM 挂上对应的属性钩子：
 *   · Viewport 打 [data-sb-viewport] → 压掉**原生**滚动条。
 *     🚨 不压的话同一侧会同时出现「原生槽 + 自绘滑块」两条灰边。
 *   · Scrollbar 打 [data-sb-track]、Thumb 打 [data-sb-thumb] → 默认全透明，
 *     只有 Viewport 正在滚动（[data-scrolling]，由 components/scroll-activity.tsx
 *     打在 Viewport 上）时才着色；滚动一停约 0.55s 自动消失。
 *     ⚠️ 两个元素是**兄弟**关系（Root > Viewport / Scrollbar / Corner），
 *        所以统一段里用的是兄弟组合符 [data-scrolling] ~ [data-sb-track] [data-sb-thumb]。
 *   🚨 不要再给 Thumb 挂 bg-border / bg-foreground 之类的常驻颜色 ——
 *      那等于给每个用到 ScrollArea 的弹层都画一条永久灰边。
 */
const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport
      data-sb-viewport
      className="h-full w-full rounded-[inherit]"
      data-lenis-prevent
    >
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    data-sb-track
    className={cn(
      "flex touch-none select-none",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb
      data-sb-thumb
      className="relative flex-1 rounded-full"
    />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
