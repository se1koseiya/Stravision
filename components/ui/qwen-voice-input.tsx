"use client"

import { useState, useEffect, useRef } from "react"
import { useQwenSpeechRecognition } from "@/lib/hooks/use-qwen-speech-recognition"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { IconLoading, IconMicrophone, IconSetting, IconTranslate, IconVoiceOff, IconVolumeNotice } from "@/components/icon";

interface QwenVoiceInputProps {
  onTranscript: (text: string) => void
  onError?: (error: string) => void
  className?: string
  disabled?: boolean
  placeholder?: string
}

// 常用方言配置
const DIALECT_GROUPS = {
  '中文方言': {
    'zh-CN': { name: '普通话', dialects: ['auto', 'beijing', 'northeast', 'northwest'] },
    'zh-TW': { name: '繁体中文', dialects: ['auto', 'taiwan'] },
    'zh-HK': { name: '粤语', dialects: ['auto', 'hongkong', 'guangzhou', 'shenzhen'] },
    'zh-WU': { name: '吴语', dialects: ['auto', 'shanghai', 'suzhou', 'hangzhou', 'taizhou', 'ningbo', 'wenzhou'] },
    'zh-MIN': { name: '闽南语', dialects: ['auto', 'fujian', 'taiwan-min'] },
    'zh-HAK': { name: '客家话', dialects: ['auto', 'meixian', 'taiwan-hakka'] },
    'zh-GAN': { name: '赣语', dialects: ['auto', 'nanchang'] },
    'zh-XIB': { name: '湘语', dialects: ['auto', 'changsha'] },
  },
  '国际语言': {
    'en-US': { name: 'English', dialects: ['auto', 'us', 'uk', 'au', 'in'] },
    'ja-JP': { name: '日本語', dialects: ['auto', 'standard', 'kansai'] },
    'ko-KR': { name: '한국어', dialects: ['auto', 'seoul', 'busan'] },
    'th-TH': { name: 'ไทย', dialects: ['auto', 'central', 'northern', 'southern'] },
    'vi-VN': { name: 'Tiếng Việt', dialects: ['auto', 'northern', 'central', 'southern'] },
  },
  '东南亚语言': {
    'id-ID': { name: 'Bahasa Indonesia', dialects: ['auto', 'jakarta', 'javanese'] },
    'ms-MY': { name: 'Bahasa Melayu', dialects: ['auto', 'standard'] },
    'tl-PH': { name: 'Filipino', dialects: ['auto', 'manila', 'cebuano'] },
    'my-MM': { name: 'မြန်မာ', dialects: ['auto'] },
    'km-KH': { name: 'ខ្មែរ', dialects: ['auto'] },
    'lo-LA': { name: 'ລາວ', dialects: ['auto'] },
  }
}

const DIALECT_NAMES: Record<string, string> = {
  'auto': '自动检测',
  'beijing': '北京话',
  'northeast': '东北话',
  'northwest': '西北话',
  'taiwan': '台湾腔',
  'hongkong': '香港粤语',
  'guangzhou': '广州话',
  'shenzhen': '深圳话',
  'shanghai': '上海话',
  'suzhou': '苏州话',
  'hangzhou': '杭州话',
  'taizhou': '台州话',
  'ningbo': '宁波话',
  'wenzhou': '温州话',
  'fujian': '福建闽南语',
  'taiwan-min': '台湾闽南语',
  'meixian': '梅县客家话',
  'taiwan-hakka': '台湾客家话',
  'nanchang': '南昌话',
  'changsha': '长沙话',
  'us': 'American English',
  'uk': 'British English',
  'au': 'Australian English',
  'in': 'Indian English',
  'standard': '标准语',
  'kansai': '关西腔',
  'seoul': '首尔话',
  'busan': '釜山话',
  'central': '中部方言',
  'northern': '北部方言',
  'southern': '南部方言',
  'jakarta': '雅加达话',
  'javanese': '爪哇语',
  'manila': '马尼拉话',
  'cebuano': '宿务语',
}

export default function QwenVoiceInput({ 
  onTranscript, 
  onError, 
  className, 
  disabled = false,
  placeholder = "点击麦克风开始语音输入..."
}: QwenVoiceInputProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('zh-CN')
  const [selectedDialect, setSelectedDialect] = useState('auto')
  const [showTranscript, setShowTranscript] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  
  const transcriptTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const {
    isRecording,
    isProcessing,
    transcript,
    confidence,
    detectedLanguage,
    detectedDialect,
    error,
    supportedLanguages,
    startRecording,
    stopRecording,
    resetTranscript,
  } = useQwenSpeechRecognition({
    language: selectedLanguage,
    dialect: selectedDialect,
    onResult: (text, conf) => {
      if (text.trim()) {
        onTranscript(text.trim())
        setShowTranscript(true)
        
        // 3秒后隐藏转录结果
        if (transcriptTimeoutRef.current) {
          clearTimeout(transcriptTimeoutRef.current)
        }
        transcriptTimeoutRef.current = setTimeout(() => {
          setShowTranscript(false)
          resetTranscript()
        }, 3000)
      }
    },
    onError: (err) => {
      onError?.(err)
    },
    maxDuration: 30, // 最大30秒录音
  })

  const handleToggleRecording = async () => {
    if (disabled) return
    
    if (isRecording) {
      await stopRecording()
    } else {
      resetTranscript()
      setShowTranscript(false)
      await startRecording()
    }
  }

  const getLanguageName = (langCode: string) => {
    return supportedLanguages[langCode] || DIALECT_GROUPS['中文方言'][langCode as keyof typeof DIALECT_GROUPS['中文方言']]?.name || langCode
  }

  const getDialectName = (dialectCode: string) => {
    return DIALECT_NAMES[dialectCode] || dialectCode
  }

  const renderLanguageSelector = () => (
    <DropdownMenu open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          disabled={isRecording || isProcessing}
        >
          <IconTranslate size={14} className="mr-1" />
          {getLanguageName(selectedLanguage)}
          {selectedDialect !== 'auto' && ` (${getDialectName(selectedDialect)})`}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-h-96 overflow-y-auto">
        {Object.entries(DIALECT_GROUPS).map(([groupName, languages]) => (
          <div key={groupName}>
            <DropdownMenuLabel className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {groupName}
            </DropdownMenuLabel>
            {Object.entries(languages).map(([langCode, langInfo]) => (
              <div key={langCode}>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedLanguage(langCode)
                    setSelectedDialect('auto')
                  }}
                  className={cn(
                    "text-sm",
                    selectedLanguage === langCode && selectedDialect === 'auto' && "bg-emerald-50 dark:bg-emerald-900/20"
                  )}
                >
                  <span className="font-medium">{langInfo.name}</span>
                  {selectedLanguage === langCode && selectedDialect === 'auto' && (
                    <span className="ml-auto text-emerald-600 dark:text-emerald-400">✓</span>
                  )}
                </DropdownMenuItem>
                {langInfo.dialects.length > 1 && langInfo.dialects.slice(1).map(dialect => (
                  <DropdownMenuItem
                    key={`${langCode}-${dialect}`}
                    onClick={() => {
                      setSelectedLanguage(langCode)
                      setSelectedDialect(dialect)
                    }}
                    className={cn(
                      "text-sm pl-6 text-zinc-600 dark:text-zinc-300",
                      selectedLanguage === langCode && selectedDialect === dialect && "bg-emerald-50 dark:bg-emerald-900/20"
                    )}
                  >
                    <span>└ {getDialectName(dialect)}</span>
                    {selectedLanguage === langCode && selectedDialect === dialect && (
                      <span className="ml-auto text-emerald-600 dark:text-emerald-400">✓</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </div>
            ))}
            <DropdownMenuSeparator />
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className={cn("relative", className)}>
      {/* 主要控制区域 */}
      <div className="flex items-center gap-2">
        {/* 语言选择器 */}
        {renderLanguageSelector()}
        
        {/* 录音按钮 */}
        <Button
          onClick={handleToggleRecording}
          disabled={disabled || isProcessing}
          variant={isRecording ? "destructive" : "outline"}
          size="sm"
          className={cn(
            "relative h-8 px-3 transition-all duration-200",
            isRecording && "animate-pulse shadow-lg shadow-red-500/25",
            isProcessing && "cursor-not-allowed opacity-50"
          )}
        >
          {isProcessing ? (
            <div className="flex gap-0.5 mr-1">
              <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : isRecording ? (
            <IconVoiceOff size={14} className="mr-1" />
          ) : (
            <IconMicrophone size={14} className="mr-1" />
          )}
          
          <span className="text-xs">
            {isProcessing 
              ? "识别中..." 
              : isRecording 
                ? "停止录音" 
                : "语音输入"}
          </span>
          
          {/* 录音指示器 */}
          {isRecording && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
          )}
        </Button>
      </div>

      {/* 转录结果显示 */}
      {showTranscript && transcript && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-50 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-2">
            <IconVolumeNotice size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-900 dark:text-zinc-100 leading-relaxed">
                {transcript}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span>置信度: {Math.round(confidence * 100)}%</span>
                {detectedLanguage && (
                  <span>检测语言: {getLanguageName(detectedLanguage)}</span>
                )}
                {detectedDialect && detectedDialect !== 'auto' && (
                  <span>方言: {getDialectName(detectedDialect)}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg shadow-lg z-50">
          <p className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        </div>
      )}

      {/* 占位符提示 */}
      {!isRecording && !isProcessing && !showTranscript && !error && placeholder && (
        <div className="absolute top-full left-0 right-0 mt-1">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            {placeholder}
          </p>
        </div>
      )}
    </div>
  )
}