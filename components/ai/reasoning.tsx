"use client"

import * as React from "react"
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";
import { Sparkles } from "@/components/animate-ui/icons/sparkles";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

interface ReasoningProps extends React.ComponentProps<typeof Collapsible> {
  isStreaming?: boolean
}

const Reasoning = React.forwardRef<React.ElementRef<typeof Collapsible>, ReasoningProps>(
  ({ className, children, isStreaming, defaultOpen = true, ...props }, ref) => {
    const [open, setOpen] = React.useState(defaultOpen)
    const [hasAutoCollapsed, setHasAutoCollapsed] = React.useState(false)

    // 当思考完成时（isStreaming 从 true 变为 false），自动折叠
    React.useEffect(() => {
      if (!isStreaming && !hasAutoCollapsed && open) {
        // 延迟 1 秒后自动折叠，让用户看到思考完成
        const timer = setTimeout(() => {
          setOpen(false)
          setHasAutoCollapsed(true)
        }, 1000)
        return () => clearTimeout(timer)
      }
    }, [isStreaming, hasAutoCollapsed, open])

    return (
      <Collapsible
        ref={ref}
        open={open}
        onOpenChange={setOpen}
        className={cn(
          /* 思考链折叠卡：外观交材质（THIN 档 —— 面板内的薄层），布局类一个没动。
             neutral 变体 = 本页主卡是纯白，叠白会与底同色（轮廓消失），改用极淡中性灰膜。 */
          "dc-mat dc-mat--thin dc-mat--neutral rounded-lg group/reasoning",
          className
        )}
        {...props}
      >
        {children}
      </Collapsible>
    )
  }
)
Reasoning.displayName = "Reasoning"

const ReasoningTrigger = React.forwardRef<
  React.ElementRef<typeof CollapsibleTrigger>,
  React.ComponentProps<typeof CollapsibleTrigger>
>(({ className, children, ...props }, ref) => (
  <CollapsibleTrigger
    ref={ref}
    className={cn(
      "flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer",
      className
    )}
    {...props}
  >
    {children || (
      <>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span>AI 思考过程</span>
        </div>
        <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/reasoning:rotate-180" />
      </>
    )}
  </CollapsibleTrigger>
))
ReasoningTrigger.displayName = "ReasoningTrigger"

const ReasoningContent = React.forwardRef<
  React.ElementRef<typeof CollapsibleContent>,
  React.ComponentProps<typeof CollapsibleContent>
>(({ className, children, ...props }, ref) => (
  <CollapsibleContent
    ref={ref}
    className={cn(
      "text-sm text-zinc-600 dark:text-zinc-400 overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
      className
    )}
    {...props}
  >
    <div className="px-4 pb-4 pt-0 border-t border-zinc-100 dark:border-zinc-800">{children}</div>
  </CollapsibleContent>
))
ReasoningContent.displayName = "ReasoningContent"

export { Reasoning, ReasoningTrigger, ReasoningContent }
