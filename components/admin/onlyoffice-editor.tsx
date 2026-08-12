"use client"

/**
 * OnlyOffice 文档编辑器组件
 *
 * 在 admin UI 中嵌入 OnlyOffice 文档编辑器，支持编辑/查看模式切换。
 *
 * API 契约：
 *   GET /api/admin/docs/[slug]/editor?mode=edit|view
 *   → { config: OnlyOfficeConfig, apiUrl: string }
 *
 * 用法：
 *   <OnlyOfficeEditor slug="user-manual" mode="edit" onClose={() => setOpen(false)} />
 */

import { useEffect, useRef, useState, useId } from "react"
import { Modal, Spin, App, Button, Space, Typography, Alert } from "antd"
import {
  EditOutlined,
  EyeOutlined,
  ReloadOutlined,
  CloseOutlined,
} from "@ant-design/icons"

const { Text } = Typography

// ============== 全局类型声明 ==============
declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (id: string, config: any) => {
        destroyEditor: () => void
      }
    }
  }
}

// ============== 类型定义 ==============
interface OnlyOfficeConfig {
  documentType: "word" | "cell" | "slide"
  document: {
    fileType: string
    key: string
    title: string
    url: string
    permissions: {
      edit: boolean
      download: boolean
      print: boolean
      review: boolean
    }
  }
  editorConfig: {
    mode: "edit" | "view"
    lang: string
    callbackUrl: string
    user: {
      id: string
      name: string
    }
    customization?: Record<string, unknown>
  }
  token: string
}

interface EditorResponse {
  config: OnlyOfficeConfig
  apiUrl: string
}

// ============== 主组件 ==============
export function OnlyOfficeEditor({
  slug,
  mode = "edit",
  onClose,
}: {
  slug: string
  mode?: "edit" | "view"
  onClose?: () => void
}) {
  const { message } = App.useApp()

  // 唯一容器 ID（移除 useId 中的冒号，避免选择器问题）
  const rawId = useId()
  const containerId = `onlyoffice-editor-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`

  const editorRef = useRef<{ destroyEditor: () => void } | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [activeMode, setActiveMode] = useState<"edit" | "view">(mode)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [docTitle, setDocTitle] = useState<string>("")
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      setLoading(true)
      setError(null)

      // 销毁旧的编辑器实例
      if (editorRef.current) {
        try {
          editorRef.current.destroyEditor()
        } catch (e) {
          console.warn("[onlyoffice] destroy error:", e)
        }
        editorRef.current = null
      }

      // 1. fetch 编辑器配置
      let res: Response
      try {
        res = await fetch(
          `/api/admin/docs/${encodeURIComponent(
            slug
          )}/editor?mode=${activeMode}`
        )
      } catch (e) {
        if (!cancelled) {
          console.error("[onlyoffice] fetch error:", e)
          setError("OnlyOffice 服务不可用：无法连接到服务器")
          setLoading(false)
        }
        return
      }

      if (cancelled) return

      let data: EditorResponse | { error?: string }
      try {
        data = await res.json()
      } catch (e) {
        if (!cancelled) {
          console.error("[onlyoffice] response parse error:", e)
          setError("OnlyOffice 服务不可用：响应解析失败")
          setLoading(false)
        }
        return
      }

      if (cancelled) return

      if (!res.ok) {
        const errMsg =
          (data as { error?: string })?.error ||
          (res.status === 404
            ? "文档不存在或格式不支持"
            : "OnlyOffice 服务不可用")
        setError(errMsg)
        setLoading(false)
        return
      }

      const editorData = data as EditorResponse
      if (!editorData.config || !editorData.apiUrl) {
        setError("OnlyOffice 配置无效")
        setLoading(false)
        return
      }

      setDocTitle(editorData.config.document?.title || slug)

      // 2. 初始化编辑器（config 已含 token，OnlyOffice 会自动提取）
      const initEditor = () => {
        if (cancelled) return
        if (!window.DocsAPI?.DocEditor) {
          setError("OnlyOffice API 加载失败：DocsAPI 未定义")
          setLoading(false)
          return
        }
        try {
          editorRef.current = new window.DocsAPI.DocEditor(
            containerId,
            editorData.config
          )
          if (!cancelled) setLoading(false)
        } catch (e: any) {
          console.error("[onlyoffice] init error:", e)
          if (!cancelled) {
            setError("OnlyOffice 编辑器初始化失败：" + (e?.message || "未知错误"))
            setLoading(false)
          }
        }
      }

      // 若 DocsAPI 已加载则直接初始化，否则动态加载脚本
      if (window.DocsAPI?.DocEditor) {
        initEditor()
        return
      }

      const script = document.createElement("script")
      script.src = `${editorData.apiUrl}web-apps/apps/api/documents/api.js`
      script.async = true
      script.onload = () => {
        initEditor()
      }
      script.onerror = () => {
        if (cancelled) return
        console.error("[onlyoffice] script load error:", script.src)
        setError("OnlyOffice 服务不可用：脚本加载失败")
        setLoading(false)
      }
      document.head.appendChild(script)
    }

    init()

    return () => {
      cancelled = true
      if (editorRef.current) {
        try {
          editorRef.current.destroyEditor()
        } catch (e) {
          console.warn("[onlyoffice] cleanup destroy error:", e)
        }
        editorRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, activeMode, retryKey, containerId])

  // ============ 模式切换 ============
  const handleSwitchMode = () => {
    const next = activeMode === "edit" ? "view" : "edit"
    setActiveMode(next)
    message.info(`正在切换到${next === "edit" ? "编辑" : "查看"}模式...`)
  }

  // ============ 重试 ============
  const handleReload = () => {
    setRetryKey((k) => k + 1)
  }

  // ============ 关闭 ============
  const handleClose = () => {
    onClose?.()
  }

  // ============ 渲染 ============
  return (
    <Modal
      open
      title={
        <Space>
          <Text strong>{docTitle || "文档编辑器"}</Text>
          {activeMode === "edit" ? (
            <Text type="warning" style={{ fontSize: 12 }}>
              <EditOutlined /> 编辑模式
            </Text>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              <EyeOutlined /> 查看模式
            </Text>
          )}
        </Space>
      }
      width="100%"
      style={{ top: 0, maxWidth: "100vw" }}
      bodyStyle={{ height: "90vh", padding: 0 }}
      mask={{ closable: false }}
      destroyOnHidden
      footer={
        <Space>
          <Button
            icon={activeMode === "edit" ? <EyeOutlined /> : <EditOutlined />}
            onClick={handleSwitchMode}
            disabled={loading}
          >
            切换到{activeMode === "edit" ? "查看" : "编辑"}模式
          </Button>
          <Button icon={<CloseOutlined />} onClick={handleClose}>
            关闭
          </Button>
        </Space>
      }
      onCancel={handleClose}
    >
      {error ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            padding: 24,
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Alert
            type="error"
            showIcon
            message="OnlyOffice 编辑器加载失败"
            description={error}
            style={{ maxWidth: 480, width: "100%" }}
          />
          <Button icon={<ReloadOutlined />} onClick={handleReload}>
            重试
          </Button>
        </div>
      ) : (
        <div style={{ position: "relative", height: "100%", width: "100%" }}>
          {loading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.85)",
                zIndex: 1,
              }}
            >
              <Spin tip="正在加载 OnlyOffice 编辑器..." size="large" />
            </div>
          )}
          <div
            id={containerId}
            ref={containerRef}
            style={{ height: "100%", width: "100%" }}
          />
        </div>
      )}
    </Modal>
  )
}

export default OnlyOfficeEditor
