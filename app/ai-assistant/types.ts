// AI Assistant — Shared Types
// Extracted from app/ai-assistant/page.tsx

export interface Citation {
  number: string
  title: string
  url: string
  description?: string
  quote?: string
}

/** 聊天附件（图片/文件） */
export interface ChatAttachment {
  /** 文件名（含扩展名） */
  name: string
  /** MIME 类型，如 image/png */
  type: string
  /** dataURL（base64 编码内联，可直接用于 image_url） */
  dataUrl: string
}

export interface TaskItemModel {
  type: "text" | "file"
  text: string
  file?: { name: string; icon?: string }
}

export interface TaskModel {
  title: string
  items: TaskItemModel[]
  status: "pending" | "in_progress" | "completed"
}

export interface Message {
  role: "user" | "assistant"
  content:
    | string
    | Array<{
        type: "text" | "image_url"
        text?: string
        image_url?: { url: string }
      }>
  citations?: Citation[]
  reasoning?: { text: string; durationMs?: number }
  tasks?: TaskModel[]
  model?: string
  isSilent?: boolean
  commandErrors?: Record<number, string>
}

export interface AISettings {
  apiKey: string
  apiUrl: string
  model: string
  systemPrompt: string
}

export interface SessionMeta {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

export interface IoTCommand {
  action: string
  device?: string | number
  value?: number
  r?: number
  g?: number
  b?: number
  direction?: string
  reason?: string
  timestamp?: number
}

export interface MCPTool {
  name: string
  displayName?: string
  description: string
}

export type AssistantMode = "chat" | "automation" | "expert"
