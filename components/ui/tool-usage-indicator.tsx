'use client'

import { useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { 
  WrenchScrewdriverIcon, 
  EyeIcon, 
  MagnifyingGlassIcon,
  CloudIcon,
  MapIcon,
  DocumentTextIcon,
  BeakerIcon,
  CpuChipIcon
} from '@heroicons/react/24/solid'

interface ToolUsageIndicatorProps {
  toolName: string
  toolDescription?: string
  executionTime?: number
  result?: 'success' | 'error' | 'loading'
  details?: any
  className?: string
}

const getToolIcon = (toolName: string) => {
  if (toolName.includes('spectrum') || toolName.includes('channel')) {
    return <BeakerIcon className="w-4 h-4" />
  }
  if (toolName.includes('weather')) {
    return <CloudIcon className="w-4 h-4" />
  }
  if (toolName.includes('search') || toolName.includes('exa') || toolName.includes('brave')) {
    return <MagnifyingGlassIcon className="w-4 h-4" />
  }
  if (toolName.includes('route') || toolName.includes('map')) {
    return <MapIcon className="w-4 h-4" />
  }
  if (toolName.includes('scrape') || toolName.includes('firecrawl')) {
    return <DocumentTextIcon className="w-4 h-4" />
  }
  if (toolName.includes('mcp') || toolName.includes('tool')) {
    return <CpuChipIcon className="w-4 h-4" />
  }
  return <WrenchScrewdriverIcon className="w-4 h-4" />
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
    'mcp_amap_route': '路线规划'
  }
  return displayNames[toolName] || toolName
}

const getResultColor = (result?: string) => {
  switch (result) {
    case 'success':
      return 'text-green-600 bg-green-50 border-green-200'
    case 'error':
      return 'text-red-600 bg-red-50 border-red-200'
    case 'loading':
      return 'text-blue-600 bg-blue-50 border-blue-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

const getResultIcon = (result?: string) => {
  switch (result) {
    case 'success':
      return '✅'
    case 'error':
      return '❌'
    case 'loading':
      return '⏳'
    default:
      return '🔧'
  }
}

export default function ToolUsageIndicator({ 
  toolName, 
  toolDescription, 
  executionTime, 
  result = 'success',
  details,
  className = '' 
}: ToolUsageIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const displayName = getToolDisplayName(toolName)
  const icon = getToolIcon(toolName)
  const colorClass = getResultColor(result)
  const resultIcon = getResultIcon(result)
  
  return (
    <div className={`border rounded-lg p-3 mb-3 ${colorClass} ${className}`}>
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          {icon}
          <span className="font-medium">{resultIcon} {displayName}</span>
          {executionTime && (
            <span className="text-xs opacity-75">
              ({executionTime}ms)
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {result === 'loading' && (
            <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
          )}
          {details && (
            <button className="p-1 hover:bg-black/5 rounded">
              {isExpanded ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronRightIcon className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>
      
      {toolDescription && (
        <p className="text-sm opacity-75 mt-1 ml-6">
          {toolDescription}
        </p>
      )}
      
      {isExpanded && details && (
        <div className="mt-3 ml-6 p-2 bg-black/5 rounded text-xs">
          <pre className="whitespace-pre-wrap overflow-x-auto">
            {typeof details === 'string' ? details : JSON.stringify(details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}