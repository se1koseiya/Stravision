"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Qwen, DeepSeek, Moonshot, Zhipu, OpenAI, Anthropic, Google, Meta } from '@lobehub/icons'
import { Button } from "@/components/ui/button"
import { Spin } from "antd"
import { toast } from "@/lib/ui/feedback"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/illustration"
import { ModelDetailDialog } from "@/components/model-store/model-detail-dialog"
import { IconBookOpen, IconBox, IconCheck, IconClose, IconCpu, IconGlobe, IconLaptop, IconMagic, IconPlus, IconRobot, IconSearch, IconSetting, IconShield, IconTag } from "@/components/icon";

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
    icon: IconMagic,
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
    icon: IconMagic,
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
    icon: IconCpu,
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
    icon: IconGlobe,
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
    icon: IconBox,
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
    icon: IconGlobe,
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
    icon: IconRobot,
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
    icon: IconBox,
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
    icon: IconLaptop,
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
    icon: IconSetting,
    defaultUrl: "",
    defaultModel: ""
  }
]

// ================================================================
//  装饰插图（与 skill-store / mcp-store 保持一致）
// ================================================================
const ModelsIllustration = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="200"
    height="110"
    viewBox="0 0 200 110"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <path
      d="M5 85 C 35 35, 75 25, 110 50 S 175 70, 195 45"
      stroke="#059669"
      strokeWidth="1.4"
      strokeLinecap="round"
      fill="none"
      opacity="0.85"
    />
    <circle cx="60" cy="48" r="22" fill="rgba(0,148,86,0.10)" />
    {[42, 48, 54, 60, 66, 72, 78].map(x => (
      <line key={x} x1={x} y1={28} x2={x} y2={68} stroke="#059669" strokeWidth="1" opacity="0.55" />
    ))}
    <circle cx="115" cy="58" r="24" fill="rgba(0,148,86,0.18)" />
    <circle cx="108" cy="22" r="4" fill="#059669" />
    <text
      x="100"
      y="55"
      fontSize="11"
      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      fill="#059669"
      fontWeight="600"
    >{`</>`}</text>
    <g transform="translate(165, 22)">
      <line x1="0" y1="-9" x2="0" y2="9" stroke="#059669" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="-9" y1="0" x2="9" y2="0" stroke="#059669" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="-6.5" y1="-6.5" x2="6.5" y2="6.5" stroke="#059669" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="-6.5" y1="6.5" x2="6.5" y2="-6.5" stroke="#059669" strokeWidth="1.4" strokeLinecap="round" />
    </g>
    <circle cx="20" cy="20" r="1.6" fill="#059669" />
    <circle cx="180" cy="60" r="1.6" fill="#059669" />
    <circle cx="195" cy="80" r="1" fill="#059669" opacity="0.6" />
    <circle cx="40" cy="95" r="1.2" fill="#059669" opacity="0.5" />
  </svg>
)

// ================================================================
//  Provider 卡片图标（lobehub 优先 + lucide 兜底）
// ================================================================
const ProviderBadge = ({ provider, size = "md" }: { provider: AIProvider, size?: "sm" | "md" | "lg" }) => {
  const dim =
    size === "lg" ? "size-12" :
      size === "sm" ? "size-8" :
        "size-10"

  if (provider.lobehubIcon) {
    try {
      const ColorIcon = provider.lobehubIcon.Color
      if (ColorIcon) {
        return (
          <div
            className={cn(
              dim,
              "rounded-full flex items-center justify-center overflow-hidden bg-white border border-zinc-200 shrink-0"
            )}
          >
            <ColorIcon size={size === "lg" ? 28 : size === "sm" ? 18 : 22} />
          </div>
        )
      }
    } catch (e) {
      // fall through
    }
  }

  const Icon = provider.icon
  return (
    <div
      className={cn(
        dim,
        "rounded-full flex items-center justify-center text-zinc-700 bg-zinc-100 border border-zinc-200 shrink-0"
      )}
    >
      <Icon size={size === "lg" ? 22 : size === "sm" ? 14 : 18} />
    </div>
  )
}

// ================================================================
//  详情视图（参考 skill-store SkillDetailView）
// ================================================================
const ModelDetailView = ({
  provider,
  isActive,
  onClose,
  onConfig
}: {
  provider: AIProvider
  isActive: boolean
  onClose: () => void
  onConfig: () => void
}) => {
  const [open, setOpen] = useState(true)
  const handleClose = () => {
    if (!open) return
    setOpen(false)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onAnimationComplete={() => { if (!open) onClose() }}
      className={cn(
        "fixed inset-0 z-[300] flex items-center justify-center p-0 md:p-6",
        !open && "pointer-events-none"
      )}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        /* 遮罩的模糊也接全站「材质厚度」档位（.dc-gblur × --dc-mat-scale） */
        style={{ "--gblur": "2px" } as React.CSSProperties}
        className="absolute inset-0 bg-black/40 dc-gblur"
        aria-hidden
      />

      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl max-h-[88vh] bg-white border border-zinc-200/80 flex flex-col overflow-hidden"
        style={{ borderRadius: 12 }}
      >
        <button
          onClick={handleClose}
          className="absolute top-3.5 right-3.5 z-50 size-8 flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          style={{ borderRadius: 8 }}
          title="关闭"
        >
          <IconClose size={16} />
        </button>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 pt-6 pb-5">
            {/* 顶部：图标 + 标题 + 按钮 */}
            <div className="flex items-start gap-3.5">
              <ProviderBadge provider={provider} size="lg" />
              <div className="flex-1 min-w-0 pt-0.5">
                <h2 className="text-[18px] font-semibold leading-tight text-zinc-900 tracking-tight">
                  {provider.name}
                </h2>
                <p className="text-[13px] text-zinc-500 leading-relaxed mt-1.5 pr-2">
                  {provider.description}
                </p>
              </div>
              <Button
                onClick={(e) => { e.stopPropagation(); onConfig() }}
                className={cn(
                  "h-8 px-3.5 text-[13px] font-medium shrink-0 gap-1.5",
                  isActive
                    ? "!bg-white !text-emerald-600 !border !border-emerald-200 hover:!bg-emerald-50 hover:!border-emerald-300"
                    : "!bg-zinc-900 hover:!bg-zinc-800 !text-white !border-zinc-900"
                )}
                style={{ borderRadius: 8 }}
              >
                {isActive ? (
                  <><IconCheck size={13} />已启用</>
                ) : (
                  <><IconPlus size={13} strokeWidth={2.5} />配置模型</>
                )}
              </Button>
            </div>

            {/* 推荐 Prompt */}
            <div className="mt-5">
              <div className="flex items-center gap-1.5 mb-2">
                <IconMagic size={12} className="text-zinc-400" />
                <span className="text-[13px] font-semibold text-zinc-700">推荐 Prompt</span>
              </div>
              <textarea
                defaultValue={`使用 ${provider.name} 帮我分析一下当前草莓大棚的环境数据。`}
                rows={2}
                className="w-full px-3 py-2 text-[13px] text-zinc-700 bg-white border border-zinc-200 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors resize-none leading-relaxed placeholder:text-zinc-300"
                style={{ borderRadius: 8 }}
                placeholder="输入推荐用法描述…"
              />
            </div>

            {/* 接入信息 */}
            <div className="mt-5">
              <div className="flex items-center gap-1.5 mb-2">
                <IconBookOpen size={12} className="text-zinc-400" />
                <span className="text-[13px] font-semibold text-zinc-700">接入信息</span>
              </div>
              <pre
                className="text-[12px] font-mono text-zinc-300 bg-zinc-900 px-3.5 py-3 overflow-auto max-h-[180px] leading-relaxed scrollbar-thin whitespace-pre-wrap break-words"
                style={{ borderRadius: 8 }}
              >
{`Endpoint: ${provider.defaultUrl || "(内置预设)"}\nModel:    ${provider.defaultModel || "(自动选择)"}\nProvider: ${provider.provider}\nProtocol: OpenAI-compatible / v1/chat/completions`}
              </pre>
            </div>

            {/* 核心能力 */}
            <div className="mt-5">
              <div className="flex items-center gap-1.5 mb-2">
                <IconCpu size={12} className="text-zinc-400" />
                <span className="text-[13px] font-semibold text-zinc-700">核心能力</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {[
                  "多轮对话",
                  "工具调用 (Function Calling)",
                  "流式响应",
                  "Markdown / 代码渲染",
                ].map((feature, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-2.5 py-1.5 border border-zinc-200"
                    style={{ borderRadius: 6 }}
                  >
                    <IconCheck size={11} className="text-emerald-600 shrink-0" strokeWidth={3} />
                    <span className="text-[12px] text-zinc-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 元信息 */}
            <div className="mt-4 flex items-center gap-3 text-[12px] text-zinc-400 flex-wrap">
              <span className="flex items-center gap-1">
                <IconGlobe size={11} />{provider.provider}
              </span>
              <span className="w-px h-3 bg-zinc-200" />
              <span className="flex items-center gap-1">
                <IconTag size={11} />{provider.category}
              </span>
              {provider.official && (
                <>
                  <span className="w-px h-3 bg-zinc-200" />
                  <span className="flex items-center gap-1">
                    <IconShield size={11} />官方推荐
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ================================================================
//  卡片
// ================================================================
const ModelCard = ({
  provider,
  isActive,
  onClick,
  onConfig
}: {
  provider: AIProvider
  isActive: boolean
  onClick: () => void
  onConfig: (e: React.MouseEvent) => void
}) => {
  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col gap-2.5 px-4 pt-4 pb-3.5 bg-white border border-zinc-200/80 hover:border-emerald-300 transition-colors cursor-pointer"
      style={{ borderRadius: 12 }}
    >
      <div className="flex items-start gap-3">
        <ProviderBadge provider={provider} size="md" />
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[14px] font-semibold text-zinc-900 truncate group-hover:text-emerald-700 transition-colors">
              {provider.name}
            </h3>
            {provider.official && (
              <IconShield size={11} className="text-emerald-500 shrink-0" strokeWidth={2.5} />
            )}
          </div>
          <span className="text-[11px] text-zinc-400 mt-0.5 inline-block">· {provider.category}</span>
        </div>
      </div>
      <p className="text-[13px] text-zinc-500 leading-relaxed line-clamp-3 min-h-[3.6em]">
        {provider.description}
      </p>
      <div className="mt-auto flex items-center justify-between pt-1">
        <span className="text-[12px] text-zinc-400 flex items-center gap-1">
          <IconGlobe size={11} />
          {provider.provider}
        </span>
        {isActive ? (
          <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
            <IconCheck size={11} strokeWidth={3} />
            使用中
          </span>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onConfig(e) }}
            className="size-6 flex items-center justify-center text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            style={{ borderRadius: 6 }}
            title="配置"
          >
            <IconPlus size={13} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  )
}

// ================================================================
//  主组件：模型商店（参考 skill-store 重设计）
// ================================================================
type MainTab = "recommended" | "official" | "opensource" | "local"
type SubTab = "all" | "official" | "other"

export function ModelStoreContent({ searchQuery = "" }: { searchQuery?: string }) {
  const [currentApiType, setCurrentApiType] = useState<string>("system")
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  const [mainTab, setMainTab] = useState<MainTab>("recommended")
  const [subTab, setSubTab] = useState<SubTab>("all")
  const [localSearch, setLocalSearch] = useState(searchQuery)

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

  useEffect(() => {
    setLocalSearch(searchQuery)
  }, [searchQuery])

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

  // 过滤
  const filteredProviders = useMemo(() => {
    const q = localSearch.trim().toLowerCase()
    return AI_PROVIDERS.filter(p => {
      // 主标签
      if (mainTab === "official" && !p.official) return false
      if (mainTab === "opensource" && p.official) return false
      if (mainTab === "local" && p.id !== "ollama" && p.id !== "custom") return false
      if (mainTab === "recommended") {
        // 推荐：官方 + 常用引擎
        if (!p.official) return false
      }
      // 子标签
      if (subTab === "official" && !p.official) return false
      if (subTab === "other" && p.official) return false
      // 搜索
      if (q && !p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q) && !p.provider.toLowerCase().includes(q)) return false
      return true
    })
  }, [mainTab, subTab, localSearch])

  // 计数
  const subCounts = useMemo(() => {
    const base = AI_PROVIDERS.filter(p => {
      if (mainTab === "official" && !p.official) return false
      if (mainTab === "opensource" && p.official) return false
      if (mainTab === "local" && p.id !== "ollama" && p.id !== "custom") return false
      if (mainTab === "recommended" && !p.official) return false
      return true
    })
    return {
      all: base.length,
      official: base.filter(p => p.official).length,
      other: base.filter(p => !p.official).length,
    }
  }, [mainTab])

  const mainTabs: { key: MainTab; label: string }[] = [
    { key: "recommended", label: "推荐" },
    { key: "official", label: "官方" },
    { key: "opensource", label: "开源社区" },
    { key: "local", label: "本地部署" },
  ]

  const subTabs: { key: SubTab; label: string }[] = [
    { key: "all", label: "全部" },
    { key: "official", label: "官方推荐" },
    { key: "other", label: "其他" },
  ]

  const handleConfigSaved = (apiType: string) => {
    setCurrentApiType(apiType)
  }

  const handleOpenConfig = (provider: AIProvider) => {
    setDetailDialogOpen(true)
  }

  return (
    <div className="w-full">
      {/* 标题区 */}
      <div className="flex items-center justify-between gap-6 mb-7">
        <div>
          <h1 className="text-[32px] font-bold text-zinc-900 leading-none tracking-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            Models
          </h1>
          <p className="text-[13px] text-zinc-500 mt-2.5 flex items-center gap-1">
            <span>驱动 AI 的引擎</span>
            <button
              onClick={() => {
                setSelectedProvider(AI_PROVIDERS.find(p => p.id === "custom") || null)
                setDetailDialogOpen(true)
              }}
              className="text-emerald-600 hover:text-emerald-700 cursor-pointer font-medium inline-flex items-center gap-0.5"
            >
              自定义节点
              <span aria-hidden>→</span>
            </button>
          </p>
        </div>
        <ModelsIllustration className="hidden md:block shrink-0" />
      </div>

      {/* 主标签 + 搜索 */}
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-1 bg-zinc-100/70 p-1 rounded-xl">
          {mainTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setMainTab(t.key)}
              className={cn(
                "px-5 py-1.5 text-[13px] font-medium transition-all rounded-lg",
                mainTab === t.key
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative w-64">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="搜索模型"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-[13px] bg-white border border-zinc-200 text-zinc-700 placeholder-zinc-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors"
            style={{ borderRadius: 10 }}
          />
        </div>
      </div>

      {/* 子标签 */}
      <div className="flex items-center gap-6 mb-5 border-b border-zinc-200/80">
        {subTabs.map((t, i) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={cn(
              "relative pb-2.5 text-[13px] font-medium transition-colors",
              subTab === t.key
                ? "text-zinc-900"
                : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            <span className="inline-flex items-center gap-1">
              {t.label}
              <span className={cn(
                "text-[11px] tabular-nums",
                subTab === t.key ? "text-zinc-500" : "text-zinc-400"
              )}>
                {i === 0 ? `(${subCounts.all})` : subCounts[t.key as keyof typeof subCounts]}
              </span>
            </span>
            {subTab === t.key && (
              <motion.span
                layoutId="model-subtab-underline"
                className="absolute -bottom-px left-0 right-0 h-0.5 bg-emerald-600 pointer-events-none"
                transition={{ duration: 0.2 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* 卡片网格 */}
      {filteredProviders.length === 0 ? (
        <EmptyState
          className="py-20"
          illustration={localSearch ? "search" : "empty-list"}
          illustrationWidth={190}
          title={localSearch ? `未搜索到「${localSearch}」相关模型` : "暂无模型"}
          description={localSearch ? "换个关键词试试，或浏览推荐模型。" : "等模型服务商上架后，这里会展示可配置的模型。"}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProviders.map(provider => {
            const isActive = currentApiType === provider.id
            return (
              <ModelCard
                key={provider.id}
                provider={provider}
                isActive={isActive}
                onClick={() => setSelectedProvider(provider)}
                onConfig={() => {
                  setSelectedProvider(provider)
                  handleOpenConfig(provider)
                }}
              />
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {selectedProvider && (
          <ModelDetailView
            key={selectedProvider.id}
            provider={selectedProvider}
            isActive={currentApiType === selectedProvider.id}
            onClose={() => setSelectedProvider(null)}
            onConfig={() => {
              setDetailDialogOpen(true)
            }}
          />
        )}
      </AnimatePresence>

      <ModelDetailDialog
        provider={selectedProvider}
        open={detailDialogOpen}
        onOpenChange={(open) => {
          setDetailDialogOpen(open)
          if (!open) {
            // 重新加载设置
            const savedStr = localStorage.getItem("ai-settings")
            if (savedStr) {
              determineActiveType(JSON.parse(savedStr))
            }
          }
        }}
        onSave={handleConfigSaved}
      />
    </div>
  )
}
