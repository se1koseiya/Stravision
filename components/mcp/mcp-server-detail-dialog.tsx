"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X, Check, Terminal, Shield, Star, Globe, Download,
  ExternalLink, Copy, ChevronRight, Zap, Info, ShieldCheck,
  Package, Layout, Cpu, Activity, Sprout, Leaf
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  cover_image?: string
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
  const [iconError, setIconError] = useState(false)

  useEffect(() => {
    if (open) setIconError(false)
  }, [open])

  if (!server) return null

  const handleCopyCommand = () => {
    const command = `${server.command} ${server.args.join(' ')}`
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("命令已复制到剪贴板")
  }

  const handleInstall = async () => {
    if (server.requiresApiKey && server.envVars) {
      const missingKeys = Object.keys(server.envVars).filter(key => !envConfig[key])
      if (missingKeys.length > 0) {
        toast.error(`请填写 ${missingKeys.join(', ')}`, { description: "这些项是必需的" })
        return
      }
    }

    setIsInstalling(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    onInstall(server, envConfig)
    setIsInstalling(false)
    onOpenChange(false)
    setEnvConfig({})
  }

  const AppIcon = ({ icon, name, className }: { icon: string, name: string, className?: string }) => {
    if (iconError || !icon) {
      const firstLetter = name.charAt(0).toUpperCase()
      const colors = ["bg-blue-500", "bg-rose-500", "bg-primary", "bg-amber-500", "bg-violet-500"]
      const color = colors[name.length % colors.length]
      return (
        <div className={cn(className, color, "text-white font-black flex items-center justify-center text-4xl shadow-2xl shrink-0")}>
          {firstLetter}
        </div>
      )
    }
    return (
      <img 
        src={icon} 
        alt={name} 
        className={cn(className, "object-cover shadow-2xl shrink-0")} 
        onError={() => setIconError(true)} 
      />
    )
  }

  const gradients = [
    "from-emerald-600 via-green-700 to-teal-500",
    "from-lime-500 via-emerald-600 to-green-600",
    "from-teal-600 via-emerald-700 to-green-700",
    "from-green-500 via-emerald-600 to-cyan-600"
  ]

  const isAgri = server.category === "agriculture"

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 sm:p-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-5xl h-full md:h-[90vh] bg-zinc-50 dark:bg-zinc-950 md:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col border border-white/5 font-sans"
          >
            {/* Close Button */}
            <button 
              onClick={() => onOpenChange(false)}
              className="absolute top-6 right-6 z-50 size-10 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-xl flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95"
            >
              <X size={20} />
            </button>

            <ScrollArea className="flex-1 overflow-x-hidden">
              <div className="flex flex-col">
                {/* Hero Header */}
                <div className="relative h-[450px] shrink-0 overflow-hidden">
                   {server.cover_image ? (
                     <img src={server.cover_image} className="absolute inset-0 size-full object-cover" alt="" />
                   ) : (
                     <div className={cn("absolute inset-0 bg-gradient-to-br", gradients[server.displayName.length % gradients.length])} />
                   )}
                   {/* 装饰叶片纹理 */}
                   <div className="absolute inset-0 opacity-20 pointer-events-none">
                     <Leaf className="absolute top-16 right-24 size-40 text-white/30 -rotate-12" />
                     <Sprout className="absolute top-32 left-20 size-28 text-white/20 rotate-6" />
                   </div>
                   <div className="absolute inset-0 bg-gradient-to-t from-zinc-50 dark:from-zinc-950 via-zinc-950/30 to-black/30" />

                   {/* Floating Icon and Title */}
                   <div className="absolute bottom-0 inset-x-0 p-12 flex items-end gap-10">
                      <AppIcon icon={server.icon} name={server.displayName} className="size-40 rounded-[2.5rem] ring-8 ring-zinc-50 dark:ring-zinc-950 shrink-0" />
                      <div className="flex-1 pb-4 space-y-4">
                         <div className="flex items-center gap-3 flex-wrap">
                            <Badge className="bg-white/10 backdrop-blur-md text-white/80 border-white/10 uppercase tracking-widest text-[10px] py-1 px-3">
                              {server.category}
                            </Badge>
                            {server.official && (
                              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/20 py-1 px-3">
                                <ShieldCheck className="size-3.5 mr-1.5" /> 官方认证
                              </Badge>
                            )}
                            {isAgri && (
                              <Badge className="bg-lime-500/20 text-lime-300 border-lime-500/20 py-1 px-3">
                                <Sprout className="size-3.5 mr-1.5" /> 种植场景
                              </Badge>
                            )}
                         </div>
                         <h2 className="text-6xl font-black tracking-tight leading-none drop-shadow-sm text-zinc-900 dark:text-white">
                           {server.displayName}
                         </h2>
                         <div className="flex items-center gap-6 text-zinc-500 dark:text-zinc-400 font-medium">
                            <div className="flex items-center gap-1.5">
                               <Package className="size-4" />
                               <span className="text-sm">{server.provider}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                               <Star className="size-4 text-amber-500 fill-amber-500" />
                               <span className="text-sm">{server.popularity / 10} 评分</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                               <Download className="size-4" />
                               <span className="text-sm">v1.2.4</span>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Content Body */}
                <div className="p-12 pt-16 grid grid-cols-1 lg:grid-cols-3 gap-16">
                   {/* Left Column: Main Info */}
                   <div className="lg:col-span-2 space-y-12">
                      <section className="space-y-6">
                         <h3 className="text-2xl font-bold flex items-center gap-3">
                            <Zap className="size-6 text-emerald-500" />
                            工具描述
                         </h3>
                         <p className="text-xl leading-relaxed text-zinc-600 dark:text-zinc-400 font-medium">
                           {server.description}
                         </p>
                      </section>

                      <section className="space-y-6">
                         <h3 className="text-2xl font-bold flex items-center gap-3">
                            <Layout className="size-6 text-emerald-500" />
                            核心功能
                         </h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {server.features.map((feature, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="flex items-center gap-4 p-5 rounded-3xl bg-zinc-100 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-200 dark:hover:border-emerald-800/50 shadow-sm"
                              >
                                 <div className="size-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                                    <Check className="size-5 text-emerald-600 dark:text-emerald-400 font-bold" />
                                 </div>
                                 <span className="font-bold text-zinc-700 dark:text-zinc-300">{feature}</span>
                              </motion.div>
                            ))}
                         </div>
                      </section>

                      {/* Config Section */}
                      {server.requiresApiKey && server.envVars && (
                        <section className="space-y-6 p-10 rounded-[3rem] bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06] border border-emerald-500/15">
                           <div className="flex items-center justify-between">
                              <h3 className="text-2xl font-bold flex items-center gap-3">
                                <Shield className="size-6 text-emerald-500" />
                                开发配置
                              </h3>
                              {server.apiKeyUrl && (
                                <a href={server.apiKeyUrl} target="_blank" className="text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
                                  获取密钥 <ExternalLink size={14} />
                                </a>
                              )}
                           </div>
                           <div className="space-y-6">
                              {Object.entries(server.envVars).map(([key, defaultValue]) => (
                                <div key={key} className="space-y-2.5">
                                  <Label htmlFor={key} className="text-sm font-bold opacity-60">环境变量: {key}</Label>
                                  <Input
                                    id={key}
                                    type={key.toLowerCase().includes('key') ? 'password' : 'text'}
                                    placeholder={defaultValue || `请输入 ${key}`}
                                    value={envConfig[key] || ''}
                                    onChange={(e) => setEnvConfig(prev => ({ ...prev, [key]: e.target.value }))}
                                    className="h-14 px-5 rounded-2xl bg-white dark:bg-zinc-900 border-black/10 dark:border-white/10 font-mono text-lg focus:ring-2 focus:ring-emerald-500 shadow-sm"
                                  />
                                </div>
                              ))}
                           </div>
                        </section>
                      )}

                      {/* Installation Command */}
                      <section className="space-y-6 pt-6">
                         <h3 className="text-2xl font-bold flex items-center gap-3">
                            <Terminal className="size-6 text-zinc-500" />
                            本地运行
                         </h3>
                         <div className="group relative bg-zinc-900 rounded-[2.5rem] p-10 border border-white/5 shadow-2xl">
                           <pre className="text-xl font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap break-all pr-12 leading-relaxed">
                             <span className="text-zinc-600 select-none">$</span> {server.command} {server.args.join(' ')}
                           </pre>
                           <Button
                             size="icon"
                             variant="ghost"
                             className="absolute top-8 right-8 h-12 w-12 text-zinc-500 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
                             onClick={handleCopyCommand}
                           >
                             {copied ? <Check className="size-6 text-primary" /> : <Copy className="size-6" />}
                           </Button>
                         </div>
                      </section>
                   </div>

                   {/* Right Column: Meta Info */}
                   <div className="space-y-8">
                      <div className="p-10 rounded-[3rem] bg-white dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 space-y-6 shadow-sm">
                         <h4 className="text-lg font-bold flex items-center gap-2">
                            <Info className="size-4 text-emerald-500" />
                            工具详情
                         </h4>
                         <div className="space-y-4">
                            <div className="flex justify-between items-center py-3 border-b border-black/5 dark:border-white/5">
                               <span className="text-zinc-500 font-medium italic">开发者</span>
                               <span className="font-bold">{server.provider}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-black/5 dark:border-white/5">
                               <span className="text-zinc-500 font-medium italic">版本号</span>
                               <span className="font-bold">1.2.4</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-black/5 dark:border-white/5">
                               <span className="text-zinc-500 font-medium italic">分类</span>
                               <span className="font-bold tracking-tight">{server.category.toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between items-center pt-3">
                               <span className="text-zinc-500 font-medium italic">兼容性</span>
                               <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 underline decoration-dotted underline-offset-4">
                                 <Cpu size={14} /> 模型原生支持
                               </span>
                            </div>
                         </div>
                      </div>

                      <div className="p-10 rounded-[3rem] bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06] border border-emerald-500/15 space-y-4 shadow-sm">
                          <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                             <ShieldCheck size={20} />
                             <h4 className="font-bold">安全提示</h4>
                          </div>
                          <p className="text-sm leading-relaxed text-emerald-700/80 dark:text-emerald-300/80 italic font-medium">
                            此 MCP 工具由官方认证。它将在安全的沙箱环境中运行，仅在您授权时访问特定的 API 或本地服务。
                          </p>
                      </div>

                      <Button
                        onClick={handleInstall}
                        disabled={isInstalling}
                        className="w-full h-24 rounded-[3rem] bg-emerald-500 hover:bg-emerald-600 text-white text-2xl font-black shadow-xl shadow-emerald-500/30 active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                         {isInstalling ? (
                            <div className="flex items-center gap-3">
                               <div className="size-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                               <span>正在集成到系统...</span>
                            </div>
                         ) : (
                            <div className="flex items-center gap-2">
                               <Download size={26} />
                               <span>立即获取工具</span>
                            </div>
                         )}
                      </Button>
                   </div>
                </div>
              </div>
            </ScrollArea>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
