"use client"

import type { ToolUIPart } from "ai"
import { ComponentProps, ReactNode, useState, useEffect } from "react"
import { isValidElement } from "react"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { CodeBlock } from "@/components/ui/code-block"
import { IconCheck, IconCheckOne, IconCloseOne, IconCpu, IconDatabaseNetwork, IconDown, IconFingerprint, IconGlobe, IconLightning, IconLocalPin, IconRoundCaliper, IconSearch, IconSunny, IconTerminal, IconTime, IconTool } from "@/components/icon";

export type ToolProps = ComponentProps<typeof Collapsible>

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible 
    className={cn(
      "group relative my-4 w-full rounded-2xl border border-zinc-200/60 dark:border-white/10 bg-white/60 dark:bg-black/40 backdrop-blur-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] dark:shadow-none transition-all duration-300 hover:shadow-lg hover:border-primary/30 dark:hover:border-primary/30 overflow-hidden", 
      className
    )} 
    {...props} 
  />
)

export interface ToolHeaderProps {
  title?: string
  type: ToolUIPart["type"]
  state: ToolUIPart["state"]
  className?: string
  executionTime?: number
}

// Icon mapping based on tool meaning
const getToolSpecificIcon = (title: string = "") => {
  const t = title.toLowerCase()
  if (t.includes('weather') || t.includes('天气')) return <IconSunny className="size-4" />
  if (t.includes('route') || t.includes('路线') || t.includes('map') || t.includes('高德')) return <IconLocalPin className="size-4" />
  if (t.includes('search') || t.includes('搜索') || t.includes('brave') || t.includes('exa')) return <IconSearch className="size-4" />
  if (t.includes('scrape') || t.includes('抓取') || t.includes('web') || t.includes('网页')) return <IconGlobe className="size-4" />
  if (t.includes('device') || t.includes('设备') || t.includes('status')) return <IconCpu className="size-4" />
  if (t.includes('spectrum') || t.includes('光谱') || t.includes('channel')) return <IconLightning className="size-4" />
  if (t.includes('data') || t.includes('sql') || t.includes('db') || t.includes('数据')) return <IconDatabaseNetwork className="size-4" />
  return <IconTool className="size-4" />
}

export const ToolHeader = ({ className, title, type, state, executionTime, ...props }: ToolHeaderProps) => {
  const isCompleted = state === "output-available" || state === "approval-responded"
  const isRunning = state === "input-available" || state === "input-streaming"
  const isError = state === "output-error" || state === "output-denied"
  
  const displayTitle = title ?? type.split("-").slice(1).join("-")
  const icon = getToolSpecificIcon(displayTitle)

  return (
    <CollapsibleTrigger
      className={cn(
        "flex w-full items-center justify-between gap-4 p-4 transition-colors hover:bg-zinc-50/50 dark:hover:bg-white/[0.02]", 
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3.5">
        {/* Animated Icon Container */}
        <div className="relative flex items-center justify-center">
          {isRunning && (
            <span className="absolute inset-0 block size-8 rounded-full bg-primary/20 animate-ping" />
          )}
          <div className={cn(
            "relative z-10 flex size-8 items-center justify-center rounded-xl border shadow-sm transition-colors",
            isCompleted ? "bg-emerald-50 dark:bg-primary/10 border-emerald-200 dark:border-primary/20 text-primary dark:text-emerald-400" :
            isError ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400" :
            "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400"
          )}>
            {icon}
          </div>
        </div>
        
        <div className="flex flex-col items-start">
          <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 placeholder:tracking-tight">{displayTitle}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={cn(
              "text-[10px] font-medium uppercase tracking-wider",
              isCompleted ? "text-primary dark:text-emerald-400" :
              isError ? "text-red-500" :
              "text-blue-500 animate-pulse"
            )}>
              {isCompleted ? "Completed" : isError ? "Failed" : "Executing"}
            </span>
            
            {executionTime && isCompleted && (
              <>
                <span className="text-zinc-300 dark:text-zinc-700 mx-1">•</span>
                <span className="flex items-center text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                  <IconTime className="size-3 mr-1" />
                  {executionTime}ms
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Status Indicator Icon */}
        <div className="mr-2">
           {isCompleted ? (
             <IconCheckOne className="size-4 text-primary" />
           ) : isError ? (
             <IconCloseOne className="size-4 text-red-500" />
           ) : (
             <IconRoundCaliper className="size-4 text-blue-500 animate-spin" />
           )}
        </div>
        <div className="flex size-6 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 group-data-[state=open]:rotate-180 transition-transform duration-300">
           <IconDown className="size-3.5" />
        </div>
      </div>
    </CollapsibleTrigger>
  )
}

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
      className,
    )}
    {...props}
  >
    <div className="p-4 pt-0">
      <div className="border-t border-zinc-100 dark:border-white/5 pt-4 space-y-4">
        {props.children}
      </div>
    </div>
  </CollapsibleContent>
)

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolUIPart["input"]
}

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn("space-y-2.5", className)} {...props}>
    <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
      <IconFingerprint className="size-3.5" />
      <h4 className="font-semibold text-xs uppercase tracking-wider">
        Input Parameters
      </h4>
    </div>
    <div className="rounded-xl border border-zinc-200/50 dark:border-white/10 bg-zinc-50/50 dark:bg-black/40 overflow-hidden relative">
      {/* Decorative dots for mac-style terminal feel */}
      <div className="absolute top-0 left-0 right-0 h-6 bg-zinc-100/50 dark:bg-white/5 border-b border-zinc-200/50 dark:border-white/5 flex items-center px-3 gap-1.5">
        <div className="size-2 rounded-full bg-red-400/80"></div>
        <div className="size-2 rounded-full bg-amber-400/80"></div>
        <div className="size-2 rounded-full bg-emerald-400/80"></div>
      </div>
      <div className="pt-6 p-2">
        <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
      </div>
    </div>
  </div>
)

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ToolUIPart["output"]
  errorText?: ToolUIPart["errorText"]
}

export const ToolOutput = ({ className, output, errorText, ...props }: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null
  }

  let Output = <div className="text-sm">{output as ReactNode}</div>

  if (typeof output === "object" && !isValidElement(output)) {
    Output = <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />
  } else if (typeof output === "string") {
    Output = <CodeBlock code={output} language="json" />
  }

  return (
    <div className={cn("space-y-2.5", className)} {...props}>
      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
        <IconTerminal className="size-3.5" />
        <h4 className="font-semibold text-xs uppercase tracking-wider">
          {errorText ? "Error Trace" : "Execution Result"}
        </h4>
      </div>
      <div
        className={cn(
          "overflow-hidden rounded-xl border relative shadow-inner",
          errorText 
            ? "border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-900/10 text-red-600 dark:text-red-400" 
            : "border-zinc-200/50 bg-zinc-50/50 dark:border-white/10 dark:bg-black/40 text-zinc-800 dark:text-zinc-200",
        )}
      >
        <div className="p-2">
          {errorText ? (
            <div className="p-4 font-mono text-xs whitespace-pre-wrap">{errorText}</div>
          ) : (
            Output
          )}
        </div>
      </div>
    </div>
  )
}

/** Demo component for preview */
export default function ToolDemo() {
  return (
    <div className="w-full max-w-2xl p-6 bg-zinc-50 dark:bg-zinc-950 min-h-screen">
      <Tool defaultOpen>
        <ToolHeader title="Weather Lookup" type="tool-invocation" state="output-available" executionTime={452} />
        <ToolContent>
          <ToolInput
            input={{
              location: "San Francisco, CA",
              units: "fahrenheit",
            }}
          />
          <ToolOutput
            output={{
              temperature: 68,
              condition: "Partly cloudy",
              humidity: 65,
              wind: "12 mph NW",
            }}
          />
        </ToolContent>
      </Tool>
      
      <Tool>
         <ToolHeader title="Data Processor" type="tool-invocation" state="input-available" />
      </Tool>
      
      <Tool>
         <ToolHeader title="Failed Task" type="tool-invocation" state="output-error" executionTime={120} />
         <ToolContent>
            <ToolInput input={{ param: "test" }} />
            <ToolOutput output={null} errorText={"Timeout Error: Failed to reach the remote server after 120ms."} />
         </ToolContent>
      </Tool>
    </div>
  )
}
