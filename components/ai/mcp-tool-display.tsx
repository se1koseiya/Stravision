"use client"

import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai/tool"
import type { ToolUIPart } from "ai"

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
    'device_status_check': '设备状态检查'
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
        <ToolOutput 
          output={output} 
          errorText={errorText}
        />
      </ToolContent>
    </Tool>
  )
}