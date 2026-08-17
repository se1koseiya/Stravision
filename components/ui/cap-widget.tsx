"use client"

/**
 * Cap 人机行为验证组件（自托管 proof-of-work CAPTCHA）
 *
 * 文档：https://trycap.dev/guide/widget.html
 *
 * 通过 CDN 加载 cap-widget 自定义元素。用户点击复选框完成 proof-of-work 后，
 * 组件触发 `solve` 事件，本组件监听该事件拿到令牌后回调 onSuccess(token)，
 * 供表单提交到后端校验。
 *
 * 配置：NEXT_PUBLIC_CAP_API_ENDPOINT 为浏览器可访问的 Cap 实例地址（含 site-key 路径）
 */

import { useEffect, useRef, useState } from "react"

// 为自定义元素声明 JSX 类型
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "cap-widget": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          "data-cap-api-endpoint"?: string
        },
        HTMLElement
      >
    }
  }
}

// 自托管 widget 脚本（jsdelivr CDN 在国内浏览器端经常加载失败，导致验证码不显示/无法完成验证）
const CAP_WIDGET_SCRIPT_URL = "/cap-widget.js"

interface CapWidgetProps {
  /** 验证成功回调，携带 cap-token */
  onSuccess: (token: string) => void
  /** 令牌过期/错误回调 */
  onError?: () => void
  /** 容器额外样式 */
  className?: string
  /** 覆盖默认 API endpoint；不传则读取 NEXT_PUBLIC_CAP_API_ENDPOINT */
  endpoint?: string
}

export default function CapWidget({ onSuccess, onError, className, endpoint }: CapWidgetProps) {
  const widgetRef = useRef<HTMLElement>(null)
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  // 脚本加载状态：loading | ready | error
  const [scriptState, setScriptState] = useState<"loading" | "ready" | "error">("loading")

  // 保持回调引用最新
  useEffect(() => {
    onSuccessRef.current = onSuccess
    onErrorRef.current = onError
  })

  // 懒加载 cap-widget 脚本（全局只注入一次），并跟踪加载结果
  useEffect(() => {
    const existing = document.querySelector(`script[data-cap-widget]`) as HTMLScriptElement | null
    if (existing) {
      setScriptState(existing.dataset.loaded === "1" ? "ready" : "loading")
      return
    }
    const script = document.createElement("script")
    script.src = CAP_WIDGET_SCRIPT_URL
    script.async = true
    script.dataset.capWidget = "1"
    script.onload = () => {
      script.dataset.loaded = "1"
      setScriptState("ready")
    }
    script.onerror = () => setScriptState("error")
    document.head.appendChild(script)
  }, [])

  // 监听 solve 事件获取令牌
  useEffect(() => {
    const widget = widgetRef.current
    if (!widget) return

    const handleSolve = (e: Event) => {
      const detail = (e as CustomEvent).detail as { token?: string }
      if (detail?.token) {
        onSuccessRef.current(detail.token)
      }
    }

    const handleError = () => {
      onErrorRef.current?.()
    }

    widget.addEventListener("solve", handleSolve)
    widget.addEventListener("error", handleError)

    return () => {
      widget.removeEventListener("solve", handleSolve)
      widget.removeEventListener("error", handleError)
    }
  }, [])

  const resolvedEndpoint = endpoint || process.env.NEXT_PUBLIC_CAP_API_ENDPOINT

  return (
    <div className={className}>
      {resolvedEndpoint ? (
        <div className="min-h-[40px]">
          {scriptState === "error" ? (
            <div className="text-xs text-red-500 p-2 border border-red-200 rounded bg-red-50">
              安全验证加载失败，请刷新页面重试
            </div>
          ) : (
            <>
              {scriptState === "loading" && (
                <div className="text-xs text-gray-400 py-2 text-center">正在加载安全验证…</div>
              )}
              <cap-widget ref={widgetRef as any} data-cap-api-endpoint={resolvedEndpoint}></cap-widget>
            </>
          )}
        </div>
      ) : (
        <div className="text-xs text-red-500 p-2 border border-red-200 rounded">
          Cap 未配置：请设置 NEXT_PUBLIC_CAP_API_ENDPOINT 环境变量
        </div>
      )}
    </div>
  )
}
