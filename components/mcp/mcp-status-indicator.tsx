"use client"

import { useState, useEffect } from "react"
import { Zap, ChevronDown, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface MCPServer {
  id: string
  name: string
  displayName: string
  enabled: boolean
}

export function MCPStatusIndicator() {
  const router = useRouter()
  const [enabledServers, setEnabledServers] = useState<MCPServer[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    loadEnabledServers()
    
    // 监听 storage 变化，实时更新
    const handleStorageChange = () => {
      loadEnabledServers()
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // 定期刷新（每5秒）
    const interval = setInterval(loadEnabledServers, 5000)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  const loadEnabledServers = () => {
    try {
      const installed = localStorage.getItem("mcp-installed-servers")
      if (!installed) {
        setEnabledServers([])
        return
      }

      const serverIds = JSON.parse(installed) as string[]
      const servers = serverIds
        .map(id => {
          const configStr = localStorage.getItem(`mcp-config-${id}`)
          const enabled = localStorage.getItem(`mcp-enabled-${id}`) !== "false"
          
          if (configStr && enabled) {
            const config = JSON.parse(configStr)
            return {
              id: config.id,
              name: config.name,
              displayName: config.displayName || config.name,
              enabled: true
            }
          }
          return null
        })
        .filter(Boolean) as MCPServer[]

      setEnabledServers(servers)
    } catch (error) {
      console.error("Failed to load MCP servers:", error)
      setEnabledServers([])
    }
  }

  if (enabledServers.length === 0) {
    return (
      <button
        onClick={() => router.push('/mcp-store')}
        className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors relative group"
        title="启用 MCP 服务器"
      >
        <Zap size={20} />
        <div className="absolute -top-1 -right-1 size-2 bg-zinc-300 dark:bg-zinc-600 rounded-full" />
      </button>
    )
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all",
            "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
            "hover:bg-emerald-100 dark:hover:bg-emerald-900/30",
            "border border-emerald-200 dark:border-emerald-800"
          )}
          title={`${enabledServers.length} 个 MCP 服务器已启用`}
        >
          <Zap size={16} className="shrink-0" />
          <span className="text-xs font-medium">{enabledServers.length}</span>
          <ChevronDown size={14} className={cn(
            "shrink-0 transition-transform",
            isOpen && "rotate-180"
          )} />
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>已启用的 MCP 服务器</span>
          <Badge variant="secondary" className="text-xs">
            {enabledServers.length}
          </Badge>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <div className="max-h-64 overflow-y-auto">
          {enabledServers.map((server) => (
            <DropdownMenuItem
              key={server.id}
              className="flex items-center gap-2 cursor-default"
            >
              <div className="size-2 bg-emerald-500 rounded-full shrink-0" />
              <span className="flex-1 truncate text-sm">{server.displayName}</span>
            </DropdownMenuItem>
          ))}
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => router.push('/my-mcp')}
          className="cursor-pointer"
        >
          <Settings size={14} className="mr-2" />
          管理 MCP 服务器
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => router.push('/mcp-store')}
          className="cursor-pointer"
        >
          <Zap size={14} className="mr-2" />
          浏览 MCP 商店
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
