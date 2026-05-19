"use client"

import { useState, useEffect } from "react"
import { Globe, ExternalLink, AlertCircle, ArrowLeftIcon, ArrowRightIcon, RefreshCcwIcon, Maximize2Icon } from "lucide-react"
import { 
  WebPreview as ShadcnWebPreview, 
  WebPreviewNavigation, 
  WebPreviewNavigationButton, 
  WebPreviewUrl, 
  WebPreviewBody 
} from "@/components/ai/web-preview"
import { cn } from "@/lib/utils"

interface WebPreviewProps {
  url: string
  className?: string
  showFallback?: boolean
}

// 适配器组件，保持与原有接口兼容
export function WebPreview({ url, className, showFallback = true }: WebPreviewProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [currentService, setCurrentService] = useState(0)
  const [retryCount, setRetryCount] = useState(0)
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null)

  // 免费的网页截图服务列表
  const screenshotServices = [
    // 服务1: Thum.io (免费，但有限制)
    (url: string) => `https://image.thum.io/get/width/400/crop/320/${encodeURIComponent(url)}`,
    // 服务2: S-Shot (免费)
    (url: string) => `https://mini.s-shot.ru/1024x768/JPEG/1024/Z100/?${encodeURIComponent(url)}`,
    // 服务3: Website Screenshot (免费，但需要API key，这里用demo)
    (url: string) => `https://api.screenshotmachine.com/?key=demo&url=${encodeURIComponent(url)}&dimension=1024x768`,
    // 服务4: 使用 Google 的页面缓存作为最后的降级方案
    (url: string) => `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`,
  ]

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }

  const tryNextService = () => {
    if (currentService < screenshotServices.length - 1) {
      setCurrentService(prev => prev + 1)
      setImageError(false)
      setImageLoaded(false)
    } else {
      setImageError(true)
    }
  }

  const handleImageLoad = () => {
    setImageLoaded(true)
    setImageError(false)
    
    // 清除超时
    if (loadingTimeout) {
      clearTimeout(loadingTimeout)
      setLoadingTimeout(null)
    }
  }

  const handleImageError = () => {
    console.warn(`Screenshot service ${currentService} failed for URL: ${url}`)
    
    // 如果当前服务失败次数少于2次，先重试当前服务
    if (retryCount < 1) {
      setRetryCount(prev => prev + 1)
      // 强制重新加载图片
      setTimeout(() => {
        setImageLoaded(false)
        setImageError(false)
      }, 1000)
    } else {
      // 重试次数用完，切换到下一个服务
      setRetryCount(0)
      tryNextService()
    }
  }

  useEffect(() => {
    setCurrentService(0)
    setImageError(false)
    setImageLoaded(false)
    setRetryCount(0)
    
    // 清除之前的超时
    if (loadingTimeout) {
      clearTimeout(loadingTimeout)
    }
    
    // 设置15秒超时
    const timeout = setTimeout(() => {
      if (!imageLoaded && !imageError) {
        console.warn(`Screenshot loading timeout for service ${currentService}`)
        handleImageError()
      }
    }, 15000)
    
    setLoadingTimeout(timeout)
    
    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [url, currentService])

  const currentScreenshotUrl = screenshotServices[currentService]?.(url)

  return (
    <div className={cn("relative w-full h-full bg-zinc-50 dark:bg-zinc-900 rounded-lg overflow-hidden", className)}>
      {/* 截图显示 */}
      {!imageError && currentScreenshotUrl && (
        <img
          src={currentScreenshotUrl}
          alt={`Screenshot of ${getDomain(url)}`}
          className={cn(
            "absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-500",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={handleImageLoad}
          onError={handleImageError}
          crossOrigin="anonymous"
        />
      )}

      {/* 加载状态或降级显示 */}
      {(!imageLoaded || imageError) && showFallback && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-zinc-600 dark:text-zinc-400">
          {imageError ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary flex items-center justify-center shadow-lg mb-4">
                <Globe size={32} className="text-white" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-base mb-2">{getDomain(url)}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3 flex items-center justify-center gap-2">
                  <AlertCircle size={16} />
                  预览服务暂时不可用
                </p>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-primary dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                >
                  <ExternalLink size={12} />
                  在浏览器中打开
                </a>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center mb-3 animate-pulse">
                <Globe size={24} className="text-zinc-400" />
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">正在加载预览...</div>
              <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{getDomain(url)}</div>
            </>
          )}
        </div>
      )}

      {/* 悬停时显示的外部链接按钮 */}
      {imageLoaded && !imageError && (
        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors group">
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-black/80 hover:bg-black text-white text-xs px-3 py-2 rounded-full backdrop-blur-sm transition-all hover:scale-105"
            >
              <ExternalLink size={12} />
              打开
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

// 导出新的shadcn组件供高级用法使用
export {
  ShadcnWebPreview as WebPreviewAdvanced,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
  WebPreviewBody
}