"use client"

import { useState, useEffect } from "react"
import { Search, Check, Plus, Bot, Laptop, Settings, Cpu, Globe, Box } from "lucide-react"
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
    icon: Bot,
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
    icon: Bot,
    lobehubIcon: Qwen,
    defaultUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-plus"
  },
  {
    id: "deepseek",
    name: "DeepSeek AI",
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

const ProviderIcon = ({ provider, className }: { provider: AIProvider, className?: string }) => {
  const LobehubIcon = provider.lobehubIcon
  
  if (LobehubIcon) {
    try {
      const ColorIcon = LobehubIcon.Color
      if (ColorIcon) {
        return (
          <div className={cn("flex items-center justify-center overflow-hidden bg-gray-100", className)}>
            <ColorIcon size={24} />
          </div>
        )
      }
    } catch (e) {
      return (
        <div className={cn("flex items-center justify-center overflow-hidden bg-gray-100", className)}>
          <LobehubIcon size={24} />
        </div>
      )
    }
  }

  const Icon = provider.icon
  return (
    <div className={cn("flex items-center justify-center text-gray-700 bg-gray-100", className)}>
      <Icon size={20} />
    </div>
  )
}

export function ModelStoreContent({ searchQuery = "" }: { searchQuery?: string }) {
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
      provider.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.provider.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const systemProviders = filteredProviders.filter(p => p.id === "system")
  const otherProviders = filteredProviders.filter(p => p.id !== "system")

  const handleConfigSaved = (apiType: string) => {
    setCurrentApiType(apiType)
  }

  const renderProviderRow = (provider: AIProvider) => {
    const isConfigured = currentApiType === provider.id
    return (
      <div
        key={provider.id}
        onClick={() => { setSelectedProvider(provider); setDetailDialogOpen(true); }}
        className="group flex gap-4 cursor-pointer items-center py-3 select-none border-b border-gray-100 last:border-0"
      >
        <ProviderIcon provider={provider} className="size-11 rounded-xl shadow-sm ring-1 ring-gray-200/80 shrink-0 overflow-hidden" />
        <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-[14px] text-gray-900 group-hover:text-gray-950 transition-colors truncate">{provider.name}</h4>
              {provider.official && <Check className="size-3 text-emerald-500 stroke-[3px]" />}
            </div>
            <p className="text-xs text-gray-400 line-clamp-1 max-w-[280px] md:max-w-[340px]">{provider.description}</p>
          </div>
          <div className="shrink-0 flex items-center justify-center">
            {isConfigured ? (
              <Check className="size-4 text-gray-400 stroke-[3px]" />
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedProvider(provider)
                  setDetailDialogOpen(true)
                }}
                className="size-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all active:scale-95"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col bg-white text-gray-800">
      <div className="w-full max-w-4xl mx-auto space-y-10">

        {/* System Presets Section */}
        {systemProviders.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-[15px] font-black text-gray-900 tracking-wider border-b border-gray-200 pb-2">系统</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
              {systemProviders.map(renderProviderRow)}
            </div>
          </div>
        )}

        {/* Other Providers Section */}
        {otherProviders.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-[15px] font-black text-gray-900 tracking-wider border-b border-gray-200 pb-2">第三方引擎</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
              {otherProviders.map(renderProviderRow)}
            </div>
          </div>
        )}

        {filteredProviders.length === 0 && (
          <div className="text-center py-20 text-gray-400 text-sm font-medium">
            未搜索到匹配的大模型引擎
          </div>
        )}
      </div>

      <ModelDetailDialog
        provider={selectedProvider}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onSave={handleConfigSaved}
      />
    </div>
  )
}
