import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { User } from "@/components/animate-ui/icons/user";
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";
import { ExternalLink } from "@/components/animate-ui/icons/external-link";
import { IconArrowUp, IconFileText, IconQuote } from "@/components/icon";

// Scroll configuration
const SCROLL_CONFIG = {
  BOTTOM_THRESHOLD: 100, // px - distance from bottom to consider "at bottom"
} as const

// Assistant Message Component
export interface AssistantMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  isUser?: boolean
}

export const AssistantMessage = React.forwardRef<HTMLDivElement, AssistantMessageProps>(
  ({ className, isUser = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "group relative flex items-start gap-3",
          isUser && "flex-row-reverse",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
AssistantMessage.displayName = "AssistantMessage"

// Assistant Avatar Component
export type AssistantAvatarProps = React.HTMLAttributes<HTMLDivElement>

export const AssistantAvatar = React.forwardRef<HTMLDivElement, AssistantAvatarProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex size-8 shrink-0 select-none items-center justify-center rounded-full overflow-hidden",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
AssistantAvatar.displayName = "AssistantAvatar"

// Assistant Content Component
export type AssistantContentProps = React.HTMLAttributes<HTMLDivElement>

export const AssistantContent = React.forwardRef<HTMLDivElement, AssistantContentProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex-1 space-y-2 overflow-hidden", className)}
        {...props}
      />
    )
  }
)
AssistantContent.displayName = "AssistantContent"

// Assistant Bubble Component
export interface AssistantBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  isUser?: boolean
}

export const AssistantBubble = React.forwardRef<HTMLDivElement, AssistantBubbleProps>(
  ({ className, isUser = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted",
          className
        )}
        {...props}
      />
    )
  }
)
AssistantBubble.displayName = "AssistantBubble"

// Assistant Input Component
export type AssistantInputProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export const AssistantInput = React.forwardRef<HTMLTextAreaElement, AssistantInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <Textarea
        ref={ref}
        className={cn(
          "min-h-[60px] max-h-[200px] resize-none rounded-2xl border-0 bg-muted p-4 pr-16 focus-visible:ring-0 focus-visible:ring-offset-0",
          className
        )}
        {...props}
      />
    )
  }
)
AssistantInput.displayName = "AssistantInput"

// Assistant Actions Component
export type AssistantActionsProps = React.HTMLAttributes<HTMLDivElement>

export const AssistantActions = React.forwardRef<HTMLDivElement, AssistantActionsProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-2", className)}
        {...props}
      />
    )
  }
)
AssistantActions.displayName = "AssistantActions"

export interface AssistantMessageActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  isUser?: boolean
}

export const AssistantMessageActions = React.forwardRef<HTMLDivElement, AssistantMessageActionsProps>(
  ({ className, isUser = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "absolute -top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100",
          isUser ? "left-0" : "right-0",
          className
        )}
        {...props}
      />
    )
  }
)
AssistantMessageActions.displayName = "AssistantMessageActions"

export const Actions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-2", className)}
        {...props}
      />
    )
  }
)
Actions.displayName = "Actions"

export interface ActionProps extends React.ComponentProps<typeof Button> {
  label: string
  tooltip?: string
}

export const Action = React.forwardRef<HTMLButtonElement, ActionProps>(
  ({ className, label, tooltip, variant = "ghost", size = "icon", children, ...props }, ref) => {
    const btn = (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        aria-label={label}
        className={cn("rounded-full", className)}
        {...props}
      >
        {children}
      </Button>
    )

    if (tooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {btn}
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }
    return btn
  }
)
Action.displayName = "Action"

type ScrollBehaviorType = "auto" | "smooth"

interface ConversationContextValue {
  containerEl: HTMLDivElement | null
  setContainerEl: (el: HTMLDivElement | null) => void
  atBottom: boolean
  setAtBottom: (v: boolean) => void
  initialScrollBehavior: ScrollBehaviorType
  resizeScrollBehavior: ScrollBehaviorType
  scrollToBottom: (behavior?: ScrollBehaviorType) => void
}

const ConversationContext = React.createContext<ConversationContextValue | null>(null)

export interface ConversationProps extends React.HTMLAttributes<HTMLDivElement> {
  initialScrollBehavior?: ScrollBehaviorType
  resizeScrollBehavior?: ScrollBehaviorType
}

export const Conversation = React.forwardRef<HTMLDivElement, ConversationProps>(
  ({ className, initialScrollBehavior = "smooth", resizeScrollBehavior = "smooth", ...props }, ref) => {
    const [containerEl, setContainerEl] = React.useState<HTMLDivElement | null>(null)
    const [atBottom, setAtBottom] = React.useState(true)

    const scrollToBottom = React.useCallback((behavior: ScrollBehaviorType = initialScrollBehavior) => {
      const el = containerEl
      if (!el) return
      el.scrollTo({ top: el.scrollHeight, behavior })
    }, [containerEl, initialScrollBehavior])

    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = React.useMemo(() => ({
      containerEl,
      setContainerEl,
      atBottom,
      setAtBottom,
      initialScrollBehavior,
      resizeScrollBehavior,
      scrollToBottom
    }), [containerEl, atBottom, initialScrollBehavior, resizeScrollBehavior, scrollToBottom])

    return (
      <ConversationContext.Provider value={contextValue}>
        <div ref={ref} className={cn("relative h-full", className)} {...props} />
      </ConversationContext.Provider>
    )
  }
)
Conversation.displayName = "Conversation"

export const ConversationContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const ctx = React.useContext(ConversationContext)
    const localRef = React.useRef<HTMLDivElement>(null)
    const isInitializedRef = React.useRef(false)

    // Use useCallback to prevent ref callback from changing on every render
    const refCallback = React.useCallback((node: HTMLDivElement | null) => {
      localRef.current = node
      
      // Only set containerEl once when the component mounts, not on every render
      if (ctx && node && !isInitializedRef.current) {
        ctx.setContainerEl(node)
        isInitializedRef.current = true
      } else if (ctx && !node && isInitializedRef.current) {
        // Clean up when component unmounts
        ctx.setContainerEl(null)
        isInitializedRef.current = false
      }
      
      if (typeof ref === "function") ref(node as HTMLDivElement)
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node as HTMLDivElement
    }, [ctx, ref])

    // Auto-scroll to bottom when content changes and user is at bottom
    React.useEffect(() => {
      const el = localRef.current
      if (!el || !ctx || !ctx.atBottom) return
      
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
      })
    })

    React.useEffect(() => {
      const el = ctx?.containerEl
      if (!el || !ctx) return
      const ro = new ResizeObserver(() => {
        // Auto-scroll on resize if at bottom
        if (ctx.atBottom) {
          requestAnimationFrame(() => {
            el.scrollTo({ top: el.scrollHeight, behavior: "auto" })
          })
        }
      })
      ro.observe(el)
      return () => ro.disconnect()
    }, [ctx])

    const handleScroll = React.useCallback(() => {
      const el = ctx?.containerEl
      if (!el || !ctx) return
      const threshold = SCROLL_CONFIG.BOTTOM_THRESHOLD
      const atBottomNow = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold
      ctx.setAtBottom(atBottomNow)
    }, [ctx])

    return (
      <div
        ref={refCallback}
        onScroll={handleScroll}
        className={cn("h-full", className)}
        style={{ overflowY: 'auto' }}
        data-lenis-prevent
        {...props}
      />
    )
  }
)
ConversationContent.displayName = "ConversationContent"

export const ConversationScrollButton = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ className, children, ...props }, ref) => {
    const ctx = React.useContext(ConversationContext)
    if (!ctx || ctx.atBottom) return null
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        className={cn("absolute bottom-4 right-4 rounded-full", className)}
        onClick={() => ctx.scrollToBottom("smooth")}
        {...props}
      >
        {children ?? <span aria-hidden>↓</span>}
      </Button>
    )
  }
)
ConversationScrollButton.displayName = "ConversationScrollButton"

export const InlineCitation = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span ref={ref} className={cn("inline-flex items-baseline align-baseline", className)} {...props} />
  )
)
InlineCitation.displayName = "InlineCitation"

export const InlineCitationCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("inline-flex items-center", className)} {...props} />
  )
)
InlineCitationCard.displayName = "InlineCitationCard"

export interface InlineCitationCardTriggerProps extends React.ComponentProps<typeof Button> {
  sources: string[]
  number?: string
  children?: React.ReactNode
}

export const InlineCitationCardTrigger = React.forwardRef<HTMLButtonElement, InlineCitationCardTriggerProps>(
  ({ className, sources, number, children, ...props }, ref) => {
    const label = number ? `[${number}]` : `[${sources.length}]`
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button ref={ref} variant="ghost" size="sm" className={cn("px-2 h-6 rounded-lg text-xs", className)} {...props}>
              {label}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="p-0">
            <div className="w-[320px] rounded-lg border bg-background">
              <div className="p-3 text-xs text-muted-foreground">参考来源</div>
              {children}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
)
InlineCitationCardTrigger.displayName = "InlineCitationCardTrigger"

export const InlineCitationCardBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-3", className)} {...props} />
  )
)
InlineCitationCardBody.displayName = "InlineCitationCardBody"

export const InlineCitationCarousel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-2", className)} {...props} />
  )
)
InlineCitationCarousel.displayName = "InlineCitationCarousel"

export const InlineCitationCarouselHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center justify-between p-3 border-b", className)} {...props} />
  )
)
InlineCitationCarouselHeader.displayName = "InlineCitationCarouselHeader"

export const InlineCitationCarouselIndex = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span ref={ref} className={cn("text-xs text-muted-foreground", className)} {...props} />
  )
)
InlineCitationCarouselIndex.displayName = "InlineCitationCarouselIndex"

export const InlineCitationCarouselContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-3", className)} {...props} />
  )
)
InlineCitationCarouselContent.displayName = "InlineCitationCarouselContent"

export const InlineCitationCarouselItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-2", className)} {...props} />
  )
)
InlineCitationCarouselItem.displayName = "InlineCitationCarouselItem"

export interface InlineCitationSourceProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  url: string
  description?: string
}

export const InlineCitationSource = React.forwardRef<HTMLDivElement, InlineCitationSourceProps>(
  ({ className, title, url, description, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-1", className)} {...props}>
      <a href={url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">{title}</a>
      <div className="text-xs text-muted-foreground break-all">{url}</div>
      {description && <div className="text-xs text-muted-foreground">{description}</div>}
    </div>
  )
)
InlineCitationSource.displayName = "InlineCitationSource"

export const InlineCitationQuote = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-lg bg-muted p-2 text-xs", className)} {...props} />
  )
)
InlineCitationQuote.displayName = "InlineCitationQuote"

export interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number
}

export const Loader = React.forwardRef<HTMLDivElement, LoaderProps>((
  { className, size = 16, ...props },
  ref
) => (
  <div
    ref={ref}
    role="status"
    style={{ width: size, height: size }}
    className={cn("inline-block animate-spin rounded-full border-2 border-current border-t-transparent", className)}
    {...props}
  />
))
Loader.displayName = "Loader"

export type PromptInputProps = React.FormHTMLAttributes<HTMLFormElement>

export const PromptInput = React.forwardRef<HTMLFormElement, PromptInputProps>(({ className, ...props }, ref) => (
  <form ref={ref} className={cn("w-full", className)} {...props} />
))
PromptInput.displayName = "PromptInput"

export type PromptInputTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export const PromptInputTextarea = React.forwardRef<HTMLTextAreaElement, PromptInputTextareaProps>(({ className, onKeyDown, ...props }, ref) => {
  const localRef = React.useRef<HTMLTextAreaElement>(null)
  React.useEffect(() => {
    const el = localRef.current
    if (!el) return
    el.style.height = "0px"
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [props.value])
  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      e.currentTarget.form?.requestSubmit()
      return
    }
    onKeyDown?.(e)
  }
  return (
    <Textarea
      ref={(node) => {
        localRef.current = node as HTMLTextAreaElement | null
        if (typeof ref === "function") ref(node as HTMLTextAreaElement)
        else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node as HTMLTextAreaElement
      }}
      className={cn(
        "min-h-[60px] max-h-[200px] resize-none rounded-2xl border-0 bg-muted p-4 pr-16 focus-visible:ring-0 focus-visible:ring-offset-0",
        className
      )}
      onKeyDown={handleKeyDown}
      {...props}
    />
  )
})
PromptInputTextarea.displayName = "PromptInputTextarea"

export type PromptInputToolbarProps = React.HTMLAttributes<HTMLDivElement>

export const PromptInputToolbar = React.forwardRef<HTMLDivElement, PromptInputToolbarProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("mt-2 flex items-center justify-between", className)} {...props} />
))
PromptInputToolbar.displayName = "PromptInputToolbar"

export type PromptInputToolsProps = React.HTMLAttributes<HTMLDivElement>

export const PromptInputTools = React.forwardRef<HTMLDivElement, PromptInputToolsProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center gap-2", className)} {...props} />
))
PromptInputTools.displayName = "PromptInputTools"

export const PromptInputButton = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(({ className, ...props }, ref) => (
  <Button ref={ref} variant="ghost" size="icon" className={cn("rounded-full", className)} {...props} />
))
PromptInputButton.displayName = "PromptInputButton"

export interface PromptInputSubmitProps extends React.ComponentProps<typeof Button> {
  status?: "idle" | "loading"
}

export const PromptInputSubmit = React.forwardRef<HTMLButtonElement, PromptInputSubmitProps>(({ className, status = "idle", disabled, ...props }, ref) => (
  <Button
    ref={ref}
    type="submit"
    size="icon"
    disabled={disabled || status === "loading"}
    className={cn("size-8 rounded-full bg-gradient-to-r from-primary to-primary hover:from-emerald-600 hover:to-emerald-700", className)}
    {...props}
  >
    {status === "loading" ? <Loader size={20} /> : <IconArrowUp className="size-4" />}
  </Button>
))
PromptInputSubmit.displayName = "PromptInputSubmit"

interface PromptModelContextValue {
  value: string
  onChange: (v: string) => void
}
const PromptModelContext = React.createContext<PromptModelContextValue | null>(null)

export interface PromptInputModelSelectProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  onValueChange: (v: string) => void
}

export const PromptInputModelSelect = React.forwardRef<HTMLDivElement, PromptInputModelSelectProps>(({ className, value, onValueChange, children, ...props }, ref) => (
  <PromptModelContext.Provider value={{ value, onChange: onValueChange }}>
    <DropdownMenu>
      <div ref={ref} className={cn("flex items-center", className)} {...props}>{children}</div>
    </DropdownMenu>
  </PromptModelContext.Provider>
))
PromptInputModelSelect.displayName = "PromptInputModelSelect"

export const PromptInputModelSelectTrigger = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(({ className, children, ...props }, ref) => (
  <DropdownMenuTrigger asChild>
    <Button ref={ref} variant="ghost" size="sm" className={cn("h-8 px-3 rounded-full", className)} {...props}>
      {children}
    </Button>
  </DropdownMenuTrigger>
))
PromptInputModelSelectTrigger.displayName = "PromptInputModelSelectTrigger"

export const PromptInputModelSelectContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, children, ...props }, ref) => (
  <DropdownMenuContent ref={ref} className={cn("min-w-[12rem]", className)} {...props}>
    {children}
  </DropdownMenuContent>
))
PromptInputModelSelectContent.displayName = "PromptInputModelSelectContent"

export interface PromptInputModelSelectItemProps extends Omit<React.ComponentPropsWithoutRef<typeof DropdownMenuItem>, 'onSelect'> {
  value: string
}

export const PromptInputModelSelectItem = React.forwardRef<React.ElementRef<typeof DropdownMenuItem>, PromptInputModelSelectItemProps>(({ className, value, children, ...props }, ref) => {
  const ctx = React.useContext(PromptModelContext)
  const isSelected = ctx?.value === value
  return (
    <DropdownMenuItem ref={ref} className={cn("flex items-center gap-2", className)} onSelect={(e) => { e.preventDefault(); ctx?.onChange(value) }} {...props}>
      <span className={cn("inline-block size-2 rounded-full", isSelected ? "bg-primary" : "bg-muted")} />
      <span>{children ?? value}</span>
    </DropdownMenuItem>
  )
})
PromptInputModelSelectItem.displayName = "PromptInputModelSelectItem"

export const PromptInputModelSelectValue = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(({ className, ...props }, ref) => {
  const ctx = React.useContext(PromptModelContext)
  return (
    <span ref={ref} className={cn("text-sm", className)} {...props}>{ctx?.value || "模型"}</span>
  )
})
PromptInputModelSelectValue.displayName = "PromptInputModelSelectValue"

export interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  from?: "user" | "assistant" | "system"
}

export const Message = React.forwardRef<HTMLDivElement, MessageProps>(({ className, from = "assistant", children, ...props }, ref) => (
  <AssistantMessage ref={ref} isUser={from === "user"} className={cn(from === "system" ? "justify-center" : "", className)} {...props}>
    {children}
  </AssistantMessage>
))
Message.displayName = "Message"

export type MessageContentProps = React.HTMLAttributes<HTMLDivElement>

export const MessageContent = React.forwardRef<HTMLDivElement, MessageContentProps>(({ className, ...props }, ref) => (
  <AssistantContent ref={ref} className={className} {...props} />
))
MessageContent.displayName = "MessageContent"

export interface MessageAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  name?: string
  from?: "user" | "assistant" | "system"
}

export const MessageAvatar = React.forwardRef<HTMLDivElement, MessageAvatarProps>(({ className, src, name, from = "assistant", ...props }, ref) => (
  <AssistantAvatar ref={ref} className={className} {...props}>
    {src ? (
      <Image src={src} alt={name ?? "Avatar"} width={32} height={32} className="rounded-full object-cover" />
    ) : name ? (
      <span className="text-[11px] font-medium uppercase leading-none">{name.slice(0, 2)}</span>
    ) : from === "user" ? (
      <User className="size-4" />
    ) : null}
  </AssistantAvatar>
))
MessageAvatar.displayName = "MessageAvatar"

interface BranchContextValue {
  index: number
  count: number
  setIndex: (i: number) => void
}

const BranchContext = React.createContext<BranchContextValue | null>(null)

export interface BranchProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultBranch?: number
  onBranchChange?: (index: number) => void
  count?: number
}

export const Branch = React.forwardRef<HTMLDivElement, BranchProps>(
  ({ className, defaultBranch = 0, onBranchChange, count = 0, ...props }, ref) => {
    const [index, setIndex] = React.useState(defaultBranch)
    const set = (i: number) => {
      const next = Math.max(0, Math.min(i, Math.max(0, count - 1)))
      setIndex(next)
      onBranchChange?.(next)
    }
    return (
      <BranchContext.Provider value={{ index, count, setIndex: set }}>
        <div ref={ref} className={cn("flex flex-col gap-2", className)} {...props} />
      </BranchContext.Provider>
    )
  }
)
Branch.displayName = "Branch"

export const BranchMessages = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-2", className)} {...props} />
  )
)
BranchMessages.displayName = "BranchMessages"

export interface BranchSelectorProps extends React.HTMLAttributes<HTMLDivElement> {
  from?: "user" | "assistant" | "system"
}

export const BranchSelector = React.forwardRef<HTMLDivElement, BranchSelectorProps>(
  ({ className, from = "assistant", ...props }, ref) => {
    const ctx = React.useContext(BranchContext)
    const align = from === "assistant" ? "justify-end" : from === "user" ? "justify-start" : "justify-center"
    return (
      <div ref={ref} className={cn("flex items-center gap-2", align, className)} {...props} />
    )
  }
)
BranchSelector.displayName = "BranchSelector"

export const BranchPrevious = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ className, ...props }, ref) => {
    const ctx = React.useContext(BranchContext)
    const disabled = !ctx || ctx.index <= 0
    return (
      <Button ref={ref} variant="ghost" size="icon" disabled={disabled} className={cn("rounded-full", className)}
        onClick={() => ctx && ctx.setIndex(ctx.index - 1)} {...props}>
        <span aria-hidden>◀</span>
      </Button>
    )
  }
)
BranchPrevious.displayName = "BranchPrevious"

export const BranchNext = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ className, ...props }, ref) => {
    const ctx = React.useContext(BranchContext)
    const disabled = !ctx || ctx.index >= Math.max(0, ctx.count - 1)
    return (
      <Button ref={ref} variant="ghost" size="icon" disabled={disabled} className={cn("rounded-full", className)}
        onClick={() => ctx && ctx.setIndex(ctx.index + 1)} {...props}>
        <span aria-hidden>▶</span>
      </Button>
    )
  }
)
BranchNext.displayName = "BranchNext"

export const BranchPage = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => {
    const ctx = React.useContext(BranchContext)
    const label = ctx ? `${ctx.index + 1} / ${Math.max(0, ctx.count)}` : "- / -"
    return (
      <span ref={ref} className={cn("text-xs text-muted-foreground", className)} {...props}>{label}</span>
    )
  }
)
BranchPage.displayName = "BranchPage"

interface ReasoningContextValue {
  open: boolean
  setOpen: (v: boolean) => void
  durationMs?: number
  finalized?: boolean
}

const ReasoningContext = React.createContext<ReasoningContextValue | null>(null)

export interface ReasoningProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean
  onOpenChange?: (v: boolean) => void
  durationMs?: number
  finalized?: boolean
}

export const Reasoning = React.forwardRef<HTMLDivElement, ReasoningProps>(
  ({ className, open = true, onOpenChange, durationMs, finalized, children, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(open)
    React.useEffect(() => { setIsOpen(open) }, [open])
    React.useEffect(() => { if (finalized) setTimeout(() => setIsOpen(false), 300) }, [finalized])
    const ctx: ReasoningContextValue = { open: isOpen, setOpen: (v) => { setIsOpen(v); onOpenChange?.(v) }, durationMs, finalized }
    return (
      <ReasoningContext.Provider value={ctx}>
        <div ref={ref} className={cn("flex flex-col gap-2", className)} {...props}>{children}</div>
      </ReasoningContext.Provider>
    )
  }
)
Reasoning.displayName = "Reasoning"

export const ReasoningTrigger = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ className, children, ...props }, ref) => {
    const ctx = React.useContext(ReasoningContext)
    const d = typeof ctx?.durationMs === "number" ? `${(ctx.durationMs / 1000).toFixed(1)}s` : ""
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="sm"
        className={cn("h-6 px-2 rounded-full text-xs", className)}
        onClick={() => ctx?.setOpen?.(!ctx.open)}
        {...props}
      >
        <span>{ctx?.open ? "收起" : `思考过程${d ? ` · ${d}` : ""}`}</span>
      </Button>
    )
  }
)
ReasoningTrigger.displayName = "ReasoningTrigger"

export const ReasoningContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const ctx = React.useContext(ReasoningContext)
    return (
      <div
        ref={ref}
        className={cn(
          "overflow-hidden transition-all",
          ctx?.open ? "max-h-[240px] opacity-100" : "max-h-0 opacity-0",
          className
        )}
        {...props}
      >
        <div className="rounded-2xl bg-muted/50 text-foreground/80 text-xs p-3 border border-border">
          <div className="flex items-center gap-2 mb-2">
            {ctx?.finalized ? null : <Loader size={12} />}
            <span className="text-xs">{ctx?.finalized ? "思考完成" : "思考中..."}</span>
            {typeof ctx?.durationMs === "number" ? <span className="text-xs text-muted-foreground/70">{(ctx.durationMs / 1000).toFixed(1)}s</span> : null}
          </div>
          <div className="whitespace-pre-wrap leading-relaxed">{children}</div>
        </div>
      </div>
    )
  }
)
ReasoningContent.displayName = "ReasoningContent"

export interface ResponseProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

const sanitizeStreamingMarkdown = (input: string): string => {
  let s = input
  const fences = (s.match(/```/g) || []).length
  if (fences % 2 === 1) {
    const lastFence = s.lastIndexOf("```")
    if (lastFence !== -1) s = s.slice(0, lastFence)
  }
  const bold = (s.match(/\*\*/g) || []).length
  if (bold % 2 === 1) s += "**"
  const inlineCode = (s.match(/`/g) || []).length
  if (inlineCode % 2 === 1) s += "`"
  s = s.replace(/\[[^\]]*\]\([^)]*$/g, (m) => m.replace(/\([^)]*$/, ""))
  return s
}

export const Response = React.forwardRef<HTMLDivElement, ResponseProps>(({ className, children, ...props }, ref) => {
  if (typeof children === "string") {
    const safe = sanitizeStreamingMarkdown(children)
    return (
      <div ref={ref} className={cn("text-sm leading-relaxed", className)} aria-live="polite" {...props}>
        <span className="whitespace-pre-wrap">{safe}</span>
      </div>
    )
  }
  return (
    <div ref={ref} className={cn("text-sm leading-relaxed", className)} aria-live="polite" {...props}>{children}</div>
  )
})
Response.displayName = "Response"

interface SourcesContextValue {
  open: boolean
  setOpen: (v: boolean) => void
}

const SourcesContext = React.createContext<SourcesContextValue | null>(null)

export interface SourcesProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean
  onOpenChange?: (v: boolean) => void
}

export const Sources = React.forwardRef<HTMLDivElement, SourcesProps>(
  ({ className, open = false, onOpenChange, children, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(open)
    React.useEffect(() => { setIsOpen(open) }, [open])
    const ctx: SourcesContextValue = { open: isOpen, setOpen: (v) => { setIsOpen(v); onOpenChange?.(v) } }
    return (
      <SourcesContext.Provider value={ctx}>
        <div ref={ref} className={cn("flex flex-col gap-2", className)} {...props}>{children}</div>
      </SourcesContext.Provider>
    )
  }
)
Sources.displayName = "Sources"

export interface SourcesTriggerProps extends React.ComponentProps<typeof Button> {
  count?: number
}

export const SourcesTrigger = React.forwardRef<HTMLButtonElement, SourcesTriggerProps>(
  ({ className, count = 0, children, ...props }, ref) => {
    const ctx = React.useContext(SourcesContext)
    const label = children ?? `参考来源 ${count}`
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="sm"
        className={cn(
          "h-6 px-2 rounded-lg text-xs font-medium transition-all",
          "bg-zinc-100 hover:bg-zinc-200",
          "dark:bg-zinc-800 dark:hover:bg-zinc-700",
          "text-zinc-600 dark:text-zinc-400",
          "border-0",
          className
        )}
        onClick={() => ctx?.setOpen?.(!ctx.open)}
        {...props}
      >
        <ChevronDown className={cn("mr-1 size-3 transition-transform", ctx?.open ? "rotate-180" : "rotate-0")} />
        <span>{label}</span>
      </Button>
    )
  }
)
SourcesTrigger.displayName = "SourcesTrigger"

export const SourcesContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const ctx = React.useContext(SourcesContext)
    return (
      <div
        ref={ref}
        className={cn(
          "overflow-hidden transition-all",
          ctx?.open ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0",
          className
        )}
        {...props}
      >
        <div className="mt-2 space-y-2">
          {children}
        </div>
      </div>
    )
  }
)
SourcesContent.displayName = "SourcesContent"

export interface SourceProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  title?: string
  description?: string
  quote?: string
  number?: string | number
}

export const Source = React.forwardRef<HTMLAnchorElement, SourceProps>(({ className, href, title, description, quote, number, children, ...props }, ref) => {
  let host = ""
  try { 
    if (href) {
      host = new URL(href).hostname 
    }
  } catch { }
  
  // 如果没有 href，不渲染链接，只渲染内容
  if (!href) {
    return (
      <div
        ref={ref as any}
        className={cn(
          "block rounded-lg p-3 transition-all",
          "bg-zinc-50 dark:bg-zinc-900",
          "border border-zinc-200 dark:border-zinc-800",
          className
        )}
        {...props as any}
      >
        <div className="flex items-start gap-3">
          {number ? (
            <span className="shrink-0 size-5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-xs font-medium flex items-center justify-center">
              {number}
            </span>
          ) : null}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">{title || "未知来源"}</div>
            {description ? <div className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">{description}</div> : null}
          </div>
        </div>
      </div>
    )
  }

  const label = `${number ? `[${number}] ` : ""}${title ?? href}`
  return (
    <a
      ref={ref}
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        "group block rounded-lg p-3 transition-all",
        "bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800",
        "border border-zinc-200 dark:border-zinc-800",
        "hover:border-zinc-300 dark:hover:border-zinc-700",
        className
      )}
      aria-label={label}
      {...props}
    >
      <div className="flex items-start gap-3">
        {number ? (
          <span className="shrink-0 size-5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-xs font-medium flex items-center justify-center">
            {number}
          </span>
        ) : null}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
              {title ?? href}
            </span>
            <ExternalLink className="size-3 shrink-0 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
          </div>
          {host ? (
            <div className="text-xs text-zinc-500 dark:text-zinc-500 mb-1 truncate">{host}</div>
          ) : null}
          {description ? <div className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">{description}</div> : null}
        </div>
      </div>
    </a>
  )
})
Source.displayName = "Source"

// Assistant Modal Component
export type AssistantModalProps = React.HTMLAttributes<HTMLDivElement>

export const AssistantModal = React.forwardRef<HTMLDivElement, AssistantModalProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex h-full flex-col rounded-xl border bg-background shadow-lg",
          className
        )}
        {...props}
      />
    )
  }
)
AssistantModal.displayName = "AssistantModal"

// Assistant Modal Header Component
export type AssistantModalHeaderProps = React.HTMLAttributes<HTMLDivElement>

export const AssistantModalHeader = React.forwardRef<HTMLDivElement, AssistantModalHeaderProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between border-b px-4 py-3",
          className
        )}
        {...props}
      />
    )
  }
)
AssistantModalHeader.displayName = "AssistantModalHeader"

// Assistant Modal Content Component
export type AssistantModalContentProps = React.HTMLAttributes<HTMLDivElement>

export const AssistantModalContent = React.forwardRef<HTMLDivElement, AssistantModalContentProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex-1 overflow-y-auto p-4", className)}
        {...props}
      />
    )
  }
)
AssistantModalContent.displayName = "AssistantModalContent"

// Assistant Modal Footer Component
export type AssistantModalFooterProps = React.HTMLAttributes<HTMLDivElement>

export const AssistantModalFooter = React.forwardRef<HTMLDivElement, AssistantModalFooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("border-t p-4", className)}
        {...props}
      />
    )
  }
)
AssistantModalFooter.displayName = "AssistantModalFooter"
export const Suggestions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center gap-2 overflow-x-auto -mx-2 px-2 py-1", className)}
      {...props}
    />
  )
)
Suggestions.displayName = "Suggestions"

export interface SuggestionProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onSelect'> {
  suggestion: string
  onChoose?: (value: string) => void
}

export const Suggestion = React.forwardRef<HTMLButtonElement, SuggestionProps>(
  ({ className, suggestion, onChoose, ...props }, ref) => (
    <Button
      ref={ref}
      variant="ghost"
      size="sm"
      className={cn("rounded-full px-3 py-1.5 text-xs sm:text-sm bg-muted/50 hover:bg-muted border border-border text-foreground", className)}
      onClick={() => onChoose?.(suggestion)}
      {...props}
    >
      {suggestion}
    </Button>
  )
)
Suggestion.displayName = "Suggestion"
interface TaskContextValue {
  open: boolean
  setOpen: (v: boolean) => void
}

const TaskContext = React.createContext<TaskContextValue | null>(null)

export interface TaskProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean
  onOpenChange?: (v: boolean) => void
}

export const Task = React.forwardRef<HTMLDivElement, TaskProps>(
  ({ className, open = false, onOpenChange, children, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(open)
    React.useEffect(() => { setIsOpen(open) }, [open])
    const ctx: TaskContextValue = { open: isOpen, setOpen: (v) => { setIsOpen(v); onOpenChange?.(v) } }
    return (
      <TaskContext.Provider value={ctx}>
        <div ref={ref} className={cn("flex flex-col gap-2", className)} {...props}>{children}</div>
      </TaskContext.Provider>
    )
  }
)
Task.displayName = "Task"

export interface TaskTriggerProps extends React.ComponentProps<typeof Button> {
  title: string
  status?: "pending" | "in_progress" | "completed"
}

export const TaskTrigger = React.forwardRef<HTMLButtonElement, TaskTriggerProps>(
  ({ className, title, status, ...props }, ref) => {
    const ctx = React.useContext(TaskContext)
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="sm"
        className={cn("h-6 px-2 rounded-full text-xs", className)}
        onClick={() => ctx?.setOpen?.(!ctx.open)}
        aria-expanded={ctx?.open}
        {...props}
      >
        <ChevronDown className={cn("mr-1 size-3 transition-transform", ctx?.open ? "rotate-180" : "rotate-0")} />
        <span className={cn("mr-1 inline-block size-2 rounded-full",
          status === "completed" ? "bg-emerald-400" : status === "in_progress" ? "bg-yellow-400" : "bg-white/40"
        )} />
        <span>{title}</span>
      </Button>
    )
  }
)
TaskTrigger.displayName = "TaskTrigger"

export const TaskContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const ctx = React.useContext(TaskContext)
    return (
      <div
        ref={ref}
        className={cn(
          "overflow-hidden transition-all",
          ctx?.open ? "max-h-[320px] opacity-100" : "max-h-0 opacity-0",
          className
        )}
        {...props}
      >
        <div className="rounded-2xl bg-muted/50 text-foreground/80 text-xs p-3 border border-border max-h-[280px] overflow-y-auto">
          <div className="flex flex-col gap-2">
            {children}
          </div>
        </div>
      </div>
    )
  }
)
TaskContent.displayName = "TaskContent"

export const TaskItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-xs text-foreground/80", className)} {...props} />
  )
)
TaskItem.displayName = "TaskItem"

export const TaskItemFile = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, children, ...props }, ref) => (
    <span ref={ref} className={cn("inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-1.5 py-0.5", className)} {...props}>
      <IconFileText className="size-3" />
      <span className="text-foreground/90">{children}</span>
    </span>
  )
)
TaskItemFile.displayName = "TaskItemFile"
