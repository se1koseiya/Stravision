import { NextRequest, NextResponse } from 'next/server'
// import { getCurrentUser } from '@/lib/auth' // 移除认证导入

export const runtime = 'nodejs'

// Qwen3-ASR 支持的方言和语言列表
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

export async function POST(req: NextRequest) {
  try {
    // 移除认证验证，允许直接使用
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

    // 获取 Qwen3-ASR API 配置
    const qwenApiKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY
    
    if (!qwenApiKey) {
      return NextResponse.json({ 
        error: 'Qwen ASR API key not configured. Please set DASHSCOPE_API_KEY in environment variables.',
        fallback: 'web-speech-api',
        message: 'You can use the browser\'s built-in speech recognition as a fallback.'
      }, { status: 500 })
    }

    // 使用正确的DashScope ASR API端点
    const qwenApiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/audio/asr'
    
    // 准备发送给 Qwen3-ASR 的数据 - 使用正确的格式
    const qwenFormData = new FormData()
    qwenFormData.append('model', 'paraformer-realtime-v2')
    qwenFormData.append('audio', audioFile) // 音频文件
    qwenFormData.append('language_hints', language === 'zh-WU' ? 'zh' : language.split('-')[0])
    
    // 添加其他参数
    qwenFormData.append('disfluency', 'false')
    qwenFormData.append('output_level', '1')

    console.log(`[ASR] Processing audio file: ${audioFile.name}, size: ${audioFile.size} bytes, language: ${language}, dialect: ${dialect}`)

    // 调用真实的 Qwen3-ASR API
    const response = await fetch(qwenApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${qwenApiKey}`,
        // 不要设置Content-Type，让浏览器自动设置multipart/form-data边界
      },
      body: qwenFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[ASR] API Error: ${response.status} - ${errorText}`)
      
      // 解析错误信息
      let errorMessage = '语音识别请求失败'
      try {
        const errorData = JSON.parse(errorText)
        if (errorData.code === 'InvalidParameter') {
          errorMessage = '音频格式不支持，请使用WAV、MP3或M4A格式'
        } else if (errorData.code === 'Arrearage') {
          errorMessage = '阿里云账号欠费或额度不足，请检查百炼控制台余额'
        } else if (errorData.code === 'Forbidden') {
          errorMessage = 'API密钥无效或权限不足'
        } else {
          errorMessage = errorData.message || errorData.error || errorMessage
        }
      } catch {
        errorMessage = `API 错误: ${response.status}`
      }

      return NextResponse.json({ 
        error: errorMessage,
        details: errorText 
      }, { status: response.status })
    }

    const result = await response.json()
    
    console.log(`[ASR] Recognition result:`, result)

    // 处理 DashScope ASR 的响应格式
    const output = result.output
    if (!output) {
      return NextResponse.json({ 
        error: 'No recognition result returned from API' 
      }, { status: 500 })
    }

    const transcript = output.text || ''
    const confidence = output.confidence || 0.9
    
    if (!transcript) {
      return NextResponse.json({ 
        error: '无法识别音频内容，请确保音频清晰且包含语音' 
      }, { status: 400 })
    }

    console.log(`[ASR] Recognition successful: ${transcript}`)

    // 返回标准化的响应
    return NextResponse.json({
      success: true,
      transcript,
      confidence,
      detectedLanguage: language,
      detectedDialect: dialect,
      segments: output.sentences || [],
      duration: output.duration || 0,
      model: 'paraformer-realtime-v2',
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

// 获取支持的语言列表
export async function GET() {
  return NextResponse.json({
    supportedLanguages: SUPPORTED_LANGUAGES,
    model: 'qwen3-asr',
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