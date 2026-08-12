import { NextRequest, NextResponse } from 'next/server'
import { getVoiceServerConfig, resolveVoiceApiKey } from '@/lib/db/settings-service'

export const runtime = 'nodejs'

// 支持的语言列表（通用）
const SUPPORTED_LANGUAGES = {
  'zh-CN': '普通话',
  'zh-TW': '繁体中文',
  'zh-HK': '粤语',
  'zh-WU': '吴语',
  'zh-WU-taizhou': '台州话',
  'zh-WU-ningbo': '宁波话',
  'zh-WU-wenzhou': '温州话',
  'zh-MIN': '闽南语',
  'zh-HAK': '客家话',
  'zh-GAN': '赣语',
  'zh-XIB': '湘语',
  'en-US': 'English',
  'ja-JP': '日本語',
  'ko-KR': '한국어',
  'th-TH': 'ไทย',
  'vi-VN': 'Tiếng Việt',
  'id-ID': 'Bahasa Indonesia',
  'ms-MY': 'Bahasa Melayu',
  'tl-PH': 'Filipino',
  'my-MM': 'မြန်မာ',
  'km-KH': 'ខ្មែរ',
  'lo-LA': 'ລາວ',
  'si-LK': 'සිංහල',
  'ne-NP': 'नेपाली',
  'bn-BD': 'বাংলা',
  'hi-IN': 'हिन्दी',
  'ur-PK': 'اردو',
  'fa-IR': 'فارسی',
  'ar-SA': 'العربية',
  'he-IL': 'עברית',
  'tr-TR': 'Türkçe',
  'ru-RU': 'Русский',
  'uk-UA': 'Українська',
  'pl-PL': 'Polski',
  'cs-CZ': 'Čeština',
  'sk-SK': 'Slovenčina',
  'hu-HU': 'Magyar',
  'ro-RO': 'Română',
  'bg-BG': 'Български',
  'hr-HR': 'Hrvatski',
  'sr-RS': 'Српски',
  'sl-SI': 'Slovenščina',
  'et-EE': 'Eesti',
  'lv-LV': 'Latviešu',
  'lt-LT': 'Lietuvių',
  'fi-FI': 'Suomi',
  'sv-SE': 'Svenska',
  'no-NO': 'Norsk',
  'da-DK': 'Dansk',
  'is-IS': 'Íslenska',
  'de-DE': 'Deutsch',
  'nl-NL': 'Nederlands',
  'fr-FR': 'Français',
  'it-IT': 'Italiano',
  'es-ES': 'Español',
  'pt-PT': 'Português',
  'ca-ES': 'Català',
  'eu-ES': 'Euskera',
  'gl-ES': 'Galego'
}

/** 百度 dev_pid 映射（语言 → 模型 ID） */
const BAIDU_DEV_PID_MAP: Record<string, number> = {
  'zh-CN': 1537,   // 普通话（有标点）
  'zh-TW': 1637,   // 粤语
  'zh-HK': 1637,   // 粤语
  'en-US': 1737,   // 英语
  'zh-XIB': 1837,  // 四川话
}

/**
 * 通用 ASR 接口（多提供商适配）
 *
 * 支持的 providerType：
 * - dashscope: 阿里云 Qwen3-ASR-Flash，OpenAI 兼容接口，base64 音频上传，返回 chat/completions 格式
 * - baidu: 百度短语音识别，JSON(base64) 上传，返回 { err_no, result: ["text"] }
 * - openai: OpenAI Whisper 兼容，FormData 上传
 * - custom: 按 dashscope 兼容处理（OpenAI 兼容接口）
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File
    const language = formData.get('language') as string || 'zh-CN'
    const dialect = formData.get('dialect') as string || 'auto'

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // 验证语言支持
    if (!SUPPORTED_LANGUAGES[language as keyof typeof SUPPORTED_LANGUAGES]) {
      return NextResponse.json({
        error: 'Unsupported language',
        supportedLanguages: SUPPORTED_LANGUAGES
      }, { status: 400 })
    }

    // 从 system_settings.voice_config 读取 ASR 配置
    const voiceCfg = await getVoiceServerConfig()
    const asrCfg = voiceCfg.asr

    // browser 模式仅在客户端运行，服务端直接返回提示
    if (asrCfg.providerType === 'browser') {
      return NextResponse.json({
        error: '浏览器原生模式仅在客户端可用，请在语音测试页面直接录音测试。',
      }, { status: 400 })
    }

    const { apiKey: asrApiKey, providerName, source } = await resolveVoiceApiKey(voiceCfg.providerId, "asr")

    if (!asrApiKey) {
      return NextResponse.json({
        error: 'AI 提供商 API Key 未配置，请在 AI 提供商管理中设置。',
        fallback: 'web-speech-api',
        message: 'You can use the browser\'s built-in speech recognition as a fallback.'
      }, { status: 500 })
    }

    // OpenAI 兼容模式只支持 qwen3-asr-flash；
    // 若配置了实时 WebSocket 专用模型（streaming/realtime 后缀），自动回退到 qwen3-asr-flash。
    // 参考：https://help.aliyun.com/zh/model-studio/qwen-asr-api-reference
    const STREAMING_MODEL_PATTERNS = [
      'streaming', 'realtime', 'paraformer-realtime',
    ]
    const isStreamingModel = asrCfg.providerType === 'dashscope' &&
      STREAMING_MODEL_PATTERNS.some(p => asrCfg.model.toLowerCase().includes(p))
    const effectiveModel = isStreamingModel ? 'qwen3-asr-flash' : asrCfg.model
    if (isStreamingModel) {
      console.warn(`[ASR] 配置模型 "${asrCfg.model}" 不支持 OpenAI 兼容 HTTP 接口，自动回退到 "qwen3-asr-flash"`)
    }

    console.log(`[ASR] providerType=${asrCfg.providerType}, keySource=${source}, provider=${providerName}, model=${effectiveModel}, file=${audioFile.name}, size=${audioFile.size} bytes, lang=${language}`)

    // 按提供商类型分发
    const result = await recognizeByProvider(asrCfg.providerType, {
      endpoint: asrCfg.endpoint,
      apiKey: asrApiKey,
      model: effectiveModel,
      audioFile,
      language,
      dialect,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || '识别失败' }, { status: 500 })
    }

    console.log(`[ASR] Recognition successful: ${result.transcript}`)

    return NextResponse.json({
      success: true,
      transcript: result.transcript,
      confidence: result.confidence,
      detectedLanguage: language,
      detectedDialect: dialect,
      segments: result.segments || [],
      duration: result.duration || 0,
      model: effectiveModel,
      provider: providerName,
      supportedLanguages: SUPPORTED_LANGUAGES
    })

  } catch (error) {
    console.error('[ASR] Processing error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ===== 各提供商请求适配 =====

interface AsrRequestParams {
  endpoint: string
  apiKey: string
  model: string
  audioFile: File
  language: string
  dialect: string
}

interface AsrResult {
  success: boolean
  transcript: string
  confidence: number
  segments?: unknown[]
  duration?: number
  error?: string
}

async function recognizeByProvider(
  providerType: string,
  params: AsrRequestParams
): Promise<AsrResult> {
  switch (providerType) {
    case 'browser':
      // 浏览器原生 SpeechRecognition 仅在客户端运行，服务端不可用
      return {
        success: false,
        transcript: '',
        confidence: 0,
        error: '浏览器原生模式仅在客户端可用，请在语音测试页面直接录音测试，或在 AI 助手页面使用。级联架构如需此模式请在管理后台切换 ASR 提供商。',
      }
    case 'baidu':
      return await recognizeBaidu(params)
    case 'openai':
      return await recognizeOpenAI(params)
    case 'dashscope':
    case 'custom':
    default:
      return await recognizeDashscope(params)
  }
}

/**
 * DashScope ASR（阿里云 Qwen3-ASR-Flash，OpenAI 兼容接口）
 *
 * 官方文档：https://help.aliyun.com/zh/model-studio/qwen-asr-api-reference
 * - endpoint: https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
 *   或专属域名 https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions
 * - model: qwen3-asr-flash
 * - 音频以 base64 编码放入 input_audio.data 字段（格式: data:audio/wav;base64,xxx）
 * - 响应为标准 OpenAI chat/completions 格式，识别文本在 choices[0].message.content[].text
 */
async function recognizeDashscope(params: AsrRequestParams): Promise<AsrResult> {
  // 自动修正历史遗留 endpoint，统一到 OpenAI 兼容接口
  let endpoint = params.endpoint
  // 旧 endpoint: .../audio/asr 或 .../audio/asr/recognition -> compatible-mode/v1/chat/completions
  if (endpoint.includes('/services/audio/asr')) {
    // 从旧 endpoint 提取域名部分，拼接新路径
    const domainMatch = endpoint.match(/^(https?:\/\/[^/]+)/)
    if (domainMatch) {
      endpoint = `${domainMatch[1]}/compatible-mode/v1/chat/completions`
      console.log(`[ASR/Dashscope] 自动修正 endpoint 为 OpenAI 兼容接口: ${endpoint}`)
    }
  }
  // 确保 endpoint 以 /chat/completions 结尾
  if (!endpoint.endsWith('/chat/completions')) {
    if (endpoint.endsWith('/compatible-mode/v1')) {
      endpoint = endpoint + '/chat/completions'
    } else if (endpoint.endsWith('/compatible-mode')) {
      endpoint = endpoint + '/v1/chat/completions'
    }
  }

  // 将音频文件转为 base64 编码
  const audioBuffer = await params.audioFile.arrayBuffer()
  const audioBase64 = Buffer.from(audioBuffer).toString('base64')

  // 推断音频 MIME 类型
  const fileName = params.audioFile.name.toLowerCase()
  let mimeType = 'audio/wav'
  if (fileName.endsWith('.mp3')) mimeType = 'audio/mpeg'
  else if (fileName.endsWith('.m4a')) mimeType = 'audio/mp4'
  else if (fileName.endsWith('.aac')) mimeType = 'audio/aac'
  else if (fileName.endsWith('.amr')) mimeType = 'audio/amr'
  else if (fileName.endsWith('.webm')) mimeType = 'audio/webm'

  // 构造 OpenAI 兼容请求体
  const requestBody: Record<string, unknown> = {
    model: params.model || 'qwen3-asr-flash',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'input_audio',
            input_audio: {
              data: `data:${mimeType};base64,${audioBase64}`,
            },
          },
        ],
      },
    ],
  }

  // 添加 asr_options（语言提示，提升中文识别准确率）
  const langMap: Record<string, string> = {
    'zh-CN': 'zh', 'zh-TW': 'zh', 'zh-HK': 'yue', 'zh-WU': 'zh',
    'en-US': 'en', 'ja-JP': 'ja', 'ko-KR': 'ko', 'de-DE': 'de',
    'fr-FR': 'fr', 'es-ES': 'es', 'ru-RU': 'ru',
  }
  const asrLang = langMap[params.language]
  if (asrLang) {
    requestBody.asr_options = { language: asrLang, enable_itn: false }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[ASR/Dashscope] API Error: ${response.status} - ${errorText}`)
    let errorMessage = '语音识别请求失败'
    try {
      const errorData = JSON.parse(errorText)
      if (errorData.error?.code === 'InvalidParameter') errorMessage = '音频格式不支持，请使用WAV、MP3或M4A格式'
      else if (errorData.error?.code === 'Arrearage') errorMessage = '阿里云账号欠费或额度不足'
      else if (errorData.error?.code === 'AccessDenied') errorMessage = 'API密钥无效或权限不足'
      else if (errorData.error?.code === 'ModelNotFound') errorMessage = `模型不可用：${params.model}，请检查模型名称或开通服务`
      else errorMessage = errorData.error?.message || errorData.message || errorMessage
    } catch { errorMessage = `API 错误: ${response.status}` }
    return { success: false, transcript: '', confidence: 0, error: errorMessage }
  }

  // 解析 OpenAI 兼容响应
  const result = await response.json()
  console.log(`[ASR/Dashscope] Response:`, JSON.stringify(result).slice(0, 500))
  const choices = result.choices
  if (!choices || !Array.isArray(choices) || choices.length === 0) {
    return { success: false, transcript: '', confidence: 0, error: 'No recognition result returned' }
  }

  const message = choices[0].message
  if (!message) {
    return { success: false, transcript: '', confidence: 0, error: '无法识别音频内容' }
  }

  // content 可能为字符串（标准 OpenAI）或数组（Qwen ASR 格式）
  let transcript = ''
  if (typeof message.content === 'string') {
    transcript = message.content
  } else if (Array.isArray(message.content)) {
    transcript = message.content
      .map((item: { text?: string; content?: string }) => item.text || item.content || '')
      .join('')
  } else if (message.content?.text) {
    transcript = message.content.text
  }
  transcript = transcript.trim()

  if (!transcript) {
    return { success: false, transcript: '', confidence: 0, error: '无法识别音频内容' }
  }

  return {
    success: true,
    transcript,
    confidence: 0.9,
    segments: [],
    duration: result.usage?.prompt_tokens_details?.seconds || 0,
  }
}

/**
 * 百度短语音识别
 * JSON 方式上传：base64 编码音频 + 参数
 * 认证：Authorization: Bearer bce-v3/...（API Key 鉴权）
 * 响应：{ err_no: 0, err_msg: "success.", result: ["识别文本"] }
 */
async function recognizeBaidu(params: AsrRequestParams): Promise<AsrResult> {
  // 将音频文件转为 base64
  const audioBuffer = await params.audioFile.arrayBuffer()
  const audioBase64 = Buffer.from(audioBuffer).toString('base64')

  // 推断音频格式
  const fileName = params.audioFile.name.toLowerCase()
  let format = 'pcm'
  if (fileName.endsWith('.wav')) format = 'wav'
  else if (fileName.endsWith('.amr')) format = 'amr'
  else if (fileName.endsWith('.m4a')) format = 'm4a'
  else if (fileName.endsWith('.mp3')) format = 'm4a' // 百度不直接支持 mp3，按 m4a 处理

  // dev_pid 映射
  const devPid = BAIDU_DEV_PID_MAP[params.language] || 1537

  const payload = {
    format,
    rate: 16000,
    dev_pid: devPid,
    channel: 1,
    cuid: 'berry-realm-voice',
    token: params.apiKey, // 百度 access_token
    speech: audioBase64,
    len: audioBuffer.byteLength,
  }

  const response = await fetch(params.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // API Key 鉴权方式（bce-v3）
      ...(params.apiKey.startsWith('bce-v3/') ? { 'Authorization': `Bearer ${params.apiKey}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[ASR/Baidu] API Error: ${response.status} - ${errorText}`)
    return { success: false, transcript: '', confidence: 0, error: `百度 ASR 请求失败: ${response.status}` }
  }

  const data = await response.json()

  // 百度错误码处理
  if (data.err_no !== 0) {
    console.error(`[ASR/Baidu] Error: err_no=${data.err_no}, err_msg=${data.err_msg}`)
    return { success: false, transcript: '', confidence: 0, error: `百度 ASR 错误: ${data.err_msg}` }
  }

  // result 是数组，取第一个
  const transcript = Array.isArray(data.result) ? data.result.join('') : ''
  if (!transcript) {
    return { success: false, transcript: '', confidence: 0, error: '无法识别音频内容' }
  }

  return {
    success: true,
    transcript,
    confidence: 0.9,
    segments: [],
    duration: 0,
  }
}

/** OpenAI Whisper 兼容格式 */
async function recognizeOpenAI(params: AsrRequestParams): Promise<AsrResult> {
  const asrFormData = new FormData()
  asrFormData.append('file', params.audioFile)
  asrFormData.append('model', params.model)
  asrFormData.append('language', params.language.split('-')[0])

  const response = await fetch(params.endpoint, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${params.apiKey}` },
    body: asrFormData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[ASR/OpenAI] API Error: ${response.status} - ${errorText}`)
    return { success: false, transcript: '', confidence: 0, error: `OpenAI ASR 请求失败: ${response.status}` }
  }

  const data = await response.json()
  const transcript = data.text || ''
  if (!transcript) {
    return { success: false, transcript: '', confidence: 0, error: '无法识别音频内容' }
  }

  return {
    success: true,
    transcript,
    confidence: 0.9,
    segments: data.segments || [],
    duration: data.duration || 0,
  }
}

// 获取支持的语言列表与当前 ASR 配置
export async function GET() {
  let model = 'qwen3-asr-flash'
  let provider = 'AI 提供商'
  try {
    const cfg = await getVoiceServerConfig()
    model = cfg.asr.model
    const { providerName } = await resolveVoiceApiKey(cfg.providerId, "asr")
    provider = providerName || '未配置'
  } catch { /* 使用默认 */ }

  return NextResponse.json({
    supportedLanguages: SUPPORTED_LANGUAGES,
    model,
    provider,
    features: [
      'Multi-dialect support',
      'Real-time transcription',
      'High accuracy',
      'Timestamp support',
      'Confidence scores',
      'Language detection'
    ]
  })
}
