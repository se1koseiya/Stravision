"use client"

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  Maximize2Icon,
  MousePointerClickIcon,
  RefreshCcwIcon,
  Globe,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import type { ComponentProps, ReactNode } from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export interface WebPreviewContextValue {
  url: string
  setUrl: (url: string) => void
  consoleOpen: boolean
  setConsoleOpen: (open: boolean) => void
}

const WebPreviewContext = createContext<WebPreviewContextValue | null>(null)

const useWebPreview = () => {
  const context = useContext(WebPreviewContext)
  if (!context) {
    throw new Error("WebPreview components must be used within a WebPreview")
  }
  return context
}

export type WebPreviewProps = ComponentProps<"div"> & {
  defaultUrl?: string
  onUrlChange?: (url: string) => void
}

export const WebPreview = ({
  className,
  children,
  defaultUrl = "",
  onUrlChange,
  ...props
}: WebPreviewProps) => {
  const [url, setUrl] = useState(defaultUrl)
  const [consoleOpen, setConsoleOpen] = useState(false)

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl)
    onUrlChange?.(newUrl)
  }

  const contextValue: WebPreviewContextValue = {
    url,
    setUrl: handleUrlChange,
    consoleOpen,
    setConsoleOpen,
  }

  return (
    <WebPreviewContext.Provider value={contextValue}>
      <div
        className={cn("flex size-full flex-col rounded-lg border bg-card", className)}
        {...props}
      >
        {children}
      </div>
    </WebPreviewContext.Provider>
  )
}

export type WebPreviewNavigationProps = ComponentProps<"div">

export const WebPreviewNavigation = ({
  className,
  children,
  ...props
}: WebPreviewNavigationProps) => (
  <div className={cn("flex items-center gap-1 border-b p-2", className)} {...props}>
    {children}
  </div>
)

export type WebPreviewNavigationButtonProps = ComponentProps<typeof Button> & {
  tooltip?: string
}

export const WebPreviewNavigationButton = ({
  onClick,
  disabled,
  tooltip,
  children,
  ...props
}: WebPreviewNavigationButtonProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className="h-8 w-8 p-0 hover:text-foreground"
          disabled={disabled}
          onClick={onClick}
          size="sm"
          variant="ghost"
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)

export type WebPreviewUrlProps = ComponentProps<typeof Input>

export const WebPreviewUrl = ({ value, onChange, onKeyDown, ...props }: WebPreviewUrlProps) => {
  const { url, setUrl } = useWebPreview()
  const [inputValue, setInputValue] = useState(url)

  // Sync input value with context URL when it changes externally
  useEffect(() => {
    setInputValue(url)
  }, [url])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value)
    onChange?.(event)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      const target = event.target as HTMLInputElement
      setUrl(target.value)
    }
    onKeyDown?.(event)
  }

  return (
    <Input
      className="h-8 flex-1 text-sm"
      onChange={onChange ?? handleChange}
      onKeyDown={handleKeyDown}
      placeholder="Enter URL..."
      value={value ?? inputValue}
      {...props}
    />
  )
}

export type WebPreviewBodyProps = ComponentProps<"iframe"> & {
  loading?: ReactNode
}

export const WebPreviewBody = ({ className, loading, src, ...props }: WebPreviewBodyProps) => {
  const { url } = useWebPreview()
  const finalUrl = src ?? url
  const [isBlocked, setIsBlocked] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    setIsBlocked(false)
  }, [finalUrl])

  const handleLoad = () => {
    setIsLoading(false)
  }

  const handleError = () => {
    setIsBlocked(true)
    setIsLoading(false)
  }

  if (!finalUrl) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-2">
          <Globe className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">输入 URL 开始浏览</p>
        </div>
      </div>
    )
  }

  if (isBlocked) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30 p-8">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 mx-auto rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">该内容被屏蔽了</h3>
            <p className="text-sm text-muted-foreground">
              由于安全策略限制，此网页无法在嵌入式框架中显示。
            </p>
          </div>
          <Button
            onClick={() => window.open(finalUrl, '_blank')}
            className="gap-2"
          >
            <ExternalLinkIcon className="w-4 h-4" />
            在新标签页中打开
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}
      <iframe
        className={cn("size-full", className)}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
        src={finalUrl || undefined}
        title="Preview"
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
      {loading}
    </div>
  )
}

export type WebPreviewConsoleProps = ComponentProps<"div"> & {
  logs?: Array<{
    level: "log" | "warn" | "error"
    message: string
    timestamp: Date
  }>
}

export const WebPreviewConsole = ({
  className,
  logs = [],
  children,
  ...props
}: WebPreviewConsoleProps) => {
  const { consoleOpen, setConsoleOpen } = useWebPreview()

  return (
    <Collapsible
      className={cn("border-t bg-muted/50 font-mono text-sm", className)}
      onOpenChange={setConsoleOpen}
      open={consoleOpen}
      {...props}
    >
      <CollapsibleTrigger asChild>
        <Button
          className="flex w-full items-center justify-between p-4 text-left font-medium hover:bg-muted/50"
          variant="ghost"
        >
          Console
          <ChevronDownIcon
            className={cn("h-4 w-4 transition-transform duration-200", consoleOpen && "rotate-180")}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn(
          "px-4 pb-4",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
        )}
      >
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-muted-foreground">No console output</p>
          ) : (
            logs.map((log, index) => (
              <div
                className={cn(
                  "text-xs",
                  log.level === "error" && "text-destructive",
                  log.level === "warn" && "text-yellow-600",
                  log.level === "log" && "text-foreground",
                )}
                key={`${log.timestamp.getTime()}-${index}`}
              >
                <span className="text-muted-foreground">{log.timestamp.toLocaleTimeString()}</span>{" "}
                {log.message}
              </div>
            ))
          )}
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

const exampleLogs = [
  {
    level: "log" as const,
    message: "Page loaded successfully",
    timestamp: new Date(Date.now() - 10_000),
  },
  {
    level: "warn" as const,
    message: "Deprecated API usage detected",
    timestamp: new Date(Date.now() - 5000),
  },
  { level: "error" as const, message: "Failed to load resource", timestamp: new Date() },
]

/** Demo component for preview */
export default function WebPreviewDemo() {
  return (
    <WebPreview defaultUrl="/" style={{ height: "400px" }}>
      <WebPreviewNavigation>
        <WebPreviewNavigationButton tooltip="Go back">
          <ArrowLeftIcon className="size-4" />
        </WebPreviewNavigationButton>
        <WebPreviewNavigationButton tooltip="Go forward">
          <ArrowRightIcon className="size-4" />
        </WebPreviewNavigationButton>
        <WebPreviewNavigationButton tooltip="Reload">
          <RefreshCcwIcon className="size-4" />
        </WebPreviewNavigationButton>
        <WebPreviewUrl />
        <WebPreviewNavigationButton tooltip="Select">
          <MousePointerClickIcon className="size-4" />
        </WebPreviewNavigationButton>
        <WebPreviewNavigationButton tooltip="Open in new tab">
          <ExternalLinkIcon className="size-4" />
        </WebPreviewNavigationButton>
        <WebPreviewNavigationButton tooltip="Maximize">
          <Maximize2Icon className="size-4" />
        </WebPreviewNavigationButton>
      </WebPreviewNavigation>
      <WebPreviewBody src="https://example.com" />
      <WebPreviewConsole logs={exampleLogs} />
    </WebPreview>
  )
}
