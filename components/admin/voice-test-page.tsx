"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Card,
  Typography,
  Space,
  Button,
  Input,
  InputNumber,
  Select,
  Tag,
  Alert,
  Divider,
  Statistic,
  Row,
  Col,
  Popconfirm,
  Segmented,
  message,
} from "antd"
import { toast } from "sonner"
import { convertBlobToWav } from "@/lib/voice/voice-utils"
import { IconCheckOne, IconCloseOne, IconDelete, IconExperiment, IconKey, IconLock, IconMicrophone, IconMinus, IconPause, IconPlayOne, IconPlus, IconPreviewClose, IconRefresh, IconSave, IconSetting, IconThunderbolt, IconVolumeNotice } from "@/components/icon";

const { Text, Title, Paragraph } = Typography

// ---- 配置类型 ----
interface TtsVoiceOption {
  value: string
  label: string
}

interface TtsApiConfig {
  providerType: "dashscope" | "unifiedtts" | "openai" | "baidu" | "custom"
  endpoint: string
  model: string
  defaultVoice: string
  voices: TtsVoiceOption[]
  audioFormat: "mp3" | "wav" | "pcm"
  sampleRate: number
}

interface AsrApiConfig {
  providerType: "dashscope" | "baidu" | "openai" | "custom" | "browser"
  endpoint: string
  model: string
  defaultLanguage: string
  defaultDialect: string
  // 实时 ASR（asrMode=realtime 时使用）
  realtimeEndpoint?: string
  realtimeModel?: string
  format?: string
  sampleRate?: number
  maxSentenceSilence?: number
}

interface OmniApiConfig {
  endpoint: string
  model: string
  voice: string
}

interface VoiceConfig {
  architecture: "cascade" | "omni"
  asrMode?: "batch" | "realtime"
  providerId: string | null
  tts: TtsApiConfig
  asr: AsrApiConfig
  omni: OmniApiConfig
  vad: {
    silenceThreshold: number
    silenceDurationMs: number
    speechStartMs: number
    maxSegmentMs: number
    minSpeechMs: number
    adaptiveNoiseFloor: boolean
  }
  readAloud: boolean
  apiKeyConfigured: boolean
  providerName: string | null
}

/** API Key 脱敏状态 */
interface KeyStatus {
  configured: boolean
  masked: string
}

interface TestResult {
  success: boolean
  duration: number
  error?: string
  data?: unknown
}

const AUDIO_FORMAT_OPTIONS = [
  { value: "mp3", label: "MP3" },
  { value: "wav", label: "WAV" },
  { value: "pcm", label: "PCM" },
]

const TTS_PROVIDER_OPTIONS = [
  { value: "dashscope", label: "DashScope（阿里云 qwen-tts/cosyvoice）" },
  { value: "unifiedtts", label: "UnifiedTTS（聚合平台，支持多模型）" },
  { value: "openai", label: "OpenAI 兼容（tts-1/tts-1-hd）" },
  { value: "baidu", label: "百度语音 TTS" },
  { value: "custom", label: "自定义（DashScope 兼容格式）" },
]

const ASR_PROVIDER_OPTIONS = [
  { value: "browser", label: "浏览器原生（免费、零延迟，推荐 Edge）" },
  { value: "dashscope", label: "DashScope（阿里云 Qwen3-ASR-Flash）" },
  { value: "baidu", label: "百度短语音识别" },
  { value: "openai", label: "OpenAI Whisper 兼容" },
  { value: "custom", label: "自定义（OpenAI 兼容格式）" },
]

export function VoiceTestPage() {
  const [config, setConfig] = useState<VoiceConfig | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)

  // TTS 测试
  const [ttsText, setTtsText] = useState("你好，我是莓小智，很高兴为你服务。")
  const [ttsVoice, setTtsVoice] = useState<string>("")
  const [ttsLoading, setTtsLoading] = useState(false)
  const [ttsResult, setTtsResult] = useState<TestResult | null>(null)
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null)

  // ASR 测试
  const [asrRecording, setAsrRecording] = useState(false)
  const [asrLoading, setAsrLoading] = useState(false)
  const [asrResult, setAsrResult] = useState<TestResult | null>(null)
  const [asrTranscript, setAsrTranscript] = useState("")
  const asrMediaRecorderRef = useRef<MediaRecorder | null>(null)
  const asrChunksRef = useRef<Blob[]>([])

  // UnifiedTTS 动态模型/音色列表
  const [unifiedModels, setUnifiedModels] = useState<string[]>([])
  const [unifiedVoices, setUnifiedVoices] = useState<TtsVoiceOption[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [loadingVoices, setLoadingVoices] = useState(false)

  // 独立 API Key 管理
  const [ttsKeyStatus, setTtsKeyStatus] = useState<KeyStatus>({ configured: false, masked: "" })
  const [asrKeyStatus, setAsrKeyStatus] = useState<KeyStatus>({ configured: false, masked: "" })
  const [omniKeyStatus, setOmniKeyStatus] = useState<KeyStatus>({ configured: false, masked: "" })
  const [ttsKeyInput, setTtsKeyInput] = useState("")
  const [asrKeyInput, setAsrKeyInput] = useState("")
  const [omniKeyInput, setOmniKeyInput] = useState("")
  const [savingTtsKey, setSavingTtsKey] = useState(false)
  const [savingAsrKey, setSavingAsrKey] = useState(false)
  const [savingOmniKey, setSavingOmniKey] = useState(false)

  /** 加载 UnifiedTTS 模型列表 */
  const fetchUnifiedModels = useCallback(async () => {
    try {
      setLoadingModels(true)
      const res = await fetch("/api/ai/tts/models")
      const data = await res.json()
      if (data.success) setUnifiedModels(data.models)
    } catch {
      toast.error("加载模型列表失败")
    } finally {
      setLoadingModels(false)
    }
  }, [])

  /** 加载 UnifiedTTS 指定模型的音色列表 */
  const fetchUnifiedVoices = useCallback(async (model: string) => {
    if (!model) return
    try {
      setLoadingVoices(true)
      const res = await fetch(`/api/ai/tts/voices?model=${encodeURIComponent(model)}`)
      const data = await res.json()
      if (data.success && data.voices.length > 0) {
        setUnifiedVoices(data.voices)
        // 自动设置第一个音色为默认
        if (config && data.voices[0]?.value) {
          setConfig({
            ...config,
            tts: { ...config.tts, voices: data.voices, defaultVoice: data.voices[0].value },
          })
        }
      }
    } catch {
      toast.error("加载音色列表失败")
    } finally {
      setLoadingVoices(false)
    }
  }, [config])

  /** TTS providerType 切换时自动加载模型/音色 */
  const handleTtsProviderChange = (providerType: TtsApiConfig["providerType"]) => {
    if (!config) return
    const updated = { ...config, tts: { ...config.tts, providerType } }
    setConfig(updated)
    // UnifiedTTS: 自动加载模型列表
    if (providerType === "unifiedtts") {
      fetchUnifiedModels()
      setUnifiedVoices([])
    } else {
      setUnifiedModels([])
      setUnifiedVoices([])
    }
  }

  /** UnifiedTTS 模型切换时自动加载音色列表 */
  const handleUnifiedModelChange = (model: string) => {
    if (!config) return
    setConfig({ ...config, tts: { ...config.tts, model } })
    fetchUnifiedVoices(model)
  }

  const fetchConfig = useCallback(async () => {
    try {
      setLoadingConfig(true)
      const [cfgRes, keysRes] = await Promise.all([
        fetch("/api/admin/settings/voice"),
        fetch("/api/admin/settings/voice/keys"),
      ])
      if (cfgRes.ok) {
        const data = await cfgRes.json()
        setConfig(data)
        setTtsVoice(data.tts.defaultVoice)
      }
      if (keysRes.ok) {
        const keys = await keysRes.json()
        setTtsKeyStatus(keys.tts || { configured: false, masked: "" })
        setAsrKeyStatus(keys.asr || { configured: false, masked: "" })
        setOmniKeyStatus(keys.omni || { configured: false, masked: "" })
      }
    } catch {
      toast.error("加载配置失败")
    } finally {
      setLoadingConfig(false)
    }
  }, [])

  /** 保存 TTS 独立 API Key */
  const saveTtsKey = async () => {
    if (!ttsKeyInput.trim()) {
      toast.warning("请输入 API Key")
      return
    }
    try {
      setSavingTtsKey(true)
      const res = await fetch("/api/admin/settings/voice/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "tts", apiKey: ttsKeyInput.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "保存失败")
      }
      const data = await res.json()
      setTtsKeyStatus({ configured: data.configured, masked: data.masked })
      setTtsKeyInput("")
      toast.success("TTS API Key 已保存（加密存储）")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败")
    } finally {
      setSavingTtsKey(false)
    }
  }

  /** 保存 ASR 独立 API Key */
  const saveAsrKey = async () => {
    if (!asrKeyInput.trim()) {
      toast.warning("请输入 API Key")
      return
    }
    try {
      setSavingAsrKey(true)
      const res = await fetch("/api/admin/settings/voice/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "asr", apiKey: asrKeyInput.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "保存失败")
      }
      const data = await res.json()
      setAsrKeyStatus({ configured: data.configured, masked: data.masked })
      setAsrKeyInput("")
      toast.success("ASR API Key 已保存（加密存储）")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败")
    } finally {
      setSavingAsrKey(false)
    }
  }

  /** 保存 Omni 独立 API Key */
  const saveOmniKey = async () => {
    if (!omniKeyInput.trim()) {
      toast.warning("请输入 API Key")
      return
    }
    try {
      setSavingOmniKey(true)
      const res = await fetch("/api/admin/settings/voice/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "omni", apiKey: omniKeyInput.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "保存失败")
      }
      const data = await res.json()
      setOmniKeyStatus({ configured: data.configured, masked: data.masked })
      setOmniKeyInput("")
      toast.success("Omni API Key 已保存（加密存储）")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败")
    } finally {
      setSavingOmniKey(false)
    }
  }

  /** 清除指定 API Key */
  const clearKey = async (scope: "tts" | "asr" | "omni") => {
    try {
      const res = await fetch(`/api/admin/settings/voice/keys?scope=${scope}`, { method: "DELETE" })
      if (!res.ok) throw new Error("清除失败")
      if (scope === "tts") setTtsKeyStatus({ configured: false, masked: "" })
      else if (scope === "asr") setAsrKeyStatus({ configured: false, masked: "" })
      else setOmniKeyStatus({ configured: false, masked: "" })
      toast.success(`${scope.toUpperCase()} API Key 已清除`)
    } catch {
      toast.error("清除失败")
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  // ===== 保存 TTS/ASR 设置（PATCH 部分更新） =====
  const saveTtsAsrSettings = async () => {
    if (!config) return
    try {
      setSavingSettings(true)
      const res = await fetch("/api/admin/settings/voice", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tts: config.tts,
          asr: config.asr,
          omni: config.omni,
          asrMode: config.asrMode ?? "batch",
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "保存失败")
      }
      toast.success("TTS/ASR 参数已保存")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败")
    } finally {
      setSavingSettings(false)
    }
  }

  /** 切换 ASR 工作模式（batch 批量 / realtime 实时流式），立即 PATCH 保存 */
  const handleAsrModeChange = async (value: "batch" | "realtime") => {
    if (!config || config.asrMode === value) return
    const prev = config.asrMode ?? "batch"
    setConfig({ ...config, asrMode: value })
    try {
      const res = await fetch("/api/admin/settings/voice", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asrMode: value }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "保存失败")
      }
      toast.success(`ASR 已切换到${value === "batch" ? "批量模式" : "实时流式模式"}`)
    } catch (err) {
      // 回滚
      setConfig({ ...config, asrMode: prev })
      toast.error(err instanceof Error ? err.message : "切换 ASR 模式失败")
    }
  }

  const updateTts = (patch: Partial<TtsApiConfig>) => {
    if (!config) return
    setConfig({ ...config, tts: { ...config.tts, ...patch } })
  }
  const updateAsr = (patch: Partial<AsrApiConfig>) => {
    if (!config) return
    setConfig({ ...config, asr: { ...config.asr, ...patch } })
  }
  const updateOmni = (patch: Partial<OmniApiConfig>) => {
    if (!config) return
    setConfig({ ...config, omni: { ...config.omni, ...patch } })
  }
  const updateVoice = (idx: number, patch: Partial<TtsVoiceOption>) => {
    if (!config) return
    const voices = config.tts.voices.map((v, i) => (i === idx ? { ...v, ...patch } : v))
    setConfig({ ...config, tts: { ...config.tts, voices } })
  }
  const addVoice = () => {
    if (!config) return
    setConfig({
      ...config,
      tts: { ...config.tts, voices: [...config.tts.voices, { value: "", label: "" }] },
    })
  }
  const removeVoice = (idx: number) => {
    if (!config) return
    setConfig({
      ...config,
      tts: { ...config.tts, voices: config.tts.voices.filter((_, i) => i !== idx) },
    })
  }

  // ===== TTS 测试 =====
  const testTts = async () => {
    if (!ttsText.trim()) {
      toast.warning("请输入测试文本")
      return
    }
    setTtsLoading(true)
    setTtsResult(null)
    const start = Date.now()
    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ttsText, voice: ttsVoice }),
      })
      const duration = Date.now() - start
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      if (ttsAudioRef.current) {
        ttsAudioRef.current.src = url
        ttsAudioRef.current.play().catch(() => {})
      }
      setTtsResult({ success: true, duration, data: { size: blob.size, url } })
      toast.success(`TTS 合成成功（${duration}ms，${(blob.size / 1024).toFixed(1)}KB）`)
    } catch (err) {
      setTtsResult({ success: false, duration: Date.now() - start, error: err instanceof Error ? err.message : "未知错误" })
      toast.error("TTS 测试失败")
    } finally {
      setTtsLoading(false)
    }
  }

  // ===== ASR 录音与测试 =====
  // 浏览器原生 SpeechRecognition 引用（browser 模式）
  const browserRecogRef = useRef<any>(null)

  const startAsrRecording = async () => {
    const provider = config?.asr.providerType

    // 浏览器原生模式：直接用 SpeechRecognition，无需录音/上传
    if (provider === "browser") {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SR) {
        toast.error("浏览器不支持原生语音识别，请使用 Edge/Chrome")
        return
      }
      const recognition = new SR()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = config?.asr.defaultLanguage === "en-US" ? "en-US" : "zh-CN"

      setAsrRecording(true)
      setAsrTranscript("")
      setAsrResult(null)
      const start = Date.now()

      recognition.onresult = (event: any) => {
        const last = event.results[event.results.length - 1]
        const text = last[0].transcript
        setAsrTranscript(text)
        if (last.isFinal) {
          const duration = Date.now() - start
          setAsrResult({ success: true, duration, data: { transcript: text, provider: "browser" } })
          toast.success(`识别成功（${duration}ms）`)
        }
      }
      recognition.onerror = (event: any) => {
        const errMap: Record<string, string> = {
          "no-speech": "未检测到语音",
          "not-allowed": "麦克风权限被拒绝",
          "network": "网络错误（Chrome 国内可能无法访问 Google 语音服务，建议使用 Edge）",
        }
        const msg = errMap[event.error] || `识别失败: ${event.error}`
        setAsrResult({ success: false, duration: Date.now() - start, error: msg })
        toast.error(msg)
      }
      recognition.onend = () => {
        setAsrRecording(false)
      }
      browserRecogRef.current = recognition
      recognition.start()
      toast.info("开始录音，请说话...")
      return
    }

    // 服务器 ASR 模式：录音 → 上传
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      asrChunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) asrChunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        await sendAsrRequest()
      }
      recorder.start()
      asrMediaRecorderRef.current = recorder
      setAsrRecording(true)
      toast.info("开始录音，请说话...")
    } catch {
      toast.error("无法访问麦克风")
    }
  }

  const stopAsrRecording = () => {
    // 停止浏览器原生识别
    if (browserRecogRef.current) {
      try { browserRecogRef.current.stop() } catch { /* ignore */ }
      browserRecogRef.current = null
      setAsrRecording(false)
      return
    }
    if (asrMediaRecorderRef.current && asrRecording) {
      asrMediaRecorderRef.current.stop()
      setAsrRecording(false)
    }
  }

  const sendAsrRequest = async () => {
    setAsrLoading(true)
    setAsrResult(null)
    setAsrTranscript("")
    const start = Date.now()
    try {
      // 直接使用 webm 压缩格式上传（体积仅 WAV 的 1/10，大幅提速）
      const webmBlob = new Blob(asrChunksRef.current, { type: "audio/webm" })
      const tryUpload = async (blob: Blob, ext: string) => {
        const formData = new FormData()
        formData.append("audio", blob, `test.${ext}`)
        formData.append("language", config?.asr.defaultLanguage || "zh-CN")
        formData.append("dialect", config?.asr.defaultDialect || "auto")
        const res = await fetch("/api/speech/recognize", {
          method: "POST",
          body: formData,
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || `HTTP ${res.status}`)
        }
        return data
      }

      let data
      try {
        data = await tryUpload(webmBlob, "webm")
      } catch (firstErr) {
        // 格式不支持时回退转 WAV 重试
        const errMsg = firstErr instanceof Error ? firstErr.message : ""
        if (errMsg.includes("格式不支持") || errMsg.includes("format") || errMsg.includes("InvalidParameter")) {
          console.warn("webm 格式不被支持，回退转 WAV 重试...")
          const wavBlob = await convertBlobToWav(webmBlob)
          data = await tryUpload(wavBlob, "wav")
        } else {
          throw firstErr
        }
      }

      const duration = Date.now() - start
      setAsrTranscript(data.transcript || "")
      setAsrResult({ success: true, duration, data })
      toast.success(`识别成功（${duration}ms）`)
    } catch (err) {
      setAsrResult({ success: false, duration: Date.now() - start, error: err instanceof Error ? err.message : "未知错误" })
      toast.error("ASR 识别失败")
    } finally {
      setAsrLoading(false)
    }
  }

  if (loadingConfig) return <div>加载语音配置中...</div>
  if (!config) return <Alert message="配置加载失败，请先在系统设置中配置语音参数" type="error" />

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 隐藏的音频播放器 */}
      <audio ref={ttsAudioRef} controls style={{ display: "none" }} />

      {/* ===== API Key 安全设置 ===== */}
      <Card
        style={{ border: "1px solid #EDEEEF" }}
        title={
          <Space>
            <IconKey style={{ color: "#1677ff" }} />
            <span>API Key 安全设置</span>
            <Tag icon={<IconLock />} color="green">AES-256-GCM 加密</Tag>
          </Space>
        }
        extra={
          <Text type="secondary" style={{ fontSize: 12 }}>
            <IconLock /> 独立存储 · 不回显明文
          </Text>
        }
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="语音模块 API Key 安全策略"
          description={
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
              <li>TTS 和 ASR 可各自配置独立 API Key，与 AI 助理的共享 Key 隔离</li>
              <li>独立 Key 优先使用；若未配置则回退到 AI 提供商共享 Key</li>
              <li>Key 使用 AES-256-GCM 加密后存储，GET 接口仅返回脱敏值（如 sk-a***z9k2）</li>
              <li>明文仅在后端调用 TTS/ASR API 时解密，不会出现在日志或响应中</li>
            </ul>
          }
        />

        <Row gutter={24}>
          {/* TTS API Key */}
          <Col span={12}>
            <Card type="inner" title={<Space><IconVolumeNotice /> TTS API Key</Space>} size="small">
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>当前状态：</Text>
                {ttsKeyStatus.configured ? (
                  <Tag icon={<IconCheckOne />} color="success">
                    已配置 · {ttsKeyStatus.masked}
                  </Tag>
                ) : (
                  <Tag icon={<IconCloseOne />} color="default">
                    未配置（使用共享 Key）
                  </Tag>
                )}
              </div>
              <Input.Password
                placeholder="输入 TTS API Key（明文，保存后加密）"
                value={ttsKeyInput}
                onChange={(e) => setTtsKeyInput(e.target.value)}
                prefix={<IconKey style={{ color: "#999" }} />}
                iconRender={(visible) => (visible ? <IconPreviewClose /> : <IconLock />)}
              />
              <Space style={{ marginTop: 8 }}>
                <Button
                  type="primary"
                  icon={<IconSave />}
                  loading={savingTtsKey}
                  onClick={saveTtsKey}
                  disabled={!ttsKeyInput.trim()}
                  size="small"
                >
                  保存 Key
                </Button>
                {ttsKeyStatus.configured && (
                  <Popconfirm
                    title="确定清除 TTS API Key？"
                    description="清除后将回退到 AI 提供商共享 Key"
                    onConfirm={() => clearKey("tts")}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button danger icon={<IconDelete />} size="small">清除</Button>
                  </Popconfirm>
                )}
              </Space>
            </Card>
          </Col>

          {/* ASR API Key */}
          <Col span={12}>
            <Card type="inner" title={<Space><IconMicrophone /> ASR API Key</Space>} size="small">
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>当前状态：</Text>
                {asrKeyStatus.configured ? (
                  <Tag icon={<IconCheckOne />} color="success">
                    已配置 · {asrKeyStatus.masked}
                  </Tag>
                ) : (
                  <Tag icon={<IconCloseOne />} color="default">
                    未配置（使用共享 Key）
                  </Tag>
                )}
              </div>
              <Input.Password
                placeholder="输入 ASR API Key（明文，保存后加密）"
                value={asrKeyInput}
                onChange={(e) => setAsrKeyInput(e.target.value)}
                prefix={<IconKey style={{ color: "#999" }} />}
                iconRender={(visible) => (visible ? <IconPreviewClose /> : <IconLock />)}
              />
              <Space style={{ marginTop: 8 }}>
                <Button
                  type="primary"
                  icon={<IconSave />}
                  loading={savingAsrKey}
                  onClick={saveAsrKey}
                  disabled={!asrKeyInput.trim()}
                  size="small"
                >
                  保存 Key
                </Button>
                {asrKeyStatus.configured && (
                  <Popconfirm
                    title="确定清除 ASR API Key？"
                    description="清除后将回退到 AI 提供商共享 Key"
                    onConfirm={() => clearKey("asr")}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button danger icon={<IconDelete />} size="small">清除</Button>
                  </Popconfirm>
                )}
              </Space>
            </Card>
          </Col>
        </Row>

        <Divider style={{ margin: "16px 0 8px" }} />
        <Text type="secondary" style={{ fontSize: 11 }}>
          <IconLock /> 安全说明：API Key 在服务器端使用 AES-256-GCM 算法加密存储，
          加密密钥由环境变量 VOICE_KEY_ENCRYPTION_SECRET 派生。生产环境请务必设置该环境变量。
        </Text>
      </Card>

      {/* ===== 配置概览 ===== */}
      <Card
        style={{ border: "1px solid #EDEEEF" }}
        title={
          <Space>
            <IconExperiment style={{ color: "#1677ff" }} />
            <span>语音助手测试台</span>
          </Space>
        }
        extra={
          <Button icon={<IconRefresh />} onClick={fetchConfig} size="small">刷新配置</Button>
        }
      >
        <Row gutter={16} align="middle">
          <Col span={6}>
            <div style={{ marginBottom: 4 }}>
              <Typography.Text type="secondary" style={{ fontSize: 14 }}>语音架构</Typography.Text>
            </div>
            <Tag color="purple">Omni（端到端）</Tag>
          </Col>
          <Col span={6}>
            <Statistic title="TTS 模型" value={config.tts.model} />
          </Col>
          <Col span={6}>
            <Statistic title="ASR 模型" value={config.asr.model} />
          </Col>
          <Col span={6}>
            <Statistic title="默认音色" value={config.tts.defaultVoice} />
          </Col>
        </Row>
        <Divider style={{ margin: "12px 0" }} />
        <Space wrap>
          <Tag icon={config.apiKeyConfigured ? <IconCheckOne /> : <IconCloseOne />} color={config.apiKeyConfigured ? "success" : "error"}>
            API Key {config.apiKeyConfigured ? "已就绪" : "未配置"}
          </Tag>
          {config.providerName && <Tag color="blue">来源: {config.providerName}</Tag>}
          <Tag color="cyan">TTS: {config.tts.endpoint.split("//")[1]?.split("/")[0]}</Tag>
          <Tag color="geekblue">ASR: {config.asr.endpoint.split("//")[1]?.split("/")[0]}</Tag>
          <Tag color={config.readAloud ? "green" : "default"}>朗读: {config.readAloud ? "开启" : "关闭"}</Tag>
        </Space>
      </Card>

      {/* ===== TTS API 设置 ===== */}
      <Card
        style={{ border: "1px solid #EDEEEF" }}
        title={
          <Space>
            <IconSetting style={{ color: "#1677ff" }} />
            <span>TTS 朗读音色 API 设置</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<IconSave />}
            loading={savingSettings}
            onClick={saveTtsAsrSettings}
            size="small"
          >
            保存参数
          </Button>
        }
      >
        <Paragraph type="secondary" style={{ fontSize: 12 }}>
          配置 TTS 专用端点、模型、音色列表。API Key 由 AI 提供商统一管理（见系统设置）。
          选择 UnifiedTTS 可动态加载模型与音色列表。
        </Paragraph>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <Text>提供商类型（请求格式）</Text>
            <Select
              value={config.tts.providerType}
              onChange={handleTtsProviderChange}
              options={TTS_PROVIDER_OPTIONS}
              style={{ width: "100%", marginTop: 4 }}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <Text>API 端点</Text>
            <Input
              value={config.tts.endpoint}
              onChange={(e) => updateTts({ endpoint: e.target.value })}
              placeholder="https://..."
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <Text>模型名</Text>
            {config.tts.providerType === "unifiedtts" && unifiedModels.length > 0 ? (
              <Select
                value={config.tts.model}
                onChange={handleUnifiedModelChange}
                options={unifiedModels.map((m) => ({ value: m, label: m }))}
                loading={loadingModels}
                style={{ width: "100%", marginTop: 4 }}
                placeholder="选择模型"
              />
            ) : (
              <Input
                value={config.tts.model}
                onChange={(e) => updateTts({ model: e.target.value })}
                placeholder={config.tts.providerType === "unifiedtts" ? "点击右侧按钮加载模型列表" : "qwen3-tts-flash"}
                style={{ marginTop: 4 }}
              />
            )}
            {config.tts.providerType === "unifiedtts" && (
              <Button size="small" type="link" onClick={fetchUnifiedModels} loading={loadingModels} style={{ padding: 0, marginTop: 4 }}>
                刷新模型列表
              </Button>
            )}
          </div>
          <div>
            <Text>音频格式</Text>
            <Select
              value={config.tts.audioFormat}
              onChange={(v) => updateTts({ audioFormat: v })}
              options={AUDIO_FORMAT_OPTIONS}
              style={{ width: "100%", marginTop: 4 }}
            />
          </div>
          <div>
            <Text>采样率 (Hz)</Text>
            <InputNumber
              value={config.tts.sampleRate}
              onChange={(v) => updateTts({ sampleRate: v ?? 24000 })}
              min={8000}
              max={48000}
              step={1000}
              style={{ width: "100%", marginTop: 4 }}
            />
          </div>
          <div>
            <Text>默认音色</Text>
            {config.tts.providerType === "unifiedtts" && unifiedVoices.length > 0 ? (
              <Select
                value={config.tts.defaultVoice}
                onChange={(v) => updateTts({ defaultVoice: v })}
                options={unifiedVoices}
                loading={loadingVoices}
                style={{ width: "100%", marginTop: 4 }}
                placeholder="选择音色"
              />
            ) : (
              <Select
                value={config.tts.defaultVoice}
                onChange={(v) => updateTts({ defaultVoice: v })}
                options={config.tts.voices.filter((v) => v.value)}
                style={{ width: "100%", marginTop: 4 }}
              />
            )}
          </div>
        </div>

        {/* 音色列表管理（非 UnifiedTTS 模式手动管理；UnifiedTTS 模式从 API 加载） */}
        {config.tts.providerType !== "unifiedtts" && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text strong>可选音色列表</Text>
              <Button size="small" icon={<IconPlus />} onClick={addVoice}>添加音色</Button>
            </div>
            {config.tts.voices.map((v, i) => (
              <Space key={i} style={{ display: "flex", marginBottom: 8 }} align="center">
                <Input
                  placeholder="音色 ID（如 Cherry）"
                  value={v.value}
                  onChange={(e) => updateVoice(i, { value: e.target.value })}
                  style={{ width: 180 }}
                />
                <Input
                  placeholder="显示名（如 Cherry·女声温婉）"
                  value={v.label}
                  onChange={(e) => updateVoice(i, { label: e.target.value })}
                  style={{ width: 240 }}
                />
                <Button
                  type="text"
                  danger
                  icon={<IconMinus />}
                  onClick={() => removeVoice(i)}
                  disabled={config.tts.voices.length <= 1}
                />
              </Space>
            ))}
          </div>
        )}
        {config.tts.providerType === "unifiedtts" && unifiedVoices.length > 0 && (
          <Alert
            type="info"
            showIcon
            style={{ marginTop: 8 }}
            message={`已从 UnifiedTTS 加载 ${unifiedVoices.length} 个音色`}
            description="音色列表由 API 动态加载，切换模型时会自动刷新。保存配置后这些音色将持久化。"
          />
        )}
      </Card>

      {/* ===== TTS 测试 ===== */}
      <Card
        style={{ border: "1px solid #EDEEEF" }}
        title={
          <Space>
            <IconVolumeNotice style={{ color: "#1677ff" }} />
            <span>TTS 合成测试</span>
          </Space>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <Text>测试文本</Text>
            <Input.TextArea
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
              rows={3}
              placeholder="输入要合成的文本..."
              style={{ marginTop: 4 }}
            />
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <Text>音色</Text>
              <Select
                value={ttsVoice}
                onChange={setTtsVoice}
                options={config.tts.voices}
                style={{ width: "100%", marginTop: 4 }}
              />
            </div>
            <Button
              type="primary"
              icon={<IconPlayOne />}
              loading={ttsLoading}
              onClick={testTts}
              size="large"
              style={{ marginTop: 20 }}
            >
              合成语音
            </Button>
          </div>

          {ttsResult && (
            <Alert
              type={ttsResult.success ? "success" : "error"}
              showIcon
              message={ttsResult.success ? `合成成功 · 耗时 ${ttsResult.duration}ms` : `合成失败 · ${ttsResult.error}`}
              description={
                ttsResult.success && ttsResult.data ? (
                  <Space direction="vertical" size={4}>
                    <Text>音频大小: {((ttsResult.data as { size: number }).size / 1024).toFixed(1)} KB</Text>
                    <audio controls src={(ttsResult.data as { url: string }).url} style={{ width: "100%", marginTop: 8 }} />
                  </Space>
                ) : undefined
              }
            />
          )}
        </div>
      </Card>

      {/* ===== ASR API 设置 ===== */}
      <Card
        style={{ border: "1px solid #EDEEEF" }}
        title={
          <Space>
            <IconSetting style={{ color: "#1677ff" }} />
            <span>ASR 语音识别 API 设置</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<IconSave />}
            loading={savingSettings}
            onClick={saveTtsAsrSettings}
            size="small"
          >
            保存参数
          </Button>
        }
      >
        <Paragraph type="secondary" style={{ fontSize: 12 }}>
          配置 ASR 专用端点、模型、语言。API Key 由 AI 提供商统一管理。
          百度 ASR 使用 JSON base64 上传，dev_pid 自动按语言映射。
        </Paragraph>

        {/* ASR 工作模式切换：batch 批量 / realtime 实时流式 */}
        <div style={{ marginBottom: 16, padding: "12px 16px", background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <Text strong>ASR 工作模式</Text>
              <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
                {config.asrMode === "realtime"
                  ? "实时流式：WebSocket 边说边出字，低延迟（需 DashScope）"
                  : "批量模式：录音后一次性 HTTP 识别，兼容所有 providerType"}
              </div>
            </div>
            <Segmented
              value={config.asrMode ?? "batch"}
              onChange={(v) => handleAsrModeChange(v as "batch" | "realtime")}
              options={[
                { label: "批量", value: "batch" },
                { label: "实时", value: "realtime" },
              ]}
            />
          </div>
          {config.asrMode === "realtime" && (
            <div style={{ marginTop: 8, padding: "8px 12px", background: "#e6f4ff", border: "1px solid #91caff", borderRadius: 6, fontSize: 12, color: "#1677ff" }}>
              实时流式模式通过 WebSocket 边说边出字，显著降低首字延迟。仅支持 DashScope ASR 模型（如 qwen-audio-3.0-asr-flash-streaming），需启动 ws-server.js 代理。
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <Text>提供商类型（请求格式）</Text>
            <Select
              value={config.asr.providerType}
              onChange={(v) => updateAsr({ providerType: v })}
              options={ASR_PROVIDER_OPTIONS}
              style={{ width: "100%", marginTop: 4 }}
            />
            {config.asr.providerType === "browser" && (
              <div style={{ marginTop: 4, padding: "8px 12px", background: "#f6ffed", border: "1px solid #b7eb8f", borderRadius: 6, fontSize: 12, color: "#52c41a" }}>
                浏览器原生模式：无需 API 端点/模型，直接使用浏览器内置 SpeechRecognition。推荐 Edge 浏览器（中文识别质量好且国内可用）。
              </div>
            )}
          </div>
          {config.asr.providerType !== "browser" && (
            <>
              <div style={{ gridColumn: "1 / -1" }}>
                <Text>API 端点（批量 HTTP 模式）</Text>
                <Input
                  value={config.asr.endpoint}
                  onChange={(e) => updateAsr({ endpoint: e.target.value })}
                  placeholder={config.asr.providerType === "baidu" ? "http://vop.baidu.com/server_api" : "https://..."}
                  style={{ marginTop: 4 }}
                />
              </div>
              <div>
                <Text>模型名（批量 HTTP 模式）</Text>
                <Input
                  value={config.asr.model}
                  onChange={(e) => updateAsr({ model: e.target.value })}
                  placeholder="qwen3-asr-flash"
                  style={{ marginTop: 4 }}
                />
              </div>
            </>
          )}

          {/* 实时 ASR 配置（仅 asrMode=realtime 时显示） */}
          {config.asrMode === "realtime" && config.asr.providerType !== "browser" && (
            <>
              <div style={{ gridColumn: "1 / -1", marginTop: 4, paddingTop: 12, borderTop: "1px dashed #f0f0f0" }}>
                <Text strong style={{ color: "#1677ff" }}>实时流式 ASR 配置（WebSocket）</Text>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <Text>实时 ASR WebSocket 端点</Text>
                <Input
                  value={config.asr.realtimeEndpoint ?? ""}
                  onChange={(e) => updateAsr({ realtimeEndpoint: e.target.value })}
                  placeholder="wss://dashscope.aliyuncs.com/api-ws/v1/inference"
                  style={{ marginTop: 4 }}
                />
              </div>
              <div>
                <Text>实时 ASR 模型名</Text>
                <Input
                  value={config.asr.realtimeModel ?? ""}
                  onChange={(e) => updateAsr({ realtimeModel: e.target.value })}
                  placeholder="qwen-audio-3.0-asr-flash-streaming"
                  style={{ marginTop: 4 }}
                />
              </div>
              <div>
                <Text>音频格式</Text>
                <Select
                  value={config.asr.format ?? "pcm"}
                  onChange={(v) => updateAsr({ format: v })}
                  options={[
                    { value: "pcm", label: "PCM（推荐）" },
                    { value: "wav", label: "WAV" },
                    { value: "opus", label: "Opus" },
                    { value: "mp3", label: "MP3" },
                  ]}
                  style={{ width: "100%", marginTop: 4 }}
                />
              </div>
              <div>
                <Text>采样率（Hz）</Text>
                <InputNumber
                  value={config.asr.sampleRate ?? 16000}
                  onChange={(v) => updateAsr({ sampleRate: v ?? 16000 })}
                  min={8000}
                  max={48000}
                  step={1000}
                  style={{ width: "100%", marginTop: 4 }}
                />
              </div>
              <div>
                <Text>VAD 断句静音阈值（毫秒）</Text>
                <InputNumber
                  value={config.asr.maxSentenceSilence ?? 500}
                  onChange={(v) => updateAsr({ maxSentenceSilence: v ?? 500 })}
                  min={300}
                  max={5000}
                  step={100}
                  style={{ width: "100%", marginTop: 4 }}
                />
                <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
                  对话场景推荐 400-600ms（阿里云官方推荐 400）
                </div>
              </div>
            </>
          )}

          <div>
            <Text>默认语言</Text>
            <Input
              value={config.asr.defaultLanguage}
              onChange={(e) => updateAsr({ defaultLanguage: e.target.value })}
              placeholder="zh-CN"
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <Text>默认方言</Text>
            <Input
              value={config.asr.defaultDialect}
              onChange={(e) => updateAsr({ defaultDialect: e.target.value })}
              placeholder="auto"
              style={{ marginTop: 4 }}
            />
          </div>
        </div>
      </Card>

      {/* ===== ASR 测试 ===== */}
      <Card
        style={{ border: "1px solid #EDEEEF" }}
        title={
          <Space>
            <IconMicrophone style={{ color: "#1677ff" }} />
            <span>ASR 语音识别测试</span>
          </Space>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Paragraph type="secondary" style={{ fontSize: 12 }}>
            点击录音按钮，对着麦克风说话，停止后自动发送到 ASR 接口识别。模型: {config.asr.model} · 语言: {config.asr.defaultLanguage}
          </Paragraph>
          <Space>
            {!asrRecording ? (
              <Button
                type="primary"
                danger
                icon={<IconMicrophone />}
                onClick={startAsrRecording}
                disabled={asrLoading}
                size="large"
              >
                开始录音
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<IconPause />}
                onClick={stopAsrRecording}
                size="large"
              >
                停止录音
              </Button>
            )}
            {asrLoading && <Text type="secondary">识别中...</Text>}
          </Space>

          {asrRecording && (
            <Alert
              type="warning"
              message="正在录音..."
              description="请对着麦克风说话，说完后点击「停止录音」"
              showIcon
              icon={<IconMicrophone style={{ color: "#ff4d4f" }} />}
            />
          )}

          {asrTranscript && (
            <Card type="inner" title="识别结果" size="small">
              <Paragraph style={{ margin: 0, fontSize: 16 }}>{asrTranscript}</Paragraph>
            </Card>
          )}

          {asrResult && (
            <Alert
              type={asrResult.success ? "success" : "error"}
              showIcon
              message={asrResult.success ? `识别成功 · 耗时 ${asrResult.duration}ms` : `识别失败 · ${asrResult.error}`}
            />
          )}
        </div>
      </Card>

      {/* ===== Omni 一体化架构设置（仅在 omni 架构时显示） ===== */}
      {config.architecture === "omni" && (
        <Card
          style={{ border: "1px solid #EDEEEF" }}
          title={
            <Space>
              <IconThunderbolt style={{ color: "#722ed1" }} />
              <span>Omni 一体化架构 API 设置</span>
              <Tag color="purple">WebSocket 实时流式</Tag>
            </Space>
          }
          extra={
            <Button
              icon={<IconSave />}
              onClick={saveTtsAsrSettings}
              loading={savingSettings}
              size="small"
              type="primary"
            >
              保存设置
            </Button>
          }
        >
          <Alert
            type="info"
            showIcon
            message="Omni 架构使用 WebSocket 实时流式连接（ASR+LLM+TTS 三合一），与级联架构的 HTTP 接口完全独立。"
            style={{ marginBottom: 16 }}
          />
          <Row gutter={16}>
            <Col span={24}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>WebSocket 端点</Text>
              </div>
              <Input
                placeholder="wss://dashscope.aliyuncs.com/api-ws/v1/realtime"
                value={config.omni.endpoint}
                onChange={(e) => updateOmni({ endpoint: e.target.value })}
              />
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 12 }}>
            <Col span={12}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>模型名</Text>
              </div>
              <Input
                placeholder="qwen3-omni-flash-realtime"
                value={config.omni.model}
                onChange={(e) => updateOmni({ model: e.target.value })}
              />
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>输出音色</Text>
              </div>
              <Select
                value={config.omni.voice}
                onChange={(v) => updateOmni({ voice: v })}
                style={{ width: "100%" }}
                options={[
                  { value: "Tina", label: "Tina（女声·温婉）" },
                  { value: "Cindy", label: "Cindy（女声·台湾口音）" },
                  { value: "Liora Mira", label: "Liora Mira（女声·温柔）" },
                  { value: "Sunnybobi", label: "Sunnybobi（女声·活泼）" },
                  { value: "Serena", label: "Serena（女声·专业）" },
                  { value: "Maia", label: "Maia（女声·知性）" },
                  { value: "Qiao", label: "Qiao（女声·甜美）" },
                  { value: "Ethan", label: "Ethan（男声·阳光）" },
                  { value: "Raymond", label: "Raymond（男声·清亮）" },
                  { value: "Theo Calm", label: "Theo Calm（男声·沉稳）" },
                  { value: "Harvey", label: "Harvey（男声·低沉）" },
                  { value: "Evan", label: "Evan（男声·青春）" },
                ]}
              />
            </Col>
          </Row>

          <Divider style={{ margin: "16px 0 12px" }} />

          {/* Omni API Key 管理 */}
          <div style={{ marginBottom: 8 }}>
            <Space>
              <IconKey style={{ color: "#722ed1" }} />
              <Text strong>Omni 独立 API Key</Text>
            </Space>
          </div>
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>当前状态：</Text>
            {omniKeyStatus.configured ? (
              <Tag icon={<IconCheckOne />} color="success">
                已配置 · {omniKeyStatus.masked}
              </Tag>
            ) : (
              <Tag icon={<IconCloseOne />} color="default">
                未配置（使用共享 Key 或环境变量）
              </Tag>
            )}
          </div>
          <Input.Password
            placeholder="输入 Omni API Key（明文，保存后 AES-256-GCM 加密存储）"
            value={omniKeyInput}
            onChange={(e) => setOmniKeyInput(e.target.value)}
            prefix={<IconKey style={{ color: "#999" }} />}
            iconRender={(visible) => (visible ? <IconPreviewClose /> : <IconLock />)}
          />
          <Space style={{ marginTop: 8 }}>
            <Button
              type="primary"
              icon={<IconSave />}
              loading={savingOmniKey}
              onClick={saveOmniKey}
              disabled={!omniKeyInput.trim()}
              size="small"
            >
              保存 Key
            </Button>
            {omniKeyStatus.configured && (
              <Popconfirm
                title="确定清除 Omni API Key？"
                description="清除后将回退到 AI 提供商共享 Key 或环境变量"
                onConfirm={() => clearKey("omni")}
                okText="确定"
                cancelText="取消"
              >
                <Button danger icon={<IconDelete />} size="small">清除</Button>
              </Popconfirm>
            )}
          </Space>
        </Card>
      )}

      {/* ===== 级联端到端测试已移除（纯 Omni 架构） ===== */}
    </div>
  )
}
