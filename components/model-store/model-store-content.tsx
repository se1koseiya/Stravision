"use client"

import { useState, useEffect } from "react"
import { Search, Check, Sparkles, Bot, Laptop, Settings, Cpu, Globe, Box } from "lucide-react"
import { Qwen, DeepSeek, Moonshot, Zhipu, OpenAI, Anthropic, Google, Meta } from '@lobehub/icons'
import { motion } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ModelDetailDialog } from "@/components/model-store/model-detail-dialog"

export interface AIProvider {
  id: string;
  name: string;
  provider: string;
  description: string;
  category: string;
  official: boolean;
  icon: any;
  defaultUrl: string;
  defaultModel: string;
  lobehubIcon?: any;
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: "system",
    name: "阿里云百炼 (系统预设)",
    provider: "Alibaba Cloud",
    description: "由通义千问驱动的系统级预置引擎。每日自动分配免费额度，对新手极为友好，无需配置环境即可进行农业问答与视觉分析。",
    category: "大语言模型",
    official: true,
    icon: Sparkles,
    lobehubIcon: Qwen,
    defaultUrl: "",
    defaultModel: ""
  },
  {
    id: "dashscope",
    name: "阿里云百炼 (高级账户)",
    provider: "Alibaba Cloud",
    description: "针对国内开发者的极速基座。需自备百炼平台API Key，完整支持 Qwen-Max, Qwen-VL 等地表最强开源系模型能力及其商业版。",
    category: "大语言模型",
    official: true,
    icon: Sparkles,
    lobehubIcon: Qwen,
    defaultUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-plus"
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    provider: "DeepSeek AI",
    description: "引发大规模破圈效应的超高性价比模型。内置划时代的 DeepSeek V3 和 R1 推理模型，数学、代码、逻辑推理领域表现卓越。",
    category: "推理模型",
    official: true,
    icon: Cpu,
    lobehubIcon: DeepSeek,
    defaultUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat"
  },
  {
    id: "openai",
    name: "OpenAI",
    provider: "OpenAI",
    description: "体验当今 AI 最强战力。兼容全球领先的 GPT-4o, o1-preview, o3-mini 等旗舰大模型，全场景智能任务完美收官体验。",
    category: "大语言模型",
    official: true,
    icon: Globe,
    lobehubIcon: OpenAI,
    defaultUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini"
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    provider: "Anthropic",
    description: "以 Claude-3.5-Sonnet 著称的强大阵营模型。长文本指令遵循度业界第一，写代码、创作及逻辑推理首选引擎。",
    category: "大语言模型",
    official: true,
    icon: Box,
    lobehubIcon: Anthropic,
    defaultUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-5-sonnet-20240620"
  },
  {
    id: "google",
    name: "Google Gemini",
    provider: "Google DL",
    description: "原生构建的多模态吞金兽。支持多达 2M token的离谱超长上下文，可原生处理大量视频、截图以及海量农业传感器日志。",
    category: "多模态",
    official: true,
    icon: Globe,
    lobehubIcon: Google,
    defaultUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-1.5-pro"
  },
  {
    id: "moonshot",
    name: "Moonshot (Kimi)",
    provider: "Moonshot AI",
    description: "月之暗面专攻的超长文本解析利器。如果你需要模型一口气阅读 200 万字的作物品种繁育技术报告，选它准没错。",
    category: "大语言模型",
    official: true,
    icon: Bot,
    lobehubIcon: Moonshot,
    defaultUrl: "https://api.moonshot.cn/v1",
    defaultModel: "moonshot-v1-8k"
  },
  {
    id: "zhipu",
    name: "清言 GLM",
    provider: "Zhipu AI",
    description: "国内学术界的开源瑰宝。GLM-5 系列模型在中文语义理解及工具调用能力 (Function Calling) 上表现极其精调而稳健。",
    category: "大语言模型",
    official: true,
    icon: Box,
    lobehubIcon: Zhipu,
    defaultUrl: "https://open.bigmodel.cn/api/paas/v4",
    defaultModel: "glm-4"
  },
  {
    id: "ollama",
    name: "Ollama 本地引擎",
    provider: "Local Environment",
    description: "企业隐私数据的终极庇护所。调用本机或局域网中运行的开源模型(如 Llama-3, Qwen3.6)，数据完全不出网，纯粹安全。",
    category: "本地部署",
    official: true,
    icon: Laptop,
    lobehubIcon: Meta,
    defaultUrl: "http://localhost:11434/v1",
    defaultModel: "llama3"
  },
  {
    id: "custom",
    name: "自定义万能节点",
    provider: "Custom API",
    description: "为 OneAPI 或其他兼容 OpenAI 标准 `v1/chat/completions` 的中转代理准备的高自由度接入方案。全参数可调。",
    category: "大语言模型",
    official: false,
    icon: Settings,
    defaultUrl: "",
    defaultModel: ""
  }
]

const CATEGORIES = [
  { id: "精选", name: "今日精选" },
  { id: "已配置", name: "当前使用" },
  { id: "大语言模型", name: "通用大语言" },
  { id: "推理模型", name: "深度推理" },
  { id: "多模态", name: "视觉/处理" },
  { id: "本地部署", name: "离线极速" }
]

const ProviderIcon = ({ provider, className }: { provider: AIProvider, className?: string }) => {
  const LobehubIcon = provider.lobehubIcon
  
  if (LobehubIcon) {
    // 尝试使用 .Color，如果不存在则使用默认图标
    try {
      const ColorIcon = LobehubIcon.Color
      if (ColorIcon) {
        return (
          <div className={cn("flex items-center justify-center overflow-hidden", className)}>
            <ColorIcon size={48} />
          </div>
        )
      }
    } catch (e) {
      // 如果没有 .Color，使用默认的 LobehubIcon
      return (
        <div className={cn("flex items-center justify-center overflow-hidden", className)}>
          <LobehubIcon size={48} />
        </div>
      )
    }
  }
  
  const Icon = provider.icon
  return (
    <div className={cn("flex items-center justify-center text-white bg-zinc-800", className)}>
      <Icon size={32} />
    </div>
  )
}

export function ModelStoreContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("精选")
  const [currentApiType, setCurrentApiType] = useState<string>("system")
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings")
        if (response.ok) {
          const serverSettings = await response.json()
          const savedStr = localStorage.getItem("ai-settings")
          const localSettings = savedStr ? JSON.parse(savedStr) : null
          const effective = serverSettings || localSettings || {}
          determineActiveType(effective)
        } else {
          fallbackLocalSettings()
        }
      } catch {
        fallbackLocalSettings()
      }
    }
    loadSettings()
  }, [])

  const fallbackLocalSettings = () => {
    const saved = localStorage.getItem("ai-settings")
    if (saved) {
      determineActiveType(JSON.parse(saved))
    } else {
      setCurrentApiType("system")
    }
  }

  const determineActiveType = (effective: any) => {
    if (!effective.apiKey && !effective.apiUrl) {
      setCurrentApiType("system")
    } else if (effective.apiUrl?.includes("dashscope") || effective.model?.startsWith("qwen")) {
      setCurrentApiType("dashscope")
    } else if (effective.apiUrl?.includes("deepseek")) {
      setCurrentApiType("deepseek")
    } else if (effective.apiUrl?.includes("anthropic")) {
      setCurrentApiType("anthropic")
    } else if (effective.apiUrl?.includes("google")) {
      setCurrentApiType("google")
    } else if (effective.apiUrl?.includes("moonshot")) {
      setCurrentApiType("moonshot")
    } else if (effective.apiUrl?.includes("bigmodel")) {
      setCurrentApiType("zhipu")
    } else if (effective.apiUrl?.includes("localhost") || effective.apiKey === "ollama") {
      setCurrentApiType("ollama")
    } else if (effective.apiUrl?.includes("openai.com")) {
      setCurrentApiType("openai")
    } else {
      setCurrentApiType("custom")
    }
  }

  const filteredProviders = AI_PROVIDERS.filter(provider => {
    const matchesSearch = provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.description.toLowerCase().includes(searchQuery.toLowerCase())
    if (activeCategory === "精选") return matchesSearch
    if (activeCategory === "已配置") return matchesSearch && currentApiType === provider.id
    return matchesSearch && provider.category === activeCategory
  }).sort((a, b) => (b.official ? 1 : 0) - (a.official ? 1 : 0))

  const featured = filteredProviders.filter(p => p.id === 'dashscope' || p.id === 'openai')
  const others = activeCategory === "精选" ? filteredProviders.filter(p => p.id !== 'dashscope' && p.id !== 'openai') : filteredProviders

  const gradients = [
    "from-indigo-600 to-blue-700",
    "from-emerald-500 to-teal-700",
    "from-purple-600 to-pink-800",
    "from-orange-500 to-red-600"
  ]

  const handleConfigSaved = (apiType: string) => {
    setCurrentApiType(apiType)
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#000] relative overflow-hidden">
      <div className="flex flex-col h-full">
        <div className="px-8 pt-10 pb-4 shrink-0 flex items-end justify-between max-w-7xl mx-auto w-full z-20">
          <div className="space-y-0.5">
            <span className="text-zinc-500 text-[13px] font-bold uppercase tracking-tight">
              AI Provider Store
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight">配置你的大模型引擎</h1>
          </div>

          <div className="flex items-center gap-6 mb-1">
            <div className="bg-zinc-100 dark:bg-zinc-900/50 backdrop-blur-3xl px-1 py-1 rounded-2xl flex items-center shadow-sm border border-black/5 dark:border-white/5 overflow-x-auto max-w-[600px] no-scrollbar">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "text-[13px] font-bold transition-all px-5 py-2 rounded-xl whitespace-nowrap",
                    activeCategory === cat.id
                      ? "bg-white dark:bg-zinc-800 text-blue-500 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-8 pb-32 space-y-16 max-w-7xl mx-auto">
            {activeCategory === "精选" && featured.length > 0 && (
              <div className="flex flex-col md:flex-row gap-6 pt-4 h-[550px]">
                {featured.map((provider, idx) => (
                  <motion.div
                    key={provider.id}
                    onClick={() => { setSelectedProvider(provider); setDetailDialogOpen(true); }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "relative h-full rounded-[2.5rem] overflow-hidden cursor-pointer shadow-2xl group border border-black/5 dark:border-white/5",
                      idx === 0 ? "flex-[2.2]" : "flex-[1]"
                    )}
                  >
                    <div className={cn("absolute inset-0 bg-gradient-to-br", gradients[idx % gradients.length])} />
                    <div className="absolute inset-x-0 top-0 p-8 pt-10 z-10 bg-gradient-to-b from-black/30 to-transparent">
                      <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white/70">{provider.category.toUpperCase()}</span>
                      <h2 className="text-4xl font-extrabold mt-2 leading-[1.1] text-white drop-shadow-lg max-w-[80%]">{provider.name}</h2>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-6 z-10 bg-black/20 backdrop-blur-2xl border-t border-white/10 flex items-center justify-between group-hover:bg-black/30 transition-all gap-4">
                      <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                        <ProviderIcon provider={provider} className="size-12 rounded-xl shadow-xl ring-1 ring-black/5 bg-white dark:bg-zinc-900" />
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-bold text-sm text-white truncate">{provider.provider}</p>
                          <p className="text-[10px] text-white/60 truncate font-medium">{provider.description}</p>
                        </div>
                      </div>
                      <Button
                        onClick={(e) => { e.stopPropagation(); setSelectedProvider(provider); setDetailDialogOpen(true); }}
                        className={cn(
                          "rounded-full px-5 py-1.5 h-8 font-bold text-xs shadow-sm backdrop-blur-md transition-all tracking-tight shrink-0",
                          currentApiType === provider.id ? "bg-white text-black hover:bg-white/90" : "bg-white/20 hover:bg-white/30 text-white"
                        )}
                      >
                        {currentApiType === provider.id ? "使用中" : "配置"}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="space-y-8">
              <div className="flex items-center justify-between border-b pb-5 border-zinc-100 dark:border-zinc-800/50">
                <h3 className="text-2xl font-extrabold tracking-tight">
                  {activeCategory === "精选" ? "全部可用引擎" : activeCategory === "已配置" ? "当前使用的引擎" : `${activeCategory} 引擎列表`}
                </h3>
                <div className="flex items-center gap-4">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                    <Input
                      placeholder="搜索大模型提供商..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 border-none bg-zinc-100 dark:bg-zinc-900 rounded-xl text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-10 gap-x-12">
                {others.map((provider) => {
                  const isConfigured = currentApiType === provider.id
                  return (
                    <div
                      key={provider.id}
                      onClick={() => { setSelectedProvider(provider); setDetailDialogOpen(true); }}
                      className="group flex gap-5 cursor-pointer items-start border-b border-zinc-100 dark:border-zinc-800/50 pb-8 last:border-0"
                    >
                      <ProviderIcon provider={provider} className="size-16 rounded-[1.35rem] shadow-sm group-hover:shadow-md transition-all shrink-0 bg-white dark:bg-zinc-900" />
                      <div className="flex-1 min-w-0 flex flex-col justify-between h-full gap-3">
                        <div className="space-y-1 mt-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-lg truncate leading-none tracking-tight">{provider.name}</h4>
                              {provider.official && <Check className="size-3 text-blue-500 stroke-[4px]" />}
                            </div>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-500 font-medium tracking-tight">{provider.provider} · {provider.category}</p>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed pt-1.5">{provider.description}</p>
                        </div>
                        <Button
                          size="sm"
                          className={cn(
                            "rounded-full px-6 py-2 h-8 font-extrabold text-[13px] shadow-sm transition-all active:scale-95 w-fit",
                            isConfigured ? "bg-zinc-100 dark:bg-zinc-800 text-blue-500" : "bg-black dark:bg-zinc-900 text-white hover:bg-zinc-800 dark:hover:bg-zinc-800"
                          )}
                        >
                          {isConfigured ? "已启用" : "去配置"}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      <ModelDetailDialog
        provider={selectedProvider}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onSave={handleConfigSaved}
      />

      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-emerald-500/[0.03] to-transparent pointer-events-none -z-10" />
    </div>
  )
}
