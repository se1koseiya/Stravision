import { useState, useEffect } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Key, Link as LinkIcon, Box, MessageSquareText, CheckCircle2, ShieldCheck } from "lucide-react";
import { Settings } from "@/components/animate-ui/icons/settings";
import { X } from "@/components/animate-ui/icons/x";
import { Bot } from "@/components/animate-ui/icons/bot";
import { Sparkles } from "@/components/animate-ui/icons/sparkles";
import { cn } from "@/lib/utils"

interface AISettings {
  apiKey: string
  apiUrl: string
  model: string
  systemPrompt: string
}

interface MobileAISettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (settings: AISettings) => void
}

export function MobileAISettingsModal({ open, onOpenChange, onSave }: MobileAISettingsModalProps) {
  const [settings, setSettings] = useState<AISettings>({
    apiKey: "",
    apiUrl: "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
    model: "",
    systemPrompt:
      "你是莓界智慧农业平台的AI助手，专门帮助用户分析农业数据、提供种植建议和解答农业相关问题。请用专业但易懂的语言回答问题。\n\n重要提醒：如果需要提供参考来源，请确保所有链接和信息都是真实存在的，绝对不要编造虚假的网站或来源。如果不确定来源，请直接说明这是基于你的知识库回答，而不是提供虚假引用。",
  })

  const [apiType, setApiType] = useState<"system" | "dashscope" | "openai">("system")

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings")
        if (response.ok) {
          const serverSettings = await response.json()
          const savedStr = localStorage.getItem("ai-settings")
          const localSettings = savedStr ? JSON.parse(savedStr) : null
          const shouldUseLocal = !serverSettings?.apiKey || String(serverSettings.apiKey).trim() === ''
          const effective = shouldUseLocal && localSettings ? localSettings : serverSettings
          setSettings(effective)
          
          if (!effective.apiKey && !effective.apiUrl) {
            setApiType("system")
          } else if (effective.apiUrl?.includes("dashscope") || effective.model?.startsWith("qwen")) {
            setApiType("dashscope")
          } else {
            setApiType("openai")
          }
        } else {
          const saved = localStorage.getItem("ai-settings")
          if (saved) {
            const parsed = JSON.parse(saved)
            setSettings(parsed)
            if (!parsed.apiKey && !parsed.apiUrl) {
              setApiType("system")
            } else if (parsed.apiUrl?.includes("dashscope") || parsed.model?.startsWith("qwen")) {
              setApiType("dashscope")
            } else {
              setApiType("openai")
            }
          }
        }
      } catch {
        const saved = localStorage.getItem("ai-settings")
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            setSettings(parsed)
            if (!parsed.apiKey && !parsed.apiUrl) {
              setApiType("system")
            } else if (parsed.apiUrl?.includes("dashscope") || parsed.model?.startsWith("qwen")) {
              setApiType("dashscope")
            } else {
              setApiType("openai")
            }
          } catch {}
        }
      }
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      if (response.ok) {
        localStorage.setItem("ai-settings", JSON.stringify(settings))
        onSave(settings)
        onOpenChange(false)
      } else {
        const error = await response.json()
        alert(`保存失败: ${error.error || "未知错误"}`)
      }
    } catch {
      localStorage.setItem("ai-settings", JSON.stringify(settings))
      onSave(settings)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/20 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className="fixed inset-x-0 bottom-0 z-50 w-full max-w-none rounded-t-[2rem] bg-white dark:bg-zinc-900 shadow-2xl border-t border-black/5 dark:border-white/10 overflow-hidden h-[85vh] sm:left-1/2 sm:top-1/2 sm:inset-x-auto sm:h-auto sm:max-w-md sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border animate-in slide-in-from-bottom-full sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-300"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Settings size={18} strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-base font-bold text-gray-900 dark:text-gray-100">模型配置</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">配置您的专属 AI 助手</div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full hover:bg-gray-100 dark:hover:bg-white/10 h-8 w-8 text-gray-500">
              <X size={18} />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 overflow-y-auto h-[calc(85vh-70px-80px)] sm:h-auto max-h-[70vh]">
            
            {/* API Type Selector */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">服务提供商</Label>
              <div className="grid grid-cols-3 gap-1 p-1.5 bg-gray-100/80 dark:bg-zinc-800/50 rounded-xl border border-gray-200/50 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setApiType("system")
                    setSettings({ ...settings, apiKey: "", apiUrl: "", model: "" })
                  }}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] text-xs sm:text-sm font-medium transition-all duration-200",
                    apiType === "system" 
                      ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10" 
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-white/5"
                  )}
                >
                  <ShieldCheck size={16} />
                  <span>系统托管</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setApiType("dashscope")
                    setSettings({
                      ...settings,
                      apiUrl: "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
                    })
                  }}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] text-xs sm:text-sm font-medium transition-all duration-200",
                    apiType === "dashscope" 
                      ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10" 
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-white/5"
                  )}
                >
                  <Sparkles size={16} />
                  <span>阿里云</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setApiType("openai")
                    setSettings({
                      ...settings,
                      apiUrl: "https://api.openai.com/v1/chat/completions",
                    })
                  }}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] text-xs sm:text-sm font-medium transition-all duration-200",
                    apiType === "openai" 
                      ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10" 
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-white/5"
                  )}
                >
                  <Bot size={16} />
                  <span>OpenAI</span>
                </button>
              </div>
              <p className="text-[10px] text-gray-400 px-1">
                {apiType === "system"
                  ? "使用系统提供的免费额度或订阅计划，无需自行配置 API Key。"
                  : apiType === "dashscope" 
                  ? "推荐国内用户使用，支持通义千问 Qwen 系列模型，速度快且稳定。" 
                  : "支持 GPT-3.5, GPT-4 等标准 OpenAI 接口模型。"}
              </p>
            </div>

            {apiType === "system" ? (
               <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-4 border border-emerald-100 dark:border-emerald-500/20">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-full text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck size={20} />
                     </div>
                     <div>
                        <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">已开启系统托管模式</h4>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">无需配置 API Key，直接使用系统提供的 AI 能力。</p>
                     </div>
                  </div>
               </div>
            ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label htmlFor="model" className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">模型名称</Label>
                <div className="relative group">
                  <Box className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input 
                    id="model" 
                    placeholder={apiType === "dashscope" ? "例如: qwen-plus" : "例如: gpt-3.5-turbo"} 
                    value={settings.model} 
                    onChange={(e) => setSettings({ ...settings, model: e.target.value })} 
                    className="pl-10 h-11 bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-white/10 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 rounded-xl transition-all" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey" className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">API Key</Label>
                <div className="relative group">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input 
                    id="apiKey" 
                    type="password" 
                    placeholder="sk-..." 
                    value={settings.apiKey} 
                    onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })} 
                    className="pl-10 h-11 bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-white/10 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 rounded-xl transition-all font-mono text-sm" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiUrl" className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">API 接入点</Label>
                <div className="relative group">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input 
                    id="apiUrl" 
                    placeholder="https://..." 
                    value={settings.apiUrl} 
                    onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })} 
                    className="pl-10 h-11 bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-white/10 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 rounded-xl transition-all font-mono text-xs" 
                  />
                </div>
              </div>
            </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="systemPrompt" className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">系统提示词</Label>
                <div className="relative group">
                  <MessageSquareText className="absolute left-3 top-4 size-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <Textarea 
                    id="systemPrompt" 
                    placeholder="定义 AI 助手的角色和行为..." 
                    value={settings.systemPrompt} 
                    onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })} 
                    className="pl-10 min-h-[100px] bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-white/10 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 rounded-xl transition-all resize-none leading-relaxed" 
                  />
                </div>
              </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-white dark:bg-zinc-900 sticky bottom-0 z-10">
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                className="flex-1 h-12 rounded-xl border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5 text-gray-600"
              >
                取消
              </Button>
              <Button 
                onClick={handleSave} 
                className="flex-[2] h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 font-medium text-base"
              >
                <CheckCircle2 size={18} className="mr-2" />
                保存配置
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}

export default MobileAISettingsModal
