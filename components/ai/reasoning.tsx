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
          "border-l-2 border-emerald-200 dark:border-blue-800 pl-4 group/reasoning rounded-lg bg-emerald-50/30 dark:bg-blue-950/20 py-2",
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
      "flex items-center justify-between w-full text-sm font-medium text-emerald-700 dark:text-blue-400 hover:text-emerald-900 dark:hover:text-blue-300 transition-colors py-1 cursor-pointer",
      className
    )}
    {...props}
  >
    {children || (
      <>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span className="font-semibold">AI 思考过程</span>
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
      "text-sm text-gray-600 dark:text-gray-300 overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down mt-2",
      className
    )}
    {...props}
  >
    <div className="pb-2 pt-2 border-t border-emerald-100 dark:border-blue-900/50">{children}</div>
  </CollapsibleContent>
))
ReasoningContent.displayName = "ReasoningContent"

export { Reasoning, ReasoningTrigger, ReasoningContent }
