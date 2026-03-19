'use client'

import { useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { 
  WrenchScrewdriverIcon, 
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
  
  // 根据结果状态设置样式
  const getStatusStyles = () => {
    switch (result) {
      case 'success':
        return {
          bg: 'bg-emerald-50/80 dark:bg-emerald-950/20',
          border: 'border-emerald-200/60 dark:border-emerald-800/40',
          text: 'text-emerald-700 dark:text-emerald-400',
          icon: 'text-emerald-600 dark:text-emerald-500',
          iconBg: 'bg-emerald-100 dark:bg-emerald-900/30'
        }
      case 'error':
        return {
          bg: 'bg-red-50/80 dark:bg-red-950/20',
          border: 'border-red-200/60 dark:border-red-800/40',
          text: 'text-red-700 dark:text-red-400',
          icon: 'text-red-600 dark:text-red-500',
          iconBg: 'bg-red-100 dark:bg-red-900/30'
        }
      case 'loading':
        return {
          bg: 'bg-blue-50/80 dark:bg-blue-950/20',
          border: 'border-blue-200/60 dark:border-blue-800/40',
          text: 'text-blue-700 dark:text-blue-400',
          icon: 'text-blue-600 dark:text-blue-500',
          iconBg: 'bg-blue-100 dark:bg-blue-900/30'
        }
      default:
        return {
          bg: 'bg-slate-50/80 dark:bg-slate-950/20',
          border: 'border-slate-200/60 dark:border-slate-800/40',
          text: 'text-slate-700 dark:text-slate-400',
          icon: 'text-slate-600 dark:text-slate-500',
          iconBg: 'bg-slate-100 dark:bg-slate-900/30'
        }
    }
  }
  
  const styles = getStatusStyles()
  
  return (
    <div className={`rounded-xl border ${styles.border} ${styles.bg} backdrop-blur-sm transition-all duration-200 hover:shadow-md ${className}`}>
      <div 
        className={`flex items-center gap-3 p-3 cursor-pointer ${details ? 'hover:bg-black/5 dark:hover:bg-white/5' : ''}`}
        onClick={() => details && setIsExpanded(!isExpanded)}
      >
        {/* 图标 */}
        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${styles.iconBg} ${styles.icon} shrink-0`}>
          {result === 'loading' ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : result === 'success' ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : result === 'error' ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            icon
          )}
        </div>
        
        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium text-sm ${styles.text}`}>
              {displayName}
            </span>
            {executionTime && (
              <span className={`text-xs ${styles.text} opacity-60`}>
                ({executionTime}ms)
              </span>
            )}
          </div>
          {toolDescription && (
            <p className={`text-xs ${styles.text} opacity-70 mt-0.5`}>
              {toolDescription}
            </p>
          )}
        </div>
        
        {/* 展开按钮 */}
        {details && (
          <button className={`p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${styles.icon}`}>
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
      
      {/* 详情展开区域 */}
      {isExpanded && details && (
        <div className={`px-3 pb-3 border-t ${styles.border}`}>
          <div className="mt-3 p-3 bg-black/5 dark:bg-white/5 rounded-lg">
            <pre className={`text-xs ${styles.text} whitespace-pre-wrap overflow-x-auto font-mono`}>
              {typeof details === 'string' ? details : JSON.stringify(details, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}