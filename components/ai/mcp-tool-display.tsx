"use client"

import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai/tool"
import type { ToolUIPart } from "ai"
import { PlugZap, ArrowRight } from "lucide-react"
import Link from "next/link"

interface MCPToolDisplayProps {
  toolName: string
  toolDescription?: string
  executionTime?: number
  result?: 'success' | 'error' | 'loading'
  input?: any
  output?: any
  errorText?: string
  className?: string
}

const getToolDisplayName = (toolName: string) => {
  const displayNames: Record<string, string> = {
    'get_all_spectrum': '光谱数据获取',
    'get_channel': '单通道光谱',
    'mcp_caiyun_weather': '彩云天气',
    'mcp_gaode_weather': '高德天气',
    'mcp_hefeng_weather': '和风天气',
    'mcp_brave_search': 'Brave 搜索',
    'mcp_exa_search': 'Exa 搜索',
    'mcp_firecrawl_scrape': '网页抓取',
    'mcp_amap_route': '路线规划',
    'device_status_check': '设备状态检查',
    'mcp_soil_sensor_query': '农场土壤检测',
    'mcp_crop_disease_diagnose': '病害视觉诊断',
    'mcp_irrigation_query': '农场智能灌溉'
  }
  return displayNames[toolName] || toolName
}

const mapResultToState = (result?: string): ToolUIPart["state"] => {
  switch (result) {
    case 'success':
      return 'output-available'
    case 'error':
      return 'output-error'
    case 'loading':
      return 'input-available'
    default:
      return 'output-available'
  }
}

export function MCPToolDisplay({ 
  toolName, 
  toolDescription, 
  executionTime, 
  result = 'success',
  input,
  output,
  errorText,
  className 
}: MCPToolDisplayProps) {
  const displayName = getToolDisplayName(toolName)
  const state = mapResultToState(result)
  
  // Intelligent detection for missing MCP installation or unconfigured API keys
  const isMissingMcp = errorText && (
    errorText.includes('未安装') || 
    errorText.includes('未启用') || 
    errorText.includes('未配置') || 
    errorText.includes('API Key') || 
    errorText.includes('Token')
  );
  
  return (
    <Tool className={className}>
      <ToolHeader 
        title={displayName}
        type="tool-invocation" 
        state={state}
        executionTime={executionTime}
      />
      <ToolContent>
        {input && <ToolInput input={input} />}
        
        {isMissingMcp ? (
          <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 backdrop-blur-sm relative overflow-hidden group">
            {/* Dynamic Background Gradient for Premium Feel */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent opacity-60 dark:opacity-20 pointer-events-none" />
            
            {/* Interactive Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent -translate-x-[100%] group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
            
            <div className="relative flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between z-10">
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                {/* Visual Icon Container */}
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shrink-0 shadow-sm border border-indigo-200/60 dark:border-indigo-500/30 group-hover:scale-105 transition-transform duration-300">
                  <PlugZap size={22} strokeWidth={2} className="drop-shadow-sm group-hover:animate-pulse" />
                </div>
                
                {/* Text Content */}
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      扩展组件 (MCP) 未安装或未配置
                    </h4>
                  </div>
                  <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-snug line-clamp-2">
                    系统检测到 <b>{displayName}</b> 需要深度能力扩展支持。前往插件商店完成安装和配置，即可解锁此功能。
                  </p>
                </div>
              </div>
              
              {/* Call-to-action Button */}
              <Link 
                href="/model-store" 
                className="shrink-0 w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-[0_2px_10px_-4px_rgba(99,102,241,0.6)] hover:shadow-lg transition-all duration-200 text-[13px] font-medium"
              >
                前往插件市场
                <ArrowRight size={16} strokeWidth={2.5} className="opacity-90" />
              </Link>
            </div>
            
            {/* Developer/System Detail Context */}
            <div className="relative mt-4 pt-3.5 border-t border-zinc-200/60 dark:border-white/10">
              <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 truncate flex items-center gap-1.5">
                <span className="text-rose-500/80 shrink-0">ER_MISSING_DEPENDENCY:</span>
                {errorText}
              </p>
            </div>
          </div>
        ) : (
          <ToolOutput 
            output={output} 
            errorText={errorText}
          />
        )}
      </ToolContent>
    </Tool>
  )
}