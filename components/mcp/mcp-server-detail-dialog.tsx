"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Copy, Check, Terminal, Shield, Star, Globe } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface MCPServer {
  id: string
  name: string
  displayName: string
  description: string
  category: string
  icon: string
  iconBg: string
  provider: string
  requiresApiKey: boolean
  apiKeyUrl?: string
  apiKeyInstructions?: string
  command: string
  args: string[]
  envVars?: Record<string, string>
  features: string[]
  popularity: number
  official: boolean
}

interface MCPServerDetailDialogProps {
  server: MCPServer | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onInstall: (server: MCPServer, config: Record<string, string>) => void
}

export function MCPServerDetailDialog({ server, open, onOpenChange, onInstall }: MCPServerDetailDialogProps) {
  const [envConfig, setEnvConfig] = useState<Record<string, string>>({})
  const [isInstalling, setIsInstalling] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!server) return null

  const handleCopyCommand = () => {
    const command = `${server.command} ${server.args.join(' ')}`
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("命令已复制到剪贴板")
  }

  const handleInstall = async () => {
    // 验证必填项
    if (server.requiresApiKey && server.envVars) {
      const missingKeys = Object.keys(server.envVars).filter(key => {
        // 如果环境变量有默认值，或者是可选的（这里假设所有列出的都是必填），则不需要检查
        // 简单起见，我们检查用户是否输入了值
        return !envConfig[key]
      })
      
      if (missingKeys.length > 0) {
        toast.error(`请填写 ${missingKeys.join(', ')}`, {
          description: "这些配置项是必需的"
        })
        return
      }
    }

    setIsInstalling(true)
    
    // 模拟安装延迟
    await new Promise(resolve => setTimeout(resolve, 800))
    
    onInstall(server, envConfig)
    setIsInstalling(false)
    onOpenChange(false)
    setEnvConfig({})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden bg-[#0A0A0A] border-white/10 shadow-2xl text-white font-jinbuti sm:rounded-none">
        
        {/* Header Section */}
        <div className="p-6 pb-0">
          <div className="flex items-start gap-5">
            <div className={cn(
              "size-16 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ring-1 ring-white/10 bg-white/5", 
              server.iconBg
            )}>
              <img 
                src={server.icon} 
                alt={server.displayName} 
                className="size-8 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.parentElement!.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-box text-white"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/></svg>`
                }} 
              />
            </div>
            
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-2xl font-bold tracking-tight text-white font-jinbuti">
                  {server.displayName}
                </DialogTitle>
                <div className="flex items-center gap-2">
                   {server.official && (
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono rounded-none">
                      <Shield className="size-3 mr-1" /> 官方
                    </Badge>
                   )}
                   <Badge variant="outline" className="text-white/40 border-white/10 font-mono rounded-none">
                     v1.0.0
                   </Badge>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-white/40 font-mono">
                <span className="font-medium text-white/60">{server.provider}</span>
                <span>•</span>
                <span>{server.category}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Star className="size-3 fill-emerald-500 text-emerald-500" />
                  <span>{server.popularity / 10}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-base leading-relaxed text-white/60 font-light">
              {server.description}
            </p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
          
          {/* Features Grid */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/40 flex items-center gap-2 font-mono">
              <Star className="size-4" />
              功能特性
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {server.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm text-white/80 bg-white/5 px-3 py-2 border border-white/10 font-light">
                  <Check className="size-3.5 text-emerald-500" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Configuration Section */}
          {server.requiresApiKey && server.envVars && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white/40 flex items-center gap-2 font-mono">
                  <Shield className="size-4" />
                  配置需知
                </h3>
                {server.apiKeyUrl && (
                  <a 
                    href={server.apiKeyUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 font-mono"
                  >
                    获取 API Key <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
              
              <div className="space-y-4">
                {Object.entries(server.envVars).map(([key, defaultValue]) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={key} className="text-xs font-mono text-white/40">
                      {key}
                    </Label>
                    <div className="relative">
                      <Input
                        id={key}
                        type={key.toLowerCase().includes('key') || key.toLowerCase().includes('token') || key.toLowerCase().includes('secret') ? 'password' : 'text'}
                        placeholder={defaultValue || `请输入 ${key}`}
                        value={envConfig[key] || ''}
                        onChange={(e) => setEnvConfig(prev => ({ ...prev, [key]: e.target.value }))}
                        className="font-mono text-sm bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 pl-3 rounded-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {server.apiKeyInstructions && (
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-3">
                  <div className="flex gap-2">
                    <Globe className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-emerald-200/80 font-light">
                      {server.apiKeyInstructions}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Installation Command */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/40 flex items-center gap-2 font-mono">
              <Terminal className="size-4" />
              CLI 安装命令
            </h3>
            <div className="group relative bg-black border border-white/10 p-4">
              <pre className="text-sm font-mono text-white/80 overflow-x-auto whitespace-pre-wrap break-all pr-10">
                <span className="text-emerald-500">$</span> {server.command} {server.args.join(' ')}
              </pre>
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 h-8 w-8 text-white/40 hover:text-white hover:bg-white/10 rounded-none"
                onClick={handleCopyCommand}
              >
                {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-white/5 border-t border-white/10 flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="border-white/10 bg-transparent text-white hover:bg-white/5 font-jinbuti rounded-none"
          >
            取消
          </Button>
          <Button 
            onClick={handleInstall}
            disabled={isInstalling}
            className="bg-emerald-600 text-white hover:bg-emerald-500 min-w-[100px] font-jinbuti rounded-none"
          >
            {isInstalling ? (
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>处理中...</span>
              </div>
            ) : (
              <span>确认安装</span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
