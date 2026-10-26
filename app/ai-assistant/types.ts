// AI Assistant — Shared Types
// Extracted from app/ai-assistant/page.tsx

export interface Citation {
  number: string
  title: string
  url: string
  description?: string
  quote?: string
}

/** 聊天附件（图片 / 文档） */
export interface ChatAttachment {
  /** 文件名（含扩展名） */
  name: string
  /** MIME 类型，如 image/png */
  type: string
  /**
   * dataURL（base64 内联，可直接用于 image_url）。
   * 文档类附件为空字符串 —— 它们走服务端落盘，只带 fileId。
   */
  dataUrl: string
  /**
   * 文档类附件：服务端落盘后的文件 id。
   *
   * 为什么图片与文档分开：图片要作为 `image_url` 发给模型（多模态原生支持），
   * 而 PDF/Word/Excel 必须以文件形式存在服务端，由 `document_read` 工具按需解析 ——
   * 一份 5MB 的 PPT 转 base64 内联会把请求体和上下文一起打爆。
   */
  fileId?: string
  /** 文档格式：pdf / docx / xlsx / pptx / md / txt / csv / json / html */
  format?: string
  /** 体积的人可读形式（"1.2 MB"） */
  sizeText?: string
  /** 文档上传状态：发送前必须为 ready */
  status?: "uploading" | "ready" | "error"
  /** 上传失败原因（status === 'error' 时展示） */
  error?: string
}

/** 文档引用（消息里携带的文件） */
export interface DocumentRef {
  fileId: string
  fileName: string
  format: string
  sizeText?: string
  /** 产物下载地址（仅 AI 产出的文件有） */
  downloadUrl?: string
  origin?: "uploaded" | "generated" | "edited"
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
  /**
   * 🧠 深度思考是否**仍在流式**（思考块 `<REASONING>` 尚未闭合）。
   *
   * 只存在于流式过程中（落库/历史会话里没有这个字段 = false）。
   * 展示层据此串行化：思考期间正文一律不上屏，思考闭合后才开始流正文 ——
   * 「先输出思考，思考输出完成后再输出主文本」。
   */
  reasoningStreaming?: boolean
  tasks?: TaskModel[]
  model?: string
  isSilent?: boolean
  commandErrors?: Record<number, string>
  /**
   * 错误类型标签。
   * - "rate_limit"：429/速率限制，使用 RateLimitErrorCard 渲染
   * - "generic"：普通错误，使用默认文本渲染
   */
  errorType?: "rate_limit" | "generic"
  /** 错误原始字符串（用于 RateLimitErrorCard 解析 code/message） */
  errorRaw?: string
  /** HTTP 状态码 */
  errorStatus?: number
  /**
   * 本次回复消耗的积分（积分制度：token 计费 × 模型倍率 × 全局倍率）
   * 服务端在流式结束时推送 credit_usage 事件填充
   */
  creditUsage?: {
    credits: number
    inputTokens: number
    outputTokens: number
    modelRate: number
    globalMultiplier: number
    estimated: boolean
  }
  /** 流式过程中实时估算的积分（每收到一个 delta 用累计 chars × 公式估算；流结束后被 creditUsage 替换） */
  liveCredits?: number
  /**
   * 📷 摄像头实时画面。
   *
   * 由 handleSend 的收尾流程投递（AI 调 `take_camera_snapshot` / `move_camera_and_look`
   * 后服务端 ffmpeg 抓到帧 → SSE tool_result.result.images → 队列 → 收尾插入对话流）。
   * 有这个标记的消息，content 里的图会走「快照卡」（可看大图 / 下载）；
   * 没有标记的（用户上传的原图）仍走原来的 168px 小预览 —— 那是诊断卡的底图凭据，不是主角。
   */
  snapshot?: { camera: "a" | "b"; capturedAt?: number }
  /**
   * 📎 该消息携带 / 产出的文档。
   *
   * - 用户消息：上传的 PDF/Word/Excel/PPT（origin=uploaded，无 downloadUrl）
   * - AI 消息：document_create / document_edit 的产物（origin=generated/edited，有 downloadUrl）
   *
   * 与 content 分离的原因：文件引用一旦被拼进自然语言文本，渲染层就再也拿不到
   * fileId 去画下载卡了（同理 snapshot 标记）。
   */
  documents?: DocumentRef[]
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
