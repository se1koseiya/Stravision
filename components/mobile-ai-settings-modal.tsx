import { useState, useEffect } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Dialog, DialogPortal, DialogOverlay, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Settings } from "@/components/animate-ui/icons/settings";
import { X } from "@/components/animate-ui/icons/x";
import { Bot } from "@/components/animate-ui/icons/bot";
import { Sparkles } from "@/components/animate-ui/icons/sparkles";
import { cn } from "@/lib/utils"
import { IconBox, IconCheckOne, IconComment, IconGlobe, IconKey, IconLaptop, IconLink, IconShield } from "@/components/icon";

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

  const [apiType, setApiType] = useState<string>("system")

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
          } else if (effective.apiUrl?.includes("deepseek")) {
            setApiType("deepseek")
          } else if (effective.apiUrl?.includes("anthropic")) {
            setApiType("anthropic")
          } else if (effective.apiUrl?.includes("google")) {
            setApiType("google")
          } else if (effective.apiUrl?.includes("moonshot")) {
            setApiType("moonshot")
          } else if (effective.apiUrl?.includes("bigmodel")) {
            setApiType("zhipu")
          } else if (effective.apiUrl?.includes("localhost") || effective.apiKey === "ollama") {
            setApiType("ollama")
          } else if (effective.apiUrl?.includes("openai.com")) {
            setApiType("openai")
          } else {
            setApiType("custom")
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
            } else if (parsed.apiUrl?.includes("deepseek")) {
              setApiType("deepseek")
            } else if (parsed.apiUrl?.includes("anthropic")) {
              setApiType("anthropic")
            } else if (parsed.apiUrl?.includes("google")) {
              setApiType("google")
            } else if (parsed.apiUrl?.includes("moonshot")) {
              setApiType("moonshot")
            } else if (parsed.apiUrl?.includes("bigmodel")) {
              setApiType("zhipu")
            } else if (parsed.apiUrl?.includes("localhost") || parsed.apiKey === "ollama") {
              setApiType("ollama")
            } else if (parsed.apiUrl?.includes("openai.com")) {
              setApiType("openai")
            } else {
              setApiType("custom")
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
            } else if (parsed.apiUrl?.includes("deepseek")) {
              setApiType("deepseek")
            } else if (parsed.apiUrl?.includes("anthropic")) {
              setApiType("anthropic")
            } else if (parsed.apiUrl?.includes("google")) {
              setApiType("google")
            } else if (parsed.apiUrl?.includes("moonshot")) {
              setApiType("moonshot")
            } else if (parsed.apiUrl?.includes("bigmodel")) {
              setApiType("zhipu")
            } else if (parsed.apiUrl?.includes("localhost") || parsed.apiKey === "ollama") {
              setApiType("ollama")
            } else if (parsed.apiUrl?.includes("openai.com")) {
              setApiType("openai")
            } else {
              setApiType("custom")
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
          className="fixed inset-x-0 bottom-0 z-50 w-full max-w-none rounded-t-[2rem] bg-white dark:bg-zinc-900 shadow-lg border-t border-black/5 dark:border-white/10 overflow-hidden h-[85vh] sm:left-1/2 sm:top-1/2 sm:inset-x-auto sm:h-auto sm:max-w-md sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border animate-in slide-in-from-bottom-full sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-300"
        >
          {/* 屏幕阅读器可访问的对话框标题（视觉隐藏，不影响现有 Header） */}
          <DialogTitle className="sr-only">模型配置</DialogTitle>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-white/5 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Settings size={18} strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">模型配置</div>
                <div className="text-xs text-muted-foreground dark:text-muted-foreground">配置您的专属 AI 助手</div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full hover:bg-muted dark:hover:bg-white/10 h-8 w-8 text-muted-foreground">
              <X size={18} />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 overflow-y-auto h-[calc(85vh-70px-80px)] sm:h-auto max-h-[70vh]">
            
            {/* API Type Selector */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">大模型厂商选择</Label>
              <div 
                className="flex flex-row overflow-x-auto gap-2 pb-2 snap-x snap-mandatory px-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {[
                  { id: "system", name: "系统预设", icon: IconShield, url: "", desc: "阿里云百炼提供基础AI能力，无需手动配置" },
                  { id: "dashscope", name: "阿里云", icon: Sparkles, url: "https://dashscope.aliyuncs.com/compatible-mode/v1", desc: "填入自定义阿里云百炼 Key" },
                  { id: "deepseek", name: "DeepSeek", icon: Bot, url: "https://api.deepseek.com/v1", desc: "深度求索 V3/R1" },
                  { id: "openai", name: "OpenAI", icon: IconGlobe, url: "https://api.openai.com/v1", desc: "GPT 格式通用接口" },
                  { id: "anthropic", name: "Anthropic", icon: IconBox, url: "https://api.anthropic.com/v1", desc: "Claude 系列模型" },
                  { id: "google", name: "Google", icon: IconGlobe, url: "https://generativelanguage.googleapis.com/v1beta/openai", desc: "Gemini 系列模型" },
                  { id: "moonshot", name: "Kimi", icon: Bot, url: "https://api.moonshot.cn/v1", desc: "月之暗面长文本模型" },
                  { id: "zhipu", name: "智谱清言", icon: IconBox, url: "https://open.bigmodel.cn/api/paas/v4", desc: "GLM 系列大规模预训练模型" },
                  { id: "ollama", name: "Ollama", icon: IconLaptop, url: "http://localhost:11434/v1", desc: "本地终端部署离线运行" },
                  { id: "custom", name: "自定义", icon: Settings, url: "", desc: "兼容 OpenAI 标准的接口URL" }
                ].map(p => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setApiType(p.id)
                        setSettings({
                          ...settings,
                          ...(p.id === 'system' 
                            ? { apiKey: "", apiUrl: "", model: "" } 
                            : { apiUrl: p.url }),
                          ...(p.id === 'ollama'
                            ? { apiKey: "ollama", model: settings.model || "llama3" }
                            : {})
                        })
                      }}
                      className={cn(
                        "flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[10px] text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap snap-center shrink-0 border",
                        apiType === p.id 
                          ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 border-transparent shadow-sm ring-1 ring-black/5 dark:ring-white/10" 
                          : "text-muted-foreground dark:text-muted-foreground border-border/50 dark:border-white/5 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-white/50 dark:hover:bg-white/5 bg-zinc-50/50 dark:bg-zinc-800/20"
                      )}
                    >
                      <Icon size={16} />
                      <span>{p.name}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-muted-foreground px-1">
                {[
                  { id: "system", desc: "阿里云百炼提供基础AI能力，每日固定免费额度，无需手动配置。" },
                  { id: "dashscope", desc: "推荐国内用户使用，填入自定义阿里云百炼 Key 即可享用。" },
                  { id: "deepseek", desc: "支持 DeepSeek V3 / R1 (推理模型)。填入 API 密钥以调用。" },
                  { id: "openai", desc: "支持 GPT-3.5, GPT-4o 等标准接口。" },
                  { id: "anthropic", desc: "支持 Claude-3.5-Sonnet 等长上下文理解模型。" },
                  { id: "google", desc: "Google Gemini 核心模型系列。" },
                  { id: "moonshot", desc: "月之暗面 Kimi 推理分析及超长文本模型。" },
                  { id: "zhipu", desc: "智谱 AI 的 GLM 4 系列闭源中文强大基座模型。" },
                  { id: "ollama", desc: "私有化离线部署，安全保密，建议填写 API URL 为本地 11434 端口。" },
                  { id: "custom", desc: "填入与 OpenAI Messages 的 API 调用协议兼容的服务端节点链接。" }
                ].find(p => p.id === apiType)?.desc}
              </p>
            </div>

            {apiType === "system" ? (
               <div className="bg-emerald-50 dark:bg-primary/10 rounded-xl p-4 border border-emerald-100 dark:border-primary/20">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-emerald-100 dark:bg-primary/20 rounded-full text-primary dark:text-emerald-400">
                        <IconShield size={20} />
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
                <Label htmlFor="model" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">模型名称</Label>
                <div className="relative group">
                  <IconBox className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
                  <Input 
                    id="model" 
                    placeholder={
                      apiType === "dashscope" ? "例如: qwen-plus" :
                      apiType === "deepseek" ? "deepseek-chat" :
                      apiType === "anthropic" ? "claude-3-5-sonnet-20240620" :
                      apiType === "google" ? "gemini-1.5-pro" :
                      apiType === "moonshot" ? "moonshot-v1-8k" :
                      apiType === "zhipu" ? "glm-4" :
                      apiType === "ollama" ? "llama3, qwen2.5" :
                      apiType === "openai" ? "gpt-4o-mini" : "例如: gpt-3.5-turbo"
                    }
                    value={settings.model} 
                    onChange={(e) => setSettings({ ...settings, model: e.target.value })} 
                    className="pl-10 h-11 bg-zinc-50 dark:bg-zinc-800/50 border-border dark:border-white/10 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 rounded-xl transition-all" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">API Key</Label>
                <div className="relative group">
                  <IconKey className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
                  <Input 
                    id="apiKey" 
                    type="password" 
                    placeholder="sk-..." 
                    value={settings.apiKey} 
                    onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })} 
                    className="pl-10 h-11 bg-zinc-50 dark:bg-zinc-800/50 border-border dark:border-white/10 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 rounded-xl transition-all font-mono text-sm" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiUrl" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">API 接入点</Label>
                <div className="relative group">
                  <IconLink className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
                  <Input 
                    id="apiUrl" 
                    placeholder="https://..." 
                    value={settings.apiUrl} 
                    onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })} 
                    className="pl-10 h-11 bg-zinc-50 dark:bg-zinc-800/50 border-border dark:border-white/10 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 rounded-xl transition-all font-mono text-xs" 
                  />
                </div>
              </div>
            </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="systemPrompt" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">系统提示词</Label>
                <div className="relative group">
                  <IconComment className="absolute left-3 top-4 size-4 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
                  <Textarea 
                    id="systemPrompt" 
                    placeholder="定义 AI 助手的角色和行为..." 
                    value={settings.systemPrompt} 
                    onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })} 
                    className="pl-10 min-h-[100px] bg-zinc-50 dark:bg-zinc-800/50 border-border dark:border-white/10 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 rounded-xl transition-all resize-none leading-relaxed" 
                  />
                </div>
              </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-zinc-100 dark:border-white/5 bg-white dark:bg-zinc-900 sticky bottom-0 z-10">
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                className="flex-1 h-12 rounded-xl border-border hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/5 text-muted-foreground"
              >
                取消
              </Button>
              <Button 
                onClick={handleSave} 
                className="flex-[2] h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 font-medium text-base"
              >
                <IconCheckOne size={18} className="mr-2" />
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
