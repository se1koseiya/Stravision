"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X, Check, Shield, Star, Globe, Download,
  ExternalLink, Zip, Info, ShieldCheck,
  Package, Layout, Cpu, Save, Key, Link as LinkIcon, Database
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { BERRY_THEME } from "@/lib/ui/berry-theme"
import type { AIProvider } from "@/app/model-store/page"

interface ModelDetailDialogProps {
  provider: AIProvider | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (apiType: string) => void
}

export function ModelDetailDialog({ provider, open, onOpenChange, onSave }: ModelDetailDialogProps) {
  const [apiKey, setApiKey] = useState("")
  const [apiUrl, setApiUrl] = useState("")
  const [modelName, setModelName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  
  // For matching the current system api type
  const [currentSettings, setCurrentSettings] = useState<any>({})

  useEffect(() => {
    if (open && provider) {
      // First load current settings to see if this provider is currently active
      const savedStr = localStorage.getItem("ai-settings")
      const localSettings = savedStr ? JSON.parse(savedStr) : {}
      setCurrentSettings(localSettings)

      // Auto fill
      if (provider.id === 'system') {
        setApiKey("")
        setApiUrl("")
        setModelName("")
      } else if (provider.id === 'ollama') {
        setApiKey(localSettings.apiKey === "ollama" ? "ollama" : "ollama")
        setApiUrl(localSettings.apiUrl || provider.defaultUrl)
        setModelName(localSettings.model || provider.defaultModel)
      } else {
        setApiUrl(provider.defaultUrl)
        setModelName(provider.defaultModel)
        
        // If this provider matches the current settings apiUrl, populate the key
        if (localSettings.apiUrl && localSettings.apiUrl.includes(getDomain(provider.defaultUrl))) {
          setApiKey(localSettings.apiKey || "")
          setApiUrl(localSettings.apiUrl || provider.defaultUrl)
          if (localSettings.model) {
            setModelName(localSettings.model)
          }
        } else {
          setApiKey("") // Don't leak other provider's key
        }
      }
    }
  }, [open, provider])

  const getDomain = (url: string) => {
    try { return new URL(url).hostname } catch { return url }
  }

  if (!provider) return null

  const handleSave = async () => {
    setIsSaving(true)
    
    // Construct new settings
    const newSettings = {
      ...currentSettings,
    }
    
    if (provider.id === 'system') {
      newSettings.apiKey = ""
      newSettings.apiUrl = ""
      newSettings.model = ""
    } else {
      newSettings.apiKey = apiKey
      newSettings.apiUrl = apiUrl
      newSettings.model = modelName
    }

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      })
      if (response.ok) {
        localStorage.setItem("ai-settings", JSON.stringify(newSettings))
        toast.success(`${provider.name} 引擎已激活`)
        onSave(provider.id)
        onOpenChange(false)
      } else {
        const error = await response.json()
        toast.error(`配置失败: ${error.error || "未知错误"}`)
      }
    } catch {
      // Fallback to local
      localStorage.setItem("ai-settings", JSON.stringify(newSettings))
      toast.success(`${provider.name} 本地配置已保存`)
      onSave(provider.id)
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  // 🔥 Berry 蓝色系渐变（与业务卡片统一）
  const gradients = [
    "from-blue-500 via-blue-600 to-cyan-500",
    "from-sky-500 via-blue-600 to-indigo-600",
    "from-indigo-500 via-blue-600 to-blue-700",
    "from-blue-400 via-blue-500 to-cyan-600",
  ]

  const IconComponent = ({ icon: Icon, className }: { icon: any, className?: string }) => {
    return (
      <div className={cn("flex items-center justify-center text-white", className)} style={{ background: `linear-gradient(135deg, ${BERRY_THEME.primary}, ${BERRY_THEME.primaryActive})` }}>
         <Icon size={48} />
      </div>
    )
  }

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
            className="relative w-full max-w-5xl h-full md:h-[90vh] bg-zinc-50 dark:bg-zinc-950 overflow-hidden shadow-2xl flex flex-col border border-white/5 font-sans"
            style={{ borderRadius: BERRY_THEME.radius.xl }}
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
                   <div className={cn("absolute inset-0 bg-gradient-to-br", gradients[provider.name.length % gradients.length])} />
                   <div className="absolute inset-0 opacity-15 pointer-events-none">
                     <div className="absolute top-16 right-24 size-40 rounded-full bg-white/20 -rotate-12 blur-xl" />
                     <div className="absolute top-32 left-20 size-28 rounded-full bg-white/15 rotate-6 blur-lg" />
                   </div>
                   <div className="absolute inset-0 bg-gradient-to-t from-zinc-50 dark:from-zinc-950 via-zinc-950/30 to-black/30" />

                   {/* Floating Icon and Title */}
                   <div className="absolute bottom-0 inset-x-0 p-12 flex items-end gap-10">
                      <IconComponent icon={provider.icon} className="size-40 ring-8 ring-zinc-50 dark:ring-zinc-950 shrink-0" style={{ borderRadius: BERRY_THEME.radius.lg + 4 }} />
                      <div className="flex-1 pb-4 space-y-4">
                         <div className="flex items-center gap-3 flex-wrap">
                            <Badge className="bg-white/10 backdrop-blur-md text-white/80 border-white/10 uppercase tracking-widest text-[10px] py-1 px-3">
                              {provider.category}
                            </Badge>
                            {provider.official && (
                              <Badge className="py-1 px-3" style={{ background: `${BERRY_THEME.primary}33`, color: '#bae0ff', borderColor: `${BERRY_THEME.primary}33` }}>
                                <ShieldCheck className="size-3.5 mr-1.5" /> 官方推荐
                              </Badge>
                            )}
                         </div>
                         <h2 className="text-6xl font-black tracking-tight leading-none drop-shadow-sm text-zinc-900 dark:text-white">
                           {provider.name}
                         </h2>
                         <div className="flex items-center gap-6 text-zinc-500 dark:text-zinc-400 font-medium">
                            <div className="flex items-center gap-1.5">
                               <Package className="size-4" />
                               <span className="text-sm">{provider.provider}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                               <Star className="size-4 text-amber-500 fill-amber-500" />
                               <span className="text-sm">9.9 评分</span>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Content Body */}
                <div className="p-12 pt-16 grid grid-cols-1 lg:grid-cols-3 gap-16">
                   {/* Left Column: Main Info & Config */}
                   <div className="lg:col-span-2 space-y-12">
                      <section className="space-y-6">
                         <h3 className="text-2xl font-bold flex items-center gap-3">
                            <Cpu className="size-6" style={{ color: BERRY_THEME.primary }} />
                            引擎简介
                         </h3>
                         <p className="text-xl leading-relaxed text-zinc-600 dark:text-zinc-400 font-medium">
                           {provider.description}
                         </p>
                      </section>

                      {/* Config Section */}
                      <section className="space-y-6 p-10 border" style={{ borderRadius: BERRY_THEME.radius.lg, background: `${BERRY_THEME.primary}0A`, borderColor: `${BERRY_THEME.primary}26` }}>
                         <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-bold flex items-center gap-3">
                              <Shield className="size-6" style={{ color: BERRY_THEME.primary }} />
                              环境配置
                            </h3>
                         </div>

                         {provider.id === 'system' ? (
                           <div className="p-6 flex items-start gap-4" style={{ background: `${BERRY_THEME.primary}1A`, color: BERRY_THEME.primaryText, borderRadius: BERRY_THEME.radius.md }}>
                             <ShieldCheck className="size-8 shrink-0" />
                             <div className="space-y-1">
                                <h4 className="font-bold text-lg">系统免密直连</h4>
                                <p className="text-sm opacity-80 font-medium">您正在激活系统预留的通义千问官方API。该模式由平台统一提供支持，无需您手动填写鉴权密钥，立即保存即可无缝体验。</p>
                             </div>
                           </div>
                         ) : (
                           <div className="space-y-6">
                              {(provider.id !== 'ollama') && (
                                <div className="space-y-2.5">
                                  <Label htmlFor="apiKey" className="text-sm font-bold opacity-60 flex items-center gap-2">
                                     <Key size={16} /> API Key 鉴权密钥
                                  </Label>
                                  <Input
                                    id="apiKey"
                                    type="password"
                                    placeholder={`sk-...${provider.id === 'google' ? '或者 AIza...' : ''}`}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="h-14 px-5 bg-white dark:bg-zinc-900 border-black/10 dark:border-white/10 font-mono text-lg focus:ring-2 shadow-sm"
                                    style={{ borderRadius: BERRY_THEME.radius.md }}
                                  />
                                </div>
                              )}

                              <div className="space-y-2.5">
                                <Label htmlFor="apiUrl" className="text-sm font-bold opacity-60 flex items-center gap-2">
                                   <LinkIcon size={16} /> API 请求接入点 (Base URL)
                                </Label>
                                <Input
                                  id="apiUrl"
                                  type="text"
                                  placeholder={provider.defaultUrl || "https://..."}
                                  value={apiUrl}
                                  onChange={(e) => setApiUrl(e.target.value)}
                                  className="h-14 px-5 bg-white dark:bg-zinc-900 border-black/10 dark:border-white/10 font-mono text-lg focus:ring-2 shadow-sm"
                                  style={{ borderRadius: BERRY_THEME.radius.md }}
                                />
                              </div>

                              <div className="space-y-2.5">
                                <Label htmlFor="modelName" className="text-sm font-bold opacity-60 flex items-center gap-2">
                                   <Database size={16} /> 模型识别码 (Model Name)
                                </Label>
                                <Input
                                  id="modelName"
                                  type="text"
                                  placeholder={provider.defaultModel || "例如: gpt-3.5-turbo"}
                                  value={modelName}
                                  onChange={(e) => setModelName(e.target.value)}
                                  className="h-14 px-5 bg-white dark:bg-zinc-900 border-black/10 dark:border-white/10 font-mono text-lg focus:ring-2 shadow-sm"
                                  style={{ borderRadius: BERRY_THEME.radius.md }}
                                />
                                {provider.id === 'ollama' && (
                                  <p className="text-xs font-bold ml-1 pt-1" style={{ color: BERRY_THEME.primary }}>
                                    提示：必须确保本地已运行该模型 (例如 `ollama run llama3`)
                                  </p>
                                )}
                              </div>
                           </div>
                         )}
                      </section>
                   </div>

                   {/* Right Column: Meta Info */}
                   <div className="space-y-8">
                      <div className="p-10 bg-white dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 space-y-6 shadow-sm" style={{ borderRadius: BERRY_THEME.radius.lg }}>
                         <h4 className="text-lg font-bold flex items-center gap-2">
                            <Info className="size-4" style={{ color: BERRY_THEME.primary }} />
                            节点详情
                         </h4>
                         <div className="space-y-4">
                            <div className="flex justify-between items-center py-3 border-b border-black/5 dark:border-white/5">
                               <span className="text-zinc-500 font-medium italic">发行方</span>
                               <span className="font-bold">{provider.provider}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-black/5 dark:border-white/5">
                               <span className="text-zinc-500 font-medium italic">分类</span>
                               <span className="font-bold tracking-tight">{provider.category}</span>
                            </div>
                            <div className="flex justify-between items-center pt-3">
                               <span className="text-zinc-500 font-medium italic">MCP 工具流</span>
                               <span className="font-bold flex items-center gap-1 underline decoration-dotted underline-offset-4" style={{ color: BERRY_THEME.primary }}>
                                 全面兼容
                               </span>
                            </div>
                         </div>
                      </div>

                      <div className="p-10 border space-y-4 shadow-sm" style={{ borderRadius: BERRY_THEME.radius.lg, background: `${BERRY_THEME.primary}0A`, borderColor: `${BERRY_THEME.primary}26` }}>
                          <div className="flex items-center gap-3" style={{ color: BERRY_THEME.primary }}>
                             <Info size={20} />
                             <h4 className="font-bold">平台保障</h4>
                          </div>
                          <p className="text-sm leading-relaxed italic font-medium" style={{ color: `${BERRY_THEME.primaryText}CC` }}>
                            您的 API Key 将仅保存在本地浏览器或安全后端环境中，不会被传输至任何第三方非信任节点。请保护好您的密钥。
                          </p>
                      </div>

                      <Button
                        onClick={handleSave}
                        disabled={isSaving || (provider.id !== 'system' && !apiUrl)}
                        className="w-full h-24 text-white text-2xl font-black active:scale-[0.98] transition-all disabled:opacity-50"
                        style={{
                          borderRadius: BERRY_THEME.radius.lg,
                          background: BERRY_THEME.primary,
                          boxShadow: `0 12px 28px -8px ${BERRY_THEME.primary}66`,
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = BERRY_THEME.primaryHover }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = BERRY_THEME.primary }}
                      >
                         {isSaving ? (
                            <div className="flex items-center gap-3">
                               <div className="size-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                               <span>正在激活核心...</span>
                            </div>
                         ) : (
                            <div className="flex items-center gap-2">
                               <Save size={26} />
                               <span>保存并激活</span>
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
