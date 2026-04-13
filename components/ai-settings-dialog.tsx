"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Box, CheckCircle2, Globe, Mic, Laptop } from "lucide-react";
import { Settings } from "@/components/animate-ui/icons/settings";
import { Bot } from "@/components/animate-ui/icons/bot";
import { Sparkles } from "@/components/animate-ui/icons/sparkles";
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"

// 可用的语音音色列表
const VOICE_OPTIONS = [
  { id: 'Mochi', name: '沙小弥', desc: '聪明伶俐的小大人（男童）' },
  { id: 'Cherry', name: '芊悦', desc: '阳光积极、亲切自然（女）' },
  { id: 'longanyun_v3', name: '龙安韵', desc: '婉约轻柔、自然温暖（女）' },
  { id: 'Serena', name: '苏瑶', desc: '温柔小姐姐（女）' },
  { id: 'Ethan', name: '晨煦', desc: '阳光温暖、活力朝气（男）' },
  { id: 'Chelsie', name: '千雪', desc: '二次元虚拟女友（女）' },
  { id: 'Vivian', name: '十三', desc: '拽拽的、可爱小暴躁（女）' },
  { id: 'Momo', name: '茉兔', desc: '撒娇搞怪，逗你开心（女）' },
  { id: 'Bella', name: '萌宝', desc: '喝酒不打醉拳的小萝莉（女）' },
  { id: 'Moon', name: '月白', desc: '率性帅气（男）' },
  { id: 'Kai', name: '凯', desc: '耳朵的一场SPA（男）' },
]

interface AISettings {
  apiKey: string
  apiUrl: string
  model: string
  systemPrompt: string
}

interface VoiceSettings {
  enabled: boolean
  voice: string
  readAloud: boolean
}

interface AISettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (settings: AISettings) => void
  onVoiceSettingsChange?: (settings: VoiceSettings) => void
  voiceSettings?: VoiceSettings
}

type TabId = "model" | "general" | "voice"

// localStorage key for voice settings
const VOICE_SETTINGS_KEY = 'xiaozhi-voice-settings'

export function getVoiceSettings(): VoiceSettings {
  if (typeof window === 'undefined') return { enabled: true, voice: 'Mochi', readAloud: true }
  try {
    const saved = localStorage.getItem(VOICE_SETTINGS_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        enabled: parsed.enabled ?? true,
        voice: parsed.voice || 'Mochi',
        readAloud: parsed.readAloud ?? true
      }
    }
  } catch { }
  return { enabled: true, voice: 'Mochi', readAloud: true }
}

export function saveVoiceSettings(settings: VoiceSettings) {
  if (typeof window === 'undefined') return
  localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(settings))
}

export function AISettingsDialog({ open, onOpenChange, onSave, onVoiceSettingsChange, voiceSettings: externalVoiceSettings }: AISettingsDialogProps) {
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<TabId>("model")
  const [settings, setSettings] = useState<AISettings>({
    apiKey: "",
    apiUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "",
    systemPrompt: "",
  })

  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(
    externalVoiceSettings || { enabled: true, voice: 'Mochi', readAloud: true }
  )

  const [apiType, setApiType] = useState<string>("system")
  const [isSaving, setIsSaving] = useState(false)
  const [quotaInfo, setQuotaInfo] = useState<{ daily_limit: number, daily_usage: number, balance: number } | null>(null)

  useEffect(() => {
    if (!open) return
    const loadSettings = async () => {
      try {
        // 加载配额信息
        fetch("/api/user/settings")
          .then(res => {
            if (!res.ok) throw new Error("Failed to fetch quota")
            return res.json()
          })
          .then(data => {
            if (data && data.quota) {
              setQuotaInfo(data.quota)
            }
          })
          .catch(e => console.error("Failed to load quota info", e))

        // 加载语音设置
        const savedVoice = getVoiceSettings()
        setVoiceSettings(savedVoice)

        const response = await fetch("/api/settings")
        if (response.ok) {
          const serverSettings = await response.json()
          const savedStr = localStorage.getItem("ai-settings")
          const localSettings = savedStr ? JSON.parse(savedStr) : null

          // 优先使用服务器配置
          const effective = serverSettings || localSettings || settings

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
          // 如果没有服务器配置，尝试本地
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
          } else {
            setApiType("system")
          }
        }
      } catch {
        // ... error handling
        setApiType("system")
      }
    }
    loadSettings()
  }, [open])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // 保存语音设置
      saveVoiceSettings(voiceSettings)
      onVoiceSettingsChange?.(voiceSettings)

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
      saveVoiceSettings(voiceSettings)
      onVoiceSettingsChange?.(voiceSettings)
      onSave(settings)
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden gap-0 h-[650px] flex flex-row border-none shadow-2xl bg-white dark:bg-zinc-950 sm:rounded-2xl">
        {/* Sidebar */}
        <div className="w-64 bg-gray-50/80 dark:bg-zinc-900/50 border-r border-gray-200/50 dark:border-white/10 p-4 flex flex-col gap-2 shrink-0">
          <div className="px-2 py-3 mb-2">
            <h2 className="font-bold text-xl tracking-tight">Settings</h2>
          </div>

          <SidebarItem
            icon={Box}
            label="模型设置"
            active={activeTab === "model"}
            onClick={() => setActiveTab("model")}
          />
          <SidebarItem
            icon={Mic}
            label="语音助手"
            active={activeTab === "voice"}
            onClick={() => setActiveTab("voice")}
            badge="Beta"
          />
          <SidebarItem
            icon={Settings}
            label="常规"
            active={activeTab === "general"}
            onClick={() => setActiveTab("general")}
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-950">
          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-zinc-950 z-10">
            <div>
              <DialogTitle className="text-xl font-semibold">
                {activeTab === "model" ? "模型配置" : activeTab === "voice" ? "语音助手" : "常规设置"}
              </DialogTitle>
              <DialogDescription className="mt-1.5">
                {activeTab === "model" ? "配置您的专属 AI 助手模型参数" : activeTab === "voice" ? "配置实时语音交互功能" : "调整应用的基础设置"}
              </DialogDescription>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
              <Button onClick={handleSave} disabled={isSaving} className="min-w-[80px]">
                {isSaving ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>

          {/* Scrollable Form */}
          <div className="flex-1 overflow-y-auto p-8">
            {activeTab === "model" && (
              <div className="space-y-8 max-w-2xl">
                {/* API Type Selector */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">大模型 API 厂商商店</Label>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-full">
                      由 阿里云百炼 提供基础支持
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <ProviderCard
                      active={apiType === "system"}
                      onClick={() => {
                        setApiType("system")
                        setSettings({
                          ...settings,
                          apiKey: "",
                          apiUrl: "",
                          model: "",
                        })
                      }}
                      icon={Sparkles}
                      title="阿里云百炼 (预设)"
                      desc="系统预置，无需配置"
                      badge="系统默认"
                    />
                    <ProviderCard
                      active={apiType === "dashscope"}
                      onClick={() => {
                        setApiType("dashscope")
                        setSettings({
                          ...settings,
                          apiUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
                        })
                      }}
                      icon={Sparkles}
                      title="阿里云百炼 (自定义)"
                      desc="填入个人百炼 Key"
                    />
                    <ProviderCard
                      active={apiType === "deepseek"}
                      onClick={() => {
                        setApiType("deepseek")
                        setSettings({
                          ...settings,
                          apiUrl: "https://api.deepseek.com/v1",
                        })
                      }}
                      icon={Bot}
                      title="DeepSeek"
                      desc="深度求索 V3/R1"
                    />
                    <ProviderCard
                      active={apiType === "openai"}
                      onClick={() => {
                        setApiType("openai")
                        setSettings({
                          ...settings,
                          apiUrl: "https://api.openai.com/v1",
                        })
                      }}
                      icon={Bot}
                      title="OpenAI"
                      desc="GPT 系列模型"
                    />
                    <ProviderCard
                      active={apiType === "anthropic"}
                      onClick={() => {
                        setApiType("anthropic")
                        setSettings({
                          ...settings,
                          apiUrl: "https://api.anthropic.com/v1",
                        })
                      }}
                      icon={Box}
                      title="Anthropic"
                      desc="Claude 系列模型"
                    />
                    <ProviderCard
                      active={apiType === "google"}
                      onClick={() => {
                        setApiType("google")
                        setSettings({
                          ...settings,
                          apiUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
                        })
                      }}
                      icon={Globe}
                      title="Google"
                      desc="Gemini 系列模型"
                    />
                    <ProviderCard
                      active={apiType === "moonshot"}
                      onClick={() => {
                        setApiType("moonshot")
                        setSettings({
                          ...settings,
                          apiUrl: "https://api.moonshot.cn/v1",
                        })
                      }}
                      icon={Bot}
                      title="Moonshot"
                      desc="Kimi 长文本模型"
                    />
                    <ProviderCard
                      active={apiType === "zhipu"}
                      onClick={() => {
                        setApiType("zhipu")
                        setSettings({
                          ...settings,
                          apiUrl: "https://open.bigmodel.cn/api/paas/v4",
                        })
                      }}
                      icon={Box}
                      title="智谱 AI"
                      desc="GLM 系列模型"
                    />
                    <ProviderCard
                      active={apiType === "ollama"}
                      onClick={() => {
                        setApiType("ollama")
                        setSettings({
                          ...settings,
                          apiKey: "ollama",
                          apiUrl: "http://localhost:11434/v1",
                          model: "llama3",
                        })
                      }}
                      icon={Laptop}
                      title="Ollama (本地)"
                      desc="本地终端离线运行"
                    />
                    <ProviderCard
                      active={apiType === "custom"}
                      onClick={() => {
                        setApiType("custom")
                        setSettings({
                          ...settings,
                          apiUrl: "",
                        })
                      }}
                      icon={Settings}
                      title="自定义"
                      desc="兼容 OpenAI 格式"
                    />
                  </div>
                </div>

                {apiType === "system" ? (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/50 dark:bg-blue-900/20">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-2">
                      <Sparkles className="w-5 h-5" />
                      <span className="font-semibold">当前服务状态</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p>您正在使用系统提供的 AI 服务。</p>
                      {quotaInfo ? (
                        <>
                          <p>今日剩余免费次数：<span className="font-bold text-green-600 dark:text-green-400">{Math.max(0, quotaInfo.daily_limit - quotaInfo.daily_usage)}</span> / {quotaInfo.daily_limit}</p>
                          <p>额外余额：<span className="font-bold text-amber-600 dark:text-amber-400">{quotaInfo.balance}</span> 次</p>
                        </>
                      ) : (
                        <p>正在加载配额信息...</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>API Key</Label>
                      <Input
                        value={settings.apiKey}
                        onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                        placeholder={apiType === "ollama" ? "任意字符 (Ollama 不需要 Key)" : "sk-..."}
                        type="password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>API URL</Label>
                      <Input
                        value={settings.apiUrl}
                        onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
                        placeholder={apiType === "ollama" ? "http://localhost:11434/v1" : "https://..."}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>模型名称</Label>
                      <Input
                        value={settings.model}
                        onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                        placeholder={
                          apiType === "dashscope" ? "qwen-plus" :
                          apiType === "deepseek" ? "deepseek-chat" :
                          apiType === "anthropic" ? "claude-3-5-sonnet-20240620" :
                          apiType === "google" ? "gemini-1.5-pro" :
                          apiType === "moonshot" ? "moonshot-v1-8k" :
                          apiType === "zhipu" ? "glm-4" :
                          apiType === "ollama" ? "llama3, qwen2.5" :
                          apiType === "openai" ? "gpt-4o-mini" : "例如: gpt-3.5-turbo"
                        }
                      />
                      {apiType === "ollama" && (
                        <p className="text-xs text-zinc-500">
                          请确保本地 Ollama 已启动 (<code>ollama serve</code>) 且已下载该模型。
                        </p>
                      )}
                    </div>
                  </>
                )}

                <div className="space-y-4">
                  {/* Only show system prompt editing for all modes */}
                  <div className="space-y-2">
                    <Label htmlFor="systemPrompt">系统提示词 (System Prompt)</Label>
                    <Textarea
                      id="systemPrompt"
                      placeholder="设置AI助手的角色和行为..."
                      value={settings.systemPrompt}
                      onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
                      className="min-h-[150px] resize-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "voice" && (
              <div className="space-y-8 max-w-2xl">
                {/* Beta Notice */}
                <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-900/20">
                  <div className="px-2 py-0.5 text-xs font-bold rounded bg-amber-500 text-white shrink-0">
                    BETA
                  </div>
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    语音助手功能目前处于测试阶段，可能存在不稳定或识别不准确的情况。欢迎反馈问题帮助我们改进！
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-zinc-900/50">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">启用语音助手</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      并在页面右下角显示语音交互悬浮球
                    </p>
                  </div>
                  <Switch
                    checked={voiceSettings.enabled}
                    onCheckedChange={(checked) => setVoiceSettings({ ...voiceSettings, enabled: checked })}
                  />
                </div>

                {/* TTS Reader Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-zinc-900/50">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">自动语音朗读</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      接收到 AI 回复时自动进行语音播报
                    </p>
                  </div>
                  <Switch
                    checked={voiceSettings.readAloud}
                    onCheckedChange={(checked) => setVoiceSettings({ ...voiceSettings, readAloud: checked })}
                  />
                </div>

                {/* Voice Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">语音音色</Label>
                  <Select
                    value={voiceSettings.voice}
                    onValueChange={(value) => setVoiceSettings({ ...voiceSettings, voice: value })}
                    disabled={!voiceSettings.enabled}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择音色" />
                    </SelectTrigger>
                    <SelectContent>
                      {VOICE_OPTIONS.map((voice) => (
                        <SelectItem
                          key={voice.id}
                          value={voice.id}
                          className="focus:bg-green-50 focus:text-green-900 dark:focus:bg-green-900/20 dark:focus:text-green-100"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{voice.name}</span>
                            <span className="text-xs text-gray-500">({voice.id})</span>
                            <span className="text-xs text-gray-400">- {voice.desc}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    选择AI语音助手的声音风格，更改后下次对话生效
                  </p>
                </div>

                {/* Voice Info Card */}
                <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 mb-2">
                    <Mic className="w-5 h-5" />
                    <span className="font-semibold">使用提示</span>
                  </div>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                    <li>点击悬浮球开始语音对话</li>
                    <li>双击悬浮球开启/关闭智能唤醒</li>
                    <li>右键悬浮球可查看更多选项</li>
                    <li>语音对话会消耗AI配额</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "general" && (
              <div className="space-y-8 max-w-2xl">
                <div className="space-y-4">
                  <Label>界面主题</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div
                      className={cn(
                        "border-2 rounded-lg p-3 flex flex-col items-center gap-2 cursor-pointer transition-all",
                        theme === 'system'
                          ? "border-emerald-500 dark:border-blue-600 bg-emerald-50/50 dark:bg-blue-950/30"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      )}
                      onClick={() => setTheme('system')}
                    >
                      <div className="w-full aspect-video bg-gradient-to-br from-white to-zinc-900 rounded border border-gray-200 dark:border-gray-700 shadow-sm"></div>
                      <span className={cn("text-sm font-medium", theme === 'system' ? "text-emerald-700 dark:text-blue-500" : "text-gray-600 dark:text-gray-400")}>System</span>
                    </div>
                    <div
                      className={cn(
                        "border-2 rounded-lg p-3 flex flex-col items-center gap-2 cursor-pointer transition-all",
                        theme === 'light'
                          ? "border-emerald-500 dark:border-blue-600 bg-emerald-50/50 dark:bg-blue-950/30"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      )}
                      onClick={() => setTheme('light')}
                    >
                      <div className="w-full aspect-video bg-white rounded border border-gray-200 dark:border-gray-700 shadow-sm"></div>
                      <span className={cn("text-sm font-medium", theme === 'light' ? "text-emerald-700 dark:text-blue-500" : "text-gray-600 dark:text-gray-400")}>Light</span>
                    </div>
                    <div
                      className={cn(
                        "border-2 rounded-lg p-3 flex flex-col items-center gap-2 cursor-pointer transition-all",
                        theme === 'dark'
                          ? "border-emerald-500 dark:border-blue-600 bg-emerald-50/50 dark:bg-blue-950/30"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      )}
                      onClick={() => setTheme('dark')}
                    >
                      <div className="w-full aspect-video bg-zinc-900 rounded border border-gray-800 shadow-sm"></div>
                      <span className={cn("text-sm font-medium", theme === 'dark' ? "text-emerald-700 dark:text-blue-500" : "text-gray-600 dark:text-gray-400")}>Dark</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>语言 (Language)</Label>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-200 dark:border-blue-800 bg-emerald-50/30 dark:bg-blue-950/30 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Globe size={18} className="text-emerald-600 dark:text-blue-500" />
                        <span className="text-sm font-medium">中文 (简体)</span>
                      </div>
                      <CheckCircle2 size={18} className="text-emerald-600 dark:text-blue-500" />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-transparent hover:bg-gray-50 cursor-pointer opacity-60">
                      <div className="flex items-center gap-3">
                        <Globe size={18} className="text-gray-500" />
                        <span className="text-sm font-medium">English (US)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SidebarItem({ icon: Icon, label, active, onClick, badge }: { icon: any, label: string, active: boolean, onClick: () => void, badge?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left w-full",
        active
          ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-white/10"
          : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-white/5"
      )}
    >
      <Icon size={18} className={cn(active ? "text-emerald-600 dark:text-blue-500" : "text-gray-400")} />
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
          {badge}
        </span>
      )}
    </button>
  )
}

function ProviderCard({ active, onClick, icon: Icon, title, desc, badge }: { active: boolean, onClick: () => void, icon: any, title: string, desc: string, badge?: string }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative cursor-pointer rounded-xl border p-4 transition-all duration-200 hover:shadow-md",
        active
          ? "border-emerald-500 dark:border-blue-600 bg-emerald-50/30 dark:bg-blue-950/30 ring-1 ring-emerald-500/20 dark:ring-blue-600/20"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-zinc-900"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={cn("p-2 rounded-lg", active ? "bg-emerald-100 dark:bg-blue-900/50 text-emerald-600 dark:text-blue-500" : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400")}>
          <Icon size={20} />
        </div>
        <div className="flex flex-col items-end gap-1">
          {badge && <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">{badge}</span>}
          {active && <CheckCircle2 size={18} className="text-emerald-500 dark:text-blue-500" />}
        </div>
      </div>
      <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-0.5">{title}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{desc}</div>
    </div>
  )
}
